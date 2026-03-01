/**
 * WHO Z-Score Calculation Library (LMS Method)
 * Based on WHO Child Growth Standards
 *
 * Indicators supported:
 * - BBU: Berat Badan menurut Umur (Weight-for-Age) - zwfl style
 * - TBU: Tinggi/Panjang Badan menurut Umur (Length/Height-for-Age)
 * - BBTB: Berat Badan menurut Tinggi Badan (Weight-for-Length/Height)
 */

import type { LmsRowBBU, LmsRowTBU, LmsRowBBTB } from "./supabase-pkmk";

// ============================================================
// TYPES
// ============================================================

export type SexCode = 1 | 2; // 1 = Laki-laki, 2 = Perempuan
export type MeasurementMethod = "standing" | "recumbent";

export type ZScoreIndex = "BBU" | "TBU" | "BBTB";

export interface ZScoreResult {
    /** Raw Z-Score (may be extreme) */
    zscore: number | null;
    /** Classification label (e.g. "Sangat Kurus") */
    classification: string;
    /** CSS color key for UI badge */
    severity: "severe" | "moderate" | "normal" | "risk" | "overweight" | "obese";
    /** True if outside WHO plausibility range (red flag) */
    isRedFlag: boolean;
    /** L, M, S values used */
    lms?: { L: number; M: number; S: number };
}

export interface ProbableStuntingResult {
    weightAge: number | null; // bulan
    lengthAge: number | null; // bulan
    chronologicalAge: number; // bulan
    isProbableStunting: boolean;
}

export interface FullAssessmentResult {
    ageMonths: number;
    correctedHeight: number;
    bbu: ZScoreResult;
    tbu: ZScoreResult;
    bbtb: ZScoreResult;
    probableStunting: ProbableStuntingResult;
    hasAnyRedFlag: boolean;
    redFlags: string[];
}

// ============================================================
// AGE CALCULATION
// ============================================================

/**
 * Hitung usia dalam bulan (menggunakan standar WHO: days / 30.4375)
 */
export function calculateAgeInMonths(birthDate: Date, measureDate: Date): number {
    const diffMs = measureDate.getTime() - birthDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return Math.floor(diffDays / 30.4375);
}

// ============================================================
// HEIGHT CORRECTION (WHO Standard)
// ============================================================

/**
 * Koreksi tinggi badan berdasarkan cara pengukuran.
 * WHO: Jika usia < 24 bulan → seharusnya diukur terlentang (panjang/length).
 *      Jika usia >= 24 bulan → seharusnya diukur berdiri (tinggi/height).
 * Koreksi: +0.7 cm jika diukur berdiri tapi seharusnya terlentang
 *          -0.7 cm jika diukur terlentang tapi seharusnya berdiri
 */
export function correctHeight(
    height: number,
    method: MeasurementMethod,
    ageMonths: number
): number {
    const shouldBeLying = ageMonths < 24;
    const isLying = method === "recumbent";

    if (shouldBeLying && !isLying) {
        // Anak < 24 bln diukur berdiri → tambah 0.7 cm
        return height + 0.7;
    } else if (!shouldBeLying && isLying) {
        // Anak >= 24 bln diukur terlentang → kurang 0.7 cm
        return height - 0.7;
    }
    return height;
}

// ============================================================
// WHO LMS Z-SCORE FORMULA
// ============================================================

/**
 * Hitung WHO Z-Score menggunakan metode LMS dengan restriction rules.
 * Referensi: WHO Child Growth Standards Methods and Development 2006
 *
 * @param y   - Nilai pengukuran anak (berat atau tinggi)
 * @param L   - Power transformation value (Lambda)
 * @param M   - Median reference value (Mu)
 * @param S   - Coefficient of variation (Sigma)
 * @param indicatorType - 'height' untuk TBU (L=1, rumus linear), 'weight' untuk BBU/BBTB
 */
