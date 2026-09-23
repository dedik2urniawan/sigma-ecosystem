// src/lib/ibuHamilHelper.ts
// Modul Analisis Indikator Ibu Hamil SIGMA RCS (Update 2026 Guidance Sigizi Kesga)

export interface IbuHamilRawRecord {
    id?: string;
    tahun: number;
    bulan: number;
    kab_kota?: string;
    kecamatan?: string;
    puskesmas: string;
    kelurahan: string;

    // Anemia
    hb_checked: number;
    anemia_mild: number;
    anemia_moderate: number;
    anemia_severe: number;
    anemia_total_uploaded: number;
    anemia_mild_ttd: number;
    anemia_modsev_advanced: number;

    // Sasaran
    target_pregnant: number;

    // Suplementasi
    received_mms_180: number;
    received_ttd_180: number;
    received_supplement_total_uploaded: number;
    consumed_mms_180: number;
    consumed_ttd_180: number;
    consumed_supplement_total_uploaded: number;

    // KEK & PMT
    lila_imt_measured: number;
    kek_risk: number;
    kek_management_target: number;
    kek_received_pmt: number;

    // ANC / Pemeriksaan Kehamilan
    pregnant_total: number;
    delivery_total: number;
    k1_access: number;
    k1_pure: number;
    anc_t1_doctor: number;
    anc_t1_usg: number;
    anc_t3_doctor: number;
    anc_t3_usg: number;
    k6_delivery: number;
    anc_12t_delivery: number;

    waktu_input?: string;
    uploaded_at?: string;
    uploaded_by?: string;
    [key: string]: any;
}

export type IndicatorKey =
    | "pct_anemia"
    | "pct_anemia_mild_ttd"
    | "pct_anemia_modsev_advanced"
    | "pct_received_supplement"
    | "pct_consumed_supplement"
    | "pct_kek"
    | "pct_kek_pmt"
    | "pct_k1_pure"
    | "pct_anc_t1_usg"
    | "pct_anc_t3_usg"
    | "pct_k6"
    | "pct_anc_12t";

export interface IndicatorDefinition {
    key: IndicatorKey;
    domain: "anemia" | "supplementation" | "kek" | "anc";
    label: string;
    shortLabel: string;
    type: "program" | "monitoring";
    target: number;
    direction: "higher" | "lower";
    unit: "%";
    numeratorLabel: string;
    denominatorLabel: string;
    definition: string;
    formula: string;
    notes?: string;
}

