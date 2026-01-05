const CACHE_NAME = "ng-static-v4";

const URLS_TO_CACHE = [
  "/",
  "/manifest.json",
  "/favicon-v2.png",
  "/favicon.ico",
  "/apple-touch-icon-v2.png.png",
  "/icon-192-v2.png",
  "/icon-512-v2.png",
  "/maskable-icon-512-v2.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  
  // Skip non-GET requests
  if (req.method !== "GET") return;
  
  // Skip API calls and external requests
  if (url.pathname.startsWith("/api") || 
      url.hostname.includes("supabase") ||
      !url.origin.includes(self.location.origin)) {
    return;
  }

  // For navigation requests (HTML), use network-first strategy
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((response) => {
          // Cache the latest version
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  // For static assets (icons, images, etc.), use cache-first strategy
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((response) => {
        // Cache successful responses for static assets
        if (response.ok && (url.pathname.endsWith(".png") || url.pathname.endsWith(".ico") || url.pathname.endsWith(".json"))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return response;
      }).catch(() => caches.match("/"));
    }),
  );
});
