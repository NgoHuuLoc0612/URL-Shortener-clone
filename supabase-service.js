// Supabase Integration Module for URL Shortener
class SupabaseURLService {
    constructor() {
        this.supabase = null;
    }

    async init() {
        try {
            this.supabase = initSupabase();
            if (!this.supabase) {
                console.error('Failed to initialize Supabase');
                return false;
            }
            console.log('Supabase URL Service initialized');
            return true;
        } catch (error) {
            console.error('Supabase initialization error:', error);
            return false;
        }
    }

    // Generate a unique short code
    generateShortCode(length = 6) {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < length; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // Hash password using Web Crypto API
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Create a short URL
    async createShortUrl(urlData) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase not initialized');
            }

            // Generate short code if not provided
            let shortCode = urlData.customAlias || this.generateShortCode();
            
            // Check if short code already exists
            let isUnique = false;
            let attempts = 0;
            const maxAttempts = 5;

            while (!isUnique && attempts < maxAttempts) {
                const { data: existing } = await this.supabase
                    .from('urls')
                    .select('short_code')
                    .eq('short_code', shortCode)
                    .single();

                if (!existing) {
                    isUnique = true;
                } else if (urlData.customAlias) {
                    // Custom alias is already taken
                    throw new Error('This custom alias is already in use');
                } else {
                    // Generate new code
                    shortCode = this.generateShortCode();
                    attempts++;
                }
            }

            if (!isUnique) {
                throw new Error('Failed to generate unique short code');
            }

            // Hash password if provided
            let passwordHash = null;
            if (urlData.password) {
                passwordHash = await this.hashPassword(urlData.password);
            }

            // Prepare data for insertion
            const insertData = {
                short_code: shortCode,
                original_url: urlData.originalUrl,
                custom_alias: urlData.customAlias || null,
                password_hash: passwordHash,
                is_password_protected: !!urlData.password,
                track_clicks: urlData.trackClicks !== false,
                expiry_date: urlData.expiryDate || null,
                alternative_url: urlData.alternativeUrl || null,
                traffic_split: urlData.trafficSplit || 50,
                enable_ab_test: !!urlData.alternativeUrl,
                is_active: true
            };

            // Insert into database
            const { data, error } = await this.supabase
                .from('urls')
                .insert([insertData])
                .select()
                .single();

            if (error) {
                console.error('Database insert error:', error);
                throw error;
            }

            // Log security event
            await this.logSecurityEvent({
                event_type: 'url_created',
                severity: 'info',
                url_id: data.id,
                description: `Short URL created: ${shortCode}`
            });

