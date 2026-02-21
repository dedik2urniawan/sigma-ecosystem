// src/lib/balitaGiziHelper.ts

export const MANDATORY_COLUMNS = [
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
    "jumlah_bayi_mendapat_imd",
    "jumlah_bayi_usia_6_bulan",
    "jumlah_bayi_asi_eksklusif_sampai_6_bulan",
    "jumlah_anak_usia_6_23_bulan",
    "jumlah_bayi_6_11_bulan_mendapat_vitamin_a",
    "jumlah_anak_12_59_bulan_mendapat_vitamin_a",
    "jumlah_balita_yang_mendapatkan_suplementasi_gizi_mikro"
];

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

export function calculateCompliance(
    refDesa: RefDesa[],
    transactionData: TransactionData[],
    monthsCount: number,
    role: "superadmin" | "admin_puskesmas"
) {
    // Determine the unique targets based on ref_desa
    const targets = refDesa.map(d => ({
        puskesmas: d.nama_puskesmas.trim().toLowerCase(),
        kelurahan: d.nama_kelurahan.trim().toLowerCase(),
        originalPuskesmas: d.nama_puskesmas,
        originalKelurahan: d.nama_kelurahan
    }));

    // Find all submitted kelurahan-bulan combinations
    const submittedSet = new Set(
        transactionData.map(t => `${t.puskesmas.trim().toLowerCase()}-${t.kelurahan.trim().toLowerCase()}-${t.bulan}`)
    );

    // Groupings
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

        // Target for this Kelurahan is 1 report per month in the period
        const targetForKelurahan = monthsCount || 1;

        puskesmasStats[t.originalPuskesmas].target += targetForKelurahan;
        desaStats[desaKey].target += targetForKelurahan;
        totalTarget += targetForKelurahan;

        // Check how many months they actually submitted
        // If TW1 (monthsCount=3), transaction data should have up to 3 records. We just count how many match in the set.
        // But since we only have `submittedSet` of the actual data passed in, we can just iterate the transaction data
        // Or cleaner: just count from transactionData directly for this specific kelurahan since transactionData only has filtered months.
    }

    // Process actual submissions for matched kelurahan
    for (const t of transactionData) {
        const pKey = t.puskesmas.trim().toLowerCase();
        const kKey = t.kelurahan.trim().toLowerCase();

        // Find matching target to get original casing
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

    let chartData = [];
    let detailList = [];

    if (role === "superadmin") {
        chartData = Object.keys(puskesmasStats).map(p => ({
            name: p,
            rate: puskesmasStats[p].target > 0 ? (puskesmasStats[p].submitted / puskesmasStats[p].target) * 100 : 0,
            submitted: puskesmasStats[p].submitted,
            desaCount: puskesmasStats[p].desaCount,
            targetCount: puskesmasStats[p].target
        })).sort((a, b) => b.rate - a.rate);

        detailList = chartData; // For Superadmin, detail list is the Puskesmas summary
    } else {
        // Admin Puskesmas: show Kelurahan/Desa breakdown
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

    return {
        overallRate,
        chartData,
        detailTable: detailList
    };
}

export function calculateCompleteness(
    refDesa: RefDesa[],
    transactionData: TransactionData[],
    monthsCount: number,
    role: "superadmin" | "admin_puskesmas"
) {
    // If no targets, return 0
    if (refDesa.length === 0) {
        return { overallRate: 0, columnCompleteness: [], chartData: [], detailTable: [] };
    }

    // Total Expected Cells = (Total Target Kelurahan * monthsCount) * Mandatory Columns Count
    // e.g. 390 villages * 3 months (TW) = 1170 forms expected. 1170 * 19 cells = 22230 total cells expected.
    const totalFormsExpected = refDesa.length * (monthsCount || 1);
    const totalCellsExpected = totalFormsExpected * MANDATORY_COLUMNS.length;
    let totalCellsFilled = 0;

    const columnStats: Record<string, number> = {};
    MANDATORY_COLUMNS.forEach(c => columnStats[c] = 0);

    const puskesmasGrouping: Record<string, { expectedForms: number; filledCells: number; desaCount: number }> = {};
    const desaGrouping: Record<string, { expectedForms: number; filledCells: number; puskesmas: string; kelurahan: string }> = {};

    // Initialize groupings based on refDesa to ensure all targets are accounted for even if 0 forms submitted
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
        // We need to map row to the original case target
        const pKey = row.puskesmas.trim().toLowerCase();
        const kKey = row.kelurahan.trim().toLowerCase();

        const matchedTarget = refDesa.find(target =>
            target.nama_puskesmas.trim().toLowerCase() === pKey &&
            target.nama_kelurahan.trim().toLowerCase() === kKey
        );

        const targetPuskesmas = matchedTarget ? matchedTarget.nama_puskesmas : row.puskesmas;
        const targetDesaKey = matchedTarget ? `${matchedTarget.nama_puskesmas}-${matchedTarget.nama_kelurahan}` : null;

        for (const col of MANDATORY_COLUMNS) {
            const val = row[col];
            // Check if filled (not null, undefined or empty string)
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
        // Calculate missing rate based on totalFormsExpected
        rate: totalFormsExpected > 0 ? (columnStats[c] / totalFormsExpected) * 100 : 0
    })).sort((a, b) => a.rate - b.rate); // Sort lowest to highest

    let chartData = [];
    let detailList = [];

    if (role === "superadmin") {
        chartData = Object.keys(puskesmasGrouping).map(p => {
            const expectedCells = puskesmasGrouping[p].expectedForms * MANDATORY_COLUMNS.length;
            return {
                name: p,
                rate: expectedCells > 0 ? (puskesmasGrouping[p].filledCells / expectedCells) * 100 : 0,
                desaCount: puskesmasGrouping[p].desaCount
            };
        }).sort((a, b) => b.rate - a.rate);

        detailList = chartData;
    } else {
        chartData = Object.keys(desaGrouping).map(k => {
            const expectedCells = desaGrouping[k].expectedForms * MANDATORY_COLUMNS.length;
            return {
                name: desaGrouping[k].kelurahan,
                rate: expectedCells > 0 ? (desaGrouping[k].filledCells / expectedCells) * 100 : 0
            };
        }).sort((a, b) => b.rate - a.rate);

        detailList = chartData;
    }

    return {
        overallRate,
        columnCompleteness,
        chartData,
        detailTable: detailList
    };
}

