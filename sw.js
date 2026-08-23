// Fringe Planner Service Worker — cache-first with background update
// IMPORTANT: bump the version number below every time you deploy new files.
// This triggers the browser to install the new service worker and clear the old cache.
var CACHE = "fringe-v18";
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
            var freshClone = response.clone();
            // Only notify if cached content actually differs from the new version
            if (cached) {
              Promise.all([cached.clone().text(), freshClone.clone().text()]).then(function (texts) {
                if (texts[0] !== texts[1]) {
                  self.clients.matchAll().then(function (clients) {
                    clients.forEach(function (client) {
                      client.postMessage({ type: "update-available" });
                    });
                  });
                }
              });
            }
            cache.put(e.request, freshClone);
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
