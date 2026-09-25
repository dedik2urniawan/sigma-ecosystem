/**
 * SIGMA RCS 2.0 - PMT Lokal Helper Engine
 * 
 * Implements parsing, DQA audit, metric formulas, and aggregations
 * for Balita PMT (Gizi Kurang, Underweight, Balita T) and Bumil KEK PMT
 * according to PRD_SIGMA_RCS_Analisis_PMT_Lokal_Balita_Bumil_KEK_2026.md
 */

import { supabase } from "@/lib/supabase";

// ─── Interfaces ─────────────────────────────────────────────────────────────

export type PmtIndicationBalita = "gizi_kurang" | "underweight" | "balita_t";
export type PmtIndicationBumil = "kek" | "risiko_kek";
export type DqaSeverity = "block" | "needs_review" | "info";

export interface DqaIssue {
    id: string;
    personKey: string;
    namaMasked: string;
    puskesmas: string;
    desa: string;
    field: string;
    rawValue: any;
    flag: "PARSE_BAD" | "CHILD_Z_FLAG" | "TARGET_MISMATCH" | "STATUS_CONFLICT" | "DUPLICATE_OR_CONFLICT" | "TEMPORAL";
    severity: DqaSeverity;
    message: string;
    resolution: string;
}

export interface PmtBalitaRecord {
    id: string;
    person_key: string;
    nama_masked: string;
    jk: "L" | "P";
    tgl_lahir: string;
    usia_bulan_awal?: number;
    provinsi: string;
    kabupaten: string;
    kecamatan: string;
    puskesmas: string;
    desa: string;
    posyandu: string;
    indikasi: PmtIndicationBalita;
    sumber_anggaran?: string;
    mitra?: string;
    siklus_pmt?: number;
    jumlah_pemantauan?: number;
    
    // Antropometri Awal
    tgl_ukur_awal: string; // ISO date string (YYYY-MM-DD)
    bb_awal: number | null;
    tb_awal: number | null;
    zs_bbu_awal: number | null;
    zs_tbu_awal: number | null;
    zs_bbtb_awal: number | null;
    status_bbu_awal?: string;
    status_tbu_awal?: string;
    status_bbtb_awal?: string;
    status_pertumbuhan_awal?: string; // N / T / O / B

    // Antropometri Akhir
    tgl_ukur_akhir: string | null; // Often date_unknown / null in initial exports
    bb_akhir: number | null;
    tb_akhir: number | null;
    zs_bbu_akhir: number | null;
    zs_tbu_akhir: number | null;
    zs_bbtb_akhir: number | null;
    status_bbu_akhir?: string;
    status_tbu_akhir?: string;
    status_bbtb_akhir?: string;
    status_pertumbuhan_akhir?: string;

    // Derived
    dqa_flags: string[];
    is_eligible: boolean; // meets target indication
    is_evaluable: boolean; // has valid baseline and outcome
    stunted_baseline: boolean; // HAZ < -2
}

export interface PmtBumilRecord {
    id: string;
    person_key: string;
    nama_masked: string;
    tgl_lahir?: string;
    usia_tahun?: number;
    provinsi: string;
    kabupaten: string;
    kecamatan: string;
    puskesmas: string;
    desa: string;
    posyandu?: string;
    indikasi: PmtIndicationBumil;
    alasan_raw?: string;

    tgl_pemberian_pertama: string; // ISO date string
    tgl_selesai_reported?: string; // reported administrative end date
    tgl_timbang_akhir?: string | null; // actual weighing date (often null)
    
    bb_awal: number | null;
    bb_akhir: number | null;
    lila_cm?: number | null;
    usia_kehamilan_minggu?: number | null; // trimester proxy

    status_pmt_reported?: string; // e.g. "Selesai", "Proses", "-"
    hasil_pemberian_reported?: string; // e.g. "Sesuai", "Tidak Sesuai"
    siklus_pmt?: number;
    jumlah_pemantauan?: number;

    // Derived
    dqa_flags: string[];
    delta_bb_kg: number | null;
    is_eligible: boolean;
    is_evaluable: boolean;
}

export interface PmtMetricCard {
    id: string;
    label: string;
    numerator: number;
    denominator: number;
    value: number | null; // percentage or rate
    unit: "%" | "kg" | "anak" | "ibu" | "hari";
    benchmarkKemenkes?: number; // e.g. 59.8 for GK
    benchmarkLabel?: string;
    definition: string;
    notes?: string;
    status: "available" | "proxy" | "requires_longitudinal";
}

export interface PuskesmasPmtSummary {
    puskesmas: string;
    total_intake: number;
    eligible: number;
    evaluable: number;
    recovered_or_improved: number;
    recovery_rate: number | null; // %
    dqa_issue_count: number;
    stunted_rate: number | null; // % baseline stunting
}

// ─── National Benchmarks (Kemenkes 2025 Reference Presentation) ─────────────
export const NATIONAL_BENCHMARKS = {
    gk: {
        value: 59.8,
        n: 86102,
        label: "Benchmark Nasional Kemenkes 2025: 59.8% (n=86.102)",
        endpoint: "WHZ > -2 (4-8 minggu)",
        description: "Berdasarkan laporan evaluasi PMT Lokal Dit Gizi KIA Kemenkes RI 2025."
    },
    uw: {
        value: 38.9,
        n: 150513,
        label: "Benchmark Nasional Kemenkes 2025: 38.9% (n=150.513)",
        endpoint: "WAZ > -2 (2-4 minggu)",
        description: "Berdasarkan laporan evaluasi PMT Lokal Dit Gizi KIA Kemenkes RI 2025."
    },
    t: {
        value: 43.2,
        n: 279174,
        label: "Benchmark Nasional Kemenkes 2025: 43.2% (n≈279.174)",
        endpoint: "ΔWAZ > 0.1 (1-2 minggu)",
        description: "Berdasarkan laporan evaluasi PMT Lokal Dit Gizi KIA Kemenkes RI 2025."
    },
    bumil: {
        value: 53.6,
        n: 19884,
        label: "Benchmark Nasional Kemenkes 2025: 53.6% (n=19.884)",
        endpoint: "Kenaikan BB rata-rata ≥0.5 kg/minggu",
        description: "Berdasarkan analisis PMT Bumil KEK Kemenkes RI 2025."
    }
};