export const INDICATOR_DEFINITIONS: Record<IndicatorKey, IndicatorDefinition> = {
    pct_anemia: {
        key: "pct_anemia",
        domain: "anemia",
        label: "% Ibu Hamil Anemia",
        shortLabel: "Anemia Bumil",
        type: "program",
        target: 25,
        direction: "lower",
        unit: "%",
        numeratorLabel: "Total Bumil Anemia",
        denominatorLabel: "Bumil Periksa Hb",
        definition: "Persentase ibu hamil dengan kadar hemoglobin (Hb) < 11.0 g/dl pada kurun waktu pemantauan di wilayah kerja.",
        formula: "(Anemia Ringan + Sedang + Berat) / Jumlah Bumil Periksa Hb × 100%",
        notes: "Target nasional 2026: ≤ 25%. Indikator 'Lower is better'."
    },
    pct_anemia_mild_ttd: {
        key: "pct_anemia_mild_ttd",
        domain: "anemia",
        label: "% Anemia Ringan Mendapat TTD Oral",
        shortLabel: "TTD Bumil Anemia Ringan",
        type: "program",
        target: 50,
        direction: "higher",
        unit: "%",
        numeratorLabel: "Anemia Ringan Dapat TTD",
        denominatorLabel: "Total Anemia Ringan",
        definition: "Persentase ibu hamil anemia ringan (Hb 10–10.9 g/dl) yang mendapatkan intervensi Tablet Tambah Darah (TTD) oral.",
        formula: "Bumil Anemia Ringan Dapat TTD / Total Bumil Anemia Ringan × 100%",
        notes: "Target 2026: ≥ 50%. Tatalaksana lini pertama di tingkat FKTP."
    },
    pct_anemia_modsev_advanced: {
        key: "pct_anemia_modsev_advanced",
        domain: "anemia",
        label: "% Anemia Sedang/Berat Ditatalaksana Lanjutan",
        shortLabel: "Tatalaksana Anemia Sedang/Berat",
        type: "program",
        target: 50,
        direction: "higher",
        unit: "%",
        numeratorLabel: "Ditatalaksana Lanjutan",
        denominatorLabel: "Total Anemia Sedang & Berat",
        definition: "Persentase ibu hamil anemia sedang (Hb 7–9.9 g/dl) dan anemia berat (< 7 g/dl) yang dirujuk atau mendapat tatalaksana di tingkat lanjutan (FKRTL/RS).",
        formula: "Ditatalaksana Lanjutan / (Anemia Sedang + Anemia Berat) × 100%",
        notes: "Target 2026: ≥ 50%. Tatalaksana dapat mencakup Fe parenteral, transfusi darah, dll."
    },
    pct_received_supplement: {
        key: "pct_received_supplement",
        domain: "supplementation",
        label: "% Mendapat Suplementasi Gizi (≥180 Tablet)",
        shortLabel: "Mendapat Suplementasi",
        type: "program",
        target: 92,
        direction: "higher",
        unit: "%",
        numeratorLabel: "Mendapat TTD/MMS ≥180",
        denominatorLabel: "Sasaran Ibu Hamil",
        definition: "Persentase ibu hamil yang memperoleh minimal 180 tablet suplementasi gizi mikro (TTD atau MMS) sampai periode pelaporan.",
        formula: "(Mendapat MMS ≥180 + Mendapat TTD ≥180) / Sasaran Proyeksi Ibu Hamil × 100%",
        notes: "Target 2026: ≥ 92%. MMS diutamakan pada lokus program intervensi."
    },
    pct_consumed_supplement: {
        key: "pct_consumed_supplement",
        domain: "supplementation",
        label: "% Mengonsumsi Suplementasi Gizi (≥180 Tablet)",
        shortLabel: "Konsumsi Suplementasi",
        type: "program",
        target: 52,
        direction: "higher",
        unit: "%",
        numeratorLabel: "Mengonsumsi TTD/MMS ≥180",
        denominatorLabel: "Sasaran Ibu Hamil",
        definition: "Persentase ibu hamil yang benar-benar meminum / mengonsumsi minimal 180 tablet suplementasi gizi sampai periode pelaporan.",
        formula: "(Konsumsi MMS ≥180 + Konsumsi TTD ≥180) / Sasaran Proyeksi Ibu Hamil × 100%",
        notes: "Target 2026: ≥ 52% sesuai Guidance 2026."
    },
    pct_kek: {
        key: "pct_kek",
        domain: "kek",
        label: "% Ibu Hamil KEK / Risiko KEK",
        shortLabel: "Bumil KEK",
        type: "program",
        target: 13,
        direction: "lower",
        unit: "%",
        numeratorLabel: "Bumil Risiko KEK / KEK",
        denominatorLabel: "Bumil Diukur LILA/IMT",
        definition: "Persentase ibu hamil yang mengalami Kurang Energi Kronis (KEK) atau berisiko KEK berdasarkan ukuran LiLA < 23.5 cm atau IMT pra-hamil/TM1 < 18.5 kg/m².",
        formula: "Jumlah Bumil Risiko KEK / Jumlah Diukur LILA/IMT × 100%",
        notes: "Target 2026: ≤ 13%. Indikator 'Lower is better'."
    },
    pct_kek_pmt: {
        key: "pct_kek_pmt",
        domain: "kek",
        label: "% Bumil KEK Mendapat PMT",
        shortLabel: "PMT Bumil KEK",
        type: "program",
        target: 85,
        direction: "higher",
        unit: "%",
        numeratorLabel: "KEK Mendapat PMT",
        denominatorLabel: "Sasaran KEK Ditatalaksana",
        definition: "Persentase ibu hamil KEK baru tahun berjalan yang mendapatkan intervensi Pemberian Makanan Tambahan (PMT) berbahan pangan lokal.",
        formula: "Bumil KEK Mendapat PMT / Sasaran Bumil KEK Ditatalaksana × 100%",
        notes: "Target 2026: ≥ 85%. Mengacu pada sasaran tatalaksana tahun 2026."
    },
    pct_k1_pure: {
        key: "pct_k1_pure",
        domain: "anc",
        label: "% K1 Murni (Kunjungan ANC Trimester 1)",
        shortLabel: "K1 Murni",
        type: "program",
        target: 89,
        direction: "higher",
        unit: "%",
        numeratorLabel: "K1 Trimester 1",
        denominatorLabel: "Sasaran Ibu Hamil",
        definition: "Persentase ibu hamil yang memeriksakan kehamilan pertama kalinya tepat pada Trimester 1 (usia kehamilan < 12 minggu).",
        formula: "K1 Murni / Sasaran Proyeksi Ibu Hamil × 100%",
        notes: "Target 2026: ≥ 89%. Deteksi dini faktor risiko kehamilan sejak awal."
    },
    pct_anc_t1_usg: {
        key: "pct_anc_t1_usg",
        domain: "anc",
        label: "% ANC Trimester 1 dengan USG oleh Dokter",
        shortLabel: "ANC TM1 USG",
        type: "program",
        target: 85,
        direction: "higher",
        unit: "%",
        numeratorLabel: "ANC TM1 USG",
        denominatorLabel: "Sasaran Ibu Hamil",
        definition: "Persentase ibu hamil yang mendapatkan pemeriksaan USG kehamilan oleh dokter pada Trimester 1 di Puskesmas atau fasilitas rujukan.",
        formula: "Bumil ANC TM1 USG / Sasaran Proyeksi Ibu Hamil × 100%",
        notes: "Target 2026: ≥ 85%."
    },
    pct_anc_t3_usg: {
        key: "pct_anc_t3_usg",
        domain: "anc",
        label: "% ANC Trimester 3 dengan USG oleh Dokter",
        shortLabel: "ANC TM3 USG",
        type: "program",
        target: 84,
        direction: "higher",
        unit: "%",
        numeratorLabel: "ANC TM3 USG",
        denominatorLabel: "Sasaran Ibu Hamil",
        definition: "Persentase ibu hamil yang mendapatkan pemeriksaan USG skrining persalinan oleh dokter pada Trimester 3.",
        formula: "Bumil ANC TM3 USG / Sasaran Proyeksi Ibu Hamil × 100%",
        notes: "Target 2026: ≥ 84%."
    },
    pct_k6: {
        key: "pct_k6",
        domain: "anc",
        label: "% Pelayanan Antenatal K6",
        shortLabel: "K6 Lengkap",
        type: "program",
        target: 82,
        direction: "higher",
        unit: "%",
        numeratorLabel: "Ibu Bersalin K6",
        denominatorLabel: "Total Ibu Bersalin",
        definition: "Persentase ibu bersalin yang telah menyelesaikan minimal 6 kali kunjungan ANC standar (1x TM1, 2x TM2, 3x TM3, termasuk minimal 2x dokter).",
        formula: "Ibu Bersalin K6 / Jumlah Ibu Bersalin (atau Sasaran Bersalin) × 100%",
        notes: "Target 2026: ≥ 82%."
    },
    pct_anc_12t: {
        key: "pct_anc_12t",
        domain: "anc",
        label: "% Pemeriksaan Standar 12T",
        shortLabel: "Standar 12T",
        type: "program",
        target: 66,
        direction: "higher",
        unit: "%",
        numeratorLabel: "Ibu Bersalin 12T",
        denominatorLabel: "Total Ibu Bersalin",
        definition: "Persentase ibu bersalin yang telah menerima paket komprehensif 12 standar pelayanan antenatal (12T) selama masa kehamilan.",
        formula: "Ibu Bersalin Mendapat 12T / Jumlah Ibu Bersalin × 100%",
        notes: "Target 2026: ≥ 66%."
    },
};

