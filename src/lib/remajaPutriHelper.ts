// src/lib/remajaPutriHelper.ts
// Modul Analisis Indikator Remaja Putri SIGMA RCS (Update 2026 Guidance & PRD 2026)

export interface RemajaPutriRawRecord {
    id?: string;
    tahun: number;
    bulan: number;
    kab_kota?: string;
    kecamatan?: string;
    puskesmas: string;
    kelurahan: string;

    // Academic Year
    academic_year?: string;
    academic_year_start?: number;
    academic_year_end?: number;
    academic_month_index?: number;

    // Sasaran
    target_rematri: number;

    // Tablet Tambah Darah (TTD)
    ttd_received_standard: number;
    ttd_consumed_standard: number;
    ttd_received_lt26: number;
    ttd_received_ge26: number;
    ttd_consumed_lt26: number;
    ttd_consumed_ge26: number;

    // Skrining Anemia
    target_grade7: number;
    screened_grade7: number;
    target_grade10: number;
    screened_grade10: number;
    target_grade7_10_uploaded?: number;
    screened_grade7_10_uploaded?: number;

    // Anemia Siswi Kelas 7
    anemia_grade7_mild: number;
    anemia_grade7_moderate: number;
    anemia_grade7_severe: number;
    anemia_grade7_total_uploaded?: number;

    // Anemia Siswi Kelas 10
    anemia_grade10_mild: number;
    anemia_grade10_moderate: number;
    anemia_grade10_severe: number;
    anemia_grade10_total_uploaded?: number;

    // Total Anemia & Tatalaksana
    anemia_total_uploaded?: number;
    anemia_treated: number;

    // Metadata
    waktu_input?: string;
    uploaded_at?: string;
    uploaded_by?: string;
    [key: string]: any;
}

export type RemajaPutriIndicatorKey =
    | "pct_ttd_consumed"
    | "pct_screening_anemia"
    | "pct_anemia"
    | "pct_anemia_treated"
    | "pct_ttd_received"
    | "pct_screening_grade7"
    | "pct_screening_grade10"
    | "pct_anemia_grade7"
    | "pct_anemia_grade10"
    | "pct_mild_share"
    | "pct_moderate_share"
    | "pct_severe_share";

export interface RemajaPutriIndicatorDefinition {
    key: RemajaPutriIndicatorKey;
    domain: "ttd" | "skrining" | "anemia" | "tatalaksana";
    label: string;
    shortLabel: string;
    type: "program" | "supporting";
    target?: number;
    direction: "higher" | "lower";
    unit: "%";
    numeratorLabel: string;
    denominatorLabel: string;
    definition: string;
    formula: string;
    notes?: string;
}

