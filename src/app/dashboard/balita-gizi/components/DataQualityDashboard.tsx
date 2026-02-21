"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/dashboard/layout";
import {
    calculateCompliance,
    calculateCompleteness,
    RefDesa,
    TransactionData
} from "@/lib/balitaGiziHelper";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from "recharts";

export default function DataQualityDashboard() {
    const { user } = useAuth();
    const isSuperadmin = user?.role === "superadmin";

    const [activeTab, setActiveTab] = useState<"compliance" | "completeness">("compliance");
    const [loading, setLoading] = useState(true);

    // Filters
    const [jenisLaporan, setJenisLaporan] = useState<"bulanan" | "tahunan">("bulanan");
    const [selectedBulan, setSelectedBulan] = useState<number>(new Date().getMonth() + 1);
    const [selectedTW, setSelectedTW] = useState<number>(1);
    const [selectedTahun, setSelectedTahun] = useState<number>(new Date().getFullYear());
    const [selectedPuskesmas, setSelectedPuskesmas] = useState<string>("ALL");
    const [selectedKelurahan, setSelectedKelurahan] = useState<string>("ALL");

    // Reference State
    const [puskesmasOptions, setPuskesmasOptions] = useState<{ id: string; name: string }[]>([]);
    const [kelurahanOptions, setKelurahanOptions] = useState<{ id: string; name: string; puskesmas_id: string }[]>([]);

    // Results
    const [complianceResult, setComplianceResult] = useState<any>(null);
    const [completenessResult, setCompletenessResult] = useState<any>(null);

    // Pagination
    const [compliancePage, setCompliancePage] = useState(1);
    const [completenessPage, setCompletenessPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Initialize logic
    useEffect(() => {
        if (user) {
            if (!isSuperadmin && user.puskesmas_id) {
                setSelectedPuskesmas(user.puskesmas_id);
            }
            fetchRefData();
        }
    }, [user]);

    // Refetch data when filters change
    useEffect(() => {
        if (puskesmasOptions.length > 0) {
            fetchData();
        }
    }, [jenisLaporan, selectedBulan, selectedTW, selectedTahun, selectedPuskesmas, selectedKelurahan, puskesmasOptions]);

    const fetchRefData = async () => {
        try {
            const { data: pData } = await supabase.from("ref_puskesmas").select("id, nama");
            const { data: kData } = await supabase.from("ref_desa").select("id, desa_kel, puskesmas, puskesmas_id");

            if (pData) setPuskesmasOptions(pData.filter(p => !p.nama.toLowerCase().includes("dinkes")).map(p => ({ id: p.id, name: p.nama })));
            if (kData) setKelurahanOptions(kData.map(k => ({ id: k.id, name: k.desa_kel, puskesmas_id: k.puskesmas_id })));
        } catch (err) {
            console.error(err);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            let bulanFilter: number[] = [];
            let monthsCount = 1;

            if (jenisLaporan === "bulanan") {
                bulanFilter = [selectedBulan];
                monthsCount = 1;
            } else {
                if (selectedTW === 1) { bulanFilter = [1, 2, 3]; monthsCount = 3; }
                else if (selectedTW === 2) { bulanFilter = [1, 2, 3, 4, 5, 6]; monthsCount = 6; }
                else if (selectedTW === 3) { bulanFilter = [1, 2, 3, 4, 5, 6, 7, 8, 9]; monthsCount = 9; }
                else if (selectedTW === 4) { bulanFilter = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; monthsCount = 12; }
            }

            // Build Targets
            let refQuery = supabase.from("ref_desa").select("id, puskesmas, desa_kel").not("puskesmas", "ilike", "%dinkes%");
            if (selectedPuskesmas !== "ALL") {
                const pkmasName = puskesmasOptions.find(p => p.id === selectedPuskesmas)?.name;
                if (pkmasName) {
                    refQuery = refQuery.ilike("puskesmas", `%${pkmasName}%`);
                }
            }
            if (selectedKelurahan !== "ALL") {
                const kelName = kelurahanOptions.find(k => k.id === selectedKelurahan)?.name;
                if (kelName) {
                    refQuery = refQuery.ilike("desa_kel", `%${kelName}%`);
                }
            }

            const fetchAll = async (queryBuilder: any) => {
                let allData: any[] = [];
                let from = 0;
                const step = 1000;
                while (true) {
                    const { data, error } = await queryBuilder.range(from, from + step - 1);
                    if (error) throw error;
                    if (!data || data.length === 0) break;
                    allData = allData.concat(data);
                    if (data.length < step) break;
                    from += step;
                }
                return allData;
            };

            const refDesaData = await fetchAll(refQuery);

            const mappedRefDesa: RefDesa[] = (refDesaData || []).map((d: any) => ({
                id: d.id,
                nama_kelurahan: d.desa_kel,
                nama_puskesmas: d.puskesmas
            }));

            // Build Transaction
            let transQuery = supabase.from("data_balita_gizi")
                .select("*")
                .eq("tahun", selectedTahun)
                .in("bulan", bulanFilter)
                .not("puskesmas", "ilike", "%dinkes%");

            if (selectedPuskesmas !== "ALL") {
                const pkmasName = puskesmasOptions.find(p => p.id === selectedPuskesmas)?.name;
                if (pkmasName) transQuery = transQuery.ilike("puskesmas", `%${pkmasName}%`);
            }
            if (selectedKelurahan !== "ALL") {
                const kelName = kelurahanOptions.find(k => k.id === selectedKelurahan)?.name;
                if (kelName) transQuery = transQuery.ilike("kelurahan", `%${kelName}%`);
            }

            const transData = await fetchAll(transQuery);

            const effectiveRole = (isSuperadmin && selectedPuskesmas === "ALL") ? "superadmin" : "admin_puskesmas";

            // Apply calculations
            const compliance = calculateCompliance(mappedRefDesa, transData || [], monthsCount, effectiveRole);
            const completeness = calculateCompleteness(mappedRefDesa, transData || [], monthsCount, effectiveRole);

            setComplianceResult(compliance);
            setCompletenessResult(completeness);

        } catch (error) {
            console.error("Error fetching data quality:", error);
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return "text-emerald-600";
        if (score >= 70) return "text-amber-500";
        return "text-red-500";
    };

    const getScoreBg = (score: number) => {
        if (score >= 90) return "bg-emerald-100";
        if (score >= 70) return "bg-amber-100";
        return "bg-red-100";
    };

    const getBarColor = (score: number) => {
        if (score >= 90) return "#059669"; // emerald-600
        if (score >= 70) return "#f59e0b"; // amber-500
        return "#ef4444"; // red-500
    };

    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const effectiveRole = (isSuperadmin && selectedPuskesmas === "ALL") ? "superadmin" : "admin_puskesmas";

    const availableKelurahan = kelurahanOptions.filter(k => selectedPuskesmas === "ALL" || k.puskesmas_id === selectedPuskesmas);

    return (
        <div className="space-y-6">

            {/* Context Filters */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab("compliance")}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "compliance"
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            Tingkat Kepatuhan Lapor
                        </button>
                        <button
                            onClick={() => setActiveTab("completeness")}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "completeness"
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            Tingkat Kelengkapan Data
                        </button>
                    </div>
                </div>

                {/* Filter Dropdowns */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500">Tahun</label>
                        <select
                            value={selectedTahun}
                            onChange={(e) => setSelectedTahun(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value={2026}>2026</option>
                            <option value={2025}>2025</option>
                            <option value={2024}>2024</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500">Jenis Laporan</label>
                        <select
                            value={jenisLaporan}
                            onChange={(e) => setJenisLaporan(e.target.value as "bulanan" | "tahunan")}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="bulanan">Laporan Bulanan</option>
                            <option value="tahunan">Laporan Tahunan</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500">Pilih Laporan</label>
                        {jenisLaporan === "bulanan" ? (
                            <select
                                value={selectedBulan}
                                onChange={(e) => setSelectedBulan(Number(e.target.value))}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                {months.map((m, i) => (
                                    <option key={i} value={i + 1}>{m}</option>
                                ))}
                            </select>
                        ) : (
                            <select
                                value={selectedTW}
                                onChange={(e) => setSelectedTW(Number(e.target.value))}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value={1}>TW 1 (Jan-Mar)</option>
                                <option value={2}>TW 2 (Apr-Jun)</option>
                                <option value={3}>TW 3 (Jul-Sep)</option>
                                <option value={4}>TW 4 (Okt-Des)</option>
                            </select>
                        )}
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500">Puskesmas</label>
                        <select
                            value={selectedPuskesmas}
                            onChange={(e) => {
                                setSelectedPuskesmas(e.target.value);
                                setSelectedKelurahan("ALL");
                            }}
                            disabled={!isSuperadmin}
                            className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 ${!isSuperadmin ? "text-slate-400 cursor-not-allowed" : "text-slate-700"}`}
                        >
                            {isSuperadmin && <option value="ALL">Semua Puskesmas</option>}
                            {puskesmasOptions.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1 lg:col-span-2">
                        <label className="text-xs font-bold text-slate-500">Kelurahan/Desa</label>
                        <select
                            value={selectedKelurahan}
                            onChange={(e) => setSelectedKelurahan(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="ALL">Semua Kelurahan/Desa</option>
                            {availableKelurahan.map((k) => (
                                <option key={k.id} value={k.id}>{k.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Description Card */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-sm text-slate-600">
                <div className="flex gap-3">
                    <span className="material-icons-round text-teal-600 shrink-0">info</span>
                    <div>
                        {activeTab === "compliance" ? (
                            <>
                                <strong className="text-slate-800">Analisis Kepatuhan Lapor:</strong> Mengukur persentase Desa/Kelurahan yang sudah mengunggah formulir data pada periode terpilih (bulanan atau rata-rata triwulanan) dibandingkan dengan jumlah target faskes terdaftar.
                            </>
                        ) : (
                            <>
                                <strong className="text-slate-800">Analisis Kelengkapan Data:</strong> Mengukur persentase sel data yang terisi sesuai syarat indikator esensial yang wajib diisi pada formulir laporan, menunjukan validitas dan kerapian kelengkapan berkas secara agregat per puskesmas/desa.
                            </>
                        )}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64 bg-white rounded-2xl border border-slate-200">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
            ) : (
                <>
                    {/* Compliance View */}
                    {activeTab === "compliance" && complianceResult && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-500">Kepatuhan Keseluruhan</p>
                                    <p className="text-3xl font-extrabold text-slate-900 mt-1">
                                        {complianceResult.overallRate.toFixed(1)}%
                                    </p>
                                </div>
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${getScoreBg(complianceResult.overallRate)}`}>
                                    <span className={`material-icons-round text-2xl ${getScoreColor(complianceResult.overallRate)}`}>
                                        {complianceResult.overallRate >= 90 ? "verified" : "warning"}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {/* Chart is now vertical orientation based on specs */}
                                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-slate-800 mb-6">
                                        Kepatuhan per {effectiveRole === "superadmin" ? "Puskesmas" : "Desa/Kelurahan"}
                                    </h3>
                                    <div className="h-[400px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={complianceResult.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis
                                                    dataKey="name"
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    tick={({ x, y, payload }: { x: any; y: any; payload: { value: string } }) => {
                                                        const name = payload.value;
                                                        // Abbreviate long names
                                                        const abbreviated = name.length > 12
                                                            ? name.split(" ").map((w: string) => w.length > 4 ? w.slice(0, 4) + "." : w).join(" ")
                                                            : name;
                                                        return (
                                                            <g transform={`translate(${x},${y})`}>
                                                                <text
                                                                    x={0}
                                                                    y={0}
                                                                    dy={8}
                                                                    textAnchor="end"
                                                                    fill="#64748b"
                                                                    fontSize={9}
                                                                    fontFamily="monospace"
                                                                    transform="rotate(-60)"
                                                                >
                                                                    {abbreviated}
                                                                </text>
                                                            </g>
                                                        );
                                                    }}
                                                    interval={0}
                                                    height={130}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <YAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                                <Tooltip
                                                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const p = payload[0].payload;
                                                            return (
                                                                <div className="bg-white border rounded-lg shadow-lg p-3 text-xs">
                                                                    <p className="font-bold text-slate-800 mb-1">{p.name}</p>
                                                                    <p className="text-emerald-600">Compliance: {p.rate.toFixed(1)}%</p>
                                                                    <p className="text-slate-500">Target Lapor: {p.targetCount} Formulir</p>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                                    {complianceResult.chartData.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={getBarColor(entry.rate)} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Table under chart - 1 page, separate */}
                                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-slate-800 mb-4">Detail Kepatuhan {effectiveRole === "superadmin" ? "(Agregat Puskesmas)" : "(Level Desa)"}</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="border-b-2 border-slate-200">
                                                    <th className="py-3 px-4 font-semibold text-slate-500">{effectiveRole === "superadmin" ? "Puskesmas" : "Detail Desa"}</th>
                                                    {effectiveRole === "superadmin" && <th className="py-3 px-4 font-semibold text-slate-500 text-center">Jumlah Desa</th>}
                                                    <th className="py-3 px-4 font-semibold text-slate-500 text-center">
                                                        {effectiveRole === "superadmin" ? "Jumlah Target Lapor (Berdasarkan TW)" : "Target Formulir Lapor"}
                                                    </th>
                                                    <th className="py-3 px-4 font-semibold text-slate-500 text-center">Compliance Rate (%)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    const showAll = rowsPerPage === 0;
                                                    const startIdx = showAll ? 0 : (compliancePage - 1) * rowsPerPage;
                                                    const paginatedData = showAll ? complianceResult.detailTable : complianceResult.detailTable.slice(startIdx, startIdx + rowsPerPage);

                                                    return paginatedData.map((d: any, idx: number) => (
                                                        <tr key={idx} className="border-b border-slate-50 border-dashed hover:bg-slate-50">
                                                            <td className="py-3 px-4 text-slate-800 font-medium">{d.name}</td>
                                                            {effectiveRole === "superadmin" && <td className="py-3 px-4 text-center text-slate-600">{d.desaCount} Desa</td>}
                                                            <td className="py-3 px-4 text-center text-slate-600">{d.targetCount} Fomulir</td>
                                                            <td className="py-3 px-4 text-center">
                                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${d.rate >= 90 ? "bg-emerald-100 text-emerald-700" : d.rate >= 70 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                                                                    {d.rate.toFixed(1)}%
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ));
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination Controls */}
                                    <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-500">Tampilkan</span>
                                            <select
                                                value={rowsPerPage}
                                                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCompliancePage(1); }}
                                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                                            >
                                                <option value={10}>10</option>
                                                <option value={20}>20</option>
                                                <option value={50}>50</option>
                                                <option value={0}>All</option>
                                            </select>
                                            <span className="text-xs text-slate-500">
                                                {rowsPerPage === 0
                                                    ? `Semua ${complianceResult.detailTable.length} data`
                                                    : `${Math.min((compliancePage - 1) * rowsPerPage + 1, complianceResult.detailTable.length)}–${Math.min(compliancePage * rowsPerPage, complianceResult.detailTable.length)} dari ${complianceResult.detailTable.length} data`
                                                }
                                            </span>
                                        </div>

                                        {rowsPerPage > 0 && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setCompliancePage(p => Math.max(1, p - 1))}
                                                    disabled={compliancePage === 1}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all"
                                                >
                                                    <span className="material-icons-round text-sm">chevron_left</span>
                                                </button>
                                                <span className="text-xs font-bold text-slate-600 px-2">{compliancePage} / {Math.max(1, Math.ceil(complianceResult.detailTable.length / rowsPerPage))}</span>
                                                <button
                                                    onClick={() => setCompliancePage(p => Math.min(Math.ceil(complianceResult.detailTable.length / rowsPerPage), p + 1))}
                                                    disabled={compliancePage >= Math.ceil(complianceResult.detailTable.length / rowsPerPage)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all"
                                                >
                                                    <span className="material-icons-round text-sm">chevron_right</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Completeness View */}
                    {activeTab === "completeness" && completenessResult && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-500">Kelengkapan Keseluruhan Kelurahan</p>
                                    <p className="text-3xl font-extrabold text-slate-900 mt-1">
                                        {completenessResult.overallRate.toFixed(1)}%
                                    </p>
                                </div>
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${getScoreBg(completenessResult.overallRate)}`}>
                                    <span className={`material-icons-round text-2xl ${getScoreColor(completenessResult.overallRate)}`}>
                                        {completenessResult.overallRate >= 90 ? "verified" : "warning"}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                <h3 className="font-bold text-slate-800 mb-2">Analisis Kelengkapan Variabel</h3>
                                <p className="text-sm text-slate-500 mb-6">Persentase pengisian untuk setiap kolom esensial/mandatari pada formulir laporan elektronik.</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {completenessResult.columnCompleteness.map((col: any, idx: number) => (
                                        <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-center transition-all hover:bg-white hover:shadow-sm">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide truncate pr-4" title={col.column.replace(/_/g, ' ')}>
                                                    {col.column.replace(/_/g, ' ')}
                                                </span>
                                                <span className={`text-xs font-black ${col.rate >= 90 ? "text-emerald-600" : col.rate >= 70 ? "text-amber-600" : "text-red-500"}`}>
                                                    {col.rate.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${col.rate >= 90 ? "bg-emerald-500" : col.rate >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                                                    style={{ width: `${col.rate}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {/* Vertical Chart completeness role */}
                                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-slate-800 mb-6">Kelengkapan per {effectiveRole === "superadmin" ? "Puskesmas" : "Desa/Kelurahan"}</h3>
                                    <div className="h-[400px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={completenessResult.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis
                                                    dataKey="name"
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    tick={({ x, y, payload }: { x: any; y: any; payload: { value: string } }) => {
                                                        const name = payload.value;
                                                        // Abbreviate long names
                                                        const abbreviated = name.length > 12
                                                            ? name.split(" ").map((w: string) => w.length > 4 ? w.slice(0, 4) + "." : w).join(" ")
                                                            : name;
                                                        return (
                                                            <g transform={`translate(${x},${y})`}>
                                                                <text
                                                                    x={0}
                                                                    y={0}
                                                                    dy={8}
                                                                    textAnchor="end"
                                                                    fill="#64748b"
                                                                    fontSize={9}
                                                                    fontFamily="monospace"
                                                                    transform="rotate(-60)"
                                                                >
                                                                    {abbreviated}
                                                                </text>
                                                            </g>
                                                        );
                                                    }}
                                                    interval={0}
                                                    height={130}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <YAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                                <Tooltip
                                                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const p = payload[0].payload;
                                                            return (
                                                                <div className="bg-white border rounded-lg shadow-lg p-3 text-xs">
                                                                    <p className="font-bold text-slate-800 mb-1">{p.name}</p>
                                                                    <p className="text-emerald-600">Completeness: {p.rate.toFixed(1)}%</p>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                                    {completenessResult.chartData.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={getBarColor(entry.rate)} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Table layout completely separated un-intersecting with charts */}
                                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-slate-800 mb-4">Detail Kelengkapan {effectiveRole === "superadmin" ? "(Agregat Puskesmas)" : "(Level Desa)"}</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="border-b-2 border-slate-200">
                                                    <th className="py-3 px-4 font-semibold text-slate-500">{effectiveRole === "superadmin" ? "Puskesmas" : "Detail Desa"}</th>
                                                    {effectiveRole === "superadmin" && <th className="py-3 px-4 font-semibold text-slate-500 text-center">Jumlah Desa</th>}
                                                    <th className="py-3 px-4 font-semibold text-slate-500 text-center">Completeness (%)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    const showAll = rowsPerPage === 0;
                                                    const startIdx = showAll ? 0 : (completenessPage - 1) * rowsPerPage;
                                                    const paginatedData = showAll ? completenessResult.detailTable : completenessResult.detailTable.slice(startIdx, startIdx + rowsPerPage);

                                                    return paginatedData.map((d: any, idx: number) => (
                                                        <tr key={idx} className="border-b border-slate-50 border-dashed hover:bg-slate-50">
                                                            <td className="py-3 px-4 text-slate-800 font-medium">{d.name}</td>
                                                            {effectiveRole === "superadmin" && <td className="py-3 px-4 text-center text-slate-600">{d.desaCount} Desa</td>}
                                                            <td className="py-3 px-4 text-center">
                                                                <div className="flex items-center justify-center gap-3">
                                                                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                        <div
                                                                            className={`h-full rounded-full ${d.rate >= 90 ? "bg-emerald-500" : d.rate >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                                                                            style={{ width: `${d.rate}%` }}
                                                                        ></div>
                                                                    </div>
                                                                    <span className="font-bold text-slate-700 w-12 text-right">
                                                                        {d.rate.toFixed(1)}%
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ));
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination Controls */}
                                    <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-500">Tampilkan</span>
                                            <select
                                                value={rowsPerPage}
                                                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCompletenessPage(1); }}
                                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                                            >
                                                <option value={10}>10</option>
                                                <option value={20}>20</option>
                                                <option value={50}>50</option>
                                                <option value={0}>All</option>
                                            </select>
                                            <span className="text-xs text-slate-500">
                                                {rowsPerPage === 0
                                                    ? `Semua ${completenessResult.detailTable.length} data`
                                                    : `${Math.min((completenessPage - 1) * rowsPerPage + 1, completenessResult.detailTable.length)}–${Math.min(completenessPage * rowsPerPage, completenessResult.detailTable.length)} dari ${completenessResult.detailTable.length} data`
                                                }
                                            </span>
                                        </div>

                                        {rowsPerPage > 0 && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setCompletenessPage(p => Math.max(1, p - 1))}
                                                    disabled={completenessPage === 1}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all"
                                                >
                                                    <span className="material-icons-round text-sm">chevron_left</span>
                                                </button>
                                                <span className="text-xs font-bold text-slate-600 px-2">{completenessPage} / {Math.max(1, Math.ceil(completenessResult.detailTable.length / rowsPerPage))}</span>
                                                <button
                                                    onClick={() => setCompletenessPage(p => Math.min(Math.ceil(completenessResult.detailTable.length / rowsPerPage), p + 1))}
                                                    disabled={completenessPage >= Math.ceil(completenessResult.detailTable.length / rowsPerPage)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all"
                                                >
                                                    <span className="material-icons-round text-sm">chevron_right</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
