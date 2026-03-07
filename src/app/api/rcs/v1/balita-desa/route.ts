/**
 * SIGMA RCS API — Data Balita Desa (data_bultim_desa)
 * Status: OPEN ✅
 * GET /api/rcs/v1/balita-desa
 * Query params: tahun, bulan, puskesmas, kelurahan, limit (default 100), page (default 1)
 *
 * Data source: data_bultim_desa (Pelayanan Kesehatan Level Desa/Kelurahan)
 * Uploaded via: SIGIZI KESGA file upload
 */
import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, apiResponse } from "@/lib/apiKeyMiddleware";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
);

export async function GET(req: NextRequest) {
    // Validate API Key
    const auth = await validateApiKey(req, "/api/rcs/v1/balita-desa");
    if (!auth.ok) return auth.error!;

    const { searchParams } = req.nextUrl;
    const tahun = searchParams.get("tahun");
    const bulan = searchParams.get("bulan");
    const puskesmas = searchParams.get("puskesmas");
    const kelurahan = searchParams.get("kelurahan");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const offset = (page - 1) * limit;

    let query = supabase
        .from("data_bultim_desa")
        .select(
            `Tahun, Bulan, Puskesmas, Kelurahan,
            data_sasaran_L, data_sasaran_P,
            BBSangat_Kurang, BB_Kurang, Berat_Badan_Normal, Risiko_Lebih,
            Sangat_Pendek, Pendek, TB_Normal, Tinggi,
            Gizi_Buruk, Gizi_Kurang, Normal, Risiko_Gizi_Lebih, Gizi_Lebih, Obesitas,
            Stunting, Wasting, Underweight,
            jumlah_timbang, jumlah_ukur, jumlah_timbang_ukur`,
            { count: "exact" }
        )
        .order("Tahun", { ascending: false })
        .order("Bulan", { ascending: false })
        .range(offset, offset + limit - 1);

    if (tahun) query = query.eq("Tahun", parseInt(tahun));
    if (bulan) query = query.eq("Bulan", parseInt(bulan));
    if (puskesmas) query = query.ilike("Puskesmas", `%${puskesmas}%`);
    if (kelurahan) query = query.ilike("Kelurahan", `%${kelurahan}%`);

    const { data, error, count } = await query;

    if (error) {
        return NextResponse.json(
            { success: false, error: "Query failed", detail: error.message },
            { status: 500 }
        );
    }

    return apiResponse(
        data,
        {
            indicator: "Pelayanan Kesehatan Balita Level Desa/Kelurahan",
            total_records: count,
            page,
            limit,
            filters: { tahun, bulan, puskesmas, kelurahan },
            fields_description: {
                Tahun: "Tahun data bulanan",
                Bulan: "Bulan data (1–12)",
                Puskesmas: "Nama Puskesmas",
                Kelurahan: "Nama Desa / Kelurahan",
                data_sasaran_L: "Jumlah sasaran balita laki-laki",
                data_sasaran_P: "Jumlah sasaran balita perempuan",
                Stunting: "Jumlah balita stunting (Sangat Pendek + Pendek)",
                Wasting: "Jumlah balita wasting (Gizi Buruk + Gizi Kurang)",
                Underweight: "Jumlah balita underweight (BB sangat kurang + BB kurang)",
                jumlah_timbang: "Jumlah balita ditimbang bulan ini",
                jumlah_ukur: "Jumlah balita diukur tinggi badannya",
                jumlah_timbang_ukur: "Jumlah balita ditimbang dan diukur sekaligus",
                Gizi_Buruk: "Status gizi buruk",
                BBSangat_Kurang: "Berat badan sangat kurang",
            },
            data_source: "data_bultim_desa",
            last_updated: new Date().toISOString(),
        },
        auth.context!
    );
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "X-API-Key, Content-Type",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
        },
    });
}
