/**
 * SIGMA Calculator — Mass Nutritional Assessment Engine
 * Supports bulk calculation of WHO Z-Scores with prevalence analysis
 * and WHO TEAM-style population distributions.
 *
 * Format specifications:
 *  - Date        : DD/MM/YYYY (or YYYY-MM-DD, Excel serial accepted)
 *  - Sex         : 1 | m | M = Laki-laki ; 2 | f | F = Perempuan
 *  - Cara Ukur   : l | L = Recumbent (Length/Terlentang) ; h | H = Standing (Height/Berdiri)
 *  - BB / TB     : numeric with "." as decimal separator
 */

import type { LmsReference } from "./supabase-pkmk";
import { calculateFullAssessment, type FullAssessmentResult, type SexCode, type MeasurementMethod } from "./who-zscore";

// ============================================================
// TYPES
// ============================================================

/** Raw row as parsed from Excel (unknown column names) */
export type RawRow = Record<string, unknown>;

/** Required variable keys after mapping */
export type RequiredKey = "jenis_kelamin" | "tanggal_lahir" | "tanggal_ukur" | "berat_badan" | "tinggi_badan" | "cara_ukur";
export type OptionalKey = "nama" | "wilayah" | "desa" | "nomor";
export type MappedKey = RequiredKey | OptionalKey;

/** Column mapping: varKey → Excel column name */
export type ColMap = Record<MappedKey, string | null>;

/** A normalized, parsed data row ready for calculation */
export interface ParsedRow {
    rowIndex: number;
    nama: string;
    nomor: string;
    wilayah: string;
    desa: string;
    sex: SexCode | null;
    birthDate: Date | null;
    measureDate: Date | null;
    weightKg: number | null;
    heightCm: number | null;
    measureMethod: MeasurementMethod | null;
    parseErrors: string[];
}

/** Single row result after full assessment */
export interface MassRowResult {
    rowIndex: number;
    nama: string;
    nomor: string;
    wilayah: string;
    desa: string;
    rawSex: SexCode;
    ageMonths: number;
    birthDateStr: string;
    measureDateStr: string;
    weightKg: number;
    heightCm: number;
    correctedHeight: number;
    measureMethod: MeasurementMethod;
    assessment: FullAssessmentResult;
    isValid: boolean;
    parseErrors: string[];
}

/** Summary of invalid / skipped rows */
export interface SkippedRow {
    rowIndex: number;
    nama: string;
    errors: string[];
}

/** Age group label */
export type AgeGroup = "0-5 bln" | "6-11 bln" | "12-23 bln" | "24-35 bln" | "36-47 bln" | "48-59 bln" | "≥60 bln";

export interface PrevalenceItem {
    category: string;
    n: number;
    pct: number;
}

export interface WilayahPrevalence {
    wilayah: string;
    total: number;
    stunting: number; // pendek + sangat pendek
    stuntingPct: number;
    severelyStunted: number;
    severelyStuntedPct: number;
    wasting: number; // gizi kurang + buruk
    wastingPct: number;
    underweight: number;
    underweightPct: number;
    probableStunting: number;
    probableStuntingPct: number;
}

export interface ZScoreDistPoint {
    range: string;
    min: number;
    max: number;
    bbu: number;
    tbu: number;
    bbtb: number;
}

export interface ZScoreGaussianPoint {
    binStart: number;
    binEnd: number;
    midPoint: number;
    actualBBU: number;
    actualTBU: number;
    actualBBTB: number;
    normalDistBBU: number;
    normalDistTBU: number;
    normalDistBBTB: number;
}

export interface MassAnalysisResult {
    total: number;
    valid: MassRowResult[];
    skipped: SkippedRow[];
    /** Prevalence per indeks */
    prevalenceBBU: PrevalenceItem[];
    prevalenceTBU: PrevalenceItem[];
    prevalenceBBTB: PrevalenceItem[];
    prevalenceProbableStunting: PrevalenceItem[];
    stuntingPct: number;
    wastingPct: number;
    underweightPct: number;
    probableStuntingPct: number;
    redFlagCount: number;
    /** WHO TEAM distributions */
    ageGroupDist: Array<{ group: AgeGroup; n: number; pct: number }>;
    sexDist: Array<{ label: string; n: number; pct: number }>;
    bbDist: Array<{ range: string; n: number }>;
    tbDist: Array<{ range: string; n: number }>;
    zscoreDist: ZScoreDistPoint[];
    zscoreGaussian: ZScoreGaussianPoint[];
    /** Per-wilayah prevalence */
    wilayahPrevalence: WilayahPrevalence[];
    desaPrevalence: WilayahPrevalence[];
}

// ============================================================
// COLUMN AUTO-DETECTION
// ============================================================