export const REMAJA_PUTRI_INDICATOR_DEFINITIONS: Record<RemajaPutriIndicatorKey, RemajaPutriIndicatorDefinition> = {
    pct_ttd_consumed: {
        key: "pct_ttd_consumed",
        domain: "ttd",
        label: "% Remaja Putri Mengonsumsi TTD Sesuai Standar",
        shortLabel: "% Konsumsi TTD",
        type: "program",
        target: 67,
        direction: "higher",
        unit: "%",
        numeratorLabel: "Rematri Konsumsi TTD Sesuai Standar",
        denominatorLabel: "Jumlah Sasaran Remaja Putri",
        definition: "Persentase remaja putri yang mengonsumsi TTD 1 tablet setiap minggu (minimal 26 tablet dalam setahun) terhadap total sasaran.",
        formula: "Rematri Mengonsumsi TTD Sesuai Standar / Jumlah Sasaran Rematri × 100%",
        notes: "Target Nasional 2026: ≥ 67%. Indikator Program Utama (Higher is better)."
    },
    pct_screening_anemia: {
        key: "pct_screening_anemia",
        domain: "skrining",
        label: "% Remaja Putri Kelas 7 & 10 Diskrining Anemia",
        shortLabel: "% Skrining Anemia",
        type: "program",
        target: 77,
        direction: "higher",
        unit: "%",
        numeratorLabel: "Siswi Kelas 7 & 10 Diskrining Hb",
        denominatorLabel: "Sasaran Siswi Kelas 7 & 10",
        definition: "Persentase siswi kelas 7 (SMP/MTs) dan kelas 10 (SMA/SMK/MA) yang diskrining anemia melalui pemeriksaan kadar hemoglobin (Hb).",
        formula: "(Diskrining Kls 7 + Diskrining Kls 10) / (Sasaran Kls 7 + Sasaran Kls 10) × 100%",
        notes: "Target Nasional 2026: ≥ 77%. Indikator Program Utama (Higher is better)."
    },
    pct_anemia: {
        key: "pct_anemia",
        domain: "anemia",
        label: "% Remaja Putri Teridentifikasi Anemia",
        shortLabel: "% Prevalensi Anemia",
        type: "program",
        target: 23,
        direction: "lower",
        unit: "%",
        numeratorLabel: "Total Rematri Anemia (Hb <12 g/dl)",
        denominatorLabel: "Total Rematri Diskrining",
        definition: "Persentase siswi yang teridentifikasi mengalami anemia (Hb < 12 g/dL) dari seluruh siswi yang diskrining.",
        formula: "(Anemia Ringan + Sedang + Berat Kls 7 & 10) / Total Siswi Diskrining × 100%",
        notes: "Target Nasional 2026: ≤ 23%. Indikator Program Utama (Lower is better)."
    },
    pct_anemia_treated: {
        key: "pct_anemia_treated",
        domain: "tatalaksana",
        label: "% Remaja Putri Anemia Mendapat Tatalaksana",
        shortLabel: "% Tatalaksana Anemia",
        type: "program",
        target: 40,
        direction: "higher",
        unit: "%",
        numeratorLabel: "Rematri Anemia Ditatalaksana",
        denominatorLabel: "Total Rematri Anemia",
        definition: "Persentase siswi anemia yang mendapatkan tatalaksana penanganan (TTD dosis terapi atau rujukan ke FKRTL).",
        formula: "Rematri Anemia Mendapat Tatalaksana / Total Rematri Anemia × 100%",
        notes: "Target Nasional 2026: ≥ 40%. Indikator Program Utama (Higher is better)."
    },
    pct_ttd_received: {
        key: "pct_ttd_received",
        domain: "ttd",
        label: "% Remaja Putri Mendapat TTD Sesuai Standar",
        shortLabel: "% Distribusi TTD",
        type: "supporting",
        direction: "higher",
        unit: "%",
        numeratorLabel: "Rematri Mendapat TTD Sesuai Standar",
        denominatorLabel: "Jumlah Sasaran Remaja Putri",
        definition: "Persentase remaja putri yang mendapatkan TTD sesuai standar intervensi gizi.",
        formula: "Rematri Mendapat TTD Sesuai Standar / Jumlah Sasaran Rematri × 100%",
        notes: "Indikator Pendukung Distribusi."
    },
    pct_screening_grade7: {
        key: "pct_screening_grade7",
        domain: "skrining",
        label: "% Skrining Anemia Siswi Kelas 7",
        shortLabel: "% Skrining Kls 7",
        type: "supporting",
        direction: "higher",
        unit: "%",
        numeratorLabel: "Siswi Kelas 7 Diskrining",
        denominatorLabel: "Sasaran Siswi Kelas 7",
        definition: "Cakupan skrining anemia pada siswi tingkat SMP/MTs (Kelas 7).",
        formula: "Siswi Kls 7 Diskrining / Sasaran Kls 7 × 100%",
        notes: "Sub-indikator pendukung jenjang pertama."
    },
    pct_screening_grade10: {
        key: "pct_screening_grade10",
        domain: "skrining",
        label: "% Skrining Anemia Siswi Kelas 10",
        shortLabel: "% Skrining Kls 10",
        type: "supporting",
        direction: "higher",
        unit: "%",
        numeratorLabel: "Siswi Kelas 10 Diskrining",
        denominatorLabel: "Sasaran Siswi Kelas 10",
        definition: "Cakupan skrining anemia pada siswi tingkat SMA/SMK/MA (Kelas 10).",
        formula: "Siswi Kls 10 Diskrining / Sasaran Kls 10 × 100%",
        notes: "Sub-indikator pendukung jenjang menengah atas."
    },
    pct_anemia_grade7: {
        key: "pct_anemia_grade7",
        domain: "anemia",
        label: "% Anemia Siswi Kelas 7",
        shortLabel: "% Anemia Kls 7",
        type: "supporting",
        direction: "lower",
        unit: "%",
        numeratorLabel: "Siswi Kelas 7 Anemia",
        denominatorLabel: "Siswi Kelas 7 Diskrining",
        definition: "Proporsi siswi kelas 7 yang mengalami anemia di antara yang diskrining.",
        formula: "Total Anemia Kls 7 / Siswi Kls 7 Diskrining × 100%",
        notes: "Prevalensi anemia jenjang SMP/sederajat."
    },
    pct_anemia_grade10: {
        key: "pct_anemia_grade10",
        domain: "anemia",
        label: "% Anemia Siswi Kelas 10",
        shortLabel: "% Anemia Kls 10",
        type: "supporting",
        direction: "lower",
        unit: "%",
        numeratorLabel: "Siswi Kelas 10 Anemia",
        denominatorLabel: "Siswi Kelas 10 Diskrining",
        definition: "Proporsi siswi kelas 10 yang mengalami anemia di antara yang diskrining.",
        formula: "Total Anemia Kls 10 / Siswi Kls 10 Diskrining × 100%",
        notes: "Prevalensi anemia jenjang SMA/sederajat."
    },
    pct_mild_share: {
        key: "pct_mild_share",
        domain: "anemia",
        label: "Proporsi Anemia Ringan (Hb 11–11.9 g/dL)",
        shortLabel: "% Anemia Ringan",
        type: "supporting",
        direction: "lower",
        unit: "%",
        numeratorLabel: "Kasus Anemia Ringan",
        denominatorLabel: "Total Kasus Anemia",
        definition: "Persentase kasus anemia ringan terhadap seluruh temuan anemia.",
        formula: "Anemia Ringan (Kls 7 + Kls 10) / Total Anemia × 100%",
        notes: "Kategori kadar Hb 11.0–11.9 g/dL."
    },
    pct_moderate_share: {
        key: "pct_moderate_share",
        domain: "anemia",
        label: "Proporsi Anemia Sedang (Hb 8–10.9 g/dL)",
        shortLabel: "% Anemia Sedang",
        type: "supporting",
        direction: "lower",
        unit: "%",
        numeratorLabel: "Kasus Anemia Sedang",
        denominatorLabel: "Total Kasus Anemia",
        definition: "Persentase kasus anemia sedang terhadap seluruh temuan anemia.",
        formula: "Anemia Sedang (Kls 7 + Kls 10) / Total Anemia × 100%",
        notes: "Kategori kadar Hb 8.0–10.9 g/dL."
    },
    pct_severe_share: {
        key: "pct_severe_share",
        domain: "anemia",
        label: "Proporsi Anemia Berat (Hb <8 g/dL)",
        shortLabel: "% Anemia Berat",
        type: "supporting",
        direction: "lower",
        unit: "%",
        numeratorLabel: "Kasus Anemia Berat",
        denominatorLabel: "Total Kasus Anemia",
        definition: "Persentase kasus anemia berat yang memerlukan rujukan lanjutan.",
        formula: "Anemia Berat (Kls 7 + Kls 10) / Total Anemia × 100%",
        notes: "Kategori kritis Hb < 8.0 g/dL."
    },
};

