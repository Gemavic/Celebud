const CACHE_NAME = 'celebud-v6';
const RUNTIME_CACHE = 'celebud-runtime-v6';
const IMAGE_CACHE = 'celebud-images-v6';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
];

const IMAGE_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const API_CACHE_MAX_AGE = 10 * 60 * 1000;
const NETWORK_TIMEOUT = 6000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
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

  if (request.method !== 'GET') return;

  // Never intercept Supabase requests (data, auth, storage). The app has
  // its own 15s timeout + retry for data queries; the service worker's
  // shorter timeout was aborting slow-network requests at 6s and faking
  // 408 responses, which surfaced as "Could not load article" on weak
  // mobile connections.
  if (url.hostname.includes('supabase')) {
    return;
  }

  if (url.hostname === 'images.unsplash.com' || request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  if (url.pathname.startsWith('/assets/') || request.destination === 'script' || request.destination === 'style') {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  event.respondWith(handleNavigationRequest(request));
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
    const response = await fetchWithTimeout(request, NETWORK_TIMEOUT);
    if (response.ok) {
      const clone = response.clone();
      const headers = new Headers(clone.headers);
      headers.set('sw-cache-time', new Date().toISOString());
      const blob = await clone.blob();
      cache.put(request, new Response(blob, { status: clone.status, statusText: clone.statusText, headers }));
    }
    return response;
  } catch {
    return cached || new Response('', { status: 408, statusText: 'Timeout' });
  }
}

async function handleAPIRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  try {
    const response = await fetchWithTimeout(request, NETWORK_TIMEOUT);

    if (response.ok) {
      const clone = response.clone();
      const headers = new Headers(clone.headers);
      headers.set('sw-cache-time', new Date().toISOString());
      const text = await clone.text();
      cache.put(request, new Response(text, { status: clone.status, statusText: clone.statusText, headers }));
    }

    return response;
  } catch {
    if (cached) {
      const cachedTime = new Date(cached.headers.get('sw-cache-time') || 0);
      if (Date.now() - cachedTime.getTime() < API_CACHE_MAX_AGE) {
        return cached;
      }
    }
    return new Response(JSON.stringify({ error: 'Network timeout' }), {
      status: 408,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

async function handleNavigationRequest(request) {
  try {
    const response = await fetchWithTimeout(request, NETWORK_TIMEOUT);
    return response;
  } catch {
    const cached = await caches.open(CACHE_NAME).then(c => c.match('/index.html'));
    if (cached) return cached;
    return new Response('Offline', { status: 503 });
  }
}

function fetchWithTimeout(request, timeout) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Network timeout'));
    }, timeout);

    fetch(request, { signal: controller.signal })
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// --- Push notifications ---

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'CelebUD', body: event.data.text() };
  }

  const title = payload.title || 'CelebUD Breaking News';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: '/icon-192.png',
    image: payload.image,
    data: { url: payload.url || '/' },
    tag: payload.tag || 'celebud-news',
    renotify: true,
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
