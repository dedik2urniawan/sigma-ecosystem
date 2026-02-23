// src/lib/asiMpasiHelper.ts

export const ASI_MPASI_COLUMNS = [
    "jumlah_bayi_baru_lahir_bulan_ini_b",
    "jumlah_bayi_mendapat_imd",
    "jumlah_bayi_usia_0_5_bulan",
    "jumlah_bayi_usia_0_5_bulan_yang_direcall",
    "jumlah_bayi_usia_0_5_bulan_yang_mendapat_asi_eksklusif_berdasar",
    "jumlah_bayi_usia_6_bulan",
    "jumlah_bayi_asi_eksklusif_sampai_6_bulan",
    "jumlah_anak_usia_6_23_bulan",
    "jumlah_anak_usia_6_23_bulan_yang_diwawancarai",
    "jumlah_anak_usia_6_23_bulan_yang_mengkonsumsi_makanan_dan_minum",
    "jumlah_anak_usia_6_23_bulan_yang_mengkonsumsi_telur_ikan_dan_at",
    "jumlah_anak_usia_6_23_bulan_yang_mendapat_mpasi_baik"
];

export interface AsiMpasiMetricsResult {
    summaryTable: any[];
    overallMetrics: {
        imd: number;
        recall_0_5: number;
        asi_0_5: number;
        asi_6: number;
        wawancara_6_23: number;
        mpasi_5_8: number;
        mpasi_telur_ikan_daging: number;
        mpasi_baik: number;
    };
    mapData: any[]; // Used for Chloropleth
}

