/**
 * SIGMA RCS API — Indikator Pelayanan Kesehatan
 * Status: OPEN ✅
 * GET /api/rcs/v1/pelayanan-kesehatan
 * Query params: tahun, bulan, puskesmas, limit (default 100), page (default 1)
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
    const auth = await validateApiKey(req, "/api/rcs/v1/pelayanan-kesehatan");
    if (!auth.ok) return auth.error!;

    const { searchParams } = req.nextUrl;
    const tahun = searchParams.get("tahun");
    const bulan = searchParams.get("bulan");
    const puskesmas = searchParams.get("puskesmas");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const offset = (page - 1) * limit;

    let query = supabase
        .from("data_bultim")
        .select(
            `tahun, bulan, puskesmas,
            data_sasaran, bb_sangat_kurang, bb_kurang, berat_badan_normal, risiko_lebih,
            sangat_pendek, pendek, tb_normal, tinggi,
            gizi_buruk, gizi_kurang, normal, risiko_gizi_lebih, gizi_lebih, obesitas,
            stunting, wasting, underweight`,
            { count: "exact" }
        )
        .order("tahun", { ascending: false })
        .order("bulan", { ascending: false })
        .range(offset, offset + limit - 1);

    if (tahun) query = query.eq("tahun", parseInt(tahun));
    if (bulan) query = query.eq("bulan", parseInt(bulan));
    if (puskesmas) query = query.ilike("puskesmas", `%${puskesmas}%`);

    const { data, error, count } = await query;

    if (error) {
        return NextResponse.json({ success: false, error: "Query failed", detail: error.message }, { status: 500 });
    }

    return apiResponse(
        data,
        {
            indicator: "Indikator Pelayanan Kesehatan",
            total_records: count,
            page,
            limit,
            filters: { tahun, bulan, puskesmas },
            fields_description: {
                data_sasaran: "Jumlah sasaran balita terdaftar",
                stunting: "Jumlah balita stunting (sangat pendek + pendek)",
                wasting: "Jumlah balita wasting (gizi buruk + gizi kurang)",
                underweight: "Jumlah balita underweight",
                bb_sangat_kurang: "Berat badan sangat kurang",
                gizi_buruk: "Status gizi buruk",
            },
            last_updated: new Date().toISOString(),
        },
        auth.context!
    );
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "X-API-Key, Content-Type", "Access-Control-Allow-Methods": "GET, OPTIONS" },
    });
}
