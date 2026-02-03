// Storage Manager with IndexedDB, localStorage and caching
class StorageManager {
    constructor() {
        this.dbName = 'SecureURLShortenerDB';
        this.dbVersion = 1;
        this.db = null;
        this.cache = new Map();
        this.initialized = false;
        this.storageQuota = null;
        this.compressionEnabled = true;
    }

    async init() {
        if (this.initialized) return;

        try {
            // Initialize IndexedDB
            await this.initDB();
            
            // Check storage quota
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                this.storageQuota = await navigator.storage.estimate();
            }

            // Load cache from localStorage
            await this.loadCacheFromLocalStorage();

            this.initialized = true;
            console.log('Storage Manager initialized successfully');
        } catch (error) {
            console.error('Storage Manager initialization failed:', error);
            // Fallback to localStorage only
            this.initialized = true;
        }
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // URLs store
                if (!db.objectStoreNames.contains('urls')) {
                    const urlStore = db.createObjectStore('urls', { keyPath: 'id' });
                    urlStore.createIndex('shortCode', 'shortCode', { unique: true });
                    urlStore.createIndex('createdAt', 'createdAt');
                    urlStore.createIndex('clicks', 'clicks');
                }

                // Analytics store
                if (!db.objectStoreNames.contains('analytics')) {
                    const analyticsStore = db.createObjectStore('analytics', { keyPath: 'urlId' });
                    analyticsStore.createIndex('timestamp', 'timestamp');
                }

                // Security logs store
                if (!db.objectStoreNames.contains('security')) {
                    const securityStore = db.createObjectStore('security', { keyPath: 'id', autoIncrement: true });
                    securityStore.createIndex('timestamp', 'timestamp');
                    securityStore.createIndex('type', 'type');
                }