export function calculateWHOZScore(
    y: number,
    L: number,
    M: number,
    S: number,
    indicatorType: "height" | "weight" = "weight"
): number {
    if (indicatorType === "height" || Math.abs(L) < 0.001) {
        // L ≈ 0 or height indicator: gunakan simplified formula
        // z = (y - M) / (S * M)  → atau equivalently ((y/M)^L - 1) / (L*S) as L→0 → ln(y/M)/S
        // Untuk TBU, L bukan 0 tapi kita tetap bisa pakai formula umum
        const z_ind = (Math.pow(y / M, L) - 1) / (L * S);
        return z_ind;
    }

    // Formula untuk semua indeks (universal LMS):
    const z_ind = (Math.pow(y / M, L) - 1) / (L * S);

    // WHO Restriction Rules untuk nilai ekstrem
    if (z_ind >= -3 && z_ind <= 3) {
        return z_ind;
    }

    if (z_ind > 3) {
        const SD3pos = M * Math.pow(1 + L * S * 3, 1 / L);
        const SD2pos = M * Math.pow(1 + L * S * 2, 1 / L);
        const SD23pos = SD3pos - SD2pos;
        return 3 + (y - SD3pos) / SD23pos;
    }

    // z_ind < -3
    const SD3neg = M * Math.pow(1 + L * S * -3, 1 / L);
    const SD2neg = M * Math.pow(1 + L * S * -2, 1 / L);
    const SD23neg = SD2neg - SD3neg;
    return -3 + (y - SD3neg) / SD23neg;
}

// ============================================================
// Z-SCORE CLASSIFICATION
// ============================================================

/**
 * Klasifikasi status gizi berdasarkan Z-Score dan indeks.
 * Standar: Peraturan Menteri Kesehatan Republik Indonesia Nomor 2 Tahun 2020
 * tentang Standar Antropometri Anak.
 */
export function classifyZScore(z: number | null, index: ZScoreIndex): Omit<ZScoreResult, "zscore" | "isRedFlag" | "lms"> {
    if (z === null) {
        return { classification: "Tidak dapat dihitung", severity: "normal" };
    }

    switch (index) {
        case "BBU":
            // Permenkes No.2/2020 Tabel 1: BB/U
            if (z < -3) return { classification: "Berat Badan Sangat Kurang", severity: "severe" };
            if (z < -2) return { classification: "Berat Badan Kurang", severity: "moderate" };
            if (z <= 1) return { classification: "Berat Badan Normal", severity: "normal" };
            return { classification: "Risiko Berat Badan Lebih", severity: "risk" };

        case "TBU":
            // Permenkes No.2/2020 Tabel 2: PB/U atau TB/U
            if (z < -3) return { classification: "Sangat Pendek", severity: "severe" };
            if (z < -2) return { classification: "Pendek", severity: "moderate" };
            if (z <= 3) return { classification: "Normal", severity: "normal" };
            return { classification: "Tinggi", severity: "risk" };

        case "BBTB":
            // Permenkes No.2/2020 Tabel 3: BB/PB atau BB/TB
            if (z < -3) return { classification: "Gizi Buruk", severity: "severe" };
            if (z < -2) return { classification: "Gizi Kurang", severity: "moderate" };
            if (z <= 1) return { classification: "Gizi Baik", severity: "normal" };
            if (z <= 2) return { classification: "Berisiko Gizi Lebih", severity: "risk" };
            if (z <= 3) return { classification: "Gizi Lebih", severity: "overweight" };
            return { classification: "Obesitas", severity: "obese" };
    }
}

// ============================================================
// RED FLAG DETECTION (WHO Plausibility Rules)
// ============================================================

/**
 * Deteksi nilai Z-Score di luar batas plausibilitas WHO.
 * Flag:
 * - TBU/zlen: < -6 atau > 6
 * - BBU/zwei: < -6 atau > 5
 * - BBTB/zwfl: < -5 atau > 5
 */
export function detectRedFlag(
    zBBU: number | null,
    zTBU: number | null,
    zBBTB: number | null
): { hasFlag: boolean; flags: string[] } {
    const flags: string[] = [];

    if (zTBU !== null) {
        if (zTBU < -6) flags.push(`ZScore TBU (${zTBU.toFixed(2)}) < -6: Nilai sangat ekstrem - kemungkinan kesalahan data`);
        if (zTBU > 6) flags.push(`ZScore TBU (${zTBU.toFixed(2)}) > 6: Nilai sangat ekstrem - kemungkinan kesalahan data`);
    }

    if (zBBU !== null) {
        if (zBBU < -6) flags.push(`ZScore BBU (${zBBU.toFixed(2)}) < -6: Nilai sangat ekstrem - kemungkinan kesalahan data`);
        if (zBBU > 5) flags.push(`ZScore BBU (${zBBU.toFixed(2)}) > 5: Nilai sangat ekstrem - kemungkinan kesalahan data`);
    }

    if (zBBTB !== null) {
        if (zBBTB < -5) flags.push(`ZScore BBTB (${zBBTB.toFixed(2)}) < -5: Nilai sangat ekstrem - kemungkinan kesalahan data`);
        if (zBBTB > 5) flags.push(`ZScore BBTB (${zBBTB.toFixed(2)}) > 5: Nilai sangat ekstrem - kemungkinan kesalahan data`);
    }

    return { hasFlag: flags.length > 0, flags };
}

