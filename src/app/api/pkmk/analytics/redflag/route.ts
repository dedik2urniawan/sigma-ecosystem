import { pkmkSupabase as supabase } from "@/lib/pkmkSupabase";
import { getPkmkAppUser } from "@/lib/pkmkAppUser";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const RED_FLAG_FIELDS = [
    { key: "bb_tidak_adekuat", label: "BB Tidak Adekuat" },
    { key: "murmur_edema", label: "Murmur/Edema" },
    { key: "delayed_development", label: "Keterlambatan Perkembangan" },
    { key: "wajah_dismorfik", label: "Wajah Dismorfik" },
    { key: "organomegali_limfadenopati", label: "Organomegali" },
    { key: "ispa_cystitis", label: "ISPA/Cystitis" },
    { key: "muntah_diare_berulang", label: "Muntah/Diare Berulang" },
];

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
            .from("monitoring_antropometri")
            .select(`
                id,
                tanggal,
                bb_tidak_adekuat,
                murmur_edema,
                delayed_development,
                wajah_dismorfik,
                organomegali_limfadenopati,
                ispa_cystitis,
                muntah_diare_berulang,
                redflag_any,
                kohort:kohort_id (
                    id,
                    puskesmas_id
                )
            `)
            .lte("tanggal", periodEndStr);

        const { data: monitoringData, error: monitoringError } = await query;

        if (monitoringError) {
            console.error("[RedFlag API] Error:", monitoringError);
            return NextResponse.json({ error: monitoringError.message }, { status: 500 });
        }

        let filteredData = monitoringData || [];
        if (appUser.role === "admin_puskesmas" && appUser.puskesmas_id) {
            filteredData = filteredData.filter((item: any) => {
                return item.kohort?.puskesmas_id === appUser.puskesmas_id;
            });
        }

        const redFlagCounts: { [key: string]: number } = {};
        RED_FLAG_FIELDS.forEach((field) => {
            redFlagCounts[field.key] = 0;
        });

        let totalWithRedFlag = 0;

        filteredData.forEach((entry: any) => {
            let hasAnyRedFlag = false;

            RED_FLAG_FIELDS.forEach((field) => {
                const value = entry[field.key];
                if (value && String(value).toLowerCase() === "ya") {
                    redFlagCounts[field.key]++;
                    hasAnyRedFlag = true;
                }
            });

            if (hasAnyRedFlag) {
                totalWithRedFlag++;
            }
        });

        const redFlagDistribution = RED_FLAG_FIELDS.map((field) => {
            const count = redFlagCounts[field.key];
            const percentage = totalWithRedFlag > 0 ? (count / totalWithRedFlag) * 100 : 0;

            return {
                name: field.label,
                value: count,
                percentage: parseFloat(percentage.toFixed(1)),
            };
        }).filter((item) => item.value > 0);

        return NextResponse.json({
            totalWithRedFlag,
            totalMonitoring: filteredData.length,
            redFlagPercentage: filteredData.length > 0 ? (totalWithRedFlag / filteredData.length) * 100 : 0,
            redFlagDistribution,
        });
    } catch (error: any) {
        console.error("[RedFlag API] Error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
