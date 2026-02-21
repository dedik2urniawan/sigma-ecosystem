"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { TransactionData, calculateGrowthMetrics, calculateTrendMetrics, GrowthMetricsResult, TrendDataPoint } from "@/lib/balitaGiziHelper";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LineChart, Line, Legend, LabelList } from "recharts";
import { useAuth } from "@/app/dashboard/layout";
import {
    TrendingUp, TrendingDown, Minus, Info, Map as MapIcon, Table as TableIcon, Activity, ChevronDown
} from "lucide-react";

// Dynamic map imports to avoid SSR issues
const MapPuskesmas = dynamic(() => import("@/components/dashboard/MapPuskesmas"), { ssr: false });
const MapDesa = dynamic(() => import("@/components/dashboard/MapDesa"), { ssr: false });

// Reusable Metric Card
function MetricCard({ title, data }: { title: string, data: { current: number; previous: number; delta: number; isPositive: boolean } }) {
    const isNuetral = data.delta === 0;
    const colorClass = isNuetral ? "text-slate-500" : data.isPositive ? "text-emerald-600" : "text-rose-600";
    const bgClass = isNuetral ? "bg-slate-50" : data.isPositive ? "bg-emerald-50" : "bg-rose-50";
    const Icon = isNuetral ? Minus : data.delta > 0 ? TrendingUp : TrendingDown;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-xs font-semibold text-slate-500 mb-2 truncate" title={title}>{title}</h3>
            <div className="flex items-end justify-between">
                <div>
                    <div className="text-2xl font-bold text-slate-800">
                        {data.current.toFixed(1)}%
                    </div>
                </div>
                <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${colorClass} ${bgClass}`}>
                    <Icon size={12} strokeWidth={3} />
                    <span>{Math.abs(data.delta).toFixed(1)}%</span>
                </div>
            </div>
        </div>
    );
}


export default function GrowthAnalysisDashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    const effectiveRole = user?.role === "admin_puskesmas" ? "admin_puskesmas" : "superadmin";

    // Standard Filters
    const [jenisLaporan, setJenisLaporan] = useState<"bulanan" | "tahunan">("bulanan");
    const [bulanVal, setBulanVal] = useState<string>("2");
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [selectedPuskesmas, setSelectedPuskesmas] = useState<string>("ALL");
    const [selectedKelurahan, setSelectedKelurahan] = useState<string>("ALL");

    // Form options
    const [puskesmasOptions, setPuskesmasOptions] = useState<{ id: string; name: string }[]>([]);
    const [kelurahanOptions, setKelurahanOptions] = useState<{ id: string; name: string; puskesmas_id: string }[]>([]);

    // Data State
    const [metricsResult, setMetricsResult] = useState<GrowthMetricsResult | null>(null);
    const [trendResult, setTrendResult] = useState<TrendDataPoint[]>([]);

    // Expandable definitions
    const [showDefinitions, setShowDefinitions] = useState(false);

    // Map selection
    const [selectedMapMetric, setSelectedMapMetric] = useState<"stunting" | "wasting" | "underweight" | "obesitas">("stunting");

    useEffect(() => {
        const fetchRefData = async () => {
            let pQuery = supabase.from("ref_puskesmas").select("id, nama").order("nama");
            if (effectiveRole === "admin_puskesmas" && user?.puskesmas_id) {
                pQuery = pQuery.eq("id", user.puskesmas_id);
            }

            const [pRes, kRes] = await Promise.all([
                pQuery,
                supabase.from("ref_desa").select("id, desa_kel, puskesmas_id").order("desa_kel")
            ]);

            if (pRes.data) {
                setPuskesmasOptions(pRes.data.filter(p => !p.nama.toLowerCase().includes("dinkes")).map(p => ({ id: p.id, name: p.nama })));
                if (effectiveRole === "admin_puskesmas" && pRes.data.length > 0) {
                    setSelectedPuskesmas(pRes.data[0].id);
                }
            }
            if (kRes.data) {
                setKelurahanOptions(kRes.data.map(k => ({ id: k.id, name: k.desa_kel, puskesmas_id: k.puskesmas_id })));
            }
        };

        fetchRefData();
    }, [effectiveRole, user]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            let currentFilterMonths: number[] = [];
            let previousFilterMonths: number[] = [];
            let currentMonthsCount = 1;
            let previousMonthsCount = 1;

            if (jenisLaporan === "bulanan") {
                const b = parseInt(bulanVal);
                currentFilterMonths = [b];
                previousFilterMonths = b === 1 ? [12] : [b - 1];
                currentMonthsCount = 1;
                previousMonthsCount = 1;
            } else {
                const tw = parseInt(bulanVal);
                if (tw === 1) {
                    currentFilterMonths = [1, 2, 3];
                    previousFilterMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                    currentMonthsCount = 3;
                    previousMonthsCount = 12;
                }
                if (tw === 2) {
                    currentFilterMonths = [1, 2, 3, 4, 5, 6];
                    previousFilterMonths = [1, 2, 3];
                    currentMonthsCount = 6;
                    previousMonthsCount = 3;
                }
                if (tw === 3) {
                    currentFilterMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                    previousFilterMonths = [1, 2, 3, 4, 5, 6];
                    currentMonthsCount = 9;
                    previousMonthsCount = 6;
                }
                if (tw === 4) {
                    currentFilterMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                    previousFilterMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                    currentMonthsCount = 12;
                    previousMonthsCount = 9;
                }
            }

            try {
                let currentQuery = supabase.from("data_balita_gizi").select("*")
                    .eq("tahun", year)
                    .in("bulan", currentFilterMonths)
                    .not("puskesmas", "ilike", "%dinkes%");

                let prevYear = year;
                if (jenisLaporan === "bulanan" && parseInt(bulanVal) === 1) prevYear = (parseInt(year) - 1).toString();
                if (jenisLaporan === "tahunan" && parseInt(bulanVal) === 1) prevYear = (parseInt(year) - 1).toString();

                let prevQuery = supabase.from("data_balita_gizi").select("*")
                    .eq("tahun", prevYear)
                    .in("bulan", previousFilterMonths)
                    .not("puskesmas", "ilike", "%dinkes%");

                let fullYearQuery = supabase.from("data_balita_gizi").select("*")
                    .eq("tahun", year)
                    .not("puskesmas", "ilike", "%dinkes%");

                if (selectedPuskesmas !== "ALL") {
                    const pName = puskesmasOptions.find(p => p.id === selectedPuskesmas)?.name;
                    if (pName) {
                        currentQuery = currentQuery.eq("puskesmas", pName);
                        prevQuery = prevQuery.eq("puskesmas", pName);
                        fullYearQuery = fullYearQuery.eq("puskesmas", pName);
                    }
                }
                if (selectedKelurahan !== "ALL") {
                    const kName = kelurahanOptions.find(k => k.id === selectedKelurahan)?.name;
                    if (kName) {
                        currentQuery = currentQuery.eq("kelurahan", kName);
                        prevQuery = prevQuery.eq("kelurahan", kName);
                        fullYearQuery = fullYearQuery.eq("kelurahan", kName);
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

                const [filteredCurrentData, filteredPrevData, filteredYearData] = await Promise.all([
                    fetchAll(currentQuery),
                    fetchAll(prevQuery),
                    fetchAll(fullYearQuery)
                ]);

                const groupingRole = (effectiveRole === "superadmin" && selectedPuskesmas === "ALL") ? "superadmin" : "admin_puskesmas";
                const metrics = calculateGrowthMetrics(filteredCurrentData, filteredPrevData, groupingRole, currentMonthsCount, previousMonthsCount);
                const trends = calculateTrendMetrics(filteredYearData);

                setMetricsResult(metrics);
                setTrendResult(trends);

            } catch (error) {
                console.error("Failed to fetch growth data", error);
            } finally {
                setLoading(false);
            }
        };

        if (puskesmasOptions.length > 0) {
            fetchData();
        }
    }, [jenisLaporan, bulanVal, year, selectedPuskesmas, selectedKelurahan, effectiveRole, puskesmasOptions, kelurahanOptions]);

    const activeKelurahanOptions = useMemo(() => {
        if (selectedPuskesmas === "ALL") return kelurahanOptions;
        return kelurahanOptions.filter(k => k.puskesmas_id === selectedPuskesmas);
    }, [selectedPuskesmas, kelurahanOptions]);

    // Map Data prep
    const mapData = useMemo(() => {
        if (!metricsResult) return {};
        const md: Record<string, number> = {};
        metricsResult.summaryTable.forEach(row => {
            md[row.name] = row[selectedMapMetric] || 0;
        });
        return md;
    }, [metricsResult, selectedMapMetric]);

    // Bar Chart Data
    const COLORS_BAR = ['#0ea5e9', '#38bdf8', '#ef4444', '#fca5a5', '#10b981', '#6ee7b7', '#f59e0b', '#fbbf24', '#c084fc', '#94a3b8', '#3b82f6', '#60a5fa', '#f43f5e'];

    const barChartData = useMemo(() => {
        if (!metricsResult) return [];
        return Object.entries(metricsResult.metrics).map(([key, data]) => ({
            name: key,
            value: Number(data.current.toFixed(2))
        }));
    }, [metricsResult]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    // Chart Legend Toggle State
    const [hiddenGizi, setHiddenGizi] = useState<string[]>([]);
    const [hiddenEsensial, setHiddenEsensial] = useState<string[]>([]);

    const toggleGizi = (e: any) => {
        const dataKey = e.dataKey;
        setHiddenGizi(prev => prev.includes(dataKey) ? prev.filter(k => k !== dataKey) : [...prev, dataKey]);
    };

    const toggleEsensial = (e: any) => {
        const dataKey = e.dataKey;
        setHiddenEsensial(prev => prev.includes(dataKey) ? prev.filter(k => k !== dataKey) : [...prev, dataKey]);
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [metricsResult]);

    const totalPages = metricsResult ? Math.ceil(metricsResult.summaryTable.length / rowsPerPage) : 0;
    const paginatedTable = metricsResult ? metricsResult.summaryTable.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage) : [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">
                        Analisis Pertumbuhan & Perkembangan Balita
                    </h1>
                    <p className="text-slate-600">
                        Dashboard analitik untuk memantau indikator esensial kinerja gizi balita berserta tren prevalensi.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Pilih Periode Laporan
                    </label>
                    <div className="flex gap-2">
                        <select
                            value={jenisLaporan}
                            onChange={(e) => {
                                setJenisLaporan(e.target.value as "bulanan" | "tahunan");
                                setBulanVal(e.target.value === "bulanan" ? "2" : "1");
                            }}
                            className="w-1/3 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 outline-none transition-all"
                        >
                            <option value="bulanan">Bulanan</option>
                            <option value="tahunan">Triwulanan</option>
                        </select>
                        <select
                            value={bulanVal}
                            onChange={(e) => setBulanVal(e.target.value)}
                            className="w-2/3 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 outline-none transition-all"
                        >
                            {jenisLaporan === "bulanan" ? (
                                <>
                                    <option value="1">Januari</option>
                                    <option value="2">Februari</option>
                                    <option value="3">Maret</option>
                                    <option value="4">April</option>
                                    <option value="5">Mei</option>
                                    <option value="6">Juni</option>
                                    <option value="7">Juli</option>
                                    <option value="8">Agustus</option>
                                    <option value="9">September</option>
                                    <option value="10">Oktober</option>
                                    <option value="11">November</option>
                                    <option value="12">Desember</option>
                                </>
                            ) : (
                                <>
                                    <option value="1">Triwulan 1 (Jan - Mar)</option>
                                    <option value="2">Triwulan 2 (Apr - Jun)</option>
                                    <option value="3">Triwulan 3 (Jul - Sep)</option>
                                    <option value="4">Triwulan 4 (Okt - Des)</option>
                                </>
                            )}
                        </select>
                    </div>
                </div>

                <div className="w-full md:w-32">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tahun</label>
                    <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 outline-none transition-all"
                    >
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                    </select>
                </div>

                {effectiveRole === "superadmin" && (
                    <div className="w-full md:flex-1 md:min-w-[200px]">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Puskesmas</label>
                        <select
                            value={selectedPuskesmas}
                            onChange={(e) => {
                                setSelectedPuskesmas(e.target.value);
                                setSelectedKelurahan("ALL");
                            }}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 outline-none transition-all"
                        >
                            <option value="ALL">Semua Puskesmas</option>
                            {puskesmasOptions.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="w-full md:flex-1 md:min-w-[200px]">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Desa/Kelurahan</label>
                    <select
                        value={selectedKelurahan}
                        onChange={(e) => setSelectedKelurahan(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 outline-none transition-all"
                    >
                        <option value="ALL">Semua Desa/Kelurahan</option>
                        {activeKelurahanOptions.map((k) => (
                            <option key={k.id} value={k.id}>{k.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Definitions Accordion */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <button
                    onClick={() => setShowDefinitions(!showDefinitions)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                    <div className="flex items-center gap-2 text-slate-700 font-semibold">
                        <Info size={18} className="text-emerald-600" />
                        <span>Definisi Operasional Indikator Kinerja Gizi</span>
                    </div>
                    <ChevronDown size={18} className={`text-slate-500 transition-transform ${showDefinitions ? 'rotate-180' : ''}`} />
                </button>
                {showDefinitions && (
                    <div className="p-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                        <div>
                            <ul className="space-y-2 list-disc pl-4">
                                <li><strong>Prevalensi Stunting:</strong> Persentase anak stunting dari total balita diukur (Normal: Tinggi Badan sesuai umur).</li>
                                <li><strong>Prevalensi Wasting:</strong> Persentase anak wasting dari total ditimbang & diukur (Normal: Berat Badan sesuai Panjang Badan).</li>
                                <li><strong>Prevalensi Underweight:</strong> Persentase anak gizi kurang/buruk dari total balita ditimbang.</li>
                            </ul>
                        </div>
                        <div>
                            <ul className="space-y-2 list-disc pl-4">
                                <li><strong>Balita ditimbang & diukur (% D/S):</strong> Menunjukkan partisipasi masyarakat datang ke Posyandu.</li>
                                <li><strong>Balita Naik BB (% N/D):</strong> Indikator keberhasilan intervensi dasar yang berdampak pada status gizi makro.</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                </div>
            ) : metricsResult && (
                <>
                    {/* Scorecards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {Object.entries(metricsResult.metrics).map(([key, data]) => (
                            <MetricCard key={key} title={key} data={data} />
                        ))}
                    </div>

                    {/* Bar Chart overall metrics */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[500px]">
                        <div className="flex items-center gap-2 mb-6">
                            <Activity className="w-5 h-5 text-indigo-600" />
                            <h3 className="font-bold text-slate-800">Metrik Pertumbuhan & Perkembangan Balita</h3>
                        </div>
                        <div className="flex-1 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 0, bottom: 120 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis
                                        dataKey="name"
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        tick={({ x, y, payload }: { x: any; y: any; payload: { value: string } }) => {
                                            const name = payload.value;
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
                                                        fontSize={11}
                                                        fontFamily="monospace"
                                                        transform="rotate(-45)"
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
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `${val}%`} />
                                    <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(val: any) => `${val}%`} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="value" position="top" formatter={(val: any) => `${val}%`} style={{ fontSize: '11px', fill: '#64748b', fontWeight: 'bold' }} />
                                        {barChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS_BAR[index % COLORS_BAR.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Charts & Maps Full Width Layout */}
                    <div className="flex flex-col gap-6">

                        {/* Interactive UI Map */}
                        <div className="bg-white p-6 justify-center items-center rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[700px]">
                            <div className="flex justify-between w-full items-center mb-6">
                                <div className="flex items-center gap-2">
                                    <MapIcon className="w-5 h-5 text-emerald-600" />
                                    <h3 className="font-bold text-slate-800">Peta Sebaran Locus Gizi</h3>
                                </div>
                                <select
                                    className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block p-2 outline-none font-semibold"
                                    value={selectedMapMetric}
                                    onChange={(e) => setSelectedMapMetric(e.target.value as any)}
                                >
                                    <option value="stunting">Stunting</option>
                                    <option value="wasting">Wasting</option>
                                    <option value="underweight">Underweight</option>
                                    <option value="obesitas">Overweight (Obesitas)</option>
                                </select>
                            </div>
                            <div className="w-full flex-1 relative rounded-xl overflow-hidden border border-slate-100">
                                {effectiveRole === "superadmin" && selectedPuskesmas === "ALL" ? (
                                    <MapPuskesmas
                                        key={`map-puskesmas-${selectedMapMetric}`}
                                        data={mapData}
                                        metric={selectedMapMetric}
                                        selectedPuskesmas={selectedPuskesmas !== "ALL" ? puskesmasOptions.find(p => p.id === selectedPuskesmas)?.name : null}
                                    />
                                ) : (
                                    <MapDesa
                                        key={`map-desa-${selectedMapMetric}`}
                                        data={mapData}
                                        metric={selectedMapMetric}
                                        selectedDesa={selectedKelurahan !== "ALL" ? kelurahanOptions.find(p => p.id === selectedKelurahan)?.name : null}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Trend Chart Gizi */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
                            <div className="flex items-center gap-2 mb-6">
                                <Activity className="w-5 h-5 text-emerald-600" />
                                <h3 className="font-bold text-slate-800">Tren Prevalensi Gizi ({year})</h3>
                            </div>
                            <div className="flex-1 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendResult} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="bulanName" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dx={-10} tickFormatter={(val) => `${val}%`} />
                                        <RechartsTooltip cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} />
                                        <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', cursor: 'pointer' }} onClick={toggleGizi} />
                                        <Line type="monotone" hide={hiddenGizi.includes("Prevalensi Stunting")} dataKey="Prevalensi Stunting" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }}>
                                            <LabelList dataKey="Prevalensi Stunting" position="top" formatter={(val: any) => val !== 0 ? val : ''} style={{ fontSize: '10px', fill: '#ef4444' }} />
                                        </Line>
                                        <Line type="monotone" hide={hiddenGizi.includes("Prevalensi Wasting")} dataKey="Prevalensi Wasting" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }}>
                                            <LabelList dataKey="Prevalensi Wasting" position="top" formatter={(val: any) => val !== 0 ? val : ''} style={{ fontSize: '10px', fill: '#f59e0b' }} />
                                        </Line>
                                        <Line type="monotone" hide={hiddenGizi.includes("Prevalensi Underweight")} dataKey="Prevalensi Underweight" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }}>
                                            <LabelList dataKey="Prevalensi Underweight" position="top" formatter={(val: any) => val !== 0 ? val : ''} style={{ fontSize: '10px', fill: '#3b82f6' }} />
                                        </Line>
                                        <Line type="monotone" hide={hiddenGizi.includes("Prevalensi Overweight")} dataKey="Prevalensi Overweight" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6' }} activeDot={{ r: 6 }}>
                                            <LabelList dataKey="Prevalensi Overweight" position="top" formatter={(val: any) => val !== 0 ? val : ''} style={{ fontSize: '10px', fill: '#8b5cf6' }} />
                                        </Line>
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Trend Chart Esensial */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
                            <div className="flex items-center gap-2 mb-6">
                                <Activity className="w-5 h-5 text-indigo-600" />
                                <h3 className="font-bold text-slate-800">Tren Metrik Esensial Pertumbuhan dan Perkembangan ({year})</h3>
                            </div>
                            <div className="flex-1 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={trendResult} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="bulanName" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dx={-10} tickFormatter={(val) => `${val}%`} />
                                        <RechartsTooltip cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', cursor: 'pointer' }} onClick={toggleEsensial} />
                                        <Line type="monotone" hide={hiddenEsensial.includes("Balita ditimbang (Proyeksi)")} dataKey="Balita ditimbang (Proyeksi)" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }}>
                                            <LabelList dataKey="Balita ditimbang (Proyeksi)" position="top" formatter={(val: any) => val !== 0 ? val : ''} style={{ fontSize: '10px', fill: '#64748b' }} />
                                        </Line>
                                        <Line type="monotone" hide={hiddenEsensial.includes("Balita ditimbang (Data Rill)")} dataKey="Balita ditimbang (Data Rill)" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }}>
                                            <LabelList dataKey="Balita ditimbang (Data Rill)" position="top" formatter={(val: any) => val !== 0 ? val : ''} style={{ fontSize: '10px', fill: '#64748b' }} />
                                        </Line>
                                        <Line type="monotone" hide={hiddenEsensial.includes("Balita ditimbang & diukur")} dataKey="Balita ditimbang & diukur" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }}>
                                            <LabelList dataKey="Balita ditimbang & diukur" position="top" formatter={(val: any) => val !== 0 ? val : ''} style={{ fontSize: '10px', fill: '#64748b' }} />
                                        </Line>
                                        <Line type="monotone" hide={hiddenEsensial.includes("Balita diukur PB/TB")} dataKey="Balita diukur PB/TB" stroke="#fca5a5" strokeWidth={2} dot={{ r: 3 }}>
                                            <LabelList dataKey="Balita diukur PB/TB" position="top" formatter={(val: any) => val !== 0 ? val : ''} style={{ fontSize: '10px', fill: '#64748b' }} />
                                        </Line>
                                        <Line type="monotone" hide={hiddenEsensial.includes("Balita memiliki Buku KIA")} dataKey="Balita memiliki Buku KIA" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }}>
                                            <LabelList dataKey="Balita memiliki Buku KIA" position="top" formatter={(val: any) => val !== 0 ? val : ''} style={{ fontSize: '10px', fill: '#64748b' }} />
                                        </Line>
                                        <Line type="monotone" hide={hiddenEsensial.includes("Balita Naik BB")} dataKey="Balita Naik BB" stroke="#6ee7b7" strokeWidth={2} dot={{ r: 3 }}>
                                            <LabelList dataKey="Balita Naik BB" position="top" formatter={(val: any) => val !== 0 ? val : ''} style={{ fontSize: '10px', fill: '#64748b' }} />
                                        </Line>
                                        <Line type="monotone" hide={hiddenEsensial.includes("Balita Naik dengan D Koreksi")} dataKey="Balita Naik dengan D Koreksi" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }}>
                                            <LabelList dataKey="Balita Naik dengan D Koreksi" position="top" formatter={(val: any) => val !== 0 ? val : ''} style={{ fontSize: '10px', fill: '#64748b' }} />
                                        </Line>
                                        <Line type="monotone" hide={hiddenEsensial.includes("Balita Tidak Naik BB")} dataKey="Balita Tidak Naik BB" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }}>
                                            <LabelList dataKey="Balita Tidak Naik BB" position="top" formatter={(val: any) => val !== 0 ? val : ''} style={{ fontSize: '10px', fill: '#64748b' }} />
                                        </Line>
                                        <Line type="monotone" hide={hiddenEsensial.includes("Balita Tidak Timbang Bulan Lalu")} dataKey="Balita Tidak Timbang Bulan Lalu" stroke="#c084fc" strokeWidth={2} dot={{ r: 3 }}>
                                            <LabelList dataKey="Balita Tidak Timbang Bulan Lalu" position="top" formatter={(val: any) => val !== 0 ? val : ''} style={{ fontSize: '10px', fill: '#64748b' }} />
                                        </Line>
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>

                    {/* Summary Data Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 rounded-xl">
                                    <TableIcon className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Detail Agregat Pertumbuhan</h3>
                                    <p className="text-sm text-slate-500 mt-1">Data agregat kinerja gizi level {(effectiveRole === 'superadmin' && selectedPuskesmas === 'ALL') ? 'Puskesmas' : 'Desa'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left align-middle min-w-[800px]">
                                <thead className="text-xs text-slate-600 font-bold uppercase bg-slate-50 border-y border-slate-200">
                                    <tr>
                                        <th scope="col" className="px-6 py-4">{(effectiveRole === 'superadmin' && selectedPuskesmas === 'ALL') ? 'Puskesmas' : 'Desa/Kelurahan'}</th>
                                        <th scope="col" className="px-6 py-4">Total Sasaran (S)</th>
                                        <th scope="col" className="px-6 py-4 text-center">% Balita Ditimbang (D/S)</th>
                                        <th scope="col" className="px-6 py-4 text-center">% Balita Naik BB (N/D)</th>
                                        <th scope="col" className="px-6 py-4 text-center">% N/D Koreksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedTable.map((row) => (
                                        <tr key={row.name} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-semibold text-slate-800">{row.name}</td>
                                            <td className="px-6 py-4 text-slate-600">{row.jumlah_sasaran_balita}</td>
                                            <td className={`px-6 py-4 text-center font-semibold ${row.persen_ds > 100 ? 'bg-rose-100 text-rose-700' : 'text-slate-700'}`}>
                                                {row.persen_ds.toFixed(2)}%
                                            </td>
                                            <td className={`px-6 py-4 text-center font-semibold ${row.persen_nd_rill > 100 ? 'bg-rose-100 text-rose-700' : 'text-slate-700'}`}>
                                                {row.persen_nd_rill.toFixed(2)}%
                                            </td>
                                            <td className={`px-6 py-4 text-center font-semibold ${row.persen_nd_koreksi > 100 ? 'bg-rose-100 text-rose-700' : 'text-slate-700'}`}>
                                                {row.persen_nd_koreksi.toFixed(2)}%
                                            </td>
                                        </tr>
                                    ))}
                                    {paginatedTable.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                                Tidak ada data untuk periode ini
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                                <span className="text-sm text-slate-500">
                                    Menampilkan {(currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, metricsResult.summaryTable.length)} dari {metricsResult.summaryTable.length} data
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Prev
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                </>
            )}
        </div>
    );
}
