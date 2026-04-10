const CACHE_NAME = "novel-app-v1";

const urlsToCache = [
  "./index.html"
];

// インストール時
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of urlsToCache) {
        try {
          await cache.add(url);
        } catch (e) {
          console.warn("キャッシュ失敗:", url);
        }
      }
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