// Safe percentage calculation with fallback
export function safePercent(numerator: number, denominator: number): number {
    if (!denominator || denominator <= 0 || isNaN(denominator)) return 0;
    if (isNaN(numerator)) return 0;
    return (numerator / denominator) * 100;
}

export function formatPercent(val: number, decimals: number = 1): string {
    if (isNaN(val) || val === null || val === undefined) return "0.0%";
    return `${val.toFixed(decimals)}%`;
}

export function formatNumber(val: number): string {
    if (isNaN(val) || val === null || val === undefined) return "0";
    return new Intl.NumberFormat("id-ID").format(Math.round(val));
}

// Canonical Academic Year derivation
export function getAcademicYear(year: number, month: number): {
    academic_year: string;
    academic_year_start: number;
    academic_year_end: number;
    academic_month_index: number;
} {
    if (month >= 7) {
        return {
            academic_year: `${year}/${year + 1}`,
            academic_year_start: year,
            academic_year_end: year + 1,
            academic_month_index: month - 6, // Jul=1, Aug=2, ..., Dec=6
        };
    } else {
        return {
            academic_year: `${year - 1}/${year}`,
            academic_year_start: year - 1,
            academic_year_end: year,
            academic_month_index: month + 6, // Jan=7, Feb=8, ..., Jun=12
        };
    }
}

