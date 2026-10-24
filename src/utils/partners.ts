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

// Where the in-article card may appear: relationship-friendly sections only,
// and never next to death, tragedy or crime coverage.
const PARTNER_SECTIONS = new Set(['entertainment', 'celebrity', 'lifestyle', 'travel']);
const SOMBRE = /\b(dies|died|death|dead|killed|kills|murder|funeral|burial|mourn|tribute|rip|r\.i\.p|passes away|passed away|tragedy|tragic|accident|crash|abuse|assault|rape|kidnap|suicide|scam|fraud|arrested|jailed|sentenced|divorce)\b/i;

export function articleAllowsPartner(categorySlug: string | null | undefined, title: string): boolean {
  if (!categorySlug || !PARTNER_SECTIONS.has(categorySlug)) return false;
  return !SOMBRE.test(title || '');
}
