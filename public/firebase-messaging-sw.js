// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here, other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const CACHE_NAME = 'flashcards-cache-v1';

// Clear any existing caches during activation
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercept fetch requests
self.addEventListener('fetch', function(event) {
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response as it can only be consumed once
        const responseToCache = response.clone();

        // For HTML requests or app routes, don't cache
        if (
          event.request.url.includes('/app') || 
          event.request.url.endsWith('.html') ||
          event.request.headers.get('accept')?.includes('text/html')
        ) {
          return response;
        }

        // For other requests, cache the response
        caches.open(CACHE_NAME)
          .then(function(cache) {
            // Add versioning to cache key
            const cacheKey = event.request.url + '?v=' + new Date().getTime();
            cache.put(cacheKey, responseToCache);
          });

        return response;
      })
      .catch(function() {
        // If fetch fails, try to return from cache
        return caches.match(event.request);
      })
  );
});