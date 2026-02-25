// ─── Tatalaksana Balita Bermasalah Gizi Helper ─────────────────────────────
// Handles 6 metrics with different TW aggregation rules

export const TATALAKSANA_COLUMNS = [
    // Metric 1: Gizi kurang PMT (cumulative)
    "jumlah_seluruh_balita_usia_6_59_bulan_gizi_kurang_dengan_atau_t",
    "jumlah_balita_gizi_kurang_usia_6_59_bulan_yang_mendapatkan_maka",
    // Metric 2: BGM PMT (average)
    "jumlah_seluruh_balita_usia_6_59_bulan_bb_kurang_yang_tidak_wast",
    "jumlah_balita_bb_kurang_usia_6_59_bulan_yang_mendapatkan_makana",
    // Metric 3: BB tidak naik T PMT (average)
    "jumlah_sasaran_balita_t",
    "jumlah_balita_t659_mendapatkan_pmt",
    // Metric 4: Gizi buruk 0-5 bln (cumulative)
    "jumlah_kasus_gizi_buruk_bayi_0_5_bulan_sampai_bulan_ini",
    "jumlah_kasus_gizi_buruk_bayi_0_5_bulan_mendapat_perawatan_sampa",
    // Metric 5: Gizi buruk 6-59 bln (cumulative)
    "jumlah_kasus_gizi_buruk_balita_6_59_bulan_sampai_bulan_ini",
    "jumlah_kasus_gizi_buruk_balita_6_59_bulan_mendapat_perawatan_sa",
    // Metric 6: Stunting dirujuk (cumulative)
    "jumlah_balita_stunting_sampai_bulan_ini",
    "jumlah_balita_stunting_dirujuk_puskesmas_ke_rs_sampai_bulan_ini",
];

// Short keys for readability
const COL = {
    gk_den: "jumlah_seluruh_balita_usia_6_59_bulan_gizi_kurang_dengan_atau_t",
    gk_num: "jumlah_balita_gizi_kurang_usia_6_59_bulan_yang_mendapatkan_maka",
    bgm_den: "jumlah_seluruh_balita_usia_6_59_bulan_bb_kurang_yang_tidak_wast",
    bgm_num: "jumlah_balita_bb_kurang_usia_6_59_bulan_yang_mendapatkan_makana",
    t_den: "jumlah_sasaran_balita_t",
    t_num: "jumlah_balita_t659_mendapatkan_pmt",
    gb05_den: "jumlah_kasus_gizi_buruk_bayi_0_5_bulan_sampai_bulan_ini",
    gb05_num: "jumlah_kasus_gizi_buruk_bayi_0_5_bulan_mendapat_perawatan_sampa",
    gb659_den: "jumlah_kasus_gizi_buruk_balita_6_59_bulan_sampai_bulan_ini",
    gb659_num: "jumlah_kasus_gizi_buruk_balita_6_59_bulan_mendapat_perawatan_sa",
    stunt_den: "jumlah_balita_stunting_sampai_bulan_ini",
    stunt_num: "jumlah_balita_stunting_dirujuk_puskesmas_ke_rs_sampai_bulan_ini",
};

export interface TatalaksanaMetricsResult {
    summaryTable: TatalaksanaSummaryRow[];
    overallMetrics: {
        gizi_kurang_pmt: number;
        bgm_pmt: number;
        bb_t_pmt: number;
        gb_05: number;
        gb_659: number;
        stunting_rujuk: number;
    };
}

export interface TatalaksanaSummaryRow {
    name: string;
    gizi_kurang_pmt_rate: number;
    bgm_pmt_rate: number;
    bb_t_pmt_rate: number;
    gb_05_rate: number;
    gb_659_rate: number;
    stunting_rujuk_rate: number;
}

const calcDiv = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);

/**
 * Calculate Tatalaksana metrics with correct TW aggregation.
 * 
 * Aggregation rules:
 * - CUMULATIVE metrics (gizi_kurang, gb_05, gb_659, stunting_rujuk):
 *   Monthly = direct, TW = take LAST month of quarter (Mar/Jun/Sep/Dec)
 * - AVERAGE metrics (bgm, bb_t):
 *   Monthly = direct, TW = avg of numerator & denominator from Jan to end of TW
 */