// ============================================================
// LMS LOOKUP HELPERS
// ============================================================

/**
 * Cari baris LMS BBU/TBU sesuai usia (bulan) dan jenis kelamin.
 */
export function findLmsByAge(
    ageMonths: number,
    sex: SexCode,
    table: LmsRowBBU[] | LmsRowTBU[]
): { L: number; M: number; S: number } | null {
    const clamped = Math.max(0, Math.min(ageMonths, 60));
    const row = (table as Array<{ Month: number; jk: number; L: number; M: number; S: number }>)
        .find((r) => r.Month === clamped && r.jk === sex);

    if (!row) return null;
    return { L: Number(row.L), M: Number(row.M), S: Number(row.S) };
}

/**
 * Cari baris LMS BBTB sesuai panjang/tinggi badan (cm) dan jenis kelamin.
 * Menggunakan pencarian nilai Length terdekat.
 */
export function findLmsByLength(
    height: number,
    sex: SexCode,
    table: LmsRowBBTB[]
): { L: number; M: number; S: number } | null {
    const sexRows = table.filter((r) => r.jk === sex);
    if (sexRows.length === 0) return null;

    // Cari row dengan Length terdekat
    let closest = sexRows[0];
    let minDiff = Math.abs(Number(sexRows[0].Length) - height);

    for (const row of sexRows) {
        const diff = Math.abs(Number(row.Length) - height);
        if (diff < minDiff) {
            minDiff = diff;
            closest = row;
        }
    }

    return { L: Number(closest.L), M: Number(closest.M), S: Number(closest.S) };
}

// ============================================================
// PROBABLE STUNTING (GROWTH AGE EQUIVALENT)
// ============================================================

/**
 * Reverse lookup: Temukan "usia" (bulan) dimana nilai anak setara dengan median (SD0) referensi.
 * Digunakan untuk menghitung Weight Age dan Length Age.
 */
export function findAgeEquivalent(
    value: number,
    sex: SexCode,
    table: LmsRowBBU[] | LmsRowTBU[]
): number | null {
    const sexRows = (table as Array<{ Month: number; jk: number; SD0: number }>)
        .filter((r) => r.jk === sex);

    if (sexRows.length === 0) return null;

    let closest = sexRows[0];
    let minDiff = Math.abs(Number(sexRows[0].SD0) - value);

    for (const row of sexRows) {
        const diff = Math.abs(Number(row.SD0) - value);
        if (diff < minDiff) {
            minDiff = diff;
            closest = row;
        }
    }

    return closest.Month;
}

/**
 * Analisis Probable Stunting menggunakan logika Growth Age Equivalent.
 * Logika: Weight Age < Length Age < Chronological Age → Probable Stunting
 *
 * Interpretasi klinis:
 * - Jika berat anak setara anak lebih muda dari tingginya,
 *   DAN tinggi anak setara anak lebih muda dari usianya,
 *   kemungkinan terjadi stunting kompensasi (berat proporsional dengan tinggi yang terhambat).
 */
export function analyzeProbableStunting(
    bb: number,
    tb: number,
    ageMonths: number,
    sex: SexCode,
    bbuTable: LmsRowBBU[],
    tbuTable: LmsRowTBU[]
): ProbableStuntingResult {
    const weightAge = findAgeEquivalent(bb, sex, bbuTable);
    const lengthAge = findAgeEquivalent(tb, sex, tbuTable);

    let isProbableStunting = false;
    if (weightAge !== null && lengthAge !== null) {
        // WA < LA < CA
        isProbableStunting = weightAge < lengthAge && lengthAge < ageMonths;
    }

    return { weightAge, lengthAge, chronologicalAge: ageMonths, isProbableStunting };
}

// ============================================================
// FULL ASSESSMENT (MAIN ENTRY POINT)
// ============================================================

export interface AssessmentInput {
    birthDate: Date;
    measureDate: Date;
    sex: SexCode;
    weightKg: number;
    heightCm: number;
    measurementMethod: MeasurementMethod;
}

import type { LmsReference } from "./supabase-pkmk";

/**
 * Kalkulasi lengkap status gizi individu.
 * Mengembalikan ZScore BBU, TBU, BBTB, klasifikasi, red flag, dan probable stunting.
 */
