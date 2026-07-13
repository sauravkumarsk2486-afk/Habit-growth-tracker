/* Minimal offline cache for the app shell. Data itself lives in
   localStorage, so the app works fully offline once cached. */

const CACHE_NAME = 'habit-growth-v1';
const ASSETS = [
  './index.html',
  './css/style.css',
  './css/dashboard.css',
  './css/habit.css',
  './css/responsive.css',
  './js/storage.js',
  './js/utils.js',
  './js/habit.js',
  './js/charts.js',
  './js/calendar.js',
  './js/app.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => cached))
  );
});