const COLUMN_ALIASES: Record<MappedKey, string[]> = {
    jenis_kelamin: ["sex", "jk", "gender", "kelamin", "jenis_kelamin", "jenis kelamin", "jeniskelamin", "seks"],
    tanggal_lahir: ["dob", "birth", "tgl_lahir", "tgllahir", "tanggal_lahir", "tanggal lahir", "birthdate", "birth_date"],
    tanggal_ukur: ["tgl_ukur", "tglukur", "tanggal_ukur", "tanggal ukur", "tanggal_pengukuran", "measure_date", "ukur"],
    berat_badan: ["bb", "bb_kg", "berat", "weight", "berat_badan", "beratbadan", "weight_kg", "berat badan"],
    tinggi_badan: ["tb", "pb", "tb_cm", "pb_cm", "height", "length", "panjang", "tinggi", "tinggi_badan", "panjang_badan", "tinggibadan", "panjangbadan", "tinggi badan", "panjang badan"],
    cara_ukur: ["cara_ukur", "cara ukur", "posisi", "measure", "method", "metode", "pengukuran", "measurement_method"],
    nama: ["name", "nama", "nama_anak", "child_name", "nama anak"],
    wilayah: ["kecamatan", "area", "district", "blok", "wilayah", "lokasi", "location", "kec"],
    desa: ["desa", "kelurahan", "village", "kel"],
    nomor: ["no", "nomor", "id", "id_anak", "number"],
};

export function autoDetectColumns(headers: string[]): Partial<ColMap> {
    const normalized = headers.map((h) => h.toLowerCase().trim().replace(/\s+/g, " ").replace(/_/g, " "));
    const result: Partial<ColMap> = {};

    for (const [key, aliases] of Object.entries(COLUMN_ALIASES) as [MappedKey, string[]][]) {
        for (const alias of aliases) {
            const normalizedAlias = alias.toLowerCase().replace(/_/g, " ");
            const idx = normalized.findIndex(
                (n) => n === normalizedAlias || n.includes(normalizedAlias) || normalizedAlias.includes(n)
            );
            if (idx >= 0) {
                result[key] = headers[idx];
                break;
            }
        }
    }
    return result;
}

// ============================================================
// VALUE PARSERS
// ============================================================

export function parseDate(val: unknown): Date | null {
    if (val === null || val === undefined || val === "") return null;

    // Excel serial number (number type from xlsx)
    if (typeof val === "number") {
        const d = new Date((val - 25569) * 86400 * 1000);
        if (!isNaN(d.getTime())) return d;
    }

    const str = String(val).trim();
    if (!str) return null;

    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const ddmm = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (ddmm) {
        const d = new Date(+ddmm[3], +ddmm[2] - 1, +ddmm[1]);
        if (!isNaN(d.getTime())) return d;
    }

    // YYYY-MM-DD or YYYY/MM/DD
    const yyyymm = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (yyyymm) {
        const d = new Date(+yyyymm[1], +yyyymm[2] - 1, +yyyymm[3]);
        if (!isNaN(d.getTime())) return d;
    }

    // Natural JS
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
}

export function parseSex(val: unknown): SexCode | null {
    if (val === null || val === undefined || val === "") return null;
    const s = String(val).trim().toLowerCase();
    if (["1", "m", "male", "l", "laki", "laki-laki", "lakilaki"].includes(s)) return 1;
    if (["2", "f", "female", "p", "perempuan", "wanita"].includes(s)) return 2;
    return null;
}

export function parseMeasure(val: unknown): MeasurementMethod | null {
    if (val === null || val === undefined || val === "") return null;
    const s = String(val).trim().toLowerCase();
    if (["l", "length", "recumbent", "terlentang", "pb", "berbaring"].includes(s)) return "recumbent";
    if (["h", "height", "standing", "berdiri", "tb"].includes(s)) return "standing";
    return null;
}

export function parseNumber(val: unknown): number | null {
    if (val === null || val === undefined || val === "") return null;
    if (typeof val === "number") return isNaN(val) ? null : val;
    // Replace comma decimal separator
    const str = String(val).trim().replace(",", ".");
    const n = parseFloat(str);
    return isNaN(n) ? null : n;
}

// ============================================================
// ROW NORMALIZATION
// ============================================================

export function normalizeRows(rawRows: RawRow[], colMap: ColMap): ParsedRow[] {
    return rawRows.map((row, i) => {
        const parseErrors: string[] = [];

        const get = (key: MappedKey): unknown => {
            const col = colMap[key];
            return col ? row[col] : undefined;
        };

        const sex = parseSex(get("jenis_kelamin"));
        if (sex === null) parseErrors.push("Jenis Kelamin tidak valid (harus 1/m/M atau 2/f/F)");

        const birthDate = parseDate(get("tanggal_lahir"));
        if (!birthDate) parseErrors.push("Tanggal Lahir tidak valid (format: DD/MM/YYYY)");

        const measureDate = parseDate(get("tanggal_ukur"));
        if (!measureDate) parseErrors.push("Tanggal Ukur tidak valid (format: DD/MM/YYYY)");

        if (birthDate && measureDate && birthDate > measureDate) {
            parseErrors.push("Tanggal Lahir lebih besar dari Tanggal Ukur");
        }

        const weightKg = parseNumber(get("berat_badan"));
        if (weightKg === null) parseErrors.push("Berat Badan tidak valid (angka, gunakan titik sebagai desimal)");
        else if (weightKg < 1 || weightKg > 50) parseErrors.push(`Berat Badan ${weightKg} kg di luar rentang wajar (1-50 kg)`);

        const heightCm = parseNumber(get("tinggi_badan"));
        if (heightCm === null) parseErrors.push("Tinggi/Panjang Badan tidak valid (angka, gunakan titik sebagai desimal)");
        else if (heightCm < 40 || heightCm > 130) parseErrors.push(`Tinggi Badan ${heightCm} cm di luar rentang wajar (40-130 cm)`);

        const measureMethod = parseMeasure(get("cara_ukur"));
        if (measureMethod === null) parseErrors.push("Cara Ukur tidak valid (l/L = terlentang, h/H = berdiri)");

        return {
            rowIndex: i + 2, // +2 for 1-indexed + header row
            nama: String(get("nama") ?? "").trim() || `Baris ${i + 2}`,
            nomor: String(get("nomor") ?? i + 1).trim(),
            wilayah: String(get("wilayah") ?? "").trim() || "(Tidak Ada Wilayah)",
            desa: String(get("desa") ?? "").trim() || "(Tidak Ada Desa)",
            sex,
            birthDate,
            measureDate,
            weightKg,
            heightCm,
            measureMethod,
            parseErrors,
        };
    });
}

