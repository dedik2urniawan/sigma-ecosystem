"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
    Cell,
    ReferenceLine,
    PieChart,
    Pie,
    LabelList,
} from "recharts";

interface Filters {
    periode: string;
    kecamatan: string;
    puskesmas: string;
    kelurahan: string;
    userRole: string;
    userPuskesmasId: string | null;
}

// ── Constants ────────────────────────────────────────────────────────────────
const BBU_COLORS: Record<string, string> = {
    "GIZI BURUK": "#dc2626",
    "GIZI KURANG": "#f97316",
    "GIZI BAIK": "#22c55e",
    "RISIKO LEBIH": "#facc15",
    "GIZI LEBIH": "#f59e0b",
    "OBESITAS": "#b45309",
};

const TBU_COLORS: Record<string, string> = {
    "SANGAT PENDEK": "#dc2626",
    "PENDEK": "#f97316",
    "NORMAL": "#22c55e",
    "TINGGI": "#3b82f6",
};

const BBTB_COLORS: Record<string, string> = {
    "GIZI BURUK": "#dc2626",
    "GIZI KURANG": "#f97316",
    "GIZI BAIK": "#22c55e",
    "RISIKO GIZI LEBIH": "#facc15",
    "GIZI LEBIH": "#f59e0b",
    "OBESITAS": "#b45309",
};

const AGE_ORDER = ["0-5 bulan", "6-11 bulan", "12-23 bulan", "24-35 bulan", "36-47 bulan", "48-59 bulan", ">59 bulan"];
const GENDER_COLORS = ["#3b82f6", "#ec4899"];

// Ideal digit preference is 10% per digit (uniform)
const IDEAL_PCT = 10;

