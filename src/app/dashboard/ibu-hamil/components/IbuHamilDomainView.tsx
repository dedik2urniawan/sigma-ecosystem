"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
    IbuHamilRawRecord,
    filterCumulativeData,
    aggregateRecords,
    aggregateByPuskesmas,
    aggregateByDesa,
    INDICATOR_DEFINITIONS,
    IndicatorKey,
    safePercent,
    PuskesmasSummaryRow
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
    PieChart,
    Pie,
    Legend,
    ReferenceLine,
    LineChart,
    Line
} from "recharts";
import {
    Activity,
    CheckCircle2,
    AlertCircle,
    Pill,
    HeartPulse,
    Apple,
    Stethoscope,
    SlidersHorizontal,
    Search,
    Download
} from "lucide-react";
import * as XLSX from "xlsx";

interface IbuHamilDomainViewProps {
    domain: "anemia" | "suplemen" | "kek" | "anc";
    allRecords: IbuHamilRawRecord[];
    year: string;
    mode: "bulanan" | "triwulan";
    periodVal: number;
    selectedPuskesmas: string;
    setSelectedPuskesmas: (p: string) => void;
    selectedKelurahan: string;
    setSelectedKelurahan?: (k: string) => void;
}

export default function IbuHamilDomainView({
    domain,
    allRecords,
    year,
    mode,
    periodVal,
    selectedPuskesmas,
    setSelectedPuskesmas,
    selectedKelurahan,
    setSelectedKelurahan
}: IbuHamilDomainViewProps) {
    // Domain indicator lists
    const domainIndicators: Record<string, IndicatorKey[]> = {
        anemia: ["pct_anemia", "pct_anemia_mild_ttd", "pct_anemia_modsev_advanced"],
        suplemen: ["pct_received_supplement", "pct_consumed_supplement"],
        kek: ["pct_kek", "pct_kek_pmt"],
        anc: ["pct_k1_pure", "pct_anc_t1_usg", "pct_anc_t3_usg", "pct_k6", "pct_anc_12t"]
    };

    const currentDomainKeys = domainIndicators[domain] || [];
    const [activeChartIndicator, setActiveChartIndicator] = useState<IndicatorKey>(currentDomainKeys[0]);

    useEffect(() => {
        if (currentDomainKeys.length > 0 && !currentDomainKeys.includes(activeChartIndicator)) {
            setActiveChartIndicator(currentDomainKeys[0]);
        }
    }, [domain, currentDomainKeys, activeChartIndicator]);

    const [sortAscending, setSortAscending] = useState(false);
    const [tableSearch, setTableSearch] = useState("");
    const [tablePage, setTablePage] = useState(1);
    const pageSize = 10;

    // Filter by year
    const yearRecords = useMemo(() => allRecords.filter((r) => String(r.tahun) === year), [allRecords, year]);
    const { filteredRecords, freshnessMap } = useMemo(
        () => filterCumulativeData(yearRecords, mode, periodVal),
        [yearRecords, mode, periodVal]
    );

    // Active records filtered by Puskesmas and Kelurahan
    const activeRecords = useMemo(() => {
        let recs = filteredRecords;
        if (selectedPuskesmas !== "ALL") {
            recs = recs.filter((r) => r.puskesmas.toLowerCase().trim() === selectedPuskesmas.toLowerCase().trim());
        }
        if (selectedKelurahan !== "ALL") {
            recs = recs.filter((r) => r.kelurahan.toLowerCase().trim() === selectedKelurahan.toLowerCase().trim());
        }
        return recs;
    }, [filteredRecords, selectedPuskesmas, selectedKelurahan]);

    const agg = useMemo(() => aggregateRecords(activeRecords), [activeRecords]);
    const counts = agg.counts;

    const isDesaLevel = selectedPuskesmas !== "ALL";

    // Active breakdown rows: per Desa if a Puskesmas is selected, per Puskesmas if ALL
    const activeBreakdownRows = useMemo(() => {
        if (isDesaLevel) {
            const scoped = filteredRecords.filter(
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
            return aggregateByPuskesmas(filteredRecords, freshnessMap).map((p) => ({
                id: p.puskesmas,
                name: p.puskesmas,
                puskesmas: p.puskesmas,
                desaCount: p.desaCount,
                metrics: p.metrics
            }));
        }
    }, [filteredRecords, freshnessMap, isDesaLevel, selectedPuskesmas]);

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
        const parentVal = agg.indicators[activeChartIndicator].value;

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
    }, [chartData, activeChartIndicator, agg, isDesaLevel]);

    // Temporal trend data for domain indicators
    const trendData = useMemo(() => {
        const points: Record<string, any>[] = [];
        const quarters = [1, 2, 3, 4];
        const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        const mNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
        const qNames = ["TW I", "TW II", "TW III", "TW IV"];

        const periods = mode === "bulanan" ? months : quarters;

        periods.forEach((p, idx) => {
            const { filteredRecords: pRecs } = filterCumulativeData(yearRecords, mode, p);
            const scoped = selectedPuskesmas === "ALL"
                ? pRecs
                : pRecs.filter((r) => r.puskesmas.toLowerCase().trim() === selectedPuskesmas.toLowerCase().trim());
            const pAgg = aggregateRecords(scoped);

            const pt: Record<string, any> = {
                name: mode === "bulanan" ? mNames[idx] : qNames[idx]
            };

            currentDomainKeys.forEach((k) => {
                pt[k] = pAgg.indicators[k].value;
            });

            points.push(pt);
        });

        return points;
    }, [yearRecords, mode, selectedPuskesmas, currentDomainKeys]);

    // Export Excel / CSV for current domain
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

            currentDomainKeys.forEach((k) => {
                const def = INDICATOR_DEFINITIONS[k];
                const metric = r.metrics.indicators[k];
                baseRow[def.label] = metric.value !== null ? `${metric.value}%` : "N/A";
                baseRow[`${def.shortLabel} (Numerator)`] = metric.numerator;
                baseRow[`${def.shortLabel} (Denominator)`] = metric.denominator;
            });

            return baseRow;
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        const sheetTitle = isDesaLevel
            ? `Rekap Desa ${selectedPuskesmas.slice(0, 10)}`
            : `Rekap ${domain.toUpperCase()}`;
        XLSX.utils.book_append_sheet(wb, ws, sheetTitle);

        const filePrefix = isDesaLevel
            ? `Rekap_Ibu_Hamil_${domain.toUpperCase()}_Desa_${selectedPuskesmas}_${year}_${mode}_${periodVal}`
            : `Rekap_Ibu_Hamil_${domain.toUpperCase()}_${year}_${mode}_${periodVal}`;

        if (format === "xlsx") {
            XLSX.writeFile(wb, `${filePrefix}.xlsx`);
        } else {
            XLSX.writeFile(wb, `${filePrefix}.csv`, { bookType: "csv" });
        }
    };

    // Table search and pagination
    const tableFiltered = useMemo(() => {
        return activeBreakdownRows.filter((r) => r.name.toLowerCase().includes(tableSearch.toLowerCase()));
    }, [activeBreakdownRows, tableSearch]);

    const paginatedTable = useMemo(() => {
        const start = (tablePage - 1) * pageSize;
        return tableFiltered.slice(start, start + pageSize);
    }, [tableFiltered, tablePage]);

    const totalTablePages = Math.ceil(tableFiltered.length / pageSize) || 1;

    // Line colors for trend chart
    const lineColors = ["#8b5cf6", "#10b981", "#f59e0b", "#06b6d4", "#ec4899"];

    return (
        <div className="space-y-6">
            {/* ── 1. DOMAIN SPECIFIC CHARTS & METRICS ── */}

            {/* ANEMIA DOMAIN */}
            {domain === "anemia" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">% Prevalensi Anemia</div>
                            <div className="text-3xl font-black text-slate-800 mt-1">
                                {agg.indicators.pct_anemia.value !== null ? `${agg.indicators.pct_anemia.value}%` : "N/A"}
                            </div>
                            <div className="mt-2 text-xs text-slate-500">
                                Target Nasional 2026: <span className="font-bold text-slate-700">≤ 25%</span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-600">
                                <span>Total Anemia: <strong className="text-slate-800">{counts.anemia_total.toLocaleString()}</strong></span>
                                <span>Periksa Hb: <strong className="text-slate-800">{counts.hb_checked.toLocaleString()}</strong></span>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">% TTD Anemia Ringan</div>
                            <div className="text-3xl font-black text-emerald-600 mt-1">
                                {agg.indicators.pct_anemia_mild_ttd.value !== null ? `${agg.indicators.pct_anemia_mild_ttd.value}%` : "N/A"}
                            </div>
                            <div className="mt-2 text-xs text-slate-500">
                                Target 2026: <span className="font-bold text-slate-700">≥ 50%</span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-600">
                                <span>Dapat TTD: <strong className="text-slate-800">{counts.anemia_mild_ttd.toLocaleString()}</strong></span>
                                <span>Kasus Ringan: <strong className="text-slate-800">{counts.anemia_mild.toLocaleString()}</strong></span>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">% Tatalaksana Sedang / Berat</div>
                            <div className="text-3xl font-black text-purple-600 mt-1">
                                {agg.indicators.pct_anemia_modsev_advanced.value !== null ? `${agg.indicators.pct_anemia_modsev_advanced.value}%` : "N/A"}
                            </div>
                            <div className="mt-2 text-xs text-slate-500">
                                Target 2026: <span className="font-bold text-slate-700">≥ 50%</span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-600">
                                <span>Ditatalaksana: <strong className="text-slate-800">{counts.anemia_modsev_advanced.toLocaleString()}</strong></span>
                                <span>Kasus Sedang+Berat: <strong className="text-slate-800">{(counts.anemia_moderate + counts.anemia_severe).toLocaleString()}</strong></span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm">Distribusi Tingkat Keparahan Anemia Ibu Hamil</h3>
                                <p className="text-xs text-slate-400">Proporsi kasus anemia berdasarkan kadar Hb</p>
                            </div>
                            <div className="h-[260px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: "Anemia Ringan (10-10.9 g/dl)", value: counts.anemia_mild, color: "#f59e0b" },
                                                { name: "Anemia Sedang (7-9.9 g/dl)", value: counts.anemia_moderate, color: "#f97316" },
                                                { name: "Anemia Berat (< 7 g/dl)", value: counts.anemia_severe, color: "#ef4444" }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={4}
                                            dataKey="value"
                                            label={({ percent }: any) => `${((percent ?? 0) * 100).toFixed(1)}%`}
                                        >
                                            <Cell fill="#f59e0b" />
                                            <Cell fill="#f97316" />
                                            <Cell fill="#ef4444" />
                                        </Pie>
                                        <RechartsTooltip formatter={(val: any) => [Number(val).toLocaleString(), "Kasus"]} />
                                        <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm">Capaian Tatalaksana Kasus Anemia</h3>
                                <p className="text-xs text-slate-400">Kepatuhan intervensi TTD oral dan rujukan lanjutan</p>
                            </div>
                            <div className="h-[260px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[
                                            {
                                                name: "Anemia Ringan",
                                                pct: safePercent(counts.anemia_mild_ttd, counts.anemia_mild) ?? 0,
                                                target: 50
                                            },
                                            {
                                                name: "Anemia Sedang & Berat",
                                                pct: safePercent(counts.anemia_modsev_advanced, counts.anemia_moderate + counts.anemia_severe) ?? 0,
                                                target: 50
                                            }
                                        ]}
                                        margin={{ top: 20, right: 30, left: -10, bottom: 20 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${v}%`} />
                                        <RechartsTooltip formatter={(val: any) => [`${val}%`, "Capaian"]} />
                                        <ReferenceLine y={50} stroke="#dc2626" strokeDasharray="4 4" label={{ value: "Target: ≥50%", fill: "#dc2626", fontSize: 10 }} />
                                        <Bar dataKey="pct" radius={[6, 6, 0, 0]} fill="#8b5cf6" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SUPLEMEN DOMAIN */}
            {domain === "suplemen" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">% Mendapat Suplementasi (≥180 Tab)</div>
                            <div className="text-3xl font-black text-purple-700 mt-1">
                                {agg.indicators.pct_received_supplement.value !== null ? `${agg.indicators.pct_received_supplement.value}%` : "N/A"}
                            </div>
                            <div className="mt-2 text-xs text-slate-500">Target 2026: <strong className="text-slate-800">≥ 92%</strong></div>
                            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 flex justify-between">
                                <span>MMS: <strong>{counts.received_mms_180.toLocaleString()}</strong></span>
                                <span>TTD: <strong>{counts.received_ttd_180.toLocaleString()}</strong></span>
                                <span>Sasaran: <strong>{counts.target_pregnant.toLocaleString()}</strong></span>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">% Mengonsumsi Suplementasi (≥180 Tab)</div>
                            <div className="text-3xl font-black text-emerald-600 mt-1">
                                {agg.indicators.pct_consumed_supplement.value !== null ? `${agg.indicators.pct_consumed_supplement.value}%` : "N/A"}
                            </div>
                            <div className="mt-2 text-xs text-slate-500">Target 2026: <strong className="text-slate-800">≥ 52%</strong></div>
                            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 flex justify-between">
                                <span>MMS: <strong>{counts.consumed_mms_180.toLocaleString()}</strong></span>
                                <span>TTD: <strong>{counts.consumed_ttd_180.toLocaleString()}</strong></span>
                                <span>Sasaran: <strong>{counts.target_pregnant.toLocaleString()}</strong></span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm">Perbandingan Suplementasi MMS vs TTD (Minimal 180 Tablet)</h3>
                            <p className="text-xs text-slate-400">Pemberian vs Kepatuhan Konsumsi Ibu Hamil</p>
                        </div>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={[
                                        {
                                            kategori: "Mendapat (≥180 Tab)",
                                            MMS: counts.received_mms_180,
                                            TTD: counts.received_ttd_180
                                        },
                                        {
                                            kategori: "Mengonsumsi (≥180 Tab)",
                                            MMS: counts.consumed_mms_180,
                                            TTD: counts.consumed_ttd_180
                                        }
                                    ]}
                                    margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="kategori" tick={{ fontSize: 12, fill: "#64748b" }} />
                                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                                    <RechartsTooltip formatter={(val: any) => [Number(val).toLocaleString(), "Bumil"]} />
                                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                                    <Bar dataKey="MMS" name="Tablet MMS" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="TTD" name="Tablet Tambah Darah (TTD)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* KEK DOMAIN */}
            {domain === "kek" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">% Ibu Hamil KEK / Risiko KEK</div>
                            <div className="text-3xl font-black text-rose-600 mt-1">
                                {agg.indicators.pct_kek.value !== null ? `${agg.indicators.pct_kek.value}%` : "N/A"}
                            </div>
                            <div className="mt-2 text-xs text-slate-500">Target 2026: <strong className="text-slate-800">≤ 13%</strong></div>
                            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-600">
                                <span>Bumil KEK: <strong>{counts.kek_risk.toLocaleString()}</strong></span>
                                <span>Diukur LILA/IMT: <strong>{counts.lila_imt_measured.toLocaleString()}</strong></span>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">% KEK Mendapat PMT</div>
                            <div className="text-3xl font-black text-emerald-600 mt-1">
                                {agg.indicators.pct_kek_pmt.value !== null ? `${agg.indicators.pct_kek_pmt.value}%` : "N/A"}
                            </div>
                            <div className="mt-2 text-xs text-slate-500">Target 2026: <strong className="text-slate-800">≥ 85%</strong></div>
                            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-600">
                                <span>Dapat PMT: <strong>{counts.kek_received_pmt.toLocaleString()}</strong></span>
                                <span>Sasaran Ditatalaksana: <strong>{counts.kek_management_target.toLocaleString()}</strong></span>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cakupan Pengukuran LILA/IMT</div>
                            <div className="text-3xl font-black text-slate-800 mt-1">
                                {counts.lila_imt_measured.toLocaleString("id-ID")}
                            </div>
                            <div className="mt-2 text-xs text-slate-500">Dari total sasaran: <strong className="text-slate-800">{counts.target_pregnant.toLocaleString()}</strong></div>
                            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                                Standar: LILA &lt; 23.5 cm atau IMT TM1 &lt; 18.5
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm">Proporsi Hasil Skrining LILA/IMT Ibu Hamil</h3>
                            <p className="text-xs text-slate-400">Bumil status gizi normal vs risiko KEK</p>
                        </div>
                        <div className="h-[260px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: "Risiko KEK / KEK", value: counts.kek_risk, color: "#ef4444" },
                                            { name: "Normal (Tidak KEK)", value: Math.max(0, counts.lila_imt_measured - counts.kek_risk), color: "#10b981" }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={4}
                                        dataKey="value"
                                        label={({ percent }: any) => `${((percent ?? 0) * 100).toFixed(1)}%`}
                                    >
                                        <Cell fill="#ef4444" />
                                        <Cell fill="#10b981" />
                                    </Pie>
                                    <RechartsTooltip formatter={(val: any) => [Number(val).toLocaleString(), "Bumil"]} />
                                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* ANC DOMAIN */}
            {domain === "anc" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <div className="text-[11px] text-slate-400 font-medium">K1 Murni (Target ≥89%)</div>
                            <div className="text-2xl font-black text-purple-700 mt-1">
                                {agg.indicators.pct_k1_pure.value !== null ? `${agg.indicators.pct_k1_pure.value}%` : "N/A"}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1">{counts.k1_pure.toLocaleString()} bumil</div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <div className="text-[11px] text-slate-400 font-medium">ANC TM1 USG (Target ≥85%)</div>
                            <div className="text-2xl font-black text-emerald-600 mt-1">
                                {agg.indicators.pct_anc_t1_usg.value !== null ? `${agg.indicators.pct_anc_t1_usg.value}%` : "N/A"}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1">{counts.anc_t1_usg.toLocaleString()} bumil</div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <div className="text-[11px] text-slate-400 font-medium">K6 Lengkap (Target ≥82%)</div>
                            <div className="text-2xl font-black text-blue-600 mt-1">
                                {agg.indicators.pct_k6.value !== null ? `${agg.indicators.pct_k6.value}%` : "N/A"}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1">{counts.k6_delivery.toLocaleString()} bersalin</div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <div className="text-[11px] text-slate-400 font-medium">Pemeriksaan 12T (Target ≥66%)</div>
                            <div className="text-2xl font-black text-amber-600 mt-1">
                                {agg.indicators.pct_anc_12t.value !== null ? `${agg.indicators.pct_anc_12t.value}%` : "N/A"}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1">{counts.anc_12t_delivery.toLocaleString()} bersalin</div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm">Kaskade Pelayanan Antenatal (ANC Care Continuum)</h3>
                            <p className="text-xs text-slate-400">
                                Cakupan dari kunjungan pertama hingga penyelesaian standar 12T sebelum bersalin
                            </p>
                        </div>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={[
                                        { tahap: "K1 Akses", pct: safePercent(counts.k1_access, counts.target_pregnant) ?? 0, target: null },
                                        { tahap: "K1 Murni", pct: agg.indicators.pct_k1_pure.value ?? 0, target: 89 },
                                        { tahap: "ANC TM1 USG", pct: agg.indicators.pct_anc_t1_usg.value ?? 0, target: 85 },
                                        { tahap: "ANC TM3 USG", pct: agg.indicators.pct_anc_t3_usg.value ?? 0, target: 84 },
                                        { tahap: "K6 Bersalin", pct: agg.indicators.pct_k6.value ?? 0, target: 82 },
                                        { tahap: "Standar 12T", pct: agg.indicators.pct_anc_12t.value ?? 0, target: 66 }
                                    ]}
                                    margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="tahap" tick={{ fontSize: 11, fill: "#64748b" }} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `${v}%`} />
                                    <RechartsTooltip formatter={(val: any) => [`${val}%`, "Cakupan"]} />
                                    <Bar dataKey="pct" radius={[6, 6, 0, 0]} fill="#8b5cf6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 2. CAPAIAN PER PUSKESMAS & DISTRIBUSI PERINGKAT (REQUESTED IN POINT 5) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-purple-600" />
                                <span className="font-bold text-slate-900 text-sm">
                                    {isDesaLevel ? `Capaian per Desa (${selectedPuskesmas}):` : "Capaian per Puskesmas:"}
                                </span>
                                <select
                                    value={activeChartIndicator}
                                    onChange={(e) => setActiveChartIndicator(e.target.value as IndicatorKey)}
                                    className="text-xs font-bold text-purple-700 bg-purple-50/80 border border-purple-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 max-w-[280px] truncate"
                                >
                                    {currentDomainKeys.map((k) => (
                                        <option key={k} value={k}>
                                            {INDICATOR_DEFINITIONS[k].label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                                Target: {INDICATOR_DEFINITIONS[activeChartIndicator].direction === "lower" ? "≤" : "≥"}{" "}
                                {INDICATOR_DEFINITIONS[activeChartIndicator].target}% •{" "}
                                {isDesaLevel
                                    ? `Menampilkan ${chartData.length} desa/kelurahan di Puskesmas ${selectedPuskesmas}`
                                    : "Klik batang untuk filter Puskesmas"}
                            </p>
                        </div>

                        <button
                            onClick={() => setSortAscending(!sortAscending)}
                            className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 flex items-center gap-1"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            {sortAscending ? "Nilai Terendah" : "Nilai Tertinggi"}
                        </button>
                    </div>

                    <div className="h-[350px] w-full">
                        {chartData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                                Tidak ada data untuk ditampilkan.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        angle={-45}
                                        textAnchor="end"
                                        interval={0}
                                        height={70}
                                        tick={{ fontSize: 10, fill: "#64748b" }}
                                    />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `${v}%`} />
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
                                            } else if (isDesaLevel && entry?.name && setSelectedKelurahan) {
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

                {/* Distribution & Ranking Stats */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="border-b border-slate-100 pb-3">
                            <h3 className="font-bold text-slate-800 text-sm">
                                {isDesaLevel ? `Distribusi & Peringkat Desa (${selectedPuskesmas})` : "Distribusi & Peringkat Puskesmas"}
                            </h3>
                            <p className="text-xs text-slate-400">
                                {isDesaLevel
                                    ? `Analisis statistik capaian antar desa di ${selectedPuskesmas}`
                                    : `Analisis perbandingan indikator ${INDICATOR_DEFINITIONS[activeChartIndicator].shortLabel}`}
                            </p>
                        </div>

                        {rankingStats ? (
                            <>
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

                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-emerald-700">
                                        {rankingStats.direction === "lower"
                                            ? (isDesaLevel ? "3 Desa Prevalensi Terendah" : "3 Prevalensi Terendah")
                                            : (isDesaLevel ? "3 Desa Capaian Tertinggi" : "3 Capaian Tertinggi")}
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

                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-rose-700">
                                        {rankingStats.direction === "lower"
                                            ? (isDesaLevel ? "3 Desa Prevalensi Tertinggi" : "3 Prevalensi Tertinggi")
                                            : (isDesaLevel ? "3 Desa Capaian Terendah" : "3 Capaian Terendah")}
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
                            <div className="py-8 text-center text-slate-400 text-xs">Tidak ada data.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── 3. TREN TEMPORAL INDIKATOR SUBTAB (REQUESTED IN POINT 5) ── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                        Tren Temporal Indikator {domain.toUpperCase()} ({year})
                    </h3>
                    <p className="text-xs text-slate-400">
                        Perkembangan kumulatif capaian sepanjang {mode === "bulanan" ? "Januari - Desember" : "Triwulan I - IV"}
                    </p>
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
                            {currentDomainKeys.map((k, idx) => (
                                <Line
                                    key={k}
                                    type="monotone"
                                    dataKey={k}
                                    name={INDICATOR_DEFINITIONS[k].shortLabel}
                                    stroke={lineColors[idx % lineColors.length]}
                                    strokeWidth={2.5}
                                    dot={{ r: 3 }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── 4. DETAIL REKAPITULASI DENGAN % + NUMERATOR & DENOMINATOR (REQUESTED IN POINT 5) ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800">
                                {isDesaLevel
                                    ? `Detail Rekapitulasi Indikator ${domain.toUpperCase()} — Puskesmas ${selectedPuskesmas}`
                                    : `Detail Rekapitulasi Indikator ${domain.toUpperCase()} per Puskesmas`}
                            </h3>
                            {isDesaLevel && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700">
                                    Tingkat Desa / Kelurahan
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400">
                            {isDesaLevel
                                ? `Menampilkan % capaian serta rincian angka Numerator dan Denominator tingkat Desa di ${selectedPuskesmas}`
                                : "Menampilkan % capaian serta rincian angka Numerator dan Denominator seluruh Puskesmas"}
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
                                <th className="py-3 px-3 text-center">
                                    {isDesaLevel ? "Puskesmas Induk" : "Desa Terdata"}
                                </th>
                                {currentDomainKeys.map((k) => (
                                    <th key={k} className="py-3 px-3 text-center min-w-[130px]">
                                        <div>{INDICATOR_DEFINITIONS[k].label}</div>
                                        <div className="text-[10px] font-normal text-slate-400">
                                            ({INDICATOR_DEFINITIONS[k].numeratorLabel} / {INDICATOR_DEFINITIONS[k].denominatorLabel})
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedTable.length === 0 ? (
                                <tr>
                                    <td colSpan={2 + currentDomainKeys.length} className="py-8 text-center text-slate-400">
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
                                        <td className="py-3 px-3 text-center text-slate-500 font-semibold">
                                            {isDesaLevel ? row.puskesmas : row.desaCount}
                                        </td>
                                        {currentDomainKeys.map((k) => {
                                            const m = row.metrics.indicators[k];
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
                                                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">
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
