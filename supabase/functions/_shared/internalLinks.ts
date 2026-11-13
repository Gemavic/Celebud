// supabase/functions/_shared/internalLinks.ts
//
// Adds one to three links inside an article's own text to related CelebUD
// originals ("how to build a credit score" -> the credit score guide).
// The Related Articles box at the end of every page is separate and stays.
//
// Built so it cannot invent or break anything:
//   - Candidates come from the database: published CelebUD originals only.
//   - The model only CHOOSES: which paragraph, which phrase already in it,
//     which candidate. It never writes text or URLs.
//   - Code checks every choice: the phrase must appear word for word in that
//     paragraph's plain text, outside any existing link, and each target is
//     used once. Anything that fails a check is dropped.
//   - Headings, tables, lists, quotations and the disclaimer are never
//     touched; only <p> paragraphs in the body.

// deno-lint-ignore no-explicit-any
type Supa = any;

export interface AddedLink { url: string; title: string; anchor: string }

const STOP = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'what', 'when', 'where', 'which', 'why', 'how',
  'you', 'your', 'yours', 'are', 'was', 'were', 'has', 'have', 'had', 'not', 'but', 'can', 'could',
  'will', 'would', 'should', 'into', 'about', 'after', 'before', 'their', 'there', 'they', 'them',
  'than', 'then', 'more', 'most', 'some', 'such', 'only', 'also', 'just', 'over', 'very', 'much',
  'news', 'guide', 'explained', 'everything', 'need', 'know', 'things', 'ways', 'tips', 'best', 'year',
  '2025', '2026', '2027', 'celebud',
]);

const terms = (text: string) =>
  new Set(
    (text || '')
      .toLowerCase()
      .replace(/<[^>]+>/g, ' ')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP.has(w))
      // crude stem so "insurance"/"insurer", "taxes"/"tax" meet
      .map((w) => w.replace(/(ies|es|s|ing|ed)$/, '').slice(0, 7)),
  );

export const articlePath = (a: { id: string; slug?: string | null }) =>
  `/article/${a.id}${a.slug ? `/${a.slug}` : ''}`;

interface Para { index: number; start: number; end: number; inner: string }

/** Top-level body <p> paragraphs: not inside blockquote, table, li or after the disclaimer rule. */
function bodyParagraphs(html: string): Para[] {
  const out: Para[] = [];
  const disclaimerAt = (() => {
    const m = html.search(/<hr\b[^>]*>\s*<p>\s*<strong>\s*Disclaimer/i);
    return m === -1 ? html.length : m;
  })();
  const re = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m.index >= disclaimerAt) break;
    const before = html.slice(0, m.index);
    const open = (tag: string) =>
      (before.match(new RegExp(`<${tag}\\b`, 'gi')) || []).length -
      (before.match(new RegExp(`</${tag}>`, 'gi')) || []).length;
    if (open('blockquote') > 0 || open('table') > 0 || open('li') > 0) continue;
    const text = m[1].replace(/<[^>]+>/g, '').trim();
    if (text.length < 60 || /^\[|^<img/i.test(m[1].trim())) continue; // image placeholders, short lines
    out.push({ index: out.length, start: m.index, end: m.index + m[0].length, inner: m[1] });
  }
  return out;
}

/**
 * Wraps the first occurrence of `anchor` in `inner` (a paragraph's inner HTML)
 * in a link, only where it sits in plain text: not inside a tag, an existing
 * link or quotation marks. Returns null when it cannot.
 */
function linkInside(inner: string, anchor: string, href: string): string | null {
  const parts = inner.split(/(<[^>]+>)/g);
  let inLink = 0;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.startsWith('<')) {
      if (/^<a\b/i.test(p)) inLink++;
      else if (/^<\/a>/i.test(p)) inLink = Math.max(0, inLink - 1);
      continue;
    }
    if (inLink) continue;
    const at = p.indexOf(anchor);
    if (at === -1) continue;
    // Not inside a quotation: count quote marks before the anchor in this run.
    const head = p.slice(0, at);
    const straight = (head.match(/"/g) || []).length;
    const curlyOpen = (head.match(/“/g) || []).length - (head.match(/”/g) || []).length;
    if (straight % 2 === 1 || curlyOpen > 0) continue;
    parts[i] = `${head}<a href="${href}">${anchor}</a>${p.slice(at + anchor.length)}`;
    return parts.join('');
  }
  return null;
}

/**
 * Adds up to `max` in-text links to related CelebUD originals. Never throws:
 * on any failure the HTML comes back unchanged with `added` empty.
 */
