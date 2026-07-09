// Cloudflare Workers configuration for CDN, edge caching, and SEO prerendering
// Deploy this to Cloudflare Workers for global edge caching

const CACHE_CONTROL_HEADERS = {
  html: 'public, max-age=300, stale-while-revalidate=86400',
  static: 'public, max-age=31536000, immutable',
  api: 'public, max-age=300, stale-while-revalidate=600',
  images: 'public, max-age=2592000, stale-while-revalidate=86400',
  prerender: 'public, max-age=600, stale-while-revalidate=3600',
};

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

// Supabase edge function that returns real, crawlable HTML for a given path.
// See supabase/functions/prerender/index.ts
const PRERENDER_ENDPOINT = 'https://bwtrtzvlqvykobmlfjcl.supabase.co/functions/v1/prerender';

// Search engine crawlers AND social/chat link-preview scrapers ??? the latter
// never execute JavaScript at all, so without this list every shared
// article link shows generic homepage text instead of the real headline.
const BOT_USER_AGENT_PATTERNS = [
  'googlebot',
  'bingbot',
  'yandex',
  'duckduckbot',
  'baiduspider',
  'facebookexternalhit',
  'facebookcatalog',
  'twitterbot',
  'linkedinbot',
  'slackbot',
  'discordbot',
  'whatsapp',
  'telegrambot',
  'pinterest',
  'redditbot',
  'applebot',
  'petalbot',
];

function isBotRequest(request) {
  const ua = (request.headers.get('User-Agent') || '').toLowerCase();
  return BOT_USER_AGENT_PATTERNS.some((pattern) => ua.includes(pattern));
}

async function handlePrerenderRequest(url) {
  const target = `${PRERENDER_ENDPOINT}?path=${encodeURIComponent(url.pathname + url.search)}`;
  const upstream = await fetch(target);

  const headers = new Headers(upstream.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', CACHE_CONTROL_HEADERS.prerender);
  headers.set('X-Prerendered', 'true');

  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}

// Canonical host: pick ONE version of your domain and every other
// variant 301-redirects to it. This must match the domain used in your
// <link rel="canonical">, Open Graph "og:url", and sitemap.xml ??? right
// now those all say "celebud.com" (no www), so that's the canonical
// host below. If you'd rather standardize on "www.celebud.com" instead,
// swap this value AND update index.html / the sitemap generator to match.
const CANONICAL_HOST = 'celebud.com';

async function handleRequest(request) {
  const url = new URL(request.url);
  const cache = caches.default;

  if (request.method !== 'GET') {
    return fetch(request);
  }

  // Enforce a single canonical host + HTTPS before anything else (cache,
  // prerendering, etc.) so nothing ever gets served or cached under the
  // "wrong" domain. This is what stops Google from splitting ranking
  // signals between www.celebud.com and celebud.com as if they were two
  // different sites.
  if (url.hostname !== CANONICAL_HOST || url.protocol !== 'https:') {
    url.hostname = CANONICAL_HOST;
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }

  // Bots and link-preview scrapers get server-rendered HTML with real
  // per-page titles, descriptions, OG tags, and content. Everyone else
  // gets the normal React SPA untouched, below.
  const isHtmlRoute = url.pathname === '/' || url.pathname.startsWith('/article/');

  if (isHtmlRoute && isBotRequest(request)) {
    try {
      return await handlePrerenderRequest(url);
    } catch {
      // If prerendering fails for any reason, fall through to the
      // normal SPA response rather than showing bots an error page.
    }
  }

  let cacheKey = new Request(url.toString(), request);
  let response = await cache.match(cacheKey);

  if (response) {
    const age = Date.now() - new Date(response.headers.get('date') || 0).getTime();
    const maxAge = parseInt(response.headers.get('max-age') || '0', 10) * 1000;

    if (age < maxAge) {
      response = new Response(response.body, response);
      response.headers.set('X-Cache', 'HIT');
      response.headers.set('X-Cache-Age', Math.floor(age / 1000).toString());
      return response;
    }
  }

  response = await fetch(request);

  if (!response.ok) {
    return response;
  }

  const newHeaders = new Headers(response.headers);

  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    newHeaders.set('Cache-Control', CACHE_CONTROL_HEADERS.html);
  } else if (url.pathname.match(/\.(js|css|woff2|woff)$/)) {
    newHeaders.set('Cache-Control', CACHE_CONTROL_HEADERS.static);
  } else if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
    newHeaders.set('Cache-Control', CACHE_CONTROL_HEADERS.images);
    newHeaders.set('X-Content-Type-Options', 'nosniff');
  } else if (url.pathname.startsWith('/api/')) {
    newHeaders.set('Cache-Control', CACHE_CONTROL_HEADERS.api);
  }

  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  newHeaders.set('X-Cache', 'MISS');

  response = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });

  if (url.pathname.match(/\.(js|css|jpg|jpeg|png|gif|webp|woff2|woff|svg)$/)) {
    await cache.put(cacheKey, response.clone());
  }

  return response;
}

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});
