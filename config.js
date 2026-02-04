const SUPABASE_CONFIG = {
    url: 'https://hotytmgimnygqbigxkfr.supabase.co', // e.g., https://xxxxx.supabase.co
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvdHl0bWdpbW55Z3FiaWd4a2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzAzODksImV4cCI6MjA4NTc0NjM4OX0.2YFKGMY8VfA1DzgBKIRnqI3AGBdkWz0eGSsjWfeaGGM'
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
