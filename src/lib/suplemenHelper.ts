// src/lib/suplemenHelper.ts

export const SUPLEMEN_COLUMNS = [
    "jumlah_bayi_6_11_bulan",
    "jumlah_bayi_6_11_bulan_mendapat_vitamin_a",
    "jumlah_anak_12_59_bulan",
    "jumlah_anak_12_59_bulan_mendapat_vitamin_a",
    "jumlah_anak_12_59_bulan_mendapat_vitamin_a_2_kali_dalam_setahun",
    "jumlah_balita_underweight_suplemen",
    "jumlah_balita_yang_mendapatkan_suplementasi_gizi_mikro"
];

export interface SuplemenMetricsResult {
    summaryTable: SuplemenSummaryRow[];
    overallMetrics: SuplemenOverallMetrics;
    visibleCards: VisibleCard[];
}

export interface SuplemenSummaryRow {
    name: string;
    puskesmas: string;
    // Vitamin A feb
    vit_a_6_11_feb_rate: number;
    vit_a_12_59_feb_rate: number;
    // Vitamin A aug
    vit_a_6_11_aug_rate: number;
    vit_a_12_59_aug_rate: number;
    // Tahunan
    vit_a_6_11_tahunan_rate: number;
    vit_a_12_59_tahunan_rate: number;
    // 2x setahun
    vit_a_2x_rate: number;
    // Suplemen gizi mikro
    suplemen_mikro_rate: number;
}

export interface SuplemenOverallMetrics {
    vit_a_6_11_feb: number;
    vit_a_12_59_feb: number;
    vit_a_6_11_aug: number;
    vit_a_12_59_aug: number;
    vit_a_6_11_tahunan: number;
    vit_a_12_59_tahunan: number;
    vit_a_2x: number;
    suplemen_mikro: number;
}

export interface VisibleCard {
    id: string;
    title: string;
    subtitle?: string;
    val: number;
    color: string;
    period?: string;
}

/**
 * Determine which score cards are visible based on jenis laporan + selected period.
 *
 *  Bulanan:
 *   - Januari       → "Program belum dilaksanakan" only + suplemen mikro
 *   - Feb – Jul     → Vit.A Feb (6-11, 12-59) + Suplemen mikro
 *   - Agu – Des     → Vit.A Aug (6-11, 12-59) + Suplemen mikro
 *
 *  Triwulanan:
 *   - TW1 → Vit.A Feb + Suplemen mikro
 *   - TW2 → Vit.A Feb + Suplemen mikro
 *   - TW3 → Vit.A Feb + Aug + 2x/thn + Tahunan + Suplemen mikro
 *   - TW4 → Vit.A Feb + Aug + 2x/thn + Tahunan + Suplemen mikro
 */
function getVisibleCardIds(
    jenisLaporan: "Bulanan" | "Tahunan TW",
    periodVal: number
): string[] {
    if (jenisLaporan === "Bulanan") {
        if (periodVal === 1) return ["program_belum", "suplemen_mikro"];
        if (periodVal >= 2 && periodVal <= 7) return ["vit_a_6_11_feb", "vit_a_12_59_feb", "suplemen_mikro"];
        // 8–12
        return ["vit_a_6_11_aug", "vit_a_12_59_aug", "suplemen_mikro"];
    }
    // Triwulanan
    if (periodVal <= 2) return ["vit_a_6_11_feb", "vit_a_12_59_feb", "suplemen_mikro"];
    // TW3 & TW4
    return [
        "vit_a_6_11_feb", "vit_a_12_59_feb",
        "vit_a_6_11_aug", "vit_a_12_59_aug",
        "vit_a_2x", "vit_a_6_11_tahunan", "vit_a_12_59_tahunan",
        "suplemen_mikro"
    ];
}

/**
 * Get the month index for Suplemen Gizi Mikro data based on period.
 * - Bulanan: selected month
 * - TW1: 3, TW2: 6, TW3: 9, TW4: 12
 */
function getSuplemenMonth(jenisLaporan: "Bulanan" | "Tahunan TW", periodVal: number): number {
    if (jenisLaporan === "Bulanan") return periodVal;
    const twMonthMap: Record<number, number> = { 1: 3, 2: 6, 3: 9, 4: 12 };
    return twMonthMap[periodVal] || 12;
}

const calcDiv = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);

