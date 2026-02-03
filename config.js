// Supabase Configuration
// IMPORTANT: Replace these with your actual Supabase project credentials
const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_URL', // e.g., https://xxxxx.supabase.co
    anonKey: 'YOUR_SUPABASE_ANON_KEY'
};

// Initialize Supabase client
let supabaseClient = null;

function initSupabase() {
    if (typeof supabase === 'undefined') {
        console.error('Supabase library not loaded. Please include the Supabase CDN script.');
        return null;
    }
    
    if (!supabaseClient) {
        supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        console.log('Supabase client initialized');
    }
    
    return supabaseClient;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SUPABASE_CONFIG, initSupabase };
} else {
    window.SUPABASE_CONFIG = SUPABASE_CONFIG;
    window.initSupabase = initSupabase;
}