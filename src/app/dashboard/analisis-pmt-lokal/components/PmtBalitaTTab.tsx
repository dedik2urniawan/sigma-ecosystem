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
    TrendingUp,
    Info,
    Search,
    Download,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Activity,
    AlertCircle
} from "lucide-react";

interface PmtBalitaTTabProps {
    records: PmtBalitaRecord[];
}

export default function PmtBalitaTTab({ records }: PmtBalitaTTabProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    // Filter Balita T
    const tList = records.filter(r => r.indikasi === "balita_t");

    const totalIntake = tList.length;
    const uniquePersons = new Set(tList.map(r => r.person_key)).size;
    const evaluable = tList.filter(r => r.zs_bbu_awal !== null && r.zs_bbu_akhir !== null);
    
    // Respon positif: ΔWAZ > 0.1 or status kenaikan N
    const improved = evaluable.filter(r => {
        const delta = (r.zs_bbu_akhir ?? 0) - (r.zs_bbu_awal ?? 0);
        return delta > 0.1 || r.status_pertumbuhan_akhir === "N";
    }).length;
    const improvedRate = evaluable.length > 0 ? (improved / evaluable.length) * 100 : 0;

    // Delta Distribution bins
    const binSignificant = evaluable.filter(r => (r.zs_bbu_akhir! - r.zs_bbu_awal!) > 0.2).length;
    const binModerate = evaluable.filter(r => {
        const d = r.zs_bbu_akhir! - r.zs_bbu_awal!;
        return d > 0.1 && d <= 0.2;
    }).length;
    const binSlight = evaluable.filter(r => {
        const d = r.zs_bbu_akhir! - r.zs_bbu_awal!;
        return d > 0 && d <= 0.1;
    }).length;
    const binNegative = evaluable.filter(r => (r.zs_bbu_akhir! - r.zs_bbu_awal!) <= 0).length;

    // Puskesmas breakdown for chart
    const pkmMap: Record<string, { intake: number; evaluable: number; improved: number }> = {};
    for (const r of tList) {
        if (!pkmMap[r.puskesmas]) pkmMap[r.puskesmas] = { intake: 0, evaluable: 0, improved: 0 };
        pkmMap[r.puskesmas].intake++;
        if (r.zs_bbu_awal !== null && r.zs_bbu_akhir !== null) {
            pkmMap[r.puskesmas].evaluable++;
            const delta = r.zs_bbu_akhir - r.zs_bbu_awal;
            if (delta > 0.1 || r.status_pertumbuhan_akhir === "N") {
                pkmMap[r.puskesmas].improved++;
            }
        }
    }
    const chartData = Object.entries(pkmMap).map(([pkm, val]) => ({
        puskesmas: pkm,
        rate: val.evaluable > 0 ? Math.round((val.improved / val.evaluable) * 1000) / 10 : 0,
        evaluable: val.evaluable,
        improved: val.improved
    })).sort((a, b) => b.rate - a.rate);

    // Filtered rows for table
    const filteredRows = tList.filter(r =>
        r.nama_masked.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.puskesmas.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.desa.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
    const paginatedRows = filteredRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    // CSV export
    const exportCsv = () => {
        const headers = ["NIK (Masked)", "Nama (Masked)", "JK", "Puskesmas", "Desa", "BB Awal", "WAZ Awal", "BB Akhir", "WAZ Akhir", "Delta WAZ", "Status Respon"];
        const rows = tList.map(r => {
            const delta = (r.zs_bbu_akhir && r.zs_bbu_awal) ? r.zs_bbu_akhir - r.zs_bbu_awal : null;
            const isGood = delta !== null && delta > 0.1;
            return [
                r.person_key,
                r.nama_masked,
                r.jk,
                r.puskesmas,
                r.desa,
                r.bb_awal ?? "",
                r.zs_bbu_awal ?? "",
                r.bb_akhir ?? "",
                r.zs_bbu_akhir ?? "",
                delta !== null ? delta.toFixed(2) : "",
                isGood ? "Merespon Baik (Δ > 0.1)" : "Belum Merespon"
            ];
        });
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Data_Individu_PMT_Balita_T_2026.csv`);
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
                        <span className="text-3xl font-extrabold text-slate-800">{totalIntake.toLocaleString()}</span>
                        <span className="text-xs text-slate-500 font-medium">Episode</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        Orang Unik: <strong className="text-slate-800">{uniquePersons.toLocaleString()}</strong> anak
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                        Indikasi: Berat Badan Tidak Naik (T)
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Observasi Pasangan Valid
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-800">{evaluable.length.toLocaleString()}</span>
                        <span className="text-xs text-slate-500 font-medium">Evaluable</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        Kelengkapan Pasangan: <strong className="text-slate-800">{Math.round(evaluable.length/totalIntake*100)}%</strong>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                        Memiliki BB & WAZ awal-akhir
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-sm bg-gradient-to-br from-white to-indigo-50/20">
                    <div className="flex items-center justify-between mb-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">
                            Respon Positif (ΔWAZ &gt; 0.1)
                        </div>
                        <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                            Panel Teramati
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-indigo-700">{improvedRate.toFixed(1)}%</span>
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            {improved.toLocaleString()} Membaik
                        </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        Numerator: <strong className="text-slate-800">{improved}</strong> / Denominator: <strong className="text-slate-800">{evaluable.length}</strong>
                    </div>
                    <div className="mt-3 pt-3 border-t border-indigo-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Ref Kemenkes 2025:</span>
                        <span className="font-bold text-slate-700">{NATIONAL_BENCHMARKS.t.value}% (n≈279k)</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Kenaikan Berat Badan Signifikan
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-purple-700">{binSignificant}</span>
                        <span className="text-xs font-medium text-slate-500">Anak (Δ &gt; 0.2 SD)</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        Proporsi: <strong className="text-slate-800">{Math.round(binSignificant/evaluable.length*100)}%</strong> dari evaluable
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                        Pertumbuhan akseleratif (catch-up)
                    </div>
                </div>
            </div>

            {/* ── 2. PROXY NOTES & METHODOLOGY CAVEAT ── */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 space-y-1">
                    <div className="font-bold text-blue-950">
                        Catatan Operasional Indikasi Balita T: Verifikasi 2 Kali Penimbangan Berturut-turut
                    </div>
                    <p className="text-blue-800 leading-relaxed">
                        Sesuai standar tatalaksana Kemenkes, balita T adalah anak yang tidak naik berat badannya dalam 2 kali penimbangan berturut-turut sebelum intervensi. Pada berkas riwayat e-PPGBM saat ini, riwayat 2 penimbangan sebelum baseline tidak terekam secara longitudinal. Status sasaran di atas menggunakan <strong>proksi status pertumbuhan awal yang tercantum</strong>.
                    </p>
                </div>
            </div>

            {/* ── 3. CHARTS ROW: DELTA DISTRIBUTION & PUSKESMAS BAR ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm lg:col-span-1">
                    <h3 className="font-bold text-slate-800 text-sm mb-1">
                        Distribusi Respon Kenaikan ΔWAZ
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                        Tingkat perubahan deviasi baku berat badan menurut umur
                    </p>

                    <div className="space-y-3">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-emerald-900 text-xs">Sangat Baik (Δ &gt; 0.2 SD)</span>
                                <span className="text-xs font-extrabold text-emerald-700">
                                    {Math.round(binSignificant / evaluable.length * 100)}%
                                </span>
                            </div>
                            <div className="text-xs text-emerald-800">
                                <strong>{binSignificant}</strong> anak melompat ke kurva di atasnya
                            </div>
                        </div>

                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-indigo-900 text-xs">Cukup Baik (0.1 &lt; Δ ≤ 0.2 SD)</span>
                                <span className="text-xs font-extrabold text-indigo-700">
                                    {Math.round(binModerate / evaluable.length * 100)}%
                                </span>
                            </div>
                            <div className="text-xs text-indigo-800">
                                <strong>{binModerate}</strong> anak memenuhi ambang respon baku
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-amber-900 text-xs">Kenaikan Rendah (0 &lt; Δ ≤ 0.1 SD)</span>
                                <span className="text-xs font-extrabold text-amber-700">
                                    {Math.round(binSlight / evaluable.length * 100)}%
                                </span>
                            </div>
                            <div className="text-xs text-amber-800">
                                <strong>{binSlight}</strong> anak perlu evaluasi asupan & penyakit penyerta
                            </div>
                        </div>

                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-rose-900 text-xs">Tetap / Turun (Δ ≤ 0 SD)</span>
                                <span className="text-xs font-extrabold text-rose-700">
                                    {Math.round(binNegative / evaluable.length * 100)}%
                                </span>
                            </div>
                            <div className="text-xs text-rose-800">
                                <strong>{binNegative}</strong> anak memerlukan rujukan dokter/Sp.A
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm">
                                Capaian Respon Positif Balita T per Puskesmas
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Persentase balita T dengan respon peningkatan ΔWAZ &gt; 0.1 SD
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
                                                        <div>% Respon: <strong className="text-indigo-300">{d.rate}%</strong></div>
                                                        <div>Membaik: <strong>{d.improved}</strong> anak</div>
                                                        <div>Evaluable: <strong>{d.evaluable}</strong> anak</div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <ReferenceLine
                                    y={NATIONAL_BENCHMARKS.t.value}
                                    stroke="#f59e0b"
                                    strokeDasharray="4 4"
                                    strokeWidth={1.5}
                                    label={{
                                        value: `Ref Kemenkes 2025 (${NATIONAL_BENCHMARKS.t.value}%)`,
                                        position: "insideTopRight",
                                        fill: "#b45309",
                                        fontSize: 10,
                                        fontWeight: 600
                                    }}
                                />
                                <Bar dataKey="rate" name="% Respon" fill="#6366f1" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.rate >= NATIONAL_BENCHMARKS.t.value ? "#6366f1" : "#818cf8"}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ── 4. AUDIT TABLE ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">
                            Audit Data Episode Balita T ({filteredRows.length.toLocaleString()} Episode)
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
                                <th className="py-3 px-4 text-center">Status Respon</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {paginatedRows.map((r, idx) => {
                                const rowNum = (currentPage - 1) * rowsPerPage + idx + 1;
                                const delta = (r.zs_bbu_akhir !== null && r.zs_bbu_awal !== null)
                                    ? r.zs_bbu_akhir - r.zs_bbu_awal
                                    : null;
                                const isMerespon = delta !== null && delta > 0.1;
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
                                        <td className="py-3 px-4 text-center font-mono text-slate-700">
                                            {r.zs_bbu_awal?.toFixed(2)}
                                        </td>
                                        <td className="py-3 px-4 text-center text-slate-800">{r.bb_akhir} kg</td>
                                        <td className="py-3 px-4 text-center font-mono text-slate-700">
                                            {r.zs_bbu_akhir?.toFixed(2)}
                                        </td>
                                        <td className="py-3 px-4 text-center font-mono font-bold">
                                            {delta !== null ? (
                                                <span className={delta > 0.1 ? "text-emerald-600" : delta > 0 ? "text-indigo-600" : "text-rose-600"}>
                                                    {delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)}
                                                </span>
                                            ) : "-"}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                                isMerespon ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                                            }`}>
                                                {isMerespon ? "Merespon Baik" : "Belum Merespon"}
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
