import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';

// AI helpers behind the Newsroom admin page (/admin/newsroom).
//
// Every action here produces material for an EDITOR — a transcript, a
// ranking, a draft — and nothing is ever published from this function.
// The principle throughout: CelebUD's value is what only CelebUD has
// (its readers, its contacts, its families, its judgement). The AI's job
// is to save the editor time handling that material, never to invent it.
//
// Actions (POST {action, ...}):
//   transcribe_voice  {path, interviewee, role?, topic?}  voice note -> transcript + Q&A draft
//   radar_score       {}                                  rank recent fetched stories for our readers
//   digest_notes      {ids[]}                             "why it matters" lines for a weekly digest
//   group_answers     {question_id}                       themes + quotable answers + story draft
//   tribute_draft     {submission_id}                     tribute article from a family's submission
//
// Admin-only. Uses GEMINI_API_KEY like the other drafting tools.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};
const MODEL = 'gemini-flash-latest';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const stripHtml = (html: string) =>
  (html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const esc = (t: string) =>
  (t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Body HTML the site already uses; everything else is dropped.
const ALLOWED = /^(p|h2|h3|strong|em|ul|ol|li|blockquote|a|hr|br)$/i;
const sanitize = (html: string) =>
  (html || '')
    .replace(/<\s*(script|style|iframe)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (tag, name: string, attrs: string) => {
      if (!ALLOWED.test(name)) return '';
      const n = name.toLowerCase();
      if (tag.startsWith('</')) return `</${n}>`;
      if (n === 'a') {
        const href = /href\s*=\s*"(https?:\/\/[^"]+|\/[^"]*)"/i.exec(attrs)?.[1];
        return href ? `<a href="${esc(href)}" rel="noopener">` : '<a>';
      }
      return n === 'hr' || n === 'br' ? `<${n} />` : `<${n}>`;
    });

const CIVIL_RULES = `Never invent facts, numbers, quotes, names, dates or official positions. Plain, warm, direct English for CelebUD readers: Nigerians at home and the Nigerian/African diaspora, especially in Canada.`;

async function gemini(
  apiKey: string,
  system: string,
  parts: Array<Record<string, unknown>>,
  maxTokens = 8192,
): Promise<Record<string, unknown>> {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0.5, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
      }),
    },
  );
  if (!resp.ok) {
    const t = await resp.text();
    if (resp.status === 429) throw new Error('The AI quota was reached — wait a minute and try again.');
    let detail = t;
    try { detail = JSON.parse(t)?.error?.message || t; } catch { /* raw */ }
    throw new Error(`AI request failed (${resp.status}): ${String(detail).slice(0, 300)}`);
  }
  const data = await resp.json();
  const cand = data?.candidates?.[0];
  if (data?.promptFeedback?.blockReason || ['SAFETY', 'PROHIBITED_CONTENT', 'RECITATION'].includes(cand?.finishReason)) {
    throw new Error('The AI declined this material. Try again, or handle this one by hand.');
  }
  const raw: string = (cand?.content?.parts || []).map((p: { text?: string }) => p.text || '').join('').trim();
  if (!raw) throw new Error('The AI returned nothing — please try again.');
  let s = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{'); const b = s.lastIndexOf('}');
  if (a !== -1 && b !== -1) s = s.slice(a, b + 1);
  try { return JSON.parse(s); } catch { throw new Error('The AI returned malformed output — please try again.'); }
}

const DRAFT_SHAPE = `"title" (under 100 chars), "description" (meta description under 200 chars, no byline, no "By ..."), "seo_keywords" (5-8 comma-separated terms), "content" (HTML using only <h2>, <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>; no <h1>; end with a <h2>Conclusion</h2> section)`;

function cleanDraft(d: Record<string, unknown>) {
  return {
    title: stripHtml(String(d.title || '')).slice(0, 140),
    description: stripHtml(String(d.description || '')).slice(0, 300),
    seo_keywords: stripHtml(String(d.seo_keywords || '')).slice(0, 300),
    content: sanitize(String(d.content || '')),
  };
}

