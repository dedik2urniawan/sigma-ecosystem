// ─── Tatalaksana Balita Bermasalah Gizi Helper ─────────────────────────────
// Updated: March 2026 — Based on PRD SIGMA RCS 2026
// Aggregation rule for TW: SUM(Januari .. cutoff) across all indicators
// Ratio of sums: SUM(Numerator) / SUM(Denominator) * 100%

export const TATALAKSANA_COLUMNS = [
    // Metric 1: Gizi kurang PMT
    "jumlah_gikur_sampai_bulan_ini",
    "jumlah_gikur_mendapatkan_pmtlokal",
    // Metric 2: BB Kurang (BGM) PMT
    "jumlah_bbkurang_sampai_bulan_ini",
    "jumlah_bbkurang_mendapatkan_pmtlokal",
    // Metric 3: BB tidak naik T PMT
    "jumlah_sasaran_balita_t",
    "jumlah_balita_t659_mendapatkan_pmt",
    // Metric 4: Gizi buruk 0-5 bln
    "jumlah_kasus_gizi_buruk_bayi_0_5_bulan_sampai_bulan_ini",
    "jumlah_kasus_gizi_buruk_bayi_0_5_bulan_mendapat_perawatan_sampa",
    // Metric 5: Gizi buruk 6-59 bln (including component age groups 6-23 & 24-59)
    "jumlah_kasus_gizi_buruk_balita_6_23_bulan",
    "jumlah_kasus_gizi_buruk_balita_6_23_bulan_perawatan",
    "jumlah_kasus_gizi_buruk_balita_24_59_bulan",
    "jumlah_kasus_gizi_buruk_balita_24_59_bulan_perawatan",
    "jumlah_kasus_gizi_buruk_balita_6_59_bulan_sampai_bulan_ini",
    "jumlah_kasus_gizi_buruk_balita_6_59_bulan_mendapat_perawatan_sa",
    // Metric 6: Stunting dirujuk PKM ke RS
    "jumlah_balita_stunting_sampai_bulan_ini",
    "jumlah_balita_stunting_dirujuk_puskesmas_ke_rs_sampai_bulan_ini",
];

export interface TatalaksanaMetricsResult {
    summaryTable: TatalaksanaSummaryRow[];
    overallMetrics: {
        gizi_kurang_pmt: number;
        bgm_pmt: number;
        bb_t_pmt: number;
        gb_05: number;
        gb_659: number;
        stunting_rujuk: number;
        // Overall raw sums for scorecard labels
        gk_num: number;
        gk_den: number;
        bgm_num: number;
        bgm_den: number;
        t_num: number;
        t_den: number;
        gb05_num: number;
        gb05_den: number;
        gb659_num: number;
        gb659_den: number;
        stunt_num: number;
        stunt_den: number;
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
    // Numerator and denominator details for table
    gk_num: number;
    gk_den: number;
    bgm_num: number;
    bgm_den: number;
    t_num: number;
    t_den: number;
    gb05_num: number;
    gb05_den: number;
    gb659_num: number;
    gb659_den: number;
    stunt_num: number;
    stunt_den: number;
}

export interface TatalaksanaTrendDataPoint {
    bulan: number;
    bulanName: string;
    gizi_kurang_pmt: number;
    bgm_pmt: number;
    bb_t_pmt: number;
    gb_05: number;
    gb_659: number;
    stunting_rujuk: number;
}

const calcDiv = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);

/**
 * Resolve Gizi Buruk 6-59 cases and treated (Derived from 6-23 + 24-59 if present, or legacy column)
 */