// ============================================================
// MASS CALCULATION (chunked with progress callback)
// ============================================================

export async function calculateMassAssessment(
    parsedRows: ParsedRow[],
    lms: LmsReference,
    onProgress?: (done: number, total: number) => void
): Promise<{ valid: MassRowResult[]; skipped: SkippedRow[] }> {
    const valid: MassRowResult[] = [];
    const skipped: SkippedRow[] = [];
    const CHUNK = 50;

    for (let i = 0; i < parsedRows.length; i += CHUNK) {
        const chunk = parsedRows.slice(i, i + CHUNK);

        for (const row of chunk) {
            if (
                row.parseErrors.length > 0 ||
                row.sex === null ||
                !row.birthDate ||
                !row.measureDate ||
                row.weightKg === null ||
                row.heightCm === null ||
                row.measureMethod === null
            ) {
                skipped.push({ rowIndex: row.rowIndex, nama: row.nama, errors: row.parseErrors });
                continue;
            }

            try {
                const assessment = calculateFullAssessment(
                    {
                        birthDate: row.birthDate,
                        measureDate: row.measureDate,
                        sex: row.sex,
                        weightKg: row.weightKg,
                        heightCm: row.heightCm,
                        measurementMethod: row.measureMethod,
                    },
                    lms
                );

                valid.push({
                    rowIndex: row.rowIndex,
                    nama: row.nama,
                    nomor: row.nomor,
                    wilayah: row.wilayah,
                    desa: row.desa,
                    rawSex: row.sex,
                    ageMonths: assessment.ageMonths,
                    birthDateStr: row.birthDate.toLocaleDateString("id-ID"),
                    measureDateStr: row.measureDate.toLocaleDateString("id-ID"),
                    weightKg: row.weightKg,
                    heightCm: row.heightCm,
                    correctedHeight: assessment.correctedHeight,
                    measureMethod: row.measureMethod,
                    assessment,
                    isValid: true,
                    parseErrors: [],
                });
            } catch {
                skipped.push({ rowIndex: row.rowIndex, nama: row.nama, errors: ["Error kalkulasi ZScore"] });
            }
        }

        onProgress?.(Math.min(i + CHUNK, parsedRows.length), parsedRows.length);
        // yield to event loop between chunks
        await new Promise((r) => setTimeout(r, 0));
    }

    return { valid, skipped };
}

// ============================================================
// AGE GROUPING
// ============================================================

export function getAgeGroup(months: number): AgeGroup {
    if (months <= 5) return "0-5 bln";
    if (months <= 11) return "6-11 bln";
    if (months <= 23) return "12-23 bln";
    if (months <= 35) return "24-35 bln";
    if (months <= 47) return "36-47 bln";
    if (months <= 59) return "48-59 bln";
    return "≥60 bln";
}

const AGE_GROUP_ORDER: AgeGroup[] = ["0-5 bln", "6-11 bln", "12-23 bln", "24-35 bln", "36-47 bln", "48-59 bln", "≥60 bln"];

// ============================================================
// STATISTICS COMPUTATION
// ============================================================

function pct(n: number, total: number): number {
    return total === 0 ? 0 : Math.round((n / total) * 1000) / 10;
}

function countClassification(rows: MassRowResult[], indexFn: (r: MassRowResult) => string, category: string): number {
    return rows.filter((r) => indexFn(r) === category).length;
}

