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
    try {
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