export function safePercent(
    numerator: number | null | undefined,
    denominator: number | null | undefined
): number | null {
    const n = Number(numerator ?? 0);
    const d = Number(denominator ?? 0);
    if (d <= 0 || isNaN(d) || isNaN(n)) return null;
    return Math.round((n / d) * 10000) / 100;
}

export function getTargetStatus(
    value: number | null,
    target: number,
    direction: "higher" | "lower"
): "TARGET_MET" | "TARGET_NOT_MET" | "NO_DATA" {
    if (value === null || isNaN(value)) return "NO_DATA";
    if (direction === "higher") {
        return value >= target ? "TARGET_MET" : "TARGET_NOT_MET";
    }
    return value <= target ? "TARGET_MET" : "TARGET_NOT_MET";
}

export function getTrendDirection(
    current: number,
    previous: number,
    direction: "higher" | "lower"
): "positive" | "negative" | "neutral" {
    const delta = current - previous;
    if (Math.abs(delta) < 0.05) return "neutral";
    if (direction === "higher") {
        return delta > 0 ? "positive" : "negative";
    }
    return delta < 0 ? "positive" : "negative";
}

// ───────────────────────────────────────────────────────────────────────────────
// DATA FRESHNESS FOR TRIWULAN
// ───────────────────────────────────────────────────────────────────────────────
export type FreshnessCategory = "FRESH" | "CF_1" | "CF_2" | "STALE" | "MISSING";

