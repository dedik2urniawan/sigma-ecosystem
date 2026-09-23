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

        // 0. Get ref_desa mapping
        const { data: refDesaData } = await supabase
            .from("ref_desa")
            .select("id, desa_kel, puskesmas_id");

        const desaToPuskesmasMap = new Map<string, string>();
        refDesaData?.forEach((d: any) => {
            if (d.desa_kel && d.puskesmas_id) {
                desaToPuskesmasMap.set(d.desa_kel.toLowerCase().trim(), d.puskesmas_id);
            }
        });

        const { data: refPuskesmasData } = await supabase
            .from("ref_puskesmas")
            .select("id, nama");

        const puskesmasNameMap = new Map<string, string>();
        refPuskesmasData?.forEach((p: any) => {
            if (p.id && p.nama) {
                puskesmasNameMap.set(p.id, p.nama);
            }
        });

        // 1. COUNT TOTAL BALITA
        let balitaQuery = supabase
            .from("balita")
            .select("id, puskesmas_id, desa_kel, puskesmas:puskesmas_id(id, nama)", { count: "exact" })
            .lte("created_at", periodEndStr);

        if (appUser.role === "admin_puskesmas" && appUser.puskesmas_id) {
            balitaQuery = balitaQuery.eq("puskesmas_id", appUser.puskesmas_id);
        }

        const { data: balitaData, error: balitaError, count: balitaCount } = await balitaQuery;

        if (balitaError) {
            console.error("[Compliance API] Balita error:", balitaError);
            return NextResponse.json({ error: balitaError.message }, { status: 500 });
        }

        // 2. COUNT KOHORT
        let kohortQuery = supabase
            .from("kohort")
            .select(`
                id,
                balita_id,
                puskesmas_id,
                periode_mulai
            `)
            .lte("periode_mulai", periodEndStr);

        if (appUser.role === "admin_puskesmas" && appUser.puskesmas_id) {
            kohortQuery = kohortQuery.eq("puskesmas_id", appUser.puskesmas_id);
        }

        const { data: kohortData, error: kohortError } = await kohortQuery;

        if (kohortError) {
            console.error("[Compliance API] Kohort error:", kohortError);
            return NextResponse.json({ error: kohortError.message }, { status: 500 });
        }

        const totalBalita = balitaCount || 0;
        const uniqueBalitaWithKohort = new Set(kohortData?.map((k: any) => k.balita_id)).size;
        const compliancePercentage = totalBalita > 0 ? (uniqueBalitaWithKohort / totalBalita) * 100 : 0;

        const groupedData: any[] = [];

        if (appUser.role === "superadmin") {
            const puskesmasMap = new Map();

            balitaData?.forEach((balita: any) => {
                const desaKey = balita.desa_kel?.toLowerCase().trim();
                const correctPuskesmasId = desaKey ? desaToPuskesmasMap.get(desaKey) : null;
                const effectivePuskesmasId = correctPuskesmasId || balita.puskesmas_id;

                if (!effectivePuskesmasId) return;

                const puskId = effectivePuskesmasId;
                if (!puskesmasMap.has(puskId)) {
                    puskesmasMap.set(puskId, {
                        id: puskId,
                        name: puskesmasNameMap.get(puskId) || `Puskesmas ${puskId}`,
                        total: 0,
                        kohort: 0,
                        balitaIds: new Set(),
                        children: new Map(),
                    });
                }
                const pusk = puskesmasMap.get(puskId);
                pusk.total++;
                pusk.balitaIds.add(balita.id);

                if (balita.desa_kel) {
                    const childDesaKey = balita.desa_kel.toLowerCase().trim();
                    if (!pusk.children.has(childDesaKey)) {
                        pusk.children.set(childDesaKey, {
                            id: childDesaKey,
                            name: balita.desa_kel,
                            total: 0,
                            kohort: 0,
                            balitaIds: new Set(),
                        });
                    }
                    const desa = pusk.children.get(childDesaKey);
                    desa.total++;
                    desa.balitaIds.add(balita.id);
                }
            });

            kohortData?.forEach((kohort: any) => {
                const balita = balitaData?.find((b: any) => b.id === kohort.balita_id);
                if (!balita) return;

                const desaKey = balita.desa_kel?.toLowerCase().trim();
                const correctPuskesmasId = desaKey ? desaToPuskesmasMap.get(desaKey) : null;
                const effectivePuskesmasId = correctPuskesmasId || balita.puskesmas_id;

                if (puskesmasMap.has(effectivePuskesmasId)) {
                    const pusk = puskesmasMap.get(effectivePuskesmasId);
                    if (pusk.balitaIds.has(kohort.balita_id)) {
                        pusk.kohort++;
                    }

                    if (balita.desa_kel) {
                        const childDesaKey = balita.desa_kel.toLowerCase().trim();
                        const desa = pusk.children.get(childDesaKey);
                        if (desa && desa.balitaIds.has(kohort.balita_id)) {
                            desa.kohort++;
                        }
                    }
                }
            });

            puskesmasMap.forEach((pusk) => {
                const children: any[] = [];
                pusk.children.forEach((desa: any) => {
                    children.push({
                        id: desa.id,
                        name: desa.name,
                        total: desa.total,
                        kohort: desa.kohort,
                        percentage: desa.total > 0 ? (desa.kohort / desa.total) * 100 : 0,
                    });
                });

                groupedData.push({
                    id: pusk.id,
                    name: pusk.name,
                    total: pusk.total,
                    kohort: pusk.kohort,
                    percentage: pusk.total > 0 ? (pusk.kohort / pusk.total) * 100 : 0,
                    children: children.length > 0 ? children : undefined,
                });
            });
        } else {
            const desaMap = new Map();
            const validDesaForPuskesmas = new Set<string>();
            refDesaData?.forEach((d: any) => {
                if (d.puskesmas_id === appUser.puskesmas_id && d.desa_kel) {
                    validDesaForPuskesmas.add(d.desa_kel.toLowerCase().trim());
                }
            });

            balitaData?.forEach((balita: any) => {
                if (!balita.desa_kel) return;
                const desaKey = balita.desa_kel.toLowerCase().trim();
                if (!validDesaForPuskesmas.has(desaKey)) return;

                if (!desaMap.has(desaKey)) {
                    desaMap.set(desaKey, {
                        id: desaKey,
                        name: balita.desa_kel,
                        total: 0,
                        kohort: 0,
                        balitaIds: new Set(),
                    });
                }
                const desa = desaMap.get(desaKey);
                desa.total++;
                desa.balitaIds.add(balita.id);
            });

            kohortData?.forEach((kohort: any) => {
                const balita = balitaData?.find((b: any) => b.id === kohort.balita_id);
                if (!balita || !balita.desa_kel) return;

                const desaKey = balita.desa_kel.toLowerCase().trim();
                if (!validDesaForPuskesmas.has(desaKey)) return;

                if (desaMap.has(desaKey)) {
                    const desa = desaMap.get(desaKey);
                    if (desa.balitaIds.has(kohort.balita_id)) {
                        desa.kohort++;
                    }
                }
            });

            desaMap.forEach((desa) => {
                groupedData.push({
                    id: desa.id,
                    name: desa.name,
                    total: desa.total,
                    kohort: desa.kohort,
                    percentage: desa.total > 0 ? (desa.kohort / desa.total) * 100 : 0,
                });
            });
        }

        return NextResponse.json({
            totalBalita,
            kohortInput: uniqueBalitaWithKohort,
            compliancePercentage,
            groupedData,
            level: appUser.role === "superadmin" ? "puskesmas" : "desa",
        });
    } catch (error: any) {
        console.error("[Compliance API] Error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
