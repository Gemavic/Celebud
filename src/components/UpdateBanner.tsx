// Tells editors when the site they have open is older than the live one,
// so a long-open admin tab (or a copy served from the offline cache) never
// silently runs yesterday's tools.
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const entryOf = (html: string) => (html.match(/\/assets\/index-[\w-]+\.js/) || [''])[0];

export function UpdateBanner() {
  const { pathname } = useLocation();
  const [stale, setStale] = useState(false);
  const staffPage = /^\/(admin|editorial)/.test(pathname);

  useEffect(() => {
    if (!staffPage || import.meta.env.DEV) return;
    const mine = entryOf(Array.from(document.scripts).map((s) => s.src).join(' '));
    if (!mine) return;
    let alive = true;
    const check = async () => {
      try {
        const html = await (await fetch('/', { cache: 'no-store' })).text();
        const live = entryOf(html);
        if (alive && live && live !== mine) setStale(true);
      } catch { /* offline: ignore */ }
    };
    const t = window.setTimeout(check, 3000);
    const iv = window.setInterval(check, 5 * 60 * 1000);
    const onVis = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { alive = false; clearTimeout(t); clearInterval(iv); document.removeEventListener('visibilitychange', onVis); };
  }, [staffPage]);

  if (!stale || !staffPage) return null;
  return (
    <div role="alert" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] max-w-[calc(100vw-2rem)] bg-gray-900 text-white rounded-xl shadow-2xl px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
      <span><b>CelebUD has been updated.</b> Save your work, then reload to get the latest tools.</span>
      <button type="button" onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700 rounded-lg px-3 py-1.5 font-semibold">Reload now</button>
    </div>
  );
}
