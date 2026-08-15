// src/utils/articleCompliance.ts
//
// The house style (CelebUD_Article_Template.md / CelebUD_Insurance_Template.md)
// has always told writers what a compliant article looks like — 4-6 <h2>
// sections, a Q&A block, a disclaimer, no Word/Docs paste — but nothing
// actually ENFORCED it. A reporter could paste straight from Word and hit
// Save, and it went live exactly as pasted: 148KB of Microsoft Office XML,
// zero <h2> sections, no disclaimer, is a real example that was live on the
// site (Tunde Ibrahim Amusa, "The Future of Nigerian Technology").
//
// This is that enforcement. Checked in ArticleManagement's saveArticle()
// for any hand-written (is_manual) article: if it fails, the article saves
// (so nothing is lost) but stays unpublished — same is_published mechanism
// already used to hold back fetched articles until they meet the bar.

export interface ComplianceViolation {
  /** Short id so callers can group/filter without string-matching prose. */
  code: string;
  /** Human-readable, specific enough to act on without re-reading the rules. */
  message: string;
  /** blocking = article cannot publish until fixed. warning = shown, not blocking. */
  severity: 'blocking' | 'warning';
}

export interface ComplianceResult {
  passed: boolean;
  violations: ComplianceViolation[];
  wordCount: number;
}

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'a',
  'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'hr',
  'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
]);

function wordCount(html: string): number {
  const text = (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/g, ' ');
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Every tag actually present in the raw HTML, allowed or not. */
function tagsPresent(html: string): Set<string> {
  const found = new Set<string>();
  const re = /<\/?([a-zA-Z][a-zA-Z0-9:-]*)[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) found.add(m[1].toLowerCase());
  return found;
}

function h2Texts(html: string): string[] {
  return [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gis)].map((m) =>
    m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim()
  );
}

/**
 * Checks one article body against the house structural standard.
 *
 * Deliberately does not check word count or table presence as BLOCKING —
 * those vary legitimately by topic. What blocks publication is the pattern
 * that keeps recurring: content pasted from Word or a chat app, arriving
 * with no real structure and a pile of markup the site was never going to
 * use anyway.
 */
export function checkArticleCompliance(html: string): ComplianceResult {
  const violations: ComplianceViolation[] = [];
  const content = html || '';
  const words = wordCount(content);

  if (!content.trim()) {
    return {
      passed: false,
      wordCount: 0,
      violations: [{ code: 'empty', message: 'Content is empty.', severity: 'blocking' }],
    };
  }

  // ── Word/Docs/chat-app paste artifacts ────────────────────────────
  const tags = tagsPresent(content);
  const junkTags = [...tags].filter((t) => !ALLOWED_TAGS.has(t));
  if (junkTags.length > 0) {
    violations.push({
      code: 'disallowed-tags',
      severity: 'blocking',
      message:
        `Contains formatting the site does not use — likely pasted from Word, Google ` +
        `Docs, or a chat app instead of typed/pasted as plain text: ${junkTags.slice(0, 8).join(', ')}` +
        (junkTags.length > 8 ? `, and ${junkTags.length - 8} more` : '') +
        `. Re-paste as plain text (Ctrl+Shift+V) or clean the HTML directly.`,
    });
  }

  // A cleanly-typed ~1,200-word article runs a few KB. Anything vastly
  // larger than that, even after allowed tags only, is bloat riding along —
  // the surest sign of a Word paste even when no single disallowed tag
  // happens to survive a quick eyeball check.
  if (content.length > 20_000) {
    violations.push({
      code: 'oversized',
      severity: 'blocking',
      message:
        `Content is ${Math.round(content.length / 1024)}KB — far larger than a normal ` +
        `article (a clean ${words.toLocaleString()}-word piece should be a few KB). This is ` +
        `almost always leftover formatting from a paste, not real content.`,
    });
  }

  if (/<h1[\s>]/i.test(content)) {
    violations.push({
      code: 'has-h1',
      severity: 'blocking',
      message: 'Contains an <h1> — the headline is its own field; remove any heading from inside the content.',
    });
  }

  // ── Required structure ─────────────────────────────────────────────
  const h2s = h2Texts(content);
  if (h2s.length < 4) {
    violations.push({
      code: 'too-few-h2',
      severity: 'blocking',
      message: `Only ${h2s.length} section heading${h2s.length === 1 ? '' : 's'} (<h2>) — the house style needs 4-6 clearly-labelled sections, not one long unbroken piece.`,
    });
  }

  if (!content.includes('<blockquote')) {
    violations.push({
      code: 'no-blockquote',
      severity: 'blocking',
      message: 'No <blockquote> — every article needs one pull-quote or key-takeaway callout.',
    });
  }

  if (!content.includes('<hr')) {
    violations.push({
      code: 'no-disclaimer',
      severity: 'blocking',
      message: 'No closing disclaimer/divider (<hr />) — every article ends with one.',
    });
  }

  const qaHeading = h2s.find((t) => /questions?\s*(&|and)\s*answers|frequently asked questions|faq/i.test(t));
  if (!qaHeading) {
    violations.push({
      code: 'no-qa',
      severity: 'blocking',
      message: 'No "Questions & Answers" section — the house style needs 5-7 reader questions as <h3> under a labelled <h2>.',
    });
  } else {
    const h3Count = (content.match(/<h3/g) || []).length;
    if (h3Count < 5) {
      violations.push({
        code: 'too-few-qa',
        severity: 'warning',
        message: `Only ${h3Count} question${h3Count === 1 ? '' : 's'} in the Q&A section — aim for 5-7.`,
      });
    }
  }

  if (!h2s.some((t) => /key takeaways/i.test(t))) {
    violations.push({
      code: 'no-takeaways',
      severity: 'blocking',
      message: 'No "Key Takeaways" section.',
    });
  }

  if (!h2s.some((t) => /conclusion/i.test(t))) {
    violations.push({
      code: 'no-conclusion',
      severity: 'blocking',
      message: 'No "Conclusion" section.',
    });
  }

  // ── Soft guidance — shown, never blocks ─────────────────────────────
  if (words < 900 || words > 1600) {
    violations.push({
      code: 'word-count',
      severity: 'warning',
      message: `${words.toLocaleString()} words — house target is 1,000-1,400.`,
    });
  }
  if (!content.includes('<table')) {
    violations.push({
      code: 'no-table',
      severity: 'warning',
      message: 'No comparison table — add one if the topic involves cost, eligibility, or a timeline.',
    });
  }

  const blocking = violations.filter((v) => v.severity === 'blocking');
  return { passed: blocking.length === 0, violations, wordCount: words };
}
