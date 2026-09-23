"use client";

import React, { useState, useMemo } from "react";
import {
    RemajaPutriRawRecord,
    RemajaPutriIndicatorKey,
    REMAJA_PUTRI_INDICATOR_DEFINITIONS,
    filterRemajaPutriRecords,
    aggregateByPuskesmas,
    aggregateByDesa,
    calculateKabupatenTotals,
    AggregatedRemajaPutri,
    formatPercent,
    formatNumber
} from "@/lib/remajaPutriHelper";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    Legend,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell,
    ReferenceLine
} from "recharts";
import {
    Info,
    ChevronDown,
    ChevronUp,
    Download,
    Search,
    CheckCircle2,
    AlertCircle,
    Award,
    Activity,
    Layers
} from "lucide-react";
import * as XLSX from "xlsx";

interface RemajaPutriOverviewProps {
    allRecords: RemajaPutriRawRecord[];
    refPuskesmas: { id: string; name: string }[];
    refDesa: { id: string; name: string; puskesmas_id: string }[];
    year: string;
    setYear: (y: string) => void;
    mode: "bulanan" | "triwulan" | "tahun_ajaran";
    setMode: (m: "bulanan" | "triwulan" | "tahun_ajaran") => void;
    periodVal: number;
    setPeriodVal: (p: number) => void;
    selectedPuskesmas: string;
    setSelectedPuskesmas: (p: string) => void;
    selectedKelurahan: string;
    setSelectedKelurahan: (k: string) => void;
}

