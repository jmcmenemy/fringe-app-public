// Fringe Planner Service Worker — cache-first with background update
var CACHE = "fringe-v1";
var ASSETS = ["/", "/index.html", "/app.source.js"];

// Install: pre-cache the shell
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// Activate: clean old caches, take control immediately
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n !== CACHE; })
             .map(function (n) { return caches.delete(n); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// Fetch: serve from cache first, update cache in background
self.addEventListener("fetch", function (e) {
  // Only cache same-origin GET requests for our app shell
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // For API calls, always go to network
  if (url.pathname.indexOf("/api") === 0) return;

  e.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(e.request).then(function (cached) {
        // Fetch fresh copy in background regardless
        var fetched = fetch(e.request).then(function (response) {
          if (response && response.status === 200) {
            cache.put(e.request, response.clone());
            // If we had a cached version and the new one differs, notify clients
            if (cached) {
              self.clients.matchAll().then(function (clients) {
                clients.forEach(function (client) {
                  client.postMessage({ type: "update-available" });
                });
              });
            }
          }
          return response;
        }).catch(function () {
          // Network failed — cached version (if any) is already being returned
          return cached;
        });

        // Return cached immediately if available, otherwise wait for network
        return cached || fetched;
      });
    })
  );
});
