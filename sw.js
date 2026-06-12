const CACHE_NAME = 'my-dim-cache-v2';
const STATIC_ASSETS = [
  '/css/styles.css',
  '/manifest.json',
  '/js/config.js',
  '/js/auth.js',
  '/js/db.js',
  '/js/router.js',
  '/js/ui.js',
  '/js/admin.js',
  '/js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Не кешуємо HTML сторінки — вони мають завжди завантажуватись з сервера
  // (важливо для Google redirect, щоб обробити result)
  if (event.request.mode === 'navigate' || 
      url.pathname === '/' || 
      url.pathname === '/index.html') {
    event.respondWith(fetch(event.request).catch(() => {
      return new Response('Ви офлайн', { status: 503 });
    }));
    return;
  }

  // Для статичних файлів — кеш
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});