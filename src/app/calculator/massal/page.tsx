"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { fetchLmsReference, type LmsReference } from "../../../lib/supabase-pkmk";
import {
    autoDetectColumns, normalizeRows, calculateMassAssessment, computeAnalysis,
    downloadTemplate, exportMassExcel, exportMassPDF,
    type RawRow, type ColMap, type MappedKey, type MassAnalysisResult, type MassRowResult,
} from "../../../lib/mass-calculator";

// ============================================================
// CONSTANTS
// ============================================================
type Step = "landing" | "upload" | "mapping" | "processing" | "results";

const REQUIRED_KEYS: MappedKey[] = ["jenis_kelamin", "tanggal_lahir", "tanggal_ukur", "berat_badan", "tinggi_badan", "cara_ukur"];
const OPTIONAL_KEYS: MappedKey[] = ["nama", "wilayah", "nomor"];

const KEY_LABELS: Record<MappedKey, { label: string; desc: string; required: boolean }> = {
    jenis_kelamin: { label: "Jenis Kelamin", desc: "1/m=L, 2/f=P", required: true },
    tanggal_lahir: { label: "Tanggal Lahir", desc: "DD/MM/YYYY", required: true },
    tanggal_ukur: { label: "Tanggal Ukur", desc: "DD/MM/YYYY", required: true },
    berat_badan: { label: "Berat Badan (kg)", desc: "Angka, titik=desimal", required: true },
    tinggi_badan: { label: "Tinggi/Panjang Badan (cm)", desc: "Angka, titik=desimal", required: true },
    cara_ukur: { label: "Cara Ukur", desc: "l/L=Terlentang, h/H=Berdiri", required: true },
    nama: { label: "Nama Anak", desc: "Teks bebas", required: false },
    wilayah: { label: "Wilayah/Kecamatan", desc: "Untuk agregasi prevalensi", required: false },
    desa: { label: "Desa/Kelurahan", desc: "Sub-wilayah (opsional)", required: false },
    nomor: { label: "Nomor/ID", desc: "Identifikasi baris", required: false },
};

const PIE_COLORS = ["#6366f1", "#10b981", "#f97316", "#ec4899", "#14b8a6", "#f59e0b"];

