// Any in-app navigation means the reader is now on an app page, so the
// server-built copy of the first page (if any) must go.
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function SsrHandoff() {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    window.__ssrDone?.();
  }, [pathname]);
  return null;
}
