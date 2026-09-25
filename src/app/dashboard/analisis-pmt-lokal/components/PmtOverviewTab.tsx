"use client";

import React, { useState } from "react";
import {
    PmtBalitaRecord,
    PmtBumilRecord,
    PmtMetricsOverview,
    aggregateByPuskesmas,
    NATIONAL_BENCHMARKS
} from "@/lib/pmtLokalHelper";
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
    ShieldAlert,
    TrendingUp,
    Users,
    Info,
    Download,
    Search,
    ChevronDown,
    ChevronUp,
    HeartPulse
} from "lucide-react";

interface PmtOverviewTabProps {
    metrics: PmtMetricsOverview;
    balitaRecords: PmtBalitaRecord[];
    bumilRecords: PmtBumilRecord[];
    onSelectSubtab: (subtab: string) => void;
}

export default function PmtOverviewTab({
    metrics,
    balitaRecords,
    bumilRecords,
    onSelectSubtab
}: PmtOverviewTabProps) {
    const [chartIndication, setChartIndication] = useState<"gizi_kurang" | "underweight" | "balita_t">("gizi_kurang");
    const [tableSearch, setTableSearch] = useState("");
    const [showBenchmarkNotes, setShowBenchmarkNotes] = useState(false);

    // Facility breakdown data
    const facilityData = aggregateByPuskesmas(balitaRecords, chartIndication);
    const filteredFacility = facilityData.filter(f =>
        f.puskesmas.toLowerCase().includes(tableSearch.toLowerCase())
    );

    // Benchmark comparison chart data
    const benchmarkComparisonData = [
        {
            group: "Balita Gizi Kurang",
            indikasi: "gizi_kurang",
            capaian: metrics.gkRecoveryRate !== null ? Math.round(metrics.gkRecoveryRate * 10) / 10 : 0,
            benchmark: NATIONAL_BENCHMARKS.gk.value,
            sampleSize: `n=${metrics.gkEvaluable}`,
            unit: "% Pulih (WHZ > -2)"
        },
        {
            group: "Balita Underweight",
            indikasi: "underweight",
            capaian: metrics.uwRecoveryRate !== null ? Math.round(metrics.uwRecoveryRate * 10) / 10 : 0,
            benchmark: NATIONAL_BENCHMARKS.uw.value,
            sampleSize: `n=${metrics.uwEvaluable}`,
            unit: "% Pulih (WAZ > -2)"
        },
        {
            group: "Balita T (Tidak Naik)",
            indikasi: "balita_t",
            capaian: metrics.tImprovedRate !== null ? Math.round(metrics.tImprovedRate * 10) / 10 : 0,
            benchmark: NATIONAL_BENCHMARKS.t.value,
            sampleSize: `n=${metrics.tEvaluable}`,
            unit: "% Membaik (ΔWAZ > 0.1 / N)"
        },
        {
            group: "Ibu Hamil KEK",
            indikasi: "bumil_kek",
            capaian: metrics.bumilMeetingRate !== null ? Math.round(metrics.bumilMeetingRate * 10) / 10 : 0,
            benchmark: NATIONAL_BENCHMARKS.bumil.value,
            sampleSize: `n=${metrics.bumilEvaluable}`,
            unit: "% Sesuai / Naik BB"
        }
    ];

    // CSV Exporter
    const exportCsv = () => {
        const headers = ["Puskesmas", "Total Intake", "Eligible", "Evaluable", "Pulih/Membaik", "% Capaian", "DQA Flags"];
        const rows = facilityData.map(f => [
            f.puskesmas,
            f.total_intake,
            f.eligible,
            f.evaluable,
            f.recovered_or_improved,
            f.recovery_rate !== null ? `${f.recovery_rate}%` : "-",
            f.dqa_issue_count
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Rekap_PMT_Lokal_${chartIndication}_2026.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            {/* ── 1. KPI SCORECARDS ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* GK Card */}
                <div
                    onClick={() => onSelectSubtab("gk")}
                    className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-purple-300 transition-all cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md">
                            Balita Gizi Kurang
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-rose-100/80 flex items-center justify-center text-rose-600 group-hover:scale-105 transition-transform">
                            <Activity className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-800">
                            {metrics.gkRecoveryRate !== null ? `${metrics.gkRecoveryRate.toFixed(1)}%` : "N/A"}
                        </span>
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            Pulih
                        </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 font-medium">
                        Capaian: <strong className="text-slate-800">{metrics.gkRecovered}</strong> dari{" "}
                        <strong className="text-slate-800">{metrics.gkEvaluable}</strong> anak evaluable
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Ref Kemenkes 2025:</span>
                        <span className="font-semibold text-slate-700">59.8% (n=86k)</span>
                    </div>
                </div>

                {/* UW Card */}
                <div
                    onClick={() => onSelectSubtab("uw")}
                    className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-purple-300 transition-all cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md">
                            Balita Underweight
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-amber-100/80 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-800">
                            {metrics.uwRecoveryRate !== null ? `${metrics.uwRecoveryRate.toFixed(1)}%` : "N/A"}
                        </span>
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            Normal
                        </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 font-medium">
                        Capaian: <strong className="text-slate-800">{metrics.uwRecovered}</strong> dari{" "}
                        <strong className="text-slate-800">{metrics.uwEvaluable}</strong> anak evaluable
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Ref Kemenkes 2025:</span>
                        <span className="font-semibold text-slate-700">38.9% (n=150k)</span>
                    </div>
                </div>

                {/* Balita T Card */}
                <div
                    onClick={() => onSelectSubtab("t")}
                    className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-purple-300 transition-all cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
                            Balita BB Tidak Naik (T)
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-100/80 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-800">
                            {metrics.tImprovedRate !== null ? `${metrics.tImprovedRate.toFixed(1)}%` : "N/A"}
                        </span>
                        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            Membaik
                        </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 font-medium">
                        Respon: <strong className="text-slate-800">{metrics.tImproved}</strong> dari{" "}
                        <strong className="text-slate-800">{metrics.tEvaluable}</strong> episode (ΔWAZ &gt; 0.1)
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Ref Kemenkes 2025:</span>
                        <span className="font-semibold text-slate-700">43.2% (n≈279k)</span>
                    </div>
                </div>

                {/* Bumil KEK Card */}
                <div
                    onClick={() => onSelectSubtab("bumil")}
                    className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-purple-300 transition-all cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md">
                            Ibu Hamil KEK
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-purple-100/80 flex items-center justify-center text-purple-600 group-hover:scale-105 transition-transform">
                            <HeartPulse className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-800">
                            {metrics.bumilMeanWeightGain !== null ? `+${metrics.bumilMeanWeightGain.toFixed(2)}` : "N/A"}
                        </span>
                        <span className="text-sm font-semibold text-slate-600">kg rata-rata</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 font-medium">
                        Sesuai Sasaran: <strong className="text-slate-800">{metrics.bumilMeetingTarget}</strong> /{" "}
                        <strong className="text-slate-800">{metrics.bumilEvaluable}</strong> ibu evaluable
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Ref Kemenkes 2025:</span>
                        <span className="font-semibold text-slate-700">53.6% (≥0.5 kg/mgg)</span>
                    </div>
                </div>
            </div>

            {/* ── 2. EPISODE INTAKE SUMMARY & DQA BANNER ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Cakupan Episode Teranalisis
                        </div>
                        <div className="text-lg font-bold text-slate-800">
                            {metrics.totalBalitaIntake.toLocaleString()} Balita + {metrics.totalBumilIntake} Bumil
                        </div>
                        <div className="text-[11px] text-slate-500">
                            Orang Unik: {metrics.uniqueBalitaCount.toLocaleString()} Balita, {metrics.uniqueBumilCount} Bumil
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                        <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Integritas & Audit DQA
                        </div>
                        <div className="text-lg font-bold text-slate-800">
                            {metrics.totalIssues} Temuan Tercatat
                        </div>
                        <div className="text-[11px] text-slate-500">
                            {metrics.blockIssues} Blocker • {metrics.reviewIssues} Needs Review • {metrics.overlapNikCount} Overlap NIK
                        </div>
                    </div>
                </div>

                <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200/80 flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
                            Metodologi Evaluasi PMT
                        </div>
                        <div className="text-xs text-purple-900 font-medium mt-1">
                            Berdasarkan Pedoman Tatalaksana Gizi Kemenkes 2025-2026
                        </div>
                        <div className="text-[11px] text-purple-700 mt-0.5">
                            Status: Observasi Program Teramati
                        </div>
                    </div>
                    <button
                        onClick={() => setShowBenchmarkNotes(!showBenchmarkNotes)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                        <span>Pedoman</span>
                        {showBenchmarkNotes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>

            {/* Accordion Notes on Benchmark */}
            {showBenchmarkNotes && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-2">
                    <div className="font-bold flex items-center gap-1.5 text-blue-800">
                        <Info className="w-4 h-4 text-blue-600" />
                        Catatan Ilmiah & Batas Keterbandingan Benchmark Nasional:
                    </div>
                    <p>
                        1. <strong>Bukan Target Resmi Kinerja:</strong> Angka Kemenkes 2025 (GK 59.8%, UW 38.9%, T 43.2%, Bumil 53.6%) merupakan pembanding deskriptif nasional hasil evaluasi program tahun 2025, bukan indikator SPM atau target mutlak Kabupaten Malang 2026.
                    </p>
                    <p>
                        2. <strong>Bukan Efek Kausal:</strong> Perubahan status antropometri awal-akhir mencerminkan hasil program teramati, dan tidak serta merta membuktikan hubungan kausal PMT semata karena faktor asupan keluarga, morbiditas infeksi, dan retensi pemantauan.
                    </p>
                    <p>
                        3. <strong>Penanganan Tanggal Akhir:</strong> Pada berkas ekspor e-PPGBM riwayat balita saat ini, tanggal ukur akhir belum tercantum secara eksplisit. Evaluasi menggunakan panel observasi awal-akhir; perhitungan laju mingguan (g/kgBB/minggu) berstatus <em>Belum dapat dihitung</em> sampai tanggal akhir bertanggal tersedia.
                    </p>
                </div>
            )}

            {/* ── 3. BENCHMARK COMPARISON CHART ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">
                            Perbandingan Capaian Luaran PMT vs Referensi Kemenkes 2025
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Capaian Kabupaten Malang (Kohort 2026) disandingkan dengan hasil evaluasi Dit Gizi KIA Kemenkes 2025
                        </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-purple-600"></span>
                            <span className="text-slate-600 font-medium">Capaian Malang 2026</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-slate-300"></span>
                            <span className="text-slate-600 font-medium">Ref Kemenkes 2025</span>
                        </div>
                    </div>
                </div>

                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={benchmarkComparisonData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="group"
                                tick={{ fontSize: 11, fill: "#475569" }}
                                tickLine={false}
                                axisLine={{ stroke: "#e2e8f0" }}
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
                                                <div className="font-bold text-slate-100">{d.group}</div>
                                                <div className="text-[11px] text-slate-400 mt-0.5">{d.unit}</div>
                                                <div className="mt-2 space-y-1">
                                                    <div className="flex justify-between gap-4">
                                                        <span className="text-purple-300">Malang 2026:</span>
                                                        <span className="font-bold text-white">{d.capaian}% ({d.sampleSize})</span>
                                                    </div>
                                                    <div className="flex justify-between gap-4">
                                                        <span className="text-slate-400">Ref Kemenkes 2025:</span>
                                                        <span className="font-semibold text-slate-300">{d.benchmark}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="capaian" name="Malang 2026" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={45} />
                            <Bar dataKey="benchmark" name="Ref Kemenkes 2025" fill="#cbd5e1" radius={[6, 6, 0, 0]} maxBarSize={45} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── 4. PUSKESMAS COMPARATIVE BAR CHART & SELECTOR ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">
                            Distribusi Capaian Pemulihan per Puskesmas Terwakili
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Persentase keberhasilan program berdasarkan observasi pasangan baseline-akhir
                        </p>
                    </div>

                    {/* Sub-selector indication */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setChartIndication("gizi_kurang")}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                chartIndication === "gizi_kurang" ? "bg-white text-purple-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            Gizi Kurang (GK)
                        </button>
                        <button
                            onClick={() => setChartIndication("underweight")}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                chartIndication === "underweight" ? "bg-white text-purple-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            Underweight (UW)
                        </button>
                        <button
                            onClick={() => setChartIndication("balita_t")}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                chartIndication === "balita_t" ? "bg-white text-purple-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            Balita T
                        </button>
                    </div>
                </div>

                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={facilityData.slice(0, 14)}
                            margin={{ top: 15, right: 10, left: -10, bottom: 25 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="puskesmas"
                                angle={-30}
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
                                                    <div>Capaian: <strong className="text-purple-300">{d.recovery_rate}%</strong></div>
                                                    <div>Pulih/Membaik: <strong>{d.recovered_or_improved}</strong> anak</div>
                                                    <div>Evaluable: <strong>{d.evaluable}</strong> anak</div>
                                                    <div>Total Intake: <strong>{d.total_intake}</strong> episode</div>
                                                    {d.dqa_issue_count > 0 && (
                                                        <div className="text-amber-400">Flag DQA: {d.dqa_issue_count} issue</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <ReferenceLine
                                y={
                                    chartIndication === "gizi_kurang"
                                        ? NATIONAL_BENCHMARKS.gk.value
                                        : chartIndication === "underweight"
                                        ? NATIONAL_BENCHMARKS.uw.value
                                        : NATIONAL_BENCHMARKS.t.value
                                }
                                stroke="#f59e0b"
                                strokeDasharray="4 4"
                                strokeWidth={1.5}
                                label={{
                                    value: `Ref Kemenkes 2025 (${
                                        chartIndication === "gizi_kurang" ? "59.8%" : chartIndication === "underweight" ? "38.9%" : "43.2%"
                                    })`,
                                    position: "insideTopRight",
                                    fill: "#b45309",
                                    fontSize: 10,
                                    fontWeight: 600
                                }}
                            />
                            <Bar
                                dataKey="recovery_rate"
                                name="% Capaian"
                                fill="#8b5cf6"
                                radius={[4, 4, 0, 0]}
                            >
                                {facilityData.slice(0, 14).map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.recovery_rate && entry.recovery_rate >= 50 ? "#8b5cf6" : "#a78bfa"}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── 5. REKAPITULASI DETAIL PUSKESMAS ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">
                            Rekapitulasi Kinerja & Integritas Data per Puskesmas
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Agregasi tingkat fasilitas: episode intake, kelayakan klinis (eligibility), evaluable, dan capaian luaran
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cari puskesmas..."
                                value={tableSearch}
                                onChange={(e) => setTableSearch(e.target.value)}
                                className="w-48 bg-slate-50 border border-slate-200 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
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
                                <th className="py-3 px-4">Puskesmas</th>
                                <th className="py-3 px-4 text-center">Total Intake</th>
                                <th className="py-3 px-4 text-center">Sasaran Sesuai</th>
                                <th className="py-3 px-4 text-center">Evaluable</th>
                                <th className="py-3 px-4 text-center">Pulih / Membaik</th>
                                <th className="py-3 px-4 text-center">% Capaian</th>
                                <th className="py-3 px-4 text-center">Status vs Ref</th>
                                <th className="py-3 px-4 text-center">Flag DQA</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredFacility.map((f, idx) => {
                                const targetBench = chartIndication === "gizi_kurang" ? 59.8 : chartIndication === "underweight" ? 38.9 : 43.2;
                                const isAbove = f.recovery_rate !== null && f.recovery_rate >= targetBench;
                                return (
                                    <tr key={f.puskesmas} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-3 px-4 text-slate-400 font-normal">{idx + 1}</td>
                                        <td className="py-3 px-4 font-bold text-slate-800">{f.puskesmas}</td>
                                        <td className="py-3 px-4 text-center font-semibold text-slate-700">{f.total_intake}</td>
                                        <td className="py-3 px-4 text-center text-slate-600">{f.eligible}</td>
                                        <td className="py-3 px-4 text-center text-slate-600">{f.evaluable}</td>
                                        <td className="py-3 px-4 text-center font-bold text-slate-800">{f.recovered_or_improved}</td>
                                        <td className="py-3 px-4 text-center">
                                            {f.recovery_rate !== null ? (
                                                <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                                                    {f.recovery_rate}%
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {f.recovery_rate !== null ? (
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                                    isAbove ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                                                }`}>
                                                    {isAbove ? "≥ Ref 2025" : "< Ref 2025"}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-[10px]">N/A</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {f.dqa_issue_count > 0 ? (
                                                <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                                                    <ShieldAlert className="w-3 h-3 text-amber-600" />
                                                    {f.dqa_issue_count}
                                                </span>
                                            ) : (
                                                <span className="text-emerald-600 font-semibold text-[11px]">Bersih</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
