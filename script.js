// URL Shortener with Storage Manager Integration
class SecureURLShortener {
    constructor() {
        this.currentShortUrl = null;
        this.baseUrl = window.location.origin + '/';
        this.charts = {};
        this.malwareDatabase = new Set();
        this.storageManager = new StorageManager();
        this.isOnline = navigator.onLine;
        this.syncPending = false;
        this.urls = []; // Initialize urls array
        
        // Initialize rate limiting from storage
        this.rateLimit = {
            requests: [],
            maxRequests: 10
        };
        
        // Initialize security stats
        this.securityStats = {
            scanned: 0,
            blocked: 0,
            rateLimited: 0
        };
    }

    async init() {
        try {
            console.log('Initializing Secure URL Shortener...');
            
            // Initialize storage manager
            await this.storageManager.init();
            
            // Load URLs from storage
            this.urls = await this.loadUrls();
            
            // Load settings and data
            await this.loadSettings();
            await this.loadSecurityStats();
            await this.loadRateLimit();
            
            // Migrate legacy data if needed
            await this.storageManager.migrateFromOldStorage();
            
            // Load malware database
            this.malwareDatabase = await this.initMalwareDatabase();
            
            // Setup event listeners
            this.setupEventListeners();
            this.setupTabNavigation();
            this.setupNetworkListeners();
            this.setupPWAListeners();
            
            // Initialize UI
            this.renderHistory();
            this.updateRateLimitDisplay();
            this.updateSecurityStats();
            this.updateStorageInfo();
            this.setupCSRFProtection();
            this.sanitizeInputs();
            
            // Setup periodic maintenance
            this.setupMaintenance();
            
            console.log('Secure URL Shortener initialized successfully');
            console.log(`Malware database loaded with ${this.malwareDatabase.size} entries`);
            
        } catch (error) {
            console.error('Initialization failed:', error);
            this.showToast('Application initialization failed. Some features may not work properly.', 'error');
        }
    }

