const CACHE_NAME = 'gest-inventary-v2';
const SW_VERSION = '2026-06-19';
const OFFLINE_URL = '/dashboard/offline.html';

const ASSETS_TO_CACHE = [
    '/dashboard/',
    '/dashboard/index.html',
    '/dashboard/offline.html',
    '/dashboard/manifest.json',
    '/dashboard/assets/css/styles.css',
    '/dashboard/assets/js/utils.js',
    '/dashboard/assets/js/auth.js',
    '/dashboard/assets/js/app.js',
    '/dashboard/assets/js/dashboard.js',
    '/dashboard/assets/js/inventory.js',
    '/dashboard/assets/js/sales.js',
    '/dashboard/assets/js/finance.js',
    '/dashboard/assets/js/returns.js',
    '/dashboard/assets/js/accounting.js',
    '/dashboard/assets/js/scanner.js',
    '/dashboard/assets/js/settings.js',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                ASSETS_TO_CACHE.map(url =>
                    cache.add(url).catch(err =>
                        console.warn('Fallo al cachear:', url, err)
                    )
                )
            );
        }).catch((err) => {
            console.warn('Error en instalación del Service Worker:', err);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('supabase.co') ||
        event.request.url.includes('googleapis.com/v1beta') ||
        event.request.url.includes('supabase.io')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) {
                fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                }).catch(() => {});
                return cached;
            }

            return fetch(event.request).then((response) => {
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            }).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match(OFFLINE_URL);
                }
            });
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME);
    }
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