export interface VillageFreshness {
    puskesmas: string;
    kelurahan: string;
    latestMonth: number | null;
    category: FreshnessCategory;
    record: IbuHamilRawRecord | null;
}

export function getQuarterCutoffMonth(tw: number): number {
    switch (tw) {
        case 1: return 3;
        case 2: return 6;
        case 3: return 9;
        case 4: return 12;
        default: return 3;
    }
}

/**
 * Filter data ibu hamil berbasis Snapshot:
 * - Bulanan: Hanya record yang benar-benar ada pada bulan tersebut.
 * - Triwulan: Ambil record kumulatif terakhir per desa sampai batas cutoff bulan TW.
 */
export function filterCumulativeData(
    allRecords: IbuHamilRawRecord[],
    mode: "bulanan" | "triwulan",
    periodVal: number // 1..12 untuk bulanan, 1..4 untuk triwulan
): {
    filteredRecords: IbuHamilRawRecord[];
    freshnessMap: Map<string, VillageFreshness>;
} {
    const freshnessMap = new Map<string, VillageFreshness>();

    if (mode === "bulanan") {
        const records = allRecords.filter((r) => Number(r.bulan) === periodVal);
        records.forEach((r) => {
            const key = `${r.puskesmas}:::${r.kelurahan}`;
            freshnessMap.set(key, {
                puskesmas: r.puskesmas,
                kelurahan: r.kelurahan,
                latestMonth: periodVal,
                category: "FRESH",
                record: r,
            });
        });
        return { filteredRecords: records, freshnessMap };
    }

    // MODE TRIWULAN (TW I - IV)
    const cutoff = getQuarterCutoffMonth(periodVal);

    // Grouping records by village
    const villageGroups = new Map<string, IbuHamilRawRecord[]>();
    allRecords.forEach((r) => {
        const b = Number(r.bulan);
        if (b <= cutoff) {
            const key = `${r.puskesmas}:::${r.kelurahan}`;
            if (!villageGroups.has(key)) villageGroups.set(key, []);
            villageGroups.get(key)!.push(r);
        }
    });

    const filteredRecords: IbuHamilRawRecord[] = [];

    villageGroups.forEach((records, key) => {
        // Sort descending by month, then waktu_input
        records.sort((a, b) => {
            const mb = Number(b.bulan) - Number(a.bulan);
            if (mb !== 0) return mb;
            return new Date(b.waktu_input || 0).getTime() - new Date(a.waktu_input || 0).getTime();
        });

        const latest = records[0];
        filteredRecords.push(latest);

        const latestMonth = Number(latest.bulan);
        let cat: FreshnessCategory = "FRESH";
        if (latestMonth === cutoff) cat = "FRESH";
        else if (latestMonth === cutoff - 1) cat = "CF_1";
        else if (latestMonth === cutoff - 2) cat = "CF_2";
        else cat = "STALE";

        freshnessMap.set(key, {
            puskesmas: latest.puskesmas,
            kelurahan: latest.kelurahan,
            latestMonth,
            category: cat,
            record: latest,
        });
    });

    return { filteredRecords, freshnessMap };
}

