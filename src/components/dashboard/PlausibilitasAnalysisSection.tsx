"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
    ComposedChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
    BarChart,
    Bar,
    Cell,
    LabelList,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────
type GiziKey = "stunting" | "wasting" | "underweight" | "obesitas";

interface InsidenStuntingRecord {
    tahun: number;
    bulan: number;
    puskesmas: string;
    insiden_l: number;
    insiden_p: number;
    jumlah_timbang_ukur: number;
}

interface PlausibilitasRow {
    bulan: number;
    label: string;
    prevalensi: number;
    delta: number | null;
    absdelta: number | null;
    status: "plausibel" | "perhatian" | "unplausibel" | null;
    insidenRate: number; // IR Proxy per 1000 balita terukur
    kasusRaw: number;
    terukur: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BULAN_LABELS: Record<number, string> = {
    1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "Mei", 6: "Jun",
    7: "Jul", 8: "Agt", 9: "Sep", 10: "Okt", 11: "Nov", 12: "Des",
};

const BULAN_FULL: Record<number, string> = {
    1: "Januari", 2: "Februari", 3: "Maret", 4: "April", 5: "Mei", 6: "Juni",
    7: "Juli", 8: "Agustus", 9: "September", 10: "Oktober", 11: "November", 12: "Desember",
};

const GIZI_OPTIONS: { key: GiziKey; label: string; color: string }[] = [
    { key: "stunting", label: "Prevalensi Stunting", color: "#ef4444" },
    { key: "wasting", label: "Prevalensi Wasting", color: "#f97316" },
    { key: "underweight", label: "Prevalensi Underweight", color: "#f59e0b" },
    { key: "obesitas", label: "Prevalensi Obesitas", color: "#8b5cf6" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStatusConfig(status: PlausibilitasRow["status"]) {
    if (!status) return { label: "—", bg: "bg-slate-100", text: "text-slate-400", icon: "—" };
    if (status === "plausibel") return { label: "Plausibel", bg: "bg-emerald-50", text: "text-emerald-700", icon: "✅" };
    if (status === "perhatian") return { label: "Perlu Perhatian", bg: "bg-amber-50", text: "text-amber-700", icon: "⚠️" };
    return { label: "Unplausibel", bg: "bg-red-50", text: "text-red-700", icon: "❌" };
}

function formatPct(n: number | null, decimals = 2): string {
    if (n === null) return "—";
    return (n >= 0 ? "+" : "") + n.toFixed(decimals).replace(".", ",") + "%";
}

function formatPctAbs(n: number, decimals = 2): string {
    return n.toFixed(decimals).replace(".", ",") + "%";
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, giziLabel }: any) {
    if (!active || !payload || !payload.length) return null;

    const delta = payload.find((p: { dataKey: string }) => p.dataKey === "delta");
    const prevalensi = payload.find((p: { dataKey: string }) => p.dataKey === "prevalensi");
    const ir = payload.find((p: { dataKey: string }) => p.dataKey === "insidenRate");

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-3 text-xs min-w-[200px]">
            <p className="font-bold text-slate-800 mb-2">{label}</p>
            {prevalensi && (
                <div className="flex justify-between gap-4 mb-1">
                    <span className="text-slate-500">{giziLabel}</span>
                    <span className="font-bold text-blue-600">{Number(prevalensi.value).toFixed(2).replace(".", ",")}%</span>
                </div>
            )}
            {delta && delta.value !== null && (
                <div className="flex justify-between gap-4 mb-1">
                    <span className="text-slate-500">Δ Prevalensi</span>
                    <span className={`font-bold ${Math.abs(Number(delta.value)) > 5 ? "text-red-600" : Math.abs(Number(delta.value)) > 2 ? "text-amber-600" : "text-emerald-600"}`}>
                        {formatPct(delta.value, 2)}
                    </span>
                </div>
            )}
            {ir && (
                <div className="flex justify-between gap-4">
                    <span className="text-slate-500">IR Stunting</span>
                    <span className="font-bold text-indigo-600">{Number(ir.value).toFixed(2)}%</span>
                </div>
            )}
        </div>
    );
}

// ─── Cross-Sectional Type ─────────────────────────────────────────────────────
interface CrossSectionalRow {
    rank?: number;
    puskesmas: string;
    prevalensi: number;
    prevalensiPrev: number | null;
    delta: number | null;
    absdelta: number | null;
    status: "plausibel" | "perhatian" | "unplausibel" | null;
    insidenRate: number;
    kasusRaw: number;
    terukur: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface PlausibilitasAnalysisSectionProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[];
    year: number | null;
    puskesmas: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allData: any[];
    filterBulan: number | null;
}

export default function PlausibilitasAnalysisSection({
    data,
    year,
    puskesmas,
    allData,
    filterBulan,
}: PlausibilitasAnalysisSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false); // Default CLOSED / Collapsed as requested
    const [selectedGizi, setSelectedGizi] = useState<GiziKey>("stunting");
    const [showIR, setShowIR] = useState(true);
    const [showDelta, setShowDelta] = useState(true);
    const [crossMetric, setCrossMetric] = useState<"prevalensi" | "delta" | "ir">("prevalensi");
    const [crossSort, setCrossSort] = useState<"desc" | "asc">("desc");
    const [insidenRecords, setInsidenRecords] = useState<InsidenStuntingRecord[]>([]);

    const giziOption = GIZI_OPTIONS.find((g) => g.key === selectedGizi)!;

    const normalizeString = useCallback((s: string) => {
        return s?.toUpperCase().replace(/PUSKESMAS/g, "").trim().replace(/\s+/g, " ") || "";
    }, []);

    // ─── Fetch data_insiden_stunting from Supabase ───────────────────────────
    useEffect(() => {
        let isMounted = true;
        async function fetchInsiden() {
            try {
                const { data: rows, error } = await supabase
                    .from("data_insiden_stunting")
                    .select("tahun, bulan, puskesmas, insiden_l, insiden_p, jumlah_timbang_ukur");
                if (!error && rows && isMounted) {
                    setInsidenRecords(rows);
                }
            } catch (err) {
                console.error("Failed to fetch insiden stunting:", err);
            }
        }
        fetchInsiden();
        return () => { isMounted = false; };
    }, []);

