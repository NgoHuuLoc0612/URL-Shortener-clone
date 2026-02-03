// Service Worker for URL Shortener PWA
const CACHE_NAME = 'secure-url-shortener-v2.0.0';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline functionality
const CACHE_FILES = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/storage-manager.js',
    '/manifest.json',
    '/hacked-malware-websites.txt',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js'
];

// Dynamic cache patterns
const CACHE_PATTERNS = [
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
    /\.(?:js|css)$/,
    /cdn.*\.com/,
    /fonts/
];

// Network-first resources
const NETWORK_FIRST = [
    '/api/',
    '/hacked-malware-websites.txt'
];

// Cache-first resources
const CACHE_FIRST = [
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|otf)$/,
    /cdn.*\.com.*\.(?:css|js|woff|woff2)$/
];

// Install Event - Cache resources
self.addEventListener('install', (event) => {
    console.log('Service Worker: Install Event');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching App Shell');
                return cache.addAll(CACHE_FILES);
            })
            .catch((error) => {
                console.error('Service Worker: Cache failed:', error);
            })
    );
    
    // Force activation of new service worker
    self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activate Event');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => cacheName !== CACHE_NAME)
                        .map((cacheName) => {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                console.log('Service Worker: Cache cleanup completed');
                return self.clients.claim();
            })
    );
});

// Fetch Event - Handle requests with different caching strategies
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension requests
    if (url.protocol === 'chrome-extension:') {
        return;
    }

    event.respondWith(handleFetch(request));
});

// Main fetch handler with different strategies
async function handleFetch(request) {
    const url = new URL(request.url);
    
    try {
        // Network-first strategy for API calls and dynamic content
        if (NETWORK_FIRST.some(pattern => url.pathname.includes(pattern))) {
            return await networkFirst(request);
        }
        
        // Cache-first strategy for static assets
        if (CACHE_FIRST.some(pattern => pattern.test(url.href))) {
            return await cacheFirst(request);
        }
        
        // Stale-while-revalidate for HTML pages
        if (request.destination === 'document') {
            return await staleWhileRevalidate(request);
        }
        
        // Default: Cache-first with network fallback
        return await cacheFirst(request);
        
    } catch (error) {
        console.error('Service Worker: Fetch failed:', error);
        return await handleOffline(request);
    }
}

// Network-first strategy
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Service Worker: Network failed, trying cache:', request.url);
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

// Cache-first strategy
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        // Update cache in background
        updateCacheInBackground(request);
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        // Cache the response
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Service Worker: Cache and network both failed:', error);
        throw error;
    }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
    const cachedResponse = await caches.match(request);
    const networkResponse = fetchAndCache(request);
    
    return cachedResponse || networkResponse;
}

// Fetch and cache helper
async function fetchAndCache(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Service Worker: Fetch and cache failed:', error);
        throw error;
    }
}

// Background cache update
function updateCacheInBackground(request) {
    fetch(request)
        .then(response => {
            if (response.ok) {
                return caches.open(CACHE_NAME)
                    .then(cache => cache.put(request, response));
            }
        })
        .catch(error => {
            console.log('Service Worker: Background update failed:', error);
        });
}

// Handle offline scenarios
async function handleOffline(request) {
    const url = new URL(request.url);
    
    // Try to find cached version first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // Handle different request types when offline
    if (request.destination === 'document') {
        // Return cached index.html for navigation requests
        return caches.match('/index.html') || caches.match('/');
    }
    
    if (request.destination === 'image') {
        // Return a default offline image if available
        return caches.match('/images/offline-image.png');
    }
    
    // For other requests, return a generic offline response
    return new Response(
        JSON.stringify({
            error: 'Offline',
            message: 'This feature requires an internet connection'
        }),
        {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );
}

// Background Sync for offline URL creation
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Sync Event:', event.tag);
    
    if (event.tag === 'background-url-sync') {
        event.waitUntil(syncOfflineUrls());
    }
    
    if (event.tag === 'analytics-sync') {
        event.waitUntil(syncAnalytics());
    }
});

// Sync offline URLs when connection is restored
async function syncOfflineUrls() {
    try {
        console.log('Service Worker: Syncing offline URLs');
        
        // Get offline URLs from IndexedDB
        const db = await openIndexedDB();
        const offlineUrls = await getOfflineUrls(db);
        
        for (const urlData of offlineUrls) {
            try {
                // Attempt to sync with server
                const response = await fetch('/api/urls', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(urlData)
                });
                
                if (response.ok) {
                    // Remove from offline queue
                    await removeOfflineUrl(db, urlData.id);
                    console.log('Service Worker: Synced URL:', urlData.id);
                }
            } catch (error) {
                console.error('Service Worker: Sync failed for URL:', urlData.id, error);
            }
        }
    } catch (error) {
        console.error('Service Worker: URL sync failed:', error);
    }
}