// ───────────────────────────────────────────────────────────────────────────────
// AGGREGATION & METRICS CALCULATION (RATIO OF SUMS)
// ───────────────────────────────────────────────────────────────────────────────

export interface CalculatedIndicatorMetric {
    key: IndicatorKey;
    value: number | null; // percentage
    target: number;
    direction: "higher" | "lower";
    status: "TARGET_MET" | "TARGET_NOT_MET" | "NO_DATA";
    numerator: number;
    denominator: number;
    gap: number | null; // in percentage points (positive = good)
    previousValue?: number | null;
    delta?: number | null;
    trendDirection?: "positive" | "negative" | "neutral";
}

export interface AggregatedDomainMetrics {
    indicators: Record<IndicatorKey, CalculatedIndicatorMetric>;
    counts: {
        pregnant_total: number;
        delivery_total: number;
        k1_access: number;
        anc_t1_doctor: number;
        anc_t3_doctor: number;
        hb_checked: number;
        anemia_mild: number;
        anemia_moderate: number;
        anemia_severe: number;
        anemia_total: number;
        anemia_mild_ttd: number;
        anemia_modsev_advanced: number;
        received_mms_180: number;
        received_ttd_180: number;
        consumed_mms_180: number;
        consumed_ttd_180: number;
        lila_imt_measured: number;
        kek_risk: number;
        kek_management_target: number;
        kek_received_pmt: number;
        k1_pure: number;
        anc_t1_usg: number;
        anc_t3_usg: number;
        k6_delivery: number;
        anc_12t_delivery: number;
        target_pregnant: number;
    };
    rawRecordCount: number;
}

