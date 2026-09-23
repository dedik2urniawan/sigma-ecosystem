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
        const weekParam = searchParams.get("week");
        const week = weekParam && weekParam !== "all" ? parseInt(weekParam) : null;

        const yearStr = year.toString();
        const monthStr = month.toString().padStart(2, "0");
        const lastDay = new Date(year, month, 0).getDate();

        const periodStartStr = `${yearStr}-${monthStr}-01`;
        const periodEndStr = `${yearStr}-${monthStr}-${lastDay}`;
        const cumulativeEndStr = periodEndStr;

        const { data: refDesaData } = await supabase
            .from("ref_desa")
            .select("id, desa_kel, puskesmas_id");

        const desaToPuskesmasMap = new Map<string, string>();
        refDesaData?.forEach((d: any) => {
            if (d.desa_kel && d.puskesmas_id) {
                desaToPuskesmasMap.set(d.desa_kel.toLowerCase().trim(), d.puskesmas_id);
            }
        });

        const { data: puskesmasData } = await supabase
            .from("ref_puskesmas")
            .select("id, nama");

        const puskesmasNameMap = new Map<string, string>();
        puskesmasData?.forEach((p: any) => {
            if (p.id && p.nama) {
                puskesmasNameMap.set(p.id, p.nama);
            }
        });

        let balitaQuery = supabase
            .from("balita")
            .select("id, puskesmas_id, desa_kel, puskesmas:puskesmas_id(id, nama)", { count: "exact" })
            .lte("created_at", `${cumulativeEndStr} 23:59:59`);

        if (appUser.role === "admin_puskesmas" && appUser.puskesmas_id) {
            balitaQuery = balitaQuery.eq("puskesmas_id", appUser.puskesmas_id);
        }

        const { data: balitaData, count: totalBalita, error: balitaError } = await balitaQuery;

        if (balitaError) {
            console.error("[Monitoring Compliance API] Balita error:", balitaError);
            return NextResponse.json({ error: balitaError.message }, { status: 500 });
        }

        const applyDateFilter = (q: any) => {
            if (week) {
                return q
                    .gte("tanggal", periodStartStr)
                    .lte("tanggal", periodEndStr)
                    .eq("minggu_ke", week);
            } else {
                return q.lte("tanggal", periodEndStr);
            }
        };

        let antropometriQuery = supabase
            .from("monitoring_antropometri")
            .select(`
                id,
                tanggal,
                minggu_ke,
                kohort:kohort_id (
                    id,
                    balita_id,
                    puskesmas_id,
                    balita:balita_id (
                        id,
                        puskesmas_id,
                        desa_kel,
                        puskesmas:puskesmas_id (id, nama)
                    )
                )
            `);
        antropometriQuery = applyDateFilter(antropometriQuery);
        const { data: antropometriData } = await antropometriQuery;

        let konsumsiQuery = supabase
            .from("monitoring_pkmk_konsumsi")
            .select(`
                id,
                tanggal,
                minggu_ke,
                kohort:kohort_id (
                    id,
                    balita_id,
                    puskesmas_id,
                    balita:balita_id (
                        id,
                        puskesmas_id,
                        desa_kel,
                        puskesmas:puskesmas_id (id, nama)
                    )
                )
            `);
        konsumsiQuery = applyDateFilter(konsumsiQuery);
        const { data: konsumsiData } = await konsumsiQuery;

        let pemberianQuery = supabase
            .from("monitoring_pkmk_pemberian")
            .select(`
                id,
                tanggal,
                minggu_ke,
                kohort:kohort_id (
                    id,
                    balita_id,
                    puskesmas_id,
                    balita:balita_id (
                        id,
                        puskesmas_id,
                        desa_kel,
                        puskesmas:puskesmas_id (id, nama)
                    )
                )
            `);
        pemberianQuery = applyDateFilter(pemberianQuery);
        const { data: pemberianData } = await pemberianQuery;

        const filterByPuskesmas = (data: any[]) => {
            if (appUser.role === "admin_puskesmas" && appUser.puskesmas_id) {
                return data.filter((item: any) => {
                    const balita = item.kohort?.balita;
                    return balita?.puskesmas_id === appUser.puskesmas_id;
                });
            }
            return data;
        };

        const filteredAntropometri = filterByPuskesmas(antropometriData || []);
        const filteredKonsumsi = filterByPuskesmas(konsumsiData || []);
        const filteredPemberian = filterByPuskesmas(pemberianData || []);

        const balitaWithAntropometri = new Set(
            filteredAntropometri
                .map((item: any) => item.kohort?.balita_id)
                .filter(Boolean)
        );

        const balitaWithKonsumsi = new Set(
            filteredKonsumsi
                .map((item: any) => item.kohort?.balita_id)
                .filter(Boolean)
        );

        const balitaWithPemberian = new Set(
            filteredPemberian
                .map((item: any) => item.kohort?.balita_id)
                .filter(Boolean)
        );

        const overall = {
            antropometri: {
                monitored: balitaWithAntropometri.size,
                percentage: totalBalita && totalBalita > 0 ? (balitaWithAntropometri.size / totalBalita) * 100 : 0,
            },
            konsumsi: {
                monitored: balitaWithKonsumsi.size,
                percentage: totalBalita && totalBalita > 0 ? (balitaWithKonsumsi.size / totalBalita) * 100 : 0,
            },
            pemberian: {
                monitored: balitaWithPemberian.size,
                percentage: totalBalita && totalBalita > 0 ? (balitaWithPemberian.size / totalBalita) * 100 : 0,
            },
        };

        const locationMap = new Map();

        balitaData?.forEach((balita: any) => {
            const balitaId = balita.id;

            let locationKey = "";
            let locationName = "";
            let parentKey = "";
            let parentName = "";

            if (appUser.role === "superadmin") {
                const desaKey = balita.desa_kel?.toLowerCase().trim();
                const correctPuskesmasId = desaKey ? desaToPuskesmasMap.get(desaKey) : null;
                const effectivePuskesmasId = correctPuskesmasId || balita.puskesmas_id;

                if (effectivePuskesmasId) {
                    parentKey = effectivePuskesmasId;
                    parentName = puskesmasNameMap.get(effectivePuskesmasId) || `Puskesmas ${parentKey}`;

                    if (balita.desa_kel) {
                        locationKey = `${effectivePuskesmasId}__${balita.desa_kel.toLowerCase().trim()}`;
                        locationName = balita.desa_kel;
                    }
                }
            } else {
                if (balita.desa_kel) {
                    const desaKey = balita.desa_kel.toLowerCase().trim();
                    const correctPuskesmasForDesa = desaToPuskesmasMap.get(desaKey);

                    if (correctPuskesmasForDesa && correctPuskesmasForDesa !== appUser.puskesmas_id) {
                        return;
                    }

                    locationKey = desaKey;
                    locationName = balita.desa_kel;
                }
            }

            if (!locationKey) return;

            if (appUser.role === "superadmin" && parentKey) {
                if (!locationMap.has(parentKey)) {
                    locationMap.set(parentKey, {
                        id: parentKey,
                        name: parentName,
                        totalBalita: 0,
                        antropometri: new Set(),
                        konsumsi: new Set(),
                        pemberian: new Set(),
                        children: new Map(),
                    });
                }

                const parent = locationMap.get(parentKey);
                parent.totalBalita++;

                if (balitaWithAntropometri.has(balitaId)) parent.antropometri.add(balitaId);
                if (balitaWithKonsumsi.has(balitaId)) parent.konsumsi.add(balitaId);
                if (balitaWithPemberian.has(balitaId)) parent.pemberian.add(balitaId);

                if (!parent.children.has(locationKey)) {
                    parent.children.set(locationKey, {
                        id: locationKey,
                        name: locationName,
                        totalBalita: 0,
                        antropometri: new Set(),
                        konsumsi: new Set(),
                        pemberian: new Set(),
                    });
                }

                const child = parent.children.get(locationKey);
                child.totalBalita++;
                if (balitaWithAntropometri.has(balitaId)) child.antropometri.add(balitaId);
                if (balitaWithKonsumsi.has(balitaId)) child.konsumsi.add(balitaId);
                if (balitaWithPemberian.has(balitaId)) child.pemberian.add(balitaId);
            } else {
                if (!locationMap.has(locationKey)) {
                    locationMap.set(locationKey, {
                        id: locationKey,
                        name: locationName,
                        totalBalita: 0,
                        antropometri: new Set(),
                        konsumsi: new Set(),
                        pemberian: new Set(),
                    });
                }

                const location = locationMap.get(locationKey);
                location.totalBalita++;
                if (balitaWithAntropometri.has(balitaId)) location.antropometri.add(balitaId);
                if (balitaWithKonsumsi.has(balitaId)) location.konsumsi.add(balitaId);
                if (balitaWithPemberian.has(balitaId)) location.pemberian.add(balitaId);
            }
        });

        const byLocation: any[] = [];

        locationMap.forEach((loc) => {
            const children: any[] = [];
            if (loc.children) {
                loc.children.forEach((child: any) => {
                    children.push({
                        id: child.id,
                        name: child.name,
                        totalBalita: child.totalBalita,
                        antropometri: {
                            monitored: child.antropometri.size,
                            percentage: child.totalBalita > 0 ? (child.antropometri.size / child.totalBalita) * 100 : 0,
                        },
                        konsumsi: {
                            monitored: child.konsumsi.size,
                            percentage: child.totalBalita > 0 ? (child.konsumsi.size / child.totalBalita) * 100 : 0,
                        },
                        pemberian: {
                            monitored: child.pemberian.size,
                            percentage: child.totalBalita > 0 ? (child.pemberian.size / child.totalBalita) * 100 : 0,
                        },
                    });
                });
            }

            byLocation.push({
                id: loc.id,
                name: loc.name,
                totalBalita: loc.totalBalita,
                antropometri: {
                    monitored: loc.antropometri.size,
                    percentage: loc.totalBalita > 0 ? (loc.antropometri.size / loc.totalBalita) * 100 : 0,
                },
                konsumsi: {
                    monitored: loc.konsumsi.size,
                    percentage: loc.totalBalita > 0 ? (loc.konsumsi.size / loc.totalBalita) * 100 : 0,
                },
                pemberian: {
                    monitored: loc.pemberian.size,
                    percentage: loc.totalBalita > 0 ? (loc.pemberian.size / loc.totalBalita) * 100 : 0,
                },
                children: children.length > 0 ? children : undefined,
            });
        });

        return NextResponse.json({
            totalBalita: totalBalita || 0,
            overall,
            byLocation,
            level: appUser.role === "superadmin" ? "puskesmas" : "desa",
        });
    } catch (error: any) {
        console.error("[Monitoring Compliance API] Error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
