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

import { next } from '@vercel/edge';
import { renderRequest } from './server/render';
import { getShell, mergeIntoShell } from './server/shell';

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
  '/trackers',
  '/tributes/submit',
  '/election-2027',
]);

// Parameterised and wildcard routes: /article/:id, /article/:id/:slug,
// /author/:id, /watch/:id, /admin/*, /editorial/*.
const KNOWN_PREFIXES = ['/article/', '/author/', '/watch/', '/admin/', '/editorial/', '/ask/', '/election-2027/'];

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
  '/trackers',
  '/tributes/submit',
  '/election-2027',
  '/election-2027/poll',
]);

// Election candidate profiles: /election-2027/<slug>, own Prerender branch.
const ELECTION_CANDIDATE = /^\/election-2027\/[a-z0-9-]{3,80}$/;
// Governorship race pages and their polls: /election-2027/governor/<state>[/poll]
const ELECTION_GOVERNOR = /^\/election-2027\/governor\/(lagos|ogun|oyo)(\/poll)?$/;

// Reader callouts (/ask/:slug) have their own Prerender branch, which 404s
// an unknown slug itself — so only a well-formed slug is sent there.
const ASK_PAGE = /^\/ask\/[a-z0-9-]{3,80}$/;

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

// Supabase now delivers every Edge Function response from its default
// domain as "Content-Type: text/plain" (with a sandbox CSP), whatever the
// function sets — an anti-phishing rule. A plain Vercel rewrite passes that
// header straight through, so Google's own Rich Results Test showed every
// prerendered page arriving as "Content type: text/plain": Google got the
// right words but treated each page as a text file, not a web page. So
// crawler pages are fetched here and re-served with a proper HTML type.
async function servePrerendered(target: URL, ua: string): Promise<Response> {
  const res = await buildPage(target, ua);
  if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
    return new Response(null, { status: res.status, headers: { location: res.headers.get('location')! } });
  }
  // A build failure must never become what Google indexes — let the normal
  // app shell answer instead.
  if (res.status >= 500) return next();
  return htmlResponse(await res.text(), res.status, res.headers.get('x-robots-tag'));
}

function htmlResponse(body: string, status: number, robots?: string | null): Response {
  const headers = new Headers({
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
  });
  if (robots) headers.set('x-robots-tag', robots);
  return new Response(body, { status, headers });
}

/**
 * Builds the page inside the site (server/render.ts). Falls back to the old
 * Supabase Prerender function only if the local build throws, so a bug here
 * degrades to yesterday's behaviour instead of an error page.
 */
// Built pages are kept briefly in memory, so a busy article or the homepage
// is not rebuilt from the database on every single visit.
const pageCache = new Map<string, { body: string; robots: string | null; at: number }>();
const PAGE_TTL = 60_000;

async function buildPage(target: URL, ua: string): Promise<Response> {
  const key = target.toString();
  const hit = pageCache.get(key);
  if (hit && Date.now() - hit.at < PAGE_TTL) {
    return new Response(hit.body, { status: 200, headers: hit.robots ? { 'x-robots-tag': hit.robots } : {} });
  }
  try {
    const res = await renderRequest(new Request(key, { headers: { 'user-agent': ua } }));
    if (res.status === 200) {
      const body = await res.text();
      const robots = res.headers.get('x-robots-tag');
      if (pageCache.size > 300) pageCache.delete(pageCache.keys().next().value as string);
      pageCache.set(key, { body, robots, at: Date.now() });
      return new Response(body, { status: 200, headers: robots ? { 'x-robots-tag': robots } : {} });
    }
    return res;
  } catch {
    return fetch(target.toString(), { headers: { 'user-agent': ua, accept: 'text/html' }, redirect: 'manual' });
  }
}

/**
 * One page for everyone: the finished article inside the normal app shell.
 * Returns null when it cannot (not found, build error), and the caller then
 * serves the plain app exactly as before.
 */
async function serveFullPage(target: URL, ua: string, origin: string, cookie: string): Promise<Response | string> {
  let res: Response;
  try { res = await buildPage(target, ua); } catch (e) { return `build: ${(e as Error).message}`.slice(0, 200); }
  if (res.status !== 200) return `build status ${res.status}`;
  let shell: string;
  try { shell = await getShell(origin, cookie); } catch (e) { return `shell: ${(e as Error).message}`.slice(0, 200); }
  const merged = mergeIntoShell(shell, await res.text());
  if (!merged) return 'merge: no head/body';
  return htmlResponse(merged, 200, res.headers.get('x-robots-tag'));
}

// Paths whose crawler version vercel.json used to rewrite straight to
// Prerender (and so arrived as text/plain). Handled here now instead.
const REWRITTEN_FOR_BOTS = /^\/(article|watch)\/[^/]+(\/[^/]+)?$/;

export default async function middleware(request: Request) {
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
    const isBot = CRAWLER_UA.test(ua);
    const prerenderable = REWRITTEN_FOR_BOTS.test(path) || PRERENDER_EXACT.has(path) || AUTHOR_PROFILE.test(path) || ASK_PAGE.test(path) || ELECTION_CANDIDATE.test(path) || ELECTION_GOVERNOR.test(path);
    if (!prerenderable) return next();

    const target = new URL(PRERENDER);
    target.searchParams.set('path', path);
    // Category listings are /?category=news, and ?page= drives the archive
    // pagination; both change what the page shows, so both are passed on.
    // Nothing else from the query string is forwarded.
    const category = url.searchParams.get('category');
    if (category && /^[a-z0-9-]{1,40}$/i.test(category)) target.searchParams.set('category', category);
    const pageParam = url.searchParams.get('page');
    if (pageParam && /^\d{1,4}$/.test(pageParam)) target.searchParams.set('page', pageParam);

    // One page for everyone: readers, Google and AdSense all get the
    // finished page; the app loads on top. (A search results view is the
    // app's alone — the server copy would show the wrong list.)
    if (request.method === 'GET' && !url.searchParams.has('search')) {
      const page = await serveFullPage(target, ua, url.origin, request.headers.get('cookie') || '')
        .catch((e) => `unexpected: ${(e as Error).message}`.slice(0, 200));
      if (typeof page !== 'string') return page;
      // Why the full page could not be built — visible in the response
      // headers (and the daily check), never to readers.
      if (!isBot) return next({ headers: { 'x-celebud-ssr': page.replace(/[^\x20-\x7e]/g, ' ') } });
    }
    if (!isBot) return next();

    return await servePrerendered(target, ua);
  } catch {
    // Never let an SEO optimisation take a page down.
    return next();
  }
}
