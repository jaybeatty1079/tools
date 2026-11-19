// Offline copy of this tool. Bump the version when files change; old caches for this tool are dropped on activate.
const PREFIX = 'aca-fountain-', CACHE = PREFIX + 'v5';
const FILES = ['./', 'index.html', 'iso.css', 'model.js', 'fountain.js', 'sound.js', 'iso.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', '../favicon.svg?v=2', '../favicon.ico?v=2'];

self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting())));

self.addEventListener('activate', (e) => e.waitUntil(caches.keys()
  .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
  .then(() => self.clients.claim())));

// Stale-while-revalidate: answer from the cache at once, refresh it from the network for next time.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(e.request, { ignoreSearch: e.request.mode === 'navigate' }); // ?scope=company is the same page
    const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; });
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net;
  }));
});
