// Dates.care featured-partner card. Labelled "Sponsored" everywhere it shows.
import { Heart, ShieldCheck } from 'lucide-react';
import { DATES_CARE, partnerUrl, trackPartnerClick, SPONSORED_REL } from '../utils/partners';

type Variant = 'home' | 'article';

export function PartnerCard({ variant = 'article' }: { variant?: Variant }) {
  const placement = variant === 'home' ? 'homepage-card' : 'in-article';
  const href = partnerUrl(placement);
  const onClick = () => trackPartnerClick(placement);

  if (variant === 'home') {
    return (
      <a href={href} target="_blank" rel={SPONSORED_REL} onClick={onClick}
        className="group mt-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl p-5 text-white transition hover:brightness-105"
        style={{ background: `linear-gradient(120deg, ${DATES_CARE.color}, #BE185D)` }}>
        <span className="flex items-center gap-3 flex-1">
          <span className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0"><Heart className="w-5 h-5" /></span>
          <span>
            <span className="block text-xs font-bold uppercase tracking-widest text-pink-100">Sponsored · Featured partner</span>
            <span className="block font-bold text-lg">Looking for something serious? Meet verified singles on Dates.care</span>
            <span className="block text-sm text-pink-50 mt-0.5">Free to join, browse and chat — open to singles in every country.</span>
          </span>
        </span>
        <span className="font-semibold bg-white text-pink-700 rounded-lg px-4 py-2 text-center whitespace-nowrap group-hover:bg-pink-50">Join free →</span>
      </a>
    );
  }

  return (
    <aside aria-label="Sponsored" className="not-prose my-8 rounded-xl border border-pink-200 bg-pink-50 p-5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-pink-700">Sponsored</p>
      <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-4">
        <span className="w-11 h-11 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ background: DATES_CARE.color }}><Heart className="w-5 h-5" /></span>
        <div className="flex-1">
          <p className="font-bold text-gray-900">Dating, done properly</p>
          <p className="text-sm text-gray-700 flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-pink-600 flex-shrink-0" /> Verified profiles, private chat and video calls. Free to join.</p>
        </div>
        <a href={href} target="_blank" rel={SPONSORED_REL} onClick={onClick}
          className="text-center font-semibold text-white rounded-lg px-4 py-2 hover:brightness-110 no-underline"
          style={{ background: DATES_CARE.color }}>
          Visit Dates.care
        </a>
      </div>
    </aside>
  );
}
