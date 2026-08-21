// Vercel Edge Middleware — two jobs, both about what non-humans receive.
//
// 1. PRERENDER for crawlers on routes a vercel.json rewrite cannot reach.
//    Vercel checks the filesystem BEFORE it evaluates `rewrites`. The build
//    emits index.html, which is served at "/", so the bot rewrite for "/"
//    was never reached — Googlebot got the same 9,390-byte empty JS shell a
//    plain fetch gets, while the Prerender function called directly returned
//    30 article links and ~1,000 words. Middleware runs before the
//    filesystem check, so it can catch "/" where a rewrite cannot. The trust
//    pages are here for a different reason: vercel.json never had bot rules
//    for them at all, so /about, /contact, /editorial-standards and /privacy
//    rendered blank carrying the HOMEPAGE's title tag — three of them while
//    being advertised in sitemap.xml.
//
// 2. REAL 404s for URLs that do not exist. Everything used to fall through
//    to `/(.*) -> /index.html`, so a mistyped address answered "200 OK" with
//    the homepage shell. Google calls that a soft 404 and dislikes it, but
//    the sharper cost was human: a stray space in a pasted URL
//    (celebud.com/ privacy) looked exactly like a broken site rather than a
//    typo, twice, during Search Console testing.
//
// FAILURE POSTURE: pass through on any doubt. The known-route list below is
// checked positively — anything this file is not certain about gets next(),
// never a 404. A crawler seeing a shell is the bug we already had; a reader
// losing a working page would be worse. Any throw also lands on next().

import { next, rewrite } from '@vercel/edge';

export const config = {
  // Catch-all, because "does this path exist?" cannot be expressed as a
  // matcher pattern — the answer depends on the route table below. The
  // extension guard in handle() short-circuits static assets on the first
  // check so the added work for those is a string test, not a lookup.
  matcher: '/:path*',
};

const PRERENDER = 'https://bwtrtzvlqvykobmlfjcl.supabase.co/functions/v1/Prerender';

// Kept deliberately identical to the user-agent list in vercel.json, so the
// homepage and the article pages agree on what counts as a crawler. If one
// list gains a bot, the other must too.
const CRAWLER_UA =
  /(googlebot|bingbot|yandex|duckduckbot|baiduspider|facebookexternalhit|facebookcatalog|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|pinterest|redditbot|applebot|petalbot|google-inspectiontool|adsbot-google|mediapartners-google)/i;

// MUST mirror the <Route> table in src/App.tsx. A route added there and
// missed here starts returning 404 to real readers, so treat the two as one
// unit — if you add a page, add it in both places.
const KNOWN_EXACT = new Set([
  '/',
  '/about',
  '/contact',
  '/privacy',
  '/editorial-standards',
  '/editorial',
  '/originals',
  '/fin-advisor',
  '/studio',
  '/unsubscribe',
  '/curators/apply',
  '/reporters/apply',
  '/admin',
]);

// Parameterised and wildcard routes: /article/:id, /article/:id/:slug,
// /author/:id, /watch/:id, /admin/*, /editorial/*.
const KNOWN_PREFIXES = ['/article/', '/author/', '/watch/', '/admin/', '/editorial/'];

// Only these get the Prerender treatment from middleware. /article/* and
// /watch/* are already handled by vercel.json rewrites (no file shadows
// them), so they are deliberately absent — adding them here would duplicate
// that routing in two places.
//
// Every path listed must have a real branch in the Prerender function.
// Adding one Prerender does not recognise makes it fall through to the
// homepage listing and serve a duplicate of the homepage under a second
// URL, which is worse than leaving it alone.
const PRERENDER_EXACT = new Set([
  '/',
  '/about',
  '/contact',
  '/privacy',
  '/editorial-standards',
  '/originals',
  '/fin-advisor',
]);

// Author profiles are prerendered too — every byline links to one, and they
// are what makes the newsroom look staffed by real, named people rather than
// anonymous. Matched on a UUID specifically because that is what Prerender's
// own author branch requires: hand it /author/anything-else and it falls
// through to the homepage listing, publishing a duplicate of the homepage
// under a second URL. A non-UUID author path is left to the SPA instead.
const AUTHOR_PROFILE =
  /^\/author\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function notFoundPage(pathname: string): Response {
  // Served to readers and crawlers alike — same status, same body. Serving
  // a 404 to one and a 200 to the other for the same URL is cloaking.
  const safe = pathname.replace(/[&<>"']/g, '');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Page not found | CelebUD</title>
<meta name="robots" content="noindex, follow" />
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;background:#fff;color:#111}
  .wrap{max-width:640px;margin:0 auto;padding:64px 24px}
  h1{font-size:28px;margin:0 0 8px}
  p{color:#555;line-height:1.6}
  code{background:#f4f2f3;padding:2px 6px;border-radius:4px;word-break:break-all}
  ul{padding-left:20px;line-height:2}
  a{color:#dc2626;text-decoration:none}
  a:hover{text-decoration:underline}
</style>
</head>
<body>
  <div class="wrap">
    <h1>Page not found</h1>
    <p>There is no page at <code>${safe}</code>. If you typed or pasted the address, check it for a stray space or a missing letter.</p>
    <ul>
      <li><a href="/">CelebUD home</a></li>
      <li><a href="/originals">CelebUD Originals</a></li>
      <li><a href="/fin-advisor">Fin-Advisor</a></li>
      <li><a href="/about">About CelebUD</a></li>
      <li><a href="/contact">Contact</a></li>
      <li><a href="/editorial-standards">Editorial Standards</a></li>
      <li><a href="/privacy">Privacy Policy</a></li>
    </ul>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export default function middleware(request: Request) {
  try {
    const url = new URL(request.url);
    const raw = url.pathname;

    // A dot in the last segment means a real file — assets, sw.js,
    // robots.txt, ads.txt, sitemap.xml, the verification .txt. Checked
    // first and unconditionally: middleware runs before the filesystem, so
    // getting this wrong would take the whole site's CSS and JS down.
    const lastSegment = raw.slice(raw.lastIndexOf('/') + 1);
    if (lastSegment.includes('.')) return next();

    // Treat /about/ as /about; keep "/" itself.
    const path = raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw;

    const known =
      KNOWN_EXACT.has(path) || KNOWN_PREFIXES.some((prefix) => path.startsWith(prefix));

    if (!known) return notFoundPage(raw);

    const ua = request.headers.get('user-agent') || '';
    const prerenderable = PRERENDER_EXACT.has(path) || AUTHOR_PROFILE.test(path);
    if (!CRAWLER_UA.test(ua) || !prerenderable) return next();

    const target = new URL(PRERENDER);
    target.searchParams.set('path', path);

    // The site expresses category listings as /?category=news rather than
    // /category/news, and Prerender reads that same parameter to build a
    // category-specific listing. Forwarding it means a crawler on
    // /?category=news gets that category's articles instead of the generic
    // homepage. Only this one parameter is passed through — anything else in
    // the query string is ignored rather than blindly forwarded upstream.
    const category = url.searchParams.get('category');
    if (category) target.searchParams.set('category', category);

    // ?page= drives the paginated listing chain. Without it forwarded, every
    // page of the archive would render as page 1 and a crawler following
    // "Next page" would loop on identical content, never reaching the older
    // articles — the exact problem the pagination was added to fix.
    const pageParam = url.searchParams.get('page');
    if (pageParam && /^\d{1,4}$/.test(pageParam)) target.searchParams.set('page', pageParam);

    return rewrite(target);
  } catch {
    // Never let an SEO optimisation take a page down.
    return next();
  }
}
