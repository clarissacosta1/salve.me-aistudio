const CACHE_NAME = 'salveme-offline-cache-v1';

// Pre-cache core shell resources
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
];

// Install Event: cache precache assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('Pre-caching assets warned/skipped in development or empty cache:', err);
      });
    })
  );
});

// Activate Event: clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting obsolete cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip non-GET requests, Chrome extension resources, and external web telemetry
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle API Requests (Network-First, Cache Fallback)
  if (requestUrl.pathname.startsWith('/api/')) {
    // Avoid caching admin, push, telemetry, active tracking, or custom AI custom comeback requests
    if (
      requestUrl.pathname.includes('/admin/') || 
      requestUrl.pathname.includes('/analytics/') || 
      requestUrl.pathname.includes('/feedback') ||
      requestUrl.pathname.includes('/push/') ||
      requestUrl.pathname.includes('/custom-comeback')
    ) {
      return;
    }

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If valid response, clone and cache it
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline fallback: try to serve matching cached response
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If completely missing, return a custom JSON offline indicator
            return new Response(
              JSON.stringify({
                error: "Offline",
                message: "You are currently offline. Accessing cached database.",
                situations: [], // Fallback/empty mock so UI can handle smoothly
                tags: []
              }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 200 // Return status 200 so UI parsing won't crash
              }
            );
          });
        })
    );
    return;
  }

  // Handle Static Assets & Page UI (Stale-While-Revalidate)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch((err) => {
          console.log('Network fetch failed for static layout asset:', err);
          // Just let browser know/return undefined to fallback on cache
        });

      return cachedResponse || fetchPromise;
    })
  );
});
