/* === Basic 工具箱 Service Worker === */
const CACHE_NAME = 'basic-toolbox-v1.3.0';
const ASSETS = [
  '/',
  'index.html',
  'css/style.css',
  'js/calculator.js',
  'js/equation-solver.js',
  'js/vertical-calc.js',
  'js/ai-chat.js',
  'js/settings.js',
  'js/app.js',
  'manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});