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
    AlertCircle,
    CheckCircle2,
    Info,
    Search,
    Download,
    TrendingUp,
    ChevronLeft,
    ChevronRight,
    ArrowRight
} from "lucide-react";

interface PmtBalitaGkTabProps {
    records: PmtBalitaRecord[];
}

export default function PmtBalitaGkTab({ records }: PmtBalitaGkTabProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    // Filter only Gizi Kurang
    const gkList = records.filter(r => r.indikasi === "gizi_kurang");

    // Metrics
    const totalIntake = gkList.length;
    const appropriate = gkList.filter(r => r.zs_bbtb_awal !== null && r.zs_bbtb_awal < -2.0 && r.zs_bbtb_awal >= -5.0).length;
    const evaluable = gkList.filter(r => r.zs_bbtb_awal !== null && r.zs_bbtb_akhir !== null && r.zs_bbtb_akhir < 50);
    const recovered = evaluable.filter(r => r.zs_bbtb_akhir! > -2.0).length;
    const recoveryRate = evaluable.length > 0 ? (recovered / evaluable.length) * 100 : 0;

    // Transition categories
    const countGiziBaik = evaluable.filter(r => r.zs_bbtb_akhir! >= -2.0 && r.zs_bbtb_akhir! <= 1.0).length;
    const countTetapGikur = evaluable.filter(r => r.zs_bbtb_akhir! < -2.0 && r.zs_bbtb_akhir! >= -3.0).length;
    const countGiziBuruk = evaluable.filter(r => r.zs_bbtb_akhir! < -3.0).length;
    const countGiziLebih = evaluable.filter(r => r.zs_bbtb_akhir! > 1.0).length;

    // Stratification by Baseline Stunting (HAZ < -2)
    const stuntedList = evaluable.filter(r => r.stunted_baseline);
    const nonStuntedList = evaluable.filter(r => !r.stunted_baseline);
    const stuntedRecovered = stuntedList.filter(r => r.zs_bbtb_akhir! > -2.0).length;
    const nonStuntedRecovered = nonStuntedList.filter(r => r.zs_bbtb_akhir! > -2.0).length;
    const stuntedRate = stuntedList.length > 0 ? (stuntedRecovered / stuntedList.length) * 100 : 0;
    const nonStuntedRate = nonStuntedList.length > 0 ? (nonStuntedRecovered / nonStuntedList.length) * 100 : 0;

    // Mean delta WHZ
    let sumDeltaWhz = 0;
    for (const r of evaluable) {
        sumDeltaWhz += (r.zs_bbtb_akhir! - r.zs_bbtb_awal!);
    }
    const meanDeltaWhz = evaluable.length > 0 ? sumDeltaWhz / evaluable.length : 0;

    // Puskesmas breakdown for chart
    const pkmMap: Record<string, { intake: number; evaluable: number; recovered: number }> = {};
    for (const r of gkList) {
        if (!pkmMap[r.puskesmas]) pkmMap[r.puskesmas] = { intake: 0, evaluable: 0, recovered: 0 };
        pkmMap[r.puskesmas].intake++;
        if (r.zs_bbtb_awal !== null && r.zs_bbtb_akhir !== null && r.zs_bbtb_akhir < 50) {
            pkmMap[r.puskesmas].evaluable++;
            if (r.zs_bbtb_akhir > -2.0) pkmMap[r.puskesmas].recovered++;
        }
    }
    const chartData = Object.entries(pkmMap).map(([pkm, val]) => ({
        puskesmas: pkm,
        rate: val.evaluable > 0 ? Math.round((val.recovered / val.evaluable) * 1000) / 10 : 0,
        evaluable: val.evaluable,
        recovered: val.recovered
    })).sort((a, b) => b.rate - a.rate);

    // Filtered records for table
    const filteredRows = gkList.filter(r =>
        r.nama_masked.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.puskesmas.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.desa.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
    const paginatedRows = filteredRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    // CSV export
    const exportCsv = () => {
        const headers = ["NIK (Masked)", "Nama (Masked)", "JK", "Puskesmas", "Desa", "BB Awal", "TB Awal", "WHZ Awal", "BB Akhir", "TB Akhir", "WHZ Akhir", "Delta WHZ", "Status Pemulihan"];
        const rows = gkList.map(r => [
            r.person_key,
            r.nama_masked,
            r.jk,
            r.puskesmas,
            r.desa,
            r.bb_awal ?? "",
            r.tb_awal ?? "",
            r.zs_bbtb_awal ?? "",
            r.bb_akhir ?? "",
            r.tb_akhir ?? "",
            r.zs_bbtb_akhir ?? "",
            (r.zs_bbtb_akhir && r.zs_bbtb_awal) ? (r.zs_bbtb_akhir - r.zs_bbtb_awal).toFixed(2) : "",
            (r.zs_bbtb_akhir && r.zs_bbtb_akhir > -2.0) ? "Pulih (Gizi Baik)" : "Belum Pulih"
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Data_Individu_PMT_Gizi_Kurang_2026.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            {/* ── 1. KPI SCORECARDS ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Intake */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Total Episode Intake
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-800">{totalIntake}</span>
                        <span className="text-xs text-slate-500 font-medium">Balita GK</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        Sasaran Sesuai: <strong className="text-slate-800">{appropriate}</strong> anak ({Math.round(appropriate/totalIntake*100)}%)
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                        Baseline WHZ: -5.0 ≤ WHZ &lt; -2.0 SD
                    </div>
                </div>

                {/* Evaluable */}
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
                        Memiliki BB & TB awal-akhir valid
                    </div>
                </div>

                {/* Angka Pemulihan */}
                <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-sm bg-gradient-to-br from-white to-rose-50/20">
                    <div className="flex items-center justify-between mb-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                            Angka Pemulihan (WHZ &gt; -2)
                        </div>
                        <span className="text-[10px] font-semibold bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                            Panel Teramati
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-rose-600">{recoveryRate.toFixed(1)}%</span>
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            {recovered} Pulih
                        </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        Numerator: <strong className="text-slate-800">{recovered}</strong> / Denominator: <strong className="text-slate-800">{evaluable.length}</strong>
                    </div>
                    <div className="mt-3 pt-3 border-t border-rose-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Ref Kemenkes 2025:</span>
                        <span className="font-bold text-slate-700">{NATIONAL_BENCHMARKS.gk.value}% (n=86k)</span>
                    </div>
                </div>

                {/* Rerata Perubahan WHZ */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Rerata Perubahan ΔWHZ
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-purple-700">
                            {meanDeltaWhz > 0 ? `+${meanDeltaWhz.toFixed(2)}` : meanDeltaWhz.toFixed(2)}
                        </span>
                        <span className="text-xs font-medium text-slate-500">SD Z-Score</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        Stunting Baseline: <strong className="text-slate-800">{stuntedList.length}</strong> anak ({Math.round(stuntedList.length/evaluable.length*100)}%)
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                        Peningkatan antropometri individu
                    </div>
                </div>
            </div>

            {/* ── 2. SCIENTIFIC CAVEAT BANNER ── */}
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                    <div className="font-bold text-amber-950">
                        Batasan Kolom Sumber: Laju Kenaikan BB (g/kgBB/minggu) & Jendela W8 Belum Dapat Dihitung
                    </div>
                    <p className="text-amber-800 leading-relaxed">
                        Berkas ekspor riwayat PMT Gizi Kurang e-PPGBM saat ini hanya memuat <em>Tanggal Pengukuran Awal</em> dan tidak memuat kolom <em>Tanggal Pengukuran Akhir</em> secara tersendiri. Oleh karena itu, luaran di atas dihitung berdasarkan observasi pasangan awal–akhir. Rumus laju mingguan dan evaluasi checkpoint tepat minggu ke-8 berstatus <strong>Belum dapat dihitung</strong> hingga pembaruan ekspor bertanggal lengkap diunggah.
                    </p>
                </div>
            </div>

            {/* ── 3. CHARTS ROW: TRANSITION MATRIX & PUSKESMAS BAR CHART ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Transition Matrix Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm lg:col-span-1">
                    <h3 className="font-bold text-slate-800 text-sm mb-1">
                        Matriks Transisi Status Gizi Balita GK
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                        Perubahan kategori status BB/TB dari baseline ke akhir intervensi
                    </p>

                    <div className="space-y-3">
                        {/* Pulih to Gizi Baik */}
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>Gizi Baik (Pulih)</span>
                                </div>
                                <span className="text-xs font-extrabold text-emerald-700">
                                    {Math.round(countGiziBaik / evaluable.length * 100)}%
                                </span>
                            </div>
                            <div className="text-xs text-emerald-800">
                                <strong>{countGiziBaik}</strong> anak mencapai WHZ &gt; -2 SD
                            </div>
                        </div>

                        {/* Tetap Gizi Kurang */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                                    <Activity className="w-4 h-4 text-amber-600" />
                                    <span>Tetap Gizi Kurang</span>
                                </div>
                                <span className="text-xs font-extrabold text-amber-700">
                                    {Math.round(countTetapGikur / evaluable.length * 100)}%
                                </span>
                            </div>
                            <div className="text-xs text-amber-800">
                                <strong>{countTetapGikur}</strong> anak masih berada pada -3 ≤ WHZ &lt; -2 SD
                            </div>
                        </div>

                        {/* Memburuk to Gizi Buruk */}
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5 font-bold text-rose-900 text-xs">
                                    <AlertCircle className="w-4 h-4 text-rose-600" />
                                    <span>Gizi Buruk (Memburuk)</span>
                                </div>
                                <span className="text-xs font-extrabold text-rose-700">
                                    {countGiziBuruk > 0 ? (countGiziBuruk / evaluable.length * 100).toFixed(1) : "0"}%
                                </span>
                            </div>
                            <div className="text-xs text-rose-800">
                                <strong>{countGiziBuruk}</strong> anak (perlu rujukan TFC / F-75/100)
                            </div>
                        </div>
                    </div>

                    {/* Stratification comparison */}
                    <div className="mt-5 pt-4 border-t border-slate-100">
                        <div className="text-xs font-bold text-slate-700 mb-2">
                            Stratifikasi Baseline Stunting (HAZ &lt; -2):
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                <div className="text-[10px] text-slate-500 font-semibold uppercase">Stunted Awal</div>
                                <div className="text-base font-bold text-slate-800 mt-0.5">{stuntedRate.toFixed(1)}%</div>
                                <div className="text-[10px] text-slate-500">{stuntedRecovered}/{stuntedList.length} pulih</div>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                <div className="text-[10px] text-slate-500 font-semibold uppercase">Tidak Stunted</div>
                                <div className="text-base font-bold text-slate-800 mt-0.5">{nonStuntedRate.toFixed(1)}%</div>
                                <div className="text-[10px] text-slate-500">{nonStuntedRecovered}/{nonStuntedList.length} pulih</div>
                            </div>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-2 italic">
                            *Perbedaan deskriptif; bukan bukti efek kausal stunting terhadap PMT.
                        </div>
                    </div>
                </div>

                {/* Puskesmas Performance Bar Chart */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm">
                                Capaian Pemulihan Balita GK per Puskesmas
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Persentase balita GK yang pulih (WHZ &gt; -2 SD) pada observasi akhir
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
                                                        <div>% Pulih: <strong className="text-rose-300">{d.rate}%</strong></div>
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
                                    y={NATIONAL_BENCHMARKS.gk.value}
                                    stroke="#f59e0b"
                                    strokeDasharray="4 4"
                                    strokeWidth={1.5}
                                    label={{
                                        value: `Ref Kemenkes 2025 (${NATIONAL_BENCHMARKS.gk.value}%)`,
                                        position: "insideTopRight",
                                        fill: "#b45309",
                                        fontSize: 10,
                                        fontWeight: 600
                                    }}
                                />
                                <Bar dataKey="rate" name="% Pulih" fill="#f43f5e" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.rate >= NATIONAL_BENCHMARKS.gk.value ? "#f43f5e" : "#fb7185"}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ── 4. INDIVIDUAL PATIENT AUDIT TABLE ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">
                            Audit Data Episode Balita Gizi Kurang ({filteredRows.length} Anak)
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Identitas pasien dideidentifikasi (masking NIK dan Nama) sesuai prinsip privasi medis
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
                                <th className="py-3 px-4 text-center">BB/TB Awal</th>
                                <th className="py-3 px-4 text-center">WHZ Awal</th>
                                <th className="py-3 px-4 text-center">BB/TB Akhir</th>
                                <th className="py-3 px-4 text-center">WHZ Akhir</th>
                                <th className="py-3 px-4 text-center">Δ WHZ</th>
                                <th className="py-3 px-4 text-center">Status Pemulihan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {paginatedRows.map((r, idx) => {
                                const rowNum = (currentPage - 1) * rowsPerPage + idx + 1;
                                const isPulih = r.zs_bbtb_akhir !== null && r.zs_bbtb_akhir > -2.0;
                                const delta = (r.zs_bbtb_akhir !== null && r.zs_bbtb_awal !== null)
                                    ? r.zs_bbtb_akhir - r.zs_bbtb_awal
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
                                        <td className="py-3 px-4 text-center">
                                            <div className="text-slate-800">{r.bb_awal} kg</div>
                                            <div className="text-[10px] text-slate-400">{r.tb_awal} cm</div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                                                {r.zs_bbtb_awal?.toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="text-slate-800">{r.bb_akhir} kg</div>
                                            <div className="text-[10px] text-slate-400">{r.tb_akhir} cm</div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                                                isPulih ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"
                                            }`}>
                                                {r.zs_bbtb_akhir?.toFixed(2)}
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
                                                isPulih ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                            }`}>
                                                {isPulih ? "Pulih (Gizi Baik)" : "Belum Pulih"}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
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
