/**
 * Detection and repair for source text that survives a rewrite.
 *
 * The `description` column is written once at ingest from the raw feed
 * excerpt and is not touched when the body is rewritten. That let a fully
 * rewritten article keep another outlet's byline in its description -- and
 * prerender prints description in four places a crawler reads: the listing
 * paragraph, <meta name="description">, og:description and
 * twitter:description. So the only prose Google saw could be someone
 * else's, on an article the newsroom had genuinely rewritten.
 *
 * This is the server-side counterpart to checkDescriptionCompliance() in
 * src/utils/articleCompliance.ts. The client gate stops a human saving a
 * bad description; this stops fetch-news and enrich-articles writing one.
 * Keep the two pattern lists in step.
 */

export interface SourceTextHit {
  matched: boolean;
  label?: string;
}

const SOURCE_TEXT_PATTERNS: { re: RegExp; label: string }[] = [
  // "By Clifford Ndujihe", "By Henry Umoru" -- a newsroom credit line.
  { re: /\bBy\s+[A-Z][a-z]+\s+[A-Z][a-z]+/, label: "another outlet's byline" },
  // Nigerian papers mark standfirst bullets with ***.
  { re: /\*\*\*/, label: 'standfirst bullet markers (***)' },
  // Wire dateline: "LAGOS —", "ABUJA -".
  {
    re: /\b(LAGOS|ABUJA|NAIROBI|ACCRA|LONDON|NEW YORK|WASHINGTON|OTTAWA|TORONTO|KANO|IBADAN|PORT HARCOURT)\s*[—–-]\s/,
    label: 'a wire dateline',
  },
  {
    re: /\b(Reuters|Associated Press|AFP|Vanguard|Punch|Premium Times|The Guardian|BBC|CNN|CBC|Sky News|Al Jazeera|Channels TV|ThisDay|Daily Trust)\b/,
    label: 'a source publication name',
  },
  { re: /Continue reading|Read more at|Source:|\[…\]|\[\.\.\.\]/i, label: 'a read-on pointer' },
  { re: /…\s*$|\.\.\.\s*$/, label: 'a truncated excerpt ending' },
];

/** Returns the first source-text pattern the description trips, if any. */
export function detectSourceText(description: string | null | undefined): SourceTextHit {
  const d = (description || '').trim();
  if (!d) return { matched: false };
  for (const { re, label } of SOURCE_TEXT_PATTERNS) {
    if (re.test(d)) return { matched: true, label };
  }
  return { matched: false };
}

/**
 * Builds a clean description from already-rewritten body text.
 *
 * Used when a generated or ingested description trips detectSourceText.
 * The body has been rewritten, so prose taken from it is ours; this
 * degrades to a safe description instead of publishing a dirty one or
 * throwing the whole article away.
 *
 * Sentence-aware so the result does not end mid-clause -- and never ends
 * in an ellipsis, which is itself one of the patterns above.
 */
export function deriveCleanDescription(
  bodyText: string,
  title: string,
  maxLen = 300,
): string {
  const flat = (bodyText || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!flat) return (title || '').trim().slice(0, maxLen);

  const sentences = flat.split(/(?<=[.!?])\s+/);
  let out = '';
  for (const s of sentences) {
    // Never rebuild a dirty description out of a dirty sentence.
    if (detectSourceText(s).matched) continue;
    const next = out ? `${out} ${s}` : s;
    if (next.length > maxLen) break;
    out = next;
  }

  if (!out) {
    const cut = flat.slice(0, maxLen);
    const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
    out = lastStop > 60 ? cut.slice(0, lastStop + 1) : cut.replace(/\s+\S*$/, '');
  }

  return out.replace(/[\s…]+$/, '').trim();
}

/**
 * The one call a writer path needs: hand it a candidate description and the
 * rewritten body, get back a description safe to store.
 */
export function sanitizeDescription(
  candidate: string | null | undefined,
  bodyText: string,
  title: string,
  maxLen = 300,
): { description: string; replaced: boolean; reason?: string } {
  const hit = detectSourceText(candidate);
  if (!hit.matched) {
    const clean = (candidate || '').trim();
    if (clean) return { description: clean.slice(0, maxLen), replaced: false };
  }
  return {
    description: deriveCleanDescription(bodyText, title, maxLen),
    replaced: true,
    reason: hit.label,
  };
}