// Aggregated Record Schema
export interface AggregatedRemajaPutri {
    entity_name: string; // Puskesmas name or Desa name
    puskesmas?: string;
    kelurahan?: string;
    record_count: number;

    // Raw Counts
    target_rematri: number;
    ttd_received_standard: number;
    ttd_consumed_standard: number;
    ttd_received_lt26: number;
    ttd_received_ge26: number;
    ttd_consumed_lt26: number;
    ttd_consumed_ge26: number;

    target_grade7: number;
    screened_grade7: number;
    target_grade10: number;
    screened_grade10: number;
    target_grade7_10: number;
    screened_grade7_10: number;

    anemia_grade7_mild: number;
    anemia_grade7_moderate: number;
    anemia_grade7_severe: number;
    anemia_grade7_total: number;

    anemia_grade10_mild: number;
    anemia_grade10_moderate: number;
    anemia_grade10_severe: number;
    anemia_grade10_total: number;

    anemia_mild_total: number;
    anemia_moderate_total: number;
    anemia_severe_total: number;
    anemia_total: number;
    anemia_treated: number;

    // Percentages (Ratio-of-sums)
    pct_ttd_consumed: number;
    pct_screening_anemia: number;
    pct_anemia: number;
    pct_anemia_treated: number;
    pct_ttd_received: number;
    pct_screening_grade7: number;
    pct_screening_grade10: number;
    pct_anemia_grade7: number;
    pct_anemia_grade10: number;
    pct_mild_share: number;
    pct_moderate_share: number;
    pct_severe_share: number;
}

/**
 * Filter raw records based on Period Mode, Year, PeriodVal, and Location
 * Period Modes:
 * - 'bulanan': Exact month match (tahun == year && bulan == periodVal)
 * - 'triwulan': TW 1 (Jan-Mar), TW 2 (Apr-Jun), TW 3 (Jul-Sep), TW 4 (Oct-Dec)
 *   Uses latest available snapshot per desa within the same academic year up to quarter cutoff!
 * - 'tahun_ajaran': Full academic year snapshot (latest month per desa within AY)
 */
export function filterRemajaPutriRecords(
    records: RemajaPutriRawRecord[],
    mode: "bulanan" | "triwulan" | "tahun_ajaran",
    periodVal: number,
    year: string | number,
    selectedPuskesmas: string = "ALL",
    selectedKelurahan: string = "ALL"
): RemajaPutriRawRecord[] {
    const numYear = Number(year) || 2026;

    // 1. Initial location filter
    let filtered = records.filter((r) => {
        if (selectedPuskesmas !== "ALL") {
            if (r.puskesmas.toLowerCase().trim() !== selectedPuskesmas.toLowerCase().trim()) {
                return false;
            }
        }
        if (selectedKelurahan !== "ALL") {
            if (r.kelurahan.toLowerCase().trim() !== selectedKelurahan.toLowerCase().trim()) {
                return false;
            }
        }
        return true;
    });

    if (mode === "bulanan") {
        // Exact month match
        return filtered.filter((r) => Number(r.tahun) === numYear && Number(r.bulan) === periodVal);
    }

    if (mode === "triwulan") {
        // Quarter cutoff definition
        // TW 1: Jan-Mar (m: 1-3, AY: (numYear-1)/numYear)
        // TW 2: Apr-Jun (m: 4-6, AY: (numYear-1)/numYear)
        // TW 3: Jul-Sep (m: 7-9, AY: numYear/(numYear+1))
        // TW 4: Oct-Dec (m: 10-12, AY: numYear/(numYear+1))
        let cutoffMonth = 3;
        let expectedAY = `${numYear - 1}/${numYear}`;

        if (periodVal === 1) {
            cutoffMonth = 3;
            expectedAY = `${numYear - 1}/${numYear}`;
        } else if (periodVal === 2) {
            cutoffMonth = 6;
            expectedAY = `${numYear - 1}/${numYear}`;
        } else if (periodVal === 3) {
            cutoffMonth = 9;
            expectedAY = `${numYear}/${numYear + 1}`;
        } else if (periodVal === 4) {
            cutoffMonth = 12;
            expectedAY = `${numYear}/${numYear + 1}`;
        }

        // Filter rows matching the academic year boundary and <= cutoff month
        const quarterEligible = filtered.filter((r) => {
            const rYear = Number(r.tahun);
            const rMonth = Number(r.bulan);
            const rAY = r.academic_year || (rMonth >= 7 ? `${rYear}/${rYear + 1}` : `${rYear - 1}/${rYear}`);
            return rAY === expectedAY && rYear === numYear && rMonth <= cutoffMonth;
        });

        // Deduplicate to latest snapshot per desa
        const latestByDesa = new Map<string, RemajaPutriRawRecord>();
        quarterEligible.forEach((r) => {
            const key = `${r.puskesmas}__${r.kelurahan}`.toLowerCase();
            const existing = latestByDesa.get(key);
            if (!existing || Number(r.bulan) > Number(existing.bulan)) {
                latestByDesa.set(key, r);
            }
        });

        return Array.from(latestByDesa.values());
    }

    if (mode === "tahun_ajaran") {
        // AY e.g. 2025/2026: periodVal could be start year (2025)
        const targetAY = `${numYear - 1}/${numYear}`;
        const ayEligible = filtered.filter((r) => {
            const rYear = Number(r.tahun);
            const rMonth = Number(r.bulan);
            const rAY = r.academic_year || (rMonth >= 7 ? `${rYear}/${rYear + 1}` : `${rYear - 1}/${rYear}`);
            return rAY === targetAY;
        });

        // Deduplicate to latest snapshot per desa
        const latestByDesa = new Map<string, RemajaPutriRawRecord>();
        ayEligible.forEach((r) => {
            const key = `${r.puskesmas}__${r.kelurahan}`.toLowerCase();
            const existing = latestByDesa.get(key);
            if (!existing || Number(r.bulan) > Number(existing.bulan)) {
                latestByDesa.set(key, r);
            }
        });

        return Array.from(latestByDesa.values());
    }

    return filtered;
}