export function calculateAsiMpasiMetrics(
    data: any[],
    groupingRole: "superadmin" | "admin_puskesmas",
    selectedMonthIndex: string | number // 'ALL' or month number like 1, 2, ...
): AsiMpasiMetricsResult {
    const isPerKelurahan = groupingRole === "admin_puskesmas";
    const grouping: Record<string, any> = {};

    // For Capaian MPASI (Average), we need to handle specific logic.
    // However, if the user requested TW logic: 
    // TW1: Month 3
    // TW2: Avg(Month 3, 6)
    // TW3: Avg(Month 3, 6, 9)
    // TW4: Avg(Month 3, 6, 9, 12)
    // We will do this average in the frontend pre-filtering or right here.
    // If we receive the full dataset spanning the selected months, we need to apply it correctly.

    // Let's implement the standard sums first, then specific averages.

    // Safety check
    if (!data || data.length === 0) {
        return {
            summaryTable: [],
            overallMetrics: {
                imd: 0,
                recall_0_5: 0,
                asi_0_5: 0,
                asi_6: 0,
                wawancara_6_23: 0,
                mpasi_5_8: 0,
                mpasi_telur_ikan_daging: 0,
                mpasi_baik: 0
            },
            mapData: []
        };
    }

    let overall = {
        imd_num: 0, imd_den: 0,
        recall_num: 0, recall_den: 0,
        asi_0_5_num: 0, asi_0_5_den: 0,
        asi_6_num: 0, asi_6_den: 0,
        wawancara_num: 0, wawancara_den: 0,
        mpasi_5_8_num: 0, mpasi_5_8_den: 0,
        mpasi_telur_num: 0, mpasi_telur_den: 0,
        mpasi_baik_num: 0, mpasi_baik_den: 0,
    };

    // MPASI metrics only take values from months 3, 6, 9, 12.
    const mpasiMonths = [3, 6, 9, 12];

    // Tentukan bulan maksimal dari data untuk menentukan divisor average
    const uniqueMpasiMonths = new Set(data.map(d => d.bulan).filter(m => mpasiMonths.includes(m)));
    const mpasiDivisor = uniqueMpasiMonths.size > 0 ? uniqueMpasiMonths.size : 1;

    data.forEach(row => {
        const key = isPerKelurahan ? row.kelurahan : row.puskesmas;
        if (!grouping[key]) {
            grouping[key] = {
                name: key,
                imd_num: 0, imd_den: 0,
                recall_num: 0, recall_den: 0,
                asi_0_5_num: 0, asi_0_5_den: 0,
                asi_6_num: 0, asi_6_den: 0,
                wawancara_num: 0, wawancara_den: 0,
                mpasi_5_8_num: 0, mpasi_5_8_den: 0,
                mpasi_telur_num: 0, mpasi_telur_den: 0,
                mpasi_baik_num: 0, mpasi_baik_den: 0,
                puskesmas: row.puskesmas // maintain mapping
            };
        }

        // ASI: SUM
        const bbl = Number(row.jumlah_bayi_baru_lahir_bulan_ini_b) || 0;
        const imd = Number(row.jumlah_bayi_mendapat_imd) || 0;

        const bayi_0_5 = Number(row.jumlah_bayi_usia_0_5_bulan) || 0;
        const bayi_0_5_recall = Number(row.jumlah_bayi_usia_0_5_bulan_yang_direcall) || 0;
        const bayi_0_5_asi = Number(row.jumlah_bayi_usia_0_5_bulan_yang_mendapat_asi_eksklusif_berdasar) || 0;

        const bayi_6 = Number(row.jumlah_bayi_usia_6_bulan) || 0;
        const bayi_6_asi = Number(row.jumlah_bayi_asi_eksklusif_sampai_6_bulan) || 0;

        grouping[key].imd_num += imd;
        grouping[key].imd_den += bbl;
        grouping[key].recall_num += bayi_0_5_recall;
        grouping[key].recall_den += bayi_0_5;
        grouping[key].asi_0_5_num += bayi_0_5_asi;
        grouping[key].asi_0_5_den += bayi_0_5_recall;
        grouping[key].asi_6_num += bayi_6_asi;
        grouping[key].asi_6_den += bayi_6;

        overall.imd_num += imd;
        overall.imd_den += bbl;
        overall.recall_num += bayi_0_5_recall;
        overall.recall_den += bayi_0_5;
        overall.asi_0_5_num += bayi_0_5_asi;
        overall.asi_0_5_den += bayi_0_5_recall;
        overall.asi_6_num += bayi_6_asi;
        overall.asi_6_den += bayi_6;

        // MPASI: AVERAGE (Only if month is 3, 6, 9, or 12)
        if (mpasiMonths.includes(Number(row.bulan))) {
            const anak_6_23 = Number(row.jumlah_anak_usia_6_23_bulan) || 0;
            const anak_6_23_wawancara = Number(row.jumlah_anak_usia_6_23_bulan_yang_diwawancarai) || 0;
            const anak_6_23_mpasi_5_8 = Number(row.jumlah_anak_usia_6_23_bulan_yang_mengkonsumsi_makanan_dan_minum) || 0;
            const anak_6_23_mpasi_telur = Number(row.jumlah_anak_usia_6_23_bulan_yang_mengkonsumsi_telur_ikan_dan_at) || 0;
            const anak_6_23_mpasi_baik = Number(row.jumlah_anak_usia_6_23_bulan_yang_mendapat_mpasi_baik) || 0;

            grouping[key].wawancara_num += anak_6_23_wawancara;
            grouping[key].wawancara_den += anak_6_23;
            grouping[key].mpasi_5_8_num += anak_6_23_mpasi_5_8;
            grouping[key].mpasi_5_8_den += anak_6_23_wawancara;
            grouping[key].mpasi_telur_num += anak_6_23_mpasi_telur;
            grouping[key].mpasi_telur_den += anak_6_23_wawancara;
            grouping[key].mpasi_baik_num += anak_6_23_mpasi_baik;
            grouping[key].mpasi_baik_den += anak_6_23_wawancara;

            overall.wawancara_num += anak_6_23_wawancara;
            overall.wawancara_den += anak_6_23;
            overall.mpasi_5_8_num += anak_6_23_mpasi_5_8;
            overall.mpasi_5_8_den += anak_6_23_wawancara;
            overall.mpasi_telur_num += anak_6_23_mpasi_telur;
            overall.mpasi_telur_den += anak_6_23_wawancara;
            overall.mpasi_baik_num += anak_6_23_mpasi_baik;
            overall.mpasi_baik_den += anak_6_23_wawancara;
        }
    });

    const calcDiv = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);

    const summaryTable = Object.values(grouping).map(g => {
        // MPASI is Average, but mathematically (Sum(Num) / n) / (Sum(Den) / n) == Sum(Num) / Sum(Den)
        // Therefore calcDiv works perfectly without dividing by mpasiDivisor, as long as we only included those months.

        return {
            name: g.name,
            puskesmas: g.puskesmas,
            imd_rate: calcDiv(g.imd_num, g.imd_den),
            recall_rate: calcDiv(g.recall_num, g.recall_den),
            asi_0_5_rate: calcDiv(g.asi_0_5_num, g.asi_0_5_den),
            asi_6_rate: calcDiv(g.asi_6_num, g.asi_6_den),
            wawancara_rate: calcDiv(g.wawancara_num, g.wawancara_den),
            mpasi_5_8_rate: calcDiv(g.mpasi_5_8_num, g.mpasi_5_8_den),
            mpasi_telur_rate: calcDiv(g.mpasi_telur_num, g.mpasi_telur_den),
            mpasi_baik_rate: calcDiv(g.mpasi_baik_num, g.mpasi_baik_den),
            // Denom to decide if we should render it or not (e.g. 0 responses)
            wawancara_den: g.wawancara_den,
            asi_0_5_den: g.asi_0_5_den
        };
    }).sort((a, b) => a.name.localeCompare(b.name));

    return {
        summaryTable,
        overallMetrics: {
            imd: calcDiv(overall.imd_num, overall.imd_den),
            recall_0_5: calcDiv(overall.recall_num, overall.recall_den),
            asi_0_5: calcDiv(overall.asi_0_5_num, overall.asi_0_5_den),
            asi_6: calcDiv(overall.asi_6_num, overall.asi_6_den),
            wawancara_6_23: calcDiv(overall.wawancara_num, overall.wawancara_den),
            mpasi_5_8: calcDiv(overall.mpasi_5_8_num, overall.mpasi_5_8_den),
            mpasi_telur_ikan_daging: calcDiv(overall.mpasi_telur_num, overall.mpasi_telur_den),
            mpasi_baik: calcDiv(overall.mpasi_baik_num, overall.mpasi_baik_den)
        },
        mapData: summaryTable.map(s => ({
            name: s.name,
            puskesmas: s.puskesmas,
            "asi_0_5": s.asi_0_5_rate,
            "asi_6": s.asi_6_rate,
            "mpasi_telur": s.mpasi_telur_rate,
            "mpasi_baik": s.mpasi_baik_rate
        }))
    };
}
