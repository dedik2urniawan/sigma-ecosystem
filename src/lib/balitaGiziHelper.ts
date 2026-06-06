// src/lib/balitaGiziHelper.ts
// Updated: March 2026 — Support dual dataset (2025 legacy vs 2026+ new variables)

// ───────────────────────────────────────────────────────────────────────────────
// MANDATORY COLUMNS — used for Completeness check
// ───────────────────────────────────────────────────────────────────────────────

/** Kolom wajib format lama (dataset <= 2025) */
export const MANDATORY_COLUMNS_2025 = [
    "jumlah_sasaran_balita",
    "jumlah_balita_bulan_ini",
    "jumlah_balita_ditimbang",
    "jumlah_balita_ditimbang_dan_diukur",
    "jumlah_balita_diukur_pbtb",
    "jumlah_balita_punya_kia",
    "jumlah_balita_naik_berat_badannya_n",
    "jumlah_balita_tidak_naik_berat_badannya_t",
    "jumlah_balita_stunting",
    "jumlah_balita_wasting",
    "jumlah_balita_overweight",
    "jumlah_balita_underweight",
    "jumlah_bayi_usia_6_bulan",
    "jumlah_bayi_asi_eksklusif_sampai_6_bulan",
    "jumlah_anak_usia_6_23_bulan",
    "jumlah_bayi_6_11_bulan_mendapat_vitamin_a",
    "jumlah_anak_12_59_bulan_mendapat_vitamin_a",
    "jumlah_balita_yang_mendapatkan_suplementasi_gizi_mikro",
    "jumlah_kasus_gizi_buruk_balita_6_59_bulan_sampai_bulan_ini",
];

/** Kolom wajib format baru (dataset >= 2026) */
export const MANDATORY_COLUMNS_2026 = [
    "jumlah_sasaran_balita",
    // Balita usia per kelompok (pengganti jumlah_balita_bulan_ini)
    "jumlah_balita_usia_0_23_bulan_ini",
    "jumlah_balita_usia_24_59_bulan_ini",
    "jumlah_balita_usia_0_59_bulan_ini",
    // Timbang per kelompok usia
    "jumlah_balita_usia_0_23_bulan_ditimbang",
    "jumlah_balita_usia_24_59_bulan_ditimbang",
    "jumlah_balita_usia_0_59_bulan_ditimbang",
    // Ukur PB/TB per kelompok usia
    "jumlah_balita_usia_0_23_bulan_diukur_pbtb",
    "jumlah_balita_usia_24_59_bulan_diukur_pbtb",
    "jumlah_balita_usia_0_59_bulan_diukur_pbtb",
    // Timbang & diukur per kelompok usia
    "jumlah_balita_usia_0_23_bulan_ditimbang_dan_diukur",
    "jumlah_balita_usia_24_59_bulan_ditimbang_dan_diukur",
    "jumlah_balita_usia_0_59_bulan_ditimbang_dan_diukur",
    // Indikator pertumbuhan lainnya (tidak berubah)
    "jumlah_balita_punya_kia",
    "jumlah_balita_naik_berat_badannya_n",
    "jumlah_balita_tidak_naik_berat_badannya_t",
    "jumlah_balita_stunting",
    "jumlah_balita_wasting",
    "jumlah_balita_overweight",
    "jumlah_balita_underweight",
    // ASI & MPASI
    "jumlah_bayi_usia_6_bulan",
    "jumlah_bayi_asi_eksklusif_sampai_6_bulan",
    "jumlah_anak_usia_6_23_bulan",
    // Vitamin A (new 2026: 54-59 bln, 6-59 bln split Feb & Ags)
    "jumlah_anak_usia_54_59_bulan",
    "jumlah_anak_usia_54_59_bulan_mendapat_vitamin_a",
    "jumlah_anak_6_59_bulan_februari",
    "jumlah_anak_6_59_bulan_mendapat_vitamin_a_februari",
    "jumlah_anak_6_59_bulan_agustus",
    "jumlah_anak_6_59_bulan_mendapat_vitamin_a_agustus",
    // Gizi Buruk breakdown (nama kolom DB setelah rename 2026)
    "jumlah_kasus_gizi_buruk_balita_6_23_bulan",
    "jumlah_kasus_gizi_buruk_balita_24_59_bulan",
];

/** Alias backward compat — gunakan sesuai tahun */
export const MANDATORY_COLUMNS = MANDATORY_COLUMNS_2025;

export function getMandatoryColumns(tahun: number): string[] {
    return tahun >= 2026 ? MANDATORY_COLUMNS_2026 : MANDATORY_COLUMNS_2025;
}