// -------------------------------------------------------------------------------- //
// 📊 Analisis Pertumbuhan & Perkembangan Balita
// -------------------------------------------------------------------------------- //

export interface GrowthMetricsResult {
    metrics: Record<string, { current: number; previous: number; delta: number; isPositive: boolean }>;
    summaryTable: any[];
}

export function calculateGrowthMetrics(
    currentData: TransactionData[],
    previousData: TransactionData[],
    role: "superadmin" | "admin_puskesmas",
    currentMonthsCount: number = 1,
    previousMonthsCount: number = 1
): GrowthMetricsResult {

    const safeSum = (data: TransactionData[], col: string) => {
        return data.reduce((sum, row) => sum + (Number(row[col]) || 0), 0);
    };

    // --- AGGREGATE CURRENT DATA (AVERAGED BY MONTHS COUNT) ---
    const total_bulan_ini = safeSum(currentData, "jumlah_balita_bulan_ini") / currentMonthsCount;
    const total_sasaran = safeSum(currentData, "jumlah_sasaran_balita") / currentMonthsCount;
    const total_ditimbang_terkoreksi = safeSum(currentData, "jumlah_balita_ditimbang_terkoreksi_daksen") / currentMonthsCount;
    const total_timbang_balita = safeSum(currentData, "jumlah_balita_ditimbang") / currentMonthsCount;
    const total_timbang_ukur_balita = safeSum(currentData, "jumlah_balita_ditimbang_dan_diukur") / currentMonthsCount;
    const total_jumlah_balita_diukur_pbtb = safeSum(currentData, "jumlah_balita_diukur_pbtb") / currentMonthsCount;

    // --- AGGREGATE PREVIOUS DATA (AVERAGED BY MONTHS COUNT) ---
    const prev_total_bulan_ini = safeSum(previousData, "jumlah_balita_bulan_ini") / previousMonthsCount;
    const prev_total_sasaran = safeSum(previousData, "jumlah_sasaran_balita") / previousMonthsCount;
    const prev_total_ditimbang_terkoreksi = safeSum(previousData, "jumlah_balita_ditimbang_terkoreksi_daksen") / previousMonthsCount;
    const prev_total_timbang_balita = safeSum(previousData, "jumlah_balita_ditimbang") / previousMonthsCount;
    const prev_total_timbang_ukur_balita = safeSum(previousData, "jumlah_balita_ditimbang_dan_diukur") / previousMonthsCount;
    const prev_total_jumlah_balita_diukur_pbtb = safeSum(previousData, "jumlah_balita_diukur_pbtb") / previousMonthsCount;

    // Helper for safe division (Percentage)
    const calcDiv = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);

    // Helper structural builder
    const buildMetric = (currNum: number, currDen: number, prevNum: number, prevDen: number, higherIsBetter: boolean = true) => {
        const current = calcDiv(currNum, currDen);
        const previous = calcDiv(prevNum, prevDen);
        const delta = current - previous;
        // if higher is better, positive delta is good. If lower is better (like Stunting), negative delta is "Positive/Good".
        const isPositive = higherIsBetter ? delta >= 0 : delta <= 0;
        return { current, previous, delta, isPositive };
    };

    const metrics = {
        "Balita ditimbang (Proyeksi)": buildMetric(
            (safeSum(currentData, "jumlah_balita_ditimbang") / currentMonthsCount), total_sasaran,
            (safeSum(previousData, "jumlah_balita_ditimbang") / previousMonthsCount), prev_total_sasaran
        ),
        "Balita ditimbang (Data Rill)": buildMetric(
            (safeSum(currentData, "jumlah_balita_ditimbang") / currentMonthsCount), total_bulan_ini,
            (safeSum(previousData, "jumlah_balita_ditimbang") / previousMonthsCount), prev_total_bulan_ini
        ),
        "Balita ditimbang & diukur": buildMetric(
            (safeSum(currentData, "jumlah_balita_ditimbang_dan_diukur") / currentMonthsCount), total_bulan_ini,
            (safeSum(previousData, "jumlah_balita_ditimbang_dan_diukur") / previousMonthsCount), prev_total_bulan_ini
        ),
        "Balita diukur PB/TB": buildMetric(
            (safeSum(currentData, "jumlah_balita_diukur_pbtb") / currentMonthsCount), total_bulan_ini,
            (safeSum(previousData, "jumlah_balita_diukur_pbtb") / previousMonthsCount), prev_total_bulan_ini
        ),
        "Balita memiliki Buku KIA": buildMetric(
            (safeSum(currentData, "jumlah_balita_punya_kia") / currentMonthsCount), total_bulan_ini,
            (safeSum(previousData, "jumlah_balita_punya_kia") / previousMonthsCount), prev_total_bulan_ini
        ),
        "Balita Naik BB": buildMetric(
            (safeSum(currentData, "jumlah_balita_naik_berat_badannya_n") / currentMonthsCount), total_bulan_ini,
            (safeSum(previousData, "jumlah_balita_naik_berat_badannya_n") / previousMonthsCount), prev_total_bulan_ini
        ),
        "Balita Naik dengan D Koreksi": buildMetric(
            (safeSum(currentData, "jumlah_balita_naik_berat_badannya_n") / currentMonthsCount), total_ditimbang_terkoreksi,
            (safeSum(previousData, "jumlah_balita_naik_berat_badannya_n") / previousMonthsCount), prev_total_ditimbang_terkoreksi
        ),
        "Balita Tidak Naik BB": buildMetric(
            (safeSum(currentData, "jumlah_balita_tidak_naik_berat_badannya_t") / currentMonthsCount), total_bulan_ini,
            (safeSum(previousData, "jumlah_balita_tidak_naik_berat_badannya_t") / previousMonthsCount), prev_total_bulan_ini,
            false // Lower is better
        ),
        "Balita Tidak Timbang Bulan Lalu": buildMetric(
            (safeSum(currentData, "jumlah_balita_tidak_ditimbang_bulan_lalu_o") / currentMonthsCount), total_bulan_ini,
            (safeSum(previousData, "jumlah_balita_tidak_ditimbang_bulan_lalu_o") / previousMonthsCount), prev_total_bulan_ini,
            false // Lower is better
        ),
        "Prevalensi Stunting": buildMetric(
            (safeSum(currentData, "jumlah_balita_stunting") / currentMonthsCount), total_jumlah_balita_diukur_pbtb,
            (safeSum(previousData, "jumlah_balita_stunting") / previousMonthsCount), prev_total_jumlah_balita_diukur_pbtb,
            false
        ),
        "Prevalensi Wasting": buildMetric(
            (safeSum(currentData, "jumlah_balita_wasting") / currentMonthsCount), total_timbang_ukur_balita,
            (safeSum(previousData, "jumlah_balita_wasting") / previousMonthsCount), prev_total_timbang_ukur_balita,
            false
        ),
        "Prevalensi Underweight": buildMetric(
            (safeSum(currentData, "jumlah_balita_underweight") / currentMonthsCount), total_timbang_balita,
            (safeSum(previousData, "jumlah_balita_underweight") / previousMonthsCount), prev_total_timbang_balita,
            false
        ),
        "Prevalensi Overweight": buildMetric(
            (safeSum(currentData, "jumlah_balita_overweight") / currentMonthsCount), total_timbang_balita,
            (safeSum(previousData, "jumlah_balita_overweight") / previousMonthsCount), prev_total_timbang_balita,
            false
        ),
    };

    // Calculate Summary Table Grouping
    const summaryGrouping: Record<string, any> = {};

    currentData.forEach(row => {
        const groupKey = role === "superadmin" ? row.puskesmas : row.kelurahan;
        if (!summaryGrouping[groupKey]) {
            summaryGrouping[groupKey] = {
                name: groupKey,
                jumlah_sasaran_balita: 0,
                jumlah_balita_bulan_ini: 0,
                jumlah_balita_ditimbang_dan_diukur: 0,
                jumlah_balita_naik_berat_badannya_n: 0,
                jumlah_balita_ditimbang_terkoreksi_daksen: 0,
                jumlah_balita_ditimbang: 0,
                jumlah_balita_diukur_pbtb: 0,
                jumlah_balita_stunting: 0,
                jumlah_balita_wasting: 0,
                jumlah_balita_underweight: 0,
                jumlah_balita_overweight: 0
            };
        }

        const group = summaryGrouping[groupKey];
        group.jumlah_sasaran_balita += (Number(row.jumlah_sasaran_balita) || 0);
        group.jumlah_balita_bulan_ini += (Number(row.jumlah_balita_bulan_ini) || 0);
        group.jumlah_balita_ditimbang_dan_diukur += (Number(row.jumlah_balita_ditimbang_dan_diukur) || 0);
        group.jumlah_balita_naik_berat_badannya_n += (Number(row.jumlah_balita_naik_berat_badannya_n) || 0);
        group.jumlah_balita_ditimbang_terkoreksi_daksen += (Number(row.jumlah_balita_ditimbang_terkoreksi_daksen) || 0);
        group.jumlah_balita_ditimbang += (Number(row.jumlah_balita_ditimbang) || 0);

        group.jumlah_balita_diukur_pbtb += (Number(row.jumlah_balita_diukur_pbtb) || 0);
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
        // Nutrition map metrics (calculating percentages remains identical mathematically, but we map absolute values if needed)
        stunting: calcDiv((g.jumlah_balita_stunting / currentMonthsCount), (g.jumlah_balita_diukur_pbtb / currentMonthsCount)),
        wasting: calcDiv((g.jumlah_balita_wasting / currentMonthsCount), (g.jumlah_balita_ditimbang_dan_diukur / currentMonthsCount)),
        underweight: calcDiv((g.jumlah_balita_underweight / currentMonthsCount), (g.jumlah_balita_ditimbang / currentMonthsCount)),
        obesitas: calcDiv((g.jumlah_balita_overweight / currentMonthsCount), (g.jumlah_balita_ditimbang / currentMonthsCount))
    }));

    return { metrics, summaryTable };
}