    // Missing method: Setup Network Listeners
    setupNetworkListeners() {
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateConnectionStatus();
            this.syncOfflineData();
            this.showToast('Connection restored', 'success');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateConnectionStatus();
            this.showToast('Working offline', 'warning');
        });

        // Update initial status
        this.updateConnectionStatus();
    }

    // Missing method: Setup PWA Listeners
    setupPWAListeners() {
        let deferredPrompt;

        // Listen for beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            this.showInstallPrompt();
        });

        // Handle install button click
        const installBtn = document.getElementById('installPwaBtn');
        if (installBtn) {
            installBtn.addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                        this.showToast('App installed successfully!', 'success');
                    }
                    deferredPrompt = null;
                    this.hideInstallPrompt();
                }
            });
        }

        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            this.hideInstallPrompt();
            document.body.classList.add('pwa-installed');
        }
    }

    // Missing method: Update Connection Status
    updateConnectionStatus() {
        const statusIcon = document.getElementById('connectionStatus');
        const pwaIndicator = document.getElementById('pwaIndicator');
        
        if (statusIcon) {
            if (this.isOnline) {
                statusIcon.className = 'fas fa-wifi';
                statusIcon.style.color = '#28a745';
                pwaIndicator.title = 'Online';
            } else {
                statusIcon.className = 'fas fa-wifi-slash';
                statusIcon.style.color = '#ffc107';
                pwaIndicator.title = 'Offline';
            }
        }
    }

    // Missing method: Show Install Prompt
    showInstallPrompt() {
        const installBtn = document.getElementById('installPwaBtn');
        const pwaStatus = document.getElementById('pwaStatus');
        
        if (installBtn && pwaStatus) {
            installBtn.style.display = 'block';
            pwaStatus.querySelector('p').textContent = 'Install this app for better performance and offline access';
        }
    }

    // Missing method: Hide Install Prompt
    hideInstallPrompt() {
        const installBtn = document.getElementById('installPwaBtn');
        const pwaStatus = document.getElementById('pwaStatus');
        
        if (installBtn && pwaStatus) {
            installBtn.style.display = 'none';
            pwaStatus.querySelector('p').textContent = 'App is already installed';
        }
    }

    // Missing method: Sync Offline Data
    async syncOfflineData() {
        if (!this.isOnline || this.syncPending) return;

        try {
            this.syncPending = true;
            // Here you would sync any offline data with the server
            // For this demo, we'll just update the UI
            console.log('Syncing offline data...');
            
            // Simulate sync delay
            await this.delay(1000);
            
            this.syncPending = false;
            console.log('Offline data synced successfully');
        } catch (error) {
            console.error('Failed to sync offline data:', error);
            this.syncPending = false;
        }
    }

    // Missing method: Setup Maintenance
    setupMaintenance() {
        // Perform maintenance every hour
        setInterval(async () => {
            try {
                await this.storageManager.performMaintenance();
                this.updateStorageInfo();
            } catch (error) {
                console.error('Maintenance failed:', error);
            }
        }, 60 * 60 * 1000); // 1 hour

        // Clean up expired cache every 30 minutes
        setInterval(async () => {
            try {
                await this.storageManager.clearExpiredCache();
            } catch (error) {
                console.error('Cache cleanup failed:', error);
            }
        }, 30 * 60 * 1000); // 30 minutes
    }

    // Missing method: Update Storage Info
    async updateStorageInfo() {
        try {
            const stats = await this.storageManager.getStorageStats();
            if (stats) {
                const urlsCountEl = document.getElementById('urlsCount');
                const storageUsedEl = document.getElementById('storageUsed');
                const cacheSizeEl = document.getElementById('cacheSize');

                if (urlsCountEl) urlsCountEl.textContent = this.urls.length;
                if (storageUsedEl) storageUsedEl.textContent = this.formatBytes(stats.localStorageSize || 0);
                if (cacheSizeEl) cacheSizeEl.textContent = this.formatBytes(stats.cacheSize || 0);
            }
        } catch (error) {
            console.error('Failed to update storage info:', error);
        }
    }

    // Missing method: Format Bytes
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Fix the loadUrls method to use StorageManager
    async loadUrls() {
        try {
            const urls = await this.storageManager.getAllURLs();
            return urls || [];
        } catch (error) {
            console.error('Error loading URLs:', error);
            return [];
        }
    }

    // Fix the saveUrls method to use StorageManager
    async saveUrls() {
        try {
            // Save each URL individually
            for (const url of this.urls) {
                await this.storageManager.saveURL(url);
            }
        } catch (error) {
            console.error('Error saving URLs:', error);
            this.showToast('Error saving data. Storage might be full.', 'error');
        }
    }

    async loadSettings() {
        try {
            this.settings = {
                appMode: await this.storageManager.getSetting('appMode', 'online'),
                autoBackup: await this.storageManager.getSetting('autoBackup', true),
                compressionEnabled: await this.storageManager.getSetting('compressionEnabled', true),
                rateLimitMax: await this.storageManager.getSetting('rateLimitMax', 10),
                theme: await this.storageManager.getSetting('theme', 'default')
            };
            
            // Apply settings
            this.storageManager.compressionEnabled = this.settings.compressionEnabled;
            this.rateLimit.maxRequests = this.settings.rateLimitMax;
            
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.settings = {};
        }
    }

    async loadSecurityStats() {
        try {
            this.securityStats = await this.storageManager.getSetting('securityStats', {
                scanned: 0,
                blocked: 0,
                rateLimited: 0
            });
        } catch (error) {
            console.error('Failed to load security stats:', error);
        }
    }

    async loadRateLimit() {
        try {
            const rateLimitData = await this.storageManager.getSetting('rateLimit', {
                requests: [],
                maxRequests: 10
            });
            
            // Clean old entries
            const hourAgo = Date.now() - (60 * 60 * 1000);
            rateLimitData.requests = rateLimitData.requests.filter(time => time > hourAgo);
            
            this.rateLimit = rateLimitData;
        } catch (error) {
            console.error('Failed to load rate limit data:', error);
        }
    }

    async saveSettings() {
        try {
            for (const [key, value] of Object.entries(this.settings)) {
                await this.storageManager.saveSetting(key, value);
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    async saveSecurityStats() {
        try {
            await this.storageManager.saveSetting('securityStats', this.securityStats);
        } catch (error) {
            console.error('Failed to save security stats:', error);
        }
    }

    async saveRateLimit() {
        try {
            await this.storageManager.saveSetting('rateLimit', this.rateLimit);
        } catch (error) {
            console.error('Failed to save rate limit data:', error);
        }
    }

    // Security & Protection
    async initMalwareDatabase() {
        try {
            const response = await fetch('hacked-malware-websites.txt');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const text = await response.text();
            const domains = text
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#')) // Filter out empty lines and comments
                .map(line => line.toLowerCase()); // Normalize to lowercase
            
            console.log(`Loaded ${domains.length} malware domains from database`);
            return new Set(domains);
            
        } catch (error) {
            console.warn('Failed to load malware database:', error.message);
            console.log('Using fallback malware database');
            
            // Fallback to hardcoded domains if file loading fails
            return new Set([
                'malware-example.com',
                'phishing-site.net', 
                'spam-domain.org',
                'dangerous-site.com',
                'threat-domain.net',
                'malicious-url.org',
                // Common malware/phishing patterns
                '*.tk',
                '*.ml', 
                '*.ga',
                '*.cf',
                'bit.ly/malware',
                'tinyurl.com/virus',
                'shortened.malware'
            ]);
        }
    }

    setupCSRFProtection() {
        this.csrfToken = this.generateCSRFToken();
        document.querySelectorAll('form').forEach(form => {
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = 'csrf_token';
            csrfInput.value = this.csrfToken;
            form.appendChild(csrfInput);
        });
    }

    generateCSRFToken() {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)), 
            byte => byte.toString(16).padStart(2, '0')).join('');
    }

    sanitizeInput(input) {
        return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                   .replace(/[<>'"]/g, (char) => {
                       const map = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
                       return map[char];
                   });
    }

    sanitizeInputs() {
        document.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT' && e.target.type === 'text') {
                e.target.value = this.sanitizeInput(e.target.value);
            }
        });
    }

    async scanForMalware(url) {
        try {
            const domain = new URL(url).hostname.toLowerCase();
            
            // Check against loaded malware database
            if (this.malwareDatabase.has(domain)) {
                return { safe: false, threat: 'malware', details: `Domain "${domain}" is in malware database` };
            }
            
            // Check for wildcard patterns (e.g., *.tk domains)
            for (const pattern of this.malwareDatabase) {
                if (pattern.startsWith('*.')) {
                    const tld = pattern.substring(2);
                    if (domain.endsWith('.' + tld)) {
                        return { safe: false, threat: 'suspicious', details: `Domain uses suspicious TLD: .${tld}` };
                    }
                } else if (pattern.includes('/')) {
                    // Check for URL patterns
                    if (url.toLowerCase().includes(pattern.toLowerCase())) {
                        return { safe: false, threat: 'malware', details: `URL matches malicious pattern: ${pattern}` };
                    }
                }
            }

            // Simulate API delay for realistic experience
            await this.delay(500);
            
            // Additional heuristic checks
            const suspiciousPatterns = [
                /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/, // IP addresses
                /free.*money/i,
                /click.*here.*win/i,
                /urgent.*action.*required/i,
                /verify.*account.*immediately/i,
                /suspended.*account/i,
                /limited.*time.*offer/i
            ];

            const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(url));
            
            if (isSuspicious) {
                return { safe: false, threat: 'suspicious', details: 'URL matches suspicious patterns' };
            }

            // Check for suspicious URL structure
            if (url.length > 200 || (url.match(/\./g) || []).length > 5) {
                return { safe: false, threat: 'suspicious', details: 'URL has suspicious structure' };
            }

            this.securityStats.scanned++;
            this.saveSecurityStats();
            
            return { safe: true, threat: null, details: 'URL appears safe' };

        } catch (error) {
            return { safe: false, threat: 'error', details: 'Unable to scan URL - invalid format' };
        }
    }

    // Rate Limiting
    checkRateLimit() {
        const now = Date.now();
        const hourAgo = now - (60 * 60 * 1000);
        
        // Clean old entries
        this.rateLimit.requests = this.rateLimit.requests.filter(time => time > hourAgo);
        
        if (this.rateLimit.requests.length >= this.rateLimit.maxRequests) {
            this.securityStats.rateLimited++;
            return false;
        }
        
        return true;
    }

    recordRequest() {
        this.rateLimit.requests.push(Date.now());
        this.saveRateLimit();
        this.updateRateLimitDisplay();
    }

    updateRateLimitDisplay() {
        const remaining = this.rateLimit.maxRequests - this.rateLimit.requests.length;
        const rateLimitDisplay = document.getElementById('rateLimitDisplay');
        if (rateLimitDisplay) {
            rateLimitDisplay.textContent = `${remaining}/${this.rateLimit.maxRequests}`;
        }
        
        const progress = ((this.rateLimit.maxRequests - remaining) / this.rateLimit.maxRequests) * 100;
        const progressBar = document.getElementById('rateLimitProgress');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Form submission
        const urlForm = document.getElementById('urlForm');
        if (urlForm) {
            urlForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.shortenUrl();
            });
        }

        // Advanced options toggle
        const toggleAdvanced = document.getElementById('toggleAdvanced');
        if (toggleAdvanced) {
            toggleAdvanced.addEventListener('click', () => {
                this.toggleAdvancedOptions();
            });
        }

        // Password protection toggle
        const enablePassword = document.getElementById('enablePassword');
        if (enablePassword) {
            enablePassword.addEventListener('change', (e) => {
                const passwordSection = document.getElementById('passwordSection');
                if (passwordSection) {
                    passwordSection.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }

        // A/B testing toggle
        const enableABTest = document.getElementById('enableABTest');
        if (enableABTest) {
            enableABTest.addEventListener('change', (e) => {
                const abTestSection = document.getElementById('abTestSection');
                if (abTestSection) {
                    abTestSection.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }

        // Traffic split slider
        const trafficSplit = document.getElementById('trafficSplit');
        if (trafficSplit) {
            trafficSplit.addEventListener('input', (e) => {
                const trafficSplitValue = document.getElementById('trafficSplitValue');
                if (trafficSplitValue) {
                    trafficSplitValue.textContent = `${e.target.value}%`;
                }
            });
        }

        // URL security scanning
        const originalUrl = document.getElementById('originalUrl');
        if (originalUrl) {
            originalUrl.addEventListener('blur', () => {
                this.checkUrlSecurity();
            });
        }

        // Copy button
        const copyBtn = document.getElementById('copyBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                this.copyToClipboard();
            });
        }

        // Result actions
        const viewAnalyticsBtn = document.getElementById('viewAnalyticsBtn');
        if (viewAnalyticsBtn) {
            viewAnalyticsBtn.addEventListener('click', () => {
                this.viewCurrentAnalytics();
            });
        }

        const newUrlBtn = document.getElementById('newUrlBtn');
        if (newUrlBtn) {
            newUrlBtn.addEventListener('click', () => {
                this.resetForm();
            });
        }

        // Add more event listeners as needed...
        this.setupAdditionalEventListeners();
    }

    setupAdditionalEventListeners() {
        // Analytics search
        const searchAnalyticsBtn = document.getElementById('searchAnalyticsBtn');
        if (searchAnalyticsBtn) {
            searchAnalyticsBtn.addEventListener('click', () => {
                this.searchAnalytics();
            });
        }

        // History management
        const clearHistoryBtn = document.getElementById('clearHistoryBtn');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                this.clearHistory();
            });
        }

        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }

        const importFile = document.getElementById('importFile');
        if (importFile) {
            importFile.addEventListener('change', (e) => {
                this.importData(e.target);
            });
        }

        const sortBy = document.getElementById('sortBy');
        if (sortBy) {
            sortBy.addEventListener('change', () => {
                this.renderHistory();
            });
        }

        const filterBy = document.getElementById('filterBy');
        if (filterBy) {
            filterBy.addEventListener('change', () => {
                this.renderHistory();
            });
        }

        // Storage management buttons
        const clearCacheBtn = document.getElementById('clearCacheBtn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', async () => {
                await this.storageManager.clearCache();
                this.showToast('Cache cleared successfully', 'success');
                this.updateStorageInfo();
            });
        }

        const optimizeStorageBtn = document.getElementById('optimizeStorageBtn');
        if (optimizeStorageBtn) {
            optimizeStorageBtn.addEventListener('click', async () => {
                const result = await this.storageManager.optimizeStorage();
                if (result) {
                    this.showToast('Storage optimized successfully', 'success');
                    this.updateStorageInfo();
                }
            });
        }

        const backupNowBtn = document.getElementById('backupNowBtn');
        if (backupNowBtn) {
            backupNowBtn.addEventListener('click', () => {
                this.exportData();
            });
        }
    }

    setupTabNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeTab = document.getElementById(`${tabName}-tab`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Refresh content based on tab
        if (tabName === 'history') {
            this.renderHistory();
        } else if (tabName === 'security') {
            this.updateSecurityStats();
        } else if (tabName === 'settings') {
            this.updateStorageInfo();
        }
    }

    // URL Shortening with Security
    async shortenUrl() {
        const originalUrlEl = document.getElementById('originalUrl');
        const customAliasEl = document.getElementById('customAlias');
        const expiryDateEl = document.getElementById('expiryDate');
        const trackClicksEl = document.getElementById('trackClicks');
        const enablePasswordEl = document.getElementById('enablePassword');
        const urlPasswordEl = document.getElementById('urlPassword');
        const enableABTestEl = document.getElementById('enableABTest');
        const alternativeUrlEl = document.getElementById('alternativeUrl');
        const trafficSplitEl = document.getElementById('trafficSplit');

        if (!originalUrlEl) return;

        const originalUrl = originalUrlEl.value.trim();
        const customAlias = customAliasEl ? customAliasEl.value.trim() : '';
        const expiryDate = expiryDateEl ? expiryDateEl.value : '';
        const trackClicks = trackClicksEl ? trackClicksEl.checked : true;
        const enablePassword = enablePasswordEl ? enablePasswordEl.checked : false;
        const urlPassword = urlPasswordEl ? urlPasswordEl.value : '';
        const enableABTest = enableABTestEl ? enableABTestEl.checked : false;
        const alternativeUrl = alternativeUrlEl ? alternativeUrlEl.value.trim() : '';
        const trafficSplit = trafficSplitEl ? trafficSplitEl.value : '50';

        // Security checks
        if (!this.checkRateLimit()) {
            this.showToast('Rate limit exceeded. Please try again later.', 'error');
            return;
        }

        if (!this.isValidUrl(originalUrl)) {
            this.showToast('Please enter a valid URL', 'error');
            return;
        }

        if (enableABTest && !this.isValidUrl(alternativeUrl)) {
            this.showToast('Please enter a valid alternative URL for A/B testing', 'error');
            return;
        }

        if (enablePassword && !urlPassword) {
            this.showToast('Please enter a password for protection', 'error');
            return;
        }

        // Check if custom alias is already used
        if (customAlias && this.isAliasUsed(customAlias)) {
            this.showToast('This alias is already in use', 'error');
            return;
        }

        const shortenBtn = document.getElementById('shortenBtn');
        this.setLoadingState(shortenBtn, true);

        try {
            // Malware scanning
            const scanResult = await this.scanForMalware(originalUrl);
            if (!scanResult.safe) {
                this.securityStats.blocked++;
                this.saveSecurityStats();
                this.showToast(`Security threat detected: ${scanResult.details}`, 'error');
                return;
            }

            // Scan alternative URL if A/B testing
            if (enableABTest) {
                const altScanResult = await this.scanForMalware(alternativeUrl);
                if (!altScanResult.safe) {
                    this.securityStats.blocked++;
                    this.saveSecurityStats();
                    this.showToast(`Alternative URL security threat: ${altScanResult.details}`, 'error');
                    return;
                }
            }

            // Record request for rate limiting
            this.recordRequest();

            const shortCode = customAlias || this.generateShortCode();
            const shortUrl = this.baseUrl + shortCode;

            const urlData = {
                id: Date.now(),
                originalUrl,
                shortUrl,
                shortCode,
                customAlias: customAlias || null,
                createdAt: new Date().toISOString(),
                expiryDate: expiryDate || null,
                trackClicks,
                clicks: 0,
                uniqueClicks: 0,
                clickHistory: [],
                isActive: true,
                password: enablePassword ? this.hashPassword(urlPassword) : null,
                isProtected: enablePassword,
                abTest: enableABTest ? {
                    alternativeUrl,
                    trafficSplit: parseInt(trafficSplit),
                    aClicks: 0,
                    bClicks: 0,
                    aConversions: 0,
                    bConversions: 0
                } : null,
                securityScan: scanResult,
                conversions: 0,
                conversionGoals: []
            };

            // Save to storage
            this.urls.push(urlData);
            await this.saveUrls();

            // Show result
            this.showResult(urlData);
            this.currentShortUrl = urlData;

            this.showToast('URL shortened successfully!', 'success');

        } catch (error) {
            console.error('Error shortening URL:', error);
            this.showToast('Error shortening URL. Please try again.', 'error');
        } finally {
            this.setLoadingState(shortenBtn, false);
        }
    }

    async checkUrlSecurity() {
        const originalUrlEl = document.getElementById('originalUrl');
        const securityStatus = document.getElementById('securityStatus');
        
        if (!originalUrlEl || !securityStatus) return;

        const url = originalUrlEl.value.trim();
        if (!url || !this.isValidUrl(url)) return;

        securityStatus.textContent = 'Scanning...';
        securityStatus.className = 'security-status checking';

        const result = await this.scanForMalware(url);
        
        if (result.safe) {
            securityStatus.textContent = 'Safe';
            securityStatus.className = 'security-status safe';
        } else {
            securityStatus.textContent = result.threat === 'malware' ? 'Malware' : 'Suspicious';
            securityStatus.className = 'security-status danger';
        }
    }

    showResult(urlData) {
        const displayOriginalUrl = document.getElementById('displayOriginalUrl');
        const displayShortUrl = document.getElementById('displayShortUrl');
        
        if (displayOriginalUrl) displayOriginalUrl.textContent = urlData.originalUrl;
        if (displayShortUrl) displayShortUrl.textContent = urlData.shortUrl;
        
        // Show security badges
        const securityInfo = document.getElementById('urlSecurityInfo');
        if (securityInfo) {
            const badges = securityInfo.querySelector('.security-badges');
            if (badges) {
                badges.innerHTML = '';

                if (urlData.isProtected) {
                    badges.innerHTML += '<span class="security-badge protected">Password Protected</span>';
                }
                
                if (urlData.abTest) {
                    badges.innerHTML += '<span class="security-badge ab-test">A/B Testing</span>';
                }
                
                badges.innerHTML += '<span class="security-badge malware-safe">Malware Scanned</span>';
            }
        }

        const resultContainer = document.getElementById('resultContainer');
        if (resultContainer) {
            resultContainer.classList.add('show');
            
            // Scroll to result
            resultContainer.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Password Protection
    hashPassword(password) {
        // Simple hash for demo - use proper hashing in production
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    verifyPassword() {
        const inputPassword = document.getElementById('modalPassword');
        if (!inputPassword) return;

        const password = inputPassword.value;
        const urlData = this.pendingPasswordUrl;
        
        if (urlData && this.hashPassword(password) === urlData.password) {
            this.hideModal('passwordModal');
            this.redirectToUrl(urlData);
        } else {
            this.showToast('Incorrect password', 'error');
        }
    }

    // A/B Testing Logic
    handleABTestRedirect(urlData) {
        const random = Math.random() * 100;
        const useOriginal = random < urlData.abTest.trafficSplit;
        
        if (useOriginal) {
            urlData.abTest.aClicks++;
            return urlData.originalUrl;
        } else {
            urlData.abTest.bClicks++;
            return urlData.abTest.alternativeUrl;
        }
    }

    // Analytics with Charts
    async searchAnalytics() {
        const analyticsSearch = document.getElementById('analyticsSearch');
        if (!analyticsSearch) return;

        const searchQuery = analyticsSearch.value.trim();
        
        if (!searchQuery) {
            this.showToast('Please enter a URL or alias to search', 'warning');
            return;
        }

        const urlData = this.findUrlByQuery(searchQuery);
        
        if (!urlData) {
            this.showToast('URL not found in your history', 'error');
            this.showAnalyticsPlaceholder();
            return;
        }

        this.displayAnalytics(urlData);
    }

    displayAnalytics(urlData) {
        const container = document.getElementById('analyticsContent');
        if (!container) return;
        
        // Generate analytics data
        const totalClicks = urlData.clicks;
        const uniqueClicks = urlData.uniqueClicks || Math.floor(totalClicks * 0.7);
        const conversionRate = urlData.conversions > 0 ? ((urlData.conversions / totalClicks) * 100).toFixed(2) : '0.00';
        const todayClicks = this.getClicksForPeriod(urlData, 1);
        const thisWeekClicks = this.getClicksForPeriod(urlData, 7);

        container.innerHTML = `
            <div class="analytics-dashboard">
                <div class="analytics-stats">
                    <div class="stat-card">
                        <i class="fas fa-mouse-pointer"></i>
                        <div class="stat-number">${totalClicks}</div>
                        <div class="stat-label">Total Clicks</div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-users"></i>
                        <div class="stat-number">${uniqueClicks}</div>
                        <div class="stat-label">Unique Clicks</div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-percentage"></i>
                        <div class="stat-number">${conversionRate}%</div>
                        <div class="stat-label">Conversion Rate</div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-calendar-day"></i>
                        <div class="stat-number">${todayClicks}</div>
                        <div class="stat-label">Today</div>
                    </div>
                </div>
                
                <div class="analytics-charts">
                    <div class="chart-container">
                        <div class="chart-title">Clicks Over Time</div>
                        <canvas id="clicksChart" class="chart-canvas"></canvas>
                    </div>
                    <div class="chart-container">
                        <div class="chart-title">Device Distribution</div>
                        <canvas id="deviceChart" class="chart-canvas"></canvas>
                    </div>
                </div>

                <div class="analytics-details">
                    <div class="analytics-url-info">
                        <h3>URL Information</h3>
                        <div class="url-info-item">
                            <span class="url-info-label">Short URL:</span>
                            <span class="url-info-value">${urlData.shortUrl}</span>
                        </div>
                        <div class="url-info-item">
                            <span class="url-info-label">Original URL:</span>
                            <span class="url-info-value">${urlData.originalUrl}</span>
                        </div>
                        <div class="url-info-item">
                            <span class="url-info-label">Created:</span>
                            <span class="url-info-value">${this.formatDate(urlData.createdAt)}</span>
                        </div>
                        <div class="url-info-item">
                            <span class="url-info-label">Status:</span>
                            <span class="url-info-value">
                                <span class="status-indicator ${this.getUrlStatus(urlData)}">
                                    ${this.getUrlStatusText(urlData)}
                                </span>
                            </span>
                        </div>
                    </div>
                    
                    ${this.generateClickHeatmap(urlData)}
                    ${this.generateConversionTracking(urlData)}
                    ${urlData.abTest ? this.generateABTestResults(urlData) : ''}
                </div>
            </div>
        `;

        // Render charts after DOM is updated
        setTimeout(() => {
            this.renderClicksChart(urlData);
            this.renderDeviceChart(urlData);
        }, 100);
    }

    generateClickHeatmap(urlData) {
        const heatmapData = this.generateHeatmapData(urlData);
        
        return `
            <div class="click-heatmap">
                <h3>Click Heatmap (24 Hours)</h3>
                <div class="heatmap-container">
                    ${heatmapData.map((value, index) => 
                        `<div class="heatmap-cell" style="background-color: ${this.getHeatmapColor(value)}" 
                              title="${index}:00 - ${value} clicks"></div>`
                    ).join('')}
                </div>
                <div class="heatmap-legend">
                    <span>12 AM</span>
                    <span>6 AM</span>
                    <span>12 PM</span>
                    <span>6 PM</span>
                    <span>11 PM</span>
                </div>
            </div>
        `;
    }

    generateHeatmapData(urlData) {
        const data = new Array(24).fill(0);
        if (urlData.clickHistory) {
            urlData.clickHistory.forEach(click => {
                const hour = new Date(click.timestamp).getHours();
                data[hour]++;
            });
        }
        return data;
    }

    getHeatmapColor(value) {
        if (value === 0) return '#ebedf0';
        if (value <= 2) return '#c6e48b';
        if (value <= 5) return '#7bc96f';
        if (value <= 10) return '#239a3b';
        return '#196127';
    }

    generateConversionTracking(urlData) {
        return `
            <div class="conversion-tracking">
                <h3>Conversion Tracking</h3>
                <p>Track how many clicks result in desired actions</p>
                <div class="conversion-rate">${urlData.conversions || 0} conversions</div>
                <small>Set up conversion goals to track user actions after clicking your link</small>
            </div>
        `;
    }

    generateABTestResults(urlData) {
        const { abTest } = urlData;
        const aConversionRate = abTest.aClicks > 0 ? (abTest.aConversions / abTest.aClicks * 100).toFixed(2) : '0.00';
        const bConversionRate = abTest.bClicks > 0 ? (abTest.bConversions / abTest.bClicks * 100).toFixed(2) : '0.00';
        
        return `
            <div class="ab-test-results">
                <h3>A/B Test Results</h3>
                <p>Comparing performance between original and alternative URLs</p>
                <div class="ab-test-comparison">
                    <div class="ab-variant">
                        <div class="variant-label">Original URL (A)</div>
                        <div class="variant-stats">${abTest.aClicks} clicks</div>
                        <div class="variant-stats">${aConversionRate}% conversion</div>
                    </div>
                    <div class="ab-variant">
                        <div class="variant-label">Alternative URL (B)</div>
                        <div class="variant-stats">${abTest.bClicks} clicks</div>
                        <div class="variant-stats">${bConversionRate}% conversion</div>
                    </div>
                </div>
                <small>Traffic split: ${abTest.trafficSplit}% to original, ${100 - abTest.trafficSplit}% to alternative</small>
            </div>
        `;
    }

    // Chart.js Integration
    renderClicksChart(urlData) {
        const ctx = document.getElementById('clicksChart');
        if (!ctx || !window.Chart) return;

        const chartData = this.generateTimeSeriesData(urlData);
        
        if (this.charts.clicks) {
            this.charts.clicks.destroy();
        }

        this.charts.clicks = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Clicks',
                    data: chartData.data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Clicks'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    renderDeviceChart(urlData) {
        const ctx = document.getElementById('deviceChart');
        if (!ctx || !window.Chart) return;

        const deviceData = this.getDeviceStats(urlData);
        
        if (this.charts.device) {
            this.charts.device.destroy();
        }

        this.charts.device = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(deviceData),
                datasets: [{
                    data: Object.values(deviceData),
                    backgroundColor: [
                        '#667eea',
                        '#764ba2',
                        '#f093fb',
                        '#f5576c',
                        '#4facfe'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    generateTimeSeriesData(urlData) {
        const days = 7;
        const labels = [];
        const data = [];
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now - i * 24 * 60 * 60 * 1000);
            labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            
            const dayClicks = (urlData.clickHistory || []).filter(click => {
                const clickDate = new Date(click.timestamp);
                return clickDate.toDateString() === date.toDateString();
            }).length;
            
            data.push(dayClicks);
        }

        return { labels, data };
    }

    getDeviceStats(urlData) {
        const stats = { Desktop: 0, Mobile: 0, Tablet: 0, Unknown: 0 };
        
        if (urlData.clickHistory) {
            urlData.clickHistory.forEach(click => {
                const userAgent = click.userAgent || '';
                if (/Mobile|Android|iPhone/i.test(userAgent)) {
                    stats.Mobile++;
                } else if (/Tablet|iPad/i.test(userAgent)) {
                    stats.Tablet++;
                } else if (/Desktop|Windows|Mac|Linux/i.test(userAgent)) {
                    stats.Desktop++;
                } else {
                    stats.Unknown++;
                }
            });
        }

        return stats;
    }

    getClicksForPeriod(urlData, days) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return (urlData.clickHistory || []).filter(click => new Date(click.timestamp) > cutoff).length;
    }

    // Utility Functions
    isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }

    generateShortCode() {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // Ensure uniqueness
        if (this.urls.some(url => url.shortCode === result)) {
            return this.generateShortCode();
        }
        
        return result;
    }

    isAliasUsed(alias) {
        return this.urls.some(url => url.shortCode === alias);
    }

    findUrlByQuery(query) {
        return this.urls.find(url => 
            url.shortUrl.includes(query) || 
            url.shortCode === query ||
            url.originalUrl.includes(query)
        );
    }

    getUrlStatus(urlData) {
        if (!urlData.expiryDate) {
            if (urlData.isProtected) return 'status-protected';
            if (urlData.abTest) return 'status-ab-test';
            return 'status-active';
        }
        
        const now = new Date();
        const expiry = new Date(urlData.expiryDate);
        
        return now > expiry ? 'status-expired' : 'status-active';
    }

    getUrlStatusText(urlData) {
        const status = this.getUrlStatus(urlData);
        switch (status) {
            case 'status-active': return 'Active';
            case 'status-expired': return 'Expired';
            case 'status-protected': return 'Protected';
            case 'status-ab-test': return 'A/B Testing';
            default: return 'Unknown';
        }
    }

    validateCustomAlias(alias) {
        const input = document.getElementById('customAlias');
        if (!input) return;
        
        if (!alias) {
            input.style.borderColor = '#e0e0e0';
            return;
        }

        if (alias.length < 3) {
            input.style.borderColor = '#ffc107';
            return;
        }

        if (this.isAliasUsed(alias)) {
            input.style.borderColor = '#dc3545';
            return;
        }

        input.style.borderColor = '#28a745';
    }

    resetForm() {
        const urlForm = document.getElementById('urlForm');
        const resultContainer = document.getElementById('resultContainer');
        const passwordSection = document.getElementById('passwordSection');
        const abTestSection = document.getElementById('abTestSection');
        const securityStatus = document.getElementById('securityStatus');

        if (urlForm) urlForm.reset();
        if (resultContainer) resultContainer.classList.remove('show');
        if (passwordSection) passwordSection.style.display = 'none';
        if (abTestSection) abTestSection.style.display = 'none';
        if (securityStatus) {
            securityStatus.textContent = 'Ready';
            securityStatus.className = 'security-status';
        }

        this.currentShortUrl = null;
        
        // Collapse advanced options
        const advancedOptions = document.getElementById('advancedOptions');
        const toggleBtn = document.getElementById('toggleAdvanced');
        if (advancedOptions) advancedOptions.classList.remove('expanded');
        if (toggleBtn) toggleBtn.classList.remove('expanded');
    }

    toggleAdvancedOptions() {
        const advancedOptions = document.getElementById('advancedOptions');
        const toggleBtn = document.getElementById('toggleAdvanced');
        
        if (advancedOptions && toggleBtn) {
            advancedOptions.classList.toggle('expanded');
            toggleBtn.classList.toggle('expanded');
        }
    }

    viewCurrentAnalytics() {
        if (!this.currentShortUrl) return;
        
        this.switchTab('analytics');
        const analyticsSearch = document.getElementById('analyticsSearch');
        if (analyticsSearch) {
            analyticsSearch.value = this.currentShortUrl.shortCode;
        }
        this.displayAnalytics(this.currentShortUrl);
    }

    // Copy to Clipboard
    async copyToClipboard() {
        if (!this.currentShortUrl) return;

        try {
            await navigator.clipboard.writeText(this.currentShortUrl.shortUrl);
            this.showToast('URL copied to clipboard!', 'success');
            
            // Visual feedback
            const copyBtn = document.getElementById('copyBtn');
            if (copyBtn) {
                const originalHTML = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    copyBtn.innerHTML = originalHTML;
                }, 1500);
            }
            
        } catch (err) {
            // Fallback for older browsers
            this.fallbackCopyTextToClipboard(this.currentShortUrl.shortUrl);
        }
    }

    fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            this.showToast('URL copied to clipboard!', 'success');
        } catch (err) {
            this.showToast('Failed to copy URL', 'error');
        }

        document.body.removeChild(textArea);
    }

    // History Management
    renderHistory() {
        const container = document.getElementById('historyList');
        if (!container) return;

        const sortBy = document.getElementById('sortBy');
        const filterBy = document.getElementById('filterBy');
        
        const sortValue = sortBy ? sortBy.value : 'date';
        const filterValue = filterBy ? filterBy.value : 'all';
        
        let filteredUrls = [...this.urls];
        
        // Apply filters
        switch (filterValue) {
            case 'active':
                filteredUrls = filteredUrls.filter(url => this.getUrlStatus(url) === 'status-active');
                break;
            case 'expired':
                filteredUrls = filteredUrls.filter(url => this.getUrlStatus(url) === 'status-expired');
                break;
            case 'protected':
                filteredUrls = filteredUrls.filter(url => url.isProtected);
                break;
            case 'ab-test':
                filteredUrls = filteredUrls.filter(url => url.abTest);
                break;
        }
        
        // Apply sorting
        filteredUrls.sort((a, b) => {
            switch (sortValue) {
                case 'date':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'clicks':
                    return b.clicks - a.clicks;
                case 'alphabetical':
                    return a.originalUrl.localeCompare(b.originalUrl);
                case 'conversion':
                    return (b.conversions || 0) - (a.conversions || 0);
                default:
                    return 0;
            }
        });
        
        if (filteredUrls.length === 0) {
            container.innerHTML = `
                <div class="history-placeholder">
                    <i class="fas fa-history"></i>
                    <h3>No URLs found</h3>
                    <p>No URLs match your current filter criteria</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filteredUrls.map(url => this.createHistoryItem(url)).join('');
        
        // Add event listeners to history items
        this.attachHistoryEventListeners();
    }

    createHistoryItem(urlData) {
        const status = this.getUrlStatus(urlData);
        const statusText = this.getUrlStatusText(urlData);
        const conversionRate = urlData.clicks > 0 ? ((urlData.conversions || 0) / urlData.clicks * 100).toFixed(1) : '0.0';
        
        let statusClass = '';
        if (status === 'status-expired') statusClass = 'expired';
        else if (urlData.isProtected) statusClass = 'protected';
        else if (urlData.abTest) statusClass = 'ab-test';
        
        return `
            <div class="history-item ${statusClass}" data-id="${urlData.id}">
                <div class="history-item-header">
                    <div class="history-item-info">
                        <div class="history-original-url">${this.truncateUrl(urlData.originalUrl, 60)}</div>
                        <div class="history-short-url">${urlData.shortUrl}</div>
                        <div class="history-meta">
                            <span><i class="fas fa-calendar"></i> ${this.formatDate(urlData.createdAt)}</span>
                            <span><i class="fas fa-mouse-pointer"></i> ${urlData.clicks} clicks</span>
                            <span><i class="fas fa-users"></i> ${urlData.uniqueClicks || Math.floor(urlData.clicks * 0.7)} unique</span>
                            <span class="status-indicator ${status}">${statusText}</span>
                            ${urlData.customAlias ? `<span><i class="fas fa-tag"></i> Custom alias</span>` : ''}
                            ${urlData.isProtected ? `<span><i class="fas fa-lock"></i> Protected</span>` : ''}
                            ${urlData.abTest ? `<span><i class="fas fa-route"></i> A/B Testing</span>` : ''}
                        </div>
                        <div class="history-performance">
                            <div class="performance-metrics">
                                <div class="performance-metric">
                                    <i class="fas fa-percentage"></i>
                                    <span>${conversionRate}% conversion</span>
                                </div>
                                ${urlData.abTest ? `
                                    <div class="performance-metric">
                                        <i class="fas fa-balance-scale"></i>
                                        <span>A: ${urlData.abTest.aClicks} | B: ${urlData.abTest.bClicks}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="history-actions">
                        <button class="history-action-btn analytics" data-action="analytics" data-id="${urlData.id}">
                            <i class="fas fa-chart-line"></i> Analytics
                        </button>
                        <button class="history-action-btn delete" data-action="delete" data-id="${urlData.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    attachHistoryEventListeners() {
        document.querySelectorAll('.history-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const id = btn.dataset.id;

                switch (action) {
                    case 'analytics':
                        this.viewHistoryAnalytics(id);
                        break;
                    case 'delete':
                        this.deleteHistoryItem(id);
                        break;
                }
            });
        });
    }

    viewHistoryAnalytics(id) {
        const urlData = this.urls.find(url => url.id == id);
        if (urlData) {
            this.switchTab('analytics');
            const analyticsSearch = document.getElementById('analyticsSearch');
            if (analyticsSearch) {
                analyticsSearch.value = urlData.shortCode;
            }
            this.displayAnalytics(urlData);
        }
    }

    async deleteHistoryItem(id) {
        if (confirm('Are you sure you want to delete this URL?')) {
            this.urls = this.urls.filter(url => url.id != id);
            await this.saveUrls();
            this.renderHistory();
            this.showToast('URL deleted successfully', 'success');
        }
    }

    async clearHistory() {
        if (confirm('Are you sure you want to clear all URL history? This action cannot be undone.')) {
            this.urls = [];
            await this.saveUrls();
            this.renderHistory();
            this.showToast('History cleared successfully', 'success');
        }
    }

    async deleteExpiredUrls() {
        const expiredCount = this.urls.filter(url => this.getUrlStatus(url) === 'status-expired').length;
        if (expiredCount === 0) {
            this.showToast('No expired URLs to delete', 'info');
            return;
        }

        if (confirm(`Delete ${expiredCount} expired URLs?`)) {
            this.urls = this.urls.filter(url => this.getUrlStatus(url) !== 'status-expired');
            await this.saveUrls();
            this.renderHistory();
            this.showToast(`Deleted ${expiredCount} expired URLs`, 'success');
        }
    }

    showBulkAnalytics() {
        this.switchTab('analytics');
        
        // Show combined analytics for all URLs
        const totalClicks = this.urls.reduce((sum, url) => sum + url.clicks, 0);
        const totalConversions = this.urls.reduce((sum, url) => sum + (url.conversions || 0), 0);
        const avgConversionRate = totalClicks > 0 ? (totalConversions / totalClicks * 100).toFixed(2) : '0.00';

        const container = document.getElementById('analyticsContent');
        if (!container) return;

        container.innerHTML = `
            <div class="analytics-dashboard">
                <h3>Bulk Analytics Overview</h3>
                <div class="analytics-stats">
                    <div class="stat-card">
                        <i class="fas fa-link"></i>
                        <div class="stat-number">${this.urls.length}</div>
                        <div class="stat-label">Total URLs</div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-mouse-pointer"></i>
                        <div class="stat-number">${totalClicks}</div>
                        <div class="stat-label">Total Clicks</div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-chart-line"></i>
                        <div class="stat-number">${totalConversions}</div>
                        <div class="stat-label">Total Conversions</div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-percentage"></i>
                        <div class="stat-number">${avgConversionRate}%</div>
                        <div class="stat-label">Avg Conversion Rate</div>
                    </div>
                </div>
                
                <div class="bulk-analytics-details">
                    <h4>Top Performing URLs</h4>
                    ${this.generateTopPerformingUrls()}
                </div>
            </div>
        `;
    }

    generateTopPerformingUrls() {
        const topUrls = [...this.urls]
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 5);

        if (topUrls.length === 0) {
            return '<p>No URLs available</p>';
        }

        return topUrls.map(url => `
            <div class="top-url-item">
                <div class="url-info">
                    <strong>${this.truncateUrl(url.originalUrl, 50)}</strong>
                    <small>${url.shortUrl}</small>
                </div>
                <div class="url-stats">
                    <span>${url.clicks} clicks</span>
                    <span>${((url.conversions || 0) / Math.max(url.clicks, 1) * 100).toFixed(1)}% conversion</span>
                </div>
            </div>
        `).join('');
    }

    // URL Redirection Simulation
    handleRedirect(shortCode) {
        const urlData = this.urls.find(url => url.shortCode === shortCode);
        
        if (!urlData) {
            this.showToast('URL not found', 'error');
            return false;
        }

        // Check if expired
        if (this.getUrlStatus(urlData) === 'status-expired') {
            this.showToast('This URL has expired', 'error');
            return false;
        }

        // Check password protection
        if (urlData.isProtected) {
            this.pendingPasswordUrl = urlData;
            this.showModal('passwordModal');
            return false;
        }

        this.redirectToUrl(urlData);
        return true;
    }

    async redirectToUrl(urlData) {
        // Increment click count and track analytics
        if (urlData.trackClicks) {
            urlData.clicks++;
            
            // Track unique clicks (simplified)
            const userAgent = navigator.userAgent;
            const isUniqueClick = !urlData.clickHistory.some(click => 
                click.userAgent === userAgent && 
                Date.now() - new Date(click.timestamp).getTime() < 24 * 60 * 60 * 1000
            );
            
            if (isUniqueClick) {
                urlData.uniqueClicks = (urlData.uniqueClicks || 0) + 1;
            }

            urlData.clickHistory.push({
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                referrer: document.referrer,
                ip: '127.0.0.1', // Simulated
                country: 'Unknown',
                city: 'Unknown'
            });
            
            await this.saveUrls();
        }

        // Handle A/B testing
        let redirectUrl = urlData.originalUrl;
        if (urlData.abTest) {
            redirectUrl = this.handleABTestRedirect(urlData);
            await this.saveUrls();
        }

        // In a real implementation, this would redirect
        this.showToast(`Would redirect to: ${this.truncateUrl(redirectUrl, 50)}`, 'info');
        
        // Simulate conversion tracking
        setTimeout(async () => {
            if (Math.random() < 0.1) { // 10% conversion rate simulation
                urlData.conversions = (urlData.conversions || 0) + 1;
                if (urlData.abTest) {
                    const random = Math.random() * 100;
                    if (random < urlData.abTest.trafficSplit) {
                        urlData.abTest.aConversions++;
                    } else {
                        urlData.abTest.bConversions++;
                    }
                }
                await this.saveUrls();
            }
        }, 2000);
    }

    // Security Statistics
    updateSecurityStats() {
        const malwareScannedEl = document.getElementById('malwareScanned');
        const threatsBlockedEl = document.getElementById('threatsBlocked');
        const protectedUrlsEl = document.getElementById('protectedUrls');
        const rateLimitedEl = document.getElementById('rateLimited');
        const currentRateLimitEl = document.getElementById('currentRateLimit');

        if (malwareScannedEl) malwareScannedEl.textContent = this.securityStats.scanned || 0;
        if (threatsBlockedEl) threatsBlockedEl.textContent = this.securityStats.blocked || 0;
        if (protectedUrlsEl) protectedUrlsEl.textContent = this.urls.filter(url => url.isProtected).length;
        if (rateLimitedEl) rateLimitedEl.textContent = this.securityStats.rateLimited || 0;
        if (currentRateLimitEl) currentRateLimitEl.textContent = this.rateLimit.maxRequests;

        // Update scan results
        const scanResults = document.getElementById('scanResults');
        if (scanResults) {
            const recentScans = this.urls
                .filter(url => url.securityScan)
                .slice(-5)
                .reverse();

            if (recentScans.length === 0) {
                scanResults.innerHTML = '<p>No recent security scans</p>';
            } else {
                scanResults.innerHTML = recentScans.map(url => `
                    <div class="scan-result-item ${url.securityScan.safe ? 'safe' : 'threat'}">
                        <span>${this.truncateUrl(url.originalUrl, 40)}</span>
                        <span>${url.securityScan.safe ? 'Safe' : 'Threat Detected'}</span>
                    </div>
                `).join('');
            }
        }
    }

    showAnalyticsPlaceholder() {
        const container = document.getElementById('analyticsContent');
        if (container) {
            container.innerHTML = `
                <div class="analytics-placeholder">
                    <i class="fas fa-chart-bar"></i>
                    <h3>URL not found</h3>
                    <p>The URL you searched for was not found in your history</p>
                </div>
            `;
        }
    }

    // Import/Export Functions
    async exportData() {
        try {
            const data = await this.storageManager.exportAllData();
            if (!data) {
                this.showToast('Failed to export data', 'error');
                return;
            }

            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `secure-url-shortener-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            this.showToast('Data exported successfully', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            this.showToast('Export failed', 'error');
        }
    }

    async importData(fileInput) {
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                const result = await this.storageManager.importAllData(data);
                if (result) {
                    // Reload URLs from storage
                    this.urls = await this.loadUrls();
                    
                    this.renderHistory();
                    this.updateSecurityStats();
                    
                    this.showToast(`Import completed: ${result.urls} URLs, ${result.settings} settings`, 'success');
                } else {
                    throw new Error('Import failed');
                }
            } catch (error) {
                console.error('Import failed:', error);
                this.showToast('Error importing data. Invalid file format.', 'error');
            }
        };
        
        reader.readAsText(file);
    }

    // Utility Functions
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return 'Today';
        } else if (diffDays === 2) {
            return 'Yesterday';
        } else if (diffDays <= 7) {
            return `${diffDays - 1} days ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    }

    truncateUrl(url, maxLength) {
        if (url.length <= maxLength) return url;
        return url.substring(0, maxLength - 3) + '...';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    setLoadingState(element, isLoading) {
        if (!element) return;
        
        if (isLoading) {
            element.classList.add('loading');
            element.disabled = true;
        } else {
            element.classList.remove('loading');
            element.disabled = false;
        }
    }

    // Modal Management
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    // Toast Notifications
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <i class="toast-icon ${iconMap[type]}"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        const toastContainer = document.getElementById('toastContainer');
        if (toastContainer) {
            toastContainer.appendChild(toast);
        }

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);

        // Add click to close
        toast.addEventListener('click', (e) => {
            if (e.target.classList.contains('toast-close') || e.target.parentElement.classList.contains('toast-close')) {
                toast.remove();
            }
        });
    }

    // Keyboard Shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for quick URL shortening
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const originalUrl = document.getElementById('originalUrl');
                if (originalUrl) originalUrl.focus();
            }

            // Ctrl/Cmd + H for history
            if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
                e.preventDefault();
                this.switchTab('history');
            }

            // Ctrl/Cmd + A for analytics
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                this.switchTab('analytics');
            }

            // Ctrl/Cmd + S for security
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.switchTab('security');
            }

            // Escape key to close modals
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.show').forEach(modal => {
                    this.hideModal(modal.id);
                });
            }
        });
    }

    // Performance Monitoring
    trackPerformance(operation, startTime) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.log(`${operation} took ${duration.toFixed(2)} milliseconds`);
        
        if (duration > 1000) {
            console.warn(`Slow operation detected: ${operation}`);
        }
    }

    // Cleanup on page unload
    cleanup() {
        // Destroy charts
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};

        // Cleanup storage manager
        if (this.storageManager) {
            this.storageManager.destroy();
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Show loading indicator
    console.log('Initializing Secure URL Shortener...');
    
    const urlShortener = new SecureURLShortener();
    
    try {
        // Wait for initialization to complete
        await urlShortener.init();
        
        // Make instance available globally for debugging
        window.urlShortener = urlShortener;
        
        // Setup keyboard shortcuts
        urlShortener.setupKeyboardShortcuts();
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            urlShortener.cleanup();
        });
        
        console.log('Secure URL Shortener application initialized successfully');
        console.log(`Malware database loaded with ${urlShortener.malwareDatabase.size} entries`);
        
        // Test malware scanning on a sample URL after initialization
        setTimeout(async () => {
            try {
                const testResult = await urlShortener.scanForMalware('https://example.com');
                console.log('Sample security scan result:', testResult);
            } catch (error) {
                console.error('Sample scan failed:', error);
            }
        }, 1000);
        
    } catch (error) {
        console.error('Application initialization failed:', error);
        // Show error message to user
        const toastContainer = document.getElementById('toastContainer') || document.body;
        const errorToast = document.createElement('div');
        errorToast.className = 'toast error';
        errorToast.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>Application failed to initialize. Please refresh the page.</span>
        `;
        toastContainer.appendChild(errorToast);
    }
});