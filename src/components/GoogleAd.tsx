import { useEffect, useRef, useState } from 'react';

interface GoogleAdProps {
  slot: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  responsive?: boolean;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

const ADSENSE_SRC =
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4993440473524094';

/**
 * Loads the AdSense script the first time an ad slot is actually rendered.
 *
 * It used to sit in index.html, so it ran on every screen of the site -
 * including the curated rewrites, admin pages and empty loading states - and
 * any Auto ads could land there. AdSense rejected the site for exactly that:
 * "Google-served ads on screens without publisher content". Now the script
 * only exists on pages that render a GoogleAd, and those are restricted to
 * the homepage and the newsroom's own hand-written articles.
 */
function ensureAdSenseScript(): void {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]`)) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = ADSENSE_SRC;
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
}

/**
 * An AdSense slot that collapses when no ad is served.
 *
 * AdSense reserves height on the <ins> element as soon as it initialises,
 * before it knows whether an ad is available. When nothing fills -- which is
 * every impression while a site is unapproved, and a normal share of them
 * afterwards -- that height stays, leaving a large blank band. On mobile
 * article pages this pushed the headline and opening paragraph below the
 * fold, so the first screen a reader (or a policy reviewer) saw was mostly
 * empty space.
 *
 * Google signals the outcome by setting data-ad-status on the <ins>:
 * "filled" or "unfilled". Watching that attribute lets the whole container --
 * label included -- be removed when there is nothing to show, while keeping
 * the reserved height whenever an ad IS coming. That distinction matters:
 * collapsing pre-emptively would reintroduce the layout shift this reserved
 * space exists to prevent, which Core Web Vitals measures as CLS.
 */
export function GoogleAd({ slot, format = 'auto', responsive = true, className = '' }: GoogleAdProps) {
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const [unfilled, setUnfilled] = useState(false);

  useEffect(() => {
    if (pushed.current) return;
    ensureAdSenseScript();
    try {
      // Queued until the script above finishes loading, then filled.
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense script not loaded, or blocked by the reader's browser.
      // Treat it the same as unfilled so no empty band is left behind.
      setUnfilled(true);
      return;
    }

    const ins = insRef.current;
    if (!ins) return;

    const read = () => {
      const status = ins.getAttribute('data-ad-status');
      if (status === 'unfilled') setUnfilled(true);
      else if (status === 'filled') setUnfilled(false);
    };

    read();
    const observer = new MutationObserver(read);
    observer.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });

    // If AdSense never reports back at all -- script blocked, request timed
    // out -- the slot would otherwise hold its height indefinitely.
    const timeout = window.setTimeout(() => {
      if (!ins.getAttribute('data-ad-status')) setUnfilled(true);
    }, 4000);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, []);

  if (unfilled) return null;

  return (
    <div className={`ad-container my-6 ${className}`}>
      <div className="text-center">
        <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">Advertisement</span>
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-4993440473524094"
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive={responsive ? 'true' : 'false'}
        />
      </div>
    </div>
  );
}
