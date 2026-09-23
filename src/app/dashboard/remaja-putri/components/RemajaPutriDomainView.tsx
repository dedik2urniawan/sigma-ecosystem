"use client";

import React, { useMemo, useState } from "react";
import {
    RemajaPutriRawRecord,
    filterRemajaPutriRecords,
    calculateKabupatenTotals,
    aggregateByPuskesmas,
    aggregateByDesa,
    formatPercent,
    formatNumber
} from "@/lib/remajaPutriHelper";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line
} from "recharts";
import {
    Pill,
    Stethoscope,
    HeartPulse,
    Activity,
    CheckCircle2,
    AlertCircle,
    Info,
    Search,
    Download,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import * as XLSX from "xlsx";

interface RemajaPutriDomainViewProps {
    domain: "ttd" | "skrining" | "anemia" | "tatalaksana";
    allRecords: RemajaPutriRawRecord[];
    year: string;
    mode: "bulanan" | "triwulan" | "tahun_ajaran";
    periodVal: number;
    selectedPuskesmas: string;
    setSelectedPuskesmas: (p: string) => void;
    selectedKelurahan: string;
    setSelectedKelurahan: (k: string) => void;
}

export default function RemajaPutriDomainView({
    domain,
    allRecords,
    year,
    mode,
    periodVal,
    selectedPuskesmas,
    setSelectedPuskesmas,
    selectedKelurahan,
    setSelectedKelurahan
}: RemajaPutriDomainViewProps) {
    const isDesaLevel = selectedPuskesmas !== "ALL";

    // Table state for search & pagination
    const [tableSearch, setTableSearch] = useState("");
    const [tablePage, setTablePage] = useState(1);
    const pageSize = 10;

    // Filtered records for current period
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

    // Active records for current selection
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

    const currentTotals = useMemo(() => {
        return calculateKabupatenTotals(activeRecords);
    }, [activeRecords]);

    // Breakdown for ranking/bars & table
    const breakdownRows = useMemo(() => {
        if (isDesaLevel) {
            return aggregateByDesa(currentPeriodRecords, selectedPuskesmas);
        } else {
            return aggregateByPuskesmas(currentPeriodRecords);
        }
    }, [currentPeriodRecords, isDesaLevel, selectedPuskesmas]);

    // Temporal trend data calculation across periods (scoped to selected Puskesmas)
    const trendData = useMemo(() => {
        const points: {
            name: string;
            pct_ttd_received: number;
            pct_ttd_consumed: number;
            pct_screening_anemia: number;
            pct_screening_grade7: number;
            pct_screening_grade10: number;
            pct_anemia: number;
            pct_anemia_grade7: number;
            pct_anemia_grade10: number;
            pct_anemia_treated: number;
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
                    pct_ttd_received: Math.round(totals.pct_ttd_received * 10) / 10,
                    pct_ttd_consumed: Math.round(totals.pct_ttd_consumed * 10) / 10,
                    pct_screening_anemia: Math.round(totals.pct_screening_anemia * 10) / 10,
                    pct_screening_grade7: Math.round(totals.pct_screening_grade7 * 10) / 10,
                    pct_screening_grade10: Math.round(totals.pct_screening_grade10 * 10) / 10,
                    pct_anemia: Math.round(totals.pct_anemia * 10) / 10,
                    pct_anemia_grade7: Math.round(totals.pct_anemia_grade7 * 10) / 10,
                    pct_anemia_grade10: Math.round(totals.pct_anemia_grade10 * 10) / 10,
                    pct_anemia_treated: Math.round(totals.pct_anemia_treated * 10) / 10,
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
                    pct_ttd_received: Math.round(totals.pct_ttd_received * 10) / 10,
                    pct_ttd_consumed: Math.round(totals.pct_ttd_consumed * 10) / 10,
                    pct_screening_anemia: Math.round(totals.pct_screening_anemia * 10) / 10,
                    pct_screening_grade7: Math.round(totals.pct_screening_grade7 * 10) / 10,
                    pct_screening_grade10: Math.round(totals.pct_screening_grade10 * 10) / 10,
                    pct_anemia: Math.round(totals.pct_anemia * 10) / 10,
                    pct_anemia_grade7: Math.round(totals.pct_anemia_grade7 * 10) / 10,
                    pct_anemia_grade10: Math.round(totals.pct_anemia_grade10 * 10) / 10,
                    pct_anemia_treated: Math.round(totals.pct_anemia_treated * 10) / 10,
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
                    pct_ttd_received: Math.round(totals.pct_ttd_received * 10) / 10,
                    pct_ttd_consumed: Math.round(totals.pct_ttd_consumed * 10) / 10,
                    pct_screening_anemia: Math.round(totals.pct_screening_anemia * 10) / 10,
                    pct_screening_grade7: Math.round(totals.pct_screening_grade7 * 10) / 10,
                    pct_screening_grade10: Math.round(totals.pct_screening_grade10 * 10) / 10,
                    pct_anemia: Math.round(totals.pct_anemia * 10) / 10,
                    pct_anemia_grade7: Math.round(totals.pct_anemia_grade7 * 10) / 10,
                    pct_anemia_grade10: Math.round(totals.pct_anemia_grade10 * 10) / 10,
                    pct_anemia_treated: Math.round(totals.pct_anemia_treated * 10) / 10,
                });
            });
        }

        return points;
    }, [allRecords, mode, year, selectedPuskesmas]);

    // Table rows with search filter
    const filteredRows = useMemo(() => {
        if (!tableSearch.trim()) return breakdownRows;
        const q = tableSearch.toLowerCase().trim();
        return breakdownRows.filter(
            (r) =>
                r.entity_name.toLowerCase().includes(q) ||
                (r.puskesmas && r.puskesmas.toLowerCase().includes(q))
        );
    }, [breakdownRows, tableSearch]);

    const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
    const paginatedRows = useMemo(() => {
        const start = (tablePage - 1) * pageSize;
        return filteredRows.slice(start, start + pageSize);
    }, [filteredRows, tablePage]);

    // Export handler
    const handleExport = (format: "xlsx" | "csv") => {
        let exportData: Record<string, any>[] = [];

        if (domain === "ttd") {
            exportData = filteredRows.map((r, idx) => ({
                No: idx + 1,
                [isDesaLevel ? "Desa / Kelurahan" : "Puskesmas"]: r.entity_name,
                ...(isDesaLevel ? { Puskesmas: r.puskesmas } : { "Desa Terdata": r.record_count }),
                "Sasaran Rematri": r.target_rematri,
                "% Mendapat TTD": `${r.pct_ttd_received}%`,
                "Jumlah Mendapat TTD": r.ttd_received_standard,
                "% Konsumsi Sesuai Standar": `${r.pct_ttd_consumed}%`,
                "Jumlah Konsumsi Sesuai Standar": r.ttd_consumed_standard,
                "Konsumsi >= 26 Tablet": r.ttd_consumed_ge26,
                "Konsumsi < 26 Tablet": r.ttd_consumed_lt26,
                "Status Target (>=67%)": r.pct_ttd_consumed >= 67 ? "Tercapai" : "Belum Tercapai"
            }));
        } else if (domain === "skrining") {
            exportData = filteredRows.map((r, idx) => ({
                No: idx + 1,
                [isDesaLevel ? "Desa / Kelurahan" : "Puskesmas"]: r.entity_name,
                ...(isDesaLevel ? { Puskesmas: r.puskesmas } : { "Desa Terdata": r.record_count }),
                "Total Sasaran Kls 7 & 10": r.target_grade7_10,
                "% Skrining Gabungan": `${r.pct_screening_anemia}%`,
                "Diskrining Gabungan": r.screened_grade7_10,
                "% Skrining Kls 7": `${r.pct_screening_grade7}%`,
                "Diskrining Kls 7": r.screened_grade7,
                "Sasaran Kls 7": r.target_grade7,
                "% Skrining Kls 10": `${r.pct_screening_grade10}%`,
                "Diskrining Kls 10": r.screened_grade10,
                "Sasaran Kls 10": r.target_grade10,
                "Belum Diskrining": Math.max(0, r.target_grade7_10 - r.screened_grade7_10),
                "Status Target (>=77%)": r.pct_screening_anemia >= 77 ? "Tercapai" : "Belum Tercapai"
            }));
        } else if (domain === "anemia") {
            exportData = filteredRows.map((r, idx) => ({
                No: idx + 1,
                [isDesaLevel ? "Desa / Kelurahan" : "Puskesmas"]: r.entity_name,
                ...(isDesaLevel ? { Puskesmas: r.puskesmas } : { "Desa Terdata": r.record_count }),
                "Siswi Diskrining": r.screened_grade7_10,
                "% Prevalensi Anemia": `${r.pct_anemia}%`,
                "Total Kasus Anemia": r.anemia_total,
                "Anemia Ringan (11-11.9)": r.anemia_mild_total,
                "% Ringan": `${r.pct_mild_share}%`,
                "Anemia Sedang (8-10.9)": r.anemia_moderate_total,
                "% Sedang": `${r.pct_moderate_share}%`,
                "Anemia Berat (<8)": r.anemia_severe_total,
                "% Berat": `${r.pct_severe_share}%`,
                "Kasus Kls 7": r.anemia_grade7_total,
                "Kasus Kls 10": r.anemia_grade10_total,
                "Status Prevalensi (<=23%)": r.pct_anemia <= 23 ? "Terkendali" : "Waspada"
            }));
        } else {
            exportData = filteredRows.map((r, idx) => ({
                No: idx + 1,
                [isDesaLevel ? "Desa / Kelurahan" : "Puskesmas"]: r.entity_name,
                ...(isDesaLevel ? { Puskesmas: r.puskesmas } : { "Desa Terdata": r.record_count }),
                "Total Kasus Anemia": r.anemia_total,
                "% Tatalaksana": `${r.pct_anemia_treated}%`,
                "Kasus Ditatalaksana": r.anemia_treated,
                "Belum Ditatalaksana": Math.max(0, r.anemia_total - r.anemia_treated),
                "Status Target (>=40%)": r.pct_anemia_treated >= 40 ? "Tercapai" : "Belum Tercapai"
            }));
        }

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Rekap_${domain.toUpperCase()}`);
        XLSX.writeFile(wb, `Rekap_RemajaPutri_${domain.toUpperCase()}_${year}_${new Date().toISOString().slice(0, 10)}.${format}`);
    };

    // Shared table pagination component
    const renderPagination = () => (
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
                Menampilkan {filteredRows.length === 0 ? 0 : (tablePage - 1) * pageSize + 1} -{" "}
                {Math.min(tablePage * pageSize, filteredRows.length)} dari {filteredRows.length}{" "}
                {isDesaLevel ? "desa/kelurahan" : "puskesmas"}
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                    disabled={tablePage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 font-semibold text-slate-700">
                    Halaman {tablePage} / {totalPages}
                </span>
                <button
                    onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                    disabled={tablePage >= totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );

    // Shared search & export header
    const renderTableHeader = (title: string, subtitle: string) => (
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800">{title}</h3>
                    {isDesaLevel && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700">
                            Tingkat Desa / Kelurahan
                        </span>
                    )}
                </div>
                <p className="text-xs text-slate-400">{subtitle}</p>
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
    );

    // =========================================================================
    // DOMAIN 1: TABLET TAMBAH DARAH (TTD)
    // =========================================================================
    if (domain === "ttd") {
        return (
            <div className="space-y-6">
                {/* Domain Header Card */}
                <div className="bg-gradient-to-r from-pink-500 to-rose-600 rounded-2xl p-6 text-white shadow-lg shadow-pink-200">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                            <Pill className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">
                                Suplementasi Tablet Tambah Darah (TTD) Remaja Putri
                            </h2>
                            <p className="text-xs text-pink-100 mt-1">
                                Pemantauan distribusi dan konsumsi mingguan TTD pada siswi SMP/MTs dan SMA/SMK/MA (Standar: minimal 26 tablet per tahun).
                            </p>
                        </div>
                    </div>
                </div>

                {/* Scorecards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Sasaran</span>
                        <div className="text-3xl font-black text-slate-900 mt-1">
                            {formatNumber(currentTotals.target_rematri)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Siswi di satuan pendidikan</div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">% Mendapat TTD</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                Distribusi
                            </span>
                        </div>
                        <div className="text-3xl font-black text-slate-900 mt-1">
                            {formatPercent(currentTotals.pct_ttd_received)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 font-mono">
                            {formatNumber(currentTotals.ttd_received_standard)} siswi terdistribusi
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-pink-200 p-5 shadow-sm bg-pink-50/20">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-pink-600">% Konsumsi Sesuai Standar</span>
                            {currentTotals.pct_ttd_consumed >= 67 ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Target ≥67%
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Target ≥67%
                                </span>
                            )}
                        </div>
                        <div className="text-3xl font-black text-pink-700 mt-1">
                            {formatPercent(currentTotals.pct_ttd_consumed)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 font-mono">
                            {formatNumber(currentTotals.ttd_consumed_standard)} siswi mengonsumsi
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Distribusi Dosis Konsumsi</span>
                        <div className="mt-2 space-y-1.5 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">≥ 26 tablet (standar):</span>
                                <span className="font-bold text-slate-800 font-mono">{formatNumber(currentTotals.ttd_consumed_ge26)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">&lt; 26 tablet:</span>
                                <span className="font-bold text-slate-800 font-mono">{formatNumber(currentTotals.ttd_consumed_lt26)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Comparative Chart */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm">
                        Perbandingan % Distribusi vs % Konsumsi TTD per {isDesaLevel ? "Desa" : "Puskesmas"}
                    </h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={breakdownRows.slice(0, 25).map((r) => ({
                                    name: r.entity_name,
                                    dapat: Math.round(r.pct_ttd_received * 10) / 10,
                                    konsumsi: Math.round(r.pct_ttd_consumed * 10) / 10
                                }))}
                                margin={{ top: 10, right: 10, left: -15, bottom: 40 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={70} tick={{ fontSize: 10, fill: "#64748b" }} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `${v}%`} />
                                <RechartsTooltip formatter={(val) => `${val}%`} />
                                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                                <Bar dataKey="dapat" name="% Mendapat TTD" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="konsumsi" name="% Konsumsi TTD (≥67%)" fill="#ec4899" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ── TREN TEMPORAL TTD ── */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm">
                            Tren Temporal Suplementasi TTD ({year})
                        </h3>
                        <p className="text-xs text-slate-400">
                            Perkembangan kumulatif distribusi dan konsumsi standar TTD sepanjang {mode === "bulanan" ? "Januari - Desember" : mode === "triwulan" ? "Triwulan I - IV" : "Semester Ganjil - Genap"}
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
                                <Line
                                    type="monotone"
                                    dataKey="pct_ttd_received"
                                    name="% Mendapat TTD"
                                    stroke="#3b82f6"
                                    strokeWidth={2.5}
                                    dot={{ r: 3 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="pct_ttd_consumed"
                                    name="% Konsumsi TTD (≥67%)"
                                    stroke="#ec4899"
                                    strokeWidth={2.5}
                                    dot={{ r: 3 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ── TABEL REKAPITULASI DETAIL TTD ── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {renderTableHeader(
                        isDesaLevel
                            ? `Detail Rekapitulasi Suplementasi TTD — Puskesmas ${selectedPuskesmas}`
                            : "Detail Rekapitulasi Suplementasi TTD per Puskesmas",
                        isDesaLevel
                            ? `Menampilkan % capaian serta rincian sasaran, distribusi, dan konsumsi tingkat Desa di ${selectedPuskesmas}`
                            : "Menampilkan % capaian serta rincian sasaran, distribusi, dan konsumsi seluruh Puskesmas"
                    )}

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
                                    <th className="py-3 px-3 text-right">Sasaran Siswi</th>
                                    <th className="py-3 px-3 text-center min-w-[130px]">
                                        <div>% Mendapat TTD</div>
                                        <div className="text-[10px] font-normal text-slate-400">(Dapat / Sasaran)</div>
                                    </th>
                                    <th className="py-3 px-3 text-center min-w-[130px]">
                                        <div>% Konsumsi Standar</div>
                                        <div className="text-[10px] font-normal text-slate-400">(Konsumsi / Sasaran)</div>
                                    </th>
                                    <th className="py-3 px-3 text-right">≥ 26 Tablet</th>
                                    <th className="py-3 px-3 text-right">&lt; 26 Tablet</th>
                                    <th className="py-3 px-4 text-center">Status Target (≥67%)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-slate-400">
                                            Tidak ada data yang cocok dengan pencarian.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedRows.map((row) => (
                                        <tr key={row.entity_name} className="hover:bg-pink-50/20 transition-colors">
                                            <td className="py-3 px-4 font-bold text-slate-800 sticky left-0 bg-white z-10">
                                                <div>{row.entity_name}</div>
                                                {isDesaLevel && (
                                                    <span className="text-[10px] text-slate-400 font-normal">Pusk. {row.puskesmas}</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-center text-slate-500 font-mono">
                                                {isDesaLevel ? row.puskesmas : row.record_count}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700">
                                                {formatNumber(row.target_rematri)}
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <div className="font-bold text-blue-700">{formatPercent(row.pct_ttd_received)}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">
                                                    {formatNumber(row.ttd_received_standard)} / {formatNumber(row.target_rematri)}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <div className={`font-bold ${row.pct_ttd_consumed >= 67 ? "text-emerald-700" : "text-rose-700"}`}>
                                                    {formatPercent(row.pct_ttd_consumed)}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-mono">
                                                    {formatNumber(row.ttd_consumed_standard)} / {formatNumber(row.target_rematri)}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-emerald-700 font-semibold">
                                                {formatNumber(row.ttd_consumed_ge26)}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-amber-700">
                                                {formatNumber(row.ttd_consumed_lt26)}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {row.pct_ttd_consumed >= 67 ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <CheckCircle2 className="w-3 h-3" /> Tercapai
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                        <AlertCircle className="w-3 h-3" /> Belum
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {renderPagination()}
                </div>
            </div>
        );
    }

    // =========================================================================
    // DOMAIN 2: SKRINING ANEMIA
    // =========================================================================
    if (domain === "skrining") {
        return (
            <div className="space-y-6">
                <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-teal-200">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                            <Stethoscope className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">
                                Skrining Anemia Siswi Kelas 7 & 10
                            </h2>
                            <p className="text-xs text-teal-100 mt-1">
                                Pemeriksaan kadar hemoglobin (Hb) berkala bagi siswi tahun ajaran baru pada jenjang SMP/MTs (Kelas 7) dan SMA/SMK/MA (Kelas 10).
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl border border-teal-200 p-5 shadow-sm bg-teal-50/20">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">% Skrining Gabungan</span>
                            {currentTotals.pct_screening_anemia >= 77 ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Target ≥77%
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Target ≥77%
                                </span>
                            )}
                        </div>
                        <div className="text-3xl font-black text-teal-800 mt-1">
                            {formatPercent(currentTotals.pct_screening_anemia)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 font-mono">
                            {formatNumber(currentTotals.screened_grade7_10)} / {formatNumber(currentTotals.target_grade7_10)} siswi
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Skrining Kelas 7 (SMP)</span>
                        <div className="text-3xl font-black text-slate-900 mt-1">
                            {formatPercent(currentTotals.pct_screening_grade7)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 font-mono">
                            {formatNumber(currentTotals.screened_grade7)} / {formatNumber(currentTotals.target_grade7)} siswi
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Skrining Kelas 10 (SMA)</span>
                        <div className="text-3xl font-black text-slate-900 mt-1">
                            {formatPercent(currentTotals.pct_screening_grade10)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 font-mono">
                            {formatNumber(currentTotals.screened_grade10)} / {formatNumber(currentTotals.target_grade10)} siswi
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Belum Diskrining</span>
                        <div className="text-3xl font-black text-rose-600 mt-1">
                            {formatNumber(Math.max(0, currentTotals.target_grade7_10 - currentTotals.screened_grade7_10))}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Siswi sasaran perlu dijangkau</div>
                    </div>
                </div>

                {/* Comparative Chart */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm">
                        Cakupan Skrining Kelas 7 vs Kelas 10 per {isDesaLevel ? "Desa" : "Puskesmas"}
                    </h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={breakdownRows.slice(0, 25).map((r) => ({
                                    name: r.entity_name,
                                    kls7: Math.round(r.pct_screening_grade7 * 10) / 10,
                                    kls10: Math.round(r.pct_screening_grade10 * 10) / 10
                                }))}
                                margin={{ top: 10, right: 10, left: -15, bottom: 40 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={70} tick={{ fontSize: 10, fill: "#64748b" }} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `${v}%`} />
                                <RechartsTooltip formatter={(val) => `${val}%`} />
                                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                                <Bar dataKey="kls7" name="Kelas 7 (SMP)" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="kls10" name="Kelas 10 (SMA)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ── TREN TEMPORAL SKRINING ANEMIA ── */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm">
                            Tren Temporal Skrining Anemia Siswi ({year})
                        </h3>
                        <p className="text-xs text-slate-400">
                            Cakupan skrining Hb Kelas 7 & 10 sepanjang {mode === "bulanan" ? "Januari - Desember" : mode === "triwulan" ? "Triwulan I - IV" : "Semester Ganjil - Genap"}
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
                                <Line
                                    type="monotone"
                                    dataKey="pct_screening_anemia"
                                    name="% Skrining Gabungan (≥77%)"
                                    stroke="#0d9488"
                                    strokeWidth={2.5}
                                    dot={{ r: 3 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="pct_screening_grade7"
                                    name="% Skrining Kls 7 (SMP)"
                                    stroke="#06b6d4"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    dot={{ r: 3 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="pct_screening_grade10"
                                    name="% Skrining Kls 10 (SMA)"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    dot={{ r: 3 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ── TABEL REKAPITULASI DETAIL SKRINING ── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {renderTableHeader(
                        isDesaLevel
                            ? `Detail Rekapitulasi Skrining Anemia — Puskesmas ${selectedPuskesmas}`
                            : "Detail Rekapitulasi Skrining Anemia per Puskesmas",
                        isDesaLevel
                            ? `Menampilkan % cakupan serta rincian sasaran dan hasil skrining Kelas 7 & 10 di ${selectedPuskesmas}`
                            : "Menampilkan % cakupan serta rincian sasaran dan hasil skrining Kelas 7 & 10 seluruh Puskesmas"
                    )}

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
                                    <th className="py-3 px-3 text-right">Sasaran Kls 7+10</th>
                                    <th className="py-3 px-3 text-center min-w-[130px]">
                                        <div>% Skrining Gabungan</div>
                                        <div className="text-[10px] font-normal text-slate-400">(Diskrining / Sasaran)</div>
                                    </th>
                                    <th className="py-3 px-3 text-center min-w-[120px]">
                                        <div>% Kls 7 (SMP)</div>
                                        <div className="text-[10px] font-normal text-slate-400">(Diskrining / Sasaran)</div>
                                    </th>
                                    <th className="py-3 px-3 text-center min-w-[120px]">
                                        <div>% Kls 10 (SMA)</div>
                                        <div className="text-[10px] font-normal text-slate-400">(Diskrining / Sasaran)</div>
                                    </th>
                                    <th className="py-3 px-3 text-right">Belum Diskrining</th>
                                    <th className="py-3 px-4 text-center">Status Target (≥77%)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-slate-400">
                                            Tidak ada data yang cocok dengan pencarian.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedRows.map((row) => (
                                        <tr key={row.entity_name} className="hover:bg-teal-50/20 transition-colors">
                                            <td className="py-3 px-4 font-bold text-slate-800 sticky left-0 bg-white z-10">
                                                <div>{row.entity_name}</div>
                                                {isDesaLevel && (
                                                    <span className="text-[10px] text-slate-400 font-normal">Pusk. {row.puskesmas}</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-center text-slate-500 font-mono">
                                                {isDesaLevel ? row.puskesmas : row.record_count}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700">
                                                {formatNumber(row.target_grade7_10)}
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <div className={`font-bold ${row.pct_screening_anemia >= 77 ? "text-emerald-700" : "text-rose-700"}`}>
                                                    {formatPercent(row.pct_screening_anemia)}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-mono">
                                                    {formatNumber(row.screened_grade7_10)} / {formatNumber(row.target_grade7_10)}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <div className="font-bold text-teal-700">{formatPercent(row.pct_screening_grade7)}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">
                                                    {formatNumber(row.screened_grade7)} / {formatNumber(row.target_grade7)}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <div className="font-bold text-indigo-700">{formatPercent(row.pct_screening_grade10)}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">
                                                    {formatNumber(row.screened_grade10)} / {formatNumber(row.target_grade10)}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-rose-600 font-semibold">
                                                {formatNumber(Math.max(0, row.target_grade7_10 - row.screened_grade7_10))}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {row.pct_screening_anemia >= 77 ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <CheckCircle2 className="w-3 h-3" /> Tercapai
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                        <AlertCircle className="w-3 h-3" /> Belum
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {renderPagination()}
                </div>
            </div>
        );
    }

    // =========================================================================
    // DOMAIN 3: ANEMIA & SEVERITY
    // =========================================================================
    if (domain === "anemia") {
        const severityPieData = [
            { name: "Ringan (11–11.9 g/dL)", value: currentTotals.anemia_mild_total, color: "#fbbf24" },
            { name: "Sedang (8–10.9 g/dL)", value: currentTotals.anemia_moderate_total, color: "#f97316" },
            { name: "Berat (<8 g/dL)", value: currentTotals.anemia_severe_total, color: "#ef4444" }
        ].filter((p) => p.value > 0);

        return (
            <div className="space-y-6">
                <div className="bg-gradient-to-r from-amber-500 to-rose-600 rounded-2xl p-6 text-white shadow-lg shadow-amber-200">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                            <HeartPulse className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">
                                Prevalensi & Derajat Keparahan Anemia Remaja Putri
                            </h2>
                            <p className="text-xs text-amber-100 mt-1">
                                Klasifikasi derajat keparahan anemia siswi berdasarkan cut-off Hb WHO: Ringan (11–11.9 g/dL), Sedang (8–10.9 g/dL), dan Berat (&lt;8 g/dL).
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Prevalensi Total</span>
                            {currentTotals.pct_anemia <= 23 && currentTotals.screened_grade7_10 > 0 ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Target ≤23%
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Target ≤23%
                                </span>
                            )}
                        </div>
                        <div className="text-3xl font-black text-slate-900 mt-1">
                            {formatPercent(currentTotals.pct_anemia)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 font-mono">
                            {formatNumber(currentTotals.anemia_total)} kasus dari {formatNumber(currentTotals.screened_grade7_10)} diskrining
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm bg-amber-50/20">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Anemia Ringan (11–11.9)</span>
                        <div className="text-3xl font-black text-amber-700 mt-1">
                            {formatNumber(currentTotals.anemia_mild_total)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                            {formatPercent(currentTotals.pct_mild_share)} dari total kasus anemia
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-orange-200 p-5 shadow-sm bg-orange-50/20">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-800">Anemia Sedang (8–10.9)</span>
                        <div className="text-3xl font-black text-orange-700 mt-1">
                            {formatNumber(currentTotals.anemia_moderate_total)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                            {formatPercent(currentTotals.pct_moderate_share)} dari total kasus anemia
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-sm bg-rose-50/20">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Anemia Berat (&lt;8 g/dL)</span>
                        <div className="text-3xl font-black text-rose-700 mt-1">
                            {formatNumber(currentTotals.anemia_severe_total)}
                        </div>
                        <div className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Perlu rujukan FKRTL</span>
                        </div>
                    </div>
                </div>

                {/* Severity Breakdown Visualizations */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                        <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">
                            Proporsi Derajat Keparahan Anemia
                        </h3>
                        <div className="h-60 w-full">
                            {severityPieData.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                                    Belum ada kasus anemia tercatat.
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={severityPieData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={4}
                                        >
                                            {severityPieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={(v: any) => `${formatNumber(v)} kasus`} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                            {severityPieData.map((p) => (
                                <div key={p.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                                        <span className="text-slate-600">{p.name}</span>
                                    </div>
                                    <span className="font-bold font-mono text-slate-800">{formatNumber(p.value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                        <h3 className="font-bold text-slate-800 text-sm">
                            Kasus Anemia Kelas 7 (SMP) vs Kelas 10 (SMA) per {isDesaLevel ? "Desa" : "Puskesmas"}
                        </h3>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={breakdownRows.slice(0, 25).map((r) => ({
                                        name: r.entity_name,
                                        kls7: r.anemia_grade7_total,
                                        kls10: r.anemia_grade10_total
                                    }))}
                                    margin={{ top: 10, right: 10, left: -15, bottom: 40 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={70} tick={{ fontSize: 10, fill: "#64748b" }} />
                                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                                    <RechartsTooltip formatter={(v: any) => `${formatNumber(v)} kasus`} />
                                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                                    <Bar dataKey="kls7" name="Anemia Kelas 7" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="kls10" name="Anemia Kelas 10" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* ── TREN TEMPORAL PREVALENSI ANEMIA ── */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm">
                            Tren Temporal Prevalensi Anemia Remaja Putri ({year})
                        </h3>
                        <p className="text-xs text-slate-400">
                            Perkembangan prevalensi anemia (Target ≤23%) sepanjang {mode === "bulanan" ? "Januari - Desember" : mode === "triwulan" ? "Triwulan I - IV" : "Semester Ganjil - Genap"}
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
                                <Line
                                    type="monotone"
                                    dataKey="pct_anemia"
                                    name="% Prevalensi Total (≤23%)"
                                    stroke="#e11d48"
                                    strokeWidth={2.5}
                                    dot={{ r: 3 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="pct_anemia_grade7"
                                    name="% Prevalensi Kls 7"
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    dot={{ r: 3 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="pct_anemia_grade10"
                                    name="% Prevalensi Kls 10"
                                    stroke="#ec4899"
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    dot={{ r: 3 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ── TABEL REKAPITULASI DETAIL ANEMIA & SEVERITY ── */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {renderTableHeader(
                        isDesaLevel
                            ? `Detail Rekapitulasi Prevalensi & Derajat Anemia — Puskesmas ${selectedPuskesmas}`
                            : "Detail Rekapitulasi Prevalensi & Derajat Anemia per Puskesmas",
                        isDesaLevel
                            ? `Menampilkan % prevalensi dan rincian klasifikasi derajat keparahan Hb di tingkat Desa ${selectedPuskesmas}`
                            : "Menampilkan % prevalensi dan rincian klasifikasi derajat keparahan Hb seluruh Puskesmas"
                    )}

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
                                    <th className="py-3 px-3 text-right">Siswi Diskrining</th>
                                    <th className="py-3 px-3 text-center min-w-[130px]">
                                        <div>% Prevalensi Total</div>
                                        <div className="text-[10px] font-normal text-slate-400">(Kasus / Diskrining)</div>
                                    </th>
                                    <th className="py-3 px-3 text-center min-w-[110px]">
                                        <div>Ringan (11–11.9)</div>
                                        <div className="text-[10px] font-normal text-slate-400">Kasus (% Share)</div>
                                    </th>
                                    <th className="py-3 px-3 text-center min-w-[110px]">
                                        <div>Sedang (8–10.9)</div>
                                        <div className="text-[10px] font-normal text-slate-400">Kasus (% Share)</div>
                                    </th>
                                    <th className="py-3 px-3 text-center min-w-[110px]">
                                        <div>Berat (&lt;8)</div>
                                        <div className="text-[10px] font-normal text-slate-400">Kasus (% Share)</div>
                                    </th>
                                    <th className="py-3 px-4 text-center">Status Prevalensi (≤23%)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-slate-400">
                                            Tidak ada data yang cocok dengan pencarian.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedRows.map((row) => (
                                        <tr key={row.entity_name} className="hover:bg-amber-50/20 transition-colors">
                                            <td className="py-3 px-4 font-bold text-slate-800 sticky left-0 bg-white z-10">
                                                <div>{row.entity_name}</div>
                                                {isDesaLevel && (
                                                    <span className="text-[10px] text-slate-400 font-normal">Pusk. {row.puskesmas}</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-center text-slate-500 font-mono">
                                                {isDesaLevel ? row.puskesmas : row.record_count}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700">
                                                {formatNumber(row.screened_grade7_10)}
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <div className={`font-bold ${row.pct_anemia <= 23 && row.screened_grade7_10 > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                                    {formatPercent(row.pct_anemia)}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-mono">
                                                    {formatNumber(row.anemia_total)} / {formatNumber(row.screened_grade7_10)}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <div className="font-bold text-amber-700 font-mono">{formatNumber(row.anemia_mild_total)}</div>
                                                <div className="text-[10px] text-slate-400">({formatPercent(row.pct_mild_share)})</div>
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <div className="font-bold text-orange-700 font-mono">{formatNumber(row.anemia_moderate_total)}</div>
                                                <div className="text-[10px] text-slate-400">({formatPercent(row.pct_moderate_share)})</div>
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <div className="font-bold text-rose-700 font-mono">{formatNumber(row.anemia_severe_total)}</div>
                                                <div className="text-[10px] text-slate-400">({formatPercent(row.pct_severe_share)})</div>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {row.pct_anemia <= 23 && row.screened_grade7_10 > 0 ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <CheckCircle2 className="w-3 h-3" /> Terkendali
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                        <AlertCircle className="w-3 h-3" /> Waspada
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {renderPagination()}
                </div>
            </div>
        );
    }

    // =========================================================================
    // DOMAIN 4: TATALAKSANA ANEMIA
    // =========================================================================
    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-purple-200">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight">
                            Tatalaksana Penanganan Anemia Remaja Putri
                        </h2>
                        <p className="text-xs text-purple-100 mt-1">
                            Cakupan penatalaksanaan siswi teridentifikasi anemia (dosis terapi dan rujukan) sesuai pedoman Kemenkes (Target 2026: ≥ 40%).
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-purple-200 p-5 shadow-sm bg-purple-50/20">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">% Cakupan Tatalaksana</span>
                        {currentTotals.pct_anemia_treated >= 40 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Target ≥40%
                            </span>
                        ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Target ≥40%
                            </span>
                        )}
                    </div>
                    <div className="text-3xl font-black text-purple-800 mt-1">
                        {formatPercent(currentTotals.pct_anemia_treated)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 font-mono">
                        {formatNumber(currentTotals.anemia_treated)} dari {formatNumber(currentTotals.anemia_total)} kasus anemia
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Kasus Anemia</span>
                    <div className="text-3xl font-black text-slate-900 mt-1">
                        {formatNumber(currentTotals.anemia_total)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Siswi kelas 7 & 10 butuh terapi</div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Belum Ditatalaksana</span>
                    <div className="text-3xl font-black text-rose-600 mt-1">
                        {formatNumber(Math.max(0, currentTotals.anemia_total - currentTotals.anemia_treated))}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Perlu intervensi follow up</div>
                </div>
            </div>

            {/* Protocol Guidelines Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Info className="w-4 h-4 text-purple-600" />
                    <span>Protokol Tatalaksana Klinis Remaja Putri Anemia (Pedoman Kemenkes 2026)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1">
                        <div className="font-bold text-amber-900">1. Anemia Ringan (Hb 11–11.9 g/dL)</div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                            Berikan <strong>1 tablet TTD per hari</strong> selama 2–4 minggu berturut-turut, diiringi konseling pola makan gizi seimbang kaya zat besi dan vitamin C.
                        </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200/80 space-y-1">
                        <div className="font-bold text-orange-900">2. Anemia Sedang (Hb 8–10.9 g/dL)</div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                            Berikan <strong>2 tablet TTD per hari</strong> selama 2–4 minggu berturut-turut, evaluasi respon kenaikan Hb, investigasi etiologi pendarahan atau cacingan.
                        </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200/80 space-y-1">
                        <div className="font-bold text-rose-900">3. Anemia Berat (Hb &lt;8 g/dL)</div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                            <strong>Rujuk segera ke FKRTL / Rumah Sakit</strong> untuk pemeriksaan penunjang lanjutan dan tata laksana spesialis, disertai edukasi nutrisi.
                        </p>
                    </div>
                </div>
            </div>

            {/* Comparative Tatalaksana Bar Chart */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 text-sm">
                    % Tatalaksana Anemia per {isDesaLevel ? "Desa" : "Puskesmas"} (Target ≥40%)
                </h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={breakdownRows.slice(0, 25).map((r) => ({
                                name: r.entity_name,
                                value: Math.round(r.pct_anemia_treated * 10) / 10
                            }))}
                            margin={{ top: 10, right: 10, left: -15, bottom: 40 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={70} tick={{ fontSize: 10, fill: "#64748b" }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `${v}%`} />
                            <RechartsTooltip formatter={(val) => `${val}%`} />
                            <Bar dataKey="value" name="% Tatalaksana" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── TREN TEMPORAL TATALAKSANA ── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                        Tren Temporal Cakupan Tatalaksana Anemia ({year})
                    </h3>
                    <p className="text-xs text-slate-400">
                        Tren penatalaksanaan siswi teridentifikasi anemia (Target ≥40%) sepanjang {mode === "bulanan" ? "Januari - Desember" : mode === "triwulan" ? "Triwulan I - IV" : "Semester Ganjil - Genap"}
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
                            <Line
                                type="monotone"
                                dataKey="pct_anemia_treated"
                                name="% Tatalaksana Anemia (≥40%)"
                                stroke="#7c3aed"
                                strokeWidth={2.5}
                                dot={{ r: 3 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── TABEL REKAPITULASI DETAIL TATALAKSANA ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {renderTableHeader(
                    isDesaLevel
                        ? `Detail Rekapitulasi Tatalaksana Anemia — Puskesmas ${selectedPuskesmas}`
                        : "Detail Rekapitulasi Tatalaksana Anemia per Puskesmas",
                    isDesaLevel
                        ? `Menampilkan % cakupan tatalaksana serta rincian kasus tertangani tingkat Desa di ${selectedPuskesmas}`
                        : "Menampilkan % cakupan tatalaksana serta rincian kasus tertangani seluruh Puskesmas"
                )}

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
                                <th className="py-3 px-3 text-right">Total Kasus Anemia</th>
                                <th className="py-3 px-3 text-center min-w-[140px]">
                                    <div>% Cakupan Tatalaksana</div>
                                    <div className="text-[10px] font-normal text-slate-400">(Tertangani / Kasus)</div>
                                </th>
                                <th className="py-3 px-3 text-right font-mono text-emerald-700">Kasus Ditatalaksana</th>
                                <th className="py-3 px-3 text-right font-mono text-rose-600">Belum Ditatalaksana</th>
                                <th className="py-3 px-4 text-center">Status Target (≥40%)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedRows.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-slate-400">
                                        Tidak ada data yang cocok dengan pencarian.
                                    </td>
                                </tr>
                            ) : (
                                paginatedRows.map((row) => (
                                    <tr key={row.entity_name} className="hover:bg-purple-50/20 transition-colors">
                                        <td className="py-3 px-4 font-bold text-slate-800 sticky left-0 bg-white z-10">
                                            <div>{row.entity_name}</div>
                                            {isDesaLevel && (
                                                <span className="text-[10px] text-slate-400 font-normal">Pusk. {row.puskesmas}</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3 text-center text-slate-500 font-mono">
                                            {isDesaLevel ? row.puskesmas : row.record_count}
                                        </td>
                                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700">
                                            {formatNumber(row.anemia_total)}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <div className={`font-bold ${row.pct_anemia_treated >= 40 ? "text-emerald-700" : "text-rose-700"}`}>
                                                {formatPercent(row.pct_anemia_treated)}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-mono">
                                                {formatNumber(row.anemia_treated)} / {formatNumber(row.anemia_total)}
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 text-right font-mono text-emerald-700 font-semibold">
                                            {formatNumber(row.anemia_treated)}
                                        </td>
                                        <td className="py-3 px-3 text-right font-mono text-rose-600 font-semibold">
                                            {formatNumber(Math.max(0, row.anemia_total - row.anemia_treated))}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {row.pct_anemia_treated >= 40 ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <CheckCircle2 className="w-3 h-3" /> Optimal
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                    <AlertCircle className="w-3 h-3" /> Belum
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {renderPagination()}
            </div>
        </div>
    );
}
