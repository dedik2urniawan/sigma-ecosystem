"use server";

import { supabase } from "@/lib/supabase";

interface SearchFilters {
    query: string;
    periode: string;
    puskesmas: string;
    kelurahan?: string;
}

export async function searchBalita(filters: SearchFilters) {
    try {
        if (!filters.query || filters.query.length < 3) {
            return { success: true, data: [] };
        }

        let q = supabase.from("data_eppgbm").select("*");

        if (filters.periode && filters.periode !== "Semua") {
            q = q.eq("periode", filters.periode);
        }
        if (filters.puskesmas && filters.puskesmas !== "Semua") {
            q = q.eq("puskesmas", filters.puskesmas);
        }
        if (filters.kelurahan && filters.kelurahan !== "Semua") {
            q = q.eq("kelurahan", filters.kelurahan);
        }

        // Search by NIK or Nama
        q = q.or(`nik.ilike.%${filters.query}%,nama_balita.ilike.%${filters.query}%`);

        // We only want balita that are "bermasalah" or at least we can just search any balita, 
        // since the user might want to check a "Normal" balita's prescription too (e.g. pencegahan).
        
        // Limit to 5 results to prevent massive payloads and keep UI snappy
        q = q.limit(5);

        const { data, error } = await q;

        if (error) {
            console.error("Supabase Search Error:", error);
            throw error;
        }

        return { success: true, data };
    } catch (error: any) {
        console.error("Failed to search balita:", error.message);
        return { success: false, error: "Gagal mencari data balita." };
    }
}