            return {
                ...data,
                shortUrl: window.location.origin + '/' + shortCode
            };

        } catch (error) {
            console.error('Error creating short URL:', error);
            throw error;
        }
    }

    // Get URL by short code
    async getUrlByShortCode(shortCode) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase not initialized');
            }

            const { data, error } = await this.supabase
                .rpc('get_url_by_short_code', {
                    p_short_code: shortCode
                });

            if (error) {
                console.error('Error fetching URL:', error);
                throw error;
            }

            if (!data || data.length === 0) {
                return null;
            }

            return data[0];
        } catch (error) {
            console.error('Error getting URL:', error);
            return null;
        }
    }

    // Get all URLs (with pagination)
    async getAllUrls(limit = 50, offset = 0) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase not initialized');
            }

            const { data, error, count } = await this.supabase
                .from('urls')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                console.error('Error fetching URLs:', error);
                throw error;
            }

            return {
                urls: data || [],
                total: count || 0
            };
        } catch (error) {
            console.error('Error getting all URLs:', error);
            return { urls: [], total: 0 };
        }
    }

    // Update URL
    async updateUrl(id, updates) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase not initialized');
            }

            const { data, error } = await this.supabase
                .from('urls')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('Error updating URL:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error updating URL:', error);
            throw error;
        }
    }

    // Delete URL
    async deleteUrl(id) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase not initialized');
            }

            const { error } = await this.supabase
                .from('urls')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting URL:', error);
                throw error;
            }

            // Log security event
            await this.logSecurityEvent({
                event_type: 'url_deleted',
                severity: 'info',
                url_id: id,
                description: `URL deleted: ${id}`
            });

            return true;
        } catch (error) {
            console.error('Error deleting URL:', error);
            return false;
        }
    }

    // Track analytics
    async trackClick(urlId, clickData = {}) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase not initialized');
            }

            const analyticsData = {
                url_id: urlId,
                user_agent: navigator.userAgent,
                referrer: document.referrer || null,
                ...clickData
            };

            const { error } = await this.supabase
                .from('analytics')
                .insert([analyticsData]);

            if (error) {
                console.error('Error tracking click:', error);
                throw error;
            }

            // Increment click count
            await this.supabase.rpc('increment_click_count', {
                p_short_code: clickData.shortCode
            });

            return true;
        } catch (error) {
            console.error('Error tracking click:', error);
            return false;
        }
    }

    // Get analytics for a URL
    async getUrlAnalytics(urlId, limit = 100) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase not initialized');
            }

            const { data, error } = await this.supabase
                .from('analytics')
                .select('*')
                .eq('url_id', urlId)
                .order('clicked_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Error fetching analytics:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Error getting analytics:', error);
            return [];
        }
    }

    // Get aggregated analytics
    async getAggregatedAnalytics(urlId) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase not initialized');
            }

            // Get all analytics for the URL
            const analytics = await this.getUrlAnalytics(urlId, 1000);

            // Aggregate data
            const aggregated = {
                totalClicks: analytics.length,
                uniqueVisitors: new Set(analytics.map(a => a.ip_address)).size,
                deviceTypes: {},
                browsers: {},
                countries: {},
                referrers: {},
                clicksByDate: {}
            };

            analytics.forEach(click => {
                // Device types
                if (click.device_type) {
                    aggregated.deviceTypes[click.device_type] = 
                        (aggregated.deviceTypes[click.device_type] || 0) + 1;
                }

                // Browsers
                if (click.browser) {
                    aggregated.browsers[click.browser] = 
                        (aggregated.browsers[click.browser] || 0) + 1;
                }

                // Countries
                if (click.country) {
                    aggregated.countries[click.country] = 
                        (aggregated.countries[click.country] || 0) + 1;
                }

                // Referrers
                if (click.referrer) {
                    aggregated.referrers[click.referrer] = 
                        (aggregated.referrers[click.referrer] || 0) + 1;
                }

                // Clicks by date
                const date = new Date(click.clicked_at).toISOString().split('T')[0];
                aggregated.clicksByDate[date] = 
                    (aggregated.clicksByDate[date] || 0) + 1;
            });

            return aggregated;
        } catch (error) {
            console.error('Error getting aggregated analytics:', error);
            return null;
        }
    }

    // Log security event
    async logSecurityEvent(eventData) {
        try {
            if (!this.supabase) {
                return;
            }

            const { error } = await this.supabase
                .from('security_logs')
                .insert([eventData]);

            if (error) {
                console.error('Error logging security event:', error);
            }
        } catch (error) {
            console.error('Error logging security event:', error);
        }
    }

    // Get security logs
    async getSecurityLogs(limit = 100) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase not initialized');
            }

            const { data, error } = await this.supabase
                .from('security_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Error fetching security logs:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Error getting security logs:', error);
            return [];
        }
    }

    // Search URLs
    async searchUrls(query) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase not initialized');
            }

            const { data, error } = await this.supabase
                .from('urls')
                .select('*')
                .or(`original_url.ilike.%${query}%,short_code.ilike.%${query}%,custom_alias.ilike.%${query}%`)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('Error searching URLs:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Error searching URLs:', error);
            return [];
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SupabaseURLService;
} else {
    window.SupabaseURLService = SupabaseURLService;
}