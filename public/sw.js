// Minimal service worker: makes the app installable and caches static assets + sounds.
// Supabase/API traffic is never cached.
const CACHE = "kam-taarefni-v2";

self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  const cacheable = url.pathname.startsWith("/sounds/") || url.pathname.startsWith("/_next/static/") || /\.(png|svg|json)$/.test(url.pathname);
  if (!cacheable) return;
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
