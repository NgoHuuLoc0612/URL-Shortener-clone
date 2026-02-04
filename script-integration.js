// SUPABASE INTEGRATION - Thêm vào cuối script.js hoặc tạo file riêng
// Override hàm shortenUrl để lưu vào Supabase

// Initialize Supabase service
let supabaseService = null;

// Override init function
const originalInit = SecureURLShortener.prototype.init;
SecureURLShortener.prototype.init = async function() {
    // Call original init
    await originalInit.call(this);
    
    // Initialize Supabase service
    supabaseService = new SupabaseURLService();
    const initialized = await supabaseService.init();
    
    if (initialized) {
        console.log('✅ Supabase integration enabled');
    } else {
        console.warn('⚠️ Supabase not available, using local storage only');
    }
};

// Override shortenUrl function
SecureURLShortener.prototype.shortenUrl = async function() {
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

    const shortenBtn = document.getElementById('shortenBtn');
    this.setLoadingState(shortenBtn, true);

    try {
        // Malware scanning
        const scanResult = await this.scanForMalware(originalUrl);
        if (!scanResult.safe) {
            this.securityStats.blocked++;
            this.saveSecurityStats();
            this.showToast(`Security threat detected: ${scanResult.details}`, 'error');
            this.setLoadingState(shortenBtn, false);
            return;
        }

        // Record request for rate limiting
        this.recordRequest();

        // ============================================
        // SUPABASE INTEGRATION - Save to database
        // ============================================
        
        if (supabaseService && supabaseService.supabase) {
            console.log('💾 Saving to Supabase...');
            
            // Prepare data for Supabase
            const urlData = {
                originalUrl: originalUrl,
                customAlias: customAlias || null,
                password: enablePassword ? urlPassword : null,
                trackClicks: trackClicks,
                expiryDate: expiryDate || null,
                alternativeUrl: enableABTest ? alternativeUrl : null,
                trafficSplit: parseInt(trafficSplit)
            };

            // Create short URL in Supabase
            const result = await supabaseService.createShortUrl(urlData);
            
            if (result) {
                console.log('✅ Saved to Supabase:', result);
                
                // Also save to local storage for offline access
                const localData = {
                    id: result.id,
                    originalUrl: result.original_url,
                    shortUrl: result.shortUrl,
                    shortCode: result.short_code,
                    customAlias: result.custom_alias,
                    createdAt: result.created_at,
                    expiryDate: result.expiry_date,
                    trackClicks: result.track_clicks,
                    clicks: result.clicks || 0,
                    uniqueClicks: 0,
                    clickHistory: [],
                    isActive: result.is_active,
                    password: result.password_hash,
                    isProtected: result.is_password_protected,
                    abTest: result.enable_ab_test ? {
                        alternativeUrl: result.alternative_url,
                        trafficSplit: result.traffic_split,
                        aClicks: 0,
                        bClicks: 0
                    } : null
                };

                // Save to local storage
                this.urls.push(localData);
                await this.saveUrls();

                // Show result
                this.showResult(localData);
                this.currentShortUrl = localData;

                this.showToast('URL shortened successfully!', 'success');
            } else {
                throw new Error('Failed to create short URL in database');
            }
            
        } else {
            // Fallback to local storage only
            console.warn('⚠️ Supabase not available, using local storage only');
            
            const shortCode = customAlias || this.generateShortCode();
            const shortUrl = this.baseUrl + shortCode;

            const localData = {
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
                    bClicks: 0
                } : null
            };

            this.urls.push(localData);
            await this.saveUrls();
            
            this.showResult(localData);
            this.currentShortUrl = localData;
            
            this.showToast('URL shortened (local only - Supabase not configured)', 'warning');
        }

    } catch (error) {
        console.error('Error shortening URL:', error);
        this.showToast('Error: ' + error.message, 'error');
    } finally {
        this.setLoadingState(shortenBtn, false);
    }
};

console.log('✅ Supabase integration loaded');
