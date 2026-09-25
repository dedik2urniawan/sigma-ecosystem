"use client";

import React, { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";

// ─── Types ───────────────────────────────────────────────────────────────────
export type StatusGiziKey = "gizi_buruk" | "stunting" | "wasting" | "underweight" | "obesitas";

export interface HeatbarMapSectionProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[];
    year: number | null;
    level: "puskesmas" | "desa";
    filterPuskesmas?: string;
}

interface MonthlyStat {
    bulan: number;
    numerator: number;
    denominator: number;
    pct: number | null; // null if denominator === 0
}

interface EntityProgressRow {
    name: string;
    parent?: string; // puskesmas name if level === 'desa'
    months: Record<number, MonthlyStat>;
    avgPct: number;
    latestPct: number | null;
    latestMonth: number | null;
    prevPct: number | null;
    deltaMoM: number | null;
    persistentRiskCount: number; // months in top critical tiers
    hasData: boolean;
}

const MONTH_NAMES: Record<number, string> = {
    1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "Mei", 6: "Jun",
    7: "Jul", 8: "Agt", 9: "Sep", 10: "Okt", 11: "Nov", 12: "Des",
};

const MONTH_FULL_NAMES: Record<number, string> = {
    1: "Januari", 2: "Februari", 3: "Maret", 4: "April", 5: "Mei", 6: "Juni",
    7: "Juli", 8: "Agustus", 9: "September", 10: "Oktober", 11: "November", 12: "Desember",
};

const STATUS_GIZI_CONFIG: Record<
    StatusGiziKey,
    {
        label: string;
        description: string;
        icon: string;
        colorTheme: string;
        getColor: (pct: number | null) => { bg: string; text: string; tier: string; isCritical: boolean };
        legendTiers: { label: string; color: string; textColor: string; note: string }[];
    }