// ───────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ───────────────────────────────────────────────────────────────────────────────

export interface RefDesa {
    id: number;
    nama_kelurahan: string;
    puskesmas_id?: number;
    nama_puskesmas: string;
}

export interface TransactionData {
    id?: number;
    kelurahan: string;
    puskesmas: string;
    bulan: number;
    tahun: number;
    [key: string]: any;
}

// ───────────────────────────────────────────────────────────────────────────────
// HELPER: Resolve variabel berdasarkan tahun data (2025 vs 2026+)
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Resolve "balita bulan ini" (0-59 bln).
 * - 2026+: pakai jumlah_balita_usia_0_59_bulan_ini (kolom baru)
 * - 2025: pakai jumlah_balita_bulan_ini (kolom lama)
 */
function resolveBulanIni(row: TransactionData): number {
    const new2026 = Number(row.jumlah_balita_usia_0_59_bulan_ini) || 0;
    const old2025 = Number(row.jumlah_balita_bulan_ini) || 0;
    return new2026 > 0 ? new2026 : old2025;
}

function resolveDitimbang(row: TransactionData): number {
    const new2026 = Number(row.jumlah_balita_usia_0_59_bulan_ditimbang) || 0;
    const old2025 = Number(row.jumlah_balita_ditimbang) || 0;
    return new2026 > 0 ? new2026 : old2025;
}

function resolveDiukurPBTB(row: TransactionData): number {
    const new2026 = Number(row.jumlah_balita_usia_0_59_bulan_diukur_pbtb) || 0;
    const old2025 = Number(row.jumlah_balita_diukur_pbtb) || 0;
    return new2026 > 0 ? new2026 : old2025;
}

function resolveDitimbangDanDiukur(row: TransactionData): number {
    const new2026 = Number(row.jumlah_balita_usia_0_59_bulan_ditimbang_dan_diukur) || 0;
    const old2025 = Number(row.jumlah_balita_ditimbang_dan_diukur) || 0;
    return new2026 > 0 ? new2026 : old2025;
}

// ───────────────────────────────────────────────────────────────────────────────
// COMPLIANCE: Tingkat Kepatuhan Laporan
// ───────────────────────────────────────────────────────────────────────────────

export function calculateCompliance(
    refDesa: RefDesa[],
    transactionData: TransactionData[],
    monthsCount: number,
    role: "superadmin" | "admin_puskesmas"
) {
    const targets = refDesa.map(d => ({
        puskesmas: d.nama_puskesmas.trim().toLowerCase(),
        kelurahan: d.nama_kelurahan.trim().toLowerCase(),
        originalPuskesmas: d.nama_puskesmas,
        originalKelurahan: d.nama_kelurahan
    }));

    const puskesmasStats: Record<string, { target: number; submitted: number; desaCount: number }> = {};
    const desaStats: Record<string, { puskesmas: string; target: number; submitted: number }> = {};

    let totalTarget = 0;
    let totalSubmitted = 0;

    for (const t of targets) {
        if (!puskesmasStats[t.originalPuskesmas]) {
            puskesmasStats[t.originalPuskesmas] = { target: 0, submitted: 0, desaCount: 0 };
        }
        puskesmasStats[t.originalPuskesmas].desaCount += 1;

        const desaKey = `${t.originalPuskesmas}-${t.originalKelurahan}`;
        if (!desaStats[desaKey]) {
            desaStats[desaKey] = { puskesmas: t.originalPuskesmas, target: 0, submitted: 0 };
        }

        const targetForKelurahan = monthsCount || 1;
        puskesmasStats[t.originalPuskesmas].target += targetForKelurahan;
        desaStats[desaKey].target += targetForKelurahan;
        totalTarget += targetForKelurahan;
    }

    for (const t of transactionData) {
        const pKey = t.puskesmas.trim().toLowerCase();
        const kKey = t.kelurahan.trim().toLowerCase();
        const matchedTarget = targets.find(target => target.puskesmas === pKey && target.kelurahan === kKey);

        if (matchedTarget) {
            puskesmasStats[matchedTarget.originalPuskesmas].submitted += 1;
            totalSubmitted += 1;
            const desaKey = `${matchedTarget.originalPuskesmas}-${matchedTarget.originalKelurahan}`;
            if (desaStats[desaKey]) {
                desaStats[desaKey].submitted += 1;
            }
        }
    }

    const overallRate = totalTarget > 0 ? (totalSubmitted / totalTarget) * 100 : 0;

    let chartData: any[] = [];
    let detailList: any[] = [];

    if (role === "superadmin") {
        chartData = Object.keys(puskesmasStats).map(p => ({
            name: p,
            rate: puskesmasStats[p].target > 0 ? (puskesmasStats[p].submitted / puskesmasStats[p].target) * 100 : 0,
            submitted: puskesmasStats[p].submitted,
            desaCount: puskesmasStats[p].desaCount,
            targetCount: puskesmasStats[p].target
        })).sort((a, b) => b.rate - a.rate);
        detailList = chartData;
    } else {
        chartData = Object.keys(desaStats).map(k => {
            const splitted = k.split("-");
            const desaName = splitted.slice(1).join("-");
            return {
                name: desaName,
                rate: desaStats[k].target > 0 ? (desaStats[k].submitted / desaStats[k].target) * 100 : 0,
                submitted: desaStats[k].submitted,
                targetCount: desaStats[k].target
            };
        }).sort((a, b) => b.rate - a.rate);
        detailList = chartData;
    }

    return { overallRate, chartData, detailTable: detailList };
}

