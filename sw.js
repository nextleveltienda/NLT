const CACHE = 'nl-tienda-v4';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Nunca interceptar requests cross-origin (API de Supabase, CDNs): siempre a la red, sin cachear
  if (url.origin !== self.location.origin) return;
  const isDoc = req.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html');
  if (isDoc) {
    // network-first para el HTML, fallback al cache offline
    e.respondWith(
      fetch(req).then(net => {
        const cl = net.clone();
        caches.open(CACHE).then(c => c.put(req, cl));
        return net;
      }).catch(() => caches.match(req).then(r => r || caches.match('/index.html')))
    );
    return;
  }
  // assets estaticos same-origin: cache-first
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(net => {
      if (net && net.status === 200) {
        const cl = net.clone();
        caches.open(CACHE).then(c => c.put(req, cl));
      }
      return net;
    }))
  );
});