function resolveGiziBuruk659(r: any): { cases: number; treated: number } {
    const c623 = Number(r.jumlah_kasus_gizi_buruk_balita_6_23_bulan) || 0;
    const t623 = Number(r.jumlah_kasus_gizi_buruk_balita_6_23_bulan_perawatan || r.jumlah_kasus_gizi_buruk_balita_6_23_bulan_mendapat_perawatan) || 0;
    const c2459 = Number(r.jumlah_kasus_gizi_buruk_balita_24_59_bulan) || 0;
    const t2459 = Number(r.jumlah_kasus_gizi_buruk_balita_24_59_bulan_perawatan || r.jumlah_kasus_gizi_buruk_balita_24_59_bulan_mendapat_perawatan) || 0;

    const derivedCases = c623 + c2459;
    const derivedTreated = t623 + t2459;

    if (derivedCases > 0 || derivedTreated > 0) {
        return { cases: derivedCases, treated: derivedTreated };
    }

    const legacyCases = Number(r.jumlah_kasus_gizi_buruk_balita_6_59_bulan_sampai_bulan_ini) || 0;
    const legacyTreated = Number(r.jumlah_kasus_gizi_buruk_balita_6_59_bulan_mendapat_perawatan_sa) || 0;
    return { cases: legacyCases, treated: legacyTreated };
}

/**
 * Calculate Tatalaksana metrics with strict PRD 2026 rules:
 * - Bulanan: direct sum across villages in the month
 * - Tahunan TW: YTD SUM (Januari to cutoff month) for both numerator & denominator
 * - Ratio of sums: SUM(Num) / SUM(Den) * 100%
 */