    // ─── Compute Plausibilitas Data ──────────────────────────────────────────
    const plausibilitasData = useMemo<PlausibilitasRow[]>(() => {
        if (!data || data.length === 0) return [];

        // Group by bulan (aggregate multiple rows per bulan)
        const monthMap = new Map<number, { kasusGizi: number; stunting: number; terukur: number }>();

        data.forEach((row) => {
            const bulan = row.bulan as number;
            const terukur = Number(row.jumlah_timbang_ukur) || 0;

            const kasusGizi =
                selectedGizi === "stunting" ? Number(row.stunting) || 0
                    : selectedGizi === "wasting" ? Number(row.wasting) || 0
                        : selectedGizi === "underweight" ? Number(row.underweight) || 0
                            : Number(row.obesitas) || 0;

            const stunting = Number(row.stunting) || 0;

            const existing = monthMap.get(bulan) || { kasusGizi: 0, stunting: 0, terukur: 0 };
            monthMap.set(bulan, {
                kasusGizi: existing.kasusGizi + kasusGizi,
                stunting: existing.stunting + stunting,
                terukur: existing.terukur + terukur,
            });
        });

        // Sort by month ascending
        const sorted = Array.from(monthMap.entries()).sort((a, b) => a[0] - b[0]);

        const rows: PlausibilitasRow[] = sorted.map(([bulan, vals], idx) => {
            const prevalensi = vals.terukur > 0 ? (vals.kasusGizi / vals.terukur) * 100 : 0;
            const prevPrevalensi = idx > 0 ? (() => {
                const prevVals = monthMap.get(sorted[idx - 1][0]);
                if (!prevVals || prevVals.terukur === 0) return null;
                return (prevVals.kasusGizi / prevVals.terukur) * 100;
            })() : null;

            const delta = prevPrevalensi !== null ? prevalensi - prevPrevalensi : null;
            const absdelta = delta !== null ? Math.abs(delta) : null;

            let status: PlausibilitasRow["status"] = null;
            if (absdelta !== null) {
                status = absdelta <= 2 ? "plausibel" : absdelta <= 5 ? "perhatian" : "unplausibel";
            }

            // Incidence Rate calculation aligned with Analisis Insidens Stunting (SS3)
            let insidenRate = 0;
            if (year && insidenRecords.length > 0) {
                const pkmFilter = puskesmas !== "all" ? normalizeString(puskesmas) : null;
                const matchedInsiden = insidenRecords.filter(
                    (ir) => ir.tahun === year && ir.bulan === bulan && (!pkmFilter || normalizeString(ir.puskesmas) === pkmFilter)
                );
                if (matchedInsiden.length > 0) {
                    const totalKasusInsiden = matchedInsiden.reduce((acc, curr) => acc + (Number(curr.insiden_l) || 0) + (Number(curr.insiden_p) || 0), 0);
                    const totalTimbangUkur = matchedInsiden.reduce((acc, curr) => acc + (Number(curr.jumlah_timbang_ukur) || 0), 0);
                    insidenRate = totalTimbangUkur > 0 ? (totalKasusInsiden / totalTimbangUkur) * 100 : 0;
                }
            }

            return {
                bulan,
                label: BULAN_LABELS[bulan] || `Bln ${bulan}`,
                prevalensi: Number(prevalensi.toFixed(2)),
                delta: delta !== null ? Number(delta.toFixed(2)) : null,
                absdelta: absdelta !== null ? Number(absdelta.toFixed(2)) : null,
                status,
                insidenRate: Number(insidenRate.toFixed(2)),
                kasusRaw: vals.kasusGizi,
                terukur: vals.terukur,
            };
        });

        return rows;
    }, [data, selectedGizi, year, puskesmas, insidenRecords, normalizeString]);

    // ─── Summary Metrics ─────────────────────────────────────────────────────
    const summary = useMemo(() => {
        const withDelta = plausibilitasData.filter((r) => r.delta !== null);
        const nBulan = withDelta.length;
        const nPlausibel = withDelta.filter((r) => r.status === "plausibel").length;
        const nPerhatian = withDelta.filter((r) => r.status === "perhatian").length;
        const nUnplausibel = withDelta.filter((r) => r.status === "unplausibel").length;
        const maxDelta = withDelta.length > 0
            ? withDelta.reduce((max, r) => {
                const abs = r.absdelta ?? 0;
                return abs > (max.absdelta ?? 0) ? r : max;
            }, withDelta[0])
            : null;

        const irFirst = plausibilitasData[0]?.insidenRate ?? 0;
        const irLast = plausibilitasData[plausibilitasData.length - 1]?.insidenRate ?? 0;
        const irTrend: "naik" | "turun" | "stabil" = irLast > irFirst + 5 ? "naik" : irLast < irFirst - 5 ? "turun" : "stabil";

        return { nBulan, nPlausibel, nPerhatian, nUnplausibel, maxDelta, irTrend };
    }, [plausibilitasData]);

    // ─── Scientific Insight Text ─────────────────────────────────────────────
    const insightText = useMemo(() => {
        if (plausibilitasData.length < 2) {
            return "Data belum cukup untuk analisis plausibilitas. Diperlukan minimal 2 bulan data untuk menghitung diferensial prevalensi antar-periode.";
        }

        const { nBulan, nPlausibel, nPerhatian, nUnplausibel, maxDelta, irTrend } = summary;
        const pctPlausibel = nBulan > 0 ? Math.round((nPlausibel / nBulan) * 100) : 0;

        const unplausibulBulan = plausibilitasData
            .filter((r) => r.status === "unplausibel")
            .map((r) => `${BULAN_FULL[r.bulan]} (Δ=${r.delta !== null ? (r.delta > 0 ? "+" : "") + r.delta.toFixed(1) + "%" : "—"})`);

        const perhatianBulan = plausibilitasData
            .filter((r) => r.status === "perhatian")
            .map((r) => BULAN_FULL[r.bulan]);

        const gizi = giziOption.label.replace("Prevalensi ", "");
        const pkm = puskesmas === "all" ? "seluruh puskesmas" : puskesmas;

        let text = `Dari ${nBulan} periode transisi yang dianalisis pada ${pkm} (tahun ${year ?? "—"}), `;

        if (pctPlausibel === 100) {
            text += `seluruh perubahan data ${gizi} menunjukkan plausibilitas yang baik (|ΔPrevalensi| ≤ 2% pada semua bulan). `;
            text += `Hal ini mengindikasikan konsistensi pengukuran yang tinggi dan tidak ditemukan anomali signifikan pada kualitas data. `;
        } else {
            text += `${nPlausibel} dari ${nBulan} transisi (${pctPlausibel}%) dinyatakan plausibel dengan |ΔPrevalensi| ≤ 2%. `;
        }

        if (nUnplausibel > 0) {
            text += `\n\n⚠️ Ditemukan ${nUnplausibel} periode dengan perubahan prevalensi yang tidak plausibel (|ΔPrevalensi| > 5%): ${unplausibulBulan.join(", ")}. `;
            text += `Perubahan drastis ini perlu diinvestigasi — kemungkinan disebabkan oleh: (1) perbedaan sasaran balita yang ditimbang antar-bulan, (2) error input data, atau (3) kejadian luar biasa yang mempengaruhi status gizi secara masif. `;
        }

        if (nPerhatian > 0) {
            text += `Terdapat ${nPerhatian} periode dalam zona perhatian (2% < |ΔPrevalensi| ≤ 5%): ${perhatianBulan.join(", ")}. `;
        }

        if (maxDelta && maxDelta.absdelta !== null) {
            text += `\n\nDelta terbesar terjadi pada ${BULAN_FULL[maxDelta.bulan]} dengan ΔPrevalensi = ${maxDelta.delta !== null ? (maxDelta.delta > 0 ? "+" : "") + maxDelta.delta.toFixed(1) + "%" : "—"}, `;
            text += maxDelta.status === "unplausibel"
                ? "yang dikategorikan sebagai tidak plausibel dan memerlukan verifikasi data segera. "
                : maxDelta.status === "perhatian"
                    ? "yang masih dalam batas perhatian namun perlu pemantauan lebih lanjut. "
                    : "yang masih dalam batas plausibilitas. ";
        }

        if (selectedGizi === "stunting") {
            const irDesc = irTrend === "naik"
                ? "Tren laju insidens rate stunting (IR Proxy) menunjukkan peningkatan sepanjang periode, yang berkorelasi dengan risiko peningkatan beban kasus baru."
                : irTrend === "turun"
                    ? "Laju insidens rate stunting (IR Proxy) menunjukkan penurunan yang positif, mengindikasikan efektivitas intervensi gizi yang sedang berjalan."
                    : "Laju insidens rate stunting (IR Proxy) relatif stabil, mengindikasikan tidak ada perubahan signifikan pada beban kasus stunting per bulan.";
            text += `\n\n📊 ${irDesc}`;
        }

        text += `\n\n📌 Catatan metodologi: Analisis plausibilitas menggunakan standar evaluasi diferensial prevalensi (ΔP = Pₙ − Pₙ₋₁). Insidens Rate yang ditampilkan adalah IR Proxy berbasis data agregat cross-sectional (bukan insidens sejati berbasis data longitudinal individual).`;

        return text;
    }, [plausibilitasData, summary, selectedGizi, giziOption, puskesmas, year]);

