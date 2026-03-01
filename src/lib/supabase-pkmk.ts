import { createClient } from "@supabase/supabase-js";

// Read-only Supabase client for pkmk-app (public LMS reference data)
// No authentication required - anon key with read-only access to reference tables
const PKMK_SUPABASE_URL = "https://trislnewxcgaoawopeov.supabase.co";
const PKMK_SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyaXNsbmV3eGNnYW9hd29wZW92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNDM5NzksImV4cCI6MjA3NzcxOTk3OX0.cVSUePXypxQpZOQgsgGzGCogXTC0Zngu-jWwrVnXRUY";

export const supabasePkmk = createClient(PKMK_SUPABASE_URL, PKMK_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
});

// --- LMS Reference Table Types ---

export interface LmsRowBBU {
    Month: number;
    jk: 1 | 2;
    L: number;
    M: number;
    S: number;
    SD3neg: number;
    SD2neg: number;
    SD1neg: number;
    SD0: number;
    SD1: number;
    SD2: number;
    SD3: number;
}

export interface LmsRowTBU {
    Month: number;
    jk: 1 | 2;
    L: number;
    M: number;
    S: number;
    SD3neg: number;
    SD2neg: number;
    SD1neg: number;
    SD0: number;
    SD1: number;
    SD2: number;
    SD3: number;
}

export interface LmsRowBBTB {
    Length: number;
    jk: 1 | 2;
    L: number;
    M: number;
    S: number;
    SD3neg: number;
    SD2neg: number;
    SD1neg: number;
    SD0: number;
    SD1: number;
    SD2: number;
    SD3: number;
}

export interface LmsReference {
    bbu: LmsRowBBU[];
    tbu: LmsRowTBU[];
    bbtb: LmsRowBBTB[];
}

// Fetch all LMS tables from pkmk-app Supabase
export async function fetchLmsReference(): Promise<LmsReference> {
    const [bbuRes, tbuRes, bbtbRes] = await Promise.all([
        supabasePkmk.from("ref_lms_bbu").select("*").order("Month").order("jk"),
        supabasePkmk.from("ref_lms_tbu").select("*").order("Month").order("jk"),
        supabasePkmk.from("ref_lms_bbtb").select("*").order("Length").order("jk"),
    ]);

    if (bbuRes.error) throw new Error(`BBU fetch error: ${bbuRes.error.message}`);
    if (tbuRes.error) throw new Error(`TBU fetch error: ${tbuRes.error.message}`);
    if (bbtbRes.error) throw new Error(`BBTB fetch error: ${bbtbRes.error.message}`);

    return {
        bbu: (bbuRes.data as LmsRowBBU[]) || [],
        tbu: (tbuRes.data as LmsRowTBU[]) || [],
        bbtb: (bbtbRes.data as LmsRowBBTB[]) || [],
    };
}