// Sync analytics data
async function syncAnalytics() {
    try {
        console.log('Service Worker: Syncing analytics');
        
        const db = await openIndexedDB();
        const offlineAnalytics = await getOfflineAnalytics(db);
        
        for (const analytics of offlineAnalytics) {
            try {
                const response = await fetch('/api/analytics', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(analytics)
                });
                
                if (response.ok) {
                    await removeOfflineAnalytics(db, analytics.id);
                    console.log('Service Worker: Synced analytics:', analytics.id);
                }
            } catch (error) {
                console.error('Service Worker: Analytics sync failed:', analytics.id, error);
            }
        }
    } catch (error) {
        console.error('Service Worker: Analytics sync failed:', error);
    }
}

// IndexedDB helpers for sync
function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SecureURLShortenerDB', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getOfflineUrls(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['offline_urls'], 'readonly');
        const store = transaction.objectStore('offline_urls');
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

function removeOfflineUrl(db, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['offline_urls'], 'readwrite');
        const store = transaction.objectStore('offline_urls');
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

function getOfflineAnalytics(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['offline_analytics'], 'readonly');
        const store = transaction.objectStore('offline_analytics');
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

function removeOfflineAnalytics(db, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['offline_analytics'], 'readwrite');
        const store = transaction.objectStore('offline_analytics');
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Push notification handling
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push Event');
    
    if (!event.data) {
        return;
    }
    
    try {
        const data = event.data.json();
        const options = {
            body: data.body || 'You have a new notification',
            icon: '/icon-192.png',
            badge: '/icon-96.png',
            data: data.data || {},
            actions: [
                {
                    action: 'view',
                    title: 'View',
                    icon: '/images/view-icon.png'
                },
                {
                    action: 'dismiss',
                    title: 'Dismiss',
                    icon: '/images/dismiss-icon.png'
                }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title || 'URL Shortener', options)
        );
    } catch (error) {
        console.error('Service Worker: Push notification failed:', error);
    }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification Click');
    
    event.notification.close();
    
    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/analytics')
        );
    } else if (event.action === 'dismiss') {
        // Just close the notification
        return;
    } else {
        // Default action - open the app
        event.waitUntil(
            clients.matchAll({ type: 'window' })
                .then((clients) => {
                    // Focus existing window if available
                    for (const client of clients) {
                        if (client.url.includes(self.registration.scope) && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    // Open new window if no existing window
                    if (clients.openWindow) {
                        return clients.openWindow('/');
                    }
                })
        );
    }
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
    console.log('Service Worker: Message received:', event.data);
    
    const { type, data } = event.data;
    
    switch (type) {
        case 'CACHE_URL':
            event.waitUntil(cacheUrl(data.url));
            break;
            
        case 'CLEAR_CACHE':
            event.waitUntil(clearSpecificCache(data.pattern));
            break;
            
        case 'UPDATE_CACHE':
            event.waitUntil(updateCache());
            break;
            
        case 'GET_CACHE_SIZE':
            event.waitUntil(getCacheSize().then(size => {
                event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
            }));
            break;
            
        case 'OFFLINE_URL_CREATED':
            event.waitUntil(storeOfflineUrl(data));
            break;
            
        case 'REQUEST_SYNC':
            event.waitUntil(self.registration.sync.register(data.tag));
            break;
            
        default:
            console.log('Service Worker: Unknown message type:', type);
    }
});

// Cache specific URL
async function cacheUrl(url) {
    try {
        const cache = await caches.open(CACHE_NAME);
        const response = await fetch(url);
        
        if (response.ok) {
            await cache.put(url, response);
            console.log('Service Worker: Cached URL:', url);
        }
    } catch (error) {
        console.error('Service Worker: Failed to cache URL:', url, error);
    }
}

// Clear cache matching pattern
async function clearSpecificCache(pattern) {
    try {
        const cache = await caches.open(CACHE_NAME);
        const requests = await cache.keys();
        
        const regex = new RegExp(pattern);
        const deletePromises = requests
            .filter(request => regex.test(request.url))
            .map(request => cache.delete(request));
        
        await Promise.all(deletePromises);
        console.log('Service Worker: Cleared cache matching pattern:', pattern);
    } catch (error) {
        console.error('Service Worker: Failed to clear cache:', error);
    }
}