export function calculateTatalaksanaMetrics(
    data: any[],
    groupingRole: "superadmin" | "admin_puskesmas",
    jenisLaporan: "Bulanan" | "Tahunan TW",
    selectedMonthOrTW: number
): TatalaksanaMetricsResult {
    const groupKey = groupingRole === "superadmin" ? "puskesmas" : "kelurahan";

    // Months to include
    let includedMonths: number[] = [];
    if (jenisLaporan === "Bulanan") {
        includedMonths = [selectedMonthOrTW];
    } else {
        // YTD: TW1=1..3, TW2=1..6, TW3=1..9, TW4=1..12
        const twEndMonth: Record<number, number> = { 1: 3, 2: 6, 3: 9, 4: 12 };
        const end = twEndMonth[selectedMonthOrTW] || 12;
        includedMonths = Array.from({ length: end }, (_, i) => i + 1);
    }

    // Filter rows to included months
    const filteredRows = data.filter(r => includedMonths.includes(Number(r.bulan)));

    // Group by entity (Puskesmas or Kelurahan)
    const groups: Record<string, any[]> = {};
    filteredRows.forEach(row => {
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
        let gkNum = 0, gkDen = 0;
        let bgmNum = 0, bgmDen = 0;
        let tNum = 0, tDen = 0;
        let gb05Num = 0, gb05Den = 0;
        let gb659Num = 0, gb659Den = 0;
        let stuntNum = 0, stuntDen = 0;

        rows.forEach(r => {
            gkNum += Number(r.jumlah_gikur_mendapatkan_pmtlokal) || 0;
            gkDen += Number(r.jumlah_gikur_sampai_bulan_ini) || 0;

            bgmNum += Number(r.jumlah_bbkurang_mendapatkan_pmtlokal) || 0;
            bgmDen += Number(r.jumlah_bbkurang_sampai_bulan_ini) || 0;

            tNum += Number(r.jumlah_balita_t659_mendapatkan_pmt) || 0;
            tDen += Number(r.jumlah_sasaran_balita_t) || 0;

            gb05Num += Number(r.jumlah_kasus_gizi_buruk_bayi_0_5_bulan_mendapat_perawatan_sampa) || 0;
            gb05Den += Number(r.jumlah_kasus_gizi_buruk_bayi_0_5_bulan_sampai_bulan_ini) || 0;

            const gb = resolveGiziBuruk659(r);
            gb659Num += gb.treated;
            gb659Den += gb.cases;

            stuntNum += Number(r.jumlah_balita_stunting_dirujuk_puskesmas_ke_rs_sampai_bulan_ini) || 0;
            stuntDen += Number(r.jumlah_balita_stunting_sampai_bulan_ini) || 0;
        });

        summaryTable.push({
            name,
            gizi_kurang_pmt_rate: calcDiv(gkNum, gkDen),
            bgm_pmt_rate: calcDiv(bgmNum, bgmDen),
            bb_t_pmt_rate: calcDiv(tNum, tDen),
            gb_05_rate: calcDiv(gb05Num, gb05Den),
            gb_659_rate: calcDiv(gb659Num, gb659Den),
            stunting_rujuk_rate: calcDiv(stuntNum, stuntDen),
            gk_num: gkNum,
            gk_den: gkDen,
            bgm_num: bgmNum,
            bgm_den: bgmDen,
            t_num: tNum,
            t_den: tDen,
            gb05_num: gb05Num,
            gb05_den: gb05Den,
            gb659_num: gb659Num,
            gb659_den: gb659Den,
            stunt_num: stuntNum,
            stunt_den: stuntDen,
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
            gk_num: totalGkNum,
            gk_den: totalGkDen,
            bgm_num: totalBgmNum,
            bgm_den: totalBgmDen,
            t_num: totalTNum,
            t_den: totalTDen,
            gb05_num: totalGb05Num,
            gb05_den: totalGb05Den,
            gb659_num: totalGb659Num,
            gb659_den: totalGb659Den,
            stunt_num: totalStuntNum,
            stunt_den: totalStuntDen,
        },
    };
}

/**
 * Calculate 12-month temporal trend series for Tatalaksana
 */
export function calculateTatalaksanaTrend(yearData: any[]): TatalaksanaTrendDataPoint[] {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    const trendData: TatalaksanaTrendDataPoint[] = [];

    for (let m = 1; m <= 12; m++) {
        const monthData = yearData.filter(d => Number(d.bulan) === m);

        let gkNum = 0, gkDen = 0;
        let bgmNum = 0, bgmDen = 0;
        let tNum = 0, tDen = 0;
        let gb05Num = 0, gb05Den = 0;
        let gb659Num = 0, gb659Den = 0;
        let stuntNum = 0, stuntDen = 0;

        monthData.forEach(r => {
            gkNum += Number(r.jumlah_gikur_mendapatkan_pmtlokal) || 0;
            gkDen += Number(r.jumlah_gikur_sampai_bulan_ini) || 0;

            bgmNum += Number(r.jumlah_bbkurang_mendapatkan_pmtlokal) || 0;
            bgmDen += Number(r.jumlah_bbkurang_sampai_bulan_ini) || 0;

            tNum += Number(r.jumlah_balita_t659_mendapatkan_pmt) || 0;
            tDen += Number(r.jumlah_sasaran_balita_t) || 0;

            gb05Num += Number(r.jumlah_kasus_gizi_buruk_bayi_0_5_bulan_mendapat_perawatan_sampa) || 0;
            gb05Den += Number(r.jumlah_kasus_gizi_buruk_bayi_0_5_bulan_sampai_bulan_ini) || 0;

            const gb = resolveGiziBuruk659(r);
            gb659Num += gb.treated;
            gb659Den += gb.cases;

            stuntNum += Number(r.jumlah_balita_stunting_dirujuk_puskesmas_ke_rs_sampai_bulan_ini) || 0;
            stuntDen += Number(r.jumlah_balita_stunting_sampai_bulan_ini) || 0;
        });

        trendData.push({
            bulan: m,
            bulanName: months[m - 1],
            gizi_kurang_pmt: Math.round(calcDiv(gkNum, gkDen) * 10) / 10,
            bgm_pmt: Math.round(calcDiv(bgmNum, bgmDen) * 10) / 10,
            bb_t_pmt: Math.round(calcDiv(tNum, tDen) * 10) / 10,
            gb_05: Math.round(calcDiv(gb05Num, gb05Den) * 10) / 10,
            gb_659: Math.round(calcDiv(gb659Num, gb659Den) * 10) / 10,
            stunting_rujuk: Math.round(calcDiv(stuntNum, stuntDen) * 10) / 10,
        });
    }

    return trendData;
}
