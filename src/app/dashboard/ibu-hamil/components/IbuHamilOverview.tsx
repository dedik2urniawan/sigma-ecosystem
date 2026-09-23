"use client";

import React, { useState, useMemo } from "react";
import {
    IbuHamilRawRecord,
    IndicatorKey,
    INDICATOR_DEFINITIONS,
    aggregateRecords,
    aggregateByPuskesmas,
    aggregateByDesa,
    filterCumulativeData,
    CalculatedIndicatorMetric,
    getTrendDirection,
    PuskesmasSummaryRow,
    safePercent
} from "@/lib/ibuHamilHelper";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell,
    LineChart,
    Line,
    Legend,
    ReferenceLine
} from "recharts";
import {
    TrendingUp,
    TrendingDown,
    Minus,
    Info,
    ChevronDown,
    ChevronUp,
    Download,
    Search,
    SlidersHorizontal,
    Filter,
    CheckCircle2,
    AlertCircle,
    ArrowUpRight,
    ArrowDownRight,
    Award,
    Activity,
    Layers
} from "lucide-react";
import * as XLSX from "xlsx";

interface IbuHamilOverviewProps {
    allRecords: IbuHamilRawRecord[];
    refPuskesmas: { id: string; name: string }[];
    refDesa: { id: string; name: string; puskesmas_id: string }[];
    year: string;
    setYear: (y: string) => void;
    mode: "bulanan" | "triwulan";
    setMode: (m: "bulanan" | "triwulan") => void;
    periodVal: number;
    setPeriodVal: (p: number) => void;
    selectedPuskesmas: string;
    setSelectedPuskesmas: (p: string) => void;
    selectedKelurahan: string;
    setSelectedKelurahan: (k: string) => void;
}