> = {
    gizi_buruk: {
        label: "Prevalensi Gizi Buruk",
        description: "Severe Acute Malnutrition (BB/TB atau BB/PB < -3 SD) dengan skala presisi tinggi",
        icon: "emergency",
        colorTheme: "red",
        getColor: (pct) => {
            if (pct === null) return { bg: "bg-slate-100", text: "text-slate-400", tier: "No Data", isCritical: false };
            if (pct === 0) return { bg: "bg-slate-50", text: "text-slate-500", tier: "Nol Kasus (0%)", isCritical: false };
            if (pct < 0.5) return { bg: "bg-emerald-100 hover:bg-emerald-200", text: "text-emerald-900 font-bold", tier: "< 0.5% (Sangat Rendah)", isCritical: false };
            if (pct < 1.0) return { bg: "bg-amber-100 hover:bg-amber-200", text: "text-amber-950 font-bold", tier: "0.5 - 1.0% (Rendah)", isCritical: false };
            if (pct < 1.5) return { bg: "bg-orange-200 hover:bg-orange-300", text: "text-orange-950 font-extrabold", tier: "1.0 - 1.5% (Sedang)", isCritical: true };
            if (pct < 2.0) return { bg: "bg-rose-500 hover:bg-rose-600", text: "text-white font-extrabold", tier: "1.5 - 2.0% (Tinggi)", isCritical: true };
            return { bg: "bg-red-800 hover:bg-red-900", text: "text-white font-black", tier: "≥ 2.0% (Sangat Tinggi / Darurat)", isCritical: true };
        },
        legendTiers: [
            { label: "0%", color: "#f8fafc", textColor: "#64748b", note: "Nol Kasus" },
            { label: "< 0.5%", color: "#d1fae5", textColor: "#065f46", note: "Sangat Rendah" },
            { label: "0.5 - 1.0%", color: "#fef3c7", textColor: "#78350f", note: "Rendah" },
            { label: "1.0 - 1.5%", color: "#fed7aa", textColor: "#7c2d12", note: "Sedang" },
            { label: "1.5 - 2.0%", color: "#f43f5e", textColor: "#ffffff", note: "Tinggi" },
            { label: "≥ 2.0%", color: "#991b1b", textColor: "#ffffff", note: "Sangat Tinggi / Kritis" },
        ],
    },
    stunting: {
        label: "Prevalensi Stunting",
        description: "Pendek & Sangat Pendek (TB/U atau PB/U < -2 SD) - Standar WHO",
        icon: "height",
        colorTheme: "purple",
        getColor: (pct) => {
            if (pct === null) return { bg: "bg-slate-100", text: "text-slate-400", tier: "No Data", isCritical: false };
            if (pct === 0) return { bg: "bg-slate-50", text: "text-slate-500", tier: "Nol (0%)", isCritical: false };
            if (pct < 5.0) return { bg: "bg-emerald-100 hover:bg-emerald-200", text: "text-emerald-900 font-bold", tier: "< 5% (Sangat Baik)", isCritical: false };
            if (pct < 10.0) return { bg: "bg-yellow-100 hover:bg-yellow-200", text: "text-yellow-950 font-bold", tier: "5 - 10% (Baik)", isCritical: false };
            if (pct < 15.0) return { bg: "bg-amber-200 hover:bg-amber-300", text: "text-amber-950 font-bold", tier: "10 - 15% (Sedang)", isCritical: false };
            if (pct < 20.0) return { bg: "bg-rose-500 hover:bg-rose-600", text: "text-white font-extrabold", tier: "15 - 20% (Tinggi)", isCritical: true };
            return { bg: "bg-red-800 hover:bg-red-900", text: "text-white font-black", tier: "≥ 20% (Sangat Tinggi)", isCritical: true };
        },
        legendTiers: [
            { label: "< 5%", color: "#d1fae5", textColor: "#065f46", note: "Sangat Baik" },
            { label: "5 - 10%", color: "#fef9c3", textColor: "#713f12", note: "Baik" },
            { label: "10 - 15%", color: "#fde68a", textColor: "#78350f", note: "Sedang" },
            { label: "15 - 20%", color: "#f43f5e", textColor: "#ffffff", note: "Tinggi" },
            { label: "≥ 20%", color: "#991b1b", textColor: "#ffffff", note: "Sangat Tinggi" },
        ],
    },
    wasting: {
        label: "Prevalensi Wasting",
        description: "Gizi Kurang & Buruk (BB/TB atau BB/PB < -2 SD) - Standar WHO",
        icon: "trending_down",
        colorTheme: "amber",
        getColor: (pct) => {
            if (pct === null) return { bg: "bg-slate-100", text: "text-slate-400", tier: "No Data", isCritical: false };
            if (pct === 0) return { bg: "bg-slate-50", text: "text-slate-500", tier: "Nol (0%)", isCritical: false };
            if (pct < 3.0) return { bg: "bg-emerald-100 hover:bg-emerald-200", text: "text-emerald-900 font-bold", tier: "< 3% (Sangat Baik)", isCritical: false };
            if (pct < 5.0) return { bg: "bg-yellow-100 hover:bg-yellow-200", text: "text-yellow-950 font-bold", tier: "3 - 5% (Baik)", isCritical: false };
            if (pct < 10.0) return { bg: "bg-amber-200 hover:bg-amber-300", text: "text-amber-950 font-bold", tier: "5 - 10% (Sedang)", isCritical: false };
            if (pct < 15.0) return { bg: "bg-rose-500 hover:bg-rose-600", text: "text-white font-extrabold", tier: "10 - 15% (Tinggi)", isCritical: true };
            return { bg: "bg-red-800 hover:bg-red-900", text: "text-white font-black", tier: "≥ 15% (Sangat Tinggi)", isCritical: true };
        },
        legendTiers: [
            { label: "< 3%", color: "#d1fae5", textColor: "#065f46", note: "Sangat Baik" },
            { label: "3 - 5%", color: "#fef9c3", textColor: "#713f12", note: "Baik" },
            { label: "5 - 10%", color: "#fde68a", textColor: "#78350f", note: "Sedang" },
            { label: "10 - 15%", color: "#f43f5e", textColor: "#ffffff", note: "Tinggi" },
            { label: "≥ 15%", color: "#991b1b", textColor: "#ffffff", note: "Sangat Tinggi" },
        ],
    },
    underweight: {
        label: "Prevalensi Underweight",
        description: "Berat Badan Kurang & Sangat Kurang (BB/U < -2 SD)",
        icon: "scale",
        colorTheme: "blue",
        getColor: (pct) => {
            if (pct === null) return { bg: "bg-slate-100", text: "text-slate-400", tier: "No Data", isCritical: false };
            if (pct === 0) return { bg: "bg-slate-50", text: "text-slate-500", tier: "Nol (0%)", isCritical: false };
            if (pct < 5.0) return { bg: "bg-emerald-100 hover:bg-emerald-200", text: "text-emerald-900 font-bold", tier: "< 5% (Sangat Baik)", isCritical: false };
            if (pct < 10.0) return { bg: "bg-yellow-100 hover:bg-yellow-200", text: "text-yellow-950 font-bold", tier: "5 - 10% (Baik)", isCritical: false };
            if (pct < 15.0) return { bg: "bg-amber-200 hover:bg-amber-300", text: "text-amber-950 font-bold", tier: "10 - 15% (Sedang)", isCritical: false };
            if (pct < 20.0) return { bg: "bg-rose-500 hover:bg-rose-600", text: "text-white font-extrabold", tier: "15 - 20% (Tinggi)", isCritical: true };
            return { bg: "bg-red-800 hover:bg-red-900", text: "text-white font-black", tier: "≥ 20% (Sangat Tinggi)", isCritical: true };
        },
        legendTiers: [
            { label: "< 5%", color: "#d1fae5", textColor: "#065f46", note: "Sangat Baik" },
            { label: "5 - 10%", color: "#fef9c3", textColor: "#713f12", note: "Baik" },
            { label: "10 - 15%", color: "#fde68a", textColor: "#78350f", note: "Sedang" },
            { label: "15 - 20%", color: "#f43f5e", textColor: "#ffffff", note: "Tinggi" },
            { label: "≥ 20%", color: "#991b1b", textColor: "#ffffff", note: "Sangat Tinggi" },
        ],
    },
    obesitas: {
        label: "Prevalensi Obesitas",
        description: "Gizi Lebih / Obesitas (BB/TB atau BB/PB > +3 SD)",
        icon: "trending_up",
        colorTheme: "indigo",
        getColor: (pct) => {
            if (pct === null) return { bg: "bg-slate-100", text: "text-slate-400", tier: "No Data", isCritical: false };
            if (pct === 0) return { bg: "bg-slate-50", text: "text-slate-500", tier: "Nol (0%)", isCritical: false };
            if (pct < 1.0) return { bg: "bg-emerald-100 hover:bg-emerald-200", text: "text-emerald-900 font-bold", tier: "< 1% (Rendah)", isCritical: false };
            if (pct < 3.0) return { bg: "bg-yellow-100 hover:bg-yellow-200", text: "text-yellow-950 font-bold", tier: "1 - 3% (Sedang)", isCritical: false };
            if (pct < 5.0) return { bg: "bg-amber-200 hover:bg-amber-300", text: "text-amber-950 font-bold", tier: "3 - 5% (Tinggi)", isCritical: false };
            if (pct < 10.0) return { bg: "bg-rose-500 hover:bg-rose-600", text: "text-white font-extrabold", tier: "5 - 10% (Sangat Tinggi)", isCritical: true };
            return { bg: "bg-red-800 hover:bg-red-900", text: "text-white font-black", tier: "≥ 10% (Ekstrem)", isCritical: true };
        },
        legendTiers: [
            { label: "< 1%", color: "#d1fae5", textColor: "#065f46", note: "Rendah" },
            { label: "1 - 3%", color: "#fef9c3", textColor: "#713f12", note: "Sedang" },
            { label: "3 - 5%", color: "#fde68a", textColor: "#78350f", note: "Tinggi" },
            { label: "5 - 10%", color: "#f43f5e", textColor: "#ffffff", note: "Sangat Tinggi" },
            { label: "≥ 10%", color: "#991b1b", textColor: "#ffffff", note: "Ekstrem" },
        ],
    },
};

