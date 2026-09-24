const CACHE_NAME = "tekyida-v2";
const OFFLINE_URL = "/app";

// Assets to precache for offline shell
const PRECACHE_ASSETS = [
    "/",
    "/app",
    "/app/settings",
    "/manifest.json",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
];

// Install — precache shell assets
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch — smarter offline strategy
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests (mutations go through IndexedDB queue, not SW)
    if (request.method !== "GET") return;

    // Skip Convex WebSocket & API calls — they handle their own reconnection
    if (url.hostname !== self.location.hostname) return;
    if (url.pathname.startsWith("/api/")) return;

    // Navigation requests — network first, fallback to cached app shell
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request).then(
                        (cached) => cached || caches.match(OFFLINE_URL)
                    );
                })
        );
        return;
    }

    // Next.js build assets & static files — stale-while-revalidate
    if (
        url.pathname.startsWith("/_next/static/") ||
        url.pathname.startsWith("/icons/") ||
        url.pathname.endsWith(".css") ||
        url.pathname.endsWith(".js") ||
        url.pathname.endsWith(".woff2") ||
        url.pathname.endsWith(".woff") ||
        url.pathname.endsWith(".png") ||
        url.pathname.endsWith(".svg") ||
        url.pathname.endsWith(".ico")
    ) {
        event.respondWith(
            caches.match(request).then((cached) => {
                const fetchPromise = fetch(request)
                    .then((response) => {
                        if (response.ok) {
                            const clone = response.clone();
                            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                        }
                        return response;
                    })
                    .catch(() => cached);

                return cached || fetchPromise;
            })
        );
        return;
    }

    // Next.js data requests — network first, cache fallback
    if (url.pathname.startsWith("/_next/data/")) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // Default: network first, cache fallback
    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                }
                return response;
            })
            .catch(() => caches.match(request))
    );
});

// Listen for messages from the app
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});