export default function IbuHamilOverview({
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
}: IbuHamilOverviewProps) {
    const [showDefinitions, setShowDefinitions] = useState(false);
    const [activeChartIndicator, setActiveChartIndicator] = useState<IndicatorKey>("pct_anemia");
    const [sortAscending, setSortAscending] = useState(false);
    const [tableSearch, setTableSearch] = useState("");
    const [tablePage, setTablePage] = useState(1);
    const pageSize = 10;

    // Filter by year
    const yearRecords = useMemo(() => {
        return allRecords.filter((r) => String(r.tahun) === year);
    }, [allRecords, year]);

    // Current period filtered cumulative snapshot
    const { filteredRecords: currentPeriodRecords, freshnessMap } = useMemo(() => {
        return filterCumulativeData(yearRecords, mode, periodVal);
    }, [yearRecords, mode, periodVal]);

    // Previous period filtered for trend delta comparison
    const previousPeriodVal = mode === "bulanan" ? (periodVal === 1 ? 12 : periodVal - 1) : (periodVal === 1 ? 4 : periodVal - 1);
    const prevYear = (mode === "bulanan" && periodVal === 1) || (mode === "triwulan" && periodVal === 1)
        ? String(Number(year) - 1)
        : year;
    const prevYearRecords = useMemo(() => {
        return allRecords.filter((r) => String(r.tahun) === prevYear);
    }, [allRecords, prevYear]);
    const { filteredRecords: previousPeriodRecords } = useMemo(() => {
        return filterCumulativeData(prevYearRecords, mode, previousPeriodVal);
    }, [prevYearRecords, mode, previousPeriodVal]);

    // Active records filtered by Puskesmas and Kelurahan
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

    const activePrevRecords = useMemo(() => {
        let recs = previousPeriodRecords;
        if (selectedPuskesmas !== "ALL") {
            recs = recs.filter((r) => r.puskesmas.toLowerCase().trim() === selectedPuskesmas.toLowerCase().trim());
        }
        if (selectedKelurahan !== "ALL") {
            recs = recs.filter((r) => r.kelurahan.toLowerCase().trim() === selectedKelurahan.toLowerCase().trim());
        }
        return recs;
    }, [previousPeriodRecords, selectedPuskesmas, selectedKelurahan]);

    // Aggregates for current and previous period
    const currentMetrics = useMemo(() => aggregateRecords(activeRecords), [activeRecords]);
    const prevMetrics = useMemo(() => aggregateRecords(activePrevRecords), [activePrevRecords]);

    const isDesaLevel = selectedPuskesmas !== "ALL";

    // Active breakdown rows: per Desa if a Puskesmas is selected, per Puskesmas if ALL
    const activeBreakdownRows = useMemo(() => {
        if (isDesaLevel) {
            const scoped = currentPeriodRecords.filter(
                (r) => r.puskesmas.toLowerCase().trim() === selectedPuskesmas.toLowerCase().trim()
            );
            return aggregateByDesa(scoped, freshnessMap).map((d) => ({
                id: d.desa,
                name: d.desa,
                puskesmas: d.puskesmas,
                desaCount: 1,
                metrics: d.metrics
            }));
        } else {
            return aggregateByPuskesmas(currentPeriodRecords, freshnessMap).map((p) => ({
                id: p.puskesmas,
                name: p.puskesmas,
                puskesmas: p.puskesmas,
                desaCount: p.desaCount,
                metrics: p.metrics
            }));
        }
    }, [currentPeriodRecords, freshnessMap, isDesaLevel, selectedPuskesmas]);

    // Chart Data per Puskesmas or Desa for selected activeChartIndicator
    const chartData = useMemo(() => {
        const def = INDICATOR_DEFINITIONS[activeChartIndicator];
        const rows = activeBreakdownRows.map((r) => {
            const metric = r.metrics.indicators[activeChartIndicator];
            return {
                name: r.name,
                puskesmas: r.puskesmas,
                value: metric.value !== null ? metric.value : 0,
                hasData: metric.value !== null,
                numerator: metric.numerator,
                denominator: metric.denominator,
                status: metric.status,
                target: def.target
            };
        });

        return rows.sort((a, b) => (sortAscending ? a.value - b.value : b.value - a.value));
    }, [activeBreakdownRows, activeChartIndicator, sortAscending]);

    // Statistics Ranking & Distribution for activeChartIndicator
    const rankingStats = useMemo(() => {
        const def = INDICATOR_DEFINITIONS[activeChartIndicator];
        const validRows = chartData.filter((r) => r.hasData);
        if (validRows.length === 0) return null;

        const values = validRows.map((r) => r.value).sort((a, b) => a - b);
        const minVal = values[0];
        const maxVal = values[values.length - 1];
        const medianVal = values[Math.floor(values.length / 2)];
        const avgUnits = Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
        const parentVal = currentMetrics.indicators[activeChartIndicator].value;

        // Contextual labeling:
        // Lower is better (Anemia, KEK): lower is "Prevalensi Terendah" (favorable)
        // Higher is better: higher is "Capaian Tertinggi"
        const sortedByPerformance = [...validRows].sort((a, b) =>
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
    }, [chartData, activeChartIndicator, currentMetrics, isDesaLevel]);

    // Multi-line Trend temporal data
    const trendData = useMemo(() => {
        const points: { name: string; anemia: number | null; suplemen: number | null; kek: number | null; k1: number | null }[] = [];

        if (mode === "bulanan") {
            const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
            const mNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
            months.forEach((m, idx) => {
                const { filteredRecords: mRecs } = filterCumulativeData(yearRecords, "bulanan", m);
                const scoped = selectedPuskesmas === "ALL"
                    ? mRecs
                    : mRecs.filter((r) => r.puskesmas.toLowerCase().trim() === selectedPuskesmas.toLowerCase().trim());
                const agg = aggregateRecords(scoped);
                points.push({
                    name: mNames[idx],
                    anemia: agg.indicators.pct_anemia.value,
                    suplemen: agg.indicators.pct_received_supplement.value,
                    kek: agg.indicators.pct_kek.value,
                    k1: agg.indicators.pct_k1_pure.value
                });
            });
        } else {
            const quarters = [1, 2, 3, 4];
            const qNames = ["TW I", "TW II", "TW III", "TW IV"];
            quarters.forEach((q, idx) => {
                const { filteredRecords: qRecs } = filterCumulativeData(yearRecords, "triwulan", q);
                const scoped = selectedPuskesmas === "ALL"
                    ? qRecs
                    : qRecs.filter((r) => r.puskesmas.toLowerCase().trim() === selectedPuskesmas.toLowerCase().trim());
                const agg = aggregateRecords(scoped);
                points.push({
                    name: qNames[idx],
                    anemia: agg.indicators.pct_anemia.value,
                    suplemen: agg.indicators.pct_received_supplement.value,
                    kek: agg.indicators.pct_kek.value,
                    k1: agg.indicators.pct_k1_pure.value
                });
            });
        }

        return points;
    }, [yearRecords, mode, selectedPuskesmas]);

    // Export to Excel / CSV
    const handleExport = (format: "xlsx" | "csv") => {
        const rows = activeBreakdownRows.map((r, idx) => {
            const baseRow: Record<string, any> = {
                No: idx + 1,
                [isDesaLevel ? "Desa / Kelurahan" : "Puskesmas"]: r.name,
            };
            if (isDesaLevel) {
                baseRow["Puskesmas Induk"] = r.puskesmas;
            } else {
                baseRow["Desa Terdata"] = r.desaCount;
            }
            baseRow["Sasaran Bumil"] = r.metrics.counts.target_pregnant;
            baseRow["Total Bumil"] = r.metrics.counts.pregnant_total;
            baseRow["% Bumil Anemia"] = r.metrics.indicators.pct_anemia.value ?? "N/A";
            baseRow["% Anemia Ringan TTD"] = r.metrics.indicators.pct_anemia_mild_ttd.value ?? "N/A";
            baseRow["% Anemia Sedang/Berat Ditatalaksana"] = r.metrics.indicators.pct_anemia_modsev_advanced.value ?? "N/A";
            baseRow["% Mendapat Suplementasi"] = r.metrics.indicators.pct_received_supplement.value ?? "N/A";
            baseRow["% Konsumsi Suplementasi"] = r.metrics.indicators.pct_consumed_supplement.value ?? "N/A";
            baseRow["% Bumil KEK"] = r.metrics.indicators.pct_kek.value ?? "N/A";
            baseRow["% KEK Dapat PMT"] = r.metrics.indicators.pct_kek_pmt.value ?? "N/A";
            baseRow["% K1 Murni"] = r.metrics.indicators.pct_k1_pure.value ?? "N/A";
            baseRow["% ANC TM1 USG"] = r.metrics.indicators.pct_anc_t1_usg.value ?? "N/A";
            baseRow["% ANC TM3 USG"] = r.metrics.indicators.pct_anc_t3_usg.value ?? "N/A";
            baseRow["% K6"] = r.metrics.indicators.pct_k6.value ?? "N/A";
            baseRow["% 12T"] = r.metrics.indicators.pct_anc_12t.value ?? "N/A";

            return baseRow;
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        const sheetTitle = isDesaLevel ? `Rekap Desa ${selectedPuskesmas.slice(0, 15)}` : "Rekap Puskesmas";
        XLSX.utils.book_append_sheet(wb, ws, sheetTitle);

        const filePrefix = isDesaLevel
            ? `Rekap_Indikator_Ibu_Hamil_Desa_${selectedPuskesmas}_${year}_${mode}_${periodVal}`
            : `Rekap_Indikator_Ibu_Hamil_${year}_${mode}_${periodVal}`;

        if (format === "xlsx") {
            XLSX.writeFile(wb, `${filePrefix}.xlsx`);
        } else {
            XLSX.writeFile(wb, `${filePrefix}.csv`, { bookType: "csv" });
        }
    };

    // Filtered Table Rows
    const tableFiltered = useMemo(() => {
        return activeBreakdownRows.filter((r) => r.name.toLowerCase().includes(tableSearch.toLowerCase()));
    }, [activeBreakdownRows, tableSearch]);

    const paginatedTable = useMemo(() => {
        const start = (tablePage - 1) * pageSize;
        return tableFiltered.slice(start, start + pageSize);
    }, [tableFiltered, tablePage]);

    const totalTablePages = Math.ceil(tableFiltered.length / pageSize) || 1;

    return (
        <div className="space-y-6">
            {/* Collapsible Definisi Operasional & Formula */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                <button
                    onClick={() => setShowDefinitions(!showDefinitions)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                            <Info className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">
                                Definisi Operasional & Formula Indikator Ibu Hamil 2026
                            </h3>
                            <p className="text-xs text-slate-400">
                                Klik untuk melihat standar perhitungan, numerator, denominator, dan target program 2026
                            </p>
                        </div>
                    </div>
                    <div className="text-slate-400">
                        {showDefinitions ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                </button>

                {showDefinitions && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.values(INDICATOR_DEFINITIONS).map((ind) => (
                            <div key={ind.key} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                <div className="flex items-start justify-between gap-1">
                                    <h4 className="text-xs font-bold text-slate-800">{ind.label}</h4>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex-shrink-0">
                                        Target {ind.direction === "lower" ? "≤" : "≥"} {ind.target}%
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed">{ind.definition}</p>
                                <div className="pt-1.5 border-t border-slate-100 text-[10px] font-mono text-slate-500">
                                    <span className="font-bold text-slate-700">Formula:</span> {ind.formula}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 12 Program KPI Scorecards */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <Award className="w-5 h-5 text-purple-600" />
                        12 Indikator Program Ibu Hamil (Target 2026)
                    </h2>
                    <span className="text-xs text-slate-400">
                        Scope: {selectedPuskesmas === "ALL" ? "Seluruh Kabupaten Malang" : selectedPuskesmas}
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.values(INDICATOR_DEFINITIONS).map((def) => {
                        const m = currentMetrics.indicators[def.key];
                        const prevM = prevMetrics.indicators[def.key];
                        const delta = m.value !== null && prevM.value !== null
                            ? Math.round((m.value - prevM.value) * 10) / 10
                            : null;
                        const tDir = delta !== null ? getTrendDirection(m.value!, prevM.value!, def.direction) : "neutral";

                        const isMet = m.status === "TARGET_MET";
                        const isNoData = m.status === "NO_DATA";

                        return (
                            <div
                                key={def.key}
                                onClick={() => setActiveChartIndicator(def.key)}
                                className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group ${
                                    activeChartIndicator === def.key
                                        ? "border-purple-500 ring-2 ring-purple-500/20"
                                        : "border-slate-200"
                                }`}
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-1 mb-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
                                            {def.domain.toUpperCase()}
                                        </span>
                                        {isNoData ? (
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                                No Data
                                            </span>
                                        ) : isMet ? (
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
                                        className="text-xs font-bold text-slate-700 group-hover:text-purple-700 transition-colors line-clamp-1"
                                        title={def.label}
                                    >
                                        {def.label}
                                    </h3>

                                    <div className="flex items-baseline justify-between mt-2">
                                        <div className="text-3xl font-black text-slate-900 tracking-tight">
                                            {m.value !== null ? `${m.value}%` : "N/A"}
                                        </div>
                                        {delta !== null && (
                                            <div
                                                className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                                                    tDir === "positive"
                                                        ? "text-emerald-700 bg-emerald-50"
                                                        : tDir === "negative"
                                                        ? "text-rose-700 bg-rose-50"
                                                        : "text-slate-500 bg-slate-100"
                                                }`}
                                            >
                                                {tDir === "positive" ? (
                                                    <ArrowUpRight className="w-3 h-3" />
                                                ) : tDir === "negative" ? (
                                                    <ArrowDownRight className="w-3 h-3" />
                                                ) : (
                                                    <Minus className="w-3 h-3" />
                                                )}
                                                <span>{Math.abs(delta)} pp</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-[11px]">
                                    <div className="flex justify-between text-slate-500">
                                        <span>Target:</span>
                                        <span className="font-bold text-slate-700">
                                            {def.direction === "lower" ? "≤" : "≥"} {def.target}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-slate-400 text-[10px]">
                                        <span className="truncate max-w-[120px]" title={def.numeratorLabel}>{def.numeratorLabel}:</span>
                                        <span className="font-semibold text-slate-700">{m.numerator.toLocaleString("id-ID")}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-400 text-[10px]">
                                        <span className="truncate max-w-[120px]" title={def.denominatorLabel}>{def.denominatorLabel}:</span>
                                        <span className="font-semibold text-slate-700">{m.denominator.toLocaleString("id-ID")}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Supporting Monitoring Counts */}
            <div className="bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3.5">
                    <div>
                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Indikator Monitoring Pelayanan Ibu Hamil (Kumulatif Snapshot)
                        </div>
                        <div className="text-[11px] text-slate-500">
                            Agregat kumulatif pelayanan antenatal & persalinan sesuai filter wilayah dan periode aktif
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-shadow shadow-xs">
                        <div className="text-[11px] text-slate-500 font-medium truncate" title="Jumlah Ibu Hamil">Jumlah Ibu Hamil</div>
                        <div className="text-xl font-black text-slate-800 mt-1">
                            {currentMetrics.counts.pregnant_total.toLocaleString("id-ID")}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Total sasaran bumil</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-shadow shadow-xs">
                        <div className="text-[11px] text-slate-500 font-medium truncate" title="Jumlah Ibu Bersalin">Jumlah Ibu Bersalin</div>
                        <div className="text-xl font-black text-slate-800 mt-1">
                            {currentMetrics.counts.delivery_total.toLocaleString("id-ID")}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Total ibu bersalin</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-shadow shadow-xs">
                        <div className="text-[11px] text-slate-500 font-medium truncate" title="K1 Akses (Semua Usia)">K1 Akses</div>
                        <div className="text-xl font-black text-indigo-700 mt-1">
                            {currentMetrics.counts.k1_access.toLocaleString("id-ID")}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Kontak pertama bumil</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-shadow shadow-xs">
                        <div className="text-[11px] text-slate-500 font-medium truncate" title="K1 Murni (Trimester 1)">K1 Murni</div>
                        <div className="text-xl font-black text-indigo-700 mt-1">
                            {currentMetrics.counts.k1_pure.toLocaleString("id-ID")}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Kontak pertama di TM 1</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-shadow shadow-xs">
                        <div className="text-[11px] text-slate-500 font-medium truncate" title="ANC Trimester 1 dengan Dokter">ANC TM1 Dokter</div>
                        <div className="text-xl font-black text-blue-700 mt-1">
                            {currentMetrics.counts.anc_t1_doctor.toLocaleString("id-ID")}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Pemeriksaan dokter TM 1</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-shadow shadow-xs">
                        <div className="text-[11px] text-slate-500 font-medium truncate" title="ANC Trimester 1 dengan USG">ANC TM1 USG</div>
                        <div className="text-xl font-black text-blue-700 mt-1">
                            {currentMetrics.counts.anc_t1_usg.toLocaleString("id-ID")}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Pemeriksaan USG TM 1</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-shadow shadow-xs">
                        <div className="text-[11px] text-slate-500 font-medium truncate" title="ANC Trimester 3 dengan Dokter">ANC TM3 Dokter</div>
                        <div className="text-xl font-black text-cyan-700 mt-1">
                            {currentMetrics.counts.anc_t3_doctor.toLocaleString("id-ID")}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Pemeriksaan dokter TM 3</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-shadow shadow-xs">
                        <div className="text-[11px] text-slate-500 font-medium truncate" title="ANC Trimester 3 dengan USG">ANC TM3 USG</div>
                        <div className="text-xl font-black text-cyan-700 mt-1">
                            {currentMetrics.counts.anc_t3_usg.toLocaleString("id-ID")}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Pemeriksaan USG TM 3</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-shadow shadow-xs">
                        <div className="text-[11px] text-slate-500 font-medium truncate" title="Jumlah Ibu Bersalin K6">Ibu Bersalin K6</div>
                        <div className="text-xl font-black text-emerald-700 mt-1">
                            {currentMetrics.counts.k6_delivery.toLocaleString("id-ID")}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Lengkap minimal 6x ANC</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-shadow shadow-xs">
                        <div className="text-[11px] text-slate-500 font-medium truncate" title="Pemeriksaan Standar 12T Selama Kehamilan">Standar 12T</div>
                        <div className="text-xl font-black text-emerald-700 mt-1">
                            {currentMetrics.counts.anc_12t_delivery.toLocaleString("id-ID")}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Layanan 12T lengkap</div>
                    </div>
                </div>
            </div>

            {/* Puskesmas Comparison & Ranking Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Comparison Chart (2 cols) */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Activity className="w-4 h-4 text-purple-600" />
                                <span className="font-bold text-slate-900 text-sm">
                                    {isDesaLevel ? `Capaian per Desa (${selectedPuskesmas}):` : "Capaian per Puskesmas:"}
                                </span>
                                <select
                                    value={activeChartIndicator}
                                    onChange={(e) => setActiveChartIndicator(e.target.value as IndicatorKey)}
                                    className="text-xs font-bold text-purple-700 bg-purple-50/80 border border-purple-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 max-w-[280px] truncate"
                                >
                                    <optgroup label="Anemia Ibu Hamil">
                                        <option value="pct_anemia">% Ibu Hamil Anemia</option>
                                        <option value="pct_anemia_mild_ttd">% Anemia Ringan TTD Oral</option>
                                        <option value="pct_anemia_modsev_advanced">% Tatalaksana Sedang/Berat</option>
                                    </optgroup>
                                    <optgroup label="Suplementasi Gizi (TTD/MMS)">
                                        <option value="pct_received_supplement">% Mendapat Suplementasi (≥180 Tab)</option>
                                        <option value="pct_consumed_supplement">% Konsumsi Suplementasi (≥180 Tab)</option>
                                    </optgroup>
                                    <optgroup label="KEK & PMT Lokal">
                                        <option value="pct_kek">% Ibu Hamil KEK / Risiko KEK</option>
                                        <option value="pct_kek_pmt">% Bumil KEK Mendapat PMT</option>
                                    </optgroup>
                                    <optgroup label="Pemeriksaan Kehamilan (ANC)">
                                        <option value="pct_k1_pure">% K1 Murni (TM1)</option>
                                        <option value="pct_anc_t1_usg">% ANC TM1 USG</option>
                                        <option value="pct_anc_t3_usg">% ANC TM3 USG</option>
                                        <option value="pct_k6">% Pelayanan Antenatal K6</option>
                                        <option value="pct_anc_12t">% Pemeriksaan Standar 12T</option>
                                    </optgroup>
                                </select>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                                Target: {INDICATOR_DEFINITIONS[activeChartIndicator].direction === "lower" ? "≤" : "≥"}{" "}
                                {INDICATOR_DEFINITIONS[activeChartIndicator].target}% •{" "}
                                {isDesaLevel
                                    ? `Menampilkan ${chartData.length} desa/kelurahan di Puskesmas ${selectedPuskesmas}`
                                    : "Klik batang Puskesmas untuk filter detail desa"}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setSortAscending(!sortAscending)}
                                className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 flex items-center gap-1"
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                {sortAscending ? "Nilai Terendah" : "Nilai Tertinggi"}
                            </button>
                        </div>
                    </div>

                    {/* Chart Container */}
                    <div className="h-[360px] w-full">
                        {chartData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                                Tidak ada data untuk ditampilkan pada periode ini.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chartData}
                                    margin={{ top: 10, right: 10, left: -20, bottom: 60 }}
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
                                                        <div className="text-purple-300 font-extrabold text-sm">{d.value}%</div>
                                                        <div className="text-slate-300">Numerator: {d.numerator.toLocaleString("id-ID")}</div>
                                                        <div className="text-slate-300">Denominator: {d.denominator.toLocaleString("id-ID")}</div>
                                                        <div className="text-slate-400 text-[10px]">Target: {d.target}%</div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <ReferenceLine
                                        y={INDICATOR_DEFINITIONS[activeChartIndicator].target}
                                        stroke="#dc2626"
                                        strokeDasharray="4 4"
                                        label={{
                                            value: `Target: ${INDICATOR_DEFINITIONS[activeChartIndicator].target}%`,
                                            fill: "#dc2626",
                                            fontSize: 10,
                                            position: "top"
                                        }}
                                    />
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
                                            const isMet = entry.status === "TARGET_MET";
                                            const isSelected = isDesaLevel
                                                ? selectedKelurahan === "ALL" || selectedKelurahan.toLowerCase() === entry.name.toLowerCase()
                                                : true;
                                            return (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={isMet ? "#10b981" : "#8b5cf6"}
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
                                <div className="grid grid-cols-2 gap-2 bg-purple-50/50 p-3 rounded-xl border border-purple-100">
                                    <div>
                                        <div className="text-[10px] text-slate-500 font-medium">
                                            {isDesaLevel ? "Capaian Puskesmas" : "Capaian Kabupaten"}
                                        </div>
                                        <div className="text-xl font-black text-purple-900 mt-0.5">
                                            {rankingStats.parentVal !== null ? `${rankingStats.parentVal}%` : "N/A"}
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
                            <div className="py-8 text-center text-slate-400 text-xs">
                                Tidak ada data peringkat.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Multi-Indicator Trend Chart */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm">Tren Temporal Indikator Utama ({year})</h3>
                        <p className="text-xs text-slate-400">
                            Perjalanan kumulatif indikator prioritas sepanjang tahun ({mode === "bulanan" ? "Jan - Des" : "TW I - TW IV"})
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
                            <Line type="monotone" dataKey="anemia" name="% Bumil Anemia" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="suplemen" name="% Suplementasi Gizi" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="kek" name="% Bumil KEK" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="k1" name="% K1 Murni" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detail Rekapitulasi Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800">
                                {isDesaLevel
                                    ? `Detail Rekapitulasi Indikator Ibu Hamil — Puskesmas ${selectedPuskesmas}`
                                    : "Detail Rekapitulasi Indikator Ibu Hamil per Puskesmas"}
                            </h3>
                            {isDesaLevel && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700">
                                    Tingkat Desa / Kelurahan
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400">
                            {isDesaLevel
                                ? `Daftar capaian 12 indikator program tingkat Desa/Kelurahan di wilayah Puskesmas ${selectedPuskesmas}`
                                : "Daftar capaian 12 indikator program seluruh Puskesmas"}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-60">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder={isDesaLevel ? "Cari Desa/Kelurahan..." : "Cari Puskesmas..."}
                                value={tableSearch}
                                onChange={(e) => {
                                    setTableSearch(e.target.value);
                                    setTablePage(1);
                                }}
                                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                            />
                        </div>

                        <button
                            onClick={() => handleExport("xlsx")}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors flex items-center gap-1.5"
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
                                <th className="py-3 px-3 text-center">% Anemia</th>
                                <th className="py-3 px-3 text-center">% TTD Ringan</th>
                                <th className="py-3 px-3 text-center">% Tatalaksana Sedang/Berat</th>
                                <th className="py-3 px-3 text-center">% Mendapat Suplemen</th>
                                <th className="py-3 px-3 text-center">% Konsumsi Suplemen</th>
                                <th className="py-3 px-3 text-center">% KEK</th>
                                <th className="py-3 px-3 text-center">% KEK PMT</th>
                                <th className="py-3 px-3 text-center">% K1 Murni</th>
                                <th className="py-3 px-3 text-center">% TM1 USG</th>
                                <th className="py-3 px-3 text-center">% TM3 USG</th>
                                <th className="py-3 px-3 text-center">% K6</th>
                                <th className="py-3 px-3 text-center">% 12T</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedTable.length === 0 ? (
                                <tr>
                                    <td colSpan={13} className="py-8 text-center text-slate-400">
                                        Tidak ada data yang cocok.
                                    </td>
                                </tr>
                            ) : (
                                paginatedTable.map((row) => (
                                    <tr key={row.name} className="hover:bg-purple-50/20 transition-colors">
                                        <td className="py-3 px-4 font-bold text-slate-800 sticky left-0 bg-white z-10">
                                            <div>{row.name}</div>
                                            {isDesaLevel && (
                                                <span className="text-[10px] text-slate-400 font-normal">Pusk. {row.puskesmas}</span>
                                            )}
                                        </td>
                                        {[
                                            "pct_anemia",
                                            "pct_anemia_mild_ttd",
                                            "pct_anemia_modsev_advanced",
                                            "pct_received_supplement",
                                            "pct_consumed_supplement",
                                            "pct_kek",
                                            "pct_kek_pmt",
                                            "pct_k1_pure",
                                            "pct_anc_t1_usg",
                                            "pct_anc_t3_usg",
                                            "pct_k6",
                                            "pct_anc_12t"
                                        ].map((k) => {
                                            const m = row.metrics.indicators[k as IndicatorKey];
                                            const isMet = m.status === "TARGET_MET";
                                            return (
                                                <td
                                                    key={k}
                                                    className={`py-3 px-3 text-center ${
                                                        m.value === null
                                                            ? "text-slate-300"
                                                            : isMet
                                                            ? "text-emerald-700 bg-emerald-50/20"
                                                            : "text-slate-700"
                                                    }`}
                                                >
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-bold text-xs">
                                                            {m.value !== null ? `${m.value}%` : "-"}
                                                        </span>
                                                        {m.value !== null && (
                                                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                                                                {m.numerator.toLocaleString("id-ID")} / {m.denominator.toLocaleString("id-ID")}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div>
                        Menampilkan {paginatedTable.length} dari {tableFiltered.length} {isDesaLevel ? "Desa/Kelurahan" : "Puskesmas"}
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            disabled={tablePage === 1}
                            onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40"
                        >
                            Prev
                        </button>
                        <span className="px-2 font-semibold text-slate-700">
                            {tablePage} / {totalTablePages}
                        </span>
                        <button
                            disabled={tablePage >= totalTablePages}
                            onClick={() => setTablePage((p) => Math.min(totalTablePages, p + 1))}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