    // ─── Cross-Sectional Per-Puskesmas Data ──────────────────────────────────
    const crossSectionalData = useMemo<CrossSectionalRow[]>(() => {
        if (!allData || allData.length === 0 || !filterBulan || !year) return [];

        const prevBulan = filterBulan - 1; // 0 means no previous month

        // Build lookup: puskesmas → bulan → aggregate
        type PkmMonth = { kasusGizi: number; stunting: number; terukur: number };
        const lookup = new Map<string, Map<number, PkmMonth>>();

        allData.forEach((row) => {
            if (Number(row.tahun) !== year) return;
            const pkm = row.puskesmas as string;
            const bln = Number(row.bulan);

            if (!lookup.has(pkm)) lookup.set(pkm, new Map());
            const pkmMap = lookup.get(pkm)!;

            const kasusGizi =
                selectedGizi === "stunting" ? Number(row.stunting) || 0
                    : selectedGizi === "wasting" ? Number(row.wasting) || 0
                        : selectedGizi === "underweight" ? Number(row.underweight) || 0
                            : Number(row.obesitas) || 0;

            const existing = pkmMap.get(bln) || { kasusGizi: 0, stunting: 0, terukur: 0 };
            pkmMap.set(bln, {
                kasusGizi: existing.kasusGizi + kasusGizi,
                stunting: existing.stunting + (Number(row.stunting) || 0),
                terukur: existing.terukur + (Number(row.jumlah_timbang_ukur) || 0),
            });
        });

        const rows: CrossSectionalRow[] = [];

        lookup.forEach((monthMap, pkm) => {
            const curr = monthMap.get(filterBulan);
            if (!curr || curr.terukur === 0) return; // skip if no data for this month

            const prevalensi = (curr.kasusGizi / curr.terukur) * 100;

            // Match with data_insiden_stunting (SS3 approach)
            const normPkm = normalizeString(pkm);
            const insidenMatch = insidenRecords.find(
                (ir) => ir.tahun === year && ir.bulan === filterBulan && normalizeString(ir.puskesmas) === normPkm
            );

            let insidenRate = 0;
            if (insidenMatch) {
                const totalIns = (Number(insidenMatch.insiden_l) || 0) + (Number(insidenMatch.insiden_p) || 0);
                const measured = Number(insidenMatch.jumlah_timbang_ukur) || curr.terukur;
                insidenRate = measured > 0 ? (totalIns / measured) * 100 : 0;
            }

            let prevalensiPrev: number | null = null;
            let delta: number | null = null;
            let absdelta: number | null = null;
            let status: CrossSectionalRow["status"] = null;

            if (prevBulan > 0) {
                const prev = monthMap.get(prevBulan);
                if (prev && prev.terukur > 0) {
                    prevalensiPrev = (prev.kasusGizi / prev.terukur) * 100;
                    delta = prevalensi - prevalensiPrev;
                    absdelta = Math.abs(delta);
                    status = absdelta <= 2 ? "plausibel" : absdelta <= 5 ? "perhatian" : "unplausibel";
                }
            }

            rows.push({
                puskesmas: pkm,
                prevalensi: Number(prevalensi.toFixed(2)),
                prevalensiPrev: prevalensiPrev !== null ? Number(prevalensiPrev.toFixed(2)) : null,
                delta: delta !== null ? Number(delta.toFixed(2)) : null,
                absdelta: absdelta !== null ? Number(absdelta.toFixed(2)) : null,
                status,
                insidenRate: Number(insidenRate.toFixed(2)),
                kasusRaw: curr.kasusGizi,
                terukur: curr.terukur,
            });
        });

        // Sort based on crossMetric and crossSort
        rows.sort((a, b) => {
            let va = 0, vb = 0;
            if (crossMetric === "prevalensi") { va = a.prevalensi; vb = b.prevalensi; }
            else if (crossMetric === "delta") { va = a.delta ?? 0; vb = b.delta ?? 0; }
            else { va = a.insidenRate; vb = b.insidenRate; }
            return crossSort === "desc" ? vb - va : va - vb;
        });

        return rows.map((r, idx) => ({ ...r, rank: idx + 1 }));
    }, [allData, filterBulan, year, selectedGizi, crossMetric, crossSort, insidenRecords, normalizeString]);

    // ─── Filtered Cross-Sectional Data (Specific Puskesmas vs All) ───────────
    const activeCrossSectionalData = useMemo(() => {
        if (!puskesmas || puskesmas === "all") return crossSectionalData;
        const norm = normalizeString(puskesmas);
        const filtered = crossSectionalData.filter((r) => normalizeString(r.puskesmas) === norm);
        return filtered.length > 0 ? filtered : crossSectionalData;
    }, [crossSectionalData, puskesmas, normalizeString]);

    // ─── Cross-Sectional Summary ─────────────────────────────────────────────
    const crossSummary = useMemo(() => {
        const withStatus = crossSectionalData.filter((r) => r.status !== null);
        const nPlausibel = withStatus.filter((r) => r.status === "plausibel").length;
        const nPerhatian = withStatus.filter((r) => r.status === "perhatian").length;
        const nUnplausibel = withStatus.filter((r) => r.status === "unplausibel").length;
        const nNoData = crossSectionalData.filter((r) => r.status === null).length;

        const worstDelta = [...crossSectionalData]
            .filter((r) => r.delta !== null)
            .sort((a, b) => (b.absdelta ?? 0) - (a.absdelta ?? 0))[0] ?? null;

        const highestPrevalensi = [...crossSectionalData]
            .sort((a, b) => b.prevalensi - a.prevalensi)[0] ?? null;

        const lowestPrevalensi = [...crossSectionalData]
            .filter((r) => r.terukur > 0)
            .sort((a, b) => a.prevalensi - b.prevalensi)[0] ?? null;

        return { nPlausibel, nPerhatian, nUnplausibel, nNoData, worstDelta, highestPrevalensi, lowestPrevalensi };
    }, [crossSectionalData]);

    // ─── Render ───────────────────────────────────────────────────────────────
    if (!data || data.length === 0) return null;