export function aggregateRecords(records: IbuHamilRawRecord[]): AggregatedDomainMetrics {
    const sums = {
        hb_checked: 0,
        anemia_mild: 0,
        anemia_moderate: 0,
        anemia_severe: 0,
        anemia_mild_ttd: 0,
        anemia_modsev_advanced: 0,
        target_pregnant: 0,
        received_mms_180: 0,
        received_ttd_180: 0,
        consumed_mms_180: 0,
        consumed_ttd_180: 0,
        lila_imt_measured: 0,
        kek_risk: 0,
        kek_management_target: 0,
        kek_received_pmt: 0,
        pregnant_total: 0,
        delivery_total: 0,
        k1_access: 0,
        k1_pure: 0,
        anc_t1_doctor: 0,
        anc_t1_usg: 0,
        anc_t3_doctor: 0,
        anc_t3_usg: 0,
        k6_delivery: 0,
        anc_12t_delivery: 0,
    };

    records.forEach((r) => {
        sums.hb_checked += Number(r.hb_checked || 0);
        sums.anemia_mild += Number(r.anemia_mild || 0);
        sums.anemia_moderate += Number(r.anemia_moderate || 0);
        sums.anemia_severe += Number(r.anemia_severe || 0);
        sums.anemia_mild_ttd += Number(r.anemia_mild_ttd || 0);
        sums.anemia_modsev_advanced += Number(r.anemia_modsev_advanced || 0);
        sums.target_pregnant += Number(r.target_pregnant || 0);
        sums.received_mms_180 += Number(r.received_mms_180 || 0);
        sums.received_ttd_180 += Number(r.received_ttd_180 || 0);
        sums.consumed_mms_180 += Number(r.consumed_mms_180 || 0);
        sums.consumed_ttd_180 += Number(r.consumed_ttd_180 || 0);
        sums.lila_imt_measured += Number(r.lila_imt_measured || 0);
        sums.kek_risk += Number(r.kek_risk || 0);
        sums.kek_management_target += Number(r.kek_management_target || 0);
        sums.kek_received_pmt += Number(r.kek_received_pmt || 0);
        sums.pregnant_total += Number(r.pregnant_total || 0);
        sums.delivery_total += Number(r.delivery_total || 0);
        sums.k1_access += Number(r.k1_access || 0);
        sums.k1_pure += Number(r.k1_pure || 0);
        sums.anc_t1_doctor += Number(r.anc_t1_doctor || 0);
        sums.anc_t1_usg += Number(r.anc_t1_usg || 0);
        sums.anc_t3_doctor += Number(r.anc_t3_doctor || 0);
        sums.anc_t3_usg += Number(r.anc_t3_usg || 0);
        sums.k6_delivery += Number(r.k6_delivery || 0);
        sums.anc_12t_delivery += Number(r.anc_12t_delivery || 0);
    });

    const anemia_total = sums.anemia_mild + sums.anemia_moderate + sums.anemia_severe;
    const received_supplement_total = sums.received_mms_180 + sums.received_ttd_180;
    const consumed_supplement_total = sums.consumed_mms_180 + sums.consumed_ttd_180;
    const modsev_total = sums.anemia_moderate + sums.anemia_severe;

    // Helper calculate single metric
    const makeMetric = (
        key: IndicatorKey,
        num: number,
        den: number
    ): CalculatedIndicatorMetric => {
        const def = INDICATOR_DEFINITIONS[key];
        const val = safePercent(num, den);
        const status = getTargetStatus(val, def.target, def.direction);

        let gap: number | null = null;
        if (val !== null) {
            gap = def.direction === "higher" ? Math.round((val - def.target) * 100) / 100 : Math.round((def.target - val) * 100) / 100;
        }

        return {
            key,
            value: val,
            target: def.target,
            direction: def.direction,
            status,
            numerator: num,
            denominator: den,
            gap,
        };
    };

    // Calculate delivery denominator (prefer delivery_total, fallback to target_pregnant if zero)
    const deliveryDenom = sums.delivery_total > 0 ? sums.delivery_total : sums.target_pregnant;

    const indicators: Record<IndicatorKey, CalculatedIndicatorMetric> = {
        pct_anemia: makeMetric("pct_anemia", anemia_total, sums.hb_checked),
        pct_anemia_mild_ttd: makeMetric("pct_anemia_mild_ttd", sums.anemia_mild_ttd, sums.anemia_mild),
        pct_anemia_modsev_advanced: makeMetric("pct_anemia_modsev_advanced", sums.anemia_modsev_advanced, modsev_total),
        pct_received_supplement: makeMetric("pct_received_supplement", received_supplement_total, sums.target_pregnant),
        pct_consumed_supplement: makeMetric("pct_consumed_supplement", consumed_supplement_total, sums.target_pregnant),
        pct_kek: makeMetric("pct_kek", sums.kek_risk, sums.lila_imt_measured),
        pct_kek_pmt: makeMetric("pct_kek_pmt", sums.kek_received_pmt, sums.kek_management_target),
        pct_k1_pure: makeMetric("pct_k1_pure", sums.k1_pure, sums.target_pregnant),
        pct_anc_t1_usg: makeMetric("pct_anc_t1_usg", sums.anc_t1_usg, sums.target_pregnant),
        pct_anc_t3_usg: makeMetric("pct_anc_t3_usg", sums.anc_t3_usg, sums.target_pregnant),
        pct_k6: makeMetric("pct_k6", sums.k6_delivery, deliveryDenom),
        pct_anc_12t: makeMetric("pct_anc_12t", sums.anc_12t_delivery, deliveryDenom),
    };

    return {
        indicators,
        counts: {
            ...sums,
            anemia_total,
        },
        rawRecordCount: records.length,
    };
}

