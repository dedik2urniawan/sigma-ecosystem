"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
    Legend,
    LineChart,
    Line,
    ComposedChart,
    Area,
    LabelList,
} from "recharts";
import * as XLSX from "xlsx";

// Dynamic import for Map
const MapComponent = dynamic(() => import("@/components/dashboard/MapInsiden"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[500px] bg-slate-100 rounded-2xl animate-pulse flex items-center justify-center">
            <span className="text-slate-400 text-sm">Memuat peta...</span>
        </div>
    ),
});

// ─── Types ──────────────────────────────────────────────────────────────────
interface InsidenRow {
    id: string;
    tahun: number;
    bulan: number;
    puskesmas: string;
    data_sasaran: number;
    jumlah_timbang_ukur: number;
    stunting: number;
    insiden_l: number;
    insiden_p: number;
    insiden_l_baduta: number;
    insiden_p_baduta: number;
    uploaded_at: string;
}

const BULAN_LABELS: Record<number, string> = {
    1: "Januari", 2: "Februari", 3: "Maret", 4: "April", 5: "Mei", 6: "Juni",
    7: "Juli", 8: "Agustus", 9: "September", 10: "Oktober", 11: "November", 12: "Desember",
};

// ─── Score Card Component (Reused Inline for now) ───────────────────────────
function ScoreCard({
    label,
    value,
    suffix,
    icon,
    color = "emerald",
    highlight = false,
    subValue,
}: {
    label: string;
    value: string;
    suffix?: string;
    icon: string;
    color?: string;
    highlight?: boolean;
    subValue?: string;
}) {
    const colorMap: Record<string, { bg: string; text: string; icon: string; border: string }> = {
        emerald: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "text-emerald-500", border: "border-emerald-100" },
        blue: { bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-500", border: "border-blue-100" },
        amber: { bg: "bg-amber-50", text: "text-amber-700", icon: "text-amber-500", border: "border-amber-100" },
        red: { bg: "bg-red-50", text: "text-red-700", icon: "text-red-500", border: "border-red-100" },
        purple: { bg: "bg-purple-50", text: "text-purple-700", icon: "text-purple-500", border: "border-purple-100" },
        slate: { bg: "bg-slate-50", text: "text-slate-700", icon: "text-slate-500", border: "border-slate-100" },
    };
    const c = colorMap[color] || colorMap.emerald;

    return (
        <div className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${highlight ? `${c.bg} ${c.border} shadow-md` : "bg-white border-slate-200 hover:border-slate-300"}`}>
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center`}>
                    <span className={`material-icons-round text-lg ${c.icon}`}>{icon}</span>
                </div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono leading-tight">
                    {label}
                </p>
            </div>
            <p className={`text-2xl font-extrabold ${highlight ? c.text : "text-slate-900"} tracking-tight`}>
                {value}
                {suffix && <span className="text-sm font-bold text-slate-400 ml-1">{suffix}</span>}
            </p>
            {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function InsidenStuntingContent() {
    const [data, setData] = useState<InsidenRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterTahun, setFilterTahun] = useState<number | null>(null);
    const [filterBulan, setFilterBulan] = useState<number | null>(null);
    const [trendFilterTahun, setTrendFilterTahun] = useState<number | null>(null); // New filter for Trend Chart
    const [filterPuskesmas, setFilterPuskesmas] = useState<string>("all");
    const [mapMetric, setMapMetric] = useState<"total" | "baduta">("total");
    const [barVisible, setBarVisible] = useState({ baduta: true, tua: true });

    // New: Gender Filter State
    const [genderMetric, setGenderMetric] = useState<"total" | "baduta">("total");

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: rows, error } = await supabase
                .from("data_insiden_stunting")
                .select("*")
                .order("tahun", { ascending: false })
                .order("bulan", { ascending: false });

            if (error) console.error("Error fetching insiden data:", error);
            else {
                setData(rows || []);
                // Default filters
                if (rows && rows.length > 0) {
                    const years = [...new Set(rows.map((r) => r.tahun))].sort((a, b) => b - a);
                    const latestYear = years[0];
                    setFilterTahun(latestYear);
                    setTrendFilterTahun(null); // Default to All Years for trend, or could be latestYear
                    const monthsInYear = [...new Set(rows.filter((r) => r.tahun === latestYear).map((r) => r.bulan))].sort((a, b) => b - a);
                    if (monthsInYear.length > 0) setFilterBulan(monthsInYear[0]);
                }
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    // Filters
    const filteredData = useMemo(() => {
        let result = data;
        if (filterTahun) result = result.filter((r) => r.tahun === filterTahun);
        if (filterBulan) result = result.filter((r) => r.bulan === filterBulan);
        if (filterPuskesmas !== "all") result = result.filter((r) => r.puskesmas === filterPuskesmas);
        return result;
    }, [data, filterTahun, filterBulan, filterPuskesmas]);

    const availableYears = useMemo(() => [...new Set(data.map((r) => r.tahun))].sort((a, b) => b - a), [data]);
    const availableMonths = useMemo(() => {
        const fd = filterTahun ? data.filter((r) => r.tahun === filterTahun) : data;
        return [...new Set(fd.map((r) => r.bulan))].sort((a, b) => a - b);
    }, [data, filterTahun]);
    const availablePuskesmas = useMemo(() => [...new Set(data.map((r) => r.puskesmas))].sort(), [data]);

    // ─── Calculations ───────────────────────────────────────────────────────
    const totals = useMemo(() => {
        let insidenTotal = 0;
        let insidenBaduta = 0;
        let insidenTua = 0;
        let timbangUkur = 0;
        let sasaran = 0;
        let male = 0;
        let female = 0;

        filteredData.forEach(r => {
            const total = r.insiden_l + r.insiden_p;
            const baduta = r.insiden_l_baduta + r.insiden_p_baduta;
            const tua = total - baduta;

            insidenTotal += total;
            insidenBaduta += baduta;
            insidenTua += tua;
            timbangUkur += r.jumlah_timbang_ukur;
            sasaran += r.data_sasaran;
            male += r.insiden_l;
            female += r.insiden_p;
        });

        const incidenceRate = timbangUkur > 0 ? (insidenTotal / timbangUkur) * 100 : 0;
        const badutaImpact = insidenTotal > 0 ? (insidenBaduta / insidenTotal) * 100 : 0;

        return { insidenTotal, insidenBaduta, insidenTua, timbangUkur, sasaran, incidenceRate, badutaImpact, male, female };
    }, [filteredData]);

    // New: Gender Stats Calculation based on genderMetric
    const genderStats = useMemo(() => {
        let male = 0;
        let female = 0;
        let totalGender = 0;

        filteredData.forEach(r => {
            if (genderMetric === "total") {
                male += r.insiden_l;
                female += r.insiden_p;
                totalGender += (r.insiden_l + r.insiden_p);
            } else {
                male += r.insiden_l_baduta;
                female += r.insiden_p_baduta;
                totalGender += (r.insiden_l_baduta + r.insiden_p_baduta);
            }
        });

        return { male, female, total: totalGender };
    }, [filteredData, genderMetric]);

    // Trend Data (Aggregated by Period)
    const trendData = useMemo(() => {
        const periodMap = new Map<string, {
            tahun: number;
            bulan: number;
            cases: number;
            measured: number;
            baduta: number;
            tua: number
        }>();

        // Usually trend respects geographical filter but ignores global time filter (to show time evolution).
        // However, we now add a specific Trend Year Filter.
        let source = data;
        if (filterPuskesmas !== "all") source = source.filter(r => r.puskesmas === filterPuskesmas);
        if (trendFilterTahun) source = source.filter(r => r.tahun === trendFilterTahun);

        source.forEach(r => {
            const key = `${r.tahun}-${r.bulan}`;
            const existing = periodMap.get(key) || {
                tahun: r.tahun,
                bulan: r.bulan,
                cases: 0,
                measured: 0,
                baduta: 0,
                tua: 0
            };

            const total = r.insiden_l + r.insiden_p;
            const baduta = r.insiden_l_baduta + r.insiden_p_baduta;

            existing.cases += total;
            existing.measured += r.jumlah_timbang_ukur;
            existing.baduta += baduta;
            existing.tua += (total - baduta);
            periodMap.set(key, existing);
        });

        return Array.from(periodMap.values())
            .sort((a, b) => (a.tahun - b.tahun) || (a.bulan - b.bulan))
            .map(v => {
                const ir = v.measured > 0 ? (v.cases / v.measured) * 100 : 0;
                const pctBaduta = v.cases > 0 ? (v.baduta / v.cases) * 100 : 0;
                const pctTua = v.cases > 0 ? (v.tua / v.cases) * 100 : 0;

                return {
                    name: `${BULAN_LABELS[v.bulan]} ${v.tahun}`,
                    ir,
                    pctBaduta,
                    pctTua
                };
            });
    }, [data, filterPuskesmas, trendFilterTahun]);

    // Chart Data (Stack Bar: Baduta vs Tua per Puskesmas)
    const barChartData = useMemo(() => {
        const pkmMap = new Map<string, { baduta: number; tua: number }>();
        filteredData.forEach(r => {
            const existing = pkmMap.get(r.puskesmas) || { baduta: 0, tua: 0 };
            const baduta = r.insiden_l_baduta + r.insiden_p_baduta;
            const total = r.insiden_l + r.insiden_p;
            existing.baduta += baduta;
            existing.tua += (total - baduta);
            pkmMap.set(r.puskesmas, existing);
        });

        return Array.from(pkmMap.entries())
            .map(([name, v]) => ({ name, baduta: v.baduta, tua: v.tua, total: v.baduta + v.tua }))
            .sort((a, b) => {
                // Dynamic Sorting based on Legend Visibility
                if (barVisible.baduta && !barVisible.tua) {
                    return b.baduta - a.baduta; // Sort by Baduta
                } else if (!barVisible.baduta && barVisible.tua) {
                    return b.tua - a.tua; // Sort by Tua
                } else {
                    return b.total - a.total; // Default: Sort by Total
                }
            });
    }, [filteredData, barVisible]);

    // Map Data (Incidence Rate)
    const mapData = useMemo(() => {
        const pkmMap = new Map<string, { cases: number; measured: number }>();
        // Use 'data' instead of 'filteredData' to show all puskesmas in map even if filtered? 
        // Logic in PelayananKesehatanPage shows map filter adhering to Month/Year but ignoring Puskesmas filter
        let mapSource = data;
        if (filterTahun) mapSource = mapSource.filter(r => r.tahun === filterTahun);
        if (filterBulan) mapSource = mapSource.filter(r => r.bulan === filterBulan);

        mapSource.forEach(r => {
            const existing = pkmMap.get(r.puskesmas) || { cases: 0, measured: 0 };
            const total = r.insiden_l + r.insiden_p;
            const baduta = r.insiden_l_baduta + r.insiden_p_baduta;

            existing.cases += (mapMetric === "total" ? total : baduta);
            existing.measured += r.jumlah_timbang_ukur;
            pkmMap.set(r.puskesmas, existing);
        });

        const result: Record<string, number> = {};
        pkmMap.forEach((v, name) => {
            result[name] = v.measured > 0 ? (v.cases / v.measured) * 100 : 0;
        });
        return result;
    }, [data, filterTahun, filterBulan, mapMetric]);

    // Table Data
    const tableData = useMemo(() => {
        const pkmMap = new Map<string, { total: number; baduta: number; measured: number }>();
        filteredData.forEach(r => {
            const existing = pkmMap.get(r.puskesmas) || { total: 0, baduta: 0, measured: 0 };
            const total = r.insiden_l + r.insiden_p;
            const baduta = r.insiden_l_baduta + r.insiden_p_baduta;
            existing.total += total;
            existing.baduta += baduta;
            existing.measured += r.jumlah_timbang_ukur;
            pkmMap.set(r.puskesmas, existing);
        });

        return Array.from(pkmMap.entries()).map(([name, v]) => {
            const ir = v.measured > 0 ? (v.total / v.measured) * 100 : 0;
            const badutaPct = v.total > 0 ? (v.baduta / v.total) * 100 : 0;

            let status = "Pemantauan Rutin";
            let action = "Pertahankan kualitas layanan";
            let color = "emerald";

            if (ir >= 2) {
                status = "Intervensi Spesifik Masif";
                action = "Perbaiki PMT & Edukasi";
                color = "red";
            } else if (badutaPct >= 50) {
                status = "Prioritas 1000 HPK";
                action = "Fokus pada Baduta & Ibu Hamil";
                color = "amber";
            }

            return {
                puskesmas: name,
                measured: v.measured,
                cases: v.total,
                badutaCases: v.baduta,
                tuaCases: v.total - v.baduta,
                ir,
                badutaImpact: badutaPct,
                status,
                action,
                color
            };
        }).sort((a, b) => b.ir - a.ir);
    }, [filteredData]);

    // Export Excel
    const handleExportExcel = useCallback(() => {
        const periodLabel = filterBulan && filterTahun
            ? `${BULAN_LABELS[filterBulan]}_${filterTahun}`
            : filterTahun ? `${filterTahun}` : "all";
        const fileName = `Analisis_Insidens_Stunting_${periodLabel}.xlsx`;

        const exportRows = tableData.map((r, i) => ({
            No: i + 1,
            Puskesmas: r.puskesmas,
            "Total Diukur": r.measured,
            "Insiden Total": r.cases,
            "Incidence Rate (%)": Number(r.ir.toFixed(2)),
            "Insiden Baduta": r.badutaCases,
            "Insiden 24-59 Bln": r.tuaCases,
            "% Baduta": Number(r.badutaImpact.toFixed(2)),
            "Status": r.status,
            "Rekomendasi": r.action,
        }));

        const ws = XLSX.utils.json_to_sheet(exportRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Analisis Insiden");
        XLSX.writeFile(wb, fileName);
    }, [tableData, filterBulan, filterTahun]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const paginatedTableData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return tableData.slice(start, start + itemsPerPage);
    }, [tableData, currentPage]);

    // Reset page when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filterTahun, filterBulan, filterPuskesmas]);

    const totalPages = Math.ceil(tableData.length / itemsPerPage);

    if (loading) return <div className="h-60 bg-white rounded-2xl animate-pulse border border-slate-200" />;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ─── Filters ─── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-icons-round text-emerald-600">filter_alt</span>
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Filter Analisis</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <select value={filterTahun || ""} onChange={(e) => { setFilterTahun(Number(e.target.value)); setFilterBulan(null); }} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm">
                        <option value="">Semua Tahun</option>
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select value={filterBulan || ""} onChange={(e) => setFilterBulan(Number(e.target.value))} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm">
                        <option value="">Semua Bulan</option>
                        {availableMonths.map(m => <option key={m} value={m}>{BULAN_LABELS[m]}</option>)}
                    </select>
                    <select value={filterPuskesmas} onChange={(e) => setFilterPuskesmas(e.target.value)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm">
                        <option value="all">Semua Puskesmas</option>
                        {availablePuskesmas.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            </div>

            {/* ─── Zone 1: KPIs ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ScoreCard label="Total Insiden Baru" value={totals.insidenTotal.toLocaleString()} suffix="Kasus" icon="coronavirus" color="red" />
                <ScoreCard label="Incidence Rate" value={totals.incidenceRate.toFixed(2)} suffix="%" icon="trending_up" color="purple" highlight />
                <ScoreCard label="Baduta (0-23 Bln)" value={totals.insidenBaduta.toLocaleString()} suffix="Kasus" icon="child_care" color="amber" subValue={`${totals.badutaImpact.toFixed(1)}% dari Total Kasus`} />
                <ScoreCard label="Balita Tua (24-59)" value={totals.insidenTua.toLocaleString()} suffix="Kasus" icon="escalator_warning" color="blue" />
            </div>

            {/* ─── Zone 2: Charts ─── */}
            <div className="space-y-6">
                {/* Chart 1: Distribusi Umur (Full Width) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <span className="material-icons-round text-emerald-600 text-xl">bar_chart</span>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Distribusi Umur per Puskesmas</h3>
                                <p className="text-xs text-slate-400">Data per puskesmas diurutkan dari tertinggi ke terendah</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setBarVisible(prev => ({ ...prev, baduta: !prev.baduta }))}
                                className={`flex items-center gap-2 text-xs font-bold transition-all px-3 py-1.5 rounded-lg border ${barVisible.baduta ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-400 border-slate-200 grayscale opacity-60'}`}
                            >
                                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                                Baduta (0-23 Bln)
                            </button>
                            <button
                                onClick={() => setBarVisible(prev => ({ ...prev, tua: !prev.tua }))}
                                className={`flex items-center gap-2 text-xs font-bold transition-all px-3 py-1.5 rounded-lg border ${barVisible.tua ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-400 border-slate-200 grayscale opacity-60'}`}
                            >
                                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                Balita (24-59 Bln)
                            </button>
                        </div>
                    </div>

                    <div className="h-[500px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={barChartData}
                                margin={{ top: 20, right: 30, left: 10, bottom: 130 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    interval={0}
                                    height={130}
                                    tick={({ x, y, payload }: { x: any; y: any; payload: { value: string } }) => {
                                        const name = payload.value;
                                        // Smart abbreviation matching Pelayanan Page
                                        const abbreviated = name.length > 12
                                            ? name.split(" ").map((w: string) => w.length > 4 ? w.slice(0, 4) + "." : w).join(" ")
                                            : name;
                                        return (
                                            <g transform={`translate(${x},${y})`}>
                                                <text
                                                    x={0}
                                                    y={0}
                                                    dy={16}
                                                    textAnchor="end"
                                                    fill="#64748b"
                                                    fontSize={10}
                                                    fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                                                    transform="rotate(-60)"
                                                >
                                                    {abbreviated}
                                                </text>
                                            </g>
                                        );
                                    }}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                    label={{ value: 'Jumlah Kasus', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 11 } }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend
                                    verticalAlign="top"
                                    height={36}
                                    wrapperStyle={{ display: 'none' }} // Custom legend in header
                                />
                                <Bar
                                    hide={!barVisible.baduta}
                                    dataKey="baduta"
                                    name="Baduta (0-23 Bln)"
                                    stackId="a"
                                    fill="#f59e0b"
                                    radius={[0, 0, 0, 0]}
                                    maxBarSize={50}
                                >
                                    <LabelList dataKey="baduta" position="center" fill="#fff" fontSize={10} fontWeight="bold" formatter={(val: any) => (typeof val === "number" && val > 0) ? val : ""} />
                                </Bar>
                                <Bar
                                    hide={!barVisible.tua}
                                    dataKey="tua"
                                    name="Balita (24-59 Bln)"
                                    stackId="a"
                                    fill="#3b82f6"
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={50}
                                >
                                    <LabelList dataKey="tua" position="top" fill="#64748b" fontSize={10} fontWeight="bold" formatter={(val: any) => (typeof val === "number" && val > 0) ? val : ""} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Section 2: Proporsi Gender (SC2 Layout) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <span className="material-icons-round text-pink-500 text-xl">pie_chart</span>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Analisis Proporsi Gender</h3>
                                <p className="text-xs text-slate-400">Distribusi kasus stunting berdasarkan jenis kelamin</p>
                            </div>
                        </div>
                        {/* Gender Filter Buttons */}
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => setGenderMetric("total")}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${genderMetric === "total" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                Semua Umur
                            </button>
                            <button
                                onClick={() => setGenderMetric("baduta")}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${genderMetric === "baduta" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                            >
                                Khusus Baduta
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                        {/* Left: Donut Chart */}
                        <div className="lg:col-span-1 h-[280px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Laki-laki', value: genderStats.male, color: '#3b82f6' },
                                            { name: 'Perempuan', value: genderStats.female, color: '#ec4899' },
                                        ]}
                                        cx="50%" cy="50%"
                                        innerRadius={70} outerRadius={95}
                                        paddingAngle={4}
                                        dataKey="value"
                                        labelLine={false}
                                    >
                                        {[
                                            { name: 'Laki-laki', value: genderStats.male, color: '#3b82f6' },
                                            { name: 'Perempuan', value: genderStats.female, color: '#ec4899' },
                                        ].map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-black text-slate-800 tracking-tight">
                                    {genderStats.total > 0 ? ((genderStats.male / genderStats.total) * 100).toFixed(1) : 0}%
                                </span>
                                <span className="text-xs font-bold text-blue-500 uppercase tracking-widest mt-1">Laki-Laki</span>
                            </div>
                        </div>

                        {/* Right: Summary Cards */}
                        <div className="lg:col-span-2 grid grid-cols-1 gap-4">
                            {/* Laki-laki Card */}
                            <div className="flex items-center p-4 rounded-xl bg-blue-50 border border-blue-100">
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-4 text-blue-600">
                                    <span className="material-icons-round">male</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Laki-Laki</p>
                                    <div className="flex items-baseline gap-2">
                                        <h4 className="text-2xl font-extrabold text-slate-800">{genderStats.male.toLocaleString()}</h4>
                                        <span className="text-sm font-bold text-slate-500">Kasus</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-black text-blue-600">
                                        {genderStats.total > 0 ? ((genderStats.male / genderStats.total) * 100).toFixed(1) : 0}%
                                    </span>
                                </div>
                            </div>

                            {/* Perempuan Card */}
                            <div className="flex items-center p-4 rounded-xl bg-pink-50 border border-pink-100">
                                <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mr-4 text-pink-500">
                                    <span className="material-icons-round">female</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-pink-600 uppercase tracking-wider mb-1">Perempuan</p>
                                    <div className="flex items-baseline gap-2">
                                        <h4 className="text-2xl font-extrabold text-slate-800">{genderStats.female.toLocaleString()}</h4>
                                        <span className="text-sm font-bold text-slate-500">Kasus</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-black text-pink-500">
                                        {genderStats.total > 0 ? ((genderStats.female / genderStats.total) * 100).toFixed(1) : 0}%
                                    </span>
                                </div>
                            </div>

                            {/* Rasio Card */}
                            <div className="mt-2 flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rasio Jenis Kelamin (L:P)</span>
                                <span className="text-lg font-black text-slate-700 font-mono">
                                    {genderStats.female > 0 ? (genderStats.male / genderStats.female).toFixed(2) : "-"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Zone 2.5: Trend Analysis ─── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <span className="material-icons-round text-indigo-500">show_chart</span>
                        Analisis Tren: Insidensi Rate & Struktur Umur
                    </h3>
                    <select
                        value={trendFilterTahun || ""}
                        onChange={(e) => setTrendFilterTahun(e.target.value ? Number(e.target.value) : null)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    >
                        <option value="">Semua Tahun</option>
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={trendData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis yAxisId="left" label={{ value: 'Incidence Rate (%)', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 11 } }} />
                            <YAxis yAxisId="right" orientation="right" label={{ value: 'Proporsi Kasus (%)', angle: 90, position: 'insideRight', style: { fill: '#64748b', fontSize: 11 } }} domain={[0, 100]} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number | undefined, name: string | number | undefined) => [value ? value.toFixed(2) + '%' : '0%', name]}
                            />
                            <Legend />
                            <Area yAxisId="left" type="monotone" dataKey="ir" name="Incidence Rate (Total)" fill="#8b5cf6" fillOpacity={0.1} stroke="#8b5cf6" strokeWidth={3} />
                            <Line yAxisId="right" type="monotone" dataKey="pctBaduta" name="% Kasus Baduta" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                            <Line yAxisId="right" type="monotone" dataKey="pctTua" name="% Kasus Balita Tua" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ─── Zone 3: Map ─── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <span className="material-icons-round text-emerald-600">public</span>
                            Peta Sebaran Incidence Rate
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">High Intensity indicates higher incidence rate</p>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setMapMetric("total")}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${mapMetric === "total" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            Semua Umur
                        </button>
                        <button
                            onClick={() => setMapMetric("baduta")}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${mapMetric === "baduta" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            Khusus Baduta
                        </button>
                    </div>
                </div>
                <MapComponent
                    data={mapData}
                    label={mapMetric === "total" ? "Incidence Rate (Total)" : "Incidence Rate (Baduta)"}
                    selectedPuskesmas={filterPuskesmas === "all" ? null : filterPuskesmas}
                />
            </div>

            {/* ─── Zone 4: Actionable Table ─── */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <span className="material-icons-round text-emerald-600">table_chart</span>
                        Detail Analisis & Rekomendasi
                    </h3>
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
                    >
                        <span className="material-icons-round text-sm">download</span>
                        Export Excel
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-mono uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="px-6 py-3 font-bold">Puskesmas</th>
                                <th className="px-6 py-3 font-bold text-center">Diukur</th>
                                <th className="px-6 py-3 font-bold text-center">Insiden Baru</th>
                                <th className="px-6 py-3 font-bold text-center">IR (%)</th>
                                <th className="px-6 py-3 font-bold text-center">% Baduta</th>
                                <th className="px-6 py-3 font-bold">Status</th>
                                <th className="px-6 py-3 font-bold">Rekomendasi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedTableData.map((row) => (
                                <tr key={row.puskesmas} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-slate-700">{row.puskesmas}</td>
                                    <td className="px-6 py-3 text-center text-slate-500">{row.measured.toLocaleString()}</td>
                                    <td className="px-6 py-3 text-center font-bold text-slate-700">{row.cases.toLocaleString()}</td>
                                    <td className="px-6 py-3 text-center">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${row.ir >= 2 ? "bg-red-50 text-red-600" : row.ir >= 1 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
                                            {row.ir.toFixed(2)}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-center text-slate-500">{row.badutaImpact.toFixed(1)}%</td>
                                    <td className="px-6 py-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${row.color === "red" ? "bg-red-50 text-red-700 border-red-100" :
                                            row.color === "amber" ? "bg-amber-50 text-amber-700 border-amber-100" :
                                                "bg-emerald-50 text-emerald-700 border-emerald-100"
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${row.color === "red" ? "bg-red-500" :
                                                row.color === "amber" ? "bg-amber-500" :
                                                    "bg-emerald-500"
                                                }`}></span>
                                            {row.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-xs text-slate-500 italic">
                                        {row.action}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                        Showing <span className="font-bold text-slate-700">{Math.min((currentPage - 1) * itemsPerPage + 1, tableData.length)}</span> to <span className="font-bold text-slate-700">{Math.min(currentPage * itemsPerPage, tableData.length)}</span> of <span className="font-bold text-slate-700">{tableData.length}</span> entries
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                        >
                            Previous
                        </button>
                        <div className="flex gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                // Simplified pagination logic: show first 5 or logic for windowing
                                let p = i + 1;
                                if (totalPages > 5 && currentPage > 3) {
                                    p = currentPage - 3 + i;
                                }
                                if (p > totalPages) return null;

                                return (
                                    <button
                                        key={p}
                                        onClick={() => setCurrentPage(p)}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${currentPage === p ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" : "text-slate-500 hover:bg-slate-50"}`}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
}
