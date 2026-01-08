// Cloudflare Workers configuration for CDN and edge caching
// Deploy this to Cloudflare Workers for global edge caching

const CACHE_CONTROL_HEADERS = {
  html: 'public, max-age=300, stale-while-revalidate=86400',
  static: 'public, max-age=31536000, immutable',
  api: 'public, max-age=300, stale-while-revalidate=600',
  images: 'public, max-age=2592000, stale-while-revalidate=86400',
};

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

async function handleRequest(request) {
  const url = new URL(request.url);
  const cache = caches.default;

  if (request.method !== 'GET') {
    return fetch(request);
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