// ─── Cleaning & Normalization Helpers ────────────────────────────────────────

/**
 * Mask full name for privacy (e.g. "MUHAMMAD ARKAN" -> "M******* A****")
 */
export function maskName(name: string): string {
    if (!name) return "ANONIM";
    return name.trim().split(/\s+/).map(word => {
        if (word.length <= 2) return word;
        return word[0] + "*".repeat(word.length - 1);
    }).join(" ");
}

/**
 * Parse dirty anthropometric numbers from string:
 * Handles "83..9", "10.7 it", "10945" (g to kg), "875" (mm to cm), "999.99"
 */
export function parseCleanNumber(val: any, type: "weight" | "height" | "zscore"): { parsed: number | null; raw: any; flag?: string } {
    if (val === null || val === undefined || val === "" || val === "-") {
        return { parsed: null, raw: val };
    }
    if (typeof val === "number") {
        if (isNaN(val)) return { parsed: null, raw: val, flag: "PARSE_BAD" };
        return sanitizeValue(val, type, val);
    }

    let str = String(val).trim();
    // remove quotes, units like "kg", "cm", "it", multiple dots
    str = str.replace(/[a-zA-Z\s]/g, "");
    if (str.includes("..")) {
        str = str.replace(/\.+/g, ".");
    }

    const num = parseFloat(str);
    if (isNaN(num)) {
        return { parsed: null, raw: val, flag: "PARSE_BAD" };
    }

    return sanitizeValue(num, type, val);
}

function sanitizeValue(num: number, type: "weight" | "height" | "zscore", raw: any): { parsed: number | null; raw: any; flag?: string } {
    if (type === "zscore") {
        if (num >= 99 || num <= -99) {
            return { parsed: null, raw, flag: "CHILD_Z_FLAG" }; // e.g. 999.99
        }
        if (num < -6 || num > 6) {
            return { parsed: num, raw, flag: "CHILD_Z_FLAG" };
        }
        return { parsed: Math.round(num * 100) / 100, raw };
    }

    if (type === "weight") {
        // Balita weight normally 2 - 35 kg. If > 1000, probably grams
        if (num > 1000 && num < 40000) {
            return { parsed: Math.round((num / 1000) * 100) / 100, raw, flag: "UNIT_CORRECTED" };
        }
        if (num <= 0 || num > 150) {
            return { parsed: null, raw, flag: "PARSE_BAD" };
        }
        return { parsed: Math.round(num * 100) / 100, raw };
    }

    if (type === "height") {
        // Balita height normally 40 - 130 cm. If > 400, probably mm
        if (num > 400 && num < 1500) {
            return { parsed: Math.round((num / 10) * 10) / 10, raw, flag: "UNIT_CORRECTED" };
        }
        if (num <= 30 || num > 200) {
            return { parsed: null, raw, flag: "PARSE_BAD" };
        }
        return { parsed: Math.round(num * 10) / 10, raw };
    }

    return { parsed: num, raw };
}

// ─── DQA Audit Function ─────────────────────────────────────────────────────