/**
 * Agregasi per Puskesmas untuk tabel dan grafik
 */
export interface PuskesmasSummaryRow {
    puskesmas: string;
    desaCount: number;
    metrics: AggregatedDomainMetrics;
    freshnessStats?: {
        fresh: number;
        cf1: number;
        cf2: number;
        stale: number;
    };
}

export function aggregateByPuskesmas(
    records: IbuHamilRawRecord[],
    freshnessMap?: Map<string, VillageFreshness>
): PuskesmasSummaryRow[] {
    const pGroups = new Map<string, IbuHamilRawRecord[]>();
    records.forEach((r) => {
        if (!pGroups.has(r.puskesmas)) pGroups.set(r.puskesmas, []);
        pGroups.get(r.puskesmas)!.push(r);
    });

    const rows: PuskesmasSummaryRow[] = [];

    pGroups.forEach((pRecords, puskesmas) => {
        const metrics = aggregateRecords(pRecords);

        let freshnessStats: { fresh: number; cf1: number; cf2: number; stale: number } | undefined = undefined;
        if (freshnessMap) {
            freshnessStats = { fresh: 0, cf1: 0, cf2: 0, stale: 0 };
            pRecords.forEach((r) => {
                const key = `${r.puskesmas}:::${r.kelurahan}`;
                const f = freshnessMap.get(key);
                if (f) {
                    if (f.category === "FRESH") freshnessStats!.fresh++;
                    else if (f.category === "CF_1") freshnessStats!.cf1++;
                    else if (f.category === "CF_2") freshnessStats!.cf2++;
                    else freshnessStats!.stale++;
                }
            });
        }

        rows.push({
            puskesmas,
            desaCount: pRecords.length,
            metrics,
            freshnessStats,
        });
    });

    return rows.sort((a, b) => a.puskesmas.localeCompare(b.puskesmas));
}

/**
 * Agregasi per Desa/Kelurahan untuk tabel dan grafik drilldown
 */
export interface DesaSummaryRow {
    desa: string;
    puskesmas: string;
    metrics: AggregatedDomainMetrics;
    freshnessCategory?: FreshnessCategory;
}

export function aggregateByDesa(
    records: IbuHamilRawRecord[],
    freshnessMap?: Map<string, VillageFreshness>
): DesaSummaryRow[] {
    const dGroups = new Map<string, IbuHamilRawRecord[]>();
    records.forEach((r) => {
        const key = `${r.puskesmas}:::${r.kelurahan}`;
        if (!dGroups.has(key)) dGroups.set(key, []);
        dGroups.get(key)!.push(r);
    });

    const rows: DesaSummaryRow[] = [];

    dGroups.forEach((dRecords, key) => {
        const [puskesmas, desa] = key.split(":::");
        const metrics = aggregateRecords(dRecords);
        const f = freshnessMap?.get(key);

        rows.push({
            desa: desa || dRecords[0]?.kelurahan || "",
            puskesmas: puskesmas || dRecords[0]?.puskesmas || "",
            metrics,
            freshnessCategory: f?.category,
        });
    });

    return rows.sort((a, b) => a.desa.localeCompare(b.desa));
}