    const puskesmasLabel = puskesmas === "all" ? "Semua Puskesmas" : puskesmas;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full max-w-full min-w-0 transition-all duration-200">
            {/* ─── Collapsible Banner Header (Default Closed) ─── */}
            <div
                onClick={() => setIsExpanded((prev) => !prev)}
                className={`p-5 sm:p-6 transition-all cursor-pointer select-none ${
                    isExpanded
                        ? "bg-slate-50/70 border-b border-slate-200"
                        : "bg-gradient-to-r from-violet-50/40 via-white to-indigo-50/40 hover:bg-slate-50/80"
                }`}
            >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
                            <span className="material-icons-round text-white text-xl">science</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                    Analisis Plausibilitas Data & Insidens Rate
                                </h2>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 text-[10px] font-bold tracking-wide uppercase">
                                    Surveilans Mutu
                                </span>
                                {puskesmas !== "all" && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold">
                                        Puskesmas: {puskesmas}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Evaluasi konsistensi data antar-bulan • {year ?? "—"} • {puskesmasLabel}
                                {filterBulan ? ` • Bulan ${BULAN_FULL[filterBulan]}` : ""}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        {/* Quick preview pills when collapsed */}
                        {!isExpanded && (
                            <div className="hidden sm:flex items-center gap-2 mr-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/60">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    {summary.nPlausibel} Plausibel
                                </span>
                                {summary.nUnplausibel > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-bold border border-red-200/60">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                        {summary.nUnplausibel} Unplausibel
                                    </span>
                                )}
                            </div>
                        )}