export default function RemajaPutriOverview({
    allRecords,
    refPuskesmas,
    refDesa,
    year,
    setYear,
    mode,
    setMode,
    periodVal,
    setPeriodVal,
    selectedPuskesmas,
    setSelectedPuskesmas,
    selectedKelurahan,
    setSelectedKelurahan
}: RemajaPutriOverviewProps) {
    const [showDefinitions, setShowDefinitions] = useState(false);
    const [activeChartIndicator, setActiveChartIndicator] = useState<RemajaPutriIndicatorKey>("pct_ttd_consumed");
    const [sortAscending, setSortAscending] = useState(false);
    const [tableSearch, setTableSearch] = useState("");
    const [tablePage, setTablePage] = useState(1);
    const pageSize = 10;

    const isDesaLevel = selectedPuskesmas !== "ALL";

    // Current period filtered raw records (with strict academic year segregation)
    const currentPeriodRecords = useMemo(() => {
        return filterRemajaPutriRecords(
            allRecords,
            mode,
            periodVal,
            year,
            "ALL",
            "ALL"
        );
    }, [allRecords, mode, periodVal, year]);

    // Active records filtered by Puskesmas and Kelurahan selection
    const activeRecords = useMemo(() => {
        let recs = currentPeriodRecords;
        if (selectedPuskesmas !== "ALL") {
            recs = recs.filter((r) => r.puskesmas.toLowerCase().trim() === selectedPuskesmas.toLowerCase().trim());
        }
        if (selectedKelurahan !== "ALL") {
            recs = recs.filter((r) => r.kelurahan.toLowerCase().trim() === selectedKelurahan.toLowerCase().trim());
        }
        return recs;
    }, [currentPeriodRecords, selectedPuskesmas, selectedKelurahan]);

    // Summary totals for selected scope
    const currentTotals = useMemo(() => {
        return calculateKabupatenTotals(activeRecords);
    }, [activeRecords]);

    // Breakdown rows: per Desa if a Puskesmas is selected, per Puskesmas if ALL
    const activeBreakdownRows = useMemo(() => {
        if (isDesaLevel) {
            return aggregateByDesa(currentPeriodRecords, selectedPuskesmas);
        } else {
            return aggregateByPuskesmas(currentPeriodRecords);
        }
    }, [currentPeriodRecords, isDesaLevel, selectedPuskesmas]);

    // Chart Data per Puskesmas or Desa for activeChartIndicator
    const chartData = useMemo(() => {
        const def = REMAJA_PUTRI_INDICATOR_DEFINITIONS[activeChartIndicator];
        const rows = activeBreakdownRows.map((r) => {
            const val = r[activeChartIndicator] as number;
            let numerator = 0;
            let denominator = 0;

            if (activeChartIndicator === "pct_ttd_consumed") {
                numerator = r.ttd_consumed_standard;
                denominator = r.target_rematri;
            } else if (activeChartIndicator === "pct_screening_anemia") {
                numerator = r.screened_grade7_10;
                denominator = r.target_grade7_10;
            } else if (activeChartIndicator === "pct_anemia") {
                numerator = r.anemia_total;
                denominator = r.screened_grade7_10;
            } else if (activeChartIndicator === "pct_anemia_treated") {
                numerator = r.anemia_treated;
                denominator = r.anemia_total;
            } else if (activeChartIndicator === "pct_ttd_received") {
                numerator = r.ttd_received_standard;
                denominator = r.target_rematri;
            }

            const target = def.target ?? 0;
            const isMet = def.direction === "lower" ? val <= target : val >= target;

            return {
                name: r.entity_name,
                puskesmas: r.puskesmas || r.entity_name,
                value: Math.round(val * 10) / 10,
                numerator,
                denominator,
                isMet,
                target: def.target
            };
        });

        return rows.sort((a, b) => (sortAscending ? a.value - b.value : b.value - a.value));
    }, [activeBreakdownRows, activeChartIndicator, sortAscending]);

    // Ranking Stats & Distribution
    const rankingStats = useMemo(() => {
        const def = REMAJA_PUTRI_INDICATOR_DEFINITIONS[activeChartIndicator];
        if (chartData.length === 0) return null;

        const values = chartData.map((r) => r.value).sort((a, b) => a - b);
        const minVal = values[0];
        const maxVal = values[values.length - 1];
        const medianVal = values[Math.floor(values.length / 2)];
        const avgUnits = Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
        const parentVal = Math.round((currentTotals[activeChartIndicator] as number) * 10) / 10;

        const sortedByPerformance = [...chartData].sort((a, b) =>
            def.direction === "lower" ? a.value - b.value : b.value - a.value
        );

        const bestThree = sortedByPerformance.slice(0, 3);
        const worstThree = sortedByPerformance.slice(-3).reverse();

        return {
            minVal,
            maxVal,
            medianVal,
            avgUnits,
            parentVal,
            bestThree,
            worstThree,
            direction: def.direction,
            isDesaLevel
        };
    }, [chartData, activeChartIndicator, currentTotals, isDesaLevel]);

    // Multi-line Temporal Trend data across months or quarters for 4 Program Utama
    const trendData = useMemo(() => {
        const points: {
            name: string;
            konsumsi: number;
            skrining: number;
            anemia: number;
            tatalaksana: number;
        }[] = [];

        if (mode === "bulanan") {
            const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
            const mNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
            months.forEach((m, idx) => {
                const mRecs = filterRemajaPutriRecords(allRecords, "bulanan", m, year, "ALL", "ALL");
                const scoped = selectedPuskesmas === "ALL"
                    ? mRecs
                    : mRecs.filter((r) => r.puskesmas.toLowerCase().trim() === selectedPuskesmas.toLowerCase().trim());
                const totals = calculateKabupatenTotals(scoped);
                points.push({
                    name: mNames[idx],
                    konsumsi: Math.round(totals.pct_ttd_consumed * 10) / 10,
                    skrining: Math.round(totals.pct_screening_anemia * 10) / 10,
                    anemia: Math.round(totals.pct_anemia * 10) / 10,
                    tatalaksana: Math.round(totals.pct_anemia_treated * 10) / 10,
                });
            });
        } else if (mode === "triwulan") {
            const quarters = [1, 2, 3, 4];
            const qNames = ["TW I", "TW II", "TW III", "TW IV"];
            quarters.forEach((q, idx) => {
                const qRecs = filterRemajaPutriRecords(allRecords, "triwulan", q, year, "ALL", "ALL");
                const scoped = selectedPuskesmas === "ALL"
                    ? qRecs
                    : qRecs.filter((r) => r.puskesmas.toLowerCase().trim() === selectedPuskesmas.toLowerCase().trim());
                const totals = calculateKabupatenTotals(scoped);
                points.push({
                    name: qNames[idx],
                    konsumsi: Math.round(totals.pct_ttd_consumed * 10) / 10,
                    skrining: Math.round(totals.pct_screening_anemia * 10) / 10,
                    anemia: Math.round(totals.pct_anemia * 10) / 10,
                    tatalaksana: Math.round(totals.pct_anemia_treated * 10) / 10,
                });
            });
        } else {
            const semesters = [1, 2];
            const sNames = ["Semester Ganjil", "Semester Genap"];
            semesters.forEach((s, idx) => {
                const sRecs = filterRemajaPutriRecords(allRecords, "tahun_ajaran", s, year, "ALL", "ALL");
                const scoped = selectedPuskesmas === "ALL"
                    ? sRecs
                    : sRecs.filter((r) => r.puskesmas.toLowerCase().trim() === selectedPuskesmas.toLowerCase().trim());
                const totals = calculateKabupatenTotals(scoped);
                points.push({
                    name: sNames[idx],
                    konsumsi: Math.round(totals.pct_ttd_consumed * 10) / 10,
                    skrining: Math.round(totals.pct_screening_anemia * 10) / 10,
                    anemia: Math.round(totals.pct_anemia * 10) / 10,
                    tatalaksana: Math.round(totals.pct_anemia_treated * 10) / 10,
                });
            });
        }

        return points;
    }, [allRecords, mode, year, selectedPuskesmas]);

    // Export to Excel / CSV
    const handleExport = (format: "xlsx" | "csv") => {
        const rows = activeBreakdownRows.map((r, idx) => {
            const baseRow: Record<string, any> = {
                No: idx + 1,
                [isDesaLevel ? "Desa / Kelurahan" : "Puskesmas"]: r.entity_name,
            };
            if (isDesaLevel) {
                baseRow["Puskesmas Induk"] = r.puskesmas;
            }
            baseRow["Sasaran Remaja Putri"] = r.target_rematri;
            baseRow["% Konsumsi TTD"] = `${formatPercent(r.pct_ttd_consumed)} (${r.ttd_consumed_standard}/${r.target_rematri})`;
            baseRow["% Mendapat TTD"] = `${formatPercent(r.pct_ttd_received)} (${r.ttd_received_standard}/${r.target_rematri})`;
            baseRow["% Skrining Kls 7 & 10"] = `${formatPercent(r.pct_screening_anemia)} (${r.screened_grade7_10}/${r.target_grade7_10})`;
            baseRow["% Skrining Kls 7"] = `${formatPercent(r.pct_screening_grade7)} (${r.screened_grade7}/${r.target_grade7})`;
            baseRow["% Skrining Kls 10"] = `${formatPercent(r.pct_screening_grade10)} (${r.screened_grade10}/${r.target_grade10})`;
            baseRow["% Anemia (Prevalensi)"] = `${formatPercent(r.pct_anemia)} (${r.anemia_total}/${r.screened_grade7_10})`;
            baseRow["% Anemia Kls 7"] = `${formatPercent(r.pct_anemia_grade7)} (${r.anemia_grade7_total}/${r.screened_grade7})`;
            baseRow["% Anemia Kls 10"] = `${formatPercent(r.pct_anemia_grade10)} (${r.anemia_grade10_total}/${r.screened_grade10})`;
            baseRow["% Tatalaksana Anemia"] = `${formatPercent(r.pct_anemia_treated)} (${r.anemia_treated}/${r.anemia_total})`;
            return baseRow;
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        const sheetTitle = isDesaLevel ? `Rekap Desa ${selectedPuskesmas.slice(0, 15)}` : "Rekap Puskesmas";
        XLSX.utils.book_append_sheet(wb, ws, sheetTitle);

        const filePrefix = isDesaLevel
            ? `Rekap_Remaja_Putri_Desa_${selectedPuskesmas}_${year}_${mode}_${periodVal}`
            : `Rekap_Remaja_Putri_Puskesmas_${year}_${mode}_${periodVal}`;

        if (format === "xlsx") {
            XLSX.writeFile(wb, `${filePrefix}.xlsx`);
        } else {
            XLSX.writeFile(wb, `${filePrefix}.csv`, { bookType: "csv" });
        }
    };

    // Table search and pagination
    const filteredTableRows = useMemo(() => {
        if (!tableSearch.trim()) return activeBreakdownRows;
        return activeBreakdownRows.filter((r) =>
            r.entity_name.toLowerCase().includes(tableSearch.toLowerCase().trim())
        );
    }, [activeBreakdownRows, tableSearch]);

    const paginatedTable = useMemo(() => {
        const start = (tablePage - 1) * pageSize;
        return filteredTableRows.slice(start, start + pageSize);
    }, [filteredTableRows, tablePage]);

    const totalPages = Math.ceil(filteredTableRows.length / pageSize) || 1;

    // 4 Core Program Indicators definitions list
    const coreProgramIndicators: RemajaPutriIndicatorKey[] = [
        "pct_ttd_consumed",
        "pct_screening_anemia",
        "pct_anemia",
        "pct_anemia_treated"
    ];

    return (
        <div className="space-y-6">
            {/* Header Description & Definitions Toggle */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-black text-slate-900 tracking-tight">
                                Ringkasan Program Remaja Putri (Rematri) 2026
                            </h2>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200">
                                SIGIZI 2026
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Pemantauan 4 Indikator Utama Program, cakupan suplementasi TTD, skrining kadar Hb, tingkat keparahan anemia, dan penatalaksanaan siswi SMP & SMA.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowDefinitions(!showDefinitions)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-pink-700 bg-pink-50 hover:bg-pink-100 rounded-xl border border-pink-200 transition-colors self-start md:self-auto"
                    >
                        <Info className="w-3.5 h-3.5" />
                        <span>{showDefinitions ? "Tutup Definisi Operasional" : "Definisi Operasional & Formula"}</span>
                        {showDefinitions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                </div>

                {showDefinitions && (
                    <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-200">
                        {coreProgramIndicators.map((k) => {
                            const ind = REMAJA_PUTRI_INDICATOR_DEFINITIONS[k];
                            return (
                                <div key={k} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                                    <div className="flex items-start justify-between gap-1">
                                        <h4 className="text-xs font-bold text-slate-800">{ind.label}</h4>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 flex-shrink-0">
                                            Target {ind.direction === "lower" ? "≤" : "≥"} {ind.target}%
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 leading-relaxed">{ind.definition}</p>
                                    <div className="pt-1.5 border-t border-slate-200/60 text-[10px] font-mono text-slate-500">
                                        <span className="font-bold text-slate-700">Formula:</span> {ind.formula}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 4 Core Program KPI Scorecards */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <Award className="w-5 h-5 text-pink-600" />
                        4 Indikator Program Utama Remaja Putri (Target 2026)
                    </h2>
                    <span className="text-xs text-slate-400">
                        Scope: {selectedPuskesmas === "ALL" ? "Seluruh Kabupaten Malang" : selectedPuskesmas}
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {coreProgramIndicators.map((k) => {
                        const def = REMAJA_PUTRI_INDICATOR_DEFINITIONS[k];
                        const val = currentTotals[k] as number;
                        const target = def.target ?? 0;
                        const isMet = def.direction === "lower" ? val <= target : val >= target;

                        let num = 0;
                        let den = 0;
                        if (k === "pct_ttd_consumed") {
                            num = currentTotals.ttd_consumed_standard;
                            den = currentTotals.target_rematri;
                        } else if (k === "pct_screening_anemia") {
                            num = currentTotals.screened_grade7_10;
                            den = currentTotals.target_grade7_10;
                        } else if (k === "pct_anemia") {
                            num = currentTotals.anemia_total;
                            den = currentTotals.screened_grade7_10;
                        } else if (k === "pct_anemia_treated") {
                            num = currentTotals.anemia_treated;
                            den = currentTotals.anemia_total;
                        }

                        const isActive = activeChartIndicator === k;

                        return (
                            <div
                                key={k}
                                onClick={() => setActiveChartIndicator(k)}
                                className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group ${
                                    isActive
                                        ? "border-pink-500 ring-2 ring-pink-500/20"
                                        : "border-slate-200"
                                }`}
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-1 mb-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-pink-600">
                                            {def.domain.toUpperCase()}
                                        </span>
                                        {isMet ? (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> Target Tercapai
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> Belum Tercapai
                                            </span>
                                        )}
                                    </div>

                                    <h3
                                        className="text-xs font-bold text-slate-700 group-hover:text-pink-700 transition-colors line-clamp-1"
                                        title={def.label}
                                    >
                                        {def.label}
                                    </h3>

                                    <div className="flex items-baseline justify-between mt-2">
                                        <div className="text-3xl font-black text-slate-900 tracking-tight">
                                            {formatPercent(val)}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-bold text-slate-500">
                                                Target: {def.direction === "lower" ? "≤" : "≥"} {def.target}%
                                            </div>
                                            <div className={`text-[10px] font-bold ${isMet ? "text-emerald-600" : "text-rose-600"}`}>
                                                {isMet ? "Memenuhi" : "Gap " + Math.abs(Math.round((val - target) * 10) / 10) + "%"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Numerator / Denominator display */}
                                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                                        <span className="truncate max-w-[150px]">{def.numeratorLabel}:</span>
                                        <span className="font-mono font-bold text-slate-700">{formatNumber(num)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                                        <span className="truncate max-w-[150px]">{def.denominatorLabel}:</span>
                                        <span className="font-mono font-bold text-slate-700">{formatNumber(den)}</span>
                                    </div>
                                </div>

                                <div className="mt-3 text-[10px] text-pink-600 font-semibold group-hover:underline flex items-center gap-1">
                                    <span>Tampilkan pada grafik wilayah</span>
                                    <span>→</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Comparative Interactive Bar Chart & Ranking Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Bar Chart (2 cols) */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                <Activity className="w-4 h-4 text-pink-600" />
                                <span>Capaian per {isDesaLevel ? "Desa / Kelurahan" : "Puskesmas"} — {REMAJA_PUTRI_INDICATOR_DEFINITIONS[activeChartIndicator].label}</span>
                            </h3>
                            <p className="text-xs text-slate-400">
                                {isDesaLevel
                                    ? `Klik batang desa untuk filter kelurahan di Puskesmas ${selectedPuskesmas}`
                                    : "Klik batang wilayah untuk drilldown ke level Desa/Kelurahan"}
                            </p>
                        </div>

                        {/* Chart Option Selector */}
                        <div className="flex items-center gap-2">
                            <select
                                value={activeChartIndicator}
                                onChange={(e) => setActiveChartIndicator(e.target.value as RemajaPutriIndicatorKey)}
                                className="text-xs font-bold rounded-xl border border-slate-200 py-1.5 px-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                            >
                                <option value="pct_ttd_consumed">1. % Konsumsi TTD (≥67%)</option>
                                <option value="pct_screening_anemia">2. % Skrining Anemia (≥77%)</option>
                                <option value="pct_anemia">3. % Prevalensi Anemia (≤23%)</option>
                                <option value="pct_anemia_treated">4. % Tatalaksana Anemia (≥40%)</option>
                                <option value="pct_ttd_received">5. % Mendapat TTD</option>
                            </select>

                            <button
                                onClick={() => setSortAscending(!sortAscending)}
                                className="text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors"
                                title="Ganti urutan nilai"
                            >
                                {sortAscending ? "Terendah ↑" : "Tertinggi ↓"}
                            </button>
                        </div>
                    </div>

                    <div className="h-80 w-full">
                        {chartData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-xs text-slate-400">
                                Tidak ada data untuk periode dan filter yang dipilih.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chartData}
                                    margin={{ top: 10, right: 10, left: -15, bottom: 40 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        angle={-45}
                                        textAnchor="end"
                                        interval={0}
                                        height={70}
                                        tick={{ fontSize: 10, fill: "#64748b" }}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        tick={{ fontSize: 10, fill: "#64748b" }}
                                        tickFormatter={(v) => `${v}%`}
                                    />
                                    <RechartsTooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-slate-900 text-white p-3 rounded-xl text-xs shadow-xl space-y-1">
                                                        <div className="font-bold border-b border-slate-700 pb-1">
                                                            {d.name} {isDesaLevel ? `(Pusk. ${d.puskesmas})` : ""}
                                                        </div>
                                                        <div className="text-pink-300 font-extrabold text-sm">{d.value}%</div>
                                                        <div className="text-slate-300">Numerator: {formatNumber(d.numerator)}</div>
                                                        <div className="text-slate-300">Denominator: {formatNumber(d.denominator)}</div>
                                                        {d.target && <div className="text-slate-400 text-[10px]">Target: {d.target}%</div>}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    {REMAJA_PUTRI_INDICATOR_DEFINITIONS[activeChartIndicator].target && (
                                        <ReferenceLine
                                            y={REMAJA_PUTRI_INDICATOR_DEFINITIONS[activeChartIndicator].target}
                                            stroke="#dc2626"
                                            strokeDasharray="4 4"
                                            label={{
                                                value: `Target: ${REMAJA_PUTRI_INDICATOR_DEFINITIONS[activeChartIndicator].target}%`,
                                                fill: "#dc2626",
                                                fontSize: 10,
                                                position: "top"
                                            }}
                                        />
                                    )}
                                    <Bar
                                        dataKey="value"
                                        radius={[4, 4, 0, 0]}
                                        onClick={(entry: any) => {
                                            if (!isDesaLevel && entry?.name) {
                                                setSelectedPuskesmas(entry.name);
                                            } else if (isDesaLevel && entry?.name) {
                                                setSelectedKelurahan(selectedKelurahan === entry.name ? "ALL" : entry.name);
                                            }
                                        }}
                                        className="cursor-pointer"
                                    >
                                        {chartData.map((entry, index) => {
                                            const isSelected = isDesaLevel
                                                ? selectedKelurahan === "ALL" || selectedKelurahan.toLowerCase() === entry.name.toLowerCase()
                                                : true;
                                            return (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.isMet ? "#10b981" : "#ec4899"}
                                                    opacity={isSelected ? 1 : 0.35}
                                                />
                                            );
                                        })}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Ranking & Statistical Context Panel (1 col) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="border-b border-slate-100 pb-3">
                            <h3 className="font-bold text-slate-800 text-sm">
                                {isDesaLevel ? `Distribusi & Peringkat Desa (${selectedPuskesmas})` : "Distribusi & Peringkat Puskesmas"}
                            </h3>
                            <p className="text-xs text-slate-400">
                                {isDesaLevel ? `Analisis statistik capaian antar desa di ${selectedPuskesmas}` : "Analisis statistik capaian antar wilayah"}
                            </p>
                        </div>

                        {rankingStats ? (
                            <>
                                {/* Comparison Box */}
                                <div className="grid grid-cols-2 gap-2 bg-pink-50/50 p-3 rounded-xl border border-pink-100">
                                    <div>
                                        <div className="text-[10px] text-slate-500 font-medium">
                                            {isDesaLevel ? "Capaian Puskesmas" : "Capaian Kabupaten"}
                                        </div>
                                        <div className="text-xl font-black text-pink-900 mt-0.5">
                                            {rankingStats.parentVal}%
                                        </div>
                                        <div className="text-[9px] text-slate-400">Ratio of Sums</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-500 font-medium">
                                            {isDesaLevel ? "Rata-rata Desa" : "Rata-rata Puskesmas"}
                                        </div>
                                        <div className="text-xl font-black text-slate-800 mt-0.5">
                                            {rankingStats.avgUnits}%
                                        </div>
                                        <div className="text-[9px] text-slate-400">Rerata Deskriptif</div>
                                    </div>
                                </div>

                                {/* Min / Median / Max */}
                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                                        <div className="text-[10px] text-slate-400">Minimum</div>
                                        <div className="font-bold text-slate-700 mt-0.5">{rankingStats.minVal}%</div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                                        <div className="text-[10px] text-slate-400">Median</div>
                                        <div className="font-bold text-slate-700 mt-0.5">{rankingStats.medianVal}%</div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                                        <div className="text-[10px] text-slate-400">Maksimum</div>
                                        <div className="font-bold text-slate-700 mt-0.5">{rankingStats.maxVal}%</div>
                                    </div>
                                </div>

                                {/* Top 3 Favorable */}
                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-emerald-700 flex items-center justify-between">
                                        <span>
                                            {rankingStats.direction === "lower"
                                                ? (isDesaLevel ? "3 Desa Prevalensi Terendah" : "3 Prevalensi Terendah")
                                                : (isDesaLevel ? "3 Desa Capaian Tertinggi" : "3 Capaian Tertinggi")}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {rankingStats.bestThree.map((item, idx) => (
                                            <div key={item.name} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg">
                                                <span className="font-semibold text-slate-700 truncate max-w-[150px]">
                                                    {idx + 1}. {item.name}
                                                </span>
                                                <span className="font-bold text-emerald-600">{item.value}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Bottom 3 Attention */}
                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-rose-700 flex items-center justify-between">
                                        <span>
                                            {rankingStats.direction === "lower"
                                                ? (isDesaLevel ? "3 Desa Prevalensi Tertinggi" : "3 Prevalensi Tertinggi")
                                                : (isDesaLevel ? "3 Desa Capaian Terendah" : "3 Capaian Terendah")}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {rankingStats.worstThree.map((item, idx) => (
                                            <div key={item.name} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg">
                                                <span className="font-semibold text-slate-700 truncate max-w-[150px]">
                                                    {idx + 1}. {item.name}
                                                </span>
                                                <span className="font-bold text-rose-600">{item.value}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-xs text-slate-400 text-center py-6">
                                Data belum tersedia.
                            </div>
                        )}
                    </div>

                    {isDesaLevel && (
                        <button
                            onClick={() => setSelectedPuskesmas("ALL")}
                            className="w-full py-2 px-3 text-xs font-bold text-pink-700 bg-pink-50 hover:bg-pink-100 rounded-xl border border-pink-200 transition-colors"
                        >
                            ← Kembali ke Tampilan Seluruh Puskesmas
                        </button>
                    )}
                </div>
            </div>

            {/* Multi-Indicator Temporal Trend Chart (4 Program Utama) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-sm">
                                Tren Temporal Indikator Utama Remaja Putri ({year})
                            </h3>
                            {isDesaLevel && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-pink-100 text-pink-700">
                                    Puskesmas {selectedPuskesmas}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Perjalanan kumulatif capaian 4 Indikator Program Utama Remaja Putri sepanjang tahun ({mode === "bulanan" ? "Januari - Desember" : mode === "triwulan" ? "TW I - TW IV" : "Tahun Ajaran"})
                        </p>
                    </div>
                </div>

                <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${v}%`} />
                            <RechartsTooltip
                                formatter={(val: any) => [`${val}%`, ""]}
                                contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", color: "#fff", fontSize: "12px" }}
                            />
                            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                            <Line type="monotone" dataKey="konsumsi" name="% Konsumsi TTD (≥67%)" stroke="#ec4899" strokeWidth={2.5} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="skrining" name="% Skrining Anemia (≥77%)" stroke="#14b8a6" strokeWidth={2.5} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="anemia" name="% Prevalensi Anemia (≤23%)" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="tatalaksana" name="% Tatalaksana Anemia (≥40%)" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Recapitulation Table with Numerator & Denominator */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <Layers className="w-4 h-4 text-pink-600" />
                            <span>Detail Rekapitulasi Indikator Remaja Putri per {isDesaLevel ? "Desa / Kelurahan" : "Puskesmas"}</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Menampilkan capaian persentase beserta angka numerator / denominator untuk verifikasi akurasi data.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative min-w-[200px]">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder={isDesaLevel ? "Cari Desa/Kelurahan..." : "Cari Puskesmas..."}
                                value={tableSearch}
                                onChange={(e) => {
                                    setTableSearch(e.target.value);
                                    setTablePage(1);
                                }}
                                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                            />
                        </div>

                        <button
                            onClick={() => handleExport("xlsx")}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-pink-50 text-pink-700 hover:bg-pink-100 transition-colors flex items-center gap-1.5"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Excel
                        </button>
                        <button
                            onClick={() => handleExport("csv")}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                        >
                            <Download className="w-3.5 h-3.5" />
                            CSV
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="py-3 px-4 sticky left-0 bg-slate-50 z-10">
                                    {isDesaLevel ? "Desa / Kelurahan" : "Puskesmas"}
                                </th>
                                <th className="py-3 px-3 text-center">Sasaran Rematri</th>
                                <th className="py-3 px-3 text-center">% Konsumsi TTD (≥67%)</th>
                                <th className="py-3 px-3 text-center">% Mendapat TTD</th>
                                <th className="py-3 px-3 text-center">% Skrining (≥77%)</th>
                                <th className="py-3 px-3 text-center">% Skrining Kls 7</th>
                                <th className="py-3 px-3 text-center">% Skrining Kls 10</th>
                                <th className="py-3 px-3 text-center">% Prevalensi Anemia (≤23%)</th>
                                <th className="py-3 px-3 text-center">% Anemia Kls 7</th>
                                <th className="py-3 px-3 text-center">% Anemia Kls 10</th>
                                <th className="py-3 px-3 text-center">% Tatalaksana (≥40%)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedTable.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="py-8 text-center text-slate-400">
                                        Tidak ada data yang cocok.
                                    </td>
                                </tr>
                            ) : (
                                paginatedTable.map((row) => (
                                    <tr key={row.entity_name} className="hover:bg-pink-50/20 transition-colors">
                                        <td className="py-3 px-4 font-bold text-slate-800 sticky left-0 bg-white z-10">
                                            <div>{row.entity_name}</div>
                                            {isDesaLevel && (
                                                <span className="text-[10px] text-slate-400 font-normal">Pusk. {row.puskesmas}</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3 text-center font-bold font-mono text-slate-700">
                                            {formatNumber(row.target_rematri)}
                                        </td>

                                        {/* % Konsumsi TTD */}
                                        <td className={`py-3 px-3 text-center ${row.pct_ttd_consumed >= 67 ? "text-emerald-700 bg-emerald-50/20" : "text-slate-700"}`}>
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-xs">{formatPercent(row.pct_ttd_consumed)}</span>
                                                <span className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                                                    {formatNumber(row.ttd_consumed_standard)} / {formatNumber(row.target_rematri)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* % Mendapat TTD */}
                                        <td className="py-3 px-3 text-center text-slate-700">
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-xs">{formatPercent(row.pct_ttd_received)}</span>
                                                <span className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                                                    {formatNumber(row.ttd_received_standard)} / {formatNumber(row.target_rematri)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* % Skrining Anemia */}
                                        <td className={`py-3 px-3 text-center ${row.pct_screening_anemia >= 77 ? "text-emerald-700 bg-emerald-50/20" : "text-slate-700"}`}>
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-xs">{formatPercent(row.pct_screening_anemia)}</span>
                                                <span className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                                                    {formatNumber(row.screened_grade7_10)} / {formatNumber(row.target_grade7_10)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* % Skrining Kelas 7 */}
                                        <td className="py-3 px-3 text-center text-slate-700">
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-xs">{formatPercent(row.pct_screening_grade7)}</span>
                                                <span className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                                                    {formatNumber(row.screened_grade7)} / {formatNumber(row.target_grade7)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* % Skrining Kelas 10 */}
                                        <td className="py-3 px-3 text-center text-slate-700">
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-xs">{formatPercent(row.pct_screening_grade10)}</span>
                                                <span className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                                                    {formatNumber(row.screened_grade10)} / {formatNumber(row.target_grade10)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* % Prevalensi Anemia */}
                                        <td className={`py-3 px-3 text-center ${row.pct_anemia <= 23 && row.screened_grade7_10 > 0 ? "text-emerald-700 bg-emerald-50/20" : "text-slate-700"}`}>
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-xs">{formatPercent(row.pct_anemia)}</span>
                                                <span className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                                                    {formatNumber(row.anemia_total)} / {formatNumber(row.screened_grade7_10)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* % Anemia Kelas 7 */}
                                        <td className="py-3 px-3 text-center text-slate-700">
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-xs">{formatPercent(row.pct_anemia_grade7)}</span>
                                                <span className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                                                    {formatNumber(row.anemia_grade7_total)} / {formatNumber(row.screened_grade7)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* % Anemia Kelas 10 */}
                                        <td className="py-3 px-3 text-center text-slate-700">
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-xs">{formatPercent(row.pct_anemia_grade10)}</span>
                                                <span className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                                                    {formatNumber(row.anemia_grade10_total)} / {formatNumber(row.screened_grade10)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* % Tatalaksana Anemia */}
                                        <td className={`py-3 px-3 text-center ${row.pct_anemia_treated >= 40 ? "text-emerald-700 bg-emerald-50/20" : "text-slate-700"}`}>
                                            <div className="flex flex-col items-center">
                                                <span className="font-bold text-xs">{formatPercent(row.pct_anemia_treated)}</span>
                                                <span className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                                                    {formatNumber(row.anemia_treated)} / {formatNumber(row.anemia_total)}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <div>
                            Halaman <span className="font-bold text-slate-700">{tablePage}</span> dari{" "}
                            <span className="font-bold text-slate-700">{totalPages}</span> ({filteredTableRows.length} wilayah)
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                                disabled={tablePage === 1}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors font-medium"
                            >
                                Sebelumnya
                            </button>
                            <button
                                onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                                disabled={tablePage === totalPages}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors font-medium"
                            >
                                Selanjutnya
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
