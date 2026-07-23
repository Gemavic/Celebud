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

    // maxRetries kept low: each retry re-runs the whole long generation,
    // which can push total time past Supabase's gateway timeout (504).
    const anthropic = new Anthropic({ apiKey: anthropicApiKey, maxRetries: 2 });

    const systemPrompt = `You are a staff writer for CelebUD, a celebrity and entertainment news site read across Canada and Africa. You draft articles for a human editor to fact-check and approve before publication — you are never the final word on accuracy.

Voice: clear, engaging, professionally journalistic. Not tabloid-breathless, not academic. Active voice, a strong opening that hooks the reader.

Research: use web search to check current, real information on the topic before writing. Prefer what search turns up over prior knowledge, especially for anything recent. Never fabricate quotes, dates, numbers, or events. If search finds little solid material, still write the full-length piece but keep unverifiable claims general rather than inventing specifics.

LENGTH: at least 1000 words in the article body. This is a firm minimum — develop the topic with real depth, multiple angles, background, and detail. Do not pad with fluff; earn the length with substance.

FORMAT — the "content" field must be valid HTML (not plain text, not markdown). Use ONLY these tags:
- <h2> for major section headings, <h3> for sub-sections. Break the article into several clearly-titled sections with <h2> headings.
- <p> for paragraphs.
- <strong> for key terms and important points; <em> for emphasis. Use them naturally to make the piece scannable.
- <ul>/<ol> with <li> for lists.
- <blockquote> for a pulled quote or key statement when apt.
- <table> with <thead>/<tbody>/<tr>/<th>/<td> to illustrate comparisons, data, timelines, statistics, or pros-and-cons. Include at least one table WHEN the topic genuinely benefits from one (e.g. comparisons, figures, before/after). If the topic truly doesn't call for a table, omit it rather than forcing one.
- <hr> to separate major parts.
Do NOT use <h1>, inline style attributes, class attributes, <div>, <span>, markdown, or code fences. Do NOT put the headline inside the content.

IMAGES: you cannot upload real images, so never invent <img> URLs. Where a photograph would strengthen the piece, insert a placeholder paragraph exactly like: <p><em>[Suggested image: a brief description of the photo an editor should add here]</em></p> — the editor replaces it with a real image.

CONCLUSION: end the body with a section headed <h2>Conclusion</h2> containing a genuine summary paragraph that ties the piece together (what it means, what happens next, or why it matters) — never a sentence that trails off.

SOURCES: if web search turned up real sources, after the conclusion add <h2>Sources</h2> followed by a <ul> of the source names as <li> items (with <a href> links where you have real URLs). Omit this section entirely if search found nothing usable.

DISCLAIMER: after everything above, append a content-appropriate disclaimer, auto-written to fit THIS article's subject, formatted exactly as: <hr /><p><strong>Disclaimer:</strong> <em>...tailored disclaimer text...</em></p>. Tailor it to the content type — e.g. financial/insurance/investment content: not financial advice, consult a licensed professional; health/medical: not medical advice, consult a doctor; legal: not legal advice; celebrity/entertainment/news: reporting reflects information available at the time of writing and may develop. Keep it to 1–2 sentences.`;

    const userPrompt = `Write a draft article on: ${topic}${notes ? `\n\nAdditional notes/research from the editor:\n${notes}` : ''}`;

    let response: Anthropic.Message;
    try {
      // Sonnet 5 (not Opus) so a 1000+ word researched article generates
      // fast enough to finish inside Supabase's edge-function time limit —
      // Opus was slow enough that the platform returned 504 before it
      // completed. Sonnet produces the same rich, structured output.
      response = await anthropic.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 2 } as Anthropic.Tool],
        output_config: {
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Headline, under 100 characters' },
                seo_title: { type: 'string', description: 'SEO-friendly title, under 70 characters' },
                description: { type: 'string', description: 'Short excerpt/meta description, 1-2 sentences, under 200 characters' },
                content: { type: 'string', description: 'Full article body as valid HTML, at least 1000 words, using only the allowed tags (h2/h3/p/strong/em/ul/ol/li/blockquote/table.../hr). Several <h2> sections, at least one <table> when the topic warrants, a <h2>Conclusion</h2> summary section, an optional <h2>Sources</h2> section, and a final tailored <hr /><p><strong>Disclaimer:</strong>...</p> block.' },
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
