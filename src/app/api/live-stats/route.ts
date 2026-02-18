import { createSupabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const supabase = await createSupabaseServer();

        // 1. Find the latest period
        const { data: latestRow, error: latestErr } = await supabase
            .from("data_bultim")
            .select("tahun, bulan")
            .order("tahun", { ascending: false })
            .order("bulan", { ascending: false })
            .limit(1)
            .single();

        if (latestErr || !latestRow) {
            return NextResponse.json(
                { error: "No data available", detail: latestErr?.message },
                { status: 404 }
            );
        }

        const { tahun, bulan } = latestRow;

        // 2. Get all rows for that period
        const { data: rows, error: rowsErr } = await supabase
            .from("data_bultim")
            .select("puskesmas, data_sasaran, jumlah_timbang_ukur, stunting, wasting, underweight, obesitas")
            .eq("tahun", tahun)
            .eq("bulan", bulan);

        if (rowsErr || !rows || rows.length === 0) {
            return NextResponse.json(
                { error: "No rows for period", detail: rowsErr?.message },
                { status: 404 }
            );
        }

        // 3. Calculate totals
        const totalTimbang = rows.reduce((s: number, r: Record<string, number | null>) => s + (r.jumlah_timbang_ukur || 0), 0);
        const totalSasaran = rows.reduce((s: number, r: Record<string, number | null>) => s + (r.data_sasaran || 0), 0);
        const totalStunting = rows.reduce((s: number, r: Record<string, number | null>) => s + (r.stunting || 0), 0);
        const totalWasting = rows.reduce((s: number, r: Record<string, number | null>) => s + (r.wasting || 0), 0);
        const totalUnderweight = rows.reduce((s: number, r: Record<string, number | null>) => s + (r.underweight || 0), 0);
        const totalObesitas = rows.reduce((s: number, r: Record<string, number | null>) => s + (r.obesitas || 0), 0);

        const base = totalTimbang || totalSasaran || 1;

        // 4. Spark bars from per-puskesmas stunting %
        const sparkBars = rows
            .sort((a: Record<string, string | null>, b: Record<string, string | null>) =>
                (a.puskesmas || "").localeCompare(b.puskesmas || "")
            )
            .slice(0, 20)
            .map((r: Record<string, number | null>) => {
                const b = (r.jumlah_timbang_ukur || r.data_sasaran || 1) as number;
                return Math.min(100, Math.max(10, ((r.stunting || 0) as number / b) * 100 * 3));
            });

        const BULAN_LABELS: Record<number, string> = {
            1: "Januari", 2: "Februari", 3: "Maret", 4: "April",
            5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus",
            9: "September", 10: "Oktober", 11: "November", 12: "Desember",
        };

        return NextResponse.json({
            stunting: ((totalStunting / base) * 100).toFixed(1),
            wasting: ((totalWasting / base) * 100).toFixed(1),
            underweight: ((totalUnderweight / base) * 100).toFixed(1),
            obesitas: ((totalObesitas / base) * 100).toFixed(1),
            period: `${BULAN_LABELS[bulan] || bulan} ${tahun}`,
            sparkBars,
            puskesmasCount: rows.length,
        });
    } catch (err) {
        console.error("Live stats error:", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
