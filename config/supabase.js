// --- Supabase Config ---
const SUPABASE_URL = 'https://idqhbfygmwyujrrebebt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkcWhiZnlnbXd5dWpycmViZWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3ODIwMDEsImV4cCI6MjA5NDM1ODAwMX0.YItzpGHRVWVLelxTwmL0VsPKNzgfAMu5xBELkJ5EwuQ';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