export function calculateTatalaksanaMetrics(
    data: any[],
    groupingRole: "superadmin" | "admin_puskesmas",
    jenisLaporan: "Bulanan" | "Tahunan TW",
    selectedMonthOrTW: number
): TatalaksanaMetricsResult {
    const groupKey = groupingRole === "superadmin" ? "puskesmas" : "kelurahan";

    // For TW, determine which months are relevant
    let cumulativeMonth = selectedMonthOrTW; // for Bulanan, just use the selected month
    let avgMonths: number[] = [selectedMonthOrTW];

    if (jenisLaporan === "Tahunan TW") {
        // Cumulative: take last month of TW
        const twLastMonth: Record<number, number> = { 1: 3, 2: 6, 3: 9, 4: 12 };
        cumulativeMonth = twLastMonth[selectedMonthOrTW] || 12;

        // Average: Jan through end of TW
        const twEndMonth = twLastMonth[selectedMonthOrTW] || 12;
        avgMonths = Array.from({ length: twEndMonth }, (_, i) => i + 1);
    }

    // Group data by groupKey
    const groups: Record<string, any[]> = {};
    data.forEach(row => {
        const key = row[groupKey] || "Tidak Diketahui";
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
    });

    const summaryTable: TatalaksanaSummaryRow[] = [];

    // Overall accumulators
    let totalGkNum = 0, totalGkDen = 0;
    let totalBgmNum = 0, totalBgmDen = 0;
    let totalTNum = 0, totalTDen = 0;
    let totalGb05Num = 0, totalGb05Den = 0;
    let totalGb659Num = 0, totalGb659Den = 0;
    let totalStuntNum = 0, totalStuntDen = 0;

    for (const [name, rows] of Object.entries(groups)) {
        // --- CUMULATIVE metrics: filter to the specific month ---
        const cumulativeRows = rows.filter(r => Number(r.bulan) === cumulativeMonth);

        const gkNum = cumulativeRows.reduce((s, r) => s + (Number(r[COL.gk_num]) || 0), 0);
        const gkDen = cumulativeRows.reduce((s, r) => s + (Number(r[COL.gk_den]) || 0), 0);
        const gb05Num = cumulativeRows.reduce((s, r) => s + (Number(r[COL.gb05_num]) || 0), 0);
        const gb05Den = cumulativeRows.reduce((s, r) => s + (Number(r[COL.gb05_den]) || 0), 0);
        const gb659Num = cumulativeRows.reduce((s, r) => s + (Number(r[COL.gb659_num]) || 0), 0);
        const gb659Den = cumulativeRows.reduce((s, r) => s + (Number(r[COL.gb659_den]) || 0), 0);
        const stuntNum = cumulativeRows.reduce((s, r) => s + (Number(r[COL.stunt_num]) || 0), 0);
        const stuntDen = cumulativeRows.reduce((s, r) => s + (Number(r[COL.stunt_den]) || 0), 0);

        // --- AVERAGE metrics: use avgMonths ---
        const avgRows = rows.filter(r => avgMonths.includes(Number(r.bulan)));
        // Group by month to compute per-month sums, then average
        const monthBuckets: Record<number, { bgmNum: number; bgmDen: number; tNum: number; tDen: number }> = {};
        avgRows.forEach(r => {
            const m = Number(r.bulan);
            if (!monthBuckets[m]) monthBuckets[m] = { bgmNum: 0, bgmDen: 0, tNum: 0, tDen: 0 };
            monthBuckets[m].bgmNum += Number(r[COL.bgm_num]) || 0;
            monthBuckets[m].bgmDen += Number(r[COL.bgm_den]) || 0;
            monthBuckets[m].tNum += Number(r[COL.t_num]) || 0;
            monthBuckets[m].tDen += Number(r[COL.t_den]) || 0;
        });

        const monthCount = Object.keys(monthBuckets).length || 1;
        let bgmNum: number, bgmDen: number, tNum: number, tDen: number;

        if (jenisLaporan === "Bulanan") {
            // No averaging needed for single month
            bgmNum = Object.values(monthBuckets).reduce((s, b) => s + b.bgmNum, 0);
            bgmDen = Object.values(monthBuckets).reduce((s, b) => s + b.bgmDen, 0);
            tNum = Object.values(monthBuckets).reduce((s, b) => s + b.tNum, 0);
            tDen = Object.values(monthBuckets).reduce((s, b) => s + b.tDen, 0);
        } else {
            // TW: average numerator and denominator across months
            const totalBgmNumRaw = Object.values(monthBuckets).reduce((s, b) => s + b.bgmNum, 0);
            const totalBgmDenRaw = Object.values(monthBuckets).reduce((s, b) => s + b.bgmDen, 0);
            const totalTNumRaw = Object.values(monthBuckets).reduce((s, b) => s + b.tNum, 0);
            const totalTDenRaw = Object.values(monthBuckets).reduce((s, b) => s + b.tDen, 0);
            bgmNum = totalBgmNumRaw / monthCount;
            bgmDen = totalBgmDenRaw / monthCount;
            tNum = totalTNumRaw / monthCount;
            tDen = totalTDenRaw / monthCount;
        }

        summaryTable.push({
            name,
            gizi_kurang_pmt_rate: calcDiv(gkNum, gkDen),
            bgm_pmt_rate: calcDiv(bgmNum, bgmDen),
            bb_t_pmt_rate: calcDiv(tNum, tDen),
            gb_05_rate: calcDiv(gb05Num, gb05Den),
            gb_659_rate: calcDiv(gb659Num, gb659Den),
            stunting_rujuk_rate: calcDiv(stuntNum, stuntDen),
        });

        totalGkNum += gkNum; totalGkDen += gkDen;
        totalBgmNum += bgmNum; totalBgmDen += bgmDen;
        totalTNum += tNum; totalTDen += tDen;
        totalGb05Num += gb05Num; totalGb05Den += gb05Den;
        totalGb659Num += gb659Num; totalGb659Den += gb659Den;
        totalStuntNum += stuntNum; totalStuntDen += stuntDen;
    }

    summaryTable.sort((a, b) => a.name.localeCompare(b.name));

    return {
        summaryTable,
        overallMetrics: {
            gizi_kurang_pmt: calcDiv(totalGkNum, totalGkDen),
            bgm_pmt: calcDiv(totalBgmNum, totalBgmDen),
            bb_t_pmt: calcDiv(totalTNum, totalTDen),
            gb_05: calcDiv(totalGb05Num, totalGb05Den),
            gb_659: calcDiv(totalGb659Num, totalGb659Den),
            stunting_rujuk: calcDiv(totalStuntNum, totalStuntDen),
        },
    };
}