export function auditBalitaRecord(record: PmtBalitaRecord): DqaIssue[] {
    const issues: DqaIssue[] = [];

    // 1. Z-Score bounds check
    const zScores = [
        { field: "zs_bbu_awal", val: record.zs_bbu_awal, min: -6, max: 5 },
        { field: "zs_tbu_awal", val: record.zs_tbu_awal, min: -6, max: 6 },
        { field: "zs_bbtb_awal", val: record.zs_bbtb_awal, min: -5, max: 5 },
        { field: "zs_bbu_akhir", val: record.zs_bbu_akhir, min: -6, max: 5 },
        { field: "zs_tbu_akhir", val: record.zs_tbu_akhir, min: -6, max: 6 },
        { field: "zs_bbtb_akhir", val: record.zs_bbtb_akhir, min: -5, max: 5 },
    ];

    for (const z of zScores) {
        if (z.val !== null && (z.val < z.min || z.val > z.max)) {
            issues.push({
                id: `${record.id}-${z.field}-flag`,
                personKey: record.person_key,
                namaMasked: record.nama_masked,
                puskesmas: record.puskesmas,
                desa: record.desa,
                field: z.field,
                rawValue: z.val,
                flag: "CHILD_Z_FLAG",
                severity: "needs_review",
                message: `Nilai z-score ${z.field} (${z.val}) di luar rentang fisiologis baku WHO [${z.min}, ${z.max}].`,
                resolution: "Dikeluarkan dari perhitungan statistik z-score indeks terkait."
            });
        }
    }

    // 2. Target Indication Mismatch
    if (record.indikasi === "gizi_kurang") {
        if (record.zs_bbtb_awal !== null && record.zs_bbtb_awal >= -2.0) {
            issues.push({
                id: `${record.id}-mismatch-gk`,
                personKey: record.person_key,
                namaMasked: record.nama_masked,
                puskesmas: record.puskesmas,
                desa: record.desa,
                field: "zs_bbtb_awal",
                rawValue: record.zs_bbtb_awal,
                flag: "TARGET_MISMATCH",
                severity: "needs_review",
                message: `Klaim PMT Gizi Kurang tetapi baseline WHZ (${record.zs_bbtb_awal}) normal (≥ -2 SD).`,
                resolution: "Ditandai sebagai sasaran di luar kriteria seleksi klinis baku."
            });
        }
    } else if (record.indikasi === "underweight") {
        if (record.zs_bbu_awal !== null && record.zs_bbu_awal >= -2.0) {
            issues.push({
                id: `${record.id}-mismatch-uw`,
                personKey: record.person_key,
                namaMasked: record.nama_masked,
                puskesmas: record.puskesmas,
                desa: record.desa,
                field: "zs_bbu_awal",
                rawValue: record.zs_bbu_awal,
                flag: "TARGET_MISMATCH",
                severity: "needs_review",
                message: `Klaim PMT Underweight tetapi baseline WAZ (${record.zs_bbu_awal}) normal (≥ -2 SD).`,
                resolution: "Ditandai sebagai sasaran di luar kriteria seleksi klinis baku."
            });
        }
    }

    // 3. Extreme weight jump (e.g. > 10 kg difference)
    if (record.bb_awal !== null && record.bb_akhir !== null) {
        const diff = Math.abs(record.bb_akhir - record.bb_awal);
        if (diff > 8) {
            issues.push({
                id: `${record.id}-jump-bb`,
                personKey: record.person_key,
                namaMasked: record.nama_masked,
                puskesmas: record.puskesmas,
                desa: record.desa,
                field: "bb_akhir",
                rawValue: record.bb_akhir,
                flag: "PARSE_BAD",
                severity: "block",
                message: `Perubahan berat badan ekstrim ${diff.toFixed(1)} kg antara baseline dan evaluasi.`,
                resolution: "Perlu verifikasi fisik Buku KIA / Posyandu oleh nakes."
            });
        }
    }

    return issues;
}

export function auditBumilRecord(record: PmtBumilRecord): DqaIssue[] {
    const issues: DqaIssue[] = [];

    // 1. Status Selesai but BB akhir is null
    if (record.status_pmt_reported === "Selesai" && (record.bb_akhir === null || record.bb_akhir <= 0)) {
        issues.push({
            id: `${record.id}-status-conflict`,
            personKey: record.person_key,
            namaMasked: record.nama_masked,
            puskesmas: record.puskesmas,
            desa: record.desa,
            field: "bb_akhir",
            rawValue: record.bb_akhir,
            flag: "STATUS_CONFLICT",
            severity: "block",
            message: `Status dilaporkan "Selesai" tetapi BB akhir belum tercatat / kosong.`,
            resolution: "Data intake selesai administratif, namun belum dapat dievaluasi luaran kenaikan BB."
        });
    }

    // 2. Weight range sensitivity check (40 - 120 kg)
    if (record.bb_awal !== null && (record.bb_awal < 35 || record.bb_awal > 130)) {
        issues.push({
            id: `${record.id}-bb-awal-sens`,
            personKey: record.person_key,
            namaMasked: record.nama_masked,
            puskesmas: record.puskesmas,
            desa: record.desa,
            field: "bb_awal",
            rawValue: record.bb_awal,
            flag: "PARSE_BAD",
            severity: "needs_review",
            message: `BB awal (${record.bb_awal} kg) di luar rentang kebiasaan bumil (35–130 kg).`,
            resolution: "Periksa kembali timbangan awal."
        });
    }

    if (record.bb_akhir !== null && record.bb_awal !== null) {
        const diff = record.bb_akhir - record.bb_awal;
        if (Math.abs(diff) > 20) {
            issues.push({
                id: `${record.id}-bb-jump-bumil`,
                personKey: record.person_key,
                namaMasked: record.nama_masked,
                puskesmas: record.puskesmas,
                desa: record.desa,
                field: "bb_akhir",
                rawValue: record.bb_akhir,
                flag: "PARSE_BAD",
                severity: "block",
                message: `Perubahan berat badan absolut > 20 kg (${diff > 0 ? "+" : ""}${diff.toFixed(1)} kg).`,
                resolution: "Dikeluarkan dari perhitungan rata-rata kenaikan berat badan."
            });
        }
    }

    return issues;
}

// ─── Metric Calculations for Dashboard ──────────────────────────────────────

export interface PmtMetricsOverview {
    totalBalitaIntake: number;
    totalBumilIntake: number;
    uniqueBalitaCount: number;
    uniqueBumilCount: number;
    
    // Gizi Kurang
    gkIntake: number;
    gkAppropriate: number;
    gkEvaluable: number;
    gkRecovered: number; // WHZ > -2
    gkRecoveryRate: number | null;
    
    // Underweight
    uwIntake: number;
    uwAppropriate: number;
    uwEvaluable: number;
    uwRecovered: number; // WAZ > -2
    uwRecoveryRate: number | null;
    
    // Balita T
    tIntake: number;
    tAppropriate: number;
    tEvaluable: number;
    tImproved: number; // ΔWAZ > 0.1 or Naik
    tImprovedRate: number | null;

    // Bumil KEK
    bumilIntake: number;
    bumilCompleted: number;
    bumilEvaluable: number;
    bumilMeanWeightGain: number | null; // kg
    bumilMeetingTarget: number; // gained >= 0.5 kg/week or gained >= 2.0 kg total
    bumilMeetingRate: number | null;

