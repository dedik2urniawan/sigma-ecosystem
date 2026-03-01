// src/lib/fct-calculator.ts
import { TkpiIngredient, YieldFactor, RetentionFactor, AkgReference } from './supabase-fct';

export const AKG_COLS_KEYS = ["energi", "protein", "lemak_total", "omega3", "omega6", "karbohidrat", "serat", "air"] as const;
export type AkgColKey = typeof AKG_COLS_KEYS[number];

// 1. Data Types
export interface FctIngredientInput {
    id: string; // unique ID for UI list
    menuName: string;
    bahanId: number; // reference to tkpi
    beratInput: number;
    unit: 'g' | 'kg';
    metode: string; // segar, direbus, tumis, digoreng, panggang
}

export interface FctRowResult {
    id: string;
    menuName: string;
    bahanNama: string;
    metode: string;
    beratInputG: number;
    bddPct: number;
    beratEdibleG: number;
    yieldFactor: number;
    beratAkhirG: number;
    nutrien: Record<string, number | null>;
}

export interface FctMenuResult {
    menuName: string;
    nutrien: Record<string, number>;
}

// 2. Utils
export function normalizeStr(s: string | null | undefined): string {
    return (s || '').trim().toUpperCase();
}

export function gramsFrom(value: number, unit: 'g' | 'kg'): number {
    return unit === 'kg' ? value * 1000 : value;
}

export function getYield(yieldFactors: YieldFactor[], method: string): number {
    const m = normalizeStr(method);
    const found = yieldFactors.find(y => normalizeStr(y.metode) === m);
    return found ? found.yield_factor : 1.0;
}

export function getRetention(retFactors: RetentionFactor[], method: string, nutrientKey: string): number {
    const m = normalizeStr(method);
    const nk = normalizeStr(nutrientKey);

    // Exact match
    const exact = retFactors.find(r => normalizeStr(r.metode) === m && normalizeStr(r.nutrien) === nk);
    if (exact) return exact.retensi;

    // "ALL" fallback
    const all = retFactors.find(r => normalizeStr(r.metode) === m && normalizeStr(r.nutrien) === 'ALL');
    if (all) return all.retensi;

    return 1.0;
}

// 3. Calculator Core
export function calculateFctRows(
    inputs: FctIngredientInput[],
    tkpiList: TkpiIngredient[],
    yieldFactors: YieldFactor[],
    retentionFactors: RetentionFactor[]
): FctRowResult[] {
    const nutrientKeys = [
        "energi", "protein", "lemak", "kh", "air", "vit_c",
        "kalsium", "besi", "seng",
        "thiamin", "riboflavin", "niasin", "b6", "folat", "b12",
        "vit_a_re", "vit_rae", "retinol", "b_kar", "kartotal",
        "kalium", "natrium"
    ];

    return inputs.map(input => {
        const bahan = tkpiList.find(t => t.id === input.bahanId);
        if (!bahan) throw new Error(`Bahan TKPI ID ${input.bahanId} tidak ditemukan`);

        const wIn = gramsFrom(input.beratInput, input.unit);
        const bddVal = (bahan.bdd !== null && !isNaN(bahan.bdd)) ? bahan.bdd : 100.0;

        const wEdible = wIn * (bddVal / 100.0);
        const yF = getYield(yieldFactors, input.metode);
        const wFinal = wEdible * yF;

        const nutrien: Record<string, number | null> = {};

        for (const key of nutrientKeys) {
            // @ts-expect-error key dynamic
            const per100Val = bahan[key];

            if (per100Val === null || per100Val === undefined || isNaN(per100Val)) {
                nutrien[key] = null;
                continue;
            }

            const base = (per100Val / 100.0) * wFinal;
            const rf = getRetention(retentionFactors, input.metode, key);
            nutrien[key] = base * rf;
        }

        return {
            id: input.id,
            menuName: input.menuName,
            bahanNama: bahan.nama_bahan_mentah,
            metode: input.metode,
            beratInputG: wIn,
            bddPct: bddVal,
            beratEdibleG: wEdible,
            yieldFactor: yF,
            beratAkhirG: wFinal,
            nutrien
        };
    });
}

export function aggregateMenus(rows: FctRowResult[]): FctMenuResult[] {
    const menus = new Map<string, Record<string, number>>();

    for (const row of rows) {
        if (!menus.has(row.menuName)) {
            menus.set(row.menuName, {});
        }

        const m = menus.get(row.menuName)!;
        for (const [k, v] of Object.entries(row.nutrien)) {
            if (v !== null) {
                m[k] = (m[k] || 0) + v;
            }
        }
    }

    const result: FctMenuResult[] = [];
    menus.forEach((nutrien, menuName) => {
        result.push({ menuName, nutrien });
    });
    return result.sort((a, b) => a.menuName.localeCompare(b.menuName));
}

