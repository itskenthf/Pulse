const CACHE_NAME = "pulse-shell-v2";
const SHELL_URLS = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Only the app shell itself gets the offline cache-and-refresh
  // treatment below. Third-party requests (GitHub avatar, Steam/Spotify
  // CDN images, etc.) are left to the browser's normal fetch — routing
  // them through this SW risks a rejected fetch() (cross-origin requests
  // are more prone to this than same-origin ones) falling through to the
  // `cached` fallback below, which is `undefined` for a URL that was
  // never cached. Passing `undefined` to respondWith() is invalid and
  // the browser kills the request outright — that's what was breaking
  // GitHub avatars and Steam cover art.
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached ?? Response.error());

      return cached || fetchPromise;
    })
  );
});
