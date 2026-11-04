// Turns a server-built page (from server/render.ts) into the page EVERY
// visitor gets: the site's normal app shell (scripts, styles, ads), with the
// page's own title/description/canonical/structured data in <head> and the
// finished article visible in <body> from the first byte. The app then loads
// on top and swaps in its interactive version when it is ready (see
// window.__ssrDone in index.html). If the app never loads, the reader still
// has the whole article.

let shellCache: { html: string; at: number } | null = null;

export async function getShell(origin: string, cookie = ''): Promise<string> {
  if (shellCache && Date.now() - shellCache.at < 60_000) return shellCache.html;
  // The cookie only matters on password-protected preview deployments.
  const res = await fetch(`${origin}/index.html`, { headers: { 'x-celebud-shell': '1', ...(cookie ? { cookie } : {}) } });
  if (!res.ok) throw new Error(`shell ${res.status}`);
  const html = await res.text();
  if (!html.includes('id="root"')) throw new Error('shell without root');
  shellCache = { html, at: Date.now() };
  return html;
}

const between = (s: string, a: string, b: string) => {
  const i = s.indexOf(a);
  const j = s.indexOf(b, i + a.length);
  return i === -1 || j === -1 ? '' : s.slice(i + a.length, j);
};

// Tags in the generic shell that would contradict the page's own.
const GENERIC_HEAD = [
  /<title>[\s\S]*?<\/title>/i,
  /<meta\s+name="(description|keywords|robots|author)"[^>]*>/gi,
  /<meta\s+property="og:[^"]*"[^>]*>/gi,
  /<meta\s+name="twitter:(card|title|description|image)"[^>]*>/gi,
  /<link\s+rel="canonical"[^>]*>/gi,
];

const SSR_CSS = `<style id="ssr-css">
html.ssr #root{visibility:hidden;position:absolute;top:0;left:0;width:100%;height:0;overflow:hidden}
#ssr{font-family:Georgia,'Times New Roman',serif;color:#1f2937;background:#fff;min-height:100vh}
#ssr .ssr-top{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #e5e7eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
#ssr .ssr-top div{max-width:1100px;margin:0 auto;padding:14px 16px;display:flex;align-items:center;gap:18px;flex-wrap:wrap}
#ssr .ssr-top a{color:#111827;text-decoration:none;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:.02em}
#ssr .ssr-top a.logo{font-size:24px;text-transform:none;letter-spacing:-.5px}
#ssr .ssr-top a.logo span{color:#dc2626}
#ssr main{max-width:760px;margin:0 auto;padding:28px 16px 48px}
#ssr h1{font-size:clamp(26px,4.5vw,40px);line-height:1.15;margin:0 0 12px;color:#111827}
#ssr h2{font-size:24px;margin:32px 0 10px;color:#111827}
#ssr h3{font-size:19px;margin:24px 0 8px}
#ssr p,#ssr li{font-size:18px;line-height:1.75}
#ssr article>p:first-of-type{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#6b7280}
#ssr img,#ssr video,#ssr iframe{max-width:100%;height:auto;border-radius:12px;margin:16px 0}
#ssr a{color:#dc2626}
#ssr blockquote{border-left:4px solid #dc2626;margin:20px 0;padding:4px 16px;color:#4b5563;font-style:italic}
#ssr table{border-collapse:collapse;width:100%}#ssr td,#ssr th{border:1px solid #e5e7eb;padding:6px}
#ssr nav[aria-label="Related articles"]{border-top:1px solid #e5e7eb;margin-top:40px;padding-top:8px}
#ssr footer{background:#111827;color:#d1d5db;padding:28px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
#ssr footer ul{max-width:1100px;margin:0 auto;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:8px 20px}
#ssr footer a{color:#d1d5db;font-size:14px;text-decoration:none}
</style>`;

const TOP_BAR = `<header class="ssr-top"><div>
<a class="logo" href="/">Celeb<span>UD</span></a>
<a href="/election-2027" style="color:#dc2626">Election 2027</a>
<a href="/?category=news">News</a><a href="/?category=politics">Politics</a>
<a href="/?category=entertainment">Entertainment</a><a href="/fin-advisor">Fin-Advisor</a>
</div></header>`;

/**
 * Merge a full server-built document into the app shell. Returns null if the
 * page is not something to merge (no <head>/<body>), so the caller can fall
 * back to the plain app.
 */
export function mergeIntoShell(shell: string, page: string): string | null {
  const pageHead = between(page, '<head>', '</head>');
  const pageBody = between(page, '<body>', '</body>');
  if (!pageHead || !pageBody) return null;

  let html = shell;
  for (const re of GENERIC_HEAD) html = html.replace(re, '');
  const headTags = pageHead.replace(/<meta\s+charset=[^>]*>/i, '').trim();
  html = html.replace(/<meta charset="UTF-8"\s*\/>/i, (m) => `${m}\n${headTags}\n${SSR_CSS}`);

  html = html.replace(/<html lang="en">/i, '<html lang="en" class="ssr">');
  // The "enable JavaScript" fallback describes an empty page — this one is not.
  html = html.replace(/<noscript>[\s\S]*?<\/noscript>/i, '');
  const footer = (pageBody.match(/<footer>[\s\S]*<\/footer>/i) || [''])[0];
  const main = pageBody.replace(/<footer>[\s\S]*<\/footer>\s*$/i, '');
  // Function replacer: article text can contain "$&"-style sequences that a
  // string replacement would interpret.
  html = html.replace('<div id="root">', () => `<div id="ssr">${TOP_BAR}<main>${main}</main>${footer}</div>\n<div id="root">`);
  return html;
}