export function computeAnalysis(valid: MassRowResult[], skipped: SkippedRow[], totalRows: number): MassAnalysisResult {
    const n = valid.length;

    // ---- PREVALENCE BBU ----
    const bbuCategories = ["Berat Badan Sangat Kurang", "Berat Badan Kurang", "Berat Badan Normal", "Risiko Berat Badan Lebih"];
    const prevalenceBBU: PrevalenceItem[] = bbuCategories.map((cat) => {
        const count = countClassification(valid, (r) => r.assessment.bbu.classification, cat);
        return { category: cat, n: count, pct: pct(count, n) };
    });

    // ---- PREVALENCE TBU ----
    const tbuCategories = ["Sangat Pendek", "Pendek", "Normal", "Tinggi"];
    const prevalenceTBU: PrevalenceItem[] = tbuCategories.map((cat) => {
        const count = countClassification(valid, (r) => r.assessment.tbu.classification, cat);
        return { category: cat, n: count, pct: pct(count, n) };
    });

    // ---- PREVALENCE BBTB ----
    const bbtbCategories = ["Gizi Buruk", "Gizi Kurang", "Gizi Baik", "Berisiko Gizi Lebih", "Gizi Lebih", "Obesitas"];
    const prevalenceBBTB: PrevalenceItem[] = bbtbCategories.map((cat) => {
        const count = countClassification(valid, (r) => r.assessment.bbtb.classification, cat);
        return { category: cat, n: count, pct: pct(count, n) };
    });

    // ---- PROBABLE STUNTING ----
    const psYes = valid.filter((r) => r.assessment.probableStunting.isProbableStunting).length;
    const psNo = n - psYes;
    const prevalenceProbableStunting: PrevalenceItem[] = [
        { category: "Terindikasi PS", n: psYes, pct: pct(psYes, n) },
        { category: "Tidak Terindikasi", n: psNo, pct: pct(psNo, n) },
    ];

    // Key prevalence rates
    const stuntingN = countClassification(valid, (r) => r.assessment.tbu.classification, "Pendek") +
        countClassification(valid, (r) => r.assessment.tbu.classification, "Sangat Pendek");
    const wastingN = countClassification(valid, (r) => r.assessment.bbtb.classification, "Gizi Kurang") +
        countClassification(valid, (r) => r.assessment.bbtb.classification, "Gizi Buruk");
    const underweightN = countClassification(valid, (r) => r.assessment.bbu.classification, "Berat Badan Kurang") +
        countClassification(valid, (r) => r.assessment.bbu.classification, "Berat Badan Sangat Kurang");

    // ---- AGE GROUP ----
    const ageGroupMap = new Map<AgeGroup, number>();
    AGE_GROUP_ORDER.forEach((g) => ageGroupMap.set(g, 0));
    valid.forEach((r) => {
        const g = getAgeGroup(r.ageMonths);
        ageGroupMap.set(g, (ageGroupMap.get(g) ?? 0) + 1);
    });
    const ageGroupDist = AGE_GROUP_ORDER.map((group) => ({
        group,
        n: ageGroupMap.get(group) ?? 0,
        pct: pct(ageGroupMap.get(group) ?? 0, n),
    }));

    // ---- SEX DISTRIBUTION ----
    const laki = valid.filter((r) => r.rawSex === 1).length;
    const perempuan = valid.filter((r) => r.rawSex === 2).length;
    const sexDist = [
        { label: "Laki-laki", n: laki, pct: pct(laki, n) },
        { label: "Perempuan", n: perempuan, pct: pct(perempuan, n) },
    ];

    // ---- BB DISTRIBUTION ----
    const bbRanges = [
        { range: "< 5 kg", min: 0, max: 5 },
        { range: "5-7.9 kg", min: 5, max: 8 },
        { range: "8-10.9 kg", min: 8, max: 11 },
        { range: "11-13.9 kg", min: 11, max: 14 },
        { range: "14-16.9 kg", min: 14, max: 17 },
        { range: "≥ 17 kg", min: 17, max: 999 },
    ];
    const bbDist = bbRanges.map(({ range, min, max }) => ({
        range,
        n: valid.filter((r) => r.weightKg >= min && r.weightKg < max).length,
    }));

    // ---- TB DISTRIBUTION ----
    const tbRanges = [
        { range: "< 60 cm", min: 0, max: 60 },
        { range: "60-69.9 cm", min: 60, max: 70 },
        { range: "70-79.9 cm", min: 70, max: 80 },
        { range: "80-89.9 cm", min: 80, max: 90 },
        { range: "90-99.9 cm", min: 90, max: 100 },
        { range: "≥ 100 cm", min: 100, max: 999 },
    ];
    const tbDist = tbRanges.map(({ range, min, max }) => ({
        range,
        n: valid.filter((r) => r.correctedHeight >= min && r.correctedHeight < max).length,
    }));

    // ---- ZSCORE DISTRIBUTION ----
    const zBuckets = [
        { range: "< -4", min: -999, max: -4 },
        { range: "-4 s/d -3", min: -4, max: -3 },
        { range: "-3 s/d -2", min: -3, max: -2 },
        { range: "-2 s/d -1", min: -2, max: -1 },
        { range: "-1 s/d 0", min: -1, max: 0 },
        { range: "0 s/d +1", min: 0, max: 1 },
        { range: "+1 s/d +2", min: 1, max: 2 },
        { range: "+2 s/d +3", min: 2, max: 3 },
        { range: "> +3", min: 3, max: 999 },
    ];
    const zscoreDist: ZScoreDistPoint[] = zBuckets.map(({ range, min, max }) => ({
        range,
        min,
        max,
        bbu: valid.filter((r) => r.assessment.bbu.zscore !== null && r.assessment.bbu.zscore >= min && r.assessment.bbu.zscore < max).length,
        tbu: valid.filter((r) => r.assessment.tbu.zscore !== null && r.assessment.tbu.zscore >= min && r.assessment.tbu.zscore < max).length,
        bbtb: valid.filter((r) => r.assessment.bbtb.zscore !== null && r.assessment.bbtb.zscore >= min && r.assessment.bbtb.zscore < max).length,
    }));

    // ---- GAUSSIAN CURVE DATA (-5 to +5 per 0.5) ----
    const zBbins: { min: number, max: number, mid: number }[] = [];
    for (let i = -5.0; i < 5.0; i += 0.5) {
        zBbins.push({ min: i, max: i + 0.5, mid: i + 0.25 });
    }

    const bbuValidN = valid.filter(r => r.assessment.bbu.zscore !== null).length;
    const tbuValidN = valid.filter(r => r.assessment.tbu.zscore !== null).length;
    const bbtbValidN = valid.filter(r => r.assessment.bbtb.zscore !== null).length;

    const zscoreGaussian: ZScoreGaussianPoint[] = zBbins.map((b) => {
        // Normal distribution PDF: (1 / sqrt(2pi)) * e^(-0.5 * x^2)
        const pdf = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * b.mid * b.mid);
        const binWidth = 0.5;

        return {
            binStart: b.min,
            binEnd: b.max,
            midPoint: b.mid,
            actualBBU: valid.filter((r) => r.assessment.bbu.zscore !== null && r.assessment.bbu.zscore >= b.min && r.assessment.bbu.zscore < b.max).length,
            actualTBU: valid.filter((r) => r.assessment.tbu.zscore !== null && r.assessment.tbu.zscore >= b.min && r.assessment.tbu.zscore < b.max).length,
            actualBBTB: valid.filter((r) => r.assessment.bbtb.zscore !== null && r.assessment.bbtb.zscore >= b.min && r.assessment.bbtb.zscore < b.max).length,
            normalDistBBU: pdf * binWidth * bbuValidN,
            normalDistTBU: pdf * binWidth * tbuValidN,
            normalDistBBTB: pdf * binWidth * bbtbValidN,
        };
    });

    // ---- PER WILAYAH & DESA ----
    const wilayahMap = new Map<string, MassRowResult[]>();
    const desaMap = new Map<string, MassRowResult[]>();
    valid.forEach((r) => {
        const w = r.wilayah || "(Tidak Ada Wilayah)";
        if (!wilayahMap.has(w)) wilayahMap.set(w, []);
        wilayahMap.get(w)!.push(r);

        const d = r.desa || "(Tidak Ada Desa)";
        if (!desaMap.has(d)) desaMap.set(d, []);
        desaMap.get(d)!.push(r);
    });

    const createPrevalence = (name: string, rows: MassRowResult[]): WilayahPrevalence => {
        const wn = rows.length;
        const stunting = rows.filter((r) => ["Pendek", "Sangat Pendek"].includes(r.assessment.tbu.classification)).length;
        const sevStunted = rows.filter((r) => r.assessment.tbu.classification === "Sangat Pendek").length;
        const wasting = rows.filter((r) => ["Gizi Kurang", "Gizi Buruk"].includes(r.assessment.bbtb.classification)).length;
        const underweight = rows.filter((r) => ["Berat Badan Kurang", "Berat Badan Sangat Kurang"].includes(r.assessment.bbu.classification)).length;
        const ps = rows.filter((r) => r.assessment.probableStunting.isProbableStunting).length;
        return {
            wilayah: name,
            total: wn,
            stunting,
            stuntingPct: pct(stunting, wn),
            severelyStunted: sevStunted,
            severelyStuntedPct: pct(sevStunted, wn),
            wasting,
            wastingPct: pct(wasting, wn),
            underweight,
            underweightPct: pct(underweight, wn),
            probableStunting: ps,
            probableStuntingPct: pct(ps, wn),
        };
    };

    const wilayahPrevalence = Array.from(wilayahMap.entries()).map(([w, rows]) => createPrevalence(w, rows)).sort((a, b) => a.wilayah.localeCompare(b.wilayah));
    const desaPrevalence = Array.from(desaMap.entries()).map(([d, rows]) => createPrevalence(d, rows)).sort((a, b) => a.wilayah.localeCompare(b.wilayah));

    return {
        total: totalRows,
        valid,
        skipped,
        prevalenceBBU,
        prevalenceTBU,
        prevalenceBBTB,
        prevalenceProbableStunting,
        stuntingPct: pct(stuntingN, n),
        wastingPct: pct(wastingN, n),
        underweightPct: pct(underweightN, n),
        probableStuntingPct: pct(psYes, n),
        redFlagCount: valid.filter((r) => r.assessment.hasAnyRedFlag).length,
        ageGroupDist,
        sexDist,
        bbDist,
        tbDist,
        zscoreDist,
        zscoreGaussian,
        wilayahPrevalence,
        desaPrevalence,
    };
}

