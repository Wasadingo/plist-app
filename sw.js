const CACHE = 'plist-shell-v3';
const ASSETS = ['./', './index.html', './styles.css', './db.js', './supabase-config.public.js', './supabase-client.js', './auth.js', './app.js', './manifest.webmanifest', './assets/PList_logo_transparente.png', './assets/PList_logo_fondo_claro.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('plist-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && (url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
    event.respondWith(fetch(event.request).then(response => { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response; }).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
