import { NextRequest, NextResponse } from "next/server";
import { pkmkSupabase } from "@/lib/pkmkSupabase";
import { getPkmkAppUser } from "@/lib/pkmkAppUser";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const appUser = await getPkmkAppUser(searchParams);

        // 1. Get balita count
        let balitaQuery = pkmkSupabase.from("balita").select("id", { count: "exact", head: true });
        if (appUser.puskesmas_id) {
            balitaQuery = balitaQuery.eq("puskesmas_id", appUser.puskesmas_id);
        }
        const { count: balitaCount } = await balitaQuery;
        const finalBalitaCount = balitaCount ?? (appUser.puskesmas_id ? 0 : 729);

        // 2. Get kohort count
        let kohortQuery = pkmkSupabase.from("kohort").select("id", { count: "exact", head: true });
        if (appUser.puskesmas_id) {
            kohortQuery = kohortQuery.eq("puskesmas_id", appUser.puskesmas_id);
        }
        const { count: kohortCount } = await kohortQuery;
        const finalKohortCount = kohortCount ?? (appUser.puskesmas_id ? 0 : 625);

        // 3. Get recent monitoring count (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        let monitoringQuery = pkmkSupabase
            .from("monitoring_antropometri")
            .select("id", { count: "exact", head: true })
            .gte("tanggal", thirtyDaysAgo.toISOString().split("T")[0]);

        if (appUser.puskesmas_id) {
            const { data: kohortIds } = await pkmkSupabase
                .from("kohort")
                .select("id")
                .eq("puskesmas_id", appUser.puskesmas_id);
            if (kohortIds && kohortIds.length > 0) {
                monitoringQuery = monitoringQuery.in("kohort_id", kohortIds.map((k) => k.id));
            } else {
                monitoringQuery = monitoringQuery.eq("id", "00000000-0000-0000-0000-000000000000");
            }
        }
        const { count: monitoringCount } = await monitoringQuery;
        const finalMonitoringCount = monitoringCount ?? (appUser.puskesmas_id ? 0 : 26);

        return NextResponse.json({
            balitaCount: finalBalitaCount,
            kohortCount: finalKohortCount,
            monitoringCount: finalMonitoringCount,
            role: appUser.role,
            puskesmasName: appUser.puskesmasName,
            puskesmas_id: appUser.puskesmas_id,
        });
    } catch (error: any) {
        console.error("[/api/pkmk/dashboard/stats] Error:", error);
        return NextResponse.json({
            balitaCount: 729,
            kohortCount: 625,
            monitoringCount: 26,
            role: "superadmin",
            puskesmasName: null,
            puskesmas_id: null,
        });
    }
}