// ───────────────────────────────────────────────────────────────────────────────
// COMPLETENESS: Tingkat Kelengkapan Data
// ───────────────────────────────────────────────────────────────────────────────

export function calculateCompleteness(
    refDesa: RefDesa[],
    transactionData: TransactionData[],
    monthsCount: number,
    role: "superadmin" | "admin_puskesmas",
    tahun: number = 2025
) {
    const mandatoryColumns = getMandatoryColumns(tahun);

    if (refDesa.length === 0) {
        return { overallRate: 0, columnCompleteness: [], chartData: [], detailTable: [] };
    }

    const totalFormsExpected = refDesa.length * (monthsCount || 1);
    const totalCellsExpected = totalFormsExpected * mandatoryColumns.length;
    let totalCellsFilled = 0;

    const columnStats: Record<string, number> = {};
    mandatoryColumns.forEach(c => columnStats[c] = 0);

    const puskesmasGrouping: Record<string, { expectedForms: number; filledCells: number; desaCount: number }> = {};
    const desaGrouping: Record<string, { expectedForms: number; filledCells: number; puskesmas: string; kelurahan: string }> = {};

    for (const d of refDesa) {
        if (!puskesmasGrouping[d.nama_puskesmas]) {
            puskesmasGrouping[d.nama_puskesmas] = { expectedForms: 0, filledCells: 0, desaCount: 0 };
        }
        puskesmasGrouping[d.nama_puskesmas].desaCount += 1;
        puskesmasGrouping[d.nama_puskesmas].expectedForms += (monthsCount || 1);

        const desaKey = `${d.nama_puskesmas}-${d.nama_kelurahan}`;
        if (!desaGrouping[desaKey]) {
            desaGrouping[desaKey] = {
                expectedForms: (monthsCount || 1),
                filledCells: 0,
                puskesmas: d.nama_puskesmas,
                kelurahan: d.nama_kelurahan
            };
        }
    }

    for (const row of transactionData) {
        const pKey = row.puskesmas.trim().toLowerCase();
        const kKey = row.kelurahan.trim().toLowerCase();
        const matchedTarget = refDesa.find(target =>
            target.nama_puskesmas.trim().toLowerCase() === pKey &&
            target.nama_kelurahan.trim().toLowerCase() === kKey
        );
        const targetPuskesmas = matchedTarget ? matchedTarget.nama_puskesmas : row.puskesmas;
        const targetDesaKey = matchedTarget ? `${matchedTarget.nama_puskesmas}-${matchedTarget.nama_kelurahan}` : null;

        for (const col of mandatoryColumns) {
            const val = row[col];
            if (val !== null && val !== undefined && val !== "") {
                totalCellsFilled += 1;
                columnStats[col] += 1;
                if (puskesmasGrouping[targetPuskesmas]) {
                    puskesmasGrouping[targetPuskesmas].filledCells += 1;
                }
                if (targetDesaKey && desaGrouping[targetDesaKey]) {
                    desaGrouping[targetDesaKey].filledCells += 1;
                }
            }
        }
    }

    const overallRate = totalCellsExpected > 0 ? (totalCellsFilled / totalCellsExpected) * 100 : 0;
    const columnCompleteness = Object.keys(columnStats).map(c => ({
        column: c,
        rate: totalFormsExpected > 0 ? (columnStats[c] / totalFormsExpected) * 100 : 0
    })).sort((a, b) => a.rate - b.rate);

    let chartData: any[] = [];
    let detailList: any[] = [];

    if (role === "superadmin") {
        chartData = Object.keys(puskesmasGrouping).map(p => {
            const expectedCells = puskesmasGrouping[p].expectedForms * mandatoryColumns.length;
            return {
                name: p,
                rate: expectedCells > 0 ? (puskesmasGrouping[p].filledCells / expectedCells) * 100 : 0,
                desaCount: puskesmasGrouping[p].desaCount
            };
        }).sort((a, b) => b.rate - a.rate);
        detailList = chartData;
    } else {
        chartData = Object.keys(desaGrouping).map(k => {
            const expectedCells = desaGrouping[k].expectedForms * mandatoryColumns.length;
            return {
                name: desaGrouping[k].kelurahan,
                rate: expectedCells > 0 ? (desaGrouping[k].filledCells / expectedCells) * 100 : 0
            };
        }).sort((a, b) => b.rate - a.rate);
        detailList = chartData;
    }

    return { overallRate, columnCompleteness, chartData, detailTable: detailList };
}