// -------------------------------------------------------------------------------- //
// 📈 Tren Indikator Pertumbuhan dan Perkembangan
// -------------------------------------------------------------------------------- //

export interface TrendDataPoint {
    bulan: number;
    bulanName: string;
    // Essential
    "Balita ditimbang (Proyeksi)": number;
    "Balita ditimbang (Data Rill)": number;
    "Balita ditimbang & diukur": number;
    "Balita diukur PB/TB": number;
    "Balita memiliki Buku KIA": number;
    "Balita Naik BB": number;
    "Balita Naik dengan D Koreksi": number;
    "Balita Tidak Naik BB": number;
    "Balita Tidak Timbang Bulan Lalu": number;
    // Nutrition
    "Prevalensi Stunting": number;
    "Prevalensi Wasting": number;
    "Prevalensi Underweight": number;
    "Prevalensi Overweight": number;
}

export function calculateTrendMetrics(yearData: TransactionData[]): TrendDataPoint[] {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    const trendData: TrendDataPoint[] = [];

    const safeSum = (data: TransactionData[], col: string) => {
        return data.reduce((sum, row) => sum + (Number(row[col]) || 0), 0);
    };
    const calcDiv = (num: number, den: number) => (den > 0 ? Number(((num / den) * 100).toFixed(2)) : 0);

    for (let m = 1; m <= 12; m++) {
        const monthData = yearData.filter(d => Number(d.bulan) === m);

        if (monthData.length === 0) {
            trendData.push({
                bulan: m,
                bulanName: months[m - 1],
                "Balita ditimbang (Proyeksi)": 0,
                "Balita ditimbang (Data Rill)": 0,
                "Balita ditimbang & diukur": 0,
                "Balita diukur PB/TB": 0,
                "Balita memiliki Buku KIA": 0,
                "Balita Naik BB": 0,
                "Balita Naik dengan D Koreksi": 0,
                "Balita Tidak Naik BB": 0,
                "Balita Tidak Timbang Bulan Lalu": 0,
                "Prevalensi Stunting": 0,
                "Prevalensi Wasting": 0,
                "Prevalensi Underweight": 0,
                "Prevalensi Overweight": 0,
            });
            continue;
        }

        const total_bulan_ini = safeSum(monthData, "jumlah_balita_bulan_ini");
        const total_sasaran = safeSum(monthData, "jumlah_sasaran_balita");
        const total_ditimbang_terkoreksi = safeSum(monthData, "jumlah_balita_ditimbang_terkoreksi_daksen");
        const total_timbang_balita = safeSum(monthData, "jumlah_balita_ditimbang");
        const total_timbang_ukur_balita = safeSum(monthData, "jumlah_balita_ditimbang_dan_diukur");
        const total_jumlah_balita_diukur_pbtb = safeSum(monthData, "jumlah_balita_diukur_pbtb");

        trendData.push({
            bulan: m,
            bulanName: months[m - 1],
            "Balita ditimbang (Proyeksi)": calcDiv(safeSum(monthData, "jumlah_balita_ditimbang"), total_sasaran),
            "Balita ditimbang (Data Rill)": calcDiv(safeSum(monthData, "jumlah_balita_ditimbang"), total_bulan_ini),
            "Balita ditimbang & diukur": calcDiv(safeSum(monthData, "jumlah_balita_ditimbang_dan_diukur"), total_bulan_ini),
            "Balita diukur PB/TB": calcDiv(safeSum(monthData, "jumlah_balita_diukur_pbtb"), total_bulan_ini),
            "Balita memiliki Buku KIA": calcDiv(safeSum(monthData, "jumlah_balita_punya_kia"), total_bulan_ini),
            "Balita Naik BB": calcDiv(safeSum(monthData, "jumlah_balita_naik_berat_badannya_n"), total_bulan_ini),
            "Balita Naik dengan D Koreksi": calcDiv(safeSum(monthData, "jumlah_balita_naik_berat_badannya_n"), total_ditimbang_terkoreksi),
            "Balita Tidak Naik BB": calcDiv(safeSum(monthData, "jumlah_balita_tidak_naik_berat_badannya_t"), total_bulan_ini),
            "Balita Tidak Timbang Bulan Lalu": calcDiv(safeSum(monthData, "jumlah_balita_tidak_ditimbang_bulan_lalu_o"), total_bulan_ini),
            "Prevalensi Stunting": calcDiv(safeSum(monthData, "jumlah_balita_stunting"), total_jumlah_balita_diukur_pbtb),
            "Prevalensi Wasting": calcDiv(safeSum(monthData, "jumlah_balita_wasting"), total_timbang_ukur_balita),
            "Prevalensi Underweight": calcDiv(safeSum(monthData, "jumlah_balita_underweight"), total_timbang_balita),
            "Prevalensi Overweight": calcDiv(safeSum(monthData, "jumlah_balita_overweight"), total_timbang_balita),
        });
    }

    return trendData;
}
