const CACHE_NAME = "padelpaglu-pwa-v1";

const APP_SHELL = [
  "/",
  "/index.html",
  "/find.html",
  "/host.html",
  "/marker.html",
  "/my-matches.html",
  "/profile.html",
  "/style.css",
  "/home.css",
  "/nav.js",
  "/app.js",
  "/find.js",
  "/my-matches.js",
  "/pwa.js",
  "/manifest.json",
  "/logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (url.origin !== self.location.origin || url.pathname.startsWith("/api") || url.pathname.startsWith("/auth")) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone();

        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }

        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
          return cachedResponse;
        }

        if (request.mode === "navigate") {
          return caches.match("/");
        }

        return Response.error();
      }),
  );
});