// ───────────────────────────────────────────────────────────────────────────────
// GROWTH METRICS (Analisis Pertumbuhan)
// ───────────────────────────────────────────────────────────────────────────────

export interface GrowthMetricsResult {
    metrics: Record<string, { current: number; previous: number; delta: number; isPositive: boolean; numerator: number; denominator: number; numLabel?: string; denLabel?: string }>;
    summaryTable: any[];
}

export function calculateGrowthMetrics(
    currentData: TransactionData[],
    previousData: TransactionData[],
    role: "superadmin" | "admin_puskesmas",
    currentMonthsCount: number = 1,
    previousMonthsCount: number = 1
): GrowthMetricsResult {

    const safeSum = (data: TransactionData[], col: string) =>
        data.reduce((sum, row) => sum + (Number(row[col]) || 0), 0);

    // Resolved sums — backward compatible 2025 vs 2026
    const resolvedSum = (data: TransactionData[], resolver: (r: TransactionData) => number) =>
        data.reduce((sum, row) => sum + resolver(row), 0);

    // --- CURRENT AGGREGATED ---
    const total_bulan_ini       = resolvedSum(currentData, resolveBulanIni) / currentMonthsCount;
    const total_sasaran         = safeSum(currentData, "jumlah_sasaran_balita") / currentMonthsCount;
    const total_ditimbang_terkoreksi = safeSum(currentData, "jumlah_balita_ditimbang_terkoreksi_daksen") / currentMonthsCount;
    const total_timbang         = resolvedSum(currentData, resolveDitimbang) / currentMonthsCount;
    const total_timbang_ukur    = resolvedSum(currentData, resolveDitimbangDanDiukur) / currentMonthsCount;
    const total_ukur_pbtb       = resolvedSum(currentData, resolveDiukurPBTB) / currentMonthsCount;

    // --- PREVIOUS AGGREGATED ---
    const prev_bulan_ini        = resolvedSum(previousData, resolveBulanIni) / previousMonthsCount;
    const prev_sasaran          = safeSum(previousData, "jumlah_sasaran_balita") / previousMonthsCount;
    const prev_ditimbang_terkoreksi = safeSum(previousData, "jumlah_balita_ditimbang_terkoreksi_daksen") / previousMonthsCount;
    const prev_timbang          = resolvedSum(previousData, resolveDitimbang) / previousMonthsCount;
    const prev_timbang_ukur     = resolvedSum(previousData, resolveDitimbangDanDiukur) / previousMonthsCount;
    const prev_ukur_pbtb        = resolvedSum(previousData, resolveDiukurPBTB) / previousMonthsCount;

    const calcDiv = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);
    const buildMetric = (currNum: number, currDen: number, prevNum: number, prevDen: number, higherIsBetter: boolean = true, numLabel: string = "Numerator", denLabel: string = "Denominator") => {
        const current = calcDiv(currNum, currDen);
        const previous = calcDiv(prevNum, prevDen);
        const delta = current - previous;
        const isPositive = higherIsBetter ? delta >= 0 : delta <= 0;
        return { current, previous, delta, isPositive, numerator: currNum, denominator: currDen, numLabel, denLabel };
    };

    const metrics = {
        "Balita ditimbang (Proyeksi)": buildMetric(
            resolvedSum(currentData, resolveDitimbang) / currentMonthsCount, total_sasaran,
            resolvedSum(previousData, resolveDitimbang) / previousMonthsCount, prev_sasaran,
            true, "D", "S"
        ),
        "Balita ditimbang (Data Rill)": buildMetric(
            resolvedSum(currentData, resolveDitimbang) / currentMonthsCount, total_bulan_ini,
            resolvedSum(previousData, resolveDitimbang) / previousMonthsCount, prev_bulan_ini,
            true, "D", "BBI"
        ),
        "Balita ditimbang & diukur": buildMetric(
            resolvedSum(currentData, resolveDitimbangDanDiukur) / currentMonthsCount, total_bulan_ini,
            resolvedSum(previousData, resolveDitimbangDanDiukur) / previousMonthsCount, prev_bulan_ini,
            true, "D&U", "BBI"
        ),
        "Balita diukur PB/TB": buildMetric(
            resolvedSum(currentData, resolveDiukurPBTB) / currentMonthsCount, total_bulan_ini,
            resolvedSum(previousData, resolveDiukurPBTB) / previousMonthsCount, prev_bulan_ini,
            true, "Diukur PB/TB", "BBI"
        ),
        "Balita memiliki Buku KIA": buildMetric(
            safeSum(currentData, "jumlah_balita_punya_kia") / currentMonthsCount, total_bulan_ini,
            safeSum(previousData, "jumlah_balita_punya_kia") / previousMonthsCount, prev_bulan_ini,
            true, "KIA", "BBI"
        ),
        "Balita Naik BB": buildMetric(
            safeSum(currentData, "jumlah_balita_naik_berat_badannya_n") / currentMonthsCount, total_bulan_ini,
            safeSum(previousData, "jumlah_balita_naik_berat_badannya_n") / previousMonthsCount, prev_bulan_ini,
            true, "N", "BBI"
        ),
        "Balita Naik dengan D Koreksi": buildMetric(
            safeSum(currentData, "jumlah_balita_naik_berat_badannya_n") / currentMonthsCount, total_ditimbang_terkoreksi,
            safeSum(previousData, "jumlah_balita_naik_berat_badannya_n") / previousMonthsCount, prev_ditimbang_terkoreksi,
            true, "N", "D_Kor"
        ),
        "Balita Tidak Naik BB": buildMetric(
            safeSum(currentData, "jumlah_balita_tidak_naik_berat_badannya_t") / currentMonthsCount, total_bulan_ini,
            safeSum(previousData, "jumlah_balita_tidak_naik_berat_badannya_t") / previousMonthsCount, prev_bulan_ini,
            false, "T", "BBI"
        ),
        "Balita Tidak Timbang Bulan Lalu": buildMetric(
            safeSum(currentData, "jumlah_balita_tidak_ditimbang_bulan_lalu_o") / currentMonthsCount, total_bulan_ini,
            safeSum(previousData, "jumlah_balita_tidak_ditimbang_bulan_lalu_o") / previousMonthsCount, prev_bulan_ini,
            false, "O", "BBI"
        ),
        "Prevalensi Stunting": buildMetric(
            safeSum(currentData, "jumlah_balita_stunting") / currentMonthsCount, total_ukur_pbtb,
            safeSum(previousData, "jumlah_balita_stunting") / previousMonthsCount, prev_ukur_pbtb,
            false, "Stunting", "Diukur PB/TB"
        ),
        "Prevalensi Wasting": buildMetric(
            safeSum(currentData, "jumlah_balita_wasting") / currentMonthsCount, total_timbang_ukur,
            safeSum(previousData, "jumlah_balita_wasting") / previousMonthsCount, prev_timbang_ukur,
            false, "Wasting", "D&U"
        ),
        "Prevalensi Underweight": buildMetric(
            safeSum(currentData, "jumlah_balita_underweight") / currentMonthsCount, total_timbang,
            safeSum(previousData, "jumlah_balita_underweight") / previousMonthsCount, prev_timbang,
            false, "Underweight", "D"
        ),
        "Prevalensi Overweight": buildMetric(
            safeSum(currentData, "jumlah_balita_overweight") / currentMonthsCount, total_timbang,
            safeSum(previousData, "jumlah_balita_overweight") / previousMonthsCount, prev_timbang,
            false, "Overweight", "D"
        ),
    };

    // Summary Table
    const summaryGrouping: Record<string, any> = {};
    currentData.forEach(row => {
        const groupKey = role === "superadmin" ? row.puskesmas : row.kelurahan;
        if (!summaryGrouping[groupKey]) {
            summaryGrouping[groupKey] = {
                name: groupKey,
                jumlah_sasaran_balita: 0,
                jumlah_balita_bulan_ini: 0,
                jumlah_balita_ditimbang: 0,
                jumlah_balita_ditimbang_dan_diukur: 0,
                jumlah_balita_naik_berat_badannya_n: 0,
                jumlah_balita_ditimbang_terkoreksi_daksen: 0,
                jumlah_balita_diukur_pbtb: 0,
                jumlah_balita_stunting: 0,
                jumlah_balita_wasting: 0,
                jumlah_balita_underweight: 0,
                jumlah_balita_overweight: 0
            };
        }
        const group = summaryGrouping[groupKey];
        group.jumlah_sasaran_balita += (Number(row.jumlah_sasaran_balita) || 0);
        group.jumlah_balita_bulan_ini += resolveBulanIni(row);
        group.jumlah_balita_ditimbang += resolveDitimbang(row);
        group.jumlah_balita_ditimbang_dan_diukur += resolveDitimbangDanDiukur(row);
        group.jumlah_balita_naik_berat_badannya_n += (Number(row.jumlah_balita_naik_berat_badannya_n) || 0);
        group.jumlah_balita_ditimbang_terkoreksi_daksen += (Number(row.jumlah_balita_ditimbang_terkoreksi_daksen) || 0);
        group.jumlah_balita_diukur_pbtb += resolveDiukurPBTB(row);
        group.jumlah_balita_stunting += (Number(row.jumlah_balita_stunting) || 0);
        group.jumlah_balita_wasting += (Number(row.jumlah_balita_wasting) || 0);
        group.jumlah_balita_underweight += (Number(row.jumlah_balita_underweight) || 0);
        group.jumlah_balita_overweight += (Number(row.jumlah_balita_overweight) || 0);
    });

    const summaryTable = Object.values(summaryGrouping).map(g => ({
        name: g.name,
        jumlah_sasaran_balita: g.jumlah_sasaran_balita / currentMonthsCount,
        jumlah_balita_bulan_ini: g.jumlah_balita_bulan_ini / currentMonthsCount,
        persen_ds: calcDiv((g.jumlah_balita_ditimbang_dan_diukur / currentMonthsCount), (g.jumlah_balita_bulan_ini / currentMonthsCount)),
        persen_nd_koreksi: calcDiv((g.jumlah_balita_naik_berat_badannya_n / currentMonthsCount), (g.jumlah_balita_ditimbang_terkoreksi_daksen / currentMonthsCount)),
        persen_nd_rill: calcDiv((g.jumlah_balita_naik_berat_badannya_n / currentMonthsCount), (g.jumlah_balita_ditimbang / currentMonthsCount)),
        stunting: calcDiv((g.jumlah_balita_stunting / currentMonthsCount), (g.jumlah_balita_diukur_pbtb / currentMonthsCount)),
        wasting: calcDiv((g.jumlah_balita_wasting / currentMonthsCount), (g.jumlah_balita_ditimbang_dan_diukur / currentMonthsCount)),
        underweight: calcDiv((g.jumlah_balita_underweight / currentMonthsCount), (g.jumlah_balita_ditimbang / currentMonthsCount)),
        obesitas: calcDiv((g.jumlah_balita_overweight / currentMonthsCount), (g.jumlah_balita_ditimbang / currentMonthsCount)),
        // Numerator & Denominators for table
        num_ds: g.jumlah_balita_ditimbang_dan_diukur / currentMonthsCount,
        den_ds: g.jumlah_balita_bulan_ini / currentMonthsCount,
        num_nd_rill: g.jumlah_balita_naik_berat_badannya_n / currentMonthsCount,
        den_nd_rill: g.jumlah_balita_ditimbang / currentMonthsCount,
        num_nd_koreksi: g.jumlah_balita_naik_berat_badannya_n / currentMonthsCount,
        den_nd_koreksi: g.jumlah_balita_ditimbang_terkoreksi_daksen / currentMonthsCount
    }));

    return { metrics, summaryTable };
}

