import { createClient } from 'npm:@supabase/supabase-js@2';
import { parse as parseHTML } from 'npm:node-html-parser@6';
import { buildSeoTitle, buildSeoDescription, buildSeoKeywords } from '../_shared/seo.ts';
import { detectImageTopic, pickStockImage, searchPexelsImage } from '../_shared/articleImages.ts';

// Turns thin, scraped RSS stubs into properly produced CelebUD articles.
//
// For each article it re-reports the story in CelebUD's own words using
// Gemini, then writes back a structured HTML body, an SEO title, a meta
// description and SEO keywords, plus a topical thumbnail.
//
// This is deliberately a REWRITE, not a copy. Facts are not copyrightable but
// the way a publisher expresses them is, so we extract the source only as
// research material and the model produces original prose that credits and
// links to the original outlet — the same thing a newsroom does when it picks
// up another outlet's story.
//
// Runs in batches so it never hits the function wall-clock limit: call it
// repeatedly (admin button or cron) until `remaining` reaches 0.
//
// Requires: GEMINI_API_KEY. Optional: PEXELS_API_KEY (better stock photos),
// ENRICH_CRON_SECRET (lets a scheduler call it without an admin session).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-Cron-Secret',
};

const GEMINI_MODEL = 'gemini-flash-latest';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

// Leave headroom under the platform's execution limit so the final DB writes
// and the JSON response always complete.
const TIME_BUDGET_MS = 105_000;
const CONCURRENCY = 6;
const DEFAULT_BATCH = 30;

// Below this much source material there is not enough to re-report a story
// honestly. Rather than let the model pad a headline into an article (which
// invites invented detail), we leave the existing text alone and only fix
// the metadata and image.
const MIN_SOURCE_CHARS = 200;

// An article that has failed this many times is dropped from the queue.
// Without this, failures stayed at the front of a newest-first queue and
// were re-sent to the AI on every single batch — paying again and again
// for work that could never succeed.
const MAX_ATTEMPTS = 2;

/**
 * Billing/quota failures affect every subsequent call, so the whole run must
 * stop immediately rather than grinding through batches racking up errors.
 */
function isBillingFailure(message: string): boolean {
  return /credits? are depleted|prepayment|billing|quota|RESOURCE_EXHAUSTED|exceeded your current quota|429/i.test(message);
}

interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  external_url: string | null;
  category_id: string | null;
  source_id: string | null;
  is_featured: boolean;
  is_trending: boolean;
  thumbnail_url: string | null;
  enrichment_attempts?: number;
}

const JUNK_PATTERNS = [
  /^(share|tweet|comment|subscribe|follow|read more|latest|related)/i,
  /view\s+(image|photo|picture)\s+in\s+fullscreen/i,
  /photograph(er)?:/i, /image\s+credit:/i, /photo\s+(by|credit|courtesy)/i,
  /getty\s+images/i,
  /^(published|updated|posted)\s+(on|at|:)/i,
  /^related\s+(stories|articles|posts)/i,
  /^(sign\s+up|log\s+in|register)/i,
  /^(facebook|twitter|instagram|linkedin|whatsapp)/i,
  /^share\s+(this|on|via)/i, /^source:/i,
  /^\d+\s+(week|day|hour|minute)s?\s+ago$/i, /^tags?:/i,
  /join.*whatsapp/i, /all rights reserved/i, /written permission/i,
  /^save this story/i, /casino utan/i, /click here/i, /subscribe to/i,
  /newsletter/i, /download our app/i, /follow us on/i, /copyright/i,
  /^\s*(advertisement|sponsored)\s*$/i,
  /read also/i, /see also/i, /you may also like/i, /recommended for you/i,
];

function isJunk(text: string): boolean {
  return JUNK_PATTERNS.some((p) => p.test(text));
}

