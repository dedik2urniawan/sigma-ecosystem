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

        let query = supabase
            .from("monitoring_pkmk_pemberian")
            .select(`
                id,
                tanggal,
                jumlah_unit,
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
            `)
            .lte("tanggal", periodEndStr);

        const { data: pemberianData, error: pemberianError } = await query;

        if (pemberianError) {
            console.error("[Dosage API] Error:", pemberianError);
            return NextResponse.json({ error: pemberianError.message }, { status: 500 });
        }

        let filteredData = pemberianData || [];
        if (appUser.role === "admin_puskesmas" && appUser.puskesmas_id) {
            filteredData = filteredData.filter((item: any) => {
                const balita = item.kohort?.balita;
                return balita?.puskesmas_id === appUser.puskesmas_id;
            });
        }

        let totalDosage = 0;
        let countDosage = 0;

        filteredData.forEach((entry: any) => {
            if (entry.jumlah_unit !== null && entry.jumlah_unit !== undefined) {
                totalDosage += entry.jumlah_unit;
                countDosage++;
            }
        });

        const avgDosage = countDosage > 0 ? totalDosage / countDosage : 0;
        const locationMap = new Map();

        filteredData.forEach((entry: any) => {
            const balita = entry.kohort?.balita;
            if (!balita) return;

            let locationKey = "";
            let locationName = "";
            let parentKey = "";
            let parentName = "";

            if (appUser.role === "superadmin") {
                if (balita.puskesmas_id) {
                    parentKey = balita.puskesmas_id;
                    const puskData = Array.isArray(balita.puskesmas) ? balita.puskesmas[0] : balita.puskesmas;
                    parentName = puskData?.nama || `Puskesmas ${parentKey}`;

                    if (balita.desa_kel) {
                        locationKey = `${parentKey}__${balita.desa_kel.toLowerCase().trim()}`;
                        locationName = balita.desa_kel;
                    }
                }
            } else {
                if (balita.desa_kel) {
                    locationKey = balita.desa_kel.toLowerCase().trim();
                    locationName = balita.desa_kel;
                }
            }

            if (!locationKey) return;

            if (appUser.role === "superadmin" && parentKey) {
                if (!locationMap.has(parentKey)) {
                    locationMap.set(parentKey, {
                        id: parentKey,
                        name: parentName,
                        dosages: [],
                        children: new Map(),
                    });
                }

                const parent = locationMap.get(parentKey);
                if (!parent.children.has(locationKey)) {
                    parent.children.set(locationKey, {
                        id: locationKey,
                        name: locationName,
                        dosages: [],
                    });
                }

                const child = parent.children.get(locationKey);
                if (entry.jumlah_unit !== null) child.dosages.push(entry.jumlah_unit);
                if (entry.jumlah_unit !== null) parent.dosages.push(entry.jumlah_unit);
            } else {
                if (!locationMap.has(locationKey)) {
                    locationMap.set(locationKey, {
                        id: locationKey,
                        name: locationName,
                        dosages: [],
                    });
                }

                const location = locationMap.get(locationKey);
                if (entry.jumlah_unit !== null) location.dosages.push(entry.jumlah_unit);
            }
        });

        const dosageByLocation: any[] = [];

        locationMap.forEach((loc) => {
            const avgDosageLoc = loc.dosages.length > 0
                ? loc.dosages.reduce((sum: number, val: number) => sum + val, 0) / loc.dosages.length
                : 0;

            const children: any[] = [];
            if (loc.children) {
                loc.children.forEach((child: any) => {
                    const avgDosageChild = child.dosages.length > 0
                        ? child.dosages.reduce((sum: number, val: number) => sum + val, 0) / child.dosages.length
                        : 0;

                    children.push({
                        id: child.id,
                        name: child.name,
                        avgDosage: parseFloat(avgDosageChild.toFixed(1)),
                    });
                });
            }

            dosageByLocation.push({
                id: loc.id,
                name: loc.name,
                avgDosage: parseFloat(avgDosageLoc.toFixed(1)),
                children: children.length > 0 ? children : undefined,
            });
        });

        return NextResponse.json({
            avgDosage: parseFloat(avgDosage.toFixed(1)),
            dosageByLocation,
            level: appUser.role === "superadmin" ? "puskesmas" : "desa",
        });
    } catch (error: any) {
        console.error("[Dosage API] Error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
