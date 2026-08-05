const CACHE_VER = 'bakery-v20260805-06';
const ASSETS = [
  './index.html',
  './manifest.json',
  './favicon.png',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VER)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VER).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 工具：更新缓存
async function putCache(req, resp) {
  const cp = resp.clone();
  const c = await caches.open(CACHE_VER);
  await c.put(req, cp);
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isHTML = url.pathname === '/' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('.html');

  if (isHTML || url.pathname.endsWith('/manifest.json')) {
    // 联网优先：先尝试网络，成功后更新缓存；失败才用缓存
    e.respondWith(
      fetch(e.request)
        .then(resp => { putCache(e.request, resp); return resp; })
        .catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
    );
  } else {
    // 图片等静态资源：缓存优先，没命中再网络并更新缓存
    e.respondWith(
      caches.match(e.request).then(hit =>
        hit || fetch(e.request).then(resp => { putCache(e.request, resp); return resp; })
          .catch(() => caches.match('./index.html'))
      )
    );
  }
});