                // Settings store
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                // Cache store
                if (!db.objectStoreNames.contains('cache')) {
                    const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
                    cacheStore.createIndex('timestamp', 'timestamp');
                    cacheStore.createIndex('expiry', 'expiry');
                }
            };
        });
    }

    // URL Management
    async saveURL(urlData) {
        try {
            // Compress data if enabled
            const compressedData = this.compressionEnabled ? 
                this.compressData(urlData) : urlData;

            // Save to IndexedDB
            if (this.db) {
                await this.dbOperation('urls', 'put', compressedData);
            }

            // Update cache
            this.cache.set(`url_${urlData.id}`, compressedData);

            // Backup to localStorage
            await this.backupToLocalStorage('urls', urlData.id, compressedData);

            return true;
        } catch (error) {
            console.error('Error saving URL:', error);
            return false;
        }
    }

    async getURL(id) {
        try {
            // Check cache first
            const cacheKey = `url_${id}`;
            if (this.cache.has(cacheKey)) {
                const data = this.cache.get(cacheKey);
                return this.compressionEnabled ? this.decompressData(data) : data;
            }

            // Try IndexedDB
            if (this.db) {
                const data = await this.dbOperation('urls', 'get', id);
                if (data) {
                    this.cache.set(cacheKey, data);
                    return this.compressionEnabled ? this.decompressData(data) : data;
                }
            }

            // Fallback to localStorage
            const localData = this.getFromLocalStorage(`urls_${id}`);
            if (localData) {
                this.cache.set(cacheKey, localData);
                return localData;
            }

            return null;
        } catch (error) {
            console.error('Error getting URL:', error);
            return null;
        }
    }

    async getAllURLs() {
        try {
            // Try IndexedDB first
            if (this.db) {
                const urls = await this.dbOperation('urls', 'getAll');
                if (urls && urls.length > 0) {
                    // Update cache
                    urls.forEach(url => {
                        this.cache.set(`url_${url.id}`, url);
                    });
                    return this.compressionEnabled ? 
                        urls.map(url => this.decompressData(url)) : urls;
                }
            }

            // Fallback to localStorage
            const localUrls = this.getAllFromLocalStorage('urls_');
            return localUrls || [];
        } catch (error) {
            console.error('Error getting all URLs:', error);
            return [];
        }
    }

    async deleteURL(id) {
        try {
            // Remove from IndexedDB
            if (this.db) {
                await this.dbOperation('urls', 'delete', id);
            }

            // Remove from cache
            this.cache.delete(`url_${id}`);

            // Remove from localStorage
            this.removeFromLocalStorage(`urls_${id}`);

            return true;
        } catch (error) {
            console.error('Error deleting URL:', error);
            return false;
        }
    }

    async clearAllURLs() {
        try {
            // Clear IndexedDB
            if (this.db) {
                await this.dbOperation('urls', 'clear');
            }

            // Clear cache
            for (const key of this.cache.keys()) {
                if (key.startsWith('url_')) {
                    this.cache.delete(key);
                }
            }

            // Clear localStorage
            this.clearLocalStorageByPrefix('urls_');

            return true;
        } catch (error) {
            console.error('Error clearing URLs:', error);
            return false;
        }
    }

    // Analytics Management
    async saveAnalytics(urlId, analyticsData) {
        try {
            const data = {
                urlId,
                ...analyticsData,
                timestamp: Date.now()
            };

            if (this.db) {
                await this.dbOperation('analytics', 'put', data);
            }

            // Cache recent analytics
            this.cache.set(`analytics_${urlId}`, data);

            return true;
        } catch (error) {
            console.error('Error saving analytics:', error);
            return false;
        }
    }

    async getAnalytics(urlId) {
        try {
            // Check cache first
            const cacheKey = `analytics_${urlId}`;
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            // Try IndexedDB
            if (this.db) {
                const data = await this.dbOperation('analytics', 'get', urlId);
                if (data) {
                    this.cache.set(cacheKey, data);
                    return data;
                }
            }

            return null;
        } catch (error) {
            console.error('Error getting analytics:', error);
            return null;
        }
    }

    // Security Logs Management
    async saveSecurityLog(logData) {
        try {
            const data = {
                ...logData,
                timestamp: Date.now(),
                id: Date.now() + Math.random()
            };

            if (this.db) {
                await this.dbOperation('security', 'add', data);
            }

            // Keep only recent logs in cache
            this.cleanupSecurityLogs();

            return true;
        } catch (error) {
            console.error('Error saving security log:', error);
            return false;
        }
    }

    async getSecurityLogs(limit = 100) {
        try {
            if (this.db) {
                const transaction = this.db.transaction(['security'], 'readonly');
                const store = transaction.objectStore('security');
                const index = store.index('timestamp');
                const request = index.openCursor(null, 'prev');

                return new Promise((resolve, reject) => {
                    const results = [];
                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor && results.length < limit) {
                            results.push(cursor.value);
                            cursor.continue();
                        } else {
                            resolve(results);
                        }
                    };
                    request.onerror = () => reject(request.error);
                });
            }
            return [];
        } catch (error) {
            console.error('Error getting security logs:', error);
            return [];
        }
    }

    // Settings Management
    async saveSetting(key, value) {
        try {
            const data = { key, value, timestamp: Date.now() };

            if (this.db) {
                await this.dbOperation('settings', 'put', data);
            }

            // Cache settings
            this.cache.set(`setting_${key}`, value);

            // Backup to localStorage
            localStorage.setItem(`setting_${key}`, JSON.stringify(value));

            return true;
        } catch (error) {
            console.error('Error saving setting:', error);
            return false;
        }
    }

    async getSetting(key, defaultValue = null) {
        try {
            // Check cache first
            const cacheKey = `setting_${key}`;
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            // Try IndexedDB
            if (this.db) {
                const data = await this.dbOperation('settings', 'get', key);
                if (data) {
                    this.cache.set(cacheKey, data.value);
                    return data.value;
                }
            }

            // Fallback to localStorage
            const localData = localStorage.getItem(`setting_${key}`);
            if (localData) {
                try {
                    const value = JSON.parse(localData);
                    this.cache.set(cacheKey, value);
                    return value;
                } catch (e) {
                    return localData;
                }
            }

            return defaultValue;
        } catch (error) {
            console.error('Error getting setting:', error);
            return defaultValue;
        }
    }

    // Cache Management
    async setCache(key, data, ttl = 3600000) { // Default 1 hour TTL
        try {
            const cacheData = {
                key,
                data,
                timestamp: Date.now(),
                expiry: Date.now() + ttl
            };

            if (this.db) {
                await this.dbOperation('cache', 'put', cacheData);
            }

            this.cache.set(key, data);
            return true;
        } catch (error) {
            console.error('Error setting cache:', error);
            return false;
        }
    }

    async getCache(key) {
        try {
            // Check memory cache first
            if (this.cache.has(key)) {
                return this.cache.get(key);
            }

            // Check IndexedDB cache
            if (this.db) {
                const cacheData = await this.dbOperation('cache', 'get', key);
                if (cacheData && cacheData.expiry > Date.now()) {
                    this.cache.set(key, cacheData.data);
                    return cacheData.data;
                } else if (cacheData) {
                    // Expired, remove it
                    await this.dbOperation('cache', 'delete', key);
                }
            }

            return null;
        } catch (error) {
            console.error('Error getting cache:', error);
            return null;
        }
    }

    async clearExpiredCache() {
        try {
            if (!this.db) return;

            const transaction = this.db.transaction(['cache'], 'readwrite');
            const store = transaction.objectStore('cache');
            const index = store.index('expiry');
            const now = Date.now();

            const request = index.openCursor(IDBKeyRange.upperBound(now));
            
            return new Promise((resolve, reject) => {
                let deletedCount = 0;
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        deletedCount++;
                        cursor.continue();
                    } else {
                        console.log(`Cleared ${deletedCount} expired cache entries`);
                        resolve(deletedCount);
                    }
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error clearing expired cache:', error);
            return 0;
        }
    }

    async clearCache() {
        try {
            if (this.db) {
                await this.dbOperation('cache', 'clear');
            }
            
            this.cache.clear();
            return true;
        } catch (error) {
            console.error('Error clearing cache:', error);
            return false;
        }
    }

    // Database Operations Helper
    async dbOperation(storeName, operation, data = null) {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 
                operation === 'get' || operation === 'getAll' ? 'readonly' : 'readwrite');
            const store = transaction.objectStore(storeName);
            
            let request;
            switch (operation) {
                case 'add':
                    request = store.add(data);
                    break;
                case 'put':
                    request = store.put(data);
                    break;
                case 'get':
                    request = store.get(data);
                    break;
                case 'getAll':
                    request = store.getAll();
                    break;
                case 'delete':
                    request = store.delete(data);
                    break;
                case 'clear':
                    request = store.clear();
                    break;
                default:
                    reject(new Error(`Unknown operation: ${operation}`));
                    return;
            }

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Data Compression
    compressData(data) {
        try {
            const jsonString = JSON.stringify(data);
            // Simple compression by removing whitespace and common patterns
            const compressed = jsonString
                .replace(/\s+/g, ' ')
                .replace(/": "/g, '":"')
                .replace(/", "/g, '","')
                .trim();
            
            return {
                ...data,
                _compressed: true,
                _originalSize: jsonString.length,
                _compressedSize: compressed.length
            };
        } catch (error) {
            console.warn('Compression failed, using original data:', error);
            return data;
        }
    }

    decompressData(data) {
        if (data && data._compressed) {
            // Remove compression metadata
            const { _compressed, _originalSize, _compressedSize, ...originalData } = data;
            return originalData;
        }
        return data;
    }

    // localStorage Fallback Functions
    backupToLocalStorage(prefix, key, data) {
        try {
            const storageKey = `${prefix}_${key}`;
            localStorage.setItem(storageKey, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('localStorage backup failed:', error);
            return false;
        }
    }

    getFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('localStorage get failed:', error);
            return null;
        }
    }

    getAllFromLocalStorage(prefix) {
        try {
            const items = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    const data = this.getFromLocalStorage(key);
                    if (data) items.push(data);
                }
            }
            return items;
        } catch (error) {
            console.error('localStorage getAll failed:', error);
            return [];
        }
    }

    removeFromLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('localStorage remove failed:', error);
            return false;
        }
    }

    clearLocalStorageByPrefix(prefix) {
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            return true;
        } catch (error) {
            console.error('localStorage clear by prefix failed:', error);
            return false;
        }
    }

    async loadCacheFromLocalStorage() {
        try {
            const cacheKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('cache_')) {
                    cacheKeys.push(key);
                }
            }

            cacheKeys.forEach(key => {
                const data = this.getFromLocalStorage(key);
                if (data) {
                    const cacheKey = key.replace('cache_', '');
                    this.cache.set(cacheKey, data);
                }
            });

            console.log(`Loaded ${cacheKeys.length} cache entries from localStorage`);
        } catch (error) {
            console.error('Failed to load cache from localStorage:', error);
        }
    }

    // Storage Statistics and Management
    async getStorageStats() {
        try {
            const stats = {
                urls: 0,
                analytics: 0,
                security: 0,
                settings: 0,
                cache: 0,
                totalSize: 0,
                quota: this.storageQuota
            };

            if (this.db) {
                const stores = ['urls', 'analytics', 'security', 'settings', 'cache'];
                for (const store of stores) {
                    try {
                        const data = await this.dbOperation(store, 'getAll');
                        stats[store] = data ? data.length : 0;
                    } catch (error) {
                        console.warn(`Failed to get stats for ${store}:`, error);
                    }
                }
            }

            // Calculate localStorage size
            let localStorageSize = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                localStorageSize += key.length + (value ? value.length : 0);
            }

            stats.localStorageSize = localStorageSize;
            stats.cacheSize = this.cache.size;

            return stats;
        } catch (error) {
            console.error('Error getting storage stats:', error);
            return null;
        }
    }

    async optimizeStorage() {
        try {
            let optimizationResults = {
                cacheCleared: 0,
                expiredEntriesRemoved: 0,
                spaceFreed: 0
            };

            // Clear expired cache
            optimizationResults.cacheCleared = await this.clearExpiredCache();

            // Remove old security logs (keep only last 1000)
            if (this.db) {
                const logs = await this.getSecurityLogs(2000);
                if (logs.length > 1000) {
                    const toRemove = logs.slice(1000);
                    const transaction = this.db.transaction(['security'], 'readwrite');
                    const store = transaction.objectStore('security');
                    
                    for (const log of toRemove) {
                        store.delete(log.id);
                    }
                    optimizationResults.expiredEntriesRemoved = toRemove.length;
                }
            }

            // Compress data if not already compressed
            const urls = await this.getAllURLs();
            for (const url of urls) {
                if (!url._compressed && this.compressionEnabled) {
                    await this.saveURL(url);
                }
            }

            console.log('Storage optimization completed:', optimizationResults);
            return optimizationResults;
        } catch (error) {
            console.error('Storage optimization failed:', error);
            return null;
        }
    }

    async cleanupSecurityLogs() {
        try {
            // Keep only logs from last 30 days
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            
            if (this.db) {
                const transaction = this.db.transaction(['security'], 'readwrite');
                const store = transaction.objectStore('security');
                const index = store.index('timestamp');
                const request = index.openCursor(IDBKeyRange.upperBound(thirtyDaysAgo));

                return new Promise((resolve) => {
                    let deletedCount = 0;
                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            cursor.delete();
                            deletedCount++;
                            cursor.continue();
                        } else {
                            if (deletedCount > 0) {
                                console.log(`Cleaned up ${deletedCount} old security logs`);
                            }
                            resolve(deletedCount);
                        }
                    };
                    request.onerror = () => resolve(0);
                });
            }
            return 0;
        } catch (error) {
            console.error('Security logs cleanup failed:', error);
            return 0;
        }
    }

    // Export/Import Functions
    async exportAllData() {
        try {
            const data = {
                urls: await this.getAllURLs(),
                settings: {},
                metadata: {
                    exportDate: new Date().toISOString(),
                    version: '2.0',
                    compressed: this.compressionEnabled
                }
            };

            // Export settings
            if (this.db) {
                const settings = await this.dbOperation('settings', 'getAll');
                settings.forEach(setting => {
                    data.settings[setting.key] = setting.value;
                });
            }

            return data;
        } catch (error) {
            console.error('Data export failed:', error);
            return null;
        }
    }

    async importAllData(importData) {
        try {
            let importResults = {
                urls: 0,
                settings: 0,
                errors: []
            };

            // Import URLs
            if (importData.urls && Array.isArray(importData.urls)) {
                for (const url of importData.urls) {
                    try {
                        await this.saveURL(url);
                        importResults.urls++;
                    } catch (error) {
                        importResults.errors.push(`Failed to import URL ${url.id}: ${error.message}`);
                    }
                }
            }

            // Import settings
            if (importData.settings) {
                for (const [key, value] of Object.entries(importData.settings)) {
                    try {
                        await this.saveSetting(key, value);
                        importResults.settings++;
                    } catch (error) {
                        importResults.errors.push(`Failed to import setting ${key}: ${error.message}`);
                    }
                }
            }

            console.log('Data import completed:', importResults);
            return importResults;
        } catch (error) {
            console.error('Data import failed:', error);
            return null;
        }
    }

    // Migration and Maintenance
    async migrateFromOldStorage() {
        try {
            console.log('Checking for legacy data migration...');
            
            // Check for old localStorage keys
            const legacyKeys = [
                'urlShortener_urls',
                'secureUrlShortener_urls',
                'urlShortener_rateLimit',
                'secureUrlShortener_rateLimit',
                'urlShortener_securityStats',
                'secureUrlShortener_securityStats'
            ];

            let migrated = 0;
            
            for (const key of legacyKeys) {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        const parsedData = JSON.parse(data);
                        
                        if (key.includes('urls')) {
                            // Migrate URLs
                            if (Array.isArray(parsedData)) {
                                for (const url of parsedData) {
                                    await this.saveURL(url);
                                    migrated++;
                                }
                            }
                        } else if (key.includes('rateLimit')) {
                            await this.saveSetting('rateLimit', parsedData);
                            migrated++;
                        } else if (key.includes('securityStats')) {
                            await this.saveSetting('securityStats', parsedData);
                            migrated++;
                        }
                        
                        // Remove old key after successful migration
                        localStorage.removeItem(key);
                    } catch (error) {
                        console.error(`Failed to migrate ${key}:`, error);
                    }
                }
            }

            if (migrated > 0) {
                console.log(`Successfully migrated ${migrated} items from legacy storage`);
            }
            
            return migrated;
        } catch (error) {
            console.error('Migration failed:', error);
            return 0;
        }
    }

    // Periodic maintenance
    async performMaintenance() {
        try {
            console.log('Performing storage maintenance...');
            
            const results = {
                cacheCleared: await this.clearExpiredCache(),
                logsCleanedUp: await this.cleanupSecurityLogs(),
                optimizationResults: await this.optimizeStorage()
            };

            console.log('Maintenance completed:', results);
            return results;
        } catch (error) {
            console.error('Maintenance failed:', error);
            return null;
        }
    }

    // Cleanup and destroy
    destroy() {
        try {
            if (this.db) {
                this.db.close();
                this.db = null;
            }
            this.cache.clear();
            this.initialized = false;
            console.log('Storage Manager destroyed');
        } catch (error) {
            console.error('Storage Manager destruction failed:', error);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
} else {
    window.StorageManager = StorageManager;
}