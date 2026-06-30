const CACHE_NAME = "padelpaglu-pwa-v8";

const APP_SHELL = [
  "/",
  "/index.html",
  "/find.html",
  "/host.html",
  "/marker.html",
  "/my-matches.html",
  "/profile.html",
  "/offline.html",
  "/style.css",
  "/home.css",
  "/pwa.css",
  "/nav.js",
  "/app.js",
  "/find.js",
  "/favorite-venue-ui-fix.js",
  "/my-matches.js",
  "/pwa.js",
  "/manifest.json",
  "/logo.png",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/notification-badge.svg"
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

  if (request.method !== "GET") return;

  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/auth")
  ) {
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

        if (cachedResponse) return cachedResponse;

        if (request.mode === "navigate") {
          return caches.match("/offline.html");
        }

        return Response.error();
      }),
  );
});

function getNotificationTargetUrl(data) {
  if (data.matchId) {
    return `/find.html?match=${encodeURIComponent(data.matchId)}`;
  }

  if (data.venueId) {
    return `/find.html?venueId=${encodeURIComponent(data.venueId)}`;
  }

  if (data.venueName) {
    return `/find.html?venue=${encodeURIComponent(data.venueName)}`;
  }

  const venueMatch = String(data.body || "").match(/ at (.*?)\. Tap/i);

  if (venueMatch?.[1]) {
    return `/find.html?venue=${encodeURIComponent(venueMatch[1])}`;
  }

  return data.url || "/find.html";
}

self.addEventListener("push", (event) => {
  let data = {
    title: "New PadelPaglu match 🎾",
    body: "A new match was hosted at one of your favourite venues.",
    url: "/find.html",
  };

  if (event.data) {
    try {
      data = {
        ...data,
        ...event.data.json(),
      };
    } catch (err) {
      data.body = event.data.text();
    }
  }

  const targetUrl = getNotificationTargetUrl(data);

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/notification-badge.svg",
      tag: data.matchId ? `match-${data.matchId}` : "favorite-venue-match",
      renotify: true,
      data: {
        url: targetUrl,
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/find.html";
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(async (clientList) => {
        for (const client of clientList) {
          const clientUrl = new URL(client.url);

          if (clientUrl.origin !== self.location.origin) {
            continue;
          }

          if ("navigate" in client) {
            const navigatedClient = await client.navigate(absoluteUrl);

            if (navigatedClient && "focus" in navigatedClient) {
              return navigatedClient.focus();
            }
          }

          if ("focus" in client) {
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(absoluteUrl);
        }

        return undefined;
      }),
  );
});