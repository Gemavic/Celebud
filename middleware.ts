// Vercel Edge Middleware — serves crawlers real HTML for the homepage.
//
// WHY THIS FILE EXISTS
// vercel.json already routes crawlers to the Prerender function for
// /article/*, /watch/* and /. Two of those three work. The homepage did
// not, and the reason is a routing-order rule rather than anything wrong
// with the rule itself:
//
//   Vercel checks the filesystem BEFORE it evaluates `rewrites`.
//
// The build emits index.html, which Vercel serves at "/". So a request
// for "/" finds a real file and is answered immediately — the bot rewrite
// in vercel.json is never reached. /article/<id> and /sitemap.xml have no
// matching file, fall through to the rewrites, and prerender correctly.
// That is the whole difference: identical rules, and only the one shadowed
// by a real file failed.
//
// The measured effect: Googlebot asking for celebud.com/ got the same
// 9,390-byte empty JS shell a plain fetch gets — no headlines, no article
// links, ~200 words of boilerplate — while the Prerender function, called
// directly, returned 30 article links and ~1,000 words of real content.
//
// Middleware runs BEFORE the filesystem check, so it can catch "/" where
// a rewrite cannot. Everything else is left exactly as it was.
//
// FAILURE POSTURE: fail open, always. Any throw, any non-200 from
// Prerender, any non-bot request falls straight through to the normal SPA.
// A crawler seeing the old shell is the bug we already had; a reader
// seeing a broken page would be a worse one. Nothing here can produce the
// second outcome.

import { next, rewrite } from '@vercel/edge';

export const config = {
  // "/" is here because the filesystem shadows the rewrite for it (see
  // above). The rest are here because vercel.json never had bot rules for
  // them at all: they are React pages with no file behind them, so a
  // crawler got the empty SPA shell carrying the HOMEPAGE's title tag.
  // /about, /contact and /editorial-standards were being advertised in
  // sitemap.xml while rendering blank, and /privacy — the page an ad
  // network looks for by name — was neither prerendered nor listed.
  //
  // Every path listed must have a real branch in the Prerender function.
  // Adding one here that Prerender does not recognise makes it fall
  // through to the homepage listing and serve a duplicate of the homepage
  // under a second URL, which is worse than leaving it alone.
  matcher: [
    '/',
    '/about',
    '/contact',
    '/privacy',
    '/editorial-standards',
    '/originals',
    '/fin-advisor',
    '/author/:id*',
  ],
};

const PRERENDER = 'https://bwtrtzvlqvykobmlfjcl.supabase.co/functions/v1/Prerender';

// Kept deliberately identical to the user-agent list in vercel.json, so
// the homepage and the article pages agree on what counts as a crawler.
// If one list gains a bot, the other must too.
const CRAWLER_UA =
  /(googlebot|bingbot|yandex|duckduckbot|baiduspider|facebookexternalhit|facebookcatalog|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|pinterest|redditbot|applebot|petalbot|google-inspectiontool|adsbot-google|mediapartners-google)/i;

export default function middleware(request: Request) {
  try {
    const ua = request.headers.get('user-agent') || '';
    if (!CRAWLER_UA.test(ua)) return next();

    const url = new URL(request.url);
    const target = new URL(PRERENDER);
    target.searchParams.set('path', url.pathname);

    // The site expresses category listings as /?category=news rather than
    // /category/news, and Prerender reads that same parameter to build a
    // category-specific listing. Forwarding it means a crawler on
    // /?category=news gets that category's articles instead of the
    // generic homepage. Only this one parameter is passed through —
    // anything else in the query string is ignored rather than blindly
    // forwarded to an upstream function.
    const category = url.searchParams.get('category');
    if (category) target.searchParams.set('category', category);

    // ?page= drives the paginated listing chain. Without it forwarded, every
    // page of the archive would render as page 1 — a crawler following
    // "Next page" would loop on identical content and never reach the older
    // articles, which is the exact problem the pagination was added to fix.
    const pageParam = url.searchParams.get('page');
    if (pageParam && /^\d{1,4}$/.test(pageParam)) target.searchParams.set('page', pageParam);

    return rewrite(target);
  } catch {
    // Never let an SEO optimisation take the homepage down.
    return next();
  }
}
