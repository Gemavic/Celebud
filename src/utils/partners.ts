// Featured partners. Every link carries the partner's referral code (so
// sign-ups are credited) plus UTM tags naming the CelebUD placement, and is
// marked rel="sponsored" as Google requires for paid/affiliated links.
import { supabase } from '../lib/supabase';

export const DATES_CARE = {
  id: 'dates-care',
  name: 'Dates.care',
  ref: 'PX7XU3AY',
  base: 'https://dates.care/',
  color: '#EC4899',
};

export const SPONSORED_REL = 'sponsored noopener';

export function partnerUrl(placement: string): string {
  const u = new URL(DATES_CARE.base);
  u.searchParams.set('ref', DATES_CARE.ref);
  u.searchParams.set('utm_source', 'celebud');
  u.searchParams.set('utm_medium', placement);
  u.searchParams.set('utm_campaign', 'featured-partner');
  return u.toString();
}

// Fire-and-forget; never blocks the click.
export function trackPartnerClick(placement: string) {
  try {
    void supabase.from('partner_clicks').insert({
      partner: DATES_CARE.id,
      placement,
      path: window.location.pathname.slice(0, 300),
    }).then(() => undefined);
  } catch { /* ignore */ }
}

// Where the in-article banner may appear: lighter, people-focused sections,
// never hard politics, security or legal coverage, and never next to death,
// tragedy, crime or serious illness (the headline check below).
const PARTNER_SECTIONS = new Set(['entertainment', 'celebrity', 'lifestyle', 'travel', 'society', 'news', 'health']);
// Plurals and -er forms count too: "Romance Scams Targeting Diaspora Women"
// must never carry a dating ad.
const SOMBRE = /\b(dies|died|death|dead|killed|kills|murder|funeral|burial|mourn|tribute|rip|r\.i\.p|passes away|passed away|tragedy|tragic|accident|crash|abuse|assault|rape|kidnap|suicide|scam|scammer|fraud|fraudster|catfish|sextortion|cancer|tumour|tumor|outbreak|epidemic|pandemic|cholera|lassa|stroke|terminal|arrested|jailed|sentenced|divorce)(?:s|es|ed|ing)?\b/i;

// Grief stories ("Writer Yiyun Li lost both of her sons") have no single
// trigger word, so the common phrasings are matched as phrases.
const LOSS = /\b(?:grief|grieving|griev(?:e|es|ed)|bereave(?:d|ment)|mourning|lost (?:both )?(?:of )?(?:her|his|their|my|our) (?:sons?|daughters?|child|children|baby|husband|wife|mother|father|parents))\b/i;

const DATING_SAFETY = /\b(?:dating|date online|romance|romantic|singles?|relationships?|marriage|catfish(?:ed|ing)?)\b/i;
const SCAM_WORDS = /\b(?:scam|scammer|fraud|fraudster|catfish)(?:s|es|ed|ing)?\b/gi;

export function articleAllowsPartner(categorySlug: string | null | undefined, title: string): boolean {
  if (!categorySlug || !PARTNER_SECTIONS.has(categorySlug)) return false;
  // Dating-safety guides ("Romance Scams Aimed at Diaspora Women", "5 Red
  // Flags on Dating Sites") are read by exactly the people a verified dating
  // service is for, so scam and fraud words do not block the banner there.
  // Death, violence, crime, illness and grief words still do.
  const t = DATING_SAFETY.test(title || '') ? (title || '').replace(SCAM_WORDS, ' ') : (title || '');
  return !SOMBRE.test(t) && !LOSS.test(t);
}