export function calculateSuplemenMetrics(
    data: any[],
    groupingRole: "superadmin" | "admin_puskesmas",
    jenisLaporan: "Bulanan" | "Tahunan TW",
    periodVal: number
): SuplemenMetricsResult {
    const isPerKelurahan = groupingRole === "admin_puskesmas";

    if (!data || data.length === 0) {
        return {
            summaryTable: [],
            overallMetrics: {
                vit_a_6_11_feb: 0, vit_a_12_59_feb: 0,
                vit_a_6_11_aug: 0, vit_a_12_59_aug: 0,
                vit_a_6_11_tahunan: 0, vit_a_12_59_tahunan: 0,
                vit_a_2x: 0, suplemen_mikro: 0
            },
            visibleCards: []
        };
    }

    // Separate data by month for Vitamin A calculations
    const febData = data.filter(r => Number(r.bulan) === 2);
    const augData = data.filter(r => Number(r.bulan) === 8);
    const suplemenMonth = getSuplemenMonth(jenisLaporan, periodVal);
    const suplemenData = data.filter(r => Number(r.bulan) === suplemenMonth);

    // Group by area
    interface GroupAccum {
        name: string;
        puskesmas: string;
        // Feb
        feb_6_11_num: number; feb_6_11_den: number;
        feb_12_59_num: number; feb_12_59_den: number;
        // Aug
        aug_6_11_num: number; aug_6_11_den: number;
        aug_12_59_num: number; aug_12_59_den: number;
        // 2x
        vit2x_num: number; vit2x_den: number;
        // Suplemen mikro
        sup_num: number; sup_den: number;
    }

    const grouping: Record<string, GroupAccum> = {};
    const initGroup = (key: string, puskesmas: string): GroupAccum => ({
        name: key, puskesmas,
        feb_6_11_num: 0, feb_6_11_den: 0,
        feb_12_59_num: 0, feb_12_59_den: 0,
        aug_6_11_num: 0, aug_6_11_den: 0,
        aug_12_59_num: 0, aug_12_59_den: 0,
        vit2x_num: 0, vit2x_den: 0,
        sup_num: 0, sup_den: 0
    });

    const addRow = (row: any, group: GroupAccum, month: number) => {
        const b_6_11 = Number(row.jumlah_bayi_6_11_bulan) || 0;
        const b_6_11_va = Number(row.jumlah_bayi_6_11_bulan_mendapat_vitamin_a) || 0;
        const a_12_59 = Number(row.jumlah_anak_12_59_bulan) || 0;
        const a_12_59_va = Number(row.jumlah_anak_12_59_bulan_mendapat_vitamin_a) || 0;
        const a_2x = Number(row.jumlah_anak_12_59_bulan_mendapat_vitamin_a_2_kali_dalam_setahun) || 0;
        const sup_den = Number(row.jumlah_balita_underweight_suplemen) || 0;
        const sup_num = Number(row.jumlah_balita_yang_mendapatkan_suplementasi_gizi_mikro) || 0;

        if (month === 2) {
            group.feb_6_11_num += b_6_11_va;
            group.feb_6_11_den += b_6_11;
            group.feb_12_59_num += a_12_59_va;
            group.feb_12_59_den += a_12_59;
        }
        if (month === 8) {
            group.aug_6_11_num += b_6_11_va;
            group.aug_6_11_den += b_6_11;
            group.aug_12_59_num += a_12_59_va;
            group.aug_12_59_den += a_12_59;
            group.vit2x_num += a_2x;
            group.vit2x_den += a_12_59;
        }
    };

    // Process February data
    febData.forEach(row => {
        const key = isPerKelurahan ? row.kelurahan : row.puskesmas;
        if (!grouping[key]) grouping[key] = initGroup(key, row.puskesmas);
        addRow(row, grouping[key], 2);
    });

    // Process August data
    augData.forEach(row => {
        const key = isPerKelurahan ? row.kelurahan : row.puskesmas;
        if (!grouping[key]) grouping[key] = initGroup(key, row.puskesmas);
        addRow(row, grouping[key], 8);
    });

    // Process Suplemen Mikro data (selected month)
    suplemenData.forEach(row => {
        const key = isPerKelurahan ? row.kelurahan : row.puskesmas;
        if (!grouping[key]) grouping[key] = initGroup(key, row.puskesmas);
        grouping[key].sup_num += Number(row.jumlah_balita_yang_mendapatkan_suplementasi_gizi_mikro) || 0;
        grouping[key].sup_den += Number(row.jumlah_balita_underweight_suplemen) || 0;
    });

    // Build summary table
    const summaryTable: SuplemenSummaryRow[] = Object.values(grouping).map(g => ({
        name: g.name,
        puskesmas: g.puskesmas,
        vit_a_6_11_feb_rate: calcDiv(g.feb_6_11_num, g.feb_6_11_den),
        vit_a_12_59_feb_rate: calcDiv(g.feb_12_59_num, g.feb_12_59_den),
        vit_a_6_11_aug_rate: calcDiv(g.aug_6_11_num, g.aug_6_11_den),
        vit_a_12_59_aug_rate: calcDiv(g.aug_12_59_num, g.aug_12_59_den),
        vit_a_6_11_tahunan_rate: calcDiv(g.feb_6_11_num + g.aug_6_11_num, g.feb_6_11_den + g.aug_6_11_den),
        vit_a_12_59_tahunan_rate: calcDiv(g.aug_12_59_num, g.aug_12_59_den), // Same as Aug
        vit_a_2x_rate: calcDiv(g.vit2x_num, g.vit2x_den),
        suplemen_mikro_rate: calcDiv(g.sup_num, g.sup_den),
    })).sort((a, b) => a.name.localeCompare(b.name));

    // Overall metrics
    const totals = Object.values(grouping).reduce((acc, g) => ({
        feb_6_11_num: acc.feb_6_11_num + g.feb_6_11_num,
        feb_6_11_den: acc.feb_6_11_den + g.feb_6_11_den,
        feb_12_59_num: acc.feb_12_59_num + g.feb_12_59_num,
        feb_12_59_den: acc.feb_12_59_den + g.feb_12_59_den,
        aug_6_11_num: acc.aug_6_11_num + g.aug_6_11_num,
        aug_6_11_den: acc.aug_6_11_den + g.aug_6_11_den,
        aug_12_59_num: acc.aug_12_59_num + g.aug_12_59_num,
        aug_12_59_den: acc.aug_12_59_den + g.aug_12_59_den,
        vit2x_num: acc.vit2x_num + g.vit2x_num,
        vit2x_den: acc.vit2x_den + g.vit2x_den,
        sup_num: acc.sup_num + g.sup_num,
        sup_den: acc.sup_den + g.sup_den,
    }), {
        feb_6_11_num: 0, feb_6_11_den: 0,
        feb_12_59_num: 0, feb_12_59_den: 0,
        aug_6_11_num: 0, aug_6_11_den: 0,
        aug_12_59_num: 0, aug_12_59_den: 0,
        vit2x_num: 0, vit2x_den: 0,
        sup_num: 0, sup_den: 0,
    });

    const overallMetrics: SuplemenOverallMetrics = {
        vit_a_6_11_feb: calcDiv(totals.feb_6_11_num, totals.feb_6_11_den),
        vit_a_12_59_feb: calcDiv(totals.feb_12_59_num, totals.feb_12_59_den),
        vit_a_6_11_aug: calcDiv(totals.aug_6_11_num, totals.aug_6_11_den),
        vit_a_12_59_aug: calcDiv(totals.aug_12_59_num, totals.aug_12_59_den),
        vit_a_6_11_tahunan: calcDiv(totals.feb_6_11_num + totals.aug_6_11_num, totals.feb_6_11_den + totals.aug_6_11_den),
        vit_a_12_59_tahunan: calcDiv(totals.aug_12_59_num, totals.aug_12_59_den), // same as aug
        vit_a_2x: calcDiv(totals.vit2x_num, totals.vit2x_den),
        suplemen_mikro: calcDiv(totals.sup_num, totals.sup_den),
    };

    // Determine which cards to show
    const cardDefs: VisibleCard[] = [
        { id: 'program_belum', title: 'Program Vitamin A Belum Dilaksanakan', val: 0, color: 'amber', period: 'Jan' },
        { id: 'vit_a_6_11_feb', title: '% Vit.A Bayi 6-11 Bln (Februari)', val: overallMetrics.vit_a_6_11_feb, color: 'orange' },
        { id: 'vit_a_12_59_feb', title: '% Vit.A Anak 12-59 Bln (Februari)', val: overallMetrics.vit_a_12_59_feb, color: 'amber' },
        { id: 'vit_a_6_11_aug', title: '% Vit.A Bayi 6-11 Bln (Agustus)', val: overallMetrics.vit_a_6_11_aug, color: 'teal' },
        { id: 'vit_a_12_59_aug', title: '% Vit.A Anak 12-59 Bln (Agustus)', val: overallMetrics.vit_a_12_59_aug, color: 'cyan' },
        { id: 'vit_a_6_11_tahunan', title: '% Vit.A Bayi 6-11 Bln (Tahunan)', val: overallMetrics.vit_a_6_11_tahunan, color: 'blue' },
        { id: 'vit_a_12_59_tahunan', title: '% Vit.A Anak 12-59 Bln (Tahunan)', subtitle: 'Sama dengan data Agustus', val: overallMetrics.vit_a_12_59_tahunan, color: 'indigo' },
        { id: 'vit_a_2x', title: '% Vit.A 12-59 Bln 2× Setahun', val: overallMetrics.vit_a_2x, color: 'violet' },
        { id: 'suplemen_mikro', title: '% Suplemen Gizi Mikro', val: overallMetrics.suplemen_mikro, color: 'rose' },
    ];

    const visibleIds = getVisibleCardIds(jenisLaporan, periodVal);
    const visibleCards = cardDefs.filter(c => visibleIds.includes(c.id));

    return { summaryTable, overallMetrics, visibleCards };
}