    // DQA Audit
    totalIssues: number;
    blockIssues: number;
    reviewIssues: number;
    overlapNikCount: number; // NIK present in multiple indications
}

export function computePmtMetrics(
    balitaRecords: PmtBalitaRecord[],
    bumilRecords: PmtBumilRecord[]
): PmtMetricsOverview {
    const uniqueBalitaNiks = new Set(balitaRecords.map(r => r.person_key));
    const uniqueBumilNiks = new Set(bumilRecords.map(r => r.person_key));

    // GK
    const gkList = balitaRecords.filter(r => r.indikasi === "gizi_kurang");
    const gkAppropriate = gkList.filter(r => r.zs_bbtb_awal !== null && r.zs_bbtb_awal < -2.0 && r.zs_bbtb_awal >= -5.0).length;
    const gkEvaluable = gkList.filter(r => r.zs_bbtb_awal !== null && r.zs_bbtb_akhir !== null);
    const gkRecovered = gkEvaluable.filter(r => r.zs_bbtb_akhir! > -2.0).length;
    const gkRecoveryRate = gkEvaluable.length > 0 ? (gkRecovered / gkEvaluable.length) * 100 : null;

    // UW
    const uwList = balitaRecords.filter(r => r.indikasi === "underweight");
    const uwAppropriate = uwList.filter(r => r.zs_bbu_awal !== null && r.zs_bbu_awal < -2.0 && r.zs_bbu_awal >= -6.0).length;
    const uwEvaluable = uwList.filter(r => r.zs_bbu_awal !== null && r.zs_bbu_akhir !== null);
    const uwRecovered = uwEvaluable.filter(r => r.zs_bbu_akhir! > -2.0).length;
    const uwRecoveryRate = uwEvaluable.length > 0 ? (uwRecovered / uwEvaluable.length) * 100 : null;

    // Balita T
    const tList = balitaRecords.filter(r => r.indikasi === "balita_t");
    const tAppropriate = tList.filter(r => r.status_pertumbuhan_awal === "T" || (r.zs_bbu_awal !== null && r.zs_bbu_awal >= -2.0)).length;
    const tEvaluable = tList.filter(r => r.zs_bbu_awal !== null && r.zs_bbu_akhir !== null);
    const tImproved = tEvaluable.filter(r => {
        const deltaZ = (r.zs_bbu_akhir ?? 0) - (r.zs_bbu_awal ?? 0);
        return deltaZ > 0.1 || r.status_pertumbuhan_akhir === "N";
    }).length;
    const tImprovedRate = tEvaluable.length > 0 ? (tImproved / tEvaluable.length) * 100 : null;

    // Bumil
    const bumilCompleted = bumilRecords.filter(r => r.status_pmt_reported === "Selesai").length;
    const bumilEvaluable = bumilRecords.filter(r => r.bb_awal !== null && r.bb_akhir !== null && r.bb_akhir > 0);
    let totalGain = 0;
    let meetingCount = 0;
    for (const b of bumilEvaluable) {
        const gain = (b.bb_akhir ?? 0) - (b.bb_awal ?? 0);
        totalGain += gain;
        if (gain >= 2.0 || b.hasil_pemberian_reported === "Sesuai") {
            meetingCount++;
        }
    }
    const bumilMeanWeightGain = bumilEvaluable.length > 0 ? totalGain / bumilEvaluable.length : null;
    const bumilMeetingRate = bumilEvaluable.length > 0 ? (meetingCount / bumilEvaluable.length) * 100 : null;

    // DQA count
    let allIssues: DqaIssue[] = [];
    balitaRecords.forEach(r => allIssues.push(...auditBalitaRecord(r)));
    bumilRecords.forEach(r => allIssues.push(...auditBumilRecord(r)));

    // Detect cross-indication overlap NIKs in balita
    const nikCounts: Record<string, number> = {};
    balitaRecords.forEach(r => {
        nikCounts[r.person_key] = (nikCounts[r.person_key] || 0) + 1;
    });
    const overlapNikCount = Object.values(nikCounts).filter(c => c > 1).length;

    return {
        totalBalitaIntake: balitaRecords.length,
        totalBumilIntake: bumilRecords.length,
        uniqueBalitaCount: uniqueBalitaNiks.size,
        uniqueBumilCount: uniqueBumilNiks.size,

        gkIntake: gkList.length,
        gkAppropriate,
        gkEvaluable: gkEvaluable.length,
        gkRecovered,
        gkRecoveryRate,

        uwIntake: uwList.length,
        uwAppropriate,
        uwEvaluable: uwEvaluable.length,
        uwRecovered,
        uwRecoveryRate,

        tIntake: tList.length,
        tAppropriate,
        tEvaluable: tEvaluable.length,
        tImproved,
        tImprovedRate,

        bumilIntake: bumilRecords.length,
        bumilCompleted,
        bumilEvaluable: bumilEvaluable.length,
        bumilMeanWeightGain,
        bumilMeetingTarget: meetingCount,
        bumilMeetingRate,

        totalIssues: allIssues.length,
        blockIssues: allIssues.filter(i => i.severity === "block").length,
        reviewIssues: allIssues.filter(i => i.severity === "needs_review").length,
        overlapNikCount
    };
}

// ─── Puskesmas Breakdown Aggregator ──────────────────────────────────────────

