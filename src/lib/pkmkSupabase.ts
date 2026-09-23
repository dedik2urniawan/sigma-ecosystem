import { createClient } from "@supabase/supabase-js";

const pkmkUrl = process.env.NEXT_PUBLIC_PKMK_SUPABASE_URL || "https://trislnewxcgaoawopeov.supabase.co";
const pkmkKey = process.env.PKMK_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_PKMK_SUPABASE_ANON_KEY || "";

/**
 * Supabase client for PKMK (Pangan Olahan untuk Keperluan Medis Khusus)
 * Connects directly to the PKMK monitoring database for 100% realtime sync.
 */
export const pkmkSupabase = createClient(pkmkUrl, pkmkKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
