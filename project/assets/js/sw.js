const CACHE_NAME = "novel-app-v1";

const urlsToCache = [
  "./index.html",
  "./assets/css/style.css",
  "./assets/js/app.js"
];

// インストール時
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// リクエスト時
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