export default function HeatbarMapSection({
    data,
    year,
    level,
    filterPuskesmas = "all",
}: HeatbarMapSectionProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [selectedMetric, setSelectedMetric] = useState<StatusGiziKey>("gizi_buruk");
    const [sortBy, setSortBy] = useState<"latest_desc" | "avg_desc" | "delta_spike" | "name_asc">("latest_desc");
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTooltip, setActiveTooltip] = useState<{
        entity: string;
        bulan: number;
        pct: number | null;
        numerator: number;
        denominator: number;
        tier: string;
    } | null>(null);

    // ─── Filter dataset for the selected year and optional puskesmas filter ───
    const filteredDataset = useMemo(() => {
        let res = data;
        if (year) res = res.filter((r) => r.tahun === year);
        if (level === "desa" && filterPuskesmas && filterPuskesmas !== "all") {
            res = res.filter((r) => r.puskesmas?.trim().toLowerCase() === filterPuskesmas.trim().toLowerCase());
        }
        return res;
    }, [data, year, level, filterPuskesmas]);

    // ─── Identify months that exist in the dataset ─────────────────────────────
    const availableMonths = useMemo(() => {
        const set = new Set<number>();
        filteredDataset.forEach((r) => {
            if (r.bulan >= 1 && r.bulan <= 12) set.add(r.bulan);
        });
        const list = Array.from(set).sort((a, b) => a - b);
        // Default to Jan-Des (1..12) if dataset has wide range, or existing months
        return list.length > 0 ? list : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }, [filteredDataset]);

    // ─── Build Heatbar Data per Wilayah (Puskesmas or Desa) ───────────────────
    const entityRows: EntityProgressRow[] = useMemo(() => {
        const config = STATUS_GIZI_CONFIG[selectedMetric];
        const groupMap = new Map<
            string,
            { parent?: string; months: Map<number, { numerator: number; denominator: number }> }
        >();

        filteredDataset.forEach((r) => {
            const entityName = level === "desa" ? (r.kelurahan || "Unknown Desa") : (r.puskesmas || "Unknown Puskesmas");
            if (!groupMap.has(entityName)) {
                groupMap.set(entityName, { parent: r.puskesmas, months: new Map() });
            }
            const g = groupMap.get(entityName)!;
            const b = r.bulan;
            const existing = g.months.get(b) || { numerator: 0, denominator: 0 };

            const numVal = Number(r[selectedMetric] || 0);
            const denVal = Number(r.jumlah_timbang_ukur || 0);

            existing.numerator += numVal;
            existing.denominator += denVal;
            g.months.set(b, existing);
        });

        const rows: EntityProgressRow[] = [];

        groupMap.forEach((entry, name) => {
            const monthsRecord: Record<number, MonthlyStat> = {};
            let sumPct = 0;
            let countValidMonths = 0;
            let latestBulan: number | null = null;
            let latestPct: number | null = null;
            let prevPct: number | null = null;
            let persistentRiskCount = 0;

            for (let m = 1; m <= 12; m++) {
                const stat = entry.months.get(m);
                if (stat && stat.denominator > 0) {
                    const pctVal = (stat.numerator / stat.denominator) * 100;
                    monthsRecord[m] = {
                        bulan: m,
                        numerator: stat.numerator,
                        denominator: stat.denominator,
                        pct: pctVal,
                    };
                    sumPct += pctVal;
                    countValidMonths++;

                    // check critical tier
                    const colorInfo = config.getColor(pctVal);
                    if (colorInfo.isCritical) persistentRiskCount++;

                    // track latest and previous for MoM
                    if (latestBulan === null || m > latestBulan) {
                        prevPct = latestPct;
                        latestPct = pctVal;
                        latestBulan = m;
                    }
                } else {
                    monthsRecord[m] = {
                        bulan: m,
                        numerator: stat?.numerator || 0,
                        denominator: stat?.denominator || 0,
                        pct: null,
                    };
                }
            }

            const avgPct = countValidMonths > 0 ? sumPct / countValidMonths : 0;
            const deltaMoM = (latestPct !== null && prevPct !== null) ? (latestPct - prevPct) : null;

            rows.push({
                name,
                parent: entry.parent,
                months: monthsRecord,
                avgPct,
                latestPct,
                latestMonth: latestBulan,
                prevPct,
                deltaMoM,
                persistentRiskCount,
                hasData: countValidMonths > 0,
            });
        });

        // ─── Filter & Sort rows ───
        let processed = rows;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            processed = processed.filter((r) => r.name.toLowerCase().includes(q) || (r.parent && r.parent.toLowerCase().includes(q)));
        }

        processed.sort((a, b) => {
            if (sortBy === "latest_desc") {
                const aVal = a.latestPct ?? -1;
                const bVal = b.latestPct ?? -1;
                return bVal - aVal;
            }
            if (sortBy === "avg_desc") {
                return b.avgPct - a.avgPct;
            }
            if (sortBy === "delta_spike") {
                const aDelta = a.deltaMoM ?? -999;
                const bDelta = b.deltaMoM ?? -999;
                return bDelta - aDelta; // highest positive increase first
            }
            // name_asc
            return a.name.localeCompare(b.name);
        });

        return processed;
    }, [filteredDataset, selectedMetric, level, searchQuery, sortBy]);

    // ─── Automated Data Scientific Insights ────────────────────────────────────
    const insights = useMemo(() => {
        const rowsWithData = entityRows.filter((r) => r.hasData);
        if (rowsWithData.length === 0) return null;

        // 1. Top Hotspots (highest current/latest month prevalence)
        const sortedByLatest = [...rowsWithData]
            .filter((r) => r.latestPct !== null)
            .sort((a, b) => (b.latestPct || 0) - (a.latestPct || 0));
        const topHotspots = sortedByLatest.slice(0, 3);

        // 2. Highest Spikes (greatest positive delta MoM)
        const sortedBySpike = [...rowsWithData]
            .filter((r) => r.deltaMoM !== null && r.deltaMoM > 0)
            .sort((a, b) => (b.deltaMoM || 0) - (a.deltaMoM || 0));
        const topSpike = sortedBySpike[0] || null;

        // 3. Best Improvers (greatest negative delta MoM)
        const sortedByImprovement = [...rowsWithData]
            .filter((r) => r.deltaMoM !== null && r.deltaMoM < 0)
            .sort((a, b) => (a.deltaMoM || 0) - (b.deltaMoM || 0));
        const bestImprover = sortedByImprovement[0] || null;

        // 4. Persistent Red Zones (high burden in >= 3 months)
        const persistentZones = rowsWithData.filter((r) => r.persistentRiskCount >= 3);

        // Overall District/Level average
        const totalAvg = rowsWithData.reduce((acc, r) => acc + r.avgPct, 0) / rowsWithData.length;

        return {
            totalEntities: rowsWithData.length,
            topHotspots,
            topSpike,
            bestImprover,
            persistentZonesCount: persistentZones.length,
            totalAvg,
        };
    }, [entityRows]);

    // ─── Export Excel Function ────────────────────────────────────────────────
    const handleExportExcel = useCallback(() => {
        const metricConf = STATUS_GIZI_CONFIG[selectedMetric];
        const rows = entityRows.map((r, i) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const obj: Record<string, any> = {
                No: i + 1,
                Wilayah: r.name,
            };
            if (level === "desa") {
                obj["Puskesmas"] = r.parent || "";
            }

            // Month columns with both % and counts
            availableMonths.forEach((m) => {
                const stat = r.months[m];
                obj[`${MONTH_NAMES[m]} (%)`] = stat?.pct !== null ? Number(stat.pct.toFixed(2)) : "";
                obj[`${MONTH_NAMES[m]} (Kasus)`] = stat?.numerator || 0;
                obj[`${MONTH_NAMES[m]} (Terukur)`] = stat?.denominator || 0;
            });

            obj["Rata-rata Tahunan (%)"] = Number(r.avgPct.toFixed(2));
            obj["Bulan Mutakhir (%)"] = r.latestPct !== null ? Number(r.latestPct.toFixed(2)) : "";
            obj["Tren MoM (Δ%)"] = r.deltaMoM !== null ? Number(r.deltaMoM.toFixed(2)) : "";

            return obj;
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Heatbar Matriks");
        const fileName = `Heatbar_Tren_${selectedMetric}_${level}_${year || "all"}.xlsx`;
        XLSX.writeFile(wb, fileName);
    }, [entityRows, selectedMetric, level, year, availableMonths]);

    const activeConfig = STATUS_GIZI_CONFIG[selectedMetric];

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden w-full transition-all">
            {/* ─── Hero Banner Header ────────────────────────────────────────── */}
            <div
                className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white cursor-pointer select-none"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 p-0.5 shadow-lg shadow-rose-900/40 shrink-0 flex items-center justify-center">
                            <div className="w-full h-full bg-slate-950/40 rounded-[14px] flex items-center justify-center backdrop-blur-sm">
                                <span className="material-icons-round text-2xl text-amber-300">
                                    grid_view
                                </span>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase font-mono">
                                    TEMPORAL PROGRESS & HEATBAR MATRIX
                                </span>
                                <span className="text-xs text-slate-400 font-medium">
                                    • Level {level === "puskesmas" ? "Puskesmas" : "Kelurahan / Desa"} ({year || "2026"})
                                </span>
                            </div>
                            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
                                Heatbar Map Progres Prevalensi Status Gizi
                            </h2>
                            <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
                                Matriks degradasi warna temporal untuk mendeteksi wilayah hotspot kritis, anomali lonjakan kasus, dan progres perbaikan status gizi per periode waktu.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                        {!isExpanded && insights && (
                            <div className="hidden sm:flex items-center gap-2 mr-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 text-rose-300 text-xs font-bold border border-slate-700">
                                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                    Top Hotspot: {insights.topHotspots[0]?.name || "-"} ({insights.topHotspots[0]?.latestPct?.toFixed(1) || "0"}%)
                                </span>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                                isExpanded
                                    ? "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
                                    : "bg-gradient-to-r from-amber-500 to-rose-600 text-white hover:brightness-110 shadow-rose-900/50"
                            }`}
                        >
                            <span>{isExpanded ? "Tutup Heatbar" : "Buka Analisis Heatbar"}</span>
                            <span className={`material-icons-round text-base transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                                expand_more
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Collapsible Body Container ────────────────────────────────── */}
            {isExpanded && (
                <div className="p-6 space-y-6">
                    {/* Control Bar: Metric Dropdown, Sorting, Search, and Export */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Status Gizi Dropdown Selector */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5 shrink-0">
                                <span className="material-icons-round text-rose-600 text-base">tune</span>
                                Indikator Gizi:
                            </label>
                            <select
                                value={selectedMetric}
                                onChange={(e) => setSelectedMetric(e.target.value as StatusGiziKey)}
                                className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all cursor-pointer"
                            >
                                {(Object.keys(STATUS_GIZI_CONFIG) as StatusGiziKey[]).map((key) => (
                                    <option key={key} value={key}>
                                        {STATUS_GIZI_CONFIG[key].label}
                                    </option>
                                ))}
                            </select>
                            <span className="text-[11px] text-slate-500 italic hidden xl:inline">
                                ({activeConfig.description})
                            </span>
                        </div>

                        {/* Search, Sort, and Excel Button */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Search box */}
                            <div className="relative">
                                <span className="material-icons-round text-slate-400 text-sm absolute left-3 top-2.5">
                                    search
                                </span>
                                <input
                                    type="text"
                                    placeholder={`Cari nama ${level === "puskesmas" ? "puskesmas" : "desa"}...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 w-44 sm:w-52 transition-all font-medium"
                                />
                            </div>

                            {/* Sorting */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
                            >
                                <option value="latest_desc">Urutkan: Prevalensi Mutakhir Tertinggi</option>
                                <option value="avg_desc">Urutkan: Rata-rata Tahunan Tertinggi</option>
                                <option value="delta_spike">Urutkan: Lonjakan MoM Terbesar (Δ% Naik)</option>
                                <option value="name_asc">Urutkan: Nama Wilayah (A-Z)</option>
                            </select>

                            {/* Export Excel Button */}
                            <button
                                onClick={handleExportExcel}
                                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-all shadow-sm active:scale-95"
                                title="Download Data Matriks ke Excel (.xlsx)"
                            >
                                <span className="material-icons-round text-sm">table_view</span>
                                Excel
                            </button>
                        </div>
                    </div>

                    {/* ─── Data Scientific Insights Cards ────────────────────────────── */}
                    {insights && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Card 1: Top Hotspot */}
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-red-50 to-rose-100/60 border border-red-200/80 shadow-sm relative overflow-hidden">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-red-700 font-mono flex items-center gap-1">
                                        <span className="material-icons-round text-red-600 text-base">local_fire_department</span>
                                        Top Hotspot Mutakhir
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-red-600 text-white font-black text-[10px] font-mono">
                                        BULAN TERAKHIR
                                    </span>
                                </div>
                                <div className="space-y-1.5 mt-2">
                                    {insights.topHotspots.map((h, idx) => (
                                        <div key={h.name} className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-slate-800 truncate max-w-[130px]" title={h.name}>
                                                {idx + 1}. {h.name}
                                            </span>
                                            <span className="font-mono font-extrabold text-red-700 bg-red-100/80 px-1.5 py-0.5 rounded">
                                                {h.latestPct !== null ? `${h.latestPct.toFixed(2)}%` : "-"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Card 2: Highest Spike Alert */}
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100/60 border border-amber-200/80 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 font-mono flex items-center gap-1">
                                        <span className="material-icons-round text-amber-600 text-base">trending_up</span>
                                        Lonjakan Terbesar (MoM)
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-black text-[10px] font-mono">
                                        SPIKE ALARM
                                    </span>
                                </div>
                                {insights.topSpike ? (
                                    <div className="mt-2">
                                        <p className="font-extrabold text-slate-900 text-sm truncate" title={insights.topSpike.name}>
                                            {insights.topSpike.name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xl font-black text-rose-700 font-mono">
                                                +{insights.topSpike.deltaMoM?.toFixed(2)}%
                                            </span>
                                            <span className="text-[11px] text-slate-600">
                                                dari {insights.topSpike.prevPct?.toFixed(2)}% ke {insights.topSpike.latestPct?.toFixed(2)}%
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-amber-800 font-medium mt-1">
                                            Perlu validasi data entry atau audit intervensi lapangan.
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 mt-3">Tidak terdeteksi lonjakan ekstrem.</p>
                                )}
                            </div>

                            {/* Card 3: Best Improvement */}
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100/60 border border-emerald-200/80 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 font-mono flex items-center gap-1">
                                        <span className="material-icons-round text-emerald-600 text-base">verified</span>
                                        Penurunan Terbaik (MoM)
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-black text-[10px] font-mono">
                                        IMPROVEMENT
                                    </span>
                                </div>
                                {insights.bestImprover ? (
                                    <div className="mt-2">
                                        <p className="font-extrabold text-slate-900 text-sm truncate" title={insights.bestImprover.name}>
                                            {insights.bestImprover.name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xl font-black text-emerald-700 font-mono">
                                                {insights.bestImprover.deltaMoM?.toFixed(2)}%
                                            </span>
                                            <span className="text-[11px] text-slate-600">
                                                dari {insights.bestImprover.prevPct?.toFixed(2)}% ke {insights.bestImprover.latestPct?.toFixed(2)}%
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-emerald-800 font-medium mt-1">
                                            Progres intervensi gizi efektif menurunkan prevalensi.
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 mt-3">Belum ada data penurunan MoM.</p>
                                )}
                            </div>

                            {/* Card 4: Persistent Vulnerability */}
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-100/60 border border-purple-200/80 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-indigo-900 font-mono flex items-center gap-1">
                                        <span className="material-icons-round text-indigo-600 text-base">history_toggle_off</span>
                                        Zona Merah Menahun
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-black text-[10px] font-mono">
                                        CHRONIC RISK
                                    </span>
                                </div>
                                <div className="mt-2">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-indigo-950 font-mono">
                                            {insights.persistentZonesCount}
                                        </span>
                                        <span className="text-xs font-bold text-indigo-800">
                                            {level === "puskesmas" ? "Puskesmas" : "Desa/Kelurahan"}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                                        Berada di tier berisiko/kritis selama 3 bulan atau lebih sepanjang tahun {year || "2026"}.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── Legend Scale Bar ────────────────────────────────────────── */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-slate-600 font-mono text-[11px]">
                            <span className="material-icons-round text-sm text-slate-500">palette</span>
                            KETERANGAN DEGRADASI WARNA ({activeConfig.label}):
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {activeConfig.legendTiers.map((tier) => (
                                <div key={tier.label} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200/80 shadow-2xs">
                                    <span
                                        className="w-3.5 h-3.5 rounded-sm inline-block border border-slate-300/60"
                                        style={{ backgroundColor: tier.color }}
                                    ></span>
                                    <span className="font-mono font-bold text-[11px]" style={{ color: tier.textColor === "#ffffff" ? "#0f172a" : tier.textColor }}>
                                        {tier.label}
                                    </span>
                                    <span className="text-[10px] text-slate-400">({tier.note})</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ─── Heatbar Matrix Table ────────────────────────────────────── */}
                    {entityRows.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
                            <span className="material-icons-round text-4xl text-slate-300 mb-2 block">search_off</span>
                            <p className="text-sm font-bold text-slate-600">Tidak ada data yang sesuai filter</p>
                            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter wilayah.</p>
                        </div>
                    ) : (
                        <div className="relative border border-slate-200 rounded-2xl shadow-sm overflow-hidden bg-white">
                            <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
                                <table className="w-full text-xs border-collapse">
                                    <thead className="sticky top-0 z-20 bg-slate-100 text-slate-700 shadow-xs border-b border-slate-200">
                                        <tr>
                                            {/* Sticky Wilayah Header */}
                                            <th className="px-4 py-3 text-left font-black uppercase tracking-wider font-mono sticky left-0 z-30 bg-slate-100 border-r border-slate-200 min-w-[200px]">
                                                {level === "puskesmas" ? "Puskesmas" : "Kelurahan / Desa"}
                                                <span className="text-[10px] text-slate-400 font-normal ml-1">({entityRows.length})</span>
                                            </th>

                                            {/* Months Header with percentage label prompt */}
                                            {availableMonths.map((m) => (
                                                <th
                                                    key={m}
                                                    className="px-2 py-2.5 text-center font-black uppercase tracking-wider font-mono min-w-[68px] border-r border-slate-200/80"
                                                >
                                                    <div>{MONTH_NAMES[m]}</div>
                                                    <div className="text-[9px] text-slate-400 font-normal font-sans tracking-normal">
                                                        % Prevalensi
                                                    </div>
                                                </th>
                                            ))}

                                            {/* Aggregated columns */}
                                            <th className="px-3 py-2.5 text-center font-black uppercase tracking-wider font-mono min-w-[80px] bg-slate-200/80 border-r border-slate-300">
                                                Rerata
                                                <div className="text-[9px] text-slate-500 font-normal font-sans">Tahunan</div>
                                            </th>
                                            <th className="px-3 py-2.5 text-center font-black uppercase tracking-wider font-mono min-w-[85px] bg-slate-200/80">
                                                Tren MoM
                                                <div className="text-[9px] text-slate-500 font-normal font-sans">Δ Mutakhir</div>
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                        {entityRows.map((row, idx) => (
                                            <tr
                                                key={row.name}
                                                className={`transition-colors hover:bg-indigo-50/20 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                                            >
                                                {/* Sticky Entity Name Column */}
                                                <td className="px-4 py-2 font-bold text-slate-800 sticky left-0 z-10 bg-inherit border-r border-slate-200 truncate max-w-[220px]" title={row.name}>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] text-slate-400 font-mono w-5">
                                                            {idx + 1}.
                                                        </span>
                                                        <span className="truncate">{row.name}</span>
                                                    </div>
                                                    {level === "desa" && row.parent && (
                                                        <span className="text-[9px] text-slate-400 font-normal block pl-6 truncate">
                                                            Pusk: {row.parent}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Month Heatbar Cells with Direct Percentage Label */}
                                                {availableMonths.map((m) => {
                                                    const stat = row.months[m];
                                                    const pct = stat?.pct ?? null;
                                                    const color = activeConfig.getColor(pct);

                                                    return (
                                                        <td
                                                            key={m}
                                                            onMouseEnter={() => {
                                                                setActiveTooltip({
                                                                    entity: row.name,
                                                                    bulan: m,
                                                                    pct,
                                                                    numerator: stat?.numerator || 0,
                                                                    denominator: stat?.denominator || 0,
                                                                    tier: color.tier,
                                                                });
                                                            }}
                                                            onMouseLeave={() => setActiveTooltip(null)}
                                                            className="p-1 border-r border-slate-200/60 text-center"
                                                        >
                                                            <div
                                                                className={`w-full py-1.5 px-0.5 rounded-md transition-all shadow-2xs cursor-pointer flex flex-col items-center justify-center ${color.bg}`}
                                                            >
                                                                <span className={`text-[11px] font-mono leading-tight ${color.text}`}>
                                                                    {pct !== null ? `${pct.toFixed(2).replace(".", ",")}%` : "—"}
                                                                </span>
                                                                {pct !== null && stat && stat.numerator > 0 && (
                                                                    <span className="text-[9px] opacity-75 font-mono leading-none mt-0.5">
                                                                        {stat.numerator}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}

                                                {/* Average Column */}
                                                <td className="px-3 py-2 text-center font-mono font-bold text-slate-800 bg-slate-50/80 border-r border-slate-200">
                                                    {row.hasData ? (
                                                        <span className="px-2 py-0.5 rounded bg-slate-200/70 text-slate-800">
                                                            {row.avgPct.toFixed(2).replace(".", ",")}%
                                                        </span>
                                                    ) : (
                                                        "—"
                                                    )}
                                                </td>

                                                {/* MoM Delta Column */}
                                                <td className="px-3 py-2 text-center font-mono font-extrabold bg-slate-50/80">
                                                    {row.deltaMoM !== null ? (
                                                        <span
                                                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] ${
                                                                row.deltaMoM > 0
                                                                    ? "bg-rose-100 text-rose-800"
                                                                    : row.deltaMoM < 0
                                                                    ? "bg-emerald-100 text-emerald-800"
                                                                    : "bg-slate-100 text-slate-600"
                                                            }`}
                                                        >
                                                            {row.deltaMoM > 0 ? "▲ +" : row.deltaMoM < 0 ? "▼ " : ""}
                                                            {row.deltaMoM.toFixed(2).replace(".", ",")}%
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 font-normal">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Floating Active Tooltip Info Bar */}
                            {activeTooltip && (
                                <div className="p-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4 text-xs font-mono border-t border-slate-800 shadow-xl">
                                    <div className="flex items-center gap-2">
                                        <span className="material-icons-round text-amber-400 text-base">place</span>
                                        <span className="font-extrabold text-amber-300 font-sans">{activeTooltip.entity}</span>
                                        <span className="text-slate-400">• Bulan {MONTH_FULL_NAMES[activeTooltip.bulan]} {year || "2026"}</span>
                                    </div>
                                    <div className="flex items-center gap-4 flex-wrap">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-slate-400">{activeConfig.label}:</span>
                                            <span className="font-black text-rose-400 text-sm">
                                                {activeTooltip.pct !== null ? `${activeTooltip.pct.toFixed(2).replace(".", ",")}%` : "Tidak Ada Data"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-slate-400">Kasus:</span>
                                            <span className="font-bold text-white">{activeTooltip.numerator} Balita</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-slate-400">Terukur:</span>
                                            <span className="font-bold text-white">{activeTooltip.denominator} Balita</span>
                                        </div>
                                        <div className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300 border border-slate-700">
                                            Tier: {activeTooltip.tier}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
