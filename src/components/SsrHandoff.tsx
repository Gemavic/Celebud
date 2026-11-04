// The first page a visitor opens arrives fully built by the server (#ssr),
// with the app hidden behind it. This decides when the app's own version is
// ready to take over:
//  - pages that know exactly when they are ready call window.__ssrDone()
//    themselves (the article page does, once it has the article);
//  - for every other page, as soon as the app has rendered real content
//    (no loading spinner left, a meaningful amount of text) and it has held
//    steady for a moment;
//  - and immediately on any in-app navigation.
// If the app never gets there (very weak connection, an error), the reader
// simply keeps the complete server-built page.
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const MIN_TEXT = 700;

export function SsrHandoff() {
  const { pathname } = useLocation();
  const first = useRef(true);

  useEffect(() => {
    if (!document.documentElement.classList.contains('ssr')) return;
    const root = document.getElementById('root');
    if (!root) return;
    let timer: number | undefined;
    const ready = () =>
      !root.querySelector('.animate-spin, [aria-busy="true"]') &&
      (root.textContent || '').replace(/\s+/g, ' ').length > MIN_TEXT;
    const check = () => {
      window.clearTimeout(timer);
      if (ready()) timer = window.setTimeout(() => { if (ready()) { window.__ssrDone?.(); obs.disconnect(); } }, 400);
    };
    const obs = new MutationObserver(check);
    obs.observe(root, { childList: true, subtree: true, characterData: true });
    check();
    return () => { obs.disconnect(); window.clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.__ssrDone?.();
  }, [pathname]);

  return null;
}