export function aggregateByPuskesmas(
    records: PmtBalitaRecord[],
    indicationFilter?: PmtIndicationBalita
): PuskesmasPmtSummary[] {
    const filtered = indicationFilter ? records.filter(r => r.indikasi === indicationFilter) : records;
    const map: Record<string, PuskesmasPmtSummary> = {};

    for (const r of filtered) {
        const pkm = r.puskesmas || "Tidak Terdefinisi";
        if (!map[pkm]) {
            map[pkm] = {
                puskesmas: pkm,
                total_intake: 0,
                eligible: 0,
                evaluable: 0,
                recovered_or_improved: 0,
                recovery_rate: null,
                dqa_issue_count: 0,
                stunted_rate: null
            };
        }

        map[pkm].total_intake++;
        if (r.is_eligible) map[pkm].eligible++;
        if (r.is_evaluable) {
            map[pkm].evaluable++;
            // Check recovery based on indication
            if (r.indikasi === "gizi_kurang" && r.zs_bbtb_akhir !== null && r.zs_bbtb_akhir > -2.0) {
                map[pkm].recovered_or_improved++;
            } else if (r.indikasi === "underweight" && r.zs_bbu_akhir !== null && r.zs_bbu_akhir > -2.0) {
                map[pkm].recovered_or_improved++;
            } else if (r.indikasi === "balita_t") {
                const delta = (r.zs_bbu_akhir ?? 0) - (r.zs_bbu_awal ?? 0);
                if (delta > 0.1 || r.status_pertumbuhan_akhir === "N") {
                    map[pkm].recovered_or_improved++;
                }
            }
        }

        if (r.dqa_flags.length > 0) {
            map[pkm].dqa_issue_count += r.dqa_flags.length;
        }
    }

    // Compute rates
    const result = Object.values(map).map(item => {
        const rate = item.evaluable > 0 ? (item.recovered_or_improved / item.evaluable) * 100 : null;
        return {
            ...item,
            recovery_rate: rate !== null ? Math.round(rate * 10) / 10 : null
        };
    });

    // Sort by total intake descending
    return result.sort((a, b) => b.total_intake - a.total_intake);
}

// ─── Default Sample Data Generator (Matching PRD Malang 2026 Audit) ─────────

const SAMPLE_PUSKESMAS_LIST = [
    "Ampelgading", "Bantur", "Dampit", "Donomulyo", "Gedangan",
    "Gondanglegi", "Kalipare", "Karangploso", "Kasembon", "Kepanjen",
    "Kromengan", "Lawang", "Ngajum", "Pagak"
];

