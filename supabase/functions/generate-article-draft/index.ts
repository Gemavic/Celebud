import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@0.68.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DraftRequest {
  topic: string;
  notes?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Require a real staff session — same admin check as recategorize-article.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await callerClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (!callerProfile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { topic, notes }: DraftRequest = await req.json();

    if (!topic || !topic.trim()) {
      return new Response(JSON.stringify({ error: 'A topic or brief is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: categories } = await supabase
      .from('categories')
      .select('name')
      .order('name');

    const categoryNames = (categories || []).map((c) => c.name).filter(Boolean);
    if (categoryNames.length === 0) categoryNames.push('News');

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured on the server' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anthropic = new Anthropic({ apiKey: anthropicApiKey, maxRetries: 5 });

    const systemPrompt = `You are a staff writer for CelebUD, a celebrity and entertainment news site read across Canada and Africa. You draft articles for a human editor to fact-check and approve before publication — you are never the final word on accuracy.

Voice: clear, engaging, professionally journalistic. Not tabloid-breathless, not academic. Short paragraphs, active voice, a strong opening line that hooks the reader.

Research: use web search to check current, real information on the topic before writing. Prefer what search turns up over prior knowledge, especially for anything recent. If search finds little or nothing solid, say so — write a shorter, more general piece rather than inventing details to fill space. Never fabricate quotes, dates, numbers, or events.

Structure: every article needs a real ending — a closing paragraph that wraps up the piece (context, what happens next, or why it matters), not a sentence that just trails off mid-thought.

Do NOT write an "About the Author" section or any legal/editorial disclaimer — those are added automatically based on the author selected in the admin panel, not by you.

Length: 400-700 words for the article body, unless the brief clearly calls for something shorter.

Format for the "content" field: plain text only, paragraphs separated by a single newline, no markdown/headers/bullets/HTML. If your web search turned up real sources, end "content" with one final paragraph starting exactly with "Sources: " followed by the source names and their URLs, comma-separated. Omit that paragraph entirely if search found nothing usable.`;

    const userPrompt = `Write a draft article on: ${topic}${notes ? `\n\nAdditional notes/research from the editor:\n${notes}` : ''}`;

    let response: Anthropic.Message;
    try {
      response = await anthropic.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 6000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 3 } as Anthropic.Tool],
        output_config: {
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Headline, under 100 characters' },
                seo_title: { type: 'string', description: 'SEO-friendly title, under 70 characters' },
                description: { type: 'string', description: 'Short excerpt/meta description, 1-2 sentences, under 200 characters' },
                content: { type: 'string', description: 'Full article body, plain text, paragraphs separated by a single newline, ending with a proper concluding paragraph and an optional Sources paragraph' },
                seo_keywords: { type: 'string', description: 'Comma-separated SEO keywords, 5-8 terms' },
                suggested_category: { type: 'string', enum: categoryNames },
              },
              required: ['title', 'seo_title', 'description', 'content', 'seo_keywords', 'suggested_category'],
              additionalProperties: false,
            },
          },
        },
      } as Anthropic.MessageCreateParams);
    } catch (apiError: unknown) {
      console.error('Anthropic API call failed:', apiError);
      const e = apiError as { status?: number; message?: string; error?: { message?: string; type?: string } };
      const errorType = e?.error?.type;

      if (e?.status === 529 || errorType === 'overloaded_error') {
        throw new Error("Claude's servers are temporarily at capacity. This isn't a problem with your site — please wait a minute and try again.");
      }
      if (e?.status === 429 || errorType === 'rate_limit_error') {
        throw new Error('Rate limited by the Claude API — you\'ve generated a few drafts in quick succession. Wait about a minute and try again.');
      }
      if (e?.status === 401 || errorType === 'authentication_error') {
        throw new Error('The Claude API key on the server looks invalid. Double-check the ANTHROPIC_API_KEY secret in Supabase.');
      }

      // Surface the real Anthropic API error (billing, invalid request,
      // etc.) instead of a generic message, for anything else.
      const detail = e?.error?.message || e?.message || 'Unknown error calling Claude API';
      throw new Error(`AI generation failed (${e?.status ?? 'no status'}): ${detail}`);
    }

    if (response.stop_reason === 'refusal') {
      throw new Error('Claude declined to write this draft (safety filter). Try rephrasing the topic.');
    }

    if (response.stop_reason === 'max_tokens') {
      throw new Error('The draft was cut off before it finished — try a shorter topic/notes, or generate again.');
    }

    const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === 'text');
    const textBlock = textBlocks[textBlocks.length - 1];
    if (!textBlock) {
      console.error('No text block in response. Full content:', JSON.stringify(response.content));
      throw new Error(`No draft text returned (stop_reason: ${response.stop_reason})`);
    }

    let draft: unknown;
    try {
      draft = JSON.parse(textBlock.text);
    } catch {
      console.error('Failed to parse draft JSON. Raw text:', textBlock.text);
      throw new Error('AI returned malformed output — please try generating again.');
    }

    return new Response(JSON.stringify({ success: true, draft }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-article-draft error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