// ---------------------------------------------------------------------------

async function transcribeVoice(sb: SupabaseClient, key: string, body: Record<string, string>) {
  const { path, interviewee, role, topic } = body;
  if (!path || !interviewee?.trim()) throw new Error('A voice note and the interviewee\'s name are required.');
  const { data: file, error } = await sb.storage.from('newsroom-audio').download(path);
  if (error || !file) throw new Error(`Could not read the uploaded voice note: ${error?.message || 'missing'}`);
  if (file.size > 19 * 1024 * 1024) throw new Error('That recording is over 19 MB — please send a shorter voice note.');
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const mime = file.type && file.type !== 'application/octet-stream' ? file.type
    : ({ ogg: 'audio/ogg', opus: 'audio/ogg', mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', webm: 'audio/webm', amr: 'audio/amr' } as Record<string, string>)[ext] || 'audio/ogg';
  const b64 = encodeBase64(new Uint8Array(await file.arrayBuffer()));

  const system = `You are an editor at CelebUD. You receive a voice-note interview with a real person. ${CIVIL_RULES}
1. Transcribe the recording faithfully in its original language (Nigerian English, Pidgin and Yoruba phrases included). Mark unclear words as [inaudible]. Do not tidy away their voice.
2. Turn it into an article in the interviewee's OWN words: a short introduction of who they are (only what they say or what the editor states), then their points as sections. Every sentence inside quotation marks or a <blockquote> must appear in the transcript (light trimming of "um"/repetition only). Your own connecting sentences must be clearly framing, not new claims.
Output one JSON object: {"transcript": "...", ${DRAFT_SHAPE}}`;
  const text = `Interviewee: ${interviewee}${role ? `\nWho they are: ${role}` : ''}${topic ? `\nTopic the editor asked about: ${topic}` : ''}`;
  const d = await gemini(key, system, [{ text }, { inline_data: { mime_type: mime, data: b64 } }], 16384);
  return { transcript: String(d.transcript || ''), draft: cleanDraft(d) };
}

async function radarScore(sb: SupabaseClient, key: string) {
  const since = new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString();
  const { data: rows, error } = await sb
    .from('media_content')
    .select('id, title, description, external_url, news_sources(name)')
    .eq('media_type', 'article')
    .eq('is_published', false)
    .eq('radar_dismissed', false)
    .not('external_url', 'is', null)
    .is('radar_scored_at', null)
    .is('enriched_at', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  if (!rows?.length) return { scored: 0 };

  const list = rows.map((r, i) => `[${i}] ${r.title} — ${stripHtml(r.description || '').slice(0, 300)}`).join('\n');
  const system = `You are the news editor of CelebUD. ${CIVIL_RULES}
For each incoming story, judge how much it matters to CelebUD readers specifically (their money, rights, plans, families, community, Nigerian public life). 9-10: must cover with our own angle. 6-8: worth covering if time allows. 0-5: skip (generic foreign news, celebrity gossip with no Nigerian link, sports scores).
For each story give: "score" (0-10), "why" (one sentence on why it does or doesn't matter to our readers), "summary" (three short lines of what happened, from the text given only), "questions" (2-3 questions a CelebUD story should answer for our readers), "who_to_ask" (1-2 kinds of people the editor could ask — e.g. "a Lagos importer", "a newcomer in Calgary"; never named individuals).
Output: {"stories":[{"index":0,"score":7,"why":"...","summary":["...","...","..."],"questions":["..."],"who_to_ask":["..."]}]}`;
  const d = await gemini(key, system, [{ text: list }], 12000);
  const stories = Array.isArray(d.stories) ? d.stories as Array<Record<string, unknown>> : [];
  let scored = 0;
  for (const s of stories) {
    const row = rows[Number(s.index)];
    if (!row) continue;
    const score = Math.max(0, Math.min(10, Math.round(Number(s.score) || 0)));
    await sb.from('media_content').update({
      radar_score: score,
      radar_scored_at: new Date().toISOString(),
      radar_notes: {
        why: stripHtml(String(s.why || '')).slice(0, 400),
        summary: (Array.isArray(s.summary) ? s.summary : []).map((x) => stripHtml(String(x)).slice(0, 300)).slice(0, 3),
        questions: (Array.isArray(s.questions) ? s.questions : []).map((x) => stripHtml(String(x)).slice(0, 300)).slice(0, 3),
        who_to_ask: (Array.isArray(s.who_to_ask) ? s.who_to_ask : []).map((x) => stripHtml(String(x)).slice(0, 200)).slice(0, 2),
      },
    }).eq('id', row.id);
    scored++;
  }
  return { scored };
}

async function digestNotes(sb: SupabaseClient, key: string, body: { ids?: string[] }) {
  const ids = (body.ids || []).slice(0, 15);
  if (ids.length < 3) throw new Error('Pick at least 3 stories for the digest.');
  const { data: rows, error } = await sb
    .from('media_content')
    .select('id, title, slug, description, external_url, is_published, news_sources(name)')
    .in('id', ids);
  if (error) throw new Error(error.message);
  const ordered = ids.map((id) => rows?.find((r) => r.id === id)).filter(Boolean) as NonNullable<typeof rows>;
  const list = ordered.map((r, i) => `[${i}] ${r.title} — ${stripHtml(r.description || '').slice(0, 400)}`).join('\n');
  const system = `You write CelebUD's weekly digest "This week in Nigeria, for Nigerians abroad". ${CIVIL_RULES}
For each story write "why" — two sentences on why it matters to our readers (their money, plans, families, rights), based only on the text given. Also write a 2-3 sentence "intro" for the week.
Output: {"intro":"...","items":[{"index":0,"why":"..."}]}`;
  const d = await gemini(key, system, [{ text: list }], 6000);
  const items = Array.isArray(d.items) ? d.items as Array<Record<string, unknown>> : [];

  const week = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  let html = `<p>${esc(stripHtml(String(d.intro || '')))}</p>`;
  ordered.forEach((r, i) => {
    const why = stripHtml(String(items.find((x) => Number(x.index) === i)?.why || ''));
    const src = (r.news_sources as { name?: string } | null)?.name;
    const link = r.is_published
      ? `<a href="/article/${r.id}/${esc(r.slug || '')}">Read on CelebUD</a>`
      : r.external_url ? `<a href="${esc(r.external_url)}" rel="noopener">Read the full report${src ? ` at ${esc(src)}` : ''}</a>` : '';
    html += `<h2>${esc(r.title)}</h2><p>${esc(why)}</p>${link ? `<p>${link}</p>` : ''}`;
  });
  html += `<h2>Conclusion</h2><p>That's the week. Reply on our WhatsApp channel or Facebook page and tell us which of these affects you most — your answers shape next week's coverage.</p>`;
  return {
    draft: {
      title: `This Week in Nigeria, for Nigerians Abroad — ${week}`,
      description: `The stories from Nigeria that matter to the diaspora this week, and why each one matters to you.`,
      seo_keywords: 'Nigeria news this week, Nigerian diaspora, Nigerians in Canada, weekly digest',
      content: html,
    },
  };
}

async function groupAnswers(sb: SupabaseClient, key: string, body: { question_id?: string }) {
  const { data: q } = await sb.from('reader_questions').select('id, question, intro').eq('id', body.question_id || '').maybeSingle();
  if (!q) throw new Error('Question not found.');
  const { data: answers } = await sb
    .from('reader_answers')
    .select('id, name, location, answer, may_quote')
    .eq('question_id', q.id)
    .neq('status', 'hidden')
    .order('created_at', { ascending: true })
    .limit(300);
  if (!answers || answers.length < 3) throw new Error('Wait for at least 3 answers before building a story.');

  const list = answers.map((a, i) =>
    `[${i}] ${a.may_quote ? `${a.name || 'Anonymous'}${a.location ? `, ${a.location}` : ''} (may be quoted)` : '(do NOT quote or name)'}: ${a.answer}`,
  ).join('\n');
  const system = `You are an editor at CelebUD. Readers answered the question below. ${CIVIL_RULES}
1. Find the main themes and how many answers express each (count them honestly).
2. Write a story draft built on what readers said: lead with the strongest finding, report the counts ("12 of 40 readers said..."), and be clear this is a reader callout, not a scientific survey.
3. Quote ONLY answers marked "(may be quoted)", copying their words exactly, attributed as "Name, Location". Never name or quote the others; you may describe what they said in general terms.
Output: {"themes":[{"theme":"...","count":0,"example_indexes":[0]}], ${DRAFT_SHAPE}}`;
  const d = await gemini(key, system, [{ text: `QUESTION: ${q.question}\n\nANSWERS (${answers.length}):\n${list}` }], 12000);
  const themes = (Array.isArray(d.themes) ? d.themes : []).slice(0, 8).map((t: Record<string, unknown>) => ({
    theme: stripHtml(String(t.theme || '')).slice(0, 200),
    count: Number(t.count) || 0,
  }));
  return { themes, total: answers.length, draft: cleanDraft(d) };
}

// Researched candidate profile for the Election 2027 hub, with sources.
// Uses Google Search grounding so facts come from current reporting, and
// returns the URLs Google actually used. The editor reviews every line —
// every candidate gets the same template and the same scrutiny.
async function candidateProfile(sb: SupabaseClient, key: string, body: { candidate_id?: string }) {
  const { data: c } = await sb.from('election_candidates').select('*').eq('id', body.candidate_id || '').maybeSingle();
  if (!c) throw new Error('Candidate not found.');
  const system = `You are a neutral election researcher for CelebUD, a Nigerian news site. Write a factual, even-handed profile of a 2027 Nigerian presidential candidate using current, reliable reporting. Never praise or criticise; no adjectives like "visionary" or "controversial"; no predictions. If you cannot verify something, leave it out. Prefer INEC, official party/campaign statements and established Nigerian newspapers.
Respond with ONE JSON object only, no code fences:
{"bio": "3-5 neutral sentences: background, profession, political career (plain text)",
 "past_offices": "semicolon-separated list of offices held with years, or empty string",
 "promises": [{"text": "a specific campaign promise in their own framing, attributed", "date": "YYYY-MM-DD or empty", "source_url": "URL where it was reported"}]}
Give at most 5 promises, each with a real source URL from your research. If none can be verified, return an empty array.`;
  const text = `Candidate: ${c.name}\nParty: ${c.party_name || c.party_abbr} (${c.party_abbr})\nRunning mate: ${c.running_mate || 'unknown'}\nElection: Nigeria presidential election, 16 January 2027.`;

  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
    }),
  });
  if (!resp.ok) throw new Error(`AI request failed (${resp.status}): ${(await resp.text()).slice(0, 200)}`);
  const data = await resp.json();
  const cand = data?.candidates?.[0];
  const raw: string = (cand?.content?.parts || []).map((p: { text?: string }) => p.text || '').join('').trim();
  let s = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = s.indexOf('{'); const b = s.lastIndexOf('}');
  if (a !== -1 && b !== -1) s = s.slice(a, b + 1);
  let d: Record<string, unknown>;
  try { d = JSON.parse(s); } catch { throw new Error('The AI returned malformed output — please try again.'); }

  const grounding = (cand?.groundingMetadata?.groundingChunks || []) as Array<{ web?: { uri?: string; title?: string } }>;
  const sources = grounding.map((g) => ({ title: stripHtml(g.web?.title || 'Source').slice(0, 200), url: g.web?.uri || '' }))
    .filter((x) => /^https?:\/\//.test(x.url)).slice(0, 8);
  const promises = (Array.isArray(d.promises) ? d.promises : []).slice(0, 5).map((p: Record<string, unknown>) => ({
    text: stripHtml(String(p.text || '')).slice(0, 400),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(p.date || '')) ? String(p.date) : '',
    source_url: /^https?:\/\//.test(String(p.source_url || '')) ? String(p.source_url).slice(0, 500) : '',
  })).filter((p) => p.text);
  return {
    bio: stripHtml(String(d.bio || '')).slice(0, 4000),
    past_offices: stripHtml(String(d.past_offices || '')).slice(0, 2000),
    promises,
    sources,
  };
}

