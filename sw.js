const CACHE_NAME = 'bleick-store-ready-v7-1';
const CORE_URLS = [
  './',
  './index.html',
  './manifest.json'
];
const OPTIONAL_URLS = [
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './screenshot-mobile.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(CORE_URLS);
      await Promise.allSettled(OPTIONAL_URLS.map((u) => cache.add(u)));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/sw.js')) return;

  const isDocOrManifest =
    req.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/manifest.json');

  if (isDocOrManifest) {
    // Network-First: pulls GitHub Pages updates immediately when online, falls back to cache offline
    event.respondWith(
      fetch(req).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return response;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Cache-First for static PNG icons & screenshots
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return response;
      });
    })
  );
});
