"use client";

import React, { useState } from "react";
import { PmtBalitaRecord, NATIONAL_BENCHMARKS } from "@/lib/pmtLokalHelper";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    ReferenceLine,
    Cell
} from "recharts";
import {
    Activity,
    CheckCircle2,
    TrendingUp,
    Search,
    Download,
    ChevronLeft,
    ChevronRight,
    AlertCircle
} from "lucide-react";

interface PmtBalitaUwTabProps {
    records: PmtBalitaRecord[];
}

export default function PmtBalitaUwTab({ records }: PmtBalitaUwTabProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    // Filter Underweight
    const uwList = records.filter(r => r.indikasi === "underweight");

    const totalIntake = uwList.length;
    const appropriate = uwList.filter(r => r.zs_bbu_awal !== null && r.zs_bbu_awal < -2.0 && r.zs_bbu_awal >= -6.0).length;
    const evaluable = uwList.filter(r => r.zs_bbu_awal !== null && r.zs_bbu_akhir !== null);
    const recovered = evaluable.filter(r => r.zs_bbu_akhir! > -2.0).length;
    const recoveryRate = evaluable.length > 0 ? (recovered / evaluable.length) * 100 : 0;

    // Transition categories
    const countNormal = evaluable.filter(r => r.zs_bbu_akhir! >= -2.0 && r.zs_bbu_akhir! <= 1.0).length;
    const countTetapKurang = evaluable.filter(r => r.zs_bbu_akhir! < -2.0 && r.zs_bbu_akhir! >= -3.0).length;
    const countSangatKurang = evaluable.filter(r => r.zs_bbu_akhir! < -3.0).length;

    // Mean delta WAZ
    let sumDelta = 0;
    for (const r of evaluable) {
        sumDelta += (r.zs_bbu_akhir! - r.zs_bbu_awal!);
    }
    const meanDeltaWaz = evaluable.length > 0 ? sumDelta / evaluable.length : 0;

    // Puskesmas breakdown for chart
    const pkmMap: Record<string, { intake: number; evaluable: number; recovered: number }> = {};
    for (const r of uwList) {
        if (!pkmMap[r.puskesmas]) pkmMap[r.puskesmas] = { intake: 0, evaluable: 0, recovered: 0 };
        pkmMap[r.puskesmas].intake++;
        if (r.zs_bbu_awal !== null && r.zs_bbu_akhir !== null) {
            pkmMap[r.puskesmas].evaluable++;
            if (r.zs_bbu_akhir > -2.0) pkmMap[r.puskesmas].recovered++;
        }
    }
    const chartData = Object.entries(pkmMap).map(([pkm, val]) => ({
        puskesmas: pkm,
        rate: val.evaluable > 0 ? Math.round((val.recovered / val.evaluable) * 1000) / 10 : 0,
        evaluable: val.evaluable,
        recovered: val.recovered
    })).sort((a, b) => b.rate - a.rate);

    // Filtered records
    const filteredRows = uwList.filter(r =>
        r.nama_masked.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.puskesmas.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.desa.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
    const paginatedRows = filteredRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    // CSV export
    const exportCsv = () => {
        const headers = ["NIK (Masked)", "Nama (Masked)", "JK", "Puskesmas", "Desa", "BB Awal", "WAZ Awal", "BB Akhir", "WAZ Akhir", "Delta WAZ", "Status Pemulihan"];
        const rows = uwList.map(r => [
            r.person_key,
            r.nama_masked,
            r.jk,
            r.puskesmas,
            r.desa,
            r.bb_awal ?? "",
            r.zs_bbu_awal ?? "",
            r.bb_akhir ?? "",
            r.zs_bbu_akhir ?? "",
            (r.zs_bbu_akhir && r.zs_bbu_awal) ? (r.zs_bbu_akhir - r.zs_bbu_awal).toFixed(2) : "",
            (r.zs_bbu_akhir && r.zs_bbu_akhir > -2.0) ? "Normal (Pulih)" : "Tetap Kurang"
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Data_Individu_PMT_Underweight_2026.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            {/* ── 1. KPI SCORECARDS ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Total Episode Intake
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-800">{totalIntake}</span>
                        <span className="text-xs text-slate-500 font-medium">Balita Underweight</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        Sasaran Sesuai: <strong className="text-slate-800">{appropriate}</strong> anak ({Math.round(appropriate/totalIntake*100)}%)
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                        Baseline WAZ: -6.0 ≤ WAZ &lt; -2.0 SD
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Observasi Pasangan Valid
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-800">{evaluable.length}</span>
                        <span className="text-xs text-slate-500 font-medium">Evaluable</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        Kelengkapan Pasangan: <strong className="text-slate-800">{Math.round(evaluable.length/totalIntake*100)}%</strong>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                        Memiliki BB & WAZ awal-akhir
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm bg-gradient-to-br from-white to-amber-50/20">
                    <div className="flex items-center justify-between mb-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                            Angka Pemulihan (WAZ &gt; -2)
                        </div>
                        <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                            Panel Teramati
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-amber-700">{recoveryRate.toFixed(1)}%</span>
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            {recovered} Normal
                        </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        Numerator: <strong className="text-slate-800">{recovered}</strong> / Denominator: <strong className="text-slate-800">{evaluable.length}</strong>
                    </div>
                    <div className="mt-3 pt-3 border-t border-amber-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Ref Kemenkes 2025:</span>
                        <span className="font-bold text-slate-700">{NATIONAL_BENCHMARKS.uw.value}% (n=150k)</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Rerata Perubahan ΔWAZ
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-purple-700">
                            {meanDeltaWaz > 0 ? `+${meanDeltaWaz.toFixed(2)}` : meanDeltaWaz.toFixed(2)}
                        </span>
                        <span className="text-xs font-medium text-slate-500">SD Z-Score</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        Peningkatan WAZ per anak teramati
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                        Indikator perbaikan status berat badan
                    </div>
                </div>
            </div>

            {/* ── 2. CHARTS: TRANSITION & PUSKESMAS BAR CHART ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm lg:col-span-1">
                    <h3 className="font-bold text-slate-800 text-sm mb-1">
                        Matriks Transisi Kategori BB/U
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                        Perubahan kategori indeks BB/U dari baseline ke hasil akhir
                    </p>

                    <div className="space-y-3">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>Berat Badan Normal</span>
                                </div>
                                <span className="text-xs font-extrabold text-emerald-700">
                                    {Math.round(countNormal / evaluable.length * 100)}%
                                </span>
                            </div>
                            <div className="text-xs text-emerald-800">
                                <strong>{countNormal}</strong> anak mencapai WAZ &gt; -2 SD
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                                    <Activity className="w-4 h-4 text-amber-600" />
                                    <span>Tetap Berat Badan Kurang</span>
                                </div>
                                <span className="text-xs font-extrabold text-amber-700">
                                    {Math.round(countTetapKurang / evaluable.length * 100)}%
                                </span>
                            </div>
                            <div className="text-xs text-amber-800">
                                <strong>{countTetapKurang}</strong> anak masih pada -3 ≤ WAZ &lt; -2 SD
                            </div>
                        </div>

                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5 font-bold text-rose-900 text-xs">
                                    <AlertCircle className="w-4 h-4 text-rose-600" />
                                    <span>Berat Badan Sangat Kurang</span>
                                </div>
                                <span className="text-xs font-extrabold text-rose-700">
                                    {countSangatKurang > 0 ? (countSangatKurang / evaluable.length * 100).toFixed(1) : "0"}%
                                </span>
                            </div>
                            <div className="text-xs text-rose-800">
                                <strong>{countSangatKurang}</strong> anak (perlu tatalaksana lanjutan)
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm">
                                Capaian Pemulihan Underweight per Puskesmas
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Persentase balita underweight yang menjadi BB normal (WAZ &gt; -2 SD)
                            </p>
                        </div>
                    </div>

                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 15, right: 10, left: -10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="puskesmas"
                                    angle={-25}
                                    textAnchor="end"
                                    interval={0}
                                    tick={{ fontSize: 10, fill: "#475569" }}
                                    tickLine={false}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tick={{ fontSize: 11, fill: "#64748b" }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => `${v}%`}
                                />
                                <RechartsTooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload;
                                            return (
                                                <div className="bg-slate-900 text-white text-xs rounded-xl p-3 shadow-xl">
                                                    <div className="font-bold text-slate-100">{d.puskesmas}</div>
                                                    <div className="mt-2 space-y-1">
                                                        <div>% Pulih: <strong className="text-amber-300">{d.rate}%</strong></div>
                                                        <div>Balita Pulih: <strong>{d.recovered}</strong> anak</div>
                                                        <div>Evaluable: <strong>{d.evaluable}</strong> anak</div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <ReferenceLine
                                    y={NATIONAL_BENCHMARKS.uw.value}
                                    stroke="#f59e0b"
                                    strokeDasharray="4 4"
                                    strokeWidth={1.5}
                                    label={{
                                        value: `Ref Kemenkes 2025 (${NATIONAL_BENCHMARKS.uw.value}%)`,
                                        position: "insideTopRight",
                                        fill: "#b45309",
                                        fontSize: 10,
                                        fontWeight: 600
                                    }}
                                />
                                <Bar dataKey="rate" name="% Pulih" fill="#d97706" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.rate >= NATIONAL_BENCHMARKS.uw.value ? "#d97706" : "#f59e0b"}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ── 3. PATIENT EPISODE TABLE ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">
                            Audit Data Episode Balita Underweight ({filteredRows.length} Anak)
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Deidentifikasi NIK dan Nama sesuai standar keamanan data kesehatan
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cari nama / puskesmas..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-56 bg-slate-50 border border-slate-200 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                            />
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        </div>
                        <button
                            onClick={exportCsv}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                            <tr>
                                <th className="py-3 px-4">No</th>
                                <th className="py-3 px-4">Anak (Masked)</th>
                                <th className="py-3 px-4">Puskesmas / Desa</th>
                                <th className="py-3 px-4 text-center">BB Awal</th>
                                <th className="py-3 px-4 text-center">WAZ Awal</th>
                                <th className="py-3 px-4 text-center">BB Akhir</th>
                                <th className="py-3 px-4 text-center">WAZ Akhir</th>
                                <th className="py-3 px-4 text-center">Δ WAZ</th>
                                <th className="py-3 px-4 text-center">Status Pemulihan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {paginatedRows.map((r, idx) => {
                                const rowNum = (currentPage - 1) * rowsPerPage + idx + 1;
                                const isPulih = r.zs_bbu_akhir !== null && r.zs_bbu_akhir > -2.0;
                                const delta = (r.zs_bbu_akhir !== null && r.zs_bbu_awal !== null)
                                    ? r.zs_bbu_akhir - r.zs_bbu_awal
                                    : null;
                                return (
                                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-3 px-4 text-slate-400 font-normal">{rowNum}</td>
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-slate-800">{r.nama_masked}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">
                                                {r.person_key.slice(0, 6)}******{r.person_key.slice(-4)} • {r.jk}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-slate-800 font-semibold">{r.puskesmas}</div>
                                            <div className="text-[10px] text-slate-500">{r.desa}</div>
                                        </td>
                                        <td className="py-3 px-4 text-center text-slate-800">{r.bb_awal} kg</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                                                {r.zs_bbu_awal?.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center text-slate-800">{r.bb_akhir} kg</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                                                isPulih ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"
                                            }`}>
                                                {r.zs_bbu_akhir?.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center font-mono">
                                            {delta !== null ? (
                                                <span className={delta > 0 ? "text-emerald-600 font-bold" : "text-slate-500"}>
                                                    {delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)}
                                                </span>
                                            ) : "-"}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                                isPulih ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                            }`}>
                                                {isPulih ? "BB Normal" : "Tetap Kurang"}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div>
                        Menampilkan {Math.min(filteredRows.length, (currentPage - 1) * rowsPerPage + 1)} -{" "}
                        {Math.min(filteredRows.length, currentPage * rowsPerPage)} dari {filteredRows.length} data
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-3 py-1 font-semibold text-slate-700">
                            Hal {currentPage} dari {totalPages || 1}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
