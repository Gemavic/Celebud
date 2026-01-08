const CACHE_NAME = 'celebud-v1';
const RUNTIME_CACHE = 'celebud-runtime';
const IMAGE_CACHE = 'celebud-images';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

const IMAGE_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const API_CACHE_MAX_AGE = 5 * 60 * 1000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE && name !== IMAGE_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (url.hostname === 'images.unsplash.com' || request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
    return;
  }

  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  event.respondWith(handleGeneralRequest(request));
});

async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    const cachedTime = new Date(cached.headers.get('sw-cache-time') || 0);
    if (Date.now() - cachedTime.getTime() < IMAGE_CACHE_MAX_AGE) {
      return cached;
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const clonedResponse = response.clone();
      const headers = new Headers(clonedResponse.headers);
      headers.set('sw-cache-time', new Date().toISOString());

      const cachedResponse = new Response(await clonedResponse.blob(), {
        status: clonedResponse.status,
        statusText: clonedResponse.statusText,
        headers: headers,
      });

      cache.put(request, cachedResponse);
    }
    return response;
  } catch (error) {
    return cached || new Response('Network error', { status: 503 });
  }
}

async function handleAPIRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);

    if (response.ok && request.method === 'GET') {
      const clonedResponse = response.clone();
      const headers = new Headers(clonedResponse.headers);
      headers.set('sw-cache-time', new Date().toISOString());

      const cachedResponse = new Response(await clonedResponse.text(), {
        status: clonedResponse.status,
        statusText: clonedResponse.statusText,
        headers: headers,
      });

      cache.put(request, cachedResponse);
    }

    return response;
  } catch (error) {
    const cached = await cache.match(request);

    if (cached) {
      const cachedTime = new Date(cached.headers.get('sw-cache-time') || 0);
      if (Date.now() - cachedTime.getTime() < API_CACHE_MAX_AGE) {
        return cached;
      }
    }

    throw error;
  }
}

async function handleGeneralRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Network error', { status: 503 });
  }
}