// ============================================================
// SMALL HELPERS
// ============================================================
function SeverityBadge({ cls }: { cls: string }) {
    const severe = ["Berat Badan Sangat Kurang", "Sangat Pendek", "Gizi Buruk"].includes(cls);
    const moderate = ["Berat Badan Kurang", "Pendek", "Gizi Kurang"].includes(cls);
    const risk = ["Risiko Berat Badan Lebih", "Tinggi", "Berisiko Gizi Lebih", "Gizi Lebih"].includes(cls);
    const obese = ["Obesitas"].includes(cls);
    const cn = severe ? "bg-red-100 text-red-700" : moderate ? "bg-orange-100 text-orange-700"
        : risk ? "bg-amber-100 text-amber-700" : obese ? "bg-rose-100 text-rose-700"
            : "bg-emerald-100 text-emerald-700";
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cn}`}>{cls}</span>;
}

function StatCard({ label, value, sub, icon, color }: { label: string; value: string | number; sub?: string; icon: string; color: string }) {
    return (
        <div className={`rounded-2xl border-2 ${color} p-5`}>
            <span className="material-icons-round text-2xl mb-2 block opacity-80">{icon}</span>
            <div className="text-3xl font-black font-mono">{value}</div>
            <div className="text-xs font-bold mt-1">{label}</div>
            {sub && <div className="text-[10px] opacity-60 mt-0.5 font-mono">{sub}</div>}
        </div>
    );
}

// ============================================================
// PREVALENCE TABLE
// ============================================================
function PrevalenceTable({ title, items, icon }: { title: string; items: { category: string; n: number; pct: number }[]; icon: string }) {
    const maxPct = Math.max(...items.map(i => i.pct), 0.1);
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="material-icons-round text-base text-indigo-500">{icon}</span>{title}
            </h4>
            <div className="space-y-3">
                {items.map((item, i) => (
                    <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-700">{item.category}</span>
                            <span className="font-mono font-bold text-slate-600">{item.n} ({item.pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all"
                                style={{ width: `${(item.pct / maxPct) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================
// RESULTS DASHBOARD
// ============================================================
function ResultsDashboard({ result, onReset }: { result: MassAnalysisResult; onReset: () => void }) {
    const [activeTab, setActiveTab] = useState<"summary" | "prevalensi" | "team" | "data" | "wilayah">("summary");
    const [dataPage, setDataPage] = useState(0);
    const [exportingPDF, setExportingPDF] = useState(false);
    const [exportingXLSX, setExportingXLSX] = useState(false);
    const PAGE_SIZE = 50;
    const pagedData = result.valid.slice(dataPage * PAGE_SIZE, (dataPage + 1) * PAGE_SIZE);

    const tabs = [
        { id: "summary", label: "Ringkasan", icon: "dashboard" },
        { id: "prevalensi", label: "Prevalensi", icon: "bar_chart" },
        { id: "team", label: "WHO TEAM", icon: "leaderboard" },
        { id: "wilayah", label: "Per Wilayah", icon: "location_on" },
        { id: "data", label: "Data Individu", icon: "table_rows" },
    ] as const;

    const handleExportXLSX = async () => {
        setExportingXLSX(true);
        try { await exportMassExcel(result, `SIGMA-Massal-${new Date().toISOString().slice(0, 10)}.xlsx`); }
        finally { setExportingXLSX(false); }
    };
    const handleExportPDF = async () => {
        setExportingPDF(true);
        try { await exportMassPDF(result, `SIGMA-Massal-${new Date().toISOString().slice(0, 10)}.pdf`); }
        finally { setExportingPDF(false); }
    };

    return (
        <div className="space-y-6">
            {/* Action strip */}
            <div className="flex flex-wrap gap-3 justify-between items-center">
                <button onClick={onReset} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 shadow-sm">
                    <span className="material-icons-round text-sm">refresh</span>Upload Baru
                </button>
                <div className="flex gap-3">
                    <button onClick={handleExportXLSX} disabled={exportingXLSX} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 shadow-sm shadow-emerald-200 disabled:opacity-60">
                        <span className="material-icons-round text-sm">table_view</span>
                        {exportingXLSX ? "Exporting..." : "Export Excel"}
                    </button>
                    <button onClick={handleExportPDF} disabled={exportingPDF} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-sm shadow-red-200 disabled:opacity-60">
                        <span className="material-icons-round text-sm">picture_as_pdf</span>
                        {exportingPDF ? "Exporting..." : "Export PDF"}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeTab === t.id ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                        <span className="material-icons-round text-sm">{t.icon}</span>{t.label}
                    </button>
                ))}
            </div>

            {/* ─── SUMMARY ─── */}
            {activeTab === "summary" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Sampel Valid" value={result.valid.length} sub={`dari ${result.total} baris`} icon="people" color="border-indigo-200 bg-indigo-50 text-indigo-700" />
                        <StatCard label="Prevalensi Stunting" value={`${result.stuntingPct}%`} sub="TBU Pendek+Sangat Pendek" icon="height" color="border-red-200 bg-red-50 text-red-700" />
                        <StatCard label="Prevalensi Wasting" value={`${result.wastingPct}%`} sub="BBTB Gizi Kurang+Buruk" icon="monitor_weight" color="border-orange-200 bg-orange-50 text-orange-700" />
                        <StatCard label="Probable Stunting" value={`${result.probableStuntingPct}%`} sub="Growth Age Equivalent" icon="child_care" color="border-amber-200 bg-amber-50 text-amber-700" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard label="Underweight" value={`${result.underweightPct}%`} sub="BBU Kurang+Sangat Kurang" icon="monitor_weight" color="border-yellow-200 bg-yellow-50 text-yellow-700" />
                        <StatCard label="Red Flag" value={result.redFlagCount} sub="Plausibilitas perlu dicek" icon="report" color="border-rose-200 bg-rose-50 text-rose-700" />
                        <StatCard label="Data Di-skip" value={result.skipped.length} sub="Error atau data tidak valid" icon="warning" color="border-slate-200 bg-slate-50 text-slate-700" />
                    </div>
                    {result.skipped.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                            <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                                <span className="material-icons-round text-base">warning</span>
                                {result.skipped.length} Baris Di-skip
                            </h4>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                                {result.skipped.map((s, i) => (
                                    <div key={i} className="text-xs font-mono bg-white rounded-lg px-3 py-1.5 border border-amber-100 text-amber-700">
                                        Baris {s.rowIndex} ({s.nama}): {s.errors.join(" · ")}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ─── PREVALENSI ─── */}
            {activeTab === "prevalensi" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <PrevalenceTable title="BBU — Berat Badan / Umur" icon="monitor_weight" items={result.prevalenceBBU} />
                    <PrevalenceTable title="TBU — Tinggi Badan / Umur (Stunting)" icon="height" items={result.prevalenceTBU} />
                    <PrevalenceTable title="BBTB — Berat / Tinggi (Wasting)" icon="straighten" items={result.prevalenceBBTB} />
                    <PrevalenceTable title="Analisis Probable Stunting" icon="child_care" items={result.prevalenceProbableStunting} />
                </div>
            )}

            {/* ─── WHO TEAM DISTRIBUTIONS ─── */}
            {activeTab === "team" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Age Group */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="material-icons-round text-base text-indigo-500">cake</span>
                                Distribusi Age Group
                            </h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={result.ageGroupDist} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="group" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        formatter={(v: any) => [v, "Jumlah"]}
                                    />
                                    <Bar dataKey="n" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Sex dist */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="material-icons-round text-base text-indigo-500">wc</span>
                                Distribusi Jenis Kelamin
                            </h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={result.sexDist} dataKey="n" nameKey="label" cx="50%" cy="50%" outerRadius={80}
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        label={({ label, pct }: any) => `${label}: ${pct}%`}>
                                        {result.sexDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                    </Pie>
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        {/* BB Dist */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="material-icons-round text-base text-emerald-500">monitor_weight</span>
                                Distribusi Berat Badan
                            </h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={result.bbDist} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="range" tick={{ fontSize: 9 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip />
                                    <Bar dataKey="n" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        {/* TB Dist */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="material-icons-round text-base text-blue-500">height</span>
                                Distribusi Tinggi Badan
                            </h4>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={result.tbDist} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="range" tick={{ fontSize: 9 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip />
                                    <Bar dataKey="n" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    {/* ZScore distributions */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="material-icons-round text-base text-purple-500">leaderboard</span>
                            Distribusi ZScore per Indeks
                        </h4>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={result.zscoreDist} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="range" tick={{ fontSize: 9 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Bar dataKey="bbu" name="BBU" fill="#6366f1" radius={[3, 3, 0, 0]} />
                                <Bar dataKey="tbu" name="TBU" fill="#10b981" radius={[3, 3, 0, 0]} />
                                <Bar dataKey="bbtb" name="BBTB" fill="#f97316" radius={[3, 3, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* ─── PER WILAYAH ─── */}
            {activeTab === "wilayah" && (
                <div className="space-y-4">
                    {result.wilayahPrevalence.length <= 1 && result.wilayahPrevalence[0]?.wilayah === "(Tidak Ada Wilayah)" ? (
                        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
                            <span className="material-icons-round text-3xl mb-2 block text-slate-300">location_off</span>
                            Data wilayah tidak tersedia. Tambahkan kolom <strong>Wilayah/Kecamatan</strong> di file Excel untuk analisis per wilayah.
                        </div>
                    ) : (
                        <>
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <span className="material-icons-round text-base text-indigo-500">bar_chart</span>
                                    Prevalensi Stunting per Wilayah
                                </h4>
                                <ResponsiveContainer width="100%" height={Math.max(200, result.wilayahPrevalence.length * 45)}>
                                    <BarChart data={result.wilayahPrevalence} layout="vertical" margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                                        <YAxis type="category" dataKey="wilayah" tick={{ fontSize: 10 }} width={100} />
                                        <Tooltip
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            formatter={(v: any) => [`${v}%`]}
                                        />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                        <Bar dataKey="stuntingPct" name="Stunting %" fill="#ef4444" radius={[0, 4, 4, 0]} />
                                        <Bar dataKey="wastingPct" name="Wasting %" fill="#f97316" radius={[0, 4, 4, 0]} />
                                        <Bar dataKey="underweightPct" name="Underweight %" fill="#eab308" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            {["Wilayah", "N", "Stunting %", "Sgt Pendek %", "Wasting %", "Underweight %", "Prob.Stunting %"].map((h) => (
                                                <th key={h} className="px-4 py-3 text-left text-slate-600 font-bold">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.wilayahPrevalence.map((w, i) => (
                                            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                                                <td className="px-4 py-3 font-bold text-slate-800">{w.wilayah}</td>
                                                <td className="px-4 py-3 font-mono">{w.total}</td>
                                                <td className="px-4 py-3 font-bold text-red-600">{w.stuntingPct}%</td>
                                                <td className="px-4 py-3 text-red-500">{w.severelyStuntedPct}%</td>
                                                <td className="px-4 py-3 font-bold text-orange-600">{w.wastingPct}%</td>
                                                <td className="px-4 py-3 text-amber-600">{w.underweightPct}%</td>
                                                <td className="px-4 py-3 text-amber-700">{w.probableStuntingPct}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ─── DATA INDIVIDU ─── */}
            {activeTab === "data" && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-slate-500 font-mono">
                            Menampilkan {dataPage * PAGE_SIZE + 1}–{Math.min((dataPage + 1) * PAGE_SIZE, result.valid.length)} dari {result.valid.length} data valid
                        </div>
                        <div className="flex gap-2">
                            <button disabled={dataPage === 0} onClick={() => setDataPage(p => p - 1)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-bold disabled:opacity-40 hover:bg-slate-50">← Prev</button>
                            <button disabled={(dataPage + 1) * PAGE_SIZE >= result.valid.length} onClick={() => setDataPage(p => p + 1)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-bold disabled:opacity-40 hover:bg-slate-50">Next →</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                        <table className="w-full text-xs min-w-[900px]">
                            <thead className="bg-slate-900 text-white">
                                <tr>
                                    {["No", "Nama", "Wilayah", "JK", "Usia", "BB (kg)", "TB (cm)", "ZScore BBU", "Klas. BBU", "ZScore TBU", "Klas. TBU", "ZScore BBTB", "Klas. BBTB", "Prob.Stunting", "Flag"].map((h) => (
                                        <th key={h} className="px-3 py-3 text-left font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {pagedData.map((r: MassRowResult, i: number) => (
                                    <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"} hover:bg-indigo-50/30 transition-colors`}>
                                        <td className="px-3 py-2 font-mono text-slate-400">{dataPage * PAGE_SIZE + i + 1}</td>
                                        <td className="px-3 py-2 font-medium text-slate-800 max-w-[120px] truncate">{r.nama}</td>
                                        <td className="px-3 py-2 text-slate-500 max-w-[100px] truncate">{r.wilayah}</td>
                                        <td className="px-3 py-2">{r.rawSex === 1 ? "♂" : "♀"}</td>
                                        <td className="px-3 py-2 font-mono">{r.ageMonths} bln</td>
                                        <td className="px-3 py-2 font-mono">{r.weightKg}</td>
                                        <td className="px-3 py-2 font-mono">{r.correctedHeight.toFixed(1)}</td>
                                        <td className={`px-3 py-2 font-mono font-bold ${r.assessment.bbu.zscore !== null && r.assessment.bbu.zscore < -2 ? "text-red-600" : r.assessment.bbu.zscore !== null && r.assessment.bbu.zscore > 1 ? "text-amber-600" : "text-emerald-700"}`}>
                                            {r.assessment.bbu.zscore !== null ? (r.assessment.bbu.zscore > 0 ? "+" : "") + r.assessment.bbu.zscore.toFixed(2) : "—"}
                                        </td>
                                        <td className="px-3 py-2"><SeverityBadge cls={r.assessment.bbu.classification} /></td>
                                        <td className={`px-3 py-2 font-mono font-bold ${r.assessment.tbu.zscore !== null && r.assessment.tbu.zscore < -2 ? "text-red-600" : "text-emerald-700"}`}>
                                            {r.assessment.tbu.zscore !== null ? (r.assessment.tbu.zscore > 0 ? "+" : "") + r.assessment.tbu.zscore.toFixed(2) : "—"}
                                        </td>
                                        <td className="px-3 py-2"><SeverityBadge cls={r.assessment.tbu.classification} /></td>
                                        <td className={`px-3 py-2 font-mono font-bold ${r.assessment.bbtb.zscore !== null && r.assessment.bbtb.zscore < -2 ? "text-red-600" : "text-emerald-700"}`}>
                                            {r.assessment.bbtb.zscore !== null ? (r.assessment.bbtb.zscore > 0 ? "+" : "") + r.assessment.bbtb.zscore.toFixed(2) : "—"}
                                        </td>
                                        <td className="px-3 py-2"><SeverityBadge cls={r.assessment.bbtb.classification} /></td>
                                        <td className="px-3 py-2">
                                            {r.assessment.probableStunting.isProbableStunting
                                                ? <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">🔴 PS</span>
                                                : <span className="text-[10px] text-slate-400">—</span>}
                                        </td>
                                        <td className="px-3 py-2">
                                            {r.assessment.hasAnyRedFlag
                                                ? <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">⚠ Flag</span>
                                                : <span className="text-[10px] text-slate-400">—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 text-xs text-slate-400 text-center">
                SIGMA Calculator · WHO Child Growth Standards 2006 · Permenkes No.2/2020 · Data tidak disimpan ke server ·{" "}
                Crafted with <span className="text-red-400">♥</span> by{" "}
                <a href="https://dedik2urniawan.github.io/" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-500 hover:text-indigo-600">DK</a>
            </div>
        </div>
    );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function MassalCalculatorPage() {
    const [step, setStep] = useState<Step>("landing");
    const [lms, setLms] = useState<LmsReference | null>(null);
    const [lmsLoading, setLmsLoading] = useState(false);
    const [rawRows, setRawRows] = useState<RawRow[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [colMap, setColMap] = useState<Partial<ColMap>>({});
    const [progress, setProgress] = useState(0);
    const [progressTotal, setProgressTotal] = useState(0);
    const [result, setResult] = useState<MassAnalysisResult | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);

    // Load LMS lazily (on demand)
    const ensureLMS = async (): Promise<LmsReference> => {
        if (lms) return lms;
        setLmsLoading(true);
        const data = await fetchLmsReference();
        setLms(data);
        setLmsLoading(false);
        return data;
    };

    // ---- FILE PARSING ----
    const parseFile = async (file: File) => {
        setFileError(null);
        try {
            const { read, utils } = await import("xlsx");
            const buffer = await file.arrayBuffer();
            const wb = read(buffer, { type: "array", cellDates: false });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data: RawRow[] = utils.sheet_to_json(ws, { raw: true, defval: "" });

            if (data.length === 0) { setFileError("File kosong atau format tidak dikenali."); return; }
            if (data.length > 1000) { setFileError(`File memiliki ${data.length} baris (maks 1000). Silakan bagi menjadi beberapa file.`); return; }

            const hdrs = Object.keys(data[0]);
            const autoMap = autoDetectColumns(hdrs);
            setRawRows(data);
            setHeaders(hdrs);
            setColMap(autoMap);
            setStep("mapping");
        } catch {
            setFileError("Gagal membaca file. Pastikan format .xlsx atau .xls.");
        }
    };

    const onFileDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) parseFile(file);
    }, []);

    const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) parseFile(file);
    }, []);

    // ---- PROCESSING ----
    const handleProcess = async () => {
        setStep("processing");
        setProgress(0);
        try {
            const lmsData = await ensureLMS();
            const fullMap: ColMap = {
                jenis_kelamin: colMap.jenis_kelamin ?? null,
                tanggal_lahir: colMap.tanggal_lahir ?? null,
                tanggal_ukur: colMap.tanggal_ukur ?? null,
                berat_badan: colMap.berat_badan ?? null,
                tinggi_badan: colMap.tinggi_badan ?? null,
                cara_ukur: colMap.cara_ukur ?? null,
                nama: colMap.nama ?? null,
                wilayah: colMap.wilayah ?? null,
                desa: colMap.desa ?? null,
                nomor: colMap.nomor ?? null,
            };
            const parsed = normalizeRows(rawRows, fullMap);
            const { valid, skipped } = await calculateMassAssessment(parsed, lmsData, (done, total) => {
                setProgress(done); setProgressTotal(total);
            });
            const analysis = computeAnalysis(valid, skipped, rawRows.length);
            setResult(analysis);
            setStep("results");
        } catch (e) {
            console.error(e);
            setStep("mapping");
        }
    };

    const handleReset = () => {
        setStep("landing"); setRawRows([]); setHeaders([]); setColMap({}); setResult(null); setFileError(null);
    };

    const mappingComplete = REQUIRED_KEYS.every(k => colMap[k]);

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/20 to-orange-50/20 font-display">
            {/* NAV */}
            <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-3">
                            <Link href="/" className="relative w-9 h-9 shadow-md rounded-xl overflow-hidden bg-white flex items-center justify-center border border-slate-100 p-1">
                                <Image src="/sigma_logo.png" alt="SIGMA Logo" fill className="object-contain" />
                            </Link>
                            <div>
                                <div className="font-extrabold text-sm text-slate-900 leading-none">SIGMA Calculator</div>
                                <div className="text-[9px] text-amber-600 font-bold tracking-[0.2em] uppercase font-mono">Mass Assessment</div>
                            </div>
                        </div>
                        <Link href="/calculator" className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-amber-600 transition-colors py-2 px-3 rounded-lg hover:bg-amber-50">
                            <span className="material-icons-round text-sm">arrow_back</span>Kembali
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="pt-16 pb-12 max-w-5xl mx-auto px-4 sm:px-6">

                {/* ─── STEP: LANDING ─── */}
                {step === "landing" && (
                    <div className="mt-10">
                        <div className="text-center mb-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold tracking-widest uppercase font-mono mb-4">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Population Assessment · WHO ZScore LMS
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Analisis Status Gizi Massal</h1>
                            <p className="text-slate-500 text-sm max-w-xl mx-auto">Upload data Excel → Kalkulasi ZScore otomatis → Analisis prevalensi populasi + distribusi WHO TEAM</p>
                        </div>

                        {/* Info cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                            {[
                                { icon: "upload_file", color: "indigo", title: "Upload Excel", desc: "Upload file .xlsx/.xls dengan data balita. Maks 1000 baris per file." },
                                { icon: "auto_fix_high", color: "amber", title: "Smart Column Mapping", desc: "Sistem otomatis mendeteksi kolom. Anda konfirmasi atau koreksi mapping sebelum kalkulasi." },
                                { icon: "analytics", color: "emerald", title: "Hasil Lengkap", desc: "Prevalensi BBU/TBU/BBTB, Probable Stunting, distribusi WHO TEAM, dan prevalensi per wilayah." },
                            ].map((item, i) => (
                                <div key={i} className={`bg-white rounded-2xl border border-${item.color}-100 shadow-sm p-6`}>
                                    <div className={`w-12 h-12 bg-${item.color}-50 rounded-xl flex items-center justify-center mb-4`}>
                                        <span className={`material-icons-round text-${item.color}-600 text-2xl`}>{item.icon}</span>
                                    </div>
                                    <h3 className="font-bold text-slate-800 mb-1 text-sm">{item.title}</h3>
                                    <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>

                        {/* Format spec */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="material-icons-round text-slate-500 text-base">info</span>
                                Format Data yang Diperlukan
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                {[
                                    { col: "Jenis Kelamin", fmt: "1 atau m/M (Laki-laki) · 2 atau f/F (Perempuan)", req: true },
                                    { col: "Tanggal Lahir", fmt: "DD/MM/YYYY — contoh: 15/03/2022", req: true },
                                    { col: "Tanggal Ukur", fmt: "DD/MM/YYYY — contoh: 01/03/2026", req: true },
                                    { col: "Berat Badan", fmt: "Angka (kg), titik sebagai desimal — contoh: 12.5", req: true },
                                    { col: "Tinggi/Panjang Badan", fmt: "Angka (cm), titik sebagai desimal — contoh: 98.0", req: true },
                                    { col: "Cara Ukur", fmt: "l atau L = Terlentang/Recumbent · h atau H = Berdiri/Standing", req: true },
                                    { col: "Wilayah/Kecamatan", fmt: "Teks bebas — untuk agregasi prevalensi per wilayah", req: false },
                                    { col: "Nama Anak", fmt: "Teks bebas — untuk identifikasi di laporan", req: false },
                                ].map((f, i) => (
                                    <div key={i} className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded self-start mt-0.5 ${f.req ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-500"}`}>
                                            {f.req ? "WAJIB" : "OPSIONAL"}
                                        </span>
                                        <div>
                                            <div className="font-bold text-slate-700">{f.col}</div>
                                            <div className="text-slate-500 mt-0.5">{f.fmt}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 justify-center">
                            <button
                                onClick={() => downloadTemplate()}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-emerald-500 text-emerald-700 font-bold text-sm hover:bg-emerald-50 transition-colors"
                            >
                                <span className="material-icons-round text-base">download</span>
                                Download Template Excel
                            </button>
                            <button
                                onClick={() => setStep("upload")}
                                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all"
                            >
                                <span className="material-icons-round text-base">upload_file</span>
                                Upload Data Sekarang
                            </button>
                        </div>
                    </div>
                )}

                {/* ─── STEP: UPLOAD ─── */}
                {step === "upload" && (
                    <div className="mt-10">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-black text-slate-900 mb-2">Upload File Excel</h2>
                            <p className="text-slate-500 text-sm">Format .xlsx atau .xls · Maksimal 1000 baris data</p>
                        </div>
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={onFileDrop}
                            className={`relative border-2 border-dashed rounded-3xl p-16 text-center transition-all cursor-pointer ${dragging ? "border-amber-400 bg-amber-50" : "border-slate-300 bg-white hover:border-amber-300 hover:bg-amber-50/30"}`}
                            onClick={() => document.getElementById("fileInput")?.click()}
                        >
                            <input id="fileInput" type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileInput} />
                            <span className={`material-icons-round text-6xl mb-4 block transition-colors ${dragging ? "text-amber-500" : "text-slate-300"}`}>upload_file</span>
                            <p className="text-lg font-bold text-slate-700 mb-1">{dragging ? "Lepaskan file di sini" : "Klik atau drag-drop file Excel"}</p>
                            <p className="text-sm text-slate-400">Mendukung .xlsx dan .xls</p>
                        </div>
                        {fileError && (
                            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-start gap-2">
                                <span className="material-icons-round text-base flex-shrink-0">error</span>{fileError}
                            </div>
                        )}
                        <div className="flex justify-between mt-6">
                            <button onClick={() => setStep("landing")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50">
                                <span className="material-icons-round text-sm">arrow_back</span>Kembali
                            </button>
                            <button onClick={() => downloadTemplate()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-300 text-emerald-700 text-sm font-bold hover:bg-emerald-50">
                                <span className="material-icons-round text-sm">download</span>Download Template
                            </button>
                        </div>
                    </div>
                )}

                {/* ─── STEP: MAPPING ─── */}
                {step === "mapping" && (
                    <div className="mt-10">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold mb-3">
                                <span className="material-icons-round text-sm">auto_fix_high</span>
                                Smart Column Mapper
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2">Konfirmasi Mapping Kolom</h2>
                            <p className="text-slate-500 text-sm">
                                File memiliki <strong>{rawRows.length} baris</strong> data dengan <strong>{headers.length} kolom</strong>.
                                Sistem mendeteksi mapping otomatis — periksa dan sesuaikan jika perlu.
                            </p>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/80 p-8 space-y-6">
                            {/* Required */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-red-600 mb-3 flex items-center gap-2">
                                    <span className="material-icons-round text-sm">error</span>Variabel Wajib
                                </h3>
                                <div className="space-y-3">
                                    {REQUIRED_KEYS.map((key) => (
                                        <div key={key} className="grid grid-cols-2 gap-4 items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                                            <div>
                                                <div className="text-sm font-bold text-slate-800">{KEY_LABELS[key].label}</div>
                                                <div className="text-xs text-slate-400 font-mono">{KEY_LABELS[key].desc}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={colMap[key] ?? ""}
                                                    onChange={(e) => setColMap(prev => ({ ...prev, [key]: e.target.value || null }))}
                                                    className={`flex-1 px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 ${colMap[key] ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-700"}`}
                                                >
                                                    <option value="">-- Pilih kolom --</option>
                                                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                                                </select>
                                                {colMap[key]
                                                    ? <span className="material-icons-round text-emerald-500 text-lg">check_circle</span>
                                                    : <span className="material-icons-round text-red-400 text-lg">cancel</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Optional */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                                    <span className="material-icons-round text-sm">check_box_outline_blank</span>Variabel Opsional
                                </h3>
                                <div className="space-y-3">
                                    {OPTIONAL_KEYS.map((key) => (
                                        <div key={key} className="grid grid-cols-2 gap-4 items-center p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                                            <div>
                                                <div className="text-sm font-medium text-slate-700">{KEY_LABELS[key].label}</div>
                                                <div className="text-xs text-slate-400 font-mono">{KEY_LABELS[key].desc}</div>
                                            </div>
                                            <select
                                                value={colMap[key] ?? ""}
                                                onChange={(e) => setColMap(prev => ({ ...prev, [key]: e.target.value || null }))}
                                                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 text-slate-700"
                                            >
                                                <option value="">-- Tidak ada / Skip --</option>
                                                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {!mappingComplete && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-center gap-2">
                                    <span className="material-icons-round text-base">warning</span>
                                    Semua variabel wajib harus dipetakan sebelum kalkulasi dimulai.
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between mt-6">
                            <button onClick={() => setStep("upload")} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50">
                                <span className="material-icons-round text-sm">arrow_back</span>Upload Ulang
                            </button>
                            <button
                                onClick={handleProcess}
                                disabled={!mappingComplete || lmsLoading}
                                className="px-8 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 shadow-lg shadow-amber-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {lmsLoading ? <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />Memuat LMS...</> : <><span className="material-icons-round text-base">calculate</span>Mulai Kalkulasi ({rawRows.length} baris)</>}
                            </button>
                        </div>
                    </div>
                )}

                {/* ─── STEP: PROCESSING ─── */}
                {step === "processing" && (
                    <div className="mt-20 text-center">
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-12 max-w-md mx-auto">
                            <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-6" />
                            <h3 className="font-bold text-slate-800 text-lg mb-2">Menghitung ZScore...</h3>
                            <p className="text-slate-400 text-sm mb-6 font-mono">
                                {progress} / {progressTotal || rawRows.length} baris diproses
                            </p>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-300"
                                    style={{ width: `${progressTotal ? (progress / progressTotal) * 100 : 0}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-4">Memuat referensi LMS WHO + kalkulasi massal...</p>
                        </div>
                    </div>
                )}

                {/* ─── STEP: RESULTS ─── */}
                {step === "results" && result && (
                    <div className="mt-8">
                        <div className="text-center mb-6">
                            <h1 className="text-2xl font-extrabold text-slate-900">Hasil Analisis Status Gizi Massal</h1>
                            <p className="text-slate-500 text-sm mt-1">
                                {result.valid.length} data valid dari {result.total} baris · {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                            </p>
                        </div>
                        <ResultsDashboard result={result} onReset={handleReset} />
                    </div>
                )}
            </main>
        </div>
    );
}
