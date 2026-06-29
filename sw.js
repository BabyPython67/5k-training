const CACHE_NAME = '5k-coach-v2';
const CACHE_URLS = [
  '/index.html',
  '/manifest.json'
];

// Install Event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_URLS).catch(err => {
        console.log('Cache addAll failed, continuing:', err);
        // Einzeln versuchen
        return Promise.all(
          CACHE_URLS.map(url => 
            cache.add(url).catch(e => console.log('Failed to cache', url, e))
          )
        );
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network first, fallback to cache
self.addEventListener('fetch', event => {
  const { request } = event;

  // Nur GET requests
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        // Nur OK responses cachen
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // Offline: aus Cache bedienen
        return caches.match(request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // Fallback für HTML-Anfragen
          if (request.mode === 'navigate' || request.destination === 'document') {
            return caches.match('/index.html');
          }

          return new Response('Offline - Ressource nicht verfügbar', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

// Hintergrund-Sync für zukünftige Features
self.addEventListener('sync', event => {
  if (event.tag === 'sync-progress') {
    event.waitUntil(
      // Hier könnten zukünftig Daten synchronisiert werden
      Promise.resolve()
    );
  }
});

// Message Handler für Client-Kommunikation
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});