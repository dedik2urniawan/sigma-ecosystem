/**
 * SIGMA RCS API — Indikator Balita Gizi
 * Status: ON PROCESS 🔄
 * GET /api/rcs/v1/balita-gizi
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
    const auth = await validateApiKey(req, "/api/rcs/v1/balita-gizi");
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
            `tahun, bulan, puskesmas, data_sasaran,
            gizi_buruk, gizi_kurang, normal, risiko_gizi_lebih, gizi_lebih, obesitas,
            sangat_pendek, pendek, tb_normal, tinggi,
            stunting, wasting, underweight`,
            { count: "exact" }
        )
        .order("tahun", { ascending: false })
        .range(offset, offset + limit - 1);

    if (tahun) query = query.eq("tahun", parseInt(tahun));
    if (bulan) query = query.eq("bulan", parseInt(bulan));
    if (puskesmas) query = query.ilike("puskesmas", `%${puskesmas}%`);

    const { data, error, count } = await query;

    if (error) {
        return NextResponse.json({ success: false, error: "Query failed" }, { status: 500 });
    }

    return NextResponse.json(
        {
            success: true,
            status: "partial",
            notice: "Endpoint ini sedang dalam proses finalisasi standarisasi data. Beberapa field mungkin belum tersedia lengkap.",
            data,
            meta: {
                indicator: "Indikator Balita Gizi",
                source: "SIGMA RCS — Dinas Kesehatan Kabupaten Malang",
                version: "v1",
                api_status: "ON_PROCESS",
                total_records: count,
                page, limit,
                filters: { tahun, bulan, puskesmas },
            },
        },
        {
            status: 206,
            headers: {
                "X-RateLimit-Limit": String(auth.context!.dailyLimit),
                "X-RateLimit-Remaining": String(auth.context!.dailyLimit - auth.context!.requestsToday),
                "X-API-Status": "ON_PROCESS",
                "Access-Control-Allow-Origin": "*",
            },
        }
    );
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "X-API-Key, Content-Type", "Access-Control-Allow-Methods": "GET, OPTIONS" },
    });
}