function stripHtml(input: string): string {
  return (input || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Pull the source article's text purely as RESEARCH INPUT for the rewrite.
 * Nothing returned here is ever published verbatim.
 */
async function fetchSourceFacts(url: string): Promise<{ text: string; image: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) return { text: '', image: '' };

    const root = parseHTML(await resp.text());

    // The publisher's own lead photo, taken from the Open Graph tag that
    // outlets publish specifically so their story can be shown elsewhere
    // with a picture. Always preferred over a generated image.
    let image =
      root.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
      root.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
      '';
    if (image && !image.startsWith('http')) {
      try { image = new URL(image, url).href; } catch { image = ''; }
    }
    for (const sel of [
      'script', 'style', 'noscript', 'iframe', 'nav', 'header', 'footer',
      'aside', 'form', 'figcaption', 'svg',
      '[class*="comment"]', '[class*="sidebar"]', '[class*="widget"]',
      '[class*="advert"]', '[class*="banner"]', '[class*="social"]',
      '[class*="share"]', '[class*="newsletter"]', '[class*="related"]',
      '[class*="cookie"]', '[class*="popup"]', '[class*="modal"]',
    ]) {
      try { root.querySelectorAll(sel).forEach((el) => el.remove()); } catch { /* skip */ }
    }

    const containers = [
      '[itemprop="articleBody"]', '.article-body', '.article-content',
      '.post-content', '.entry-content', '.story-body', '.story-content',
      '.td-post-content', '.article__body', '#article-body', 'article', 'main',
    ];
    let source = root;
    for (const sel of containers) {
      try {
        const el = root.querySelector(sel);
        if (!el) continue;
        const text = el.querySelectorAll('p').map((p) => p.text.trim()).filter((t) => t.length > 30).join(' ');
        if (text.length > 150) { source = el; break; }
      } catch { /* skip */ }
    }

    const parts: string[] = [];
    for (const p of source.querySelectorAll('p')) {
      const text = p.text.trim();
      if (text.length >= 25 && !isJunk(text)) parts.push(text);
    }

    const seen = new Set<string>();
    const deduped = parts.filter((t) => {
      const key = t.toLowerCase().slice(0, 80);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Restored to 6,000 characters. Trimming this made articles thinner,
    // and it was never the cost problem: input bills at $0.30/1M against
    // output at $2.50/1M, so the extra research costs a fraction of a cent
    // and is what gives the writing its detail.
    return { text: deduped.join('\n\n').slice(0, 6000), image };
  } catch {
    return { text: '', image: '' };
  }
}

/**
 * Is this thumbnail a real photo we should keep, as opposed to a generic
 * stock filler that is safe to replace?
 */
function isRealPhoto(url: string | null | undefined): boolean {
  if (!url) return false;
  // Generic stock pools and previously generated images are replaceable.
  if (/images\.unsplash\.com|article-thumbnails\/ai-/.test(url)) return false;
  return true;
}

interface Rewrite {
  seo_title?: string;
  description?: string;
  content?: string;
  seo_keywords?: string;
}

// Real billed usage, accumulated across the run. Reported back so cost is
// measured from Google's own token counts rather than estimated.
const usage = { promptTokens: 0, outputTokens: 0, thoughtTokens: 0, calls: 0 };

// Gemini 2.5 Flash list price per 1M tokens (USD). Thinking tokens bill at
// the output rate, which is why they are counted in with output below.
const USD_PER_1M_INPUT = 0.30;
const USD_PER_1M_OUTPUT = 2.50;

function estimateRunCostUsd(): number {
  const input = (usage.promptTokens / 1_000_000) * USD_PER_1M_INPUT;
  const output = ((usage.outputTokens + usage.thoughtTokens) / 1_000_000) * USD_PER_1M_OUTPUT;
  return input + output;
}

async function rewriteArticle(
  apiKey: string,
  article: ArticleRow,
  sourceFacts: string,
  sourceName: string,
  categoryName: string
): Promise<Rewrite | null> {
  const systemPrompt = `You are a staff journalist at CelebUD, a news publication covering Canada, Nigeria and world affairs.

Your job: take the research notes about a story that another outlet reported, and write CelebUD's OWN original article about it. This is re-reporting, exactly as Reuters, BBC or CNN do when they pick up a story — you retell the facts in completely fresh wording and structure.

ABSOLUTE RULES:
- Never copy sentences or phrasing from the research notes. Rewrite everything in your own words with your own structure and ordering.
- Never invent facts, quotes, names, numbers or dates. If the notes do not establish something, leave it out or describe it generally. Accuracy outweighs length.
- If the notes are thin, write a shorter but complete article rather than padding it with invented detail.
- Direct quotes may be reproduced only if they appear verbatim in the notes, and must be attributed to the person who said them.
- Write in clear, professional, active-voice news English.

OUTPUT: respond with ONE JSON object and nothing else — no markdown fences, no commentary. Exactly these keys:
- "seo_title": search-friendly title, under 70 characters
- "description": meta description / excerpt, 1-2 sentences, under 160 characters
- "seo_keywords": 5-8 comma-separated keywords someone would actually search
- "content": the article body as valid HTML

RULES for "content":
- Open with a strong standalone lead paragraph summarising the story.
- Use <h2> for section headings (and <h3> for sub-sections). Give the article at least two or three clearly-titled sections.
- Use <p> for paragraphs, <strong> for key terms, <em> for emphasis, <ul>/<ol> with <li> for lists, <blockquote> for a genuine quote from the notes.
- Include a <table> with <thead>/<tbody> ONLY when the story genuinely has comparable data (figures, timelines, before/after). Never fake a table.
- Aim for 600-900 words when the research supports it. Never pad.
- End with a <h2>Conclusion</h2> section that genuinely summarises what it means and what happens next.
- Then add attribution exactly like: <p><em>Reporting based on coverage by ${sourceName}.</em></p>
- Do NOT use <h1>, <div>, <span>, class or style attributes, markdown, or code fences. Do NOT repeat the headline inside the body. Never invent <img> tags or image URLs.

The "content" value must be a single valid JSON string with any internal double quotes escaped.`;

  const userPrompt = `Headline of the story: ${article.title}
Section: ${categoryName}
Originally reported by: ${sourceName}

Research notes (facts only — rewrite completely, never copy):
${sourceFacts || article.description || article.content || '(No detailed notes available — write a brief, factual piece using only the headline, and keep all claims general.)'}`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.65,
        // Restored to 4096. This is a ceiling, not a target — it costs
        // nothing unless an article actually uses it, and lowering it only
        // risked truncating the detailed pieces the newsroom wants kept.
        maxOutputTokens: 4096,
        // Gemini 2.5 Flash "thinks" by default and bills those hidden
        // reasoning tokens at the OUTPUT rate — several times the cost of
        // the article itself. Rewriting supplied notes needs no reasoning
        // budget, so it is switched off. This was the main cost overrun.
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`Gemini ${resp.status}: ${detail.slice(0, 200)}`);
  }

  const data = await resp.json();

  // Google's own token counts — the only trustworthy basis for cost.
  const um = data?.usageMetadata;
  if (um) {
    usage.calls++;
    usage.promptTokens += um.promptTokenCount || 0;
    usage.outputTokens += um.candidatesTokenCount || 0;
    usage.thoughtTokens += um.thoughtsTokenCount || 0;
  }

  if (data?.promptFeedback?.blockReason) {
    throw new Error(`blocked: ${data.promptFeedback.blockReason}`);
  }
  const cand = data?.candidates?.[0];
  const SAFETY = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION']);
  if (cand?.finishReason && SAFETY.has(cand.finishReason)) {
    throw new Error(`refused: ${cand.finishReason}`);
  }

  const raw: string = (cand?.content?.parts || []).map((p: { text?: string }) => p.text || '').join('').trim();
  if (!raw) throw new Error('empty response');

  let jsonStr = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const first = jsonStr.indexOf('{');
  const last = jsonStr.lastIndexOf('}');
  if (first !== -1 && last !== -1) jsonStr = jsonStr.slice(first, last + 1);

  try {
    return JSON.parse(jsonStr) as Rewrite;
  } catch {
    throw new Error('malformed JSON from model');
  }
}