export function getTotalAsupan(menus: FctMenuResult[], selectedMenuNames: string[] | null): Record<string, number> {
    const asupan: Record<string, number> = {
        "energi": 0, "protein": 0, "lemak_total": 0, "omega3": 0, "omega6": 0, "karbohidrat": 0, "serat": 0, "air": 0
    };

    const targetMenus = selectedMenuNames ? menus.filter(m => selectedMenuNames.includes(m.menuName)) : menus;

    // Mapping from FCT keys to AKG Keys
    const keyMap: Record<string, AkgColKey[]> = {
        "energi": ["energi"],
        "protein": ["protein"],
        "lemak": ["lemak_total"],
        "kh": ["karbohidrat"],
        "air": ["air"]
    };

    for (const m of targetMenus) {
        for (const [k, v] of Object.entries(m.nutrien)) {
            const mapped = keyMap[k];
            if (mapped) {
                for (const akgK of mapped) {
                    asupan[akgK] += v;
                }
            }
        }
    }

    return asupan;
}


// 4. AKG Analysis
export interface AkgGapResult {
    nutrien: string;
    target: number | null;
    asupan: number;
    pencapaianPct: number | null;
    gap: number | null;
}

export function computeGap(asupan: Record<string, number>, akgRow: AkgReference): AkgGapResult[] {
    return AKG_COLS_KEYS.map(k => {
        const tgt = akgRow[k];
        const val = asupan[k] || 0;

        if (tgt === null || tgt === undefined || tgt === 0) {
            return { nutrien: k, target: null, asupan: val, pencapaianPct: null, gap: null };
        }

        return {
            nutrien: k,
            target: tgt,
            asupan: val,
            pencapaianPct: (val / tgt) * 100.0,
            gap: val - tgt
        };
    });
}

export function narrateGap(gaps: AkgGapResult[], kelompokLabel: string): string {
    if (gaps.length === 0) return "Data AKG atau asupan tidak tersedia untuk dianalisis.";

    const df = gaps.map(g => {
        let status = "NA";
        if (g.pencapaianPct !== null) {
            if (g.pencapaianPct < 90) status = "Defisit";
            else if (g.pencapaianPct <= 120) status = "Memadai";
            else status = "Surplus";
        }
        return { ...g, status };
    });

    const preferredOrder = ["energi", "protein", "lemak_total", "omega3", "omega6", "karbohidrat", "serat", "air"];
    df.sort((a, b) => {
        const ia = preferredOrder.indexOf(a.nutrien);
        const ib = preferredOrder.indexOf(b.nutrien);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    const def = df.filter(d => d.status === "Defisit").sort((a, b) => Math.abs((b.pencapaianPct || 0) - 100) - Math.abs((a.pencapaianPct || 0) - 100));
    const sur = df.filter(d => d.status === "Surplus").sort((a, b) => Math.abs((b.pencapaianPct || 0) - 100) - Math.abs((a.pencapaianPct || 0) - 100));
    const ok = df.filter(d => d.status === "Memadai");

    const lines: string[] = [];
    lines.push(`**Ringkasan otomatis – ${kelompokLabel}:**`);

    if (def.length > 0) {
        const top = def.slice(0, 5).map(r => `${r.nutrien}: ${r.pencapaianPct!.toFixed(1)}% (−${Math.abs(r.gap!).toFixed(2)} dari target)`);
        lines.push("• **Defisit** → " + top.join("; ") + ".");
    }
    if (sur.length > 0) {
        const top = sur.slice(0, 5).map(r => `${r.nutrien}: ${r.pencapaianPct!.toFixed(1)}% (+${r.gap!.toFixed(2)} di atas target)`);
        lines.push("• **Surplus** → " + top.join("; ") + ".");
    }
    if (ok.length > 0) {
        const top = ok.slice(0, 5).map(r => `${r.nutrien}: ${r.pencapaianPct!.toFixed(1)}%`);
        lines.push("• **Memadai** → " + top.join("; ") + ".");
    }

    const recs: string[] = [];
    const getPct = (k: string) => df.find(d => d.nutrien === k)?.pencapaianPct;

    const e = getPct("energi");
    if (e !== undefined && e !== null) {
        if (e < 90) recs.push("Tingkatkan **Energi** (porsi/penambahan bahan kaya energi seperti minyak/karbohidrat kompleks).");
        else if (e > 120) recs.push("Pertimbangkan penyesuaian **Energi** (porsi atau frekuensi) agar tidak berlebihan.");
    }

    const p = getPct("protein");
    if (p !== undefined && p !== null && p < 90) {
        recs.push("Prioritaskan **Protein berkualitas** (telur, ikan, ayam tanpa kulit, kacang-kacangan/tempe).");
    }

    const s = getPct("serat");
    if (s !== undefined && s !== null && s < 90) {
        recs.push("Tambahkan **serat** (sayur berdaun, buah utuh, legum, serealia utuh).");
    }

    const l = getPct("lemak_total");
    if (l !== undefined && l !== null && l > 120) {
        recs.push("Pantau **Lemak_total**; gunakan teknik masak rendah minyak (rebus/panggang/air-fryer).");
    }

    const o3 = getPct("omega3");
    if (o3 !== undefined && o3 !== null && o3 < 90) {
        recs.push("Naikkan **Omega-3** (ikan berlemak, biji rami/chia, kenari).");
    }

    if (recs.length > 0) {
        lines.push("\n**Rekomendasi ringkas:** " + recs.join(" "));
    }

    return lines.join("\n");
}
