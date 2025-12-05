
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
// ВСТАВЬТЕ СЮДА ВАШИ ДАННЫЕ ИЗ SUPABASE
// Settings -> API

const SUPABASE_URL: string = 'https://inbtpbawnlcutjicujvu.supabase.co'; 
const SUPABASE_ANON_KEY: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImluYnRwYmF3bmxjdXRqaWN1anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NzA4MjcsImV4cCI6MjA4MDQ0NjgyN30.oXHnS615tzY8AYj_dAyiFPoxgpzNCyhrJKtcm42n-HU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const isSupabaseConfigured = () => {
    // Проверяем, что URL не является пустым и не содержит заглушку 'YOUR_PROJECT_ID'
    return SUPABASE_URL.length > 0 && !SUPABASE_URL.includes('YOUR_PROJECT_ID');
};
