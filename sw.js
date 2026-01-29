
const CACHE_NAME = 'streamx-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Enable background sync/play support if possible
self.addEventListener('message', (event) => {
  if (event.data.type === 'KEEP_ALIVE') {
    console.log('SW: Keeping connection alive for background playback');
  }
});
