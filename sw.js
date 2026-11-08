const CACHE = 'plist-shell-v1';
const ASSETS = ['./', './index.html', './styles.css', './db.js', './supabase-client.js', './auth.js', './app.js', './manifest.webmanifest', './assets/PList_logo_transparente.png', './assets/PList_logo_fondo_claro.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request))));