/**
 * Reduce a set of raw records into one canonical AggregatedRemajaPutri
 */
export function aggregateRawGroup(records: RemajaPutriRawRecord[], entityName: string): AggregatedRemajaPutri {
    let target_rematri = 0;
    let ttd_received_standard = 0;
    let ttd_consumed_standard = 0;
    let ttd_received_lt26 = 0;
    let ttd_received_ge26 = 0;
    let ttd_consumed_lt26 = 0;
    let ttd_consumed_ge26 = 0;

    let target_grade7 = 0;
    let screened_grade7 = 0;
    let target_grade10 = 0;
    let screened_grade10 = 0;

    let anemia_grade7_mild = 0;
    let anemia_grade7_moderate = 0;
    let anemia_grade7_severe = 0;

    let anemia_grade10_mild = 0;
    let anemia_grade10_moderate = 0;
    let anemia_grade10_severe = 0;

    let anemia_treated = 0;

    records.forEach((r) => {
        target_rematri += Number(r.target_rematri) || 0;
        ttd_received_standard += Number(r.ttd_received_standard) || 0;
        ttd_consumed_standard += Number(r.ttd_consumed_standard) || 0;
        ttd_received_lt26 += Number(r.ttd_received_lt26) || 0;
        ttd_received_ge26 += Number(r.ttd_received_ge26) || 0;
        ttd_consumed_lt26 += Number(r.ttd_consumed_lt26) || 0;
        ttd_consumed_ge26 += Number(r.ttd_consumed_ge26) || 0;

        target_grade7 += Number(r.target_grade7) || 0;
        screened_grade7 += Number(r.screened_grade7) || 0;
        target_grade10 += Number(r.target_grade10) || 0;
        screened_grade10 += Number(r.screened_grade10) || 0;

        anemia_grade7_mild += Number(r.anemia_grade7_mild) || 0;
        anemia_grade7_moderate += Number(r.anemia_grade7_moderate) || 0;
        anemia_grade7_severe += Number(r.anemia_grade7_severe) || 0;

        anemia_grade10_mild += Number(r.anemia_grade10_mild) || 0;
        anemia_grade10_moderate += Number(r.anemia_grade10_moderate) || 0;
        anemia_grade10_severe += Number(r.anemia_grade10_severe) || 0;

        anemia_treated += Number(r.anemia_treated) || 0;
    });

    const target_grade7_10 = target_grade7 + target_grade10;
    const screened_grade7_10 = screened_grade7 + screened_grade10;

    const anemia_grade7_total = anemia_grade7_mild + anemia_grade7_moderate + anemia_grade7_severe;
    const anemia_grade10_total = anemia_grade10_mild + anemia_grade10_moderate + anemia_grade10_severe;

    const anemia_mild_total = anemia_grade7_mild + anemia_grade10_mild;
    const anemia_moderate_total = anemia_grade7_moderate + anemia_grade10_moderate;
    const anemia_severe_total = anemia_grade7_severe + anemia_grade10_severe;
    const anemia_total = anemia_grade7_total + anemia_grade10_total;

    return {
        entity_name: entityName,
        record_count: records.length,

        target_rematri,
        ttd_received_standard,
        ttd_consumed_standard,
        ttd_received_lt26,
        ttd_received_ge26,
        ttd_consumed_lt26,
        ttd_consumed_ge26,

        target_grade7,
        screened_grade7,
        target_grade10,
        screened_grade10,
        target_grade7_10,
        screened_grade7_10,

        anemia_grade7_mild,
        anemia_grade7_moderate,
        anemia_grade7_severe,
        anemia_grade7_total,

        anemia_grade10_mild,
        anemia_grade10_moderate,
        anemia_grade10_severe,
        anemia_grade10_total,

        anemia_mild_total,
        anemia_moderate_total,
        anemia_severe_total,
        anemia_total,
        anemia_treated,

        // Percentage indicators (Ratio-of-sums)
        pct_ttd_consumed: safePercent(ttd_consumed_standard, target_rematri),
        pct_screening_anemia: safePercent(screened_grade7_10, target_grade7_10),
        pct_anemia: safePercent(anemia_total, screened_grade7_10),
        pct_anemia_treated: safePercent(anemia_treated, anemia_total),
        pct_ttd_received: safePercent(ttd_received_standard, target_rematri),
        pct_screening_grade7: safePercent(screened_grade7, target_grade7),
        pct_screening_grade10: safePercent(screened_grade10, target_grade10),
        pct_anemia_grade7: safePercent(anemia_grade7_total, screened_grade7),
        pct_anemia_grade10: safePercent(anemia_grade10_total, screened_grade10),
        pct_mild_share: safePercent(anemia_mild_total, anemia_total),
        pct_moderate_share: safePercent(anemia_moderate_total, anemia_total),
        pct_severe_share: safePercent(anemia_severe_total, anemia_total),
    };
}