// ───────────────────────────────────────────────────────────────────────────────
// AGE BREAKDOWN (NEW 2026) — Breakdown Metrik per Kelompok Usia
// ───────────────────────────────────────────────────────────────────────────────

export interface AgeGroupBreakdown {
    /** Apakah data 2026 tersedia */
    isAvailable: boolean;
    /** 0-23 bulan */
    usia_0_23: {
        sasaran: number;
        ditimbang: number;
        diukur_pbtb: number;
        ditimbang_dan_diukur: number;
        pct_ditimbang: number;
        pct_diukur_pbtb: number;
        pct_ditimbang_dan_diukur: number;
    };
    /** 24-59 bulan */
    usia_24_59: {
        sasaran: number;
        ditimbang: number;
        diukur_pbtb: number;
        ditimbang_dan_diukur: number;
        pct_ditimbang: number;
        pct_diukur_pbtb: number;
        pct_ditimbang_dan_diukur: number;
    };
    /** 0-59 bulan (total) */
    usia_0_59: {
        sasaran: number;
        ditimbang: number;
        diukur_pbtb: number;
        ditimbang_dan_diukur: number;
        pct_ditimbang: number;
        pct_diukur_pbtb: number;
        pct_ditimbang_dan_diukur: number;
    };
}

/**
 * Hitung breakdown metrik pemantauan berdasarkan kelompok usia (0-23, 24-59, 0-59).
 * Hanya tersedia untuk data 2026+. Pada data 2025, `isAvailable = false`.
 * @param data TransactionData[] dari query Supabase
 * @param monthsCount jumlah bulan dalam periode (untuk rata-rata TW)
 */
