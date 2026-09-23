import { pkmkSupabase as supabase } from "@/lib/pkmkSupabase";
import { getPkmkAppUser } from "@/lib/pkmkAppUser";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const appUser = await getPkmkAppUser(searchParams);

        if (!appUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
        const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

        const periodEnd = new Date(year, month, 0);
        const periodEndStr = periodEnd.toISOString().split("T")[0];

        let antropometriQuery = supabase
            .from("monitoring_antropometri")
            .select(`
                id,
                kohort_id,
                tanggal,
                minggu_ke,
                zs_bbu,
                zs_tbu,
                zs_bbtb,
                delta_bb_kg,
                redflag_any,
                kohort:kohort_id (
                    id,
                    balita_id,
                    puskesmas_id
                )
            `)
            .lte("tanggal", periodEndStr)
            .order("tanggal", { ascending: true });

        const { data: antropometriData, error: antropometriError } = await antropometriQuery;

        if (antropometriError) {
            console.error("[Nutrition API] Error:", antropometriError);
            return NextResponse.json({ error: antropometriError.message }, { status: 500 });
        }

        let filteredData = antropometriData || [];
        if (appUser.role === "admin_puskesmas" && appUser.puskesmas_id) {
            filteredData = filteredData.filter((item: any) => {
                const kohort = item.kohort;
                return kohort?.puskesmas_id === appUser.puskesmas_id;
            });
        }

        const totalEntries = filteredData.length;
        let sumBBU = 0;
        let sumTBU = 0;
        let sumBBTB = 0;
        let sumDeltaBB = 0;
        let countBBU = 0;
        let countTBU = 0;
        let countBBTB = 0;
        let countDeltaBB = 0;
        let redFlagCount = 0;

        filteredData.forEach((entry: any) => {
            if (entry.zs_bbu !== null && entry.zs_bbu !== undefined) {
                sumBBU += entry.zs_bbu;
                countBBU++;
            }
            if (entry.zs_tbu !== null && entry.zs_tbu !== undefined) {
                sumTBU += entry.zs_tbu;
                countTBU++;
            }
            if (entry.zs_bbtb !== null && entry.zs_bbtb !== undefined) {
                sumBBTB += entry.zs_bbtb;
                countBBTB++;
            }
            if (entry.delta_bb_kg !== null && entry.delta_bb_kg !== undefined) {
                sumDeltaBB += entry.delta_bb_kg;
                countDeltaBB++;
            }
            if (entry.redflag_any === true) {
                redFlagCount++;
            }
        });

        const avgBBU = countBBU > 0 ? sumBBU / countBBU : 0;
        const avgTBU = countTBU > 0 ? sumTBU / countTBU : 0;
        const avgBBTB = countBBTB > 0 ? sumBBTB / countBBTB : 0;
        const avgDeltaBB = countDeltaBB > 0 ? sumDeltaBB / countDeltaBB : 0;
        const redFlagPercentage = totalEntries > 0 ? (redFlagCount / totalEntries) * 100 : 0;

        const balitaIds = [...new Set(filteredData.map((e: any) => e.kohort?.balita_id).filter(Boolean))];

        let balitaMap = new Map();
        if (balitaIds.length > 0) {
            const { data: balitaData } = await supabase
                .from("balita")
                .select("id, puskesmas_id, desa_kel, puskesmas:puskesmas_id(id, nama)")
                .in("id", balitaIds);

            balitaData?.forEach((b: any) => {
                balitaMap.set(b.id, b);
            });
        }

        const locationMap = new Map();
        const periodStart = new Date(2020, 0, 1);
        const chartPeriodEnd = new Date(year, month, 0);

        filteredData.forEach((entry: any) => {
            const entryDate = new Date(entry.tanggal);
            if (entryDate < periodStart || entryDate > chartPeriodEnd) return;

            const balitaId = entry.kohort?.balita_id;
            if (!balitaId) return;

            const balita = balitaMap.get(balitaId);
            if (!balita) return;

            const monthKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, "0")}`;
            const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" }).format(entryDate);

            let locationKey = "";
            let locationName = "";

            if (appUser.role === "superadmin") {
                if (balita.puskesmas_id) {
                    locationKey = balita.puskesmas_id;
                    const puskData = Array.isArray(balita.puskesmas) ? balita.puskesmas[0] : balita.puskesmas;
                    locationName = puskData?.nama || `Puskesmas ${locationKey}`;
                }
            } else {
                if (balita.desa_kel) {
                    locationKey = balita.desa_kel.toLowerCase().trim();
                    locationName = balita.desa_kel;
                }
            }

            if (!locationKey) return;

            if (!locationMap.has(locationKey)) {
                locationMap.set(locationKey, {
                    id: locationKey,
                    name: locationName,
                    months: new Map(),
                });
            }

            const location = locationMap.get(locationKey);
            if (!location.months.has(monthKey)) {
                location.months.set(monthKey, {
                    label: monthLabel,
                    bbu: [],
                    tbu: [],
                    bbtb: [],
                    deltabb: [],
                });
            }

            const monthData = location.months.get(monthKey);
            if (entry.zs_bbu !== null) monthData.bbu.push(entry.zs_bbu);
            if (entry.zs_tbu !== null) monthData.tbu.push(entry.zs_tbu);
            if (entry.zs_bbtb !== null) monthData.bbtb.push(entry.zs_bbtb);
            if (entry.delta_bb_kg !== null) monthData.deltabb.push(entry.delta_bb_kg);
        });

        const chartDataBBU: any[] = [];
        const chartDataTBU: any[] = [];
        const chartDataBBTB: any[] = [];
        const chartDataDeltaBB: any[] = [];
        const locations: any[] = [];

        const allMonths = new Set<string>();
        locationMap.forEach((loc) => {
            loc.months.forEach((_: any, monthKey: string) => allMonths.add(monthKey));
        });
        const sortedMonths = Array.from(allMonths).sort((a, b) => a.localeCompare(b));

        let colorIdx = 0;
        const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
        locationMap.forEach((loc, key) => {
            locations.push({
                id: key,
                name: loc.name,
                color: COLORS[colorIdx % COLORS.length],
            });
            colorIdx++;
        });

        sortedMonths.forEach((monthKey) => {
            let monthLabel = monthKey;
            for (const loc of locationMap.values()) {
                const monthData = loc.months.get(monthKey);
                if (monthData && monthData.label) {
                    monthLabel = monthData.label;
                    break;
                }
            }

            const monthDataBBU: any = { month: monthLabel };
            const monthDataTBU: any = { month: monthLabel };
            const monthDataBBTB: any = { month: monthLabel };
            const monthDataDeltaBB: any = { month: monthLabel };

            locationMap.forEach((loc) => {
                const monthData = loc.months.get(monthKey);
                if (monthData) {
                    monthDataBBU[loc.name] = monthData.bbu.length > 0
                        ? monthData.bbu.reduce((sum: number, val: number) => sum + val, 0) / monthData.bbu.length
                        : null;
                    monthDataTBU[loc.name] = monthData.tbu.length > 0
                        ? monthData.tbu.reduce((sum: number, val: number) => sum + val, 0) / monthData.tbu.length
                        : null;
                    monthDataBBTB[loc.name] = monthData.bbtb.length > 0
                        ? monthData.bbtb.reduce((sum: number, val: number) => sum + val, 0) / monthData.bbtb.length
                        : null;
                    monthDataDeltaBB[loc.name] = monthData.deltabb.length > 0
                        ? monthData.deltabb.reduce((sum: number, val: number) => sum + val, 0) / monthData.deltabb.length
                        : null;
                } else {
                    monthDataBBU[loc.name] = null;
                    monthDataTBU[loc.name] = null;
                    monthDataBBTB[loc.name] = null;
                    monthDataDeltaBB[loc.name] = null;
                }
            });

            chartDataBBU.push(monthDataBBU);
            chartDataTBU.push(monthDataTBU);
            chartDataBBTB.push(monthDataBBTB);
            chartDataDeltaBB.push(monthDataDeltaBB);
        });

        return NextResponse.json({
            avgBBU,
            avgTBU,
            avgBBTB,
            avgDeltaBB,
            redFlagPercentage,
            chartDataBBU,
            chartDataTBU,
            chartDataBBTB,
            chartDataDeltaBB,
            locations,
            expectedBaseline: 0.25,
        });
    } catch (error: any) {
        console.error("[Nutrition API] Error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