// ============================================================
// TEMPLATE EXCEL GENERATOR
// ============================================================

export async function downloadTemplate(): Promise<void> {
    const { utils, writeFile } = await import("xlsx");
    const wb = utils.book_new();

    // Sheet 1: Template Data
    const headers = ["No", "Nama_Anak", "Wilayah_Kecamatan", "Jenis_Kelamin", "Tanggal_Lahir", "Tanggal_Ukur", "Berat_Badan_kg", "Panjang_Tinggi_Badan_cm", "Cara_Ukur"];
    const examples = [
        [1, "Andi Saputra", "Kec. Pakis", "1", "15/03/2022", "01/03/2026", 12.5, 98.0, "H"],
        [2, "Siti Rahayu", "Kec. Singosari", "2", "20/07/2023", "01/03/2026", 8.2, 72.5, "L"],
        [3, "Budi Santoso", "Kec. Pakis", "M", "01/01/2024", "01/03/2026", 6.8, 66.0, "l"],
    ];

    const wsData = [headers, ...examples];
    const ws = utils.aoa_to_sheet(wsData);
    ws["!cols"] = [
        { wch: 5 }, { wch: 22 }, { wch: 22 }, { wch: 15 },
        { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 24 }, { wch: 12 },
    ];
    utils.book_append_sheet(wb, ws, "Template Data");

    // Sheet 2: Petunjuk Pengisian
    const petunjuk = [
        ["PETUNJUK PENGISIAN — SIGMA Calculator Mass Assessment"],
        [],
        ["VARIABEL WAJIB:"],
        ["Kolom", "Format", "Contoh", "Keterangan"],
        ["Jenis_Kelamin", "1 atau m/M (Laki-laki)", "1, m, M, male", "Atau: 2, f, F (Perempuan)"],
        ["Tanggal_Lahir", "DD/MM/YYYY", "15/03/2022", "Hari/Bulan/Tahun"],
        ["Tanggal_Ukur", "DD/MM/YYYY", "01/03/2026", "Hari/Bulan/Tahun"],
        ["Berat_Badan_kg", "Angka (titik = desimal)", "12.5", "Satuan: kilogram (kg)"],
        ["Panjang_Tinggi_Badan_cm", "Angka (titik = desimal)", "98.0", "Satuan: centimeter (cm)"],
        ["Cara_Ukur", "l/L = terlentang, h/H = berdiri", "L, l, H, h", "L=Recumbent (panjang badan), H=Standing (tinggi badan)"],
        [],
        ["VARIABEL OPSIONAL:"],
        ["Nama_Anak", "Teks bebas", "Andi Saputra", "Untuk identifikasi di laporan"],
        ["Wilayah_Kecamatan", "Teks bebas", "Kec. Pakis", "Untuk agregasi prevalensi per wilayah"],
        [],
        ["CATATAN PENTING:"],
        ["1. Nama kolom boleh berbeda — sistem akan otomatis mendeteksi dan meminta konfirmasi mapping."],
        ["2. Gunakan titik (.) sebagai separator desimal, BUKAN koma (,)."],
        ["3. Format tanggal: DD/MM/YYYY (contoh: 15/03/2022). Format YYYY-MM-DD juga diterima."],
        ["4. Maksimal 1000 baris data per upload."],
        ["5. Baris dengan data tidak valid akan di-skip dan dilaporkan terpisah."],
        ["6. SIGMA Calculator tidak menyimpan data ke server. Semua proses di browser."],
    ];
    const wsPetunjuk = utils.aoa_to_sheet(petunjuk);
    wsPetunjuk["!cols"] = [{ wch: 28 }, { wch: 30 }, { wch: 18 }, { wch: 55 }];
    utils.book_append_sheet(wb, wsPetunjuk, "Petunjuk Pengisian");

    writeFile(wb, "Template-SIGMA-Massal.xlsx");
}