/**
 * Aggregate filtered records by Puskesmas
 */
export function aggregateByPuskesmas(records: RemajaPutriRawRecord[]): AggregatedRemajaPutri[] {
    const groups = new Map<string, RemajaPutriRawRecord[]>();
    records.forEach((r) => {
        const p = r.puskesmas.trim();
        if (!groups.has(p)) groups.set(p, []);
        groups.get(p)!.push(r);
    });

    const results: AggregatedRemajaPutri[] = [];
    groups.forEach((rows, puskesmas) => {
        const agg = aggregateRawGroup(rows, puskesmas);
        agg.puskesmas = puskesmas;
        results.push(agg);
    });

    return results.sort((a, b) => a.entity_name.localeCompare(b.entity_name));
}

/**
 * Aggregate filtered records by Desa for a selected Puskesmas
 */
export function aggregateByDesa(records: RemajaPutriRawRecord[], selectedPuskesmas: string): AggregatedRemajaPutri[] {
    const subset = records.filter(
        (r) => selectedPuskesmas === "ALL" || r.puskesmas.toLowerCase().trim() === selectedPuskesmas.toLowerCase().trim()
    );

    const groups = new Map<string, RemajaPutriRawRecord[]>();
    subset.forEach((r) => {
        const d = r.kelurahan.trim();
        if (!groups.has(d)) groups.set(d, []);
        groups.get(d)!.push(r);
    });

    const results: AggregatedRemajaPutri[] = [];
    groups.forEach((rows, desa) => {
        const agg = aggregateRawGroup(rows, desa);
        agg.kelurahan = desa;
        agg.puskesmas = rows[0]?.puskesmas;
        results.push(agg);
    });

    return results.sort((a, b) => a.entity_name.localeCompare(b.entity_name));
}

/**
 * Aggregate entire county (Kabupaten Malang)
 */
export function calculateKabupatenTotals(records: RemajaPutriRawRecord[]): AggregatedRemajaPutri {
    return aggregateRawGroup(records, "KABUPATEN MALANG");
}
