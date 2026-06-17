// --- Supabase Config ---
const SUPABASE_URL = 'https://idqhbfygmwyujrrebebt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkcWhiZnlnbXd5dWpycmViZWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3ODIwMDEsImV4cCI6MjA5NDM1ODAwMX0.YItzpGHRVWVLelxTwmL0VsPKNzgfAMu5xBELkJ5EwuQ';

// Limpiar tokens de sesión corruptos o expirados antes de inicializar
const SB_KEY = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.includes('idqhbfygmwyujrrebebt'));
if (SB_KEY) {
    try {
        const raw = localStorage.getItem(SB_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            const exp = parsed?.expires_at || 0;
            if (exp * 1000 < Date.now()) localStorage.removeItem(SB_KEY);
        }
    } catch (e) { localStorage.removeItem(SB_KEY); }
}

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
});