async function tributeDraft(sb: SupabaseClient, key: string, body: { submission_id?: string }) {
  const { data: s } = await sb.from('tribute_submissions').select('*').eq('id', body.submission_id || '').maybeSingle();
  if (!s) throw new Error('Submission not found.');
  const system = `You are an editor at CelebUD writing a tribute from a family's own submission. ${CIVIL_RULES}
Use only what the family wrote. Keep their words where they are moving; any sentence in quotation marks or a <blockquote> must come exactly from their story or quotes. Warm, dignified, not over-flowery. Structure with <h2> sections (who they are, the stories the family shared, the family's words, prayers/wishes if given). For a memorial, be gentle; for a child, keep it about character and achievements, nothing about appearance. Do not add an invented "Disclaimer".
Output: {${DRAFT_SHAPE}}`;
  const text = `Honoree: ${s.honoree_name}\nOccasion: ${s.occasion}${s.occasion_date ? ` (${s.occasion_date})` : ''}\nSubmitted by: ${s.submitter_name}${s.relationship ? `, ${s.relationship}` : ''}\n\nTHEIR STORY:\n${s.story}${s.quotes ? `\n\nWORDS FROM FAMILY AND FRIENDS:\n${s.quotes}` : ''}`;
  const d = await gemini(key, system, [{ text }], 8192);
  const draft = cleanDraft(d);
  const photos = (s.photos || []) as string[];
  if (photos.length > 1) {
    const gallery = photos.slice(1).map((u) => `<p><img src="${esc(u)}" alt="${esc(s.honoree_name)}" /></p>`).join('');
    const at = draft.content.search(/<h2>\s*Conclusion/i);
    draft.content = at >= 0 ? draft.content.slice(0, at) + gallery + draft.content.slice(at) : draft.content + gallery;
  }
  return { draft, thumbnail: photos[0] || null };
}

// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const sb = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'Missing authorization header' }, 401);
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: 'Invalid or expired session' }, 401);
    const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!profile?.is_admin) return json({ error: 'Admin access required' }, 403);

    const key = Deno.env.get('GEMINI_API_KEY');
    if (!key) return json({ error: 'GEMINI_API_KEY is not configured in Supabase → Edge Functions → Secrets.' }, 500);

    const body = await req.json();
    switch (body.action) {
      case 'transcribe_voice': return json({ success: true, ...(await transcribeVoice(sb, key, body)) });
      case 'radar_score': return json({ success: true, ...(await radarScore(sb, key)) });
      case 'digest_notes': return json({ success: true, ...(await digestNotes(sb, key, body)) });
      case 'group_answers': return json({ success: true, ...(await groupAnswers(sb, key, body)) });
      case 'tribute_draft': return json({ success: true, ...(await tributeDraft(sb, key, body)) });
      case 'candidate_profile': return json({ success: true, ...(await candidateProfile(sb, key, body)) });
      default: return json({ error: `Unknown action: ${body.action}` }, 400);
    }
  } catch (e) {
    console.error('newsroom-ai error:', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
