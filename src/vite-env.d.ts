/// <reference types="vite/client" />

interface Window {
  __ssrDone?: () => void;
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
}

declare const __BUILD_ID__: string;
