const CACHE_NAME = "ng-static-v8";

const URLS_TO_CACHE = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-512-maskable.png",
  "/apple-touch-icon.png",
  "/favicon.png",
];

// Files that should use network-first strategy (to avoid stale icons/manifest)
const NETWORK_FIRST_PATTERNS = [
  /\/manifest\.json$/,
  /\/icon-.*\.png$/,
  /\/maskable-.*\.png$/,
  /\/favicon.*\.png$/,
  /\/apple-touch-icon.*\.png$/,
];

function shouldUseNetworkFirst(pathname) {
  return NETWORK_FIRST_PATTERNS.some((pattern) => pattern.test(pathname));
}

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

  // For icons and manifest, use network-first to avoid stale cache
  if (shouldUseNetworkFirst(url.pathname)) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // For other static assets, use cache-first strategy
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((response) => {
        if (response.ok && (url.pathname.endsWith(".png") || url.pathname.endsWith(".ico") || url.pathname.endsWith(".json"))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return response;
      }).catch(() => caches.match("/"));
    }),
  );
});