function getStatusColor(cat: string, indicatorColors: Record<string, string>) {
    const upper = (cat || "").toUpperCase().trim();
    for (const [key, color] of Object.entries(indicatorColors)) {
        if (upper.includes(key)) return color;
    }
    return "#94a3b8";
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
    return (
        <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-icons-round text-cyan-600 text-[18px]">{icon}</span>
            </div>
            <div>
                <h3 className="text-base font-extrabold text-slate-800">{title}</h3>
                {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
        </div>
    );
}

function LoadingBox({ height = "300px" }: { height?: string }) {
    return (
        <div className={`flex items-center justify-center`} style={{ height }}>
            <div className="flex flex-col items-center gap-3">
                <span className="material-icons-round text-5xl text-cyan-200 animate-spin">refresh</span>
                <p className="text-xs text-slate-400 font-medium">Memuat data...</p>
            </div>
        </div>
    );
}

function EmptyBox({ height = "300px" }: { height?: string }) {
    return (
        <div className={`flex flex-col items-center justify-center text-slate-300`} style={{ height }}>
            <span className="material-icons-round text-5xl mb-2">bar_chart</span>
            <p className="text-sm font-medium">Tidak ada data untuk filter ini</p>
        </div>
    );
}

// ── Distribusi Demografi ─────────────────────────────────────────────────────

function DistribusiDemografi({ filters }: { filters: Filters }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);
    const [summary, setSummary] = useState({ total: 0, laki: 0, perempuan: 0 });

    useEffect(() => {
        async function fetch() {
            setLoading(true);
            const { data: raw } = await supabase.rpc("get_eppgbm_distribusi_demografi", {
                p_periode: filters.periode,
                p_puskesmas: filters.puskesmas,
                p_kelurahan: filters.kelurahan,
            });
            if (raw) {
                const sorted = [...raw].sort(
                    (a, b) => AGE_ORDER.indexOf(a.kelompok_usia) - AGE_ORDER.indexOf(b.kelompok_usia)
                );
                setData(sorted);
                const totalL = raw.reduce((s: number, r: any) => s + Number(r.laki_laki), 0);
                const totalP = raw.reduce((s: number, r: any) => s + Number(r.perempuan), 0);
                setSummary({ total: totalL + totalP, laki: totalL, perempuan: totalP });
            }
            setLoading(false);
        }
        fetch();
    }, [filters]);

    const pieData = [
        { name: "Laki-laki", value: summary.laki },
        { name: "Perempuan", value: summary.perempuan },
    ];

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <SectionHeader
                icon="people"
                title="Distribusi Demografi Balita"
                subtitle="Komposisi usia dan jenis kelamin dari seluruh balita dalam dataset"
            />

            {loading ? (
                <LoadingBox />
            ) : data.length === 0 ? (
                <EmptyBox />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Summary Stat Cards */}
                    <div className="lg:col-span-3 grid grid-cols-3 gap-4">
                        {[
                            { label: "Total Balita", value: summary.total.toLocaleString("id-ID"), icon: "child_care", color: "bg-cyan-500" },
                            { label: "Laki-Laki", value: summary.laki.toLocaleString("id-ID"), icon: "male", color: "bg-blue-500" },
                            { label: "Perempuan", value: summary.perempuan.toLocaleString("id-ID"), icon: "female", color: "bg-pink-500" },
                        ].map((s, i) => (
                            <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center shrink-0`}>
                                    <span className="material-icons-round text-white text-lg">{s.icon}</span>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                                    <p className="text-xl font-extrabold text-slate-800">{s.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Age Bar Chart */}
                    <div className="lg:col-span-2">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Distribusi Kelompok Usia</p>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="kelompok_usia" tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }} />
                                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: "16px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                                    formatter={(val: any) => [Number(val).toLocaleString("id-ID"), ""]}
                                />
                                <Legend wrapperStyle={{ fontSize: "12px", fontWeight: 600 }} />
                                <Bar dataKey="laki_laki" name="Laki-Laki" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="perempuan" name="Perempuan" fill="#ec4899" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Gender Pie Chart */}
                    <div className="flex flex-col items-center justify-center">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Proporsi Gender</p>
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={4}
                                    dataKey="value"
                                >
                                    {pieData.map((_, idx) => (
                                        <Cell key={idx} fill={GENDER_COLORS[idx]} />
                                    ))}
                                    <LabelList
                                        dataKey="value"
                                        position="outside"
                                        formatter={(v: any) =>
                                            summary.total > 0 ? `${((Number(v) / summary.total) * 100).toFixed(1)}%` : ''
                                        }
                                        style={{ fontSize: "11px", fontWeight: 700, fill: "#475569" }}
                                    />
                                </Pie>
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: "16px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                                    formatter={(val: any) => [val.toLocaleString("id-ID"), ""]}
                                />
                                <Legend wrapperStyle={{ fontSize: "12px", fontWeight: 600 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Prevalensi Status Gizi ───────────────────────────────────────────────────

function PrevalensiStatusGizi({ filters }: { filters: Filters }) {
    const isSuperadmin = filters.userRole === "superadmin";
    const level = (filters.puskesmas !== "Semua" || !isSuperadmin) ? "kelurahan" : "puskesmas";

    const [loading, setLoading] = useState(true);
    const [rawData, setRawData] = useState<any[]>([]);
    const [activeIndicator, setActiveIndicator] = useState<"BBU" | "TBU" | "BBTB">("TBU");

    useEffect(() => {
        async function fetch() {
            setLoading(true);
            const { data } = await supabase.rpc("get_eppgbm_distribusi_statusgizi", {
                p_periode: filters.periode,
                p_puskesmas: filters.puskesmas,
                p_kelurahan: filters.kelurahan,
                p_level: level,
            });
            if (data) setRawData(data);
            setLoading(false);
        }
        fetch();
    }, [filters, level]);

    // Pivot data: { wilayah, STATUS1: pct, STATUS2: pct, ... }
    const pivoted = useMemo(() => {
        const filtered = rawData.filter((d) => d.indikator === activeIndicator);
        const grouped: Record<string, Record<string, number>> = {};
        const statuses = new Set<string>();

        filtered.forEach((row) => {
            if (!grouped[row.wilayah]) grouped[row.wilayah] = {};
            const sg = (row.status_gizi || "").trim();
            grouped[row.wilayah][sg] = Number(row.persentase);
            statuses.add(sg);
        });

        return {
            chartData: Object.entries(grouped).map(([wilayah, vals]) => ({
                wilayah: wilayah.length > 18 ? wilayah.substring(0, 16) + "…" : wilayah,
                wilayahFull: wilayah,
                ...vals,
            })),
            statuses: Array.from(statuses).sort(),
        };
    }, [rawData, activeIndicator]);

    const indicatorColors =
        activeIndicator === "BBU" ? BBU_COLORS : activeIndicator === "TBU" ? TBU_COLORS : BBTB_COLORS;

    const indicatorLabels: Record<string, string> = {
        BBU: "Berat Badan / Umur (BB/U)",
        TBU: "Tinggi Badan / Umur (TB/U) — Stunting",
        BBTB: "Berat Badan / Tinggi Badan (BB/TB) — Wasting",
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-slate-100 min-w-[180px]">
                <p className="font-bold text-slate-700 text-xs mb-2 border-b border-slate-100 pb-2">{label}</p>
                {payload.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-3 text-xs">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
                            {p.name}
                        </span>
                        <span className="font-bold">{Number(p.value).toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        );
    };

    // Table summary (top 10 priority by stunting/kurang)
    const summaryTableData = useMemo(() => {
        const filtered = rawData.filter(
            (d) => d.indikator === activeIndicator
        );
        const grouped: Record<string, { total: number; priority: number; wilayah: string }> = {};
        const priorityKeywords = activeIndicator === "TBU"
            ? ["PENDEK", "SANGAT PENDEK"]
            : ["GIZI KURANG", "GIZI BURUK"];

        filtered.forEach((row) => {
            if (!grouped[row.wilayah]) grouped[row.wilayah] = { total: Number(row.total_wilayah), priority: 0, wilayah: row.wilayah };
            const sg = (row.status_gizi || "").toUpperCase().trim();
            if (priorityKeywords.some((k) => sg.includes(k))) {
                grouped[row.wilayah].priority += Number(row.persentase);
            }
        });

        return Object.values(grouped)
            .sort((a, b) => b.priority - a.priority)
            .slice(0, 15);
    }, [rawData, activeIndicator]);

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <SectionHeader
                    icon="donut_large"
                    title="Prevalensi Status Gizi per Wilayah"
                    subtitle={`Distribusi kategori status gizi per ${level} berdasarkan indikator antropometri WHO`}
                />
                {/* Indicator toggle */}
                <div className="flex rounded-xl overflow-hidden border border-slate-200 shrink-0">
                    {(["BBU", "TBU", "BBTB"] as const).map((ind) => (
                        <button
                            key={ind}
                            onClick={() => setActiveIndicator(ind)}
                            className={`px-4 py-2 text-xs font-bold transition-all ${activeIndicator === ind
                                    ? "bg-cyan-600 text-white"
                                    : "bg-white text-slate-500 hover:bg-slate-50"
                                }`}
                        >
                            {ind}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-cyan-50/50 border border-cyan-100 rounded-2xl px-4 py-2.5 text-xs font-semibold text-cyan-700">
                📊 Menampilkan: <span className="font-bold">{indicatorLabels[activeIndicator]}</span> — Level: <span className="font-bold capitalize">{level}</span>
            </div>

            {loading ? (
                <LoadingBox height="350px" />
            ) : pivoted.chartData.length === 0 ? (
                <EmptyBox height="350px" />
            ) : (
                <>
                    {/* Stacked Bar Chart */}
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                            Distribusi % Status Gizi per {level === "puskesmas" ? "Puskesmas" : "Kelurahan/Desa"}
                        </p>
                        <ResponsiveContainer width="100%" height={Math.max(300, pivoted.chartData.length * 40)}>
                            <BarChart
                                layout="vertical"
                                data={pivoted.chartData}
                                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis
                                    type="number"
                                    domain={[0, 100]}
                                    unit="%"
                                    tick={{ fill: "#64748b", fontSize: 11 }}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="wilayah"
                                    width={130}
                                    tick={{ fill: "#334155", fontSize: 11, fontWeight: 600 }}
                                />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ fontSize: "11px", fontWeight: 600 }} />
                                {pivoted.statuses.map((sg) => (
                                    <Bar
                                        key={sg}
                                        dataKey={sg}
                                        stackId="a"
                                        fill={getStatusColor(sg, indicatorColors)}
                                        name={sg.charAt(0) + sg.slice(1).toLowerCase()}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Priority Table */}
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                            🚨 Top Wilayah Prioritas — % {activeIndicator === "TBU" ? "Stunting (Pendek + Sangat Pendek)" : "Gizi Kurang/Buruk"} Tertinggi
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead>
                                    <tr className="border-b-2 border-slate-100">
                                        <th className="py-2 px-3 font-bold text-slate-400 uppercase">#</th>
                                        <th className="py-2 px-3 font-bold text-slate-400 uppercase">Wilayah</th>
                                        <th className="py-2 px-3 font-bold text-slate-400 uppercase text-right">Total Balita (N)</th>
                                        <th className="py-2 px-3 font-bold text-slate-400 uppercase text-right">
                                            % {activeIndicator === "TBU" ? "Stunting" : "Gizi Bermasalah"}
                                        </th>
                                        <th className="py-2 px-3 font-bold text-slate-400 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {summaryTableData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                                            <td className="py-2.5 px-3 font-bold text-slate-800">{row.wilayah}</td>
                                            <td className="py-2.5 px-3 text-slate-600 text-right font-mono">
                                                {Number(row.total).toLocaleString("id-ID")}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono">
                                                <span className={`font-bold ${row.priority >= 30
                                                        ? "text-red-600"
                                                        : row.priority >= 20
                                                            ? "text-orange-600"
                                                            : "text-amber-600"
                                                    }`}>
                                                    {Number(row.priority).toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${row.priority >= 30
                                                        ? "bg-red-100 text-red-700"
                                                        : row.priority >= 20
                                                            ? "bg-orange-100 text-orange-700"
                                                            : "bg-amber-50 text-amber-700"
                                                    }`}>
                                                    {row.priority >= 30 ? "Kritis" : row.priority >= 20 ? "Tinggi" : "Sedang"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ── Digit Preference ─────────────────────────────────────────────────────────

function DigitPreference({ filters }: { filters: Filters }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        async function fetch() {
            setLoading(true);
            const { data: raw } = await supabase.rpc("get_eppgbm_digit_preference", {
                p_periode: filters.periode,
                p_puskesmas: filters.puskesmas,
                p_kelurahan: filters.kelurahan,
            });
            if (raw) setData(raw);
            setLoading(false);
        }
        fetch();
    }, [filters]);

    // DPS (Digit Preference Score) — std dev of observed proportions vs expected 10%
    const dpsBB = useMemo(() => {
        if (!data.length) return 0;
        const variance = data.reduce((sum, d) => sum + Math.pow(Number(d.pct_bb) - IDEAL_PCT, 2), 0) / data.length;
        return Math.sqrt(variance).toFixed(1);
    }, [data]);

    const dpsTB = useMemo(() => {
        if (!data.length) return 0;
        const variance = data.reduce((sum, d) => sum + Math.pow(Number(d.pct_tb) - IDEAL_PCT, 2), 0) / data.length;
        return Math.sqrt(variance).toFixed(1);
    }, [data]);

    const getDpsLabel = (dps: string | number) => {
        const v = Number(dps);
        if (v < 5) return { label: "Sangat Baik", color: "text-emerald-600 bg-emerald-50" };
        if (v < 10) return { label: "Baik", color: "text-green-600 bg-green-50" };
        if (v < 15) return { label: "Cukup", color: "text-amber-600 bg-amber-50" };
        return { label: "Perlu Perhatian", color: "text-red-600 bg-red-50" };
    };

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <SectionHeader
                icon="analytics"
                title="Digit Preference Analysis"
                subtitle="Distribusi digit terakhir BB dan TB — kualitas pencatatan data. Ideal: setiap digit 0-9 muncul ~10% (distribusi merata)"
            />

            {loading ? (
                <LoadingBox />
            ) : data.length === 0 ? (
                <EmptyBox />
            ) : (
                <>
                    {/* DPS Indicator */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {[
                            { label: "Digit Preference Score BB", dps: dpsBB, desc: "Berat Badan" },
                            { label: "Digit Preference Score TB", dps: dpsTB, desc: "Tinggi Badan" },
                        ].map((item, i) => {
                            const badge = getDpsLabel(item.dps);
                            return (
                                <div key={i} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                    <p className="text-xs text-slate-500 font-medium">{item.label}</p>
                                    <div className="flex items-end gap-2 mt-1">
                                        <p className="text-3xl font-extrabold text-slate-800">{item.dps}</p>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 ${badge.color}`}>
                                            {badge.label}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">Standar deviasi dari distribusi ideal (0 = sempurna)</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {[
                            { key: "pct_bb", label: "Digit Preference – Berat Badan (BB)", color: "#06b6d4" },
                            { key: "pct_tb", label: "Digit Preference – Tinggi Badan (TB)", color: "#8b5cf6" },
                        ].map((chart) => (
                            <div key={chart.key}>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                    {chart.label}
                                </p>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="digit" tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }} />
                                        <YAxis unit="%" tick={{ fill: "#64748b", fontSize: 11 }} domain={[0, 25]} />
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                                            formatter={(v: any) => [`${v}%`, "Proporsi"]}
                                        />
                                        <ReferenceLine y={IDEAL_PCT} stroke="#94a3b8" strokeDasharray="5 5"
                                            label={{ value: "Ideal (10%)", position: "insideTopRight", fill: "#94a3b8", fontSize: 10 }} />
                                        <Bar dataKey={chart.key} name="%" radius={[4, 4, 0, 0]}>
                                            {data.map((entry, idx) => (
                                                <Cell
                                                    key={idx}
                                                    fill={Math.abs(Number(entry[chart.key]) - IDEAL_PCT) > 5 ? "#ef4444" : chart.color}
                                                    opacity={0.85}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                                <p className="text-[10px] text-slate-400 mt-2 text-center">
                                    Bar merah = penyimpangan {'>'} 5% dari ideal. Digit 0 & 5 biasanya overrepresented jika ada digit preference.
                                </p>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ── Main Tab ─────────────────────────────────────────────────────────────────

export default function DistribusiDataTab({ filters }: { filters: Filters }) {
    const [subTab, setSubTab] = useState<"demografi" | "prevalensi" | "digit">("demografi");

    const subTabs = [
        { id: "demografi", label: "Demografi Balita", icon: "group" },
        { id: "prevalensi", label: "Prevalensi Status Gizi", icon: "donut_large" },
        { id: "digit", label: "Kualitas Data (Digit Preference)", icon: "analytics" },
    ];

    return (
        <div className="space-y-4">
            {/* Sub-navigation */}
            <div className="flex flex-wrap gap-2 bg-slate-50 rounded-2xl p-1.5 border border-slate-200 w-fit">
                {subTabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setSubTab(t.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${subTab === t.id
                                ? "bg-white text-cyan-700 shadow-sm border border-slate-200"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        <span className="material-icons-round text-[15px]">{t.icon}</span>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {subTab === "demografi" && <DistribusiDemografi filters={filters} />}
            {subTab === "prevalensi" && <PrevalensiStatusGizi filters={filters} />}
            {subTab === "digit" && <DigitPreference filters={filters} />}
        </div>
    );
}
