// Lightweight SEO metadata generation, shared by fetch-news (at ingest) and
// enrich-articles (as a fallback if the AI omits a field).
//
// These are cheap heuristics, not AI — the point is that an article should
// NEVER land in the database with empty seo_title/seo_keywords the way ~4,400
// of them did. enrich-articles later replaces these with better AI-written
// versions, but even before that runs every article has usable metadata.

/** Words too common to be worth indexing as keywords. */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'than', 'that', 'this',
  'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
  'should', 'can', 'could', 'may', 'might', 'must', 'of', 'in', 'on', 'at',
  'to', 'for', 'with', 'by', 'from', 'as', 'into', 'about', 'over', 'after',
  'before', 'under', 'above', 'between', 'out', 'up', 'down', 'off', 'not',
  'no', 'nor', 'so', 'too', 'very', 'just', 'more', 'most', 'some', 'any',
  'all', 'both', 'each', 'few', 'other', 'own', 'same', 'it', 'its', 'he',
  'she', 'they', 'them', 'his', 'her', 'their', 'we', 'us', 'our', 'you',
  'your', 'i', 'me', 'my', 'who', 'whom', 'which', 'what', 'when', 'where',
  'why', 'how', 'there', 'here', 'says', 'said', 'new', 'now', 'also', 'amid',
  // Frequent headline filler that added noise rather than search value.
  'against', 'completely', 'got', 'get', 'gets', 'back', 'give', 'given',
  'first', 'last', 'next', 'since', 'could', 'still', 'across', 'among',
  'tops', 'records', 'record', 'set', 'sets', 'take', 'takes', 'taken',
  'make', 'makes', 'made', 'want', 'wants', 'need', 'needs', 'plan',
  'plans', 'call', 'calls', 'called', 'begin', 'begins', 'began', 'start',
  'starts', 'started', 'help', 'helps', 'keep', 'keeps', 'left', 'right',
  'many', 'much', 'well', 'good', 'best', 'better', 'top', 'four', 'five',
  'one', 'two', 'three', 'per', 'via', 'ahead', 'toward', 'towards',
]);

/**
 * Headlines written in Title Case make every word look like a proper noun,
 * which used to produce junk keyword phrases such as "Awaited IPO Got".
 * Detect that style so multi-word name extraction is skipped for those and
 * we fall back to plain frequency ranking instead.
 */
function isTitleCase(title: string): boolean {
  const words = title.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w) && w.length > 2);
  if (words.length < 4) return false;
  const capitalised = words.filter((w) => /^[A-Z]/.test(w)).length;
  return capitalised / words.length > 0.6;
}

// Google truncates search-result titles around 55-60 characters on desktop
// and shorter on mobile, so 70 meant headlines were being cut off in results
// even though they fit our own limit. 60 keeps the whole title visible.
const SEO_TITLE_MAX = 60;
const SEO_DESCRIPTION_MAX = 160;

/**
 * Trim a headline to search-result length without cutting a word in half.
 * Falls back to a hard slice only if the first word alone is over the limit.
 */
export function buildSeoTitle(title: string, siteSuffix = ''): string {
  const clean = (title || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';

  const withSuffix = siteSuffix && clean.length + siteSuffix.length + 3 <= SEO_TITLE_MAX
    ? `${clean} | ${siteSuffix}`
    : clean;

  if (withSuffix.length <= SEO_TITLE_MAX) return withSuffix;

  const cut = clean.slice(0, SEO_TITLE_MAX);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 30 ? cut.slice(0, lastSpace) : cut).trim();
}

/** A meta description: first sentences of the excerpt, capped for search. */
export function buildSeoDescription(description: string, fallback = ''): string {
  const clean = (description || fallback || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= SEO_DESCRIPTION_MAX) return clean;
  const cut = clean.slice(0, SEO_DESCRIPTION_MAX);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (lastStop > 80) return cut.slice(0, lastStop + 1).trim();
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/**
 * Pull the most salient terms out of a headline + excerpt.
 *
 * Multi-word proper nouns ("Emmanuel Macron", "World Cup") are kept intact
 * because they are what people actually search for; after that the highest
 * frequency single words fill the remaining slots. The category name is
 * always included so every article is discoverable by section.
 */
export function buildSeoKeywords(
  title: string,
  description: string,
  categoryName?: string | null,
  max = 8
): string {
  const keywords: string[] = [];
  const seen = new Set<string>();

  const add = (term: string) => {
    const t = term.trim().toLowerCase();
    if (t.length < 3 || seen.has(t) || STOP_WORDS.has(t)) return;
    seen.add(t);
    keywords.push(t);
  };

  if (categoryName) add(categoryName);

  // Runs of capitalised words in the headline = names, places, events.
  // Skipped for Title Case headlines, where capitalisation means nothing.
  if (!isTitleCase(title || '')) {
    const properNouns = (title || '').match(/\b[A-Z][a-zA-Z']+(?:\s+[A-Z][a-zA-Z']+)*/g) || [];
    for (const phrase of properNouns) {
      const words = phrase.split(/\s+/).filter((w) => !STOP_WORDS.has(w.toLowerCase()));
      if (words.length >= 2) add(words.slice(0, 3).join(' '));
      else if (words.length === 1 && words[0].length > 3) add(words[0]);
      if (keywords.length >= max) break;
    }
  }

  if (keywords.length < max) {
    const counts = new Map<string, number>();
    const words = `${title || ''} ${description || ''}`
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, ' ')
      .split(/\s+/);
    for (const w of words) {
      if (w.length < 4 || STOP_WORDS.has(w) || seen.has(w)) continue;
      counts.set(w, (counts.get(w) || 0) + 1);
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    for (const [word] of ranked) {
      add(word);
      if (keywords.length >= max) break;
    }
  }

  return keywords.slice(0, max).join(', ');
}
