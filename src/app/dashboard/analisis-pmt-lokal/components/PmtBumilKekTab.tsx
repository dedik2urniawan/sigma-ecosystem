"use client";

import React, { useState } from "react";
import { PmtBumilRecord, NATIONAL_BENCHMARKS } from "@/lib/pmtLokalHelper";
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
    HeartPulse,
    Search,
    Download,
    AlertCircle,
    CheckCircle2,
    Calendar,
    ChevronLeft,
    ChevronRight,
    TrendingUp
} from "lucide-react";

interface PmtBumilKekTabProps {
    records: PmtBumilRecord[];
}

export default function PmtBumilKekTab({ records }: PmtBumilKekTabProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    const totalIntake = records.length;
    const countKek = records.filter(r => r.indikasi === "kek").length;
    const countRisiko = records.filter(r => r.indikasi === "risiko_kek").length;
    const countSelesai = records.filter(r => r.status_pmt_reported === "Selesai").length;
    const evaluable = records.filter(r => r.bb_awal !== null && r.bb_akhir !== null && r.bb_akhir > 0);
    const countMissingEndWeight = records.filter(r => r.bb_akhir === null || r.bb_akhir <= 0).length;

    // Weight gain calculations
    let totalGain = 0;
    let countMeetingTarget = 0;
    for (const b of evaluable) {
        const gain = (b.bb_akhir ?? 0) - (b.bb_awal ?? 0);
        totalGain += gain;
        if (gain >= 2.0 || b.hasil_pemberian_reported === "Sesuai") {
            countMeetingTarget++;
        }
    }
    const meanGain = evaluable.length > 0 ? totalGain / evaluable.length : 0;
    const meetingRate = evaluable.length > 0 ? (countMeetingTarget / evaluable.length) * 100 : 0;

    // Weight gain distribution bins
    const gainOver3kg = evaluable.filter(r => (r.bb_akhir! - r.bb_awal!) >= 3.0).length;
    const gain2to3kg = evaluable.filter(r => {
        const g = r.bb_akhir! - r.bb_awal!;
        return g >= 2.0 && g < 3.0;
    }).length;
    const gain1to2kg = evaluable.filter(r => {
        const g = r.bb_akhir! - r.bb_awal!;
        return g >= 1.0 && g < 2.0;
    }).length;
    const gainUnder1kg = evaluable.filter(r => (r.bb_akhir! - r.bb_awal!) < 1.0).length;

    // Puskesmas breakdown for chart
    const pkmMap: Record<string, { intake: number; evaluable: number; totalGain: number }> = {};
    for (const r of records) {
        if (!pkmMap[r.puskesmas]) pkmMap[r.puskesmas] = { intake: 0, evaluable: 0, totalGain: 0 };
        pkmMap[r.puskesmas].intake++;
        if (r.bb_awal !== null && r.bb_akhir !== null && r.bb_akhir > 0) {
            pkmMap[r.puskesmas].evaluable++;
            pkmMap[r.puskesmas].totalGain += (r.bb_akhir - r.bb_awal);
        }
    }
    const chartData = Object.entries(pkmMap).map(([pkm, val]) => ({
        puskesmas: pkm,
        meanGain: val.evaluable > 0 ? Math.round((val.totalGain / val.evaluable) * 10) / 10 : 0,
        evaluable: val.evaluable,
        intake: val.intake
    })).sort((a, b) => b.meanGain - a.meanGain);

    // Filtered rows for table
    const filteredRows = records.filter(r =>
        r.nama_masked.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.puskesmas.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.desa.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
    const paginatedRows = filteredRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    // CSV export
    const exportCsv = () => {
        const headers = ["NIK (Masked)", "Nama (Masked)", "Puskesmas", "Desa", "Alasan / Indikasi", "Tgl Mulai", "Tgl Selesai", "BB Awal (kg)", "BB Akhir (kg)", "Kenaikan BB (kg)", "Status PMT", "Hasil Pemberian"];
        const rows = records.map(r => [
            r.person_key,
            r.nama_masked,
            r.puskesmas,
            r.desa,
            r.alasan_raw ?? (r.indikasi === "kek" ? "Kurang Energi Kronis" : "Risiko KEK"),
            r.tgl_pemberian_pertama,
            r.tgl_selesai_reported ?? "",
            r.bb_awal ?? "",
            r.bb_akhir ?? "",
            (r.bb_akhir && r.bb_awal) ? (r.bb_akhir - r.bb_awal).toFixed(1) : "",
            r.status_pmt_reported ?? "",
            r.hasil_pemberian_reported ?? ""
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Data_Individu_PMT_Bumil_KEK_2026.csv`);
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
                        <span className="text-xs text-slate-500 font-medium">Ibu Hamil</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        {countKek} KEK (LiLA &lt; 23.5) • {countRisiko} Risiko KEK
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                        Kohort Mulai: Juni 2026
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Status Selesai Administrasi
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-purple-700">{countSelesai}</span>
                        <span className="text-xs text-slate-500 font-medium">dari {totalIntake} Ibu</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        Timbang Akhir Valid: <strong className="text-slate-800">{evaluable.length}</strong> ibu
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                        {countMissingEndWeight} kasus BB akhir kosong
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-purple-200 shadow-sm bg-gradient-to-br from-white to-purple-50/20">
                    <div className="flex items-center justify-between mb-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
                            Rerata Kenaikan BB
                        </div>
                        <span className="text-[10px] font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                            Panel Teramati
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-purple-700">+{meanGain.toFixed(2)}</span>
                        <span className="text-sm font-semibold text-slate-600">kg</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        Dihitung dari <strong className="text-slate-800">{evaluable.length}</strong> ibu dengan BB akhir valid
                    </div>
                    <div className="mt-3 pt-3 border-t border-purple-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Ref Kemenkes 2025:</span>
                        <span className="font-bold text-slate-700">{NATIONAL_BENCHMARKS.bumil.value}% (≥0.5 kg/mgg)</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Kenaikan BB Sesuai Sasaran
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-800">{meetingRate.toFixed(1)}%</span>
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            {countMeetingTarget} Ibu
                        </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        Numerator: <strong className="text-slate-800">{countMeetingTarget}</strong> / Denominator: <strong className="text-slate-800">{evaluable.length}</strong>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                        Kenaikan ≥ 2.0 kg selama siklus PMT
                    </div>
                </div>
            </div>

            {/* ── 2. DQA INTEGRITY ALERT ON BUMIL ── */}
            {countMissingEndWeight > 0 && (
                <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900 space-y-1">
                        <div className="font-bold text-amber-950">
                            Temuan DQA: {countMissingEndWeight} Ibu Hamil Belum Memiliki Catatan Berat Badan Akhir
                        </div>
                        <p className="text-amber-800 leading-relaxed">
                            Sebanyak {countMissingEndWeight} baris pada berkas riwayat PMT Ibu Hamil memiliki kolom Berat Badan Akhir kosong (termasuk 1 pasien yang telah bertanda status <em>Selesai</em>). Pasien ini dikecualikan dari perhitungan rata-rata kenaikan berat badan agar tidak menghasilkan estimasi bias ke bawah.
                        </p>
                    </div>
                </div>
            )}

            {/* ── 3. CHARTS ROW ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm lg:col-span-1">
                    <h3 className="font-bold text-slate-800 text-sm mb-1">
                        Distribusi Kenaikan Berat Badan Ibu
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                        Klasifikasi total penambahan berat badan selama periode PMT
                    </p>

                    <div className="space-y-3">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-emerald-900 text-xs">Optimal (≥ 3.0 kg)</span>
                                <span className="text-xs font-extrabold text-emerald-700">
                                    {Math.round(gainOver3kg / evaluable.length * 100)}%
                                </span>
                            </div>
                            <div className="text-xs text-emerald-800">
                                <strong>{gainOver3kg}</strong> ibu mengalami kenaikan sangat memuaskan
                            </div>
                        </div>

                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-purple-900 text-xs">Cukup (2.0 - 2.9 kg)</span>
                                <span className="text-xs font-extrabold text-purple-700">
                                    {Math.round(gain2to3kg / evaluable.length * 100)}%
                                </span>
                            </div>
                            <div className="text-xs text-purple-800">
                                <strong>{gain2to3kg}</strong> ibu memenuhi target penambahan minimal
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-amber-900 text-xs">Rendah (1.0 - 1.9 kg)</span>
                                <span className="text-xs font-extrabold text-amber-700">
                                    {Math.round(gain1to2kg / evaluable.length * 100)}%
                                </span>
                            </div>
                            <div className="text-xs text-amber-800">
                                <strong>{gain1to2kg}</strong> ibu perlu konseling kepatuhan menu lokal
                            </div>
                        </div>

                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-rose-900 text-xs">Kurang (&lt; 1.0 kg)</span>
                                <span className="text-xs font-extrabold text-rose-700">
                                    {Math.round(gainUnder1kg / evaluable.length * 100)}%
                                </span>
                            </div>
                            <div className="text-xs text-rose-800">
                                <strong>{gainUnder1kg}</strong> ibu perlu skrining penyakit penyerta / KIE
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm">
                                Rata-rata Kenaikan Berat Badan per Puskesmas (kg)
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Kenaikan berat badan kumulatif ibu hamil KEK per fasilitas kesehatan
                            </p>
                        </div>
                    </div>

                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 15, right: 10, left: -10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="puskesmas"
                                    tick={{ fontSize: 11, fill: "#475569" }}
                                    tickLine={false}
                                />
                                <YAxis
                                    domain={[0, 5]}
                                    tick={{ fontSize: 11, fill: "#64748b" }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => `+${v}kg`}
                                />
                                <RechartsTooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0].payload;
                                            return (
                                                <div className="bg-slate-900 text-white text-xs rounded-xl p-3 shadow-xl">
                                                    <div className="font-bold text-slate-100">{d.puskesmas}</div>
                                                    <div className="mt-2 space-y-1">
                                                        <div>Rerata Kenaikan: <strong className="text-purple-300">+{d.meanGain} kg</strong></div>
                                                        <div>Ibu Evaluable: <strong>{d.evaluable}</strong> ibu</div>
                                                        <div>Total Intake: <strong>{d.intake}</strong> ibu</div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <ReferenceLine
                                    y={2.0}
                                    stroke="#8b5cf6"
                                    strokeDasharray="4 4"
                                    strokeWidth={1.5}
                                    label={{
                                        value: "Target Minimal Kumulatif (+2.0 kg)",
                                        position: "insideTopRight",
                                        fill: "#7c3aed",
                                        fontSize: 10,
                                        fontWeight: 600
                                    }}
                                />
                                <Bar dataKey="meanGain" name="Rerata Kenaikan (kg)" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={45}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.meanGain >= 2.0 ? "#8b5cf6" : "#c4b5fd"}
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
                            Audit Data Episode Ibu Hamil KEK ({filteredRows.length} Ibu)
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
                                <th className="py-3 px-4">Ibu (Masked)</th>
                                <th className="py-3 px-4">Puskesmas / Desa</th>
                                <th className="py-3 px-4">Indikasi</th>
                                <th className="py-3 px-4 text-center">Periode PMT</th>
                                <th className="py-3 px-4 text-center">BB Awal</th>
                                <th className="py-3 px-4 text-center">BB Akhir</th>
                                <th className="py-3 px-4 text-center">Kenaikan (kg)</th>
                                <th className="py-3 px-4 text-center">Status Laporan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {paginatedRows.map((r, idx) => {
                                const rowNum = (currentPage - 1) * rowsPerPage + idx + 1;
                                const isMissingEnd = r.bb_akhir === null || r.bb_akhir <= 0;
                                return (
                                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-3 px-4 text-slate-400 font-normal">{rowNum}</td>
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-slate-800">{r.nama_masked}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">
                                                {r.person_key.slice(0, 6)}******{r.person_key.slice(-4)}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-slate-800 font-semibold">{r.puskesmas}</div>
                                            <div className="text-[10px] text-slate-500">{r.desa}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                                r.indikasi === "kek" ? "bg-rose-50 text-rose-700" : "bg-purple-50 text-purple-700"
                                            }`}>
                                                {r.alasan_raw ?? (r.indikasi === "kek" ? "KEK" : "Risiko KEK")}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center text-slate-600">
                                            <div>{r.tgl_pemberian_pertama}</div>
                                            <div className="text-[10px] text-slate-400">s/d {r.tgl_selesai_reported ?? "Berjalan"}</div>
                                        </td>
                                        <td className="py-3 px-4 text-center text-slate-800 font-semibold">{r.bb_awal} kg</td>
                                        <td className="py-3 px-4 text-center">
                                            {isMissingEnd ? (
                                                <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                                                    Kosong
                                                </span>
                                            ) : (
                                                <span className="text-slate-800 font-semibold">{r.bb_akhir} kg</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center font-bold">
                                            {r.delta_bb_kg !== null ? (
                                                <span className={r.delta_bb_kg >= 2.0 ? "text-emerald-600" : "text-amber-600"}>
                                                    +{r.delta_bb_kg.toFixed(1)} kg
                                                </span>
                                            ) : "-"}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                                r.status_pmt_reported === "Selesai"
                                                    ? isMissingEnd
                                                        ? "bg-amber-100 text-amber-800"
                                                        : "bg-emerald-100 text-emerald-800"
                                                    : "bg-slate-100 text-slate-700"
                                            }`}>
                                                {r.status_pmt_reported} {isMissingEnd && "(!)"}
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
