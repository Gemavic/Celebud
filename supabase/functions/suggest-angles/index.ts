import { createClient } from 'npm:@supabase/supabase-js@2';
import { HOUSE_STYLE, polishHtml, polishText, findAiTells, stripClosingCallToAction } from '../_shared/houseStyle.ts';

// "Suggest angles" for a rewritten news draft.
//
// A rewritten wire story adds nothing Google does not already have. What
// CelebUD can add is what the story MEANS for its own readers — Nigerians at
// home, the diaspora in Canada, newcomers, families, small investors. This
// function reads one draft and proposes up to three such perspectives, each
// as a short ready-to-edit section. The editor picks one, adjusts it, and
// saving the article is what publishes it. Nothing here publishes anything.
//
// Three guards, because a prompt alone let repeated, machine-sounding
// sections through (November 2026: four original guides each got a section
// that restated their own earlier steps in stiffer words):
//   1. The prompt sees the article's own headings and must name the NEW
//      point each angle adds.
//   2. A second, strict AI pass compares every angle with the article and
//      drops any that repeats it. If that check cannot run, nothing is
//      returned: an unchecked angle is never shown.
//   3. House style in code: polish the words, cut a call-to-action closer,
//      and drop any angle that still contains a machine-written pattern.
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
    const storyText = stripHtml(content || '').slice(0, 20000);
    if (!title?.trim() || storyText.length < 200) {
      return json({ error: 'The article needs a title and some body text before angles can be suggested.' }, 400);
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return json({ error: 'GEMINI_API_KEY is not configured in Supabase → Edge Functions → Secrets.' }, 500);

    const headings = [...(content || '').matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)]
      .map((m) => stripHtml(m[1]))
      .filter(Boolean);

    const systemPrompt = `You are an editor at CelebUD, a news site whose readers are Nigerians at home and the Nigerian and African diaspora, especially in Canada. You are given an article. It may be a news story other outlets have reported, or a complete guide already written by CelebUD. Your job is NOT to retell or summarise it. Your job is to add what it does not yet say: what it MEANS for CelebUD's readers.

Propose UP TO 3 different perspectives, and only ones that add something the article does not already say. Possible lenses (pick only what fits; never force one): Nigerians in Nigeria (prices, jobs, daily life, policy); the diaspora in Canada/abroad (remittances, investing back home, travel, family); newcomers, students and immigration applicants; small business owners and traders; families and parents; personal finance; the wider African context. Each must be about readers' lives, money, rights, plans or decisions, not opinion for its own sake.

Rules:
- Read the WHOLE article first. Do not restate any fact, figure, rule, step, warning or piece of advice it already contains, even in different words. If the article already covers a lens, skip that lens.
- For each angle, state in "new_point" the one thing it tells the reader that the article does not. If you cannot name one, leave that angle out. Returning one or two angles, or none, is better than repeating the article.
- Never invent facts, numbers, quotes, names, dates, rules or official positions. Use only facts present in the article, plus well-established general knowledge. When a specific is uncertain, write in general terms ("can", "may", "check with...").
- Each section: a short, plain heading, then 2–3 paragraphs (120–220 words in total). Stop when the point is made.

${HOUSE_STYLE}

Output a SINGLE JSON object, nothing else, no code fences:
{"angles":[{"label":"2-5 word name of the perspective","heading":"plain section heading","new_point":"one sentence: what this adds that the article does not say","html":"<p>…</p><p>…</p>"}]}
The "html" may use only <p>, <strong>, <em>, <ul>, <li>. Escape double quotes inside strings. If no angle adds anything new, output {"angles":[]}.`;

    const userPrompt =
      `ARTICLE TITLE: ${title}\n\n` +
      (headings.length ? `THE ARTICLE ALREADY HAS THESE SECTIONS:\n- ${headings.join('\n- ')}\n\n` : '') +
      `ARTICLE TEXT:\n${storyText}` +
      (note?.trim()
        ? `\n\nTHE EDITOR'S OWN POINT — build at least one angle around this, in their spirit, without repeating the article:\n${note.trim().slice(0, 1000)}`
        : '');

    const callGemini = async (system: string, user: string, temperature: number) => {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: { temperature, maxOutputTokens: 4096, responseMimeType: 'application/json' },
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
      try { return JSON.parse(jsonStr); } catch { throw new Error('The AI returned malformed output — please try again.'); }
    };

    const parsed = (await callGemini(systemPrompt, userPrompt, 0.5)) as {
      angles?: Array<{ label?: string; heading?: string; html?: string; new_point?: string }>;
    };

    // Guard 3 (house style in code) first, so the repetition check below
    // sees exactly the text the editor would get.
    const styled = (parsed.angles || [])
      .filter((x) => x?.heading && x?.html && x?.new_point?.trim())
      .slice(0, 3)
      .map((x) => ({
        label: polishText(stripHtml(x.label || x.heading || '')).slice(0, 60),
        heading: polishText(stripHtml(x.heading || '')).slice(0, 120),
        html: stripClosingCallToAction(polishHtml(sanitize(x.html || ''))),
        new_point: polishText(stripHtml(x.new_point || '')).slice(0, 300),
      }))
      .filter((x) => stripHtml(x.html).length > 200)
      .filter((x) => findAiTells(`${x.heading} ${x.html}`).length === 0);

    if (styled.length === 0) {
      return json({
        error: 'No suggestion passed the house-style and repetition checks, so none are shown. This article may not need another section. You can try again, or add your own point in the box and try again.',
      }, 422);
    }

    // Guard 2: a separate, strict pass judges each angle against the article.
    const judgeSystem = `You check sections proposed for an article. For each proposed section, decide whether it REPEATS the article: true if most of what it says (facts, figures, rules, steps, warnings or advice) is already in the article, even in different words; false only if its main point is genuinely new to the article. Be strict. Also set "overstates" to true if the section states a rule, figure or consequence more strongly than the article or general knowledge supports.
Output a SINGLE JSON object, nothing else: {"verdicts":[{"index":0,"repeats":true,"overstates":false,"reason":"short reason"}]}`;
    const judgeUser =
      `ARTICLE:\n${storyText}\n\nPROPOSED SECTIONS:\n` +
      styled.map((x, i) => `[${i}] ${x.heading}\n${stripHtml(x.html)}`).join('\n\n');

    let verdicts: Array<{ index?: number; repeats?: boolean; overstates?: boolean }> = [];
    try {
      const judged = (await callGemini(judgeSystem, judgeUser, 0)) as { verdicts?: typeof verdicts };
      verdicts = judged.verdicts || [];
    } catch (e) {
      // Fail closed: an angle that could not be checked is never shown.
      throw new Error(`Could not check the suggestions for repetition (${e instanceof Error ? e.message : 'unknown error'}). Please try again.`);
    }

    const angles = styled
      .filter((_x, i) => {
        const v = verdicts.find((d) => d.index === i);
        return v !== undefined && v.repeats === false && v.overstates !== true;
      })
      .map(({ label, heading, html }) => ({ label, heading, html }));

    if (angles.length === 0) {
      return json({
        error: 'Every suggestion repeated what the article already says, so none are shown. This article may not need another section. If you have a specific point in mind, type it in the box and try again.',
      }, 422);
    }

    return json({ success: true, angles });
  } catch (error) {
    console.error('suggest-angles error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
