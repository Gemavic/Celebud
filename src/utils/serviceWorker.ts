export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    // First, unregister any old/stale service workers to prevent caching issues
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      const sw = reg.active || reg.waiting || reg.installing;
      if (sw && sw.scriptURL && !sw.scriptURL.includes('sw.js')) {
        await reg.unregister();
      }
    }

    if (import.meta.env.PROD) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none',
        });

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });

        registration.update();
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    } else {
      for (const reg of registrations) {
        await reg.unregister();
      }
    }
  });
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }
}