export function calculateFullAssessment(
    input: AssessmentInput,
    lms: LmsReference
): FullAssessmentResult {
    const ageMonths = calculateAgeInMonths(input.birthDate, input.measureDate);
    const correctedHeight = correctHeight(input.heightCm, input.measurementMethod, ageMonths);
    const sex = input.sex;

    // --- BBU ---
    const lmsBBU = findLmsByAge(ageMonths, sex, lms.bbu);
    let zBBU: number | null = null;
    if (lmsBBU && input.weightKg > 0) {
        zBBU = calculateWHOZScore(input.weightKg, lmsBBU.L, lmsBBU.M, lmsBBU.S, "weight");
        zBBU = Math.round(zBBU * 100) / 100;
    }
    const bbuClass = classifyZScore(zBBU, "BBU");
    const flagBBU = zBBU !== null ? (zBBU < -6 || zBBU > 5) : false;

    // --- TBU ---
    const lmsTBU = findLmsByAge(ageMonths, sex, lms.tbu);
    let zTBU: number | null = null;
    if (lmsTBU && correctedHeight > 0) {
        zTBU = calculateWHOZScore(correctedHeight, lmsTBU.L, lmsTBU.M, lmsTBU.S, "height");
        zTBU = Math.round(zTBU * 100) / 100;
    }
    const tbuClass = classifyZScore(zTBU, "TBU");
    const flagTBU = zTBU !== null ? (zTBU < -6 || zTBU > 6) : false;

    // --- BBTB ---
    const lmsBBTB = findLmsByLength(correctedHeight, sex, lms.bbtb);
    let zBBTB: number | null = null;
    if (lmsBBTB && input.weightKg > 0 && correctedHeight > 0) {
        zBBTB = calculateWHOZScore(input.weightKg, lmsBBTB.L, lmsBBTB.M, lmsBBTB.S, "weight");
        zBBTB = Math.round(zBBTB * 100) / 100;
    }
    const bbtbClass = classifyZScore(zBBTB, "BBTB");
    const flagBBTB = zBBTB !== null ? (zBBTB < -5 || zBBTB > 5) : false;

    // --- Red Flags ---
    const redFlagResult = detectRedFlag(zBBU, zTBU, zBBTB);

    // --- Probable Stunting ---
    const probableStunting = analyzeProbableStunting(
        input.weightKg,
        correctedHeight,
        ageMonths,
        sex,
        lms.bbu,
        lms.tbu
    );

    return {
        ageMonths,
        correctedHeight,
        bbu: {
            zscore: zBBU,
            ...bbuClass,
            isRedFlag: flagBBU,
            lms: lmsBBU ?? undefined,
        },
        tbu: {
            zscore: zTBU,
            ...tbuClass,
            isRedFlag: flagTBU,
            lms: lmsTBU ?? undefined,
        },
        bbtb: {
            zscore: zBBTB,
            ...bbtbClass,
            isRedFlag: flagBBTB,
            lms: lmsBBTB ?? undefined,
        },
        probableStunting,
        hasAnyRedFlag: redFlagResult.hasFlag,
        redFlags: redFlagResult.flags,
    };
}

// ============================================================
// GROWTH CHART CURVE GENERATION
// ============================================================

/**
 * Generate titik-titik kurva referensi WHO untuk Growth Chart.
 * Menggunakan inverse LMS formula: y = M * (1 + L * S * Z)^(1/L)
 */
export function generateGrowthCurve(
    table: LmsRowBBU[] | LmsRowTBU[],
    sex: SexCode,
    xKey: "Month"
): Array<{ x: number; sd3neg: number; sd2neg: number; sd0: number; sd2: number; sd3: number }> {
    const sexRows = (table as Array<{ Month: number; jk: number; L: number; M: number; S: number; SD3neg: number; SD2neg: number; SD0: number; SD2: number; SD3: number }>)
        .filter((r) => r.jk === sex)
        .sort((a, b) => a[xKey] - b[xKey]);

    return sexRows.map((row) => ({
        x: row[xKey],
        sd3neg: Number(row.SD3neg),
        sd2neg: Number(row.SD2neg),
        sd0: Number(row.SD0),
        sd2: Number(row.SD2),
        sd3: Number(row.SD3),
    }));
}

export function generateGrowthCurveBBTB(
    table: LmsRowBBTB[],
    sex: SexCode
): Array<{ x: number; sd3neg: number; sd2neg: number; sd0: number; sd2: number; sd3: number }> {
    const sexRows = table
        .filter((r) => r.jk === sex)
        .sort((a, b) => Number(a.Length) - Number(b.Length));

    return sexRows.map((row) => ({
        x: Number(row.Length),
        sd3neg: Number(row.SD3neg),
        sd2neg: Number(row.SD2neg),
        sd0: Number(row.SD0),
        sd2: Number(row.SD2),
        sd3: Number(row.SD3),
    }));
}
