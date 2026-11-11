// Dates.care featured-partner banner. Labelled "Sponsored" everywhere it shows.
//
// Sized like standard display ads (IAB / Google AdSense units) so it sits in
// the page the way readers expect an ad to, without taking it over:
//   - desktop and tablet: 728 x 90 leaderboard
//   - phone, in an article: 300 x 250 medium rectangle
//   - phone, on the homepage: 320 x 100 large mobile banner
import { Heart } from 'lucide-react';
import { DATES_CARE, partnerUrl, trackPartnerClick, SPONSORED_REL } from '../utils/partners';

type Variant = 'home' | 'article';

export function PartnerCard({ variant = 'article' }: { variant?: Variant }) {
  const placement = variant === 'home' ? 'homepage-card' : 'in-article';
  const href = partnerUrl(placement);
  const onClick = () => trackPartnerClick(placement);
  const isArticle = variant === 'article';

  // Phone size depends on placement; from the sm breakpoint up both become
  // a 728 x 90 leaderboard (shrinking with the column if it is narrower).
  const size = isArticle
    ? 'w-[300px] h-[250px] flex-col justify-center text-center gap-3 px-5'
    : 'w-[320px] h-[100px] flex-row gap-2.5 px-3';

  return (
    <aside aria-label="Sponsored" className={`not-prose flex flex-col items-center ${isArticle ? 'my-8' : 'mt-4'}`}>
      <span className="mb-1 text-[10px] uppercase tracking-widest text-gray-400">Sponsored</span>
      <a
        href={href}
        target="_blank"
        rel={SPONSORED_REL}
        onClick={onClick}
        aria-label="Dates.care: meet verified singles. Free to join."
        className={`group flex items-center overflow-hidden rounded-md border border-pink-200 text-white no-underline shadow-sm transition hover:shadow-md max-w-full ${size} sm:w-full sm:max-w-[728px] sm:h-[90px] sm:flex-row sm:text-left sm:justify-start sm:gap-4 sm:px-5`}
        style={{ background: `linear-gradient(110deg, ${DATES_CARE.color}, #BE185D)` }}
      >
        <span className={`flex flex-shrink-0 items-center justify-center rounded-full bg-white/20 ${isArticle ? 'h-14 w-14 sm:h-11 sm:w-11' : 'h-10 w-10 sm:h-11 sm:w-11'}`}>
          <Heart className={isArticle ? 'h-7 w-7 sm:h-5 sm:w-5' : 'h-5 w-5'} />
        </span>
        <span className={`min-w-0 ${isArticle ? '' : 'flex-1'} sm:flex-1`}>
          <span className="block text-[11px] font-bold uppercase tracking-widest text-pink-100">Dates.care</span>
          <span className={`block font-bold leading-snug ${isArticle ? 'text-xl sm:text-base' : 'text-sm sm:text-base'} sm:truncate`}>
            Meet verified singles
          </span>
          <span className={`text-pink-50 ${isArticle ? 'block text-sm mt-1 sm:mt-0' : 'hidden'} sm:block sm:truncate sm:text-sm`}>
            Private chat and video calls. Free to join.
          </span>
        </span>
        <span className="flex-shrink-0 whitespace-nowrap rounded-md bg-white px-3 sm:px-4 py-2 text-sm font-semibold text-pink-700 group-hover:bg-pink-50">
          Join free →
        </span>
      </a>
    </aside>
  );
}