export function calculateAgeGroupBreakdown(
    data: TransactionData[],
    monthsCount: number = 1
): AgeGroupBreakdown {
    const safeSum = (col: string) => data.reduce((s, r) => s + (Number(r[col]) || 0), 0);
    const calcDiv = (n: number, d: number) => d > 0 ? Number(((n / d) * 100).toFixed(2)) : 0;

    // Cek apakah data 2026 tersedia (minimal ada satu row dengan nilai kolom baru > 0)
    const has2026Data = data.some(r =>
        (Number(r.jumlah_balita_usia_0_23_bulan_ini) || 0) > 0 ||
        (Number(r.jumlah_balita_usia_24_59_bulan_ini) || 0) > 0
    );

    if (!has2026Data) {
        const emptyGroup = { sasaran: 0, ditimbang: 0, diukur_pbtb: 0, ditimbang_dan_diukur: 0, pct_ditimbang: 0, pct_diukur_pbtb: 0, pct_ditimbang_dan_diukur: 0 };
        return { isAvailable: false, usia_0_23: emptyGroup, usia_24_59: emptyGroup, usia_0_59: emptyGroup };
    }

    // 0-23 bulan
    const s023 = safeSum("jumlah_balita_usia_0_23_bulan_ini") / monthsCount;
    const d023 = safeSum("jumlah_balita_usia_0_23_bulan_ditimbang") / monthsCount;
    const ukur023 = safeSum("jumlah_balita_usia_0_23_bulan_diukur_pbtb") / monthsCount;
    const du023 = safeSum("jumlah_balita_usia_0_23_bulan_ditimbang_dan_diukur") / monthsCount;

    // 24-59 bulan
    const s2459 = safeSum("jumlah_balita_usia_24_59_bulan_ini") / monthsCount;
    const d2459 = safeSum("jumlah_balita_usia_24_59_bulan_ditimbang") / monthsCount;
    const ukur2459 = safeSum("jumlah_balita_usia_24_59_bulan_diukur_pbtb") / monthsCount;
    const du2459 = safeSum("jumlah_balita_usia_24_59_bulan_ditimbang_dan_diukur") / monthsCount;

    // 0-59 bulan (dari kolom total 2026)
    const s059 = safeSum("jumlah_balita_usia_0_59_bulan_ini") / monthsCount;
    const d059 = safeSum("jumlah_balita_usia_0_59_bulan_ditimbang") / monthsCount;
    const ukur059 = safeSum("jumlah_balita_usia_0_59_bulan_diukur_pbtb") / monthsCount;
    const du059 = safeSum("jumlah_balita_usia_0_59_bulan_ditimbang_dan_diukur") / monthsCount;

    return {
        isAvailable: true,
        usia_0_23: {
            sasaran: Math.round(s023),
            ditimbang: Math.round(d023),
            diukur_pbtb: Math.round(ukur023),
            ditimbang_dan_diukur: Math.round(du023),
            pct_ditimbang: calcDiv(d023, s023),
            pct_diukur_pbtb: calcDiv(ukur023, s023),
            pct_ditimbang_dan_diukur: calcDiv(du023, s023)
        },
        usia_24_59: {
            sasaran: Math.round(s2459),
            ditimbang: Math.round(d2459),
            diukur_pbtb: Math.round(ukur2459),
            ditimbang_dan_diukur: Math.round(du2459),
            pct_ditimbang: calcDiv(d2459, s2459),
            pct_diukur_pbtb: calcDiv(ukur2459, s2459),
            pct_ditimbang_dan_diukur: calcDiv(du2459, s2459)
        },
        usia_0_59: {
            sasaran: Math.round(s059),
            ditimbang: Math.round(d059),
            diukur_pbtb: Math.round(ukur059),
            ditimbang_dan_diukur: Math.round(du059),
            pct_ditimbang: calcDiv(d059, s059),
            pct_diukur_pbtb: calcDiv(ukur059, s059),
            pct_ditimbang_dan_diukur: calcDiv(du059, s059)
        }
    };
}