export async function addInternalLinks(
  supabase: Supa,
  html: string,
  opts: { title: string; apiKey: string; model?: string; excludeId?: string; max?: number },
): Promise<{ html: string; added: AddedLink[] }> {
  const unchanged = { html, added: [] as AddedLink[] };
  try {
    const max = Math.min(Math.max(opts.max ?? 3, 1), 5);
    if (!html || !opts.title) return unchanged;

    // Already linked enough? Count existing links to CelebUD articles.
    const existing = (html.match(/href="(?:https?:\/\/(?:www\.)?celebud\.com)?\/article\/[0-9a-f-]{36}/gi) || []).length;
    const room = max - existing;
    if (room <= 0) return unchanged;

    const paras = bodyParagraphs(html);
    if (paras.length < 3) return unchanged;

    const { data: pool } = await supabase
      .from('media_content')
      .select('id, slug, title, seo_keywords, description')
      .eq('is_published', true)
      .eq('is_manual', true)
      .eq('media_type', 'article')
      .gte('word_count', 500)
      .order('published_at', { ascending: false })
      .limit(400);
    if (!pool?.length) return unchanged;

    const mine = terms(`${opts.title} ${opts.title} ${html.replace(/<[^>]+>/g, ' ').slice(0, 6000)}`);
    const linkedAlready = new Set((html.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) || []).map((x) => x.toLowerCase()));
    const titleTerms = terms(opts.title);

    const ranked = (pool as Array<{ id: string; slug: string | null; title: string; seo_keywords: string | null; description: string | null }>)
      .filter((c) => c.id !== opts.excludeId && !linkedAlready.has(c.id.toLowerCase()))
      .map((c) => {
        const theirs = terms(`${c.title} ${c.seo_keywords || ''}`);
        let overlap = 0;
        theirs.forEach((t) => { if (mine.has(t)) overlap++; });
        // An article with an almost identical headline is a duplicate, not a
        // related read: skip it.
        let same = 0;
        theirs.forEach((t) => { if (titleTerms.has(t)) same++; });
        const dup = titleTerms.size > 0 && same / Math.max(titleTerms.size, theirs.size) > 0.8;
        return { c, score: dup ? 0 : overlap };
      })
      .filter((x) => x.score >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((x) => x.c);
    if (ranked.length === 0) return unchanged;

    const paraText = paras.map((p) => `[P${p.index}] ${p.inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()}`).join('\n');
    const candText = ranked.map((c, i) => `[A${i}] ${c.title}${c.description ? ` — ${c.description.slice(0, 160)}` : ''}`).join('\n');

    const system = `You are a sub-editor adding links from an article to other articles on the same website. Choose at most ${room} places where a link would genuinely help a reader who wants to know more. Rules:
- Only link to an article that is truly about the phrase you link. If none fit well, return an empty list.
- The anchor must be a phrase of 2 to 8 words copied EXACTLY, character for character, from that paragraph. It must describe the linked article's topic (for example "build a credit score"), never "click here", "this article" or "read more".
- At most one link per paragraph and each article at most once. Do not choose the first paragraph.
- Do not change any wording.
Output a SINGLE JSON object, nothing else: {"links":[{"paragraph":3,"anchor":"exact phrase","article":0}]}`;
    const user = `ARTICLE TITLE: ${opts.title}\n\nPARAGRAPHS:\n${paraText.slice(0, 14000)}\n\nARTICLES YOU MAY LINK TO:\n${candText}`;

    const model = opts.model || 'gemini-flash-latest';
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${opts.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1024, responseMimeType: 'application/json' },
        }),
      },
    );
    if (!resp.ok) return unchanged;
    const data = await resp.json();
    const raw: string = (data?.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || '').join('').trim();
    const a = raw.indexOf('{'); const b = raw.lastIndexOf('}');
    const parsed = JSON.parse(a !== -1 && b !== -1 ? raw.slice(a, b + 1) : raw);
    const picks: Array<{ paragraph?: number; anchor?: string; article?: number }> = Array.isArray(parsed?.links) ? parsed.links : [];

    // Apply from the last paragraph backwards so earlier offsets stay valid.
    const usedParas = new Set<number>();
    const usedTargets = new Set<string>();
    const accepted: Array<{ para: Para; anchor: string; target: typeof ranked[number] }> = [];
    for (const pk of picks) {
      if (accepted.length >= room) break;
      const para = paras.find((p) => p.index === Number(pk.paragraph));
      const target = ranked[Number(pk.article)];
      const anchor = String(pk.anchor || '').trim();
      const words = anchor.split(/\s+/).filter(Boolean).length;
      if (!para || !target || para.index === 0 || usedParas.has(para.index) || usedTargets.has(target.id)) continue;
      if (words < 2 || words > 8 || /click here|read more|this article/i.test(anchor)) continue;
      accepted.push({ para, anchor, target });
      usedParas.add(para.index);
      usedTargets.add(target.id);
    }

    let out = html;
    const added: AddedLink[] = [];
    for (const item of accepted.sort((x, y) => y.para.start - x.para.start)) {
      const href = articlePath(item.target);
      const newInner = linkInside(item.para.inner, item.anchor, href);
      if (newInner === null) continue; // phrase not found as written: dropped
      const block = out.slice(item.para.start, item.para.end);
      const replaced = block.replace(item.para.inner, () => newInner);
      if (replaced === block) continue;
      out = out.slice(0, item.para.start) + replaced + out.slice(item.para.end);
      added.push({ url: href, title: item.target.title, anchor: item.anchor });
    }
    return { html: out, added: added.reverse() };
  } catch (e) {
    console.warn('internal links skipped:', e instanceof Error ? e.message : e);
    return unchanged;
  }
}