// Update entire cache
async function updateCache() {
    try {
        const cache = await caches.open(CACHE_NAME);
        
        // Update core files
        for (const file of CACHE_FILES) {
            try {
                const response = await fetch(file);
                if (response.ok) {
                    await cache.put(file, response);
                }
            } catch (error) {
                console.warn('Service Worker: Failed to update cache for:', file);
            }
        }
        
        console.log('Service Worker: Cache update completed');
    } catch (error) {
        console.error('Service Worker: Cache update failed:', error);
    }
}

// Get total cache size
async function getCacheSize() {
    try {
        const cacheNames = await caches.keys();
        let totalSize = 0;
        
        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            
            for (const request of requests) {
                const response = await cache.match(request);
                if (response) {
                    const blob = await response.blob();
                    totalSize += blob.size;
                }
            }
        }
        
        return totalSize;
    } catch (error) {
        console.error('Service Worker: Failed to calculate cache size:', error);
        return 0;
    }
}

// Store URL for offline sync
async function storeOfflineUrl(urlData) {
    try {
        const db = await openIndexedDB();
        const transaction = db.transaction(['offline_urls'], 'readwrite');
        const store = transaction.objectStore('offline_urls');
        
        await store.put({
            ...urlData,
            timestamp: Date.now(),
            synced: false
        });
        
        console.log('Service Worker: Stored offline URL for sync:', urlData.id);
        
        // Register for background sync
        await self.registration.sync.register('background-url-sync');
    } catch (error) {
        console.error('Service Worker: Failed to store offline URL:', error);
    }
}

// Periodic cache cleanup
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'cache-cleanup') {
        event.waitUntil(performCacheCleanup());
    }
});

async function performCacheCleanup() {
    try {
        console.log('Service Worker: Performing periodic cache cleanup');
        
        const cache = await caches.open(CACHE_NAME);
        const requests = await cache.keys();
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const dateHeader = response.headers.get('date');
                if (dateHeader) {
                    const responseDate = new Date(dateHeader).getTime();
                    if (now - responseDate > maxAge) {
                        await cache.delete(request);
                        console.log('Service Worker: Cleaned up old cache entry:', request.url);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Service Worker: Cache cleanup failed:', error);
    }
}

// Handle fetch errors and provide meaningful responses
function createErrorResponse(error, request) {
    const isAPI = request.url.includes('/api/');
    
    if (isAPI) {
        return new Response(
            JSON.stringify({
                error: 'NetworkError',
                message: 'Unable to connect to server',
                offline: true,
                timestamp: Date.now()
            }),
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            }
        );
    }
    
    // For non-API requests, try to return cached fallback
    return caches.match('/offline.html')
        .then(response => response || new Response('Offline', { status: 503 }));
}

// Analytics tracking for service worker events
function trackServiceWorkerEvent(event, data = {}) {
    // Send analytics data to main thread
    self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'SW_ANALYTICS',
                event,
                data: {
                    ...data,
                    timestamp: Date.now(),
                    userAgent: navigator.userAgent
                }
            });
        });
    });
}

// Enhanced error handling with retry logic
async function fetchWithRetry(request, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(request);
            if (response.ok || response.status < 500) {
                return response;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        } catch (error) {
            lastError = error;
            
            if (i < maxRetries - 1) {
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        }
    }
    
    throw lastError;
}

// Preload critical resources
async function preloadCriticalResources() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const criticalResources = [
            '/hacked-malware-websites.txt',
            'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js'
        ];
        
        for (const resource of criticalResources) {
            try {
                if (!(await cache.match(resource))) {
                    const response = await fetch(resource);
                    if (response.ok) {
                        await cache.put(resource, response);
                        console.log('Service Worker: Preloaded:', resource);
                    }
                }
            } catch (error) {
                console.warn('Service Worker: Failed to preload:', resource, error);
            }
        }
    } catch (error) {
        console.error('Service Worker: Preload failed:', error);
    }
}

// Initialize service worker
console.log('Service Worker: Script loaded');

// Preload critical resources after installation
self.addEventListener('install', (event) => {
    event.waitUntil(preloadCriticalResources());
});

// Track service worker lifecycle events
self.addEventListener('install', () => {
    trackServiceWorkerEvent('install');
});

self.addEventListener('activate', () => {
    trackServiceWorkerEvent('activate');
});

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
    console.error('Service Worker: Unhandled promise rejection:', event.reason);
    trackServiceWorkerEvent('error', { 
        type: 'unhandledrejection', 
        reason: event.reason.toString() 
    });
});

// Handle errors
self.addEventListener('error', (event) => {
    console.error('Service Worker: Error:', event.error);
    trackServiceWorkerEvent('error', { 
        type: 'error', 
        message: event.error.toString(),
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
});