// ============================================================
// EXCEL REPORT EXPORT
// ============================================================

export async function exportMassExcel(result: MassAnalysisResult, filename: string): Promise<void> {
    const { utils, writeFile } = await import("xlsx");
    const wb = utils.book_new();

    // Sheet 1: Data Individu
    const rowHeaders = [
        "No", "Nama", "Wilayah", "Desa", "JK", "Usia (bln)", "Tgl Lahir", "Tgl Ukur",
        "BB (kg)", "TB Input (cm)", "TB Koreksi (cm)", "Cara Ukur",
        "ZScore BBU", "Klasifikasi BBU",
        "ZScore TBU", "Klasifikasi TBU",
        "ZScore BBTB", "Klasifikasi BBTB",
        "Weight Age", "Length Age", "CA", "Probable Stunting", "Red Flag",
    ];
    const rowData = result.valid.map((r, i) => [
        i + 1, r.nama, r.wilayah, r.desa,
        r.rawSex === 1 ? "Laki-laki" : "Perempuan",
        r.ageMonths, r.birthDateStr, r.measureDateStr,
        r.weightKg, r.heightCm, r.correctedHeight.toFixed(1),
        r.measureMethod === "recumbent" ? "Terlentang (L)" : "Berdiri (H)",
        r.assessment.bbu.zscore?.toFixed(2) ?? "-", r.assessment.bbu.classification,
        r.assessment.tbu.zscore?.toFixed(2) ?? "-", r.assessment.tbu.classification,
        r.assessment.bbtb.zscore?.toFixed(2) ?? "-", r.assessment.bbtb.classification,
        r.assessment.probableStunting.weightAge ?? "-",
        r.assessment.probableStunting.lengthAge ?? "-",
        r.assessment.probableStunting.chronologicalAge,
        r.assessment.probableStunting.isProbableStunting ? "TERINDIKASI" : "Tidak",
        r.assessment.hasAnyRedFlag ? "YA" : "Tidak",
    ]);
    const ws1 = utils.aoa_to_sheet([rowHeaders, ...rowData]);
    ws1["!cols"] = Array(rowHeaders.length).fill({ wch: 16 });
    utils.book_append_sheet(wb, ws1, "Data Individu");

    // Sheet 2: Prevalensi
    const prev: unknown[][] = [
        ["RINGKASAN PREVALENSI STATUS GIZI"],
        ["Tanggal Analisis", new Date().toLocaleDateString("id-ID")],
        ["Total Sampel", result.total],
        ["Data Valid", result.valid.length],
        ["Data Di-skip", result.skipped.length],
        ["Red Flag", result.redFlagCount],
        [],
        ["PREVALENSI UTAMA (%):"],
        ["Stunting (TBU Pendek+Sangat Pendek)", `${result.stuntingPct}%`],
        ["Wasting (BBTB Gizi Kurang+Buruk)", `${result.wastingPct}%`],
        ["Underweight (BBU Kurang+Sangat Kurang)", `${result.underweightPct}%`],
        ["Probable Stunting", `${result.probableStuntingPct}%`],
        [],
        ["PREVALENSI BBU (Berat Badan/Umur):"],
        ["Kategori", "N", "%"],
        ...result.prevalenceBBU.map((p) => [p.category, p.n, p.pct]),
        [],
        ["PREVALENSI TBU (Tinggi Badan/Umur):"],
        ["Kategori", "N", "%"],
        ...result.prevalenceTBU.map((p) => [p.category, p.n, p.pct]),
        [],
        ["PREVALENSI BBTB (Berat/Tinggi):"],
        ["Kategori", "N", "%"],
        ...result.prevalenceBBTB.map((p) => [p.category, p.n, p.pct]),
        [],
        ["PROBABLE STUNTING:"],
        ["Kategori", "N", "%"],
        ...result.prevalenceProbableStunting.map((p) => [p.category, p.n, p.pct]),
    ];
    const ws2 = utils.aoa_to_sheet(prev);
    ws2["!cols"] = [{ wch: 45 }, { wch: 10 }, { wch: 10 }];
    utils.book_append_sheet(wb, ws2, "Prevalensi");

    // Sheet 3: Per Wilayah
    if (result.wilayahPrevalence.length > 0) {
        const wHeaders = ["Wilayah", "N", "Stunting N", "Stunting %", "Sgt Pendek N", "Sgt Pendek %", "Wasting N", "Wasting %", "Underweight N", "Underweight %", "Prob.Stunting N", "Prob.Stunting %"];
        const wData = result.wilayahPrevalence.map((w) => [
            w.wilayah, w.total, w.stunting, w.stuntingPct, w.severelyStunted, w.severelyStuntedPct,
            w.wasting, w.wastingPct, w.underweight, w.underweightPct, w.probableStunting, w.probableStuntingPct,
        ]);
        const ws3 = utils.aoa_to_sheet([wHeaders, ...wData]);
        ws3["!cols"] = Array(wHeaders.length).fill({ wch: 16 });
        utils.book_append_sheet(wb, ws3, "Per Wilayah");
    }

    // Sheet 4: Per Desa
    if (result.desaPrevalence.length > 0) {
        const dHeaders = ["Desa", "N", "Stunting N", "Stunting %", "Sgt Pendek N", "Sgt Pendek %", "Wasting N", "Wasting %", "Underweight N", "Underweight %", "Prob.Stunting N", "Prob.Stunting %"];
        const dData = result.desaPrevalence.map((w) => [
            w.wilayah, w.total, w.stunting, w.stuntingPct, w.severelyStunted, w.severelyStuntedPct,
            w.wasting, w.wastingPct, w.underweight, w.underweightPct, w.probableStunting, w.probableStuntingPct,
        ]);
        const ws4 = utils.aoa_to_sheet([dHeaders, ...dData]);
        ws4["!cols"] = Array(dHeaders.length).fill({ wch: 16 });
        utils.book_append_sheet(wb, ws4, "Per Desa");
    }

    // Sheet 5: WHO TEAM Distribusi
    const team: unknown[][] = [
        ["WHO TEAM DISTRIBUTIONS"],
        [],
        ["Distribusi Age Group:"],
        ["Age Group", "N", "%"],
        ...result.ageGroupDist.map((d) => [d.group, d.n, d.pct]),
        [],
        ["Distribusi Jenis Kelamin:"],
        ["Jenis Kelamin", "N", "%"],
        ...result.sexDist.map((d) => [d.label, d.n, d.pct]),
        [],
        ["Distribusi Berat Badan:"],
        ["Range BB", "N"],
        ...result.bbDist.map((d) => [d.range, d.n]),
        [],
        ["Distribusi Tinggi Badan:"],
        ["Range TB", "N"],
        ...result.tbDist.map((d) => [d.range, d.n]),
        [],
        ["Distribusi ZScore per Indeks:"],
        ["Range ZScore", "BBU (n)", "TBU (n)", "BBTB (n)"],
        ...result.zscoreDist.map((d) => [d.range, d.bbu, d.tbu, d.bbtb]),
    ];
    const ws4 = utils.aoa_to_sheet(team);
    ws4["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    utils.book_append_sheet(wb, ws4, "WHO TEAM Distributions");

    writeFile(wb, filename);
}

// ============================================================
// PDF REPORT EXPORT (jsPDF text-based)
// ============================================================

export async function exportMassPDF(result: MassAnalysisResult, filename: string): Promise<void> {
    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = pdf.internal.pageSize.getWidth();
    let y = 0;

    const addLine = (text: string, fs: number, bold = false, color: [number, number, number] = [30, 30, 30], indent = 14): void => {
        pdf.setFontSize(fs); pdf.setFont("helvetica", bold ? "bold" : "normal"); pdf.setTextColor(...color);
        const lines = pdf.splitTextToSize(text, W - indent * 2);
        lines.forEach((l: string) => { if (y > 275) { pdf.addPage(); y = 14; } pdf.text(l, indent, y); y += fs * 0.45; });
    };
    const addSep = (thick = false): void => {
        if (y > 275) { pdf.addPage(); y = 14; }
        pdf.setDrawColor(thick ? 99 : 220, thick ? 102 : 220, thick ? 241 : 220);
        pdf.setLineWidth(thick ? 0.5 : 0.2);
        pdf.line(14, y, W - 14, y); y += 5;
    };

    // Header bar
    y = 18;
    pdf.setFillColor(16, 185, 129);
    pdf.rect(0, 0, W, 12, "F");
    pdf.setFontSize(8); pdf.setFont("helvetica", "bold"); pdf.setTextColor(255, 255, 255);
    pdf.text("SIGMA Calculator — Laporan Analisis Status Gizi Massal", 14, 8);
    pdf.text(`Tanggal: ${new Date().toLocaleDateString("id-ID")}`, W - 14, 8, { align: "right" });

    addLine("Analisis Status Gizi Populasi", 18, true, [15, 23, 42]);
    addLine("WHO Child Growth Standards 2006 · LMS Method · Permenkes No.2/2020", 8, false, [100, 116, 139]);
    y += 3; addSep(true);

    // Summary
    addLine("RINGKASAN SAMPEL", 10, true, [99, 102, 241]);
    y += 2;
    const summaryFields: [string, string][] = [
        ["Total Baris Upload", `${result.total}`],
        ["Data Valid (dihitung)", `${result.valid.length}`],
        ["Data Di-skip (error)", `${result.skipped.length}`],
        ["Red Flag Terdeteksi", `${result.redFlagCount}`],
    ];
    summaryFields.forEach(([label, val]) => {
        if (y > 275) { pdf.addPage(); y = 14; }
        pdf.setFontSize(9.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(71, 85, 105);
        pdf.text(label, 14, y); pdf.setFont("helvetica", "normal"); pdf.setTextColor(30, 30, 30);
        pdf.text(val, 80, y); y += 5.5;
    });
    y += 3; addSep();

    // Key prevalence
    addLine("PREVALENSI UTAMA", 10, true, [99, 102, 241]); y += 2;
    const prevFields: [string, string, [number, number, number]][] = [
        ["Stunting (TBU Pendek+Sangat Pendek)", `${result.stuntingPct}%`, [220, 38, 38]],
        ["Wasting (BBTB Gizi Kurang+Buruk)", `${result.wastingPct}%`, [234, 88, 12]],
        ["Underweight (BBU Kurang+Sangat Kurang)", `${result.underweightPct}%`, [161, 98, 7]],
        ["Probable Stunting", `${result.probableStuntingPct}%`, [180, 83, 9]],
    ];
    prevFields.forEach(([label, val, col]) => {
        if (y > 275) { pdf.addPage(); y = 14; }
        pdf.setFontSize(10); pdf.setFont("helvetica", "bold"); pdf.setTextColor(71, 85, 105);
        pdf.text(label, 14, y); pdf.setFont("helvetica", "bold"); pdf.setTextColor(...col);
        pdf.text(val, 80, y); y += 6;
    });
    y += 3; addSep();

    // Prevalensi tables BBU, TBU, BBTB
    const prevTables: [string, string, PrevalenceItem[]][] = [
        ["PREVALENSI BBU (Berat Badan / Umur)", "bbu", result.prevalenceBBU],
        ["PREVALENSI TBU (Tinggi Badan / Umur)", "tbu", result.prevalenceTBU],
        ["PREVALENSI BBTB (Berat / Tinggi)", "bbtb", result.prevalenceBBTB],
    ];
    prevTables.forEach(([title, , items]) => {
        if (y > 250) { pdf.addPage(); y = 14; }
        addLine(title, 10, true, [99, 102, 241]); y += 2;
        items.forEach((item) => {
            if (y > 275) { pdf.addPage(); y = 14; }
            pdf.setFontSize(9); pdf.setFont("helvetica", "normal"); pdf.setTextColor(30, 30, 30);
            pdf.text(item.category, 18, y); pdf.text(`${item.n}`, 100, y, { align: "right" });
            pdf.text(`${item.pct}%`, 115, y, { align: "right" }); y += 5;
        });
        y += 3; addSep();
    });

    // Wilayah prevalence
    if (result.wilayahPrevalence.length > 1) {
        if (y > 230) { pdf.addPage(); y = 14; }
        addLine("PREVALENSI PER WILAYAH", 10, true, [99, 102, 241]); y += 2;
        result.wilayahPrevalence.forEach((w) => {
            if (y > 272) { pdf.addPage(); y = 14; }
            pdf.setFontSize(9.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(30, 30, 30);
            pdf.text(w.wilayah, 14, y);
            pdf.setFont("helvetica", "normal"); pdf.setTextColor(71, 85, 105);
            pdf.text(`N=${w.total} | Stunting: ${w.stuntingPct}% | Wasting: ${w.wastingPct}% | Underweight: ${w.underweightPct}% | PS: ${w.probableStuntingPct}%`, 14, y + 5);
            y += 11;
        });
        addSep(true);
    }

    addLine("SIGMA Calculator | WHO Child Growth Standards 2006 | Permenkes No.2/2020 | Data tidak disimpan ke server", 7, false, [148, 163, 184]);
    pdf.save(filename);
}
