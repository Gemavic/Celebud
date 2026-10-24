import { createClient } from 'npm:@supabase/supabase-js@2';

// "Suggest angles" for a rewritten news draft.
//
// A rewritten wire story adds nothing Google does not already have. What
// CelebUD can add is what the story MEANS for its own readers — Nigerians at
// home, the diaspora in Canada, newcomers, families, small investors. This
// function reads one draft and proposes three such perspectives, each as a
// short ready-to-edit section. The editor picks one, adjusts it, and saving
// the article is what publishes it. Nothing here publishes anything.
//
// Admin-only. Uses the same GEMINI_API_KEY secret as the drafting tools.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const GEMINI_MODEL = 'gemini-flash-latest';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const stripHtml = (html: string) =>
  html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

// Only the tags the article body already uses survive.
const ALLOWED = /^(p|h2|h3|strong|em|ul|ol|li)$/i;
const sanitize = (html: string) =>
  html
    .replace(/<\s*(script|style|iframe)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\/?([a-z0-9]+)[^>]*>/gi, (tag, name: string) => {
      if (!ALLOWED.test(name)) return '';
      return tag.startsWith('</') ? `</${name.toLowerCase()}>` : `<${name.toLowerCase()}>`;
    });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401);
    const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) return json({ error: 'Invalid or expired session' }, 401);
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!profile?.is_admin) return json({ error: 'Admin access required' }, 403);

    const { title, content, note } = (await req.json()) as {
      title?: string; content?: string; note?: string;
    };
    const storyText = stripHtml(content || '').slice(0, 12000);
    if (!title?.trim() || storyText.length < 200) {
      return json({ error: 'The article needs a title and some body text before angles can be suggested.' }, 400);
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return json({ error: 'GEMINI_API_KEY is not configured in Supabase → Edge Functions → Secrets.' }, 500);

    const systemPrompt = `You are an editor at CelebUD, a news site whose readers are Nigerians at home and the Nigerian and African diaspora, especially in Canada. You are given a news story that other outlets have already reported. Your job is NOT to retell it. Your job is to propose what this story MEANS for CelebUD's readers — the part no other outlet is writing.

Propose exactly 3 DIFFERENT perspectives, choosing the three that genuinely fit THIS story. Possible lenses (pick what fits; do not force one that doesn't): Nigerians in Nigeria (prices, jobs, daily life, policy); the diaspora in Canada/abroad (remittances, investing back home, travel, family); newcomers, students and immigration applicants; small business owners and traders; families and parents; personal finance and practical next steps; the wider African context. Each must be about readers' lives, money, rights, plans or decisions — practical, not opinion for its own sake.

Rules:
- Never invent facts, numbers, quotes, names, dates or official positions. Use only facts present in the story, plus well-established general knowledge. When a specific is uncertain, write in general terms ("could", "readers should check…").
- Do not repeat the story's narrative. Assume the reader just read it.
- Each section: a short heading, then 2–3 paragraphs (150–250 words total), ending with one concrete takeaway or question the reader should consider.
- Plain, warm, direct English. No hype, no clichés.

Output a SINGLE JSON object, nothing else, no code fences:
{"angles":[{"label":"2-5 word name of the perspective","heading":"section heading, e.g. What this means for Nigerians in Canada","html":"<p>…</p><p>…</p>"}]}
The "html" may use only <p>, <strong>, <em>, <ul>, <li>. Escape double quotes inside strings.`;

    const userPrompt =
      `STORY TITLE: ${title}\n\nSTORY TEXT:\n${storyText}` +
      (note?.trim()
        ? `\n\nTHE EDITOR'S OWN POINT — build at least one angle around this, in their spirit:\n${note.trim().slice(0, 1000)}`
        : '');

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 4096, responseMimeType: 'application/json' },
        }),
      },
    );

    if (!resp.ok) {
      const t = await resp.text();
      if (resp.status === 429) throw new Error('The AI quota was reached — wait a minute and try again.');
      throw new Error(`AI request failed (${resp.status}): ${t.slice(0, 300)}`);
    }

    const data = await resp.json();
    const raw: string = (data?.candidates?.[0]?.content?.parts || [])
      .map((p: { text?: string }) => p.text || '').join('').trim();
    if (!raw) throw new Error('The AI returned nothing — please try again.');

    let jsonStr = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const a = jsonStr.indexOf('{'); const b = jsonStr.lastIndexOf('}');
    if (a !== -1 && b !== -1) jsonStr = jsonStr.slice(a, b + 1);

    let parsed: { angles?: Array<{ label?: string; heading?: string; html?: string }> };
    try { parsed = JSON.parse(jsonStr); } catch { throw new Error('The AI returned malformed output — please try again.'); }

    const angles = (parsed.angles || [])
      .filter((x) => x?.heading && x?.html)
      .slice(0, 3)
      .map((x) => ({
        label: stripHtml(x.label || x.heading || '').slice(0, 60),
        heading: stripHtml(x.heading || '').slice(0, 120),
        html: sanitize(x.html || ''),
      }));
    if (angles.length === 0) throw new Error('No usable angles came back — please try again.');

    return json({ success: true, angles });
  } catch (error) {
    console.error('suggest-angles error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