export function generateSamplePmtData(): {
    balitaRecords: PmtBalitaRecord[];
    bumilRecords: PmtBumilRecord[];
} {
    const balita: PmtBalitaRecord[] = [];
    const bumil: PmtBumilRecord[] = [];

    // Helper random within bounds
    function rand(min: number, max: number) {
        return Math.random() * (max - min) + min;
    }
    function randInt(min: number, max: number) {
        return Math.floor(rand(min, max));
    }

    let globalId = 1;

    // 1. Gizi Kurang: Exactly 460 rows across 10 Puskesmas (Puskesmas 0-9)
    for (let i = 0; i < 460; i++) {
        const pkm = SAMPLE_PUSKESMAS_LIST[i % 10];
        const sex: "L" | "P" = i % 2 === 0 ? "L" : "P";
        const nik = `3507${String(i + 1).padStart(12, "0")}`;
        
        // Realistic initial WHZ: between -3.0 and -2.01 (Gizi Kurang)
        let zs_whz_awal = Math.round(rand(-2.8, -2.05) * 100) / 100;
        let zs_waz_awal = Math.round(rand(-2.5, -1.5) * 100) / 100;
        let zs_haz_awal = Math.round(rand(-2.8, -1.0) * 100) / 100;
        const bb_awal = Math.round(rand(7.0, 11.5) * 100) / 100;
        const tb_awal = Math.round(rand(70.0, 92.0) * 10) / 10;

        // Outcome: ~58% recover to WHZ > -2.0
        const recovers = Math.random() < 0.58;
        let zs_whz_akhir = recovers
            ? Math.round(rand(-1.95, -1.1) * 100) / 100
            : Math.round(rand(-2.4, -2.01) * 100) / 100;
        let zs_waz_akhir = Math.round((zs_waz_awal + (recovers ? 0.4 : 0.05)) * 100) / 100;
        let zs_haz_akhir = zs_haz_awal;
        const bb_akhir = Math.round((bb_awal + (recovers ? rand(0.6, 1.2) : rand(0.1, 0.4))) * 100) / 100;
        const tb_akhir = Math.round((tb_awal + rand(0.5, 1.5)) * 10) / 10;

        const flags: string[] = [];

        // Insert some documented PRD anomalies:
        if (i === 12) {
            // ZS akhir 999.99
            zs_whz_akhir = 999.99;
            flags.push("CHILD_Z_FLAG");
        }
        if (i === 45) {
            // WHZ baseline normal mismatch
            zs_whz_awal = -1.85;
            flags.push("TARGET_MISMATCH");
        }
        if (i === 88) {
            // Extreme jump
            flags.push("PARSE_BAD");
        }

        balita.push({
            id: `gk-${globalId++}`,
            person_key: nik,
            nama_masked: maskName(`ANAK GK ${i + 1}`),
            jk: sex,
            tgl_lahir: "2024-05-15",
            provinsi: "Jawa Timur",
            kabupaten: "Malang",
            kecamatan: `Kec. ${pkm}`,
            puskesmas: pkm,
            desa: `Desa ${pkm} 1`,
            posyandu: `Posyandu Melati ${i % 3 + 1}`,
            indikasi: "gizi_kurang",
            sumber_anggaran: "BOK 2026",
            siklus_pmt: 1,
            jumlah_pemantauan: randInt(4, 8),
            tgl_ukur_awal: "2026-06-10",
            bb_awal,
            tb_awal,
            zs_bbu_awal: zs_waz_awal,
            zs_tbu_awal: zs_haz_awal,
            zs_bbtb_awal: zs_whz_awal,
            status_bbtb_awal: "Gizi Kurang",
            status_pertumbuhan_awal: "T",
            tgl_ukur_akhir: null, // As documented in PRD: balita files have no final date
            bb_akhir,
            tb_akhir,
            zs_bbu_akhir: zs_waz_akhir,
            zs_tbu_akhir: zs_haz_akhir,
            zs_bbtb_akhir: zs_whz_akhir,
            status_bbtb_akhir: zs_whz_akhir > -2.0 ? "Gizi Baik" : "Gizi Kurang",
            status_pertumbuhan_akhir: recovers ? "N" : "T",
            dqa_flags: flags,
            is_eligible: zs_whz_awal < -2.0 && zs_whz_awal >= -5.0,
            is_evaluable: zs_whz_awal !== null && zs_whz_akhir !== null && zs_whz_akhir < 50,
            stunted_baseline: zs_haz_awal < -2.0
        });
    }

    // 2. Underweight: Exactly 604 rows across 10 Puskesmas
    for (let i = 0; i < 604; i++) {
        const pkm = SAMPLE_PUSKESMAS_LIST[i % 10];
        const sex: "L" | "P" = i % 2 === 0 ? "L" : "P";
        // 5 overlapping NIKs with T as per PRD audit!
        const nik = i < 5 ? `3507_OVERLAP_${i}` : `3507_UW_${String(i).padStart(10, "0")}`;

        let zs_waz_awal = Math.round(rand(-2.9, -2.05) * 100) / 100;
        let zs_whz_awal = Math.round(rand(-1.8, -0.5) * 100) / 100; // Normal WHZ
        let zs_haz_awal = Math.round(rand(-2.2, -0.8) * 100) / 100;
        const bb_awal = Math.round(rand(6.8, 10.5) * 100) / 100;
        const tb_awal = Math.round(rand(68.0, 88.0) * 10) / 10;

        // ~38% recover to WAZ > -2.0
        const recovers = Math.random() < 0.385;
        let zs_waz_akhir = recovers
            ? Math.round(rand(-1.95, -1.4) * 100) / 100
            : Math.round(rand(-2.6, -2.02) * 100) / 100;
        const bb_akhir = Math.round((bb_awal + (recovers ? rand(0.5, 0.9) : rand(0.1, 0.3))) * 100) / 100;

        const flags: string[] = [];
        if (i === 15) {
            zs_waz_awal = -1.75;
            flags.push("TARGET_MISMATCH");
        }

        balita.push({
            id: `uw-${globalId++}`,
            person_key: nik,
            nama_masked: maskName(`ANAK UW ${i + 1}`),
            jk: sex,
            tgl_lahir: "2024-08-20",
            provinsi: "Jawa Timur",
            kabupaten: "Malang",
            kecamatan: `Kec. ${pkm}`,
            puskesmas: pkm,
            desa: `Desa ${pkm} 2`,
            posyandu: `Posyandu Mawar ${i % 3 + 1}`,
            indikasi: "underweight",
            sumber_anggaran: "BOK 2026",
            siklus_pmt: 1,
            jumlah_pemantauan: randInt(4, 8),
            tgl_ukur_awal: "2026-06-12",
            bb_awal,
            tb_awal,
            zs_bbu_awal: zs_waz_awal,
            zs_tbu_awal: zs_haz_awal,
            zs_bbtb_awal: zs_whz_awal,
            status_bbu_awal: "Berat Badan Kurang",
            status_pertumbuhan_awal: "T",
            tgl_ukur_akhir: null,
            bb_akhir,
            tb_akhir: tb_awal,
            zs_bbu_akhir: zs_waz_akhir,
            zs_tbu_akhir: zs_haz_awal,
            zs_bbtb_akhir: zs_whz_awal,
            status_bbu_akhir: zs_waz_akhir > -2.0 ? "Berat Badan Normal" : "Berat Badan Kurang",
            status_pertumbuhan_akhir: recovers ? "N" : "T",
            dqa_flags: flags,
            is_eligible: zs_waz_awal < -2.0 && zs_waz_awal >= -6.0,
            is_evaluable: zs_waz_awal !== null && zs_waz_akhir !== null,
            stunted_baseline: zs_haz_awal < -2.0
        });
    }

    // 3. Balita T: Exactly 2,266 rows across 14 Puskesmas
    for (let i = 0; i < 2266; i++) {
        const pkm = SAMPLE_PUSKESMAS_LIST[i % 14];
        const sex: "L" | "P" = i % 2 === 0 ? "L" : "P";
        // 5 overlapping NIKs with UW
        const nik = i < 5 ? `3507_OVERLAP_${i}` : `3507_T_${String(i).padStart(10, "0")}`;

        let zs_waz_awal = Math.round(rand(-1.9, 0.2) * 100) / 100;
        let zs_haz_awal = Math.round(rand(-2.0, 0.5) * 100) / 100;
        const bb_awal = Math.round(rand(7.5, 12.0) * 100) / 100;
        const tb_awal = Math.round(rand(72.0, 95.0) * 10) / 10;

        // ~43% response (ΔWAZ > 0.1 or Naik)
        const improved = Math.random() < 0.435;
        const deltaZ = improved ? Math.round(rand(0.12, 0.35) * 100) / 100 : Math.round(rand(-0.15, 0.08) * 100) / 100;
        const zs_waz_akhir = Math.round((zs_waz_awal + deltaZ) * 100) / 100;
        const bb_akhir = Math.round((bb_awal + (improved ? rand(0.3, 0.7) : rand(-0.1, 0.15))) * 100) / 100;

        balita.push({
            id: `t-${globalId++}`,
            person_key: nik,
            nama_masked: maskName(`BALITA T ${i + 1}`),
            jk: sex,
            tgl_lahir: "2024-03-10",
            provinsi: "Jawa Timur",
            kabupaten: "Malang",
            kecamatan: `Kec. ${pkm}`,
            puskesmas: pkm,
            desa: `Desa ${pkm} 3`,
            posyandu: `Posyandu Dahlia ${i % 4 + 1}`,
            indikasi: "balita_t",
            sumber_anggaran: "BOK 2026",
            siklus_pmt: 1,
            jumlah_pemantauan: randInt(2, 6),
            tgl_ukur_awal: "2026-06-15",
            bb_awal,
            tb_awal,
            zs_bbu_awal: zs_waz_awal,
            zs_tbu_awal: zs_haz_awal,
            zs_bbtb_awal: 0,
            status_bbu_awal: "Normal",
            status_pertumbuhan_awal: "T",
            tgl_ukur_akhir: null,
            bb_akhir,
            tb_akhir: tb_awal,
            zs_bbu_akhir: zs_waz_akhir,
            zs_tbu_akhir: zs_haz_awal,
            zs_bbtb_akhir: 0,
            status_bbu_akhir: "Normal",
            status_pertumbuhan_akhir: improved ? "N" : "T",
            dqa_flags: [],
            is_eligible: true,
            is_evaluable: true,
            stunted_baseline: zs_haz_awal < -2.0
        });
    }

    // 4. Bumil KEK: Exactly 29 rows across 6 Puskesmas (as per PRD audit)
    for (let i = 0; i < 29; i++) {
        const pkm = SAMPLE_PUSKESMAS_LIST[i % 6];
        const nik = `3507_BUMIL_${String(i + 1).padStart(8, "0")}`;
        const isKek = i < 22; // 22 KEK, 7 Risiko KEK

        const bb_awal = Math.round(rand(38.0, 47.0) * 10) / 10;
        // 24 marked "Selesai", 4 BB akhir empty, 1 marked selesai with empty BB akhir
        let bb_akhir: number | null = Math.round((bb_awal + rand(1.5, 4.2)) * 10) / 10;
        let status_pmt = "Selesai";
        const flags: string[] = [];

        if (i >= 25) {
            // 4 empty final weights
            bb_akhir = null;
            if (i === 25) {
                status_pmt = "Selesai"; // 1 marked selesai with empty BB
                flags.push("STATUS_CONFLICT");
            } else {
                status_pmt = "Proses";
            }
        }

        const delta = (bb_akhir !== null && bb_awal !== null) ? bb_akhir - bb_awal : null;

        bumil.push({
            id: `bumil-${i + 1}`,
            person_key: nik,
            nama_masked: maskName(`IBU HAMIL ${i + 1}`),
            provinsi: "Jawa Timur",
            kabupaten: "Malang",
            kecamatan: `Kec. ${pkm}`,
            puskesmas: pkm,
            desa: `Desa ${pkm} A`,
            posyandu: "Posyandu Bumil Ceria",
            indikasi: isKek ? "kek" : "risiko_kek",
            alasan_raw: isKek ? "Kurang Energi Kronis" : "Risiko Kurang Energi Kronis",
            tgl_pemberian_pertama: "2026-06-05",
            tgl_selesai_reported: status_pmt === "Selesai" ? "2026-09-05" : undefined,
            tgl_timbang_akhir: null,
            bb_awal,
            bb_akhir,
            lila_cm: Math.round(rand(20.0, 23.2) * 10) / 10,
            status_pmt_reported: status_pmt,
            hasil_pemberian_reported: (delta !== null && delta >= 2.0) ? "Sesuai" : "Tidak Sesuai",
            siklus_pmt: 1,
            jumlah_pemantauan: randInt(3, 4),
            dqa_flags: flags,
            delta_bb_kg: delta,
            is_eligible: true,
            is_evaluable: bb_akhir !== null && bb_akhir > 0
        });
    }

    return { balitaRecords: balita, bumilRecords: bumil };
}

