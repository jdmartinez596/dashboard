const CACHE_NAME = 'gest-inventary-v1';
const OFFLINE_URL = '/dashboard/offline.html';

const ASSETS_TO_CACHE = [
    '/dashboard/',
    '/dashboard/index.html',
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
    '/dashboard/assets/js/assistant.js',
    '/dashboard/manifest.json',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://unpkg.com/lucide@latest',
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE.map(url => {
                return new Request(url, { mode: 'no-cors' });
            })).catch(err => {
                console.warn('Cache install error:', err);
            });
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
        fetch(event.request)
            .then((response) => {
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then((cached) => {
                    if (cached) return cached;
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
