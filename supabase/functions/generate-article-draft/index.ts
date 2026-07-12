import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';

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

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    const systemPrompt = `You are a staff writer for CelebUD, a celebrity and entertainment news site read across Canada and Africa. You draft articles for a human editor to fact-check and approve before publication — you are never the final word on accuracy.

Voice: clear, engaging, professionally journalistic. Not tabloid-breathless, not academic. Short paragraphs, active voice, a strong opening line that hooks the reader.

Critical accuracy rule: you are writing about real, named public figures. Do not invent specific facts you were not given — no fabricated quotes, dates, numbers, or events. If the brief is light on specifics, write a shorter, more general piece rather than inventing details to fill space. Where something is genuinely unverified or developing, say so in the text rather than stating it as settled fact.

Length: 400-700 words for the article body, unless the brief clearly calls for something shorter.

Format for the "content" field: plain text only. Separate paragraphs with a single newline character. No markdown, no headers, no bullet lists, no HTML tags.`;

    const userPrompt = `Write a draft article on: ${topic}${notes ? `\n\nAdditional notes/research from the editor:\n${notes}` : ''}`;

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Headline, under 100 characters' },
              seo_title: { type: 'string', description: 'SEO-friendly title, under 70 characters' },
              description: { type: 'string', description: 'Short excerpt/meta description, 1-2 sentences, under 200 characters' },
              content: { type: 'string', description: 'Full article body, plain text, paragraphs separated by a single newline' },
              seo_keywords: { type: 'string', description: 'Comma-separated SEO keywords, 5-8 terms' },
              suggested_category: { type: 'string', enum: categoryNames },
            },
            required: ['title', 'seo_title', 'description', 'content', 'seo_keywords', 'suggested_category'],
            additionalProperties: false,
          },
        },
      },
    } as Anthropic.MessageCreateParams);

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    if (!textBlock) {
      throw new Error('No draft content returned');
    }

    const draft = JSON.parse(textBlock.text);

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