// ───────────────────────────────────────────────────────────────────────────────
// TREND METRICS
// ───────────────────────────────────────────────────────────────────────────────

export interface TrendDataPoint {
    bulan: number;
    bulanName: string;
    "Balita ditimbang (Proyeksi)": number;
    "Balita ditimbang (Data Rill)": number;
    "Balita ditimbang & diukur": number;
    "Balita diukur PB/TB": number;
    "Balita memiliki Buku KIA": number;
    "Balita Naik BB": number;
    "Balita Naik dengan D Koreksi": number;
    "Balita Tidak Naik BB": number;
    "Balita Tidak Timbang Bulan Lalu": number;
    "Prevalensi Stunting": number;
    "Prevalensi Wasting": number;
    "Prevalensi Underweight": number;
    "Prevalensi Overweight": number;
}

export function calculateTrendMetrics(yearData: TransactionData[]): TrendDataPoint[] {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    const trendData: TrendDataPoint[] = [];

    const safeSum = (data: TransactionData[], col: string) =>
        data.reduce((sum, row) => sum + (Number(row[col]) || 0), 0);
    const resolvedMonthSum = (data: TransactionData[], resolver: (r: TransactionData) => number) =>
        data.reduce((s, r) => s + resolver(r), 0);
    const calcDiv = (num: number, den: number) => (den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0);

    for (let m = 1; m <= 12; m++) {
        const monthData = yearData.filter(d => Number(d.bulan) === m);

        if (monthData.length === 0) {
            trendData.push({
                bulan: m, bulanName: months[m - 1],
                "Balita ditimbang (Proyeksi)": 0, "Balita ditimbang (Data Rill)": 0,
                "Balita ditimbang & diukur": 0, "Balita diukur PB/TB": 0,
                "Balita memiliki Buku KIA": 0, "Balita Naik BB": 0,
                "Balita Naik dengan D Koreksi": 0, "Balita Tidak Naik BB": 0,
                "Balita Tidak Timbang Bulan Lalu": 0, "Prevalensi Stunting": 0,
                "Prevalensi Wasting": 0, "Prevalensi Underweight": 0, "Prevalensi Overweight": 0,
            });
            continue;
        }

        const total_bulan_ini = resolvedMonthSum(monthData, resolveBulanIni);
        const total_sasaran = safeSum(monthData, "jumlah_sasaran_balita");
        const total_ditimbang_terkoreksi = safeSum(monthData, "jumlah_balita_ditimbang_terkoreksi_daksen");
        const total_timbang = resolvedMonthSum(monthData, resolveDitimbang);
        const total_timbang_ukur = resolvedMonthSum(monthData, resolveDitimbangDanDiukur);
        const total_ukur_pbtb = resolvedMonthSum(monthData, resolveDiukurPBTB);

        trendData.push({
            bulan: m,
            bulanName: months[m - 1],
            "Balita ditimbang (Proyeksi)": calcDiv(total_timbang, total_sasaran),
            "Balita ditimbang (Data Rill)": calcDiv(total_timbang, total_bulan_ini),
            "Balita ditimbang & diukur": calcDiv(total_timbang_ukur, total_bulan_ini),
            "Balita diukur PB/TB": calcDiv(total_ukur_pbtb, total_bulan_ini),
            "Balita memiliki Buku KIA": calcDiv(safeSum(monthData, "jumlah_balita_punya_kia"), total_bulan_ini),
            "Balita Naik BB": calcDiv(safeSum(monthData, "jumlah_balita_naik_berat_badannya_n"), total_bulan_ini),
            "Balita Naik dengan D Koreksi": calcDiv(safeSum(monthData, "jumlah_balita_naik_berat_badannya_n"), total_ditimbang_terkoreksi),
            "Balita Tidak Naik BB": calcDiv(safeSum(monthData, "jumlah_balita_tidak_naik_berat_badannya_t"), total_bulan_ini),
            "Balita Tidak Timbang Bulan Lalu": calcDiv(safeSum(monthData, "jumlah_balita_tidak_ditimbang_bulan_lalu_o"), total_bulan_ini),
            "Prevalensi Stunting": calcDiv(safeSum(monthData, "jumlah_balita_stunting"), total_ukur_pbtb),
            "Prevalensi Wasting": calcDiv(safeSum(monthData, "jumlah_balita_wasting"), total_timbang_ukur),
            "Prevalensi Underweight": calcDiv(safeSum(monthData, "jumlah_balita_underweight"), total_timbang),
            "Prevalensi Overweight": calcDiv(safeSum(monthData, "jumlah_balita_overweight"), total_timbang),
        });
    }

    return trendData;
}