                        <button
                            type="button"
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                                isExpanded
                                    ? "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                                    : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 shadow-indigo-200"
                            }`}
                        >
                            <span>{isExpanded ? "Tutup Analisis" : "Buka Analisis Lengkap"}</span>
                            <span className={`material-icons-round text-base transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                                expand_more
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Collapsible Body Container ─── */}
            {isExpanded && (
                <div className="p-6 space-y-6">
                    {/* Controls & Metodologi Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
                        {/* Metodologi Badges */}
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-100">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                                Plausibel: |ΔP| ≤ 2%
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-100">
                                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                                Perhatian: 2% &lt; |ΔP| ≤ 5%
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-[11px] font-bold border border-red-100">
                                <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                                Unplausibel: |ΔP| &gt; 5%
                            </span>
                        </div>

                        {/* Dropdown Pilih Status Gizi */}
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <label className="text-xs font-semibold text-slate-500">Status Gizi:</label>
                            <select
                                value={selectedGizi}
                                onChange={(e) => setSelectedGizi(e.target.value as GiziKey)}
                                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all font-semibold"
                            >
                                {GIZI_OPTIONS.map((g) => (
                                    <option key={g.key} value={g.key}>{g.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {plausibilitasData.length < 2 ? (
                        <div className="text-center py-10">
                            <span className="material-icons-round text-5xl text-slate-300 mb-3 block">analytics</span>
                            <p className="text-sm font-semibold text-slate-500">Data Tidak Cukup</p>
                            <p className="text-xs text-slate-400 mt-1">Diperlukan minimal 2 bulan data untuk analisis plausibilitas.</p>
                        </div>
                    ) : (
                        <>
                        {/* ─── Summary Cards ─────────────────────────────────── */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Periode Dianalisis</p>
                                <p className="text-2xl font-extrabold text-slate-900">{plausibilitasData.length}
                                    <span className="text-sm font-bold text-slate-400 ml-1">bln</span>
                                </p>
                            </div>
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">✅ Plausibel</p>
                                <p className="text-2xl font-extrabold text-emerald-700">{summary.nPlausibel}
                                    <span className="text-sm font-bold text-emerald-400 ml-1">bln</span>
                                </p>
                            </div>
                            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">⚠️ Perhatian</p>
                                <p className="text-2xl font-extrabold text-amber-700">{summary.nPerhatian}
                                    <span className="text-sm font-bold text-amber-400 ml-1">bln</span>
                                </p>
                            </div>
                            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                                <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">❌ Unplausibel</p>
                                <p className="text-2xl font-extrabold text-red-700">{summary.nUnplausibel}
                                    <span className="text-sm font-bold text-red-400 ml-1">bln</span>
                                </p>
                            </div>
                        </div>

                        {/* ─── Toggle Buttons Chart ────────────────────────── */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-slate-500 font-medium mr-1">Tampilkan:</span>
                                <button
                                    onClick={() => setShowDelta((v) => !v)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${showDelta ? "bg-amber-50 text-amber-700 border-amber-200 shadow-xs" : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"}`}
                                >
                                    <span className="inline-block w-3.5 border-t-2 border-dashed border-amber-500 align-middle"></span>
                                    Δ Prevalensi
                                </button>
                                {selectedGizi === "stunting" && (
                                    <button
                                        onClick={() => setShowIR((v) => !v)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${showIR ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs" : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"}`}
                                    >
                                        <span className="inline-block w-3.5 border-t-2 border-indigo-500 align-middle"></span>
                                        IR Stunting (%) (kanan)
                                    </button>
                                )}
                            </div>

                            {/* Axis hints */}
                            <div className="text-[11px] text-slate-400 flex items-center gap-3">
                                <span>Sumbu Kiri: <b>Prevalensi (%)</b></span>
                                {selectedGizi === "stunting" && showIR && (
                                    <span className="text-indigo-600 font-semibold">Sumbu Kanan: <b>Incidence Rate (%)</b></span>
                                )}
                            </div>
                        </div>

                        {/* ─── ComposedChart ───────────────────────────────── */}
                        <div className="h-[400px] w-full min-w-0 pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={plausibilitasData} margin={{ top: 25, right: selectedGizi === "stunting" && showIR ? 50 : 20, left: 10, bottom: 25 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                    <XAxis
                                        dataKey="label"
                                        interval={0}
                                        padding={{ left: 24, right: 24 }}
                                        tick={{ fontSize: 11, fill: "#475569", fontFamily: "monospace", fontWeight: 600 }}
                                        axisLine={{ stroke: "#cbd5e1" }}
                                        tickLine={false}
                                    />
                                    {/* Y-Axis kiri: % prevalensi & delta */}
                                    <YAxis
                                        yAxisId="pct"
                                        domain={[(dataMin: number) => Math.min(-4, Math.floor(dataMin - 1)), (dataMax: number) => Math.max(12, Math.ceil(dataMax + 2))]}
                                        tick={{ fontSize: 10.5, fill: "#64748b", fontFamily: "monospace" }}
                                        tickFormatter={(v) => `${v}%`}
                                        axisLine={false}
                                        tickLine={false}
                                        width={45}
                                    />
                                    {/* Y-Axis kanan: IR % — hanya saat stunting + showIR */}
                                    {selectedGizi === "stunting" && showIR && (
                                        <YAxis
                                            yAxisId="ir"
                                            orientation="right"
                                            domain={[0, (dataMax: number) => Math.max(4, Math.ceil((dataMax || 2) * 1.6))]}
                                            tick={{ fontSize: 10.5, fill: "#6366f1", fontFamily: "monospace", fontWeight: 600 }}
                                            tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
                                            axisLine={false}
                                            tickLine={false}
                                            width={48}
                                        />
                                    )}

                                    <Tooltip
                                        content={
                                            <CustomTooltip giziLabel={giziOption.label} />
                                        }
                                    />
                                    <Legend
                                        iconType="circle"
                                        iconSize={8}
                                        wrapperStyle={{ fontSize: 11, paddingTop: 16 }}
                                    />

                                    {/* Reference Lines ±2% (hijau plausibel) */}
                                    <ReferenceLine yAxisId="pct" y={0} stroke="#cbd5e1" strokeWidth={1} />
                                    <ReferenceLine yAxisId="pct" y={2} stroke="#10b981" strokeDasharray="4 3" strokeWidth={1.5}
                                        label={{ value: "+2% Plausibel", fill: "#10b981", fontSize: 9.5, position: "insideTopLeft" }} />
                                    <ReferenceLine yAxisId="pct" y={-2} stroke="#10b981" strokeDasharray="4 3" strokeWidth={1.5}
                                        label={{ value: "-2% Plausibel", fill: "#10b981", fontSize: 9.5, position: "insideBottomLeft" }} />

                                    {/* Reference Lines ±5% (merah toleransi) */}
                                    <ReferenceLine yAxisId="pct" y={5} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5}
                                        label={{ value: "+5% Toleransi", fill: "#ef4444", fontSize: 9.5, position: "insideTopLeft" }} />
                                    <ReferenceLine yAxisId="pct" y={-5} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5}
                                        label={{ value: "-5% Toleransi", fill: "#ef4444", fontSize: 9.5, position: "insideBottomLeft" }} />

                                    {/* Line 1: Prevalensi */}
                                    <Line
                                        yAxisId="pct"
                                        type="linear"
                                        dataKey="prevalensi"
                                        name={giziOption.label}
                                        stroke="#0062FF"
                                        strokeWidth={2.5}
                                        dot={{ r: 4, fill: "#0062FF", strokeWidth: 2, stroke: "#fff" }}
                                        activeDot={{ r: 6 }}
                                    />

                                    {/* Line 2: Δ Prevalensi (dashed, oranye) */}
                                    {showDelta && (
                                        <Line
                                            yAxisId="pct"
                                            type="linear"
                                            dataKey="delta"
                                            name="Δ Prevalensi"
                                            stroke="#f59e0b"
                                            strokeWidth={2}
                                            strokeDasharray="5 3"
                                            dot={(props) => {
                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                const { cx, cy, payload } = props as any;
                                                if (payload.delta === null || cy === null) return <g key={`dot-empty-${props.index}`} />;
                                                const abs = Math.abs(payload.delta);
                                                const fill = abs > 5 ? "#ef4444" : abs > 2 ? "#f59e0b" : "#10b981";
                                                return (
                                                    <circle
                                                        key={`dot-delta-${props.index}`}
                                                        cx={cx}
                                                        cy={cy}
                                                        r={5}
                                                        fill={fill}
                                                        stroke="#fff"
                                                        strokeWidth={2}
                                                    />
                                                );
                                            }}
                                            activeDot={{ r: 6 }}
                                            connectNulls={false}
                                        />
                                    )}

                                    {/* Line 3: IR Stunting (indigo, axis kanan) */}
                                    {selectedGizi === "stunting" && showIR && (
                                        <Line
                                            yAxisId="ir"
                                            type="linear"
                                            dataKey="insidenRate"
                                            name="IR Stunting (%)"
                                            stroke="#6366f1"
                                            strokeWidth={2}
                                            strokeOpacity={0.9}
                                            dot={{ r: 4, fill: "#6366f1", strokeWidth: 1.5, stroke: "#fff" }}
                                            activeDot={{ r: 6 }}
                                        />
                                    )}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>

                        {/* ─── Tabel Evaluasi Per Bulan ─────────────────────── */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <span className="material-icons-round text-base text-violet-500">table_chart</span>
                                Tabel Evaluasi Per Bulan
                            </h3>
                            <div className="w-full max-w-full overflow-x-auto min-w-0 rounded-xl border border-slate-100">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider font-mono">Bulan</th>
                                            <th className="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-wider font-mono">Prevalensi</th>
                                            <th className="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-wider font-mono">Δ Prev</th>
                                            <th className="text-center px-4 py-3 font-bold text-slate-500 uppercase tracking-wider font-mono">Status</th>
                                            {selectedGizi === "stunting" && (
                                                <th className="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-wider font-mono">IR Stunting</th>
                                            )}
                                            <th className="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-wider font-mono">Terukur</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {plausibilitasData.map((row, idx) => {
                                            const cfg = getStatusConfig(row.status);
                                            return (
                                                <tr
                                                    key={row.bulan}
                                                    className={`border-b border-slate-100 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"} ${row.status === "unplausibel" ? "bg-red-50/60" : row.status === "perhatian" ? "bg-amber-50/40" : ""}`}
                                                >
                                                    <td className="px-4 py-3 font-semibold text-slate-700">
                                                        {BULAN_FULL[row.bulan]}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">
                                                        {formatPctAbs(row.prevalensi)}
                                                    </td>
                                                    <td className={`px-4 py-3 text-right font-mono font-bold ${row.delta === null ? "text-slate-300" : Math.abs(row.delta) > 5 ? "text-red-600" : Math.abs(row.delta) > 2 ? "text-amber-600" : "text-emerald-600"}`}>
                                                        {formatPct(row.delta)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {row.status ? (
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                                                                {cfg.icon} {cfg.label}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300 text-xs">Data pertama</span>
                                                        )}
                                                    </td>
                                                    {selectedGizi === "stunting" && (
                                                        <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600">
                                                            {row.insidenRate.toFixed(2)}%
                                                        </td>
                                                    )}
                                                    <td className="px-4 py-3 text-right font-mono text-slate-500">
                                                        {row.terukur.toLocaleString("id-ID")}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ─── Scientific Insight Box ───────────────────────── */}
                        <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50 p-5">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="material-icons-round text-violet-600 text-base">auto_awesome</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-violet-800 uppercase tracking-wider mb-2">
                                        Scientific Insight — Plausibilitas & Insidens Rate
                                    </p>
                                    <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                                        {insightText}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ─── Cross-Sectional Per-Puskesmas ─────────────── */}
                        <div className="rounded-xl border border-cyan-100 bg-white overflow-hidden w-full max-w-full min-w-0">
                            {/* Section Header */}
                            <div className="p-5 border-b border-cyan-50 bg-gradient-to-r from-cyan-50/60 to-sky-50/60">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center shrink-0">
                                            <span className="material-icons-round text-cyan-600 text-base">bar_chart</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">
                                                Analisis Lintas Puskesmas — Cross-Sectional
                                            </p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                {filterBulan
                                                    ? `Evaluasi plausibilitas & IR per puskesmas • ${BULAN_FULL[filterBulan]} ${year ?? ""}`
                                                    : "Pilih filter bulan untuk mengaktifkan analisis ini"}
                                            </p>
                                        </div>
                                    </div>
                                    {filterBulan && crossSectionalData.length > 0 && (
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <select
                                                value={crossMetric}
                                                onChange={(e) => setCrossMetric(e.target.value as "prevalensi" | "delta" | "ir")}
                                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all font-medium"
                                            >
                                                <option value="prevalensi">Urutkan: {giziOption.label}</option>
                                                <option value="delta">Urutkan: Δ Prevalensi</option>
                                                {selectedGizi === "stunting" && <option value="ir">Urutkan: IR Stunting</option>}
                                            </select>
                                            <button
                                                onClick={() => setCrossSort((s) => s === "desc" ? "asc" : "desc")}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 transition-all"
                                            >
                                                <span className="material-icons-round text-sm">
                                                    {crossSort === "desc" ? "arrow_downward" : "arrow_upward"}
                                                </span>
                                                {crossSort === "desc" ? "Tertinggi" : "Terendah"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-5 space-y-5">
                                {!filterBulan ? (
                                    <div className="text-center py-8">
                                        <span className="material-icons-round text-4xl text-slate-200 mb-2 block">filter_alt</span>
                                        <p className="text-sm font-semibold text-slate-400">Belum Ada Filter Bulan</p>
                                        <p className="text-xs text-slate-300 mt-1">Pilih bulan pada filter di atas untuk melihat analisis cross-sectional per puskesmas.</p>
                                    </div>
                                ) : crossSectionalData.length === 0 ? (
                                    <div className="text-center py-8">
                                        <span className="material-icons-round text-4xl text-slate-200 mb-2 block">search_off</span>
                                        <p className="text-sm font-semibold text-slate-400">Data Tidak Tersedia</p>
                                        <p className="text-xs text-slate-300 mt-1">Tidak ada data puskesmas untuk bulan yang dipilih.</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Status Summary Bar */}
                                        <div className="flex flex-wrap gap-3 items-center pb-1">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ringkasan:</span>
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-100">
                                                ✅ {crossSummary.nPlausibel} Plausibel
                                            </span>
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-100">
                                                ⚠️ {crossSummary.nPerhatian} Perhatian
                                            </span>
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-[11px] font-bold border border-red-100">
                                                ❌ {crossSummary.nUnplausibel} Unplausibel
                                            </span>
                                            {crossSummary.nNoData > 0 && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 text-[11px] font-bold border border-slate-200">
                                                    ― {crossSummary.nNoData} Tanpa Data Prev.
                                                </span>
                                            )}
                                        </div>

                                        {/* Highlight Cards */}
                                        {activeCrossSectionalData.length === 1 ? (
                                            /* Single Puskesmas Focus KPI Cards */
                                            (() => {
                                                const pkmRow = activeCrossSectionalData[0];
                                                const cfg = getStatusConfig(pkmRow.status);
                                                return (
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                        {/* Card 1: Prevalensi & Plausibilitas */}
                                                        <div className={`rounded-xl border p-3.5 ${
                                                            pkmRow.status === "unplausibel" ? "border-red-200 bg-red-50/70"
                                                            : pkmRow.status === "perhatian" ? "border-amber-200 bg-amber-50/60"
                                                            : "border-emerald-200 bg-emerald-50/60"
                                                        }`}>
                                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                                                Status Plausibilitas ({giziOption.label})
                                                            </p>
                                                            <p className="font-bold text-slate-800 text-sm truncate">{pkmRow.puskesmas}</p>
                                                            <div className="flex items-baseline gap-2 mt-1">
                                                                <span className="font-extrabold text-2xl text-slate-900">{formatPctAbs(pkmRow.prevalensi)}</span>
                                                                {pkmRow.delta !== null && (
                                                                    <span className={`text-xs font-bold ${
                                                                        (pkmRow.absdelta ?? 0) > 5 ? "text-red-600"
                                                                        : (pkmRow.absdelta ?? 0) > 2 ? "text-amber-600"
                                                                        : "text-emerald-600"
                                                                    }`}>
                                                                        Δ {formatPct(pkmRow.delta)} vs bln lalu
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="mt-2">
                                                                {pkmRow.status ? (
                                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${cfg.bg} ${cfg.text}`}>
                                                                        {cfg.icon} {cfg.label} {pkmRow.absdelta !== null ? `(|ΔP| = ${pkmRow.absdelta.toFixed(1)}%)` : ""}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-400 text-xs">Belum ada data bulan sebelumnya</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Card 2: Insidens Rate Stunting */}
                                                        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5">
                                                            <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1">
                                                                Incidence Rate (IR Stunting)
                                                            </p>
                                                            <p className="font-bold text-slate-800 text-sm truncate">Laju Kasus Baru</p>
                                                            <p className="font-extrabold text-2xl text-indigo-700 mt-1">
                                                                {pkmRow.insidenRate.toFixed(2)}%
                                                            </p>
                                                            <p className="text-xs text-slate-500 mt-2">
                                                                Dari {pkmRow.terukur.toLocaleString("id-ID")} balita yang ditimbang/diukur
                                                            </p>
                                                        </div>

                                                        {/* Card 3: Ranking Kabupaten */}
                                                        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5">
                                                            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">
                                                                Peringkat Kabupaten Malang
                                                            </p>
                                                            <p className="font-bold text-slate-800 text-sm truncate">
                                                                Berdasarkan {crossMetric === "prevalensi" ? giziOption.label : crossMetric === "delta" ? "Δ Prevalensi" : "IR Stunting"}
                                                            </p>
                                                            <p className="font-extrabold text-2xl text-blue-700 mt-1">
                                                                Peringkat #{pkmRow.rank ?? 1}
                                                                <span className="text-sm font-semibold text-slate-500 ml-1.5">dari {crossSectionalData.length} puskesmas</span>
                                                            </p>
                                                            <p className="text-xs text-slate-500 mt-2">
                                                                Urutan {crossSort === "desc" ? "Tertinggi" : "Terendah"} • {BULAN_FULL[filterBulan]} {year}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })()
                                        ) : (
                                            /* All Puskesmas Highlight Cards */
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                {crossSummary.highestPrevalensi && (
                                                    <div className={`rounded-xl border p-3 ${crossSummary.highestPrevalensi.status === "unplausibel" ? "border-red-200 bg-red-50/60" : crossSummary.highestPrevalensi.status === "perhatian" ? "border-amber-100 bg-amber-50/50" : "border-slate-100 bg-slate-50"}`}>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">🔴 Prevalensi Tertinggi</p>
                                                        <p className="font-bold text-slate-800 text-sm truncate">{crossSummary.highestPrevalensi.puskesmas}</p>
                                                        <p className="font-extrabold text-red-600 text-xl">{formatPctAbs(crossSummary.highestPrevalensi.prevalensi)}</p>
                                                        {crossSummary.highestPrevalensi.delta !== null && (
                                                            <p className={`text-xs font-bold mt-0.5 ${(crossSummary.highestPrevalensi.absdelta ?? 0) > 5 ? "text-red-500" : (crossSummary.highestPrevalensi.absdelta ?? 0) > 2 ? "text-amber-500" : "text-emerald-500"}`}>
                                                                Δ {formatPct(crossSummary.highestPrevalensi.delta)} vs bln lalu
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                                {crossSummary.worstDelta && (
                                                    <div className={`rounded-xl border p-3 ${crossSummary.worstDelta.status === "unplausibel" ? "border-red-200 bg-red-50/60" : "border-amber-100 bg-amber-50/50"}`}>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">⚡ Delta Terbesar</p>
                                                        <p className="font-bold text-slate-800 text-sm truncate">{crossSummary.worstDelta.puskesmas}</p>
                                                        <p className={`font-extrabold text-xl ${(crossSummary.worstDelta.absdelta ?? 0) > 5 ? "text-red-600" : "text-amber-600"}`}>
                                                            {formatPct(crossSummary.worstDelta.delta)}
                                                        </p>
                                                        <p className="text-xs text-slate-400">|ΔP| = {crossSummary.worstDelta.absdelta?.toFixed(1)}%</p>
                                                    </div>
                                                )}
                                                {crossSummary.lowestPrevalensi && (
                                                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">🟢 Prevalensi Terendah</p>
                                                        <p className="font-bold text-slate-800 text-sm truncate">{crossSummary.lowestPrevalensi.puskesmas}</p>
                                                        <p className="font-extrabold text-emerald-600 text-xl">{formatPctAbs(crossSummary.lowestPrevalensi.prevalensi)}</p>
                                                        {crossSummary.lowestPrevalensi.delta !== null && (
                                                            <p className={`text-xs font-bold mt-0.5 ${(crossSummary.lowestPrevalensi.absdelta ?? 0) > 5 ? "text-red-500" : (crossSummary.lowestPrevalensi.absdelta ?? 0) > 2 ? "text-amber-500" : "text-emerald-500"}`}>
                                                                Δ {formatPct(crossSummary.lowestPrevalensi.delta)} vs bln lalu
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* ── Vertical Grouped Bar Chart: Delta vs IR ─── */}
                                        <div>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                                        <span className="material-icons-round text-sm text-cyan-500">bar_chart</span>
                                                        Komparasi Selisih Prevalensi (Δ) vs Incidence Rate (IR)
                                                        <span className="ml-1 text-slate-400 font-normal">
                                                            ({activeCrossSectionalData.length} {activeCrossSectionalData.length === 1 ? "puskesmas terpilih" : "puskesmas"})
                                                        </span>
                                                    </h4>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                                        Perbandingan diferensial prevalensi terhadap laju insidens kasus baru
                                                        {puskesmas !== "all" ? ` untuk Puskesmas ${puskesmas}` : " per puskesmas"}
                                                    </p>
                                                </div>

                                                {/* Legend Guide */}
                                                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>
                                                        <span className="text-slate-600 font-medium">Δ Plausibel (≤2%)</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block"></span>
                                                        <span className="text-slate-600 font-medium">Δ Perhatian (2-5%)</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 rounded-sm bg-red-500 inline-block"></span>
                                                        <span className="text-slate-600 font-medium">Δ Unplausibel (&gt;5%)</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block"></span>
                                                        <span className="text-slate-700 font-bold">Incidence Rate (IR %)</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={`w-full max-w-full overflow-x-auto min-w-0 rounded-2xl border border-slate-100 bg-slate-50/30 p-2 ${activeCrossSectionalData.length === 1 ? "flex justify-center" : ""}`}>
                                                <div style={{
                                                    width: "100%",
                                                    maxWidth: activeCrossSectionalData.length === 1 ? 480 : "none",
                                                    minWidth: activeCrossSectionalData.length === 1 ? 320 : Math.max(900, activeCrossSectionalData.length * 36),
                                                    height: 420
                                                }}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart
                                                            data={activeCrossSectionalData}
                                                            margin={{ top: 35, right: 25, left: 10, bottom: 65 }}
                                                            barGap={activeCrossSectionalData.length === 1 ? 8 : 2}
                                                            barCategoryGap={activeCrossSectionalData.length === 1 ? "30%" : 8}
                                                        >
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                                            <XAxis
                                                                dataKey="puskesmas"
                                                                interval={0}
                                                                angle={-45}
                                                                textAnchor="end"
                                                                height={75}
                                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                tick={({ x, y, payload }: any) => {
                                                                    const name: string = payload.value;
                                                                    const isSelected = name === puskesmas || activeCrossSectionalData.length === 1;
                                                                    const short = name.length > 15 ? name.slice(0, 14) + "…" : name;
                                                                    return (
                                                                        <g key={`xtick-${name}`}>
                                                                            <text
                                                                                x={x}
                                                                                y={y}
                                                                                dy={8}
                                                                                textAnchor="end"
                                                                                transform={`rotate(-45, ${x}, ${y})`}
                                                                                fill={isSelected ? "#0062FF" : "#475569"}
                                                                                fontSize={isSelected ? 10 : 8.5}
                                                                                fontWeight={isSelected ? "bold" : 500}
                                                                                fontFamily="monospace"
                                                                            >
                                                                                {short}
                                                                            </text>
                                                                        </g>
                                                                    );
                                                                }}
                                                                axisLine={{ stroke: "#cbd5e1" }}
                                                                tickLine={false}
                                                            />
                                                            <YAxis
                                                                tick={{ fontSize: 10, fill: "#94a3b8", fontFamily: "monospace" }}
                                                                tickFormatter={(v) => `${v}%`}
                                                                domain={[(dataMin: number) => Math.min(-15, Math.floor(dataMin - 1)), (dataMax: number) => Math.max(8, Math.ceil(dataMax + 1))]}
                                                                axisLine={false}
                                                                tickLine={false}
                                                                width={42}
                                                            />
                                                            <Tooltip
                                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                content={({ active, payload }: any) => {
                                                                    if (!active || !payload?.[0]) return null;
                                                                    const d: CrossSectionalRow = payload[0].payload;
                                                                    const cfg = getStatusConfig(d.status);
                                                                    return (
                                                                        <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-3 text-xs min-w-[220px]">
                                                                            <p className="font-bold text-slate-800 text-sm mb-2 border-b border-slate-100 pb-1">{d.puskesmas}</p>
                                                                            <div className="space-y-1.5">
                                                                                <div className="flex justify-between gap-4">
                                                                                    <span className="text-slate-500">{giziOption.label}</span>
                                                                                    <span className="font-bold text-blue-600">{formatPctAbs(d.prevalensi)}</span>
                                                                                </div>
                                                                                {d.prevalensiPrev !== null && (
                                                                                    <div className="flex justify-between gap-4">
                                                                                        <span className="text-slate-400">Bln sebelumnya</span>
                                                                                        <span className="font-mono text-slate-500">{formatPctAbs(d.prevalensiPrev)}</span>
                                                                                    </div>
                                                                                )}
                                                                                {d.delta !== null && (
                                                                                    <div className="flex justify-between gap-4">
                                                                                        <span className="text-slate-500">Δ Prevalensi</span>
                                                                                        <span className={`font-bold ${(d.absdelta ?? 0) > 5 ? "text-red-600" : (d.absdelta ?? 0) > 2 ? "text-amber-600" : "text-emerald-600"}`}>
                                                                                            {formatPct(d.delta)}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                                <div className="flex justify-between gap-4">
                                                                                    <span className="text-slate-500 font-medium">Incidence Rate (IR)</span>
                                                                                    <span className="font-bold text-indigo-600">{d.insidenRate.toFixed(2)}%</span>
                                                                                </div>
                                                                                <div className="flex justify-between gap-4 pt-1.5 border-t border-slate-100">
                                                                                    <span className="text-slate-500">Status Evaluasi</span>
                                                                                    <span className={`font-bold ${cfg.text}`}>{cfg.icon} {cfg.label}</span>
                                                                                </div>
                                                                                <div className="flex justify-between gap-4">
                                                                                    <span className="text-slate-400">Balita Terukur</span>
                                                                                    <span className="font-mono text-slate-500">{d.terukur.toLocaleString("id-ID")}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }}
                                                            />
                                                            <Legend
                                                                iconType="square"
                                                                iconSize={8}
                                                                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                                                            />
                                                            <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
                                                            <ReferenceLine y={2} stroke="#10b981" strokeDasharray="4 3" strokeWidth={1.5} />
                                                            <ReferenceLine y={-2} stroke="#10b981" strokeDasharray="4 3" strokeWidth={1.5} />
                                                            <ReferenceLine y={5} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5} />
                                                            <ReferenceLine y={-5} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5} />

                                                            {/* Bar 1: Δ Prevalensi */}
                                                            <Bar
                                                                dataKey="delta"
                                                                name="Δ Prevalensi"
                                                                radius={[4, 4, 0, 0]}
                                                                maxBarSize={activeCrossSectionalData.length === 1 ? 36 : 16}
                                                            >
                                                                <LabelList
                                                                    dataKey="delta"
                                                                    position="top"
                                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                    formatter={(val: any) => {
                                                                        if (val === null || val === undefined) return "";
                                                                        return `${Number(val) > 0 ? "+" : ""}${Number(val).toFixed(1)}%`;
                                                                    }}
                                                                    fontSize={activeCrossSectionalData.length === 1 ? 9 : 7.5}
                                                                    fontWeight="bold"
                                                                    fontFamily="monospace"
                                                                    fill="#334155"
                                                                />
                                                                {activeCrossSectionalData.map((entry, index) => {
                                                                    const fill = entry.status === "unplausibel" ? "#ef4444"
                                                                        : entry.status === "perhatian" ? "#f59e0b"
                                                                            : entry.status === "plausibel" ? "#10b981"
                                                                                : "#cbd5e1";
                                                                    const isSelected = entry.puskesmas === puskesmas || activeCrossSectionalData.length === 1;
                                                                    return (
                                                                        <Cell
                                                                            key={`bar-delta-${index}`}
                                                                            fill={fill}
                                                                            stroke={isSelected ? "#0062FF" : "transparent"}
                                                                            strokeWidth={isSelected ? 2 : 0}
                                                                        />
                                                                    );
                                                                })}
                                                            </Bar>

                                                            {/* Bar 2: Incidence Rate (IR %) */}
                                                            <Bar
                                                                dataKey="insidenRate"
                                                                name="Incidence Rate (IR)"
                                                                fill="#6366f1"
                                                                radius={[4, 4, 0, 0]}
                                                                maxBarSize={activeCrossSectionalData.length === 1 ? 36 : 16}
                                                            >
                                                                <LabelList
                                                                    dataKey="insidenRate"
                                                                    position="top"
                                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                    formatter={(val: any) => {
                                                                        if (val === null || val === undefined || Number(val) === 0) return "";
                                                                        return `${Number(val).toFixed(2)}%`;
                                                                    }}
                                                                    fontSize={activeCrossSectionalData.length === 1 ? 9 : 7.5}
                                                                    fontWeight="bold"
                                                                    fontFamily="monospace"
                                                                    fill="#6366f1"
                                                                />
                                                                {activeCrossSectionalData.map((entry, index) => {
                                                                    const isSelected = entry.puskesmas === puskesmas || activeCrossSectionalData.length === 1;
                                                                    return (
                                                                        <Cell
                                                                            key={`bar-ir-${index}`}
                                                                            fill="#6366f1"
                                                                            fillOpacity={0.88}
                                                                            stroke={isSelected ? "#0062FF" : "transparent"}
                                                                            strokeWidth={isSelected ? 2 : 0}
                                                                        />
                                                                    );
                                                                })}
                                                            </Bar>
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ranking Table */}
                                        <div>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                                                <h4 className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                                    <span className="material-icons-round text-sm text-cyan-500">format_list_numbered</span>
                                                    Tabel Ranking Puskesmas — {BULAN_FULL[filterBulan]} {year}
                                                    {puskesmas !== "all" && (
                                                        <span className="ml-1 text-slate-400 font-normal">
                                                            (Menampilkan Puskesmas {puskesmas})
                                                        </span>
                                                    )}
                                                </h4>
                                                {puskesmas !== "all" && activeCrossSectionalData.length === 1 && (
                                                    <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                                                        Peringkat #{activeCrossSectionalData[0]?.rank ?? 1} dari {crossSectionalData.length} puskesmas
                                                    </span>
                                                )}
                                            </div>
                                            <div className="w-full max-w-full overflow-x-auto min-w-0 rounded-xl border border-slate-100">
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="bg-slate-50 border-b border-slate-200">
                                                            <th className="text-center px-3 py-2.5 font-bold text-slate-400 w-10">#</th>
                                                            <th className="text-left px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider font-mono">Puskesmas</th>
                                                            <th className="text-right px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider font-mono">Prevalensi</th>
                                                            <th className="text-right px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider font-mono">Bln Lalu</th>
                                                            <th className="text-right px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider font-mono">Δ Prev</th>
                                                            <th className="text-center px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider font-mono">Status</th>
                                                            <th className="text-right px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider font-mono">IR Stunting</th>
                                                            <th className="text-right px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider font-mono">Terukur</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {activeCrossSectionalData.map((row, idx) => {
                                                            const cfg = getStatusConfig(row.status);
                                                            const isSelected = row.puskesmas === puskesmas || activeCrossSectionalData.length === 1;
                                                            return (
                                                                <tr
                                                                    key={row.puskesmas}
                                                                    className={`border-b border-slate-100 transition-colors ${isSelected
                                                                        ? "bg-blue-50/80 border-l-4 border-l-blue-500"
                                                                        : row.status === "unplausibel"
                                                                            ? "bg-red-50/50"
                                                                            : row.status === "perhatian"
                                                                                ? "bg-amber-50/30"
                                                                                : idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                                                                        }`}
                                                                >
                                                                    <td className="px-3 py-2.5 text-center text-[11px] font-bold text-slate-500 font-mono">
                                                                        #{row.rank ?? (idx + 1)}
                                                                    </td>
                                                                    <td className={`px-4 py-2.5 font-semibold whitespace-nowrap ${isSelected ? "text-blue-700" : "text-slate-700"}`}>
                                                                        {row.puskesmas}
                                                                        {isSelected && (
                                                                            <span className="ml-1.5 text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">DIPILIH</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-right font-mono font-bold text-blue-600">
                                                                        {formatPctAbs(row.prevalensi)}
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-right font-mono text-slate-400">
                                                                        {row.prevalensiPrev !== null ? formatPctAbs(row.prevalensiPrev) : "—"}
                                                                    </td>
                                                                    <td className={`px-4 py-2.5 text-right font-mono font-bold ${row.delta === null ? "text-slate-300" : (row.absdelta ?? 0) > 5 ? "text-red-600" : (row.absdelta ?? 0) > 2 ? "text-amber-600" : "text-emerald-600"}`}>
                                                                        {formatPct(row.delta)}
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-center">
                                                                        {row.status ? (
                                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                                                                                {cfg.icon} {cfg.label}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-slate-300 text-[10px]">Tdk ada data prev.</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-right font-mono font-bold text-indigo-600">
                                                                        {row.insidenRate.toFixed(2)}%
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-right font-mono text-slate-400">
                                                                        {row.terukur.toLocaleString("id-ID")}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Bottom Collapse Button */}
                        <div className="pt-3 flex justify-center border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setIsExpanded(false)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            >
                                <span className="material-icons-round text-sm rotate-180">expand_more</span>
                                Tutup Analisis Plausibilitas & Insidens Rate
                            </button>
                        </div>
                    </>
                )}
            </div>
        )}
    </div>
);
}
