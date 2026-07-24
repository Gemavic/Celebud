import { createClient } from 'npm:@supabase/supabase-js@2';

// AI article drafting powered by Google Gemini (Flash) with Google Search
// grounding for live research. Cheaper than Anthropic/OpenAI (with a free
// tier), and keeps the same output contract: a 1000+ word HTML article with
// section headings, tables where useful, a conclusion, and an auto-written,
// content-appropriate disclaimer.
//
// Requires the GEMINI_API_KEY secret in Supabase (Google AI Studio key:
// https://aistudio.google.com -> Get API key). No Anthropic key needed.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// 'gemini-flash-latest' always resolves to Google's current Flash model,
// so this never breaks when a specific version (e.g. 2.5-flash) is retired.
const GEMINI_MODEL = 'gemini-flash-latest';

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

    // Require a signed-in admin.
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

    const { data: categories } = await supabase.from('categories').select('name').order('name');
    const categoryNames = (categories || []).map((c) => c.name).filter(Boolean);
    if (categoryNames.length === 0) categoryNames.push('News');

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured on the server. Add it in Supabase → Edge Functions → Secrets (get a key at https://aistudio.google.com).' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are a staff writer for CelebUD, a celebrity, entertainment and finance news site read across Canada and Africa. You draft articles for a human editor to fact-check and approve before publication — you are never the final word on accuracy.

Voice: clear, engaging, professionally journalistic. Active voice, a strong opening that hooks the reader. Never fabricate quotes, dates, numbers, or events; if you are unsure, keep claims general rather than inventing specifics.

LENGTH: at least 1000 words in the article body. Develop the topic with real depth, multiple angles, background and detail. Earn the length with substance, not filler.

OUTPUT: respond with a SINGLE JSON object and nothing else — no markdown code fences, no commentary before or after. The object must have exactly these keys:
- "title": headline, under 100 characters
- "seo_title": SEO-friendly title, under 70 characters
- "description": 1-2 sentence excerpt/meta description, under 200 characters
- "content": the full article body as valid HTML (see rules below)
- "seo_keywords": comma-separated SEO keywords, 5-8 terms
- "suggested_category": exactly one of these category names: ${categoryNames.join(', ')}

RULES for the "content" HTML — use ONLY these tags:
- <h2> for major section headings, <h3> for sub-sections. Break the article into several clearly-titled <h2> sections.
- <p> for paragraphs; <strong> for key terms; <em> for emphasis; <ul>/<ol> with <li> for lists; <blockquote> for a pulled quote when apt.
- <table> with <thead>/<tbody>/<tr>/<th>/<td> to illustrate comparisons, data, timelines or pros-and-cons — include at least one table WHEN the topic genuinely benefits from one; otherwise omit it.
- <hr> to separate major parts.
Do NOT use <h1>, style or class attributes, <div>, <span>, markdown, or code fences. Do NOT put the headline inside the content.
IMAGES: never invent <img> URLs. Where a photo would help, insert a placeholder paragraph exactly like: <p><em>[Suggested image: brief description]</em></p>.
CONCLUSION: end the body with a <h2>Conclusion</h2> section containing a genuine summary paragraph.
SOURCES: if your research turned up real sources, after the conclusion add <h2>Sources</h2> and a <ul> of source names as <li> items (with <a href> links where you have real URLs). Omit if none.
DISCLAIMER: finally, append a content-appropriate disclaimer tailored to THIS article's subject, formatted exactly as: <hr /><p><strong>Disclaimer:</strong> <em>...tailored text...</em></p>. Financial/insurance: not financial advice, consult a licensed professional. Health: not medical advice. Legal: not legal advice. Celebrity/news: reflects information available at time of writing and may develop. Keep it 1-2 sentences.

The JSON's "content" value must be a single valid JSON string (escape any double quotes inside the HTML).`;

    const userPrompt = `Write a draft article on: ${topic}${notes ? `\n\nAdditional notes/research from the editor:\n${notes}` : ''}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const body = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
    };

    let gemResp: Response;
    try {
      gemResp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (netErr) {
      console.error('Gemini network error:', netErr);
      throw new Error('Could not reach the Gemini API. Please try again in a moment.');
    }

    if (!gemResp.ok) {
      const errText = await gemResp.text();
      console.error('Gemini API error:', gemResp.status, errText);
      let detail = errText;
      try { detail = JSON.parse(errText)?.error?.message || errText; } catch { /* keep raw */ }
      if (gemResp.status === 429) throw new Error('Gemini rate limit or quota reached — wait a minute and try again, or check your Google AI Studio quota/billing.');
      if (gemResp.status === 400 && /API key not valid/i.test(detail)) throw new Error('The GEMINI_API_KEY looks invalid. Double-check the secret in Supabase.');
      throw new Error(`AI generation failed (Gemini ${gemResp.status}): ${detail}`);
    }

    const data = await gemResp.json();
    const cand = data?.candidates?.[0];
    if (cand?.finishReason === 'SAFETY') {
      throw new Error('Gemini blocked this topic for safety. Try rephrasing.');
    }
    const rawText: string = (cand?.content?.parts || [])
      .map((p: { text?: string }) => p.text || '')
      .join('')
      .trim();
    if (!rawText) {
      console.error('Empty Gemini response:', JSON.stringify(data).slice(0, 800));
      throw new Error('Gemini returned no draft text — please try again.');
    }

    // Robustly extract the JSON object (strip any stray fences/preamble).
    let jsonStr = rawText.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const first = jsonStr.indexOf('{');
    const last = jsonStr.lastIndexOf('}');
    if (first !== -1 && last !== -1) jsonStr = jsonStr.slice(first, last + 1);

    let draft: unknown;
    try {
      draft = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse Gemini JSON. Raw:', rawText.slice(0, 1000));
      throw new Error('The AI returned malformed output — please try generating again.');
    }

    return new Response(JSON.stringify({ success: true, draft }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-article-draft (gemini) error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
