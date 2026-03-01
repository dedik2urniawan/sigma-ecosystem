// src/lib/supabase-fct.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseFct = createClient(supabaseUrl, supabaseKey);

export interface TkpiIngredient {
    id: number;
    kode_baru: string | null;
    nama_bahan_mentah: string;
    sumber: string | null;
    kelompok: string | null;
    energi: number | null;
    protein: number | null;
    air: number | null;
    lemak: number | null;
    kh: number | null;
    kalsium: number | null;
    besi: number | null;
    seng: number | null;
    vit_c: number | null;
    thiamin: number | null;
    riboflavin: number | null;
    niasin: number | null;
    b6: number | null;
    folat: number | null;
    b12: number | null;
    vit_a_re: number | null;
    vit_rae: number | null;
    retinol: number | null;
    b_kar: number | null;
    kartotal: number | null;
    bdd: number | null;
    kalium: number | null;
    natrium: number | null;
}

export interface YieldFactor {
    metode: string;
    yield_factor: number;
}

export interface RetentionFactor {
    metode: string;
    nutrien: string;
    retensi: number;
}

export interface AkgReference {
    id: number;
    kelompok: string;
    jk: string;
    energi: number | null;
    protein: number | null;
    lemak_total: number | null;
    omega3: number | null;
    omega6: number | null;
    karbohidrat: number | null;
    serat: number | null;
    air: number | null;
}

// Data fetching helper
export async function fetchFctReferenceData() {
    const [tkpiRes, yieldRes, retRes, akgRes] = await Promise.all([
        supabaseFct.from('fct_tkpi').select('*').order('nama_bahan_mentah'),
        supabaseFct.from('fct_yield').select('*'),
        supabaseFct.from('fct_retention').select('*'),
        supabaseFct.from('fct_akg_ref').select('*').order('id')
    ]);

    if (tkpiRes.error) console.error("Error fetching TKPI:", tkpiRes.error);
    if (yieldRes.error) console.error("Error fetching Yield:", yieldRes.error);
    if (retRes.error) console.error("Error fetching Retention:", retRes.error);
    if (akgRes.error) console.error("Error fetching AKG:", akgRes.error);

    return {
        tkpi: (tkpiRes.data || []) as TkpiIngredient[],
        yieldFactors: (yieldRes.data || []) as YieldFactor[],
        retentionFactors: (retRes.data || []) as RetentionFactor[],
        akgRefs: (akgRes.data || []) as AkgReference[]
    };
}
