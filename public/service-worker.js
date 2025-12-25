const CACHE_NAME = "ng-static-v1";
const URLS_TO_CACHE = ["/", "/index.html", "/manifest.json", "/favicon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    }),
  );

  // Ativa imediatamente a nova versão do service worker
  // @ts-ignore
  self.skipWaiting?.();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      );
    }),
  );

  // Assume o controle imediato das abas abertas
  // @ts-ignore
  self.clients?.claim?.();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).catch(() => caches.match("/"));
    }),
  );
});