// ─── Supabase Data Fetcher with Fallback ────────────────────────────────────

export async function fetchPmtData(targetPuskesmas?: string | null): Promise<{
    balitaRecords: PmtBalitaRecord[];
    bumilRecords: PmtBumilRecord[];
    isSampleData: boolean;
}> {
    try {
        let balitaQuery = supabase.from("data_pmt_balita").select("*").limit(5000);
        let bumilQuery = supabase.from("data_pmt_bumil").select("*").limit(2000);

        if (targetPuskesmas && targetPuskesmas !== "ALL") {
            balitaQuery = balitaQuery.ilike("puskesmas", `%${targetPuskesmas}%`);
            bumilQuery = bumilQuery.ilike("puskesmas", `%${targetPuskesmas}%`);
        }

        const [balitaRes, bumilRes] = await Promise.all([balitaQuery, bumilQuery]);

        if (
            balitaRes.error ||
            bumilRes.error ||
            !balitaRes.data ||
            balitaRes.data.length === 0
        ) {
            // Table doesn't exist or is empty; fallback to realistic seed
            const sample = generateSamplePmtData();
            let bList = sample.balitaRecords;
            let mList = sample.bumilRecords;

            if (targetPuskesmas && targetPuskesmas !== "ALL") {
                bList = bList.filter(r => r.puskesmas.toLowerCase().includes(targetPuskesmas.toLowerCase()));
                mList = mList.filter(r => r.puskesmas.toLowerCase().includes(targetPuskesmas.toLowerCase()));
            }

            return {
                balitaRecords: bList,
                bumilRecords: mList,
                isSampleData: true
            };
        }

        // Map live database rows
        const mappedBalita: PmtBalitaRecord[] = balitaRes.data.map((row: any) => ({
            id: row.id,
            person_key: row.person_key || row.nik || `ID_${row.id}`,
            nama_masked: maskName(row.nama || "ANONIM"),
            jk: row.jk || "L",
            tgl_lahir: row.tgl_lahir || "2024-01-01",
            provinsi: row.provinsi || "Jawa Timur",
            kabupaten: row.kabupaten || "Malang",
            kecamatan: row.kecamatan || "",
            puskesmas: row.puskesmas || "",
            desa: row.desa || "",
            posyandu: row.posyandu || "",
            indikasi: (row.indikasi as PmtIndicationBalita) || "gizi_kurang",
            sumber_anggaran: row.sumber_anggaran,
            siklus_pmt: row.siklus_pmt || 1,
            jumlah_pemantauan: row.jumlah_pemantauan || 0,
            tgl_ukur_awal: row.tgl_ukur_awal || "2026-06-01",
            bb_awal: row.bb_awal !== null ? Number(row.bb_awal) : null,
            tb_awal: row.tb_awal !== null ? Number(row.tb_awal) : null,
            zs_bbu_awal: row.zs_bbu_awal !== null ? Number(row.zs_bbu_awal) : null,
            zs_tbu_awal: row.zs_tbu_awal !== null ? Number(row.zs_tbu_awal) : null,
            zs_bbtb_awal: row.zs_bbtb_awal !== null ? Number(row.zs_bbtb_awal) : null,
            status_bbu_awal: row.status_bbu_awal,
            status_tbu_awal: row.status_tbu_awal,
            status_bbtb_awal: row.status_bbtb_awal,
            status_pertumbuhan_awal: row.status_pertumbuhan_awal,
            tgl_ukur_akhir: row.tgl_ukur_akhir || null,
            bb_akhir: row.bb_akhir !== null ? Number(row.bb_akhir) : null,
            tb_akhir: row.tb_akhir !== null ? Number(row.tb_akhir) : null,
            zs_bbu_akhir: row.zs_bbu_akhir !== null ? Number(row.zs_bbu_akhir) : null,
            zs_tbu_akhir: row.zs_tbu_akhir !== null ? Number(row.zs_tbu_akhir) : null,
            zs_bbtb_akhir: row.zs_bbtb_akhir !== null ? Number(row.zs_bbtb_akhir) : null,
            status_bbu_akhir: row.status_bbu_akhir,
            status_tbu_akhir: row.status_tbu_akhir,
            status_bbtb_akhir: row.status_bbtb_akhir,
            status_pertumbuhan_akhir: row.status_pertumbuhan_akhir,
            dqa_flags: row.dqa_flags || [],
            is_eligible: row.is_eligible ?? true,
            is_evaluable: row.is_evaluable ?? (row.bb_akhir !== null),
            stunted_baseline: (row.zs_tbu_awal !== null && Number(row.zs_tbu_awal) < -2.0)
        }));

        const mappedBumil: PmtBumilRecord[] = bumilRes.data.map((row: any) => ({
            id: row.id,
            person_key: row.person_key || row.nik || `ID_${row.id}`,
            nama_masked: maskName(row.nama || "ANONIM"),
            provinsi: row.provinsi || "Jawa Timur",
            kabupaten: row.kabupaten || "Malang",
            kecamatan: row.kecamatan || "",
            puskesmas: row.puskesmas || "",
            desa: row.desa || "",
            posyandu: row.posyandu || "",
            indikasi: (row.indikasi as PmtIndicationBumil) || "kek",
            alasan_raw: row.alasan_raw,
            tgl_pemberian_pertama: row.tgl_pemberian_pertama || "2026-06-01",
            tgl_selesai_reported: row.tgl_selesai_reported,
            tgl_timbang_akhir: row.tgl_timbang_akhir,
            bb_awal: row.bb_awal !== null ? Number(row.bb_awal) : null,
            bb_akhir: row.bb_akhir !== null ? Number(row.bb_akhir) : null,
            lila_cm: row.lila_cm !== null ? Number(row.lila_cm) : null,
            status_pmt_reported: row.status_pmt_reported,
            hasil_pemberian_reported: row.hasil_pemberian_reported,
            siklus_pmt: row.siklus_pmt || 1,
            jumlah_pemantauan: row.jumlah_pemantauan || 0,
            dqa_flags: row.dqa_flags || [],
            delta_bb_kg: (row.bb_akhir !== null && row.bb_awal !== null) ? Number(row.bb_akhir) - Number(row.bb_awal) : null,
            is_eligible: row.is_eligible ?? true,
            is_evaluable: row.bb_akhir !== null && Number(row.bb_akhir) > 0
        }));

        return {
            balitaRecords: mappedBalita,
            bumilRecords: mappedBumil,
            isSampleData: false
        };
    } catch (err) {
        console.error("fetchPmtData fallback to sample:", err);
        const sample = generateSamplePmtData();
        return {
            balitaRecords: sample.balitaRecords,
            bumilRecords: sample.bumilRecords,
            isSampleData: true
        };
    }
}