// ───────────────────────────────────────────────────────────────────────────────
// DATA QUALITY ASSESSMENT (DQA) CHECKS
// ───────────────────────────────────────────────────────────────────────────────
export interface DqaIssue {
    id: string;
    severity: "CRITICAL" | "WARNING" | "INFO";
    title: string;
    description: string;
    affectedCount: number;
    sampleVillages: string[];
}

export function runDqaAudit(records: IbuHamilRawRecord[]): DqaIssue[] {
    const issues: DqaIssue[] = [];

    // 1. Anemia sum consistency check
    const anemiaDiscrepancies: string[] = [];
    records.forEach((r) => {
        const sum = Number(r.anemia_mild || 0) + Number(r.anemia_moderate || 0) + Number(r.anemia_severe || 0);
        const uploaded = Number(r.anemia_total_uploaded || 0);
        if (uploaded > 0 && sum !== uploaded) {
            anemiaDiscrepancies.push(`${r.puskesmas} - ${r.kelurahan} (Upload: ${uploaded}, Komponen: ${sum})`);
        }
    });

    if (anemiaDiscrepancies.length > 0) {
        issues.push({
            id: "DQA_ANEMIA_SUM",
            severity: "WARNING",
            title: "Diskrepansi Total Anemia",
            description: `Terdapat ${anemiaDiscrepancies.length} desa di mana penjumlahan Anemia Ringan + Sedang + Berat tidak sama dengan kolom Total Anemia yang diupload. Sistem otomatis memakai penjumlahan komponen.`,
            affectedCount: anemiaDiscrepancies.length,
            sampleVillages: anemiaDiscrepancies.slice(0, 3),
        });
    }

    // 2. Numerator > Denominator checks
    const numOverDenomHb: string[] = [];
    records.forEach((r) => {
        const sumAnemia = Number(r.anemia_mild || 0) + Number(r.anemia_moderate || 0) + Number(r.anemia_severe || 0);
        const hb = Number(r.hb_checked || 0);
        if (hb > 0 && sumAnemia > hb) {
            numOverDenomHb.push(`${r.puskesmas} - ${r.kelurahan} (Anemia: ${sumAnemia} > Periksa Hb: ${hb})`);
        }
    });

    if (numOverDenomHb.length > 0) {
        issues.push({
            id: "DQA_NUM_OVER_DENOM_HB",
            severity: "WARNING",
            title: "Total Anemia Melebihi Jumlah Periksa Hb",
            description: `Ditemukan ${numOverDenomHb.length} entri desa di mana jumlah ibu hamil anemia lebih banyak dari jumlah periksa Hb. Periksa input data primer.`,
            affectedCount: numOverDenomHb.length,
            sampleVillages: numOverDenomHb.slice(0, 3),
        });
    }

    // 3. Zero Denominator with Positive Numerator
    const zeroDenomIssues: string[] = [];
    records.forEach((r) => {
        const hb = Number(r.hb_checked || 0);
        const sumAnemia = Number(r.anemia_mild || 0) + Number(r.anemia_moderate || 0) + Number(r.anemia_severe || 0);
        if (hb === 0 && sumAnemia > 0) {
            zeroDenomIssues.push(`${r.puskesmas} - ${r.kelurahan}`);
        }
    });

    if (zeroDenomIssues.length > 0) {
        issues.push({
            id: "DQA_ZERO_DENOM_POSITIVE_NUM",
            severity: "CRITICAL",
            title: "Kasus Ada Namun Denominator 0",
            description: `Ditemukan ${zeroDenomIssues.length} desa dengan kasus anemia positif tetapi denominator periksa Hb bernilai 0.`,
            affectedCount: zeroDenomIssues.length,
            sampleVillages: zeroDenomIssues.slice(0, 3),
        });
    }

    return issues;
}