/** Unique AI image, used for the stories readers actually see most. */
async function generateAiImage(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  title: string,
  description: string
): Promise<string | null> {
  try {
    const prompt = `Create a clean, modern, professional editorial thumbnail image for a news website article.
Article headline: "${title}".
${description ? `Context: ${description}.` : ''}
Style: high-quality, visually engaging conceptual illustration or symbolic photography suitable as a 16:9 news article thumbnail.
STRICT RULES: Do NOT depict any real, identifiable public figure, celebrity, or named person. Use only generic, symbolic or conceptual imagery. No text, letters, words, logos or watermarks anywhere in the image.`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${apiKey}`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    if (!resp.ok) return null;

    const data = await resp.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const img = parts.find((p: { inlineData?: { data?: string } }) => p?.inlineData?.data);
    if (!img) return null;

    const mimeType: string = img.inlineData.mimeType || 'image/png';
    const ext = mimeType.includes('jpeg') ? 'jpg' : mimeType.includes('webp') ? 'webp' : 'png';
    const bytes = Uint8Array.from(atob(img.inlineData.data), (c) => c.charCodeAt(0));
    const path = `article-thumbnails/ai-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from('media').upload(path, bytes, {
      contentType: mimeType, cacheControl: '3600', upsert: false,
    });
    if (error) return null;

    return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const started = Date.now();
  // Warm function instances reuse module state between requests, so the
  // counters must be zeroed per run or each response would report the
  // cumulative total instead of this run's.
  usage.promptTokens = 0;
  usage.outputTokens = 0;
  usage.thoughtTokens = 0;
  usage.calls = 0;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Either an admin session, or a scheduler presenting the cron secret.
    const cronSecret = Deno.env.get('ENRICH_CRON_SECRET');
    const presentedSecret = req.headers.get('X-Cron-Secret');
    const isCron = Boolean(cronSecret && presentedSecret && presentedSecret === cronSecret);

    if (!isCron) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userError } = await callerClient.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
      if (!profile?.is_admin) {
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured in Supabase → Edge Functions → Secrets.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const batchSize: number = Math.min(Math.max(Number(body.limit) || DEFAULT_BATCH, 1), 100);
    const ids: string[] | undefined = Array.isArray(body.ids) && body.ids.length ? body.ids : undefined;
    // AI images cost roughly 8x a text rewrite, so they are OFF unless the
    // caller explicitly asks for them.
    const withImages: boolean = body.withImages === true;

    // is_manual articles are hand-written by the newsroom and must never be
    // touched by any automated pass.
    let query = supabase
      .from('media_content')
      .select('id, title, slug, description, content, thumbnail_url, external_url, category_id, source_id, is_featured, is_trending, enrichment_attempts')
      .eq('media_type', 'article')
      .or('is_manual.is.null,is_manual.eq.false')
      // No source link means this is our own writing, not a fetched story.
      // It must never be queued - not even for a thumbnail change.
      .not('external_url', 'is', null);

    query = ids
      ? query.in('id', ids)
      : query
          .is('enriched_at', null)
          .lt('enrichment_attempts', MAX_ATTEMPTS)
          .order('published_at', { ascending: false })
          .limit(batchSize);

    const { data: articles, error: fetchErr } = await query;
    if (fetchErr) throw new Error(`Could not load articles: ${fetchErr.message}`);

    const { count: remainingBefore } = await supabase
      .from('media_content')
      .select('id', { count: 'exact', head: true })
      .eq('media_type', 'article')
      .or('is_manual.is.null,is_manual.eq.false')
      .not('external_url', 'is', null)
      .is('enriched_at', null)
      .lt('enrichment_attempts', MAX_ATTEMPTS);

    if (!articles || articles.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, failed: 0, remaining: remainingBefore ?? 0, message: 'Nothing left to enrich.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [{ data: categories }, { data: sources }] = await Promise.all([
      supabase.from('categories').select('id, name, slug'),
      supabase.from('news_sources').select('id, name'),
    ]);

    let processed = 0;
    let failed = 0;
    let imagesGenerated = 0;
    let skippedThin = 0;
    let realPhotosUsed = 0;
    let billingStopped = false;
    const errors: string[] = [];
    let timedOut = false;

    const enrichOne = async (article: ArticleRow) => {
      const category = categories?.find((c: { id: string }) => c.id === article.category_id);
      const categoryName: string = category?.name || 'News';
      const categorySlug: string | null = category?.slug || null;

      let sourceName = 'the original publisher';
      if (article.external_url) {
        try { sourceName = new URL(article.external_url).hostname.replace(/^www\./, ''); } catch { /* keep default */ }
      }
      const matchedSource = sources?.find((s: { id: string }) => s.id === article.source_id);
      if (matchedSource?.name) sourceName = matchedSource.name;

      const existing = stripHtml(article.content || article.description || '');

      // Only ever rewrite from an EXTERNAL source. Feeding an article's own
      // text back in as "research notes" is not re-reporting, it is
      // rewriting original work — that is how hand-written newsroom pieces
      // (including personal family articles) got turned into third-person
      // news copy and wrongly credited to an outside outlet. No source URL
      // means there is nothing to re-report, so the text is left untouched.
      const scraped = article.external_url
        ? await fetchSourceFacts(article.external_url)
        : { text: '', image: '' };
      const facts = scraped.text;
      const canRewrite = Boolean(article.external_url) && facts.length >= MIN_SOURCE_CHARS;

      let contentHtml = '';
      let rewrite: Rewrite | null = null;
      if (canRewrite) {
        rewrite = await rewriteArticle(apiKey, article, facts, sourceName, categoryName);
        contentHtml = (rewrite?.content || '').trim();
        if (!contentHtml) throw new Error('model returned no article body');
      }

      const description = (rewrite?.description || '').trim()
        || buildSeoDescription(stripHtml(contentHtml) || existing, article.title);
      const seoTitle = (rewrite?.seo_title || '').trim() || buildSeoTitle(article.title);
      const seoKeywords = (rewrite?.seo_keywords || '').trim()
        || buildSeoKeywords(article.title, description, categoryName);

      // Image priority, cheapest and most authentic first:
      //   1. A real photo the article already has — never overwritten.
      //   2. The publisher's own lead photo for this exact story.
      //   3. A matched topical stock photo.
      //   4. A generated image, only if there is genuinely nothing else
      //      and the caller opted in.
      let thumbnail: string | null = null;

      if (isRealPhoto(article.thumbnail_url)) {
        thumbnail = article.thumbnail_url;
      } else if (scraped.image) {
        thumbnail = scraped.image;
        realPhotosUsed++;
      } else {
        const topic = detectImageTopic(article.title, description, categorySlug);
        thumbnail = (await searchPexelsImage(topic.query, article.slug))
          || pickStockImage(topic.pool, article.slug);

        // Nothing genuine available — this is the only case worth paying
        // to generate an image for.
        if (!thumbnail && withImages) {
          thumbnail = await generateAiImage(supabase, apiKey, article.title, description);
          if (thumbnail) imagesGenerated++;
        }
      }

      const update: Record<string, unknown> = {
        description,
        seo_title: seoTitle.slice(0, 70),
        seo_keywords: seoKeywords,
        thumbnail_url: thumbnail,
        enriched_at: new Date().toISOString(),
      };
      // Only overwrite the body when we actually produced one — a thin
      // source must never blank out the text that is already there.
      if (contentHtml) update.content = contentHtml;

      const { error: updateErr } = await supabase
        .from('media_content')
        .update(update)
        .eq('id', article.id);

      if (updateErr) throw new Error(`save failed: ${updateErr.message}`);
      if (!canRewrite) skippedThin++;
    };

    // Small parallel waves: fast enough to clear the backlog, gentle enough
    // not to trip Gemini rate limits.
    for (let i = 0; i < articles.length; i += CONCURRENCY) {
      if (Date.now() - started > TIME_BUDGET_MS) { timedOut = true; break; }
      const wave = articles.slice(i, i + CONCURRENCY) as ArticleRow[];
      const results = await Promise.allSettled(wave.map((a) => enrichOne(a)));

      const failedThisWave: Array<{ article: ArticleRow; reason: string }> = [];
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') {
          processed++;
        } else {
          failed++;
          const reason = r.reason instanceof Error ? r.reason.message : String(r.reason);
          failedThisWave.push({ article: wave[idx], reason });
          if (isBillingFailure(reason)) billingStopped = true;
          if (errors.length < 10) errors.push(`${wave[idx].title.slice(0, 60)}: ${reason}`);
        }
      });

      // Record the failure so a permanently-broken article leaves the queue
      // instead of returning to the front of every future batch and being
      // charged for again.
      await Promise.allSettled(
        failedThisWave.map(({ article, reason }) =>
          supabase
            .from('media_content')
            .update({
              enrichment_attempts: (article.enrichment_attempts ?? 0) + 1,
              enrichment_error: reason.slice(0, 500),
            })
            .eq('id', article.id)
        )
      );

      // Out of credit or over quota: every remaining call would fail the
      // same way, so stop the whole run instead of burning through batches.
      if (billingStopped) break;
    }

    const { count: remaining } = await supabase
      .from('media_content')
      .select('id', { count: 'exact', head: true })
      .eq('media_type', 'article')
      .or('is_manual.is.null,is_manual.eq.false')
      .not('external_url', 'is', null)
      .is('enriched_at', null)
      .lt('enrichment_attempts', MAX_ATTEMPTS);

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        failed,
        imagesGenerated,
        metadataOnly: skippedThin,
        realPhotosUsed,
        billingStopped,
        // Measured, not estimated: straight from Google's token counts.
        usage: {
          ...usage,
          costUsd: Number(estimateRunCostUsd().toFixed(4)),
          costPerArticleUsd: processed > 0
            ? Number((estimateRunCostUsd() / processed).toFixed(5))
            : 0,
        },
        remaining: remaining ?? 0,
        timedOut,
        elapsedMs: Date.now() - started,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('enrich-articles error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
