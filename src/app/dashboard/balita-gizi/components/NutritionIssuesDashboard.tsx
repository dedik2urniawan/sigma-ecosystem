"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from 'next/dynamic';
import { supabase } from "@/lib/supabase";
import { calculateGrowthMetrics, GrowthMetricsResult } from "@/lib/balitaGiziHelper";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, Cell, LabelList } from "recharts";
import { useAuth } from "@/app/dashboard/layout";
import { Info, ChevronDown, Activity, AlertTriangle, CheckCircle2, Map as MapIcon, TrendingUp, TrendingDown } from "lucide-react";

const MapPuskesmas = dynamic(
    () => import('@/components/dashboard/MapPuskesmas'),
    { ssr: false, loading: () => <p className="text-center text-slate-500 py-10">Memuat Peta...</p> }
);
const MapDesa = dynamic(
    () => import('@/components/dashboard/MapDesa'),
    { ssr: false, loading: () => <p className="text-center text-slate-500 py-10">Memuat Peta...</p> }
);

export default function NutritionIssuesDashboard() {
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

    // Expandable definitions
    const [showDefinitions, setShowDefinitions] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    // Map State
    const [selectedMapMetric, setSelectedMapMetric] = useState<"stunting" | "wasting" | "underweight" | "obesitas">("stunting");

    // Unified prevalence chart metric selector
    const [selectedPrevalenceMetric, setSelectedPrevalenceMetric] = useState<string>('stunting');

    useEffect(() => {
        setCurrentPage(1);
    }, [metricsResult]);

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

                if (selectedPuskesmas !== "ALL") {
                    const pName = puskesmasOptions.find(p => p.id === selectedPuskesmas)?.name;
                    if (pName) {
                        currentQuery = currentQuery.eq("puskesmas", pName);
                        prevQuery = prevQuery.eq("puskesmas", pName);
                    }
                }
                if (selectedKelurahan !== "ALL") {
                    const kName = kelurahanOptions.find(k => k.id === selectedKelurahan)?.name;
                    if (kName) {
                        currentQuery = currentQuery.eq("kelurahan", kName);
                        prevQuery = prevQuery.eq("kelurahan", kName);
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

                const [filteredCurrentData, filteredPrevData] = await Promise.all([
                    fetchAll(currentQuery),
                    fetchAll(prevQuery)
                ]);

                const groupingRole = (effectiveRole === "superadmin" && selectedPuskesmas === "ALL") ? "superadmin" : "admin_puskesmas";
                const metrics = calculateGrowthMetrics(filteredCurrentData, filteredPrevData, groupingRole, currentMonthsCount, previousMonthsCount);
                setMetricsResult(metrics);

            } catch (error) {
                console.error("Failed to fetch nutrition issues data", error);
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

    const TARGETS = {
        Stunting: { val: 14, color: '#ef4444' },
        Wasting: { val: 7, color: '#f59e0b' },
        Underweight: { val: 10, color: '#3b82f6' },
        Overweight: { val: 5, color: '#8b5cf6' }
    };

    const overallMetrics = useMemo(() => {
        if (!metricsResult) return [];
        return [
            { id: "Stunting", name: "Prevalensi Stunting", current: metricsResult.metrics["Prevalensi Stunting"].current, delta: metricsResult.metrics["Prevalensi Stunting"].delta, target: TARGETS.Stunting.val },
            { id: "Wasting", name: "Prevalensi Wasting", current: metricsResult.metrics["Prevalensi Wasting"].current, delta: metricsResult.metrics["Prevalensi Wasting"].delta, target: TARGETS.Wasting.val },
            { id: "Underweight", name: "Prevalensi Underweight", current: metricsResult.metrics["Prevalensi Underweight"].current, delta: metricsResult.metrics["Prevalensi Underweight"].delta, target: TARGETS.Underweight.val },
            { id: "Overweight", name: "Prevalensi Overweight", current: metricsResult.metrics["Prevalensi Overweight"].current, delta: metricsResult.metrics["Prevalensi Overweight"].delta, target: TARGETS.Overweight.val }
        ];
    }, [metricsResult]);

    // Format map data to match the expected structure
    const mapData = useMemo(() => {
        if (!metricsResult) return {};
        const dataMap: Record<string, number> = {};
        metricsResult.summaryTable.forEach(row => {
            dataMap[row.name] = row[selectedMapMetric] || 0;
        });
        return dataMap;
    }, [metricsResult, selectedMapMetric]);

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-600 to-orange-500">
                        Analisis Masalah Gizi
                    </h1>
                    <p className="text-slate-600">
                        Deteksi dan pantau indikator masalah gizi seperti Stunting, Wasting, Underweight, dan Overweight.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pilih Periode Laporan</label>
                    <div className="flex gap-2">
                        <select
                            value={jenisLaporan}
                            onChange={(e) => {
                                setJenisLaporan(e.target.value as "bulanan" | "tahunan");
                                setBulanVal(e.target.value === "bulanan" ? "2" : "1");
                            }}
                            className="w-1/3 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-rose-500 focus:border-rose-500 block p-2.5 outline-none transition-all"
                        >
                            <option value="bulanan">Bulanan</option>
                            <option value="tahunan">Triwulanan</option>
                        </select>
                        <select
                            value={bulanVal}
                            onChange={(e) => setBulanVal(e.target.value)}
                            className="w-2/3 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-rose-500 focus:border-rose-500 block p-2.5 outline-none transition-all"
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
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-rose-500 focus:border-rose-500 block w-full p-2.5 outline-none transition-all"
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
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-rose-500 focus:border-rose-500 block w-full p-2.5 outline-none transition-all"
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
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-rose-500 focus:border-rose-500 block w-full p-2.5 outline-none transition-all"
                    >
                        <option value="ALL">Semua Desa/Kelurahan</option>
                        {activeKelurahanOptions.map((k) => (
                            <option key={k.id} value={k.id}>{k.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Definitions Accordion */}
            <div className="bg-blue-50/50 rounded-2xl border border-blue-100 overflow-hidden shadow-sm">
                <button
                    onClick={() => setShowDefinitions(!showDefinitions)}
                    className="w-full flex items-center justify-between p-4 hover:bg-blue-100/50 transition-colors"
                >
                    <div className="flex items-center gap-2 text-blue-800 font-semibold text-lg">
                        <Info size={20} className="text-blue-600" />
                        <span>Informasi Mengenai Masalah Gizi pada Balita</span>
                    </div>
                    <ChevronDown size={20} className={`text-blue-500 transition-transform ${showDefinitions ? 'rotate-180' : ''}`} />
                </button>
                {showDefinitions && (
                    <div className="p-6 border-t border-blue-100 text-sm text-slate-700 bg-white">
                        <h3 className="text-base font-bold text-slate-800 mb-4">Pemahaman Masalah Gizi pada Balita: Stunting, Wasting, Underweight, dan Overweight</h3>
                        <p className="mb-6">Masalah gizi pada balita merupakan indikator penting dalam menilai status kesehatan dan perkembangan anak. Berikut adalah penjelasan mengenai empat indikator utama yang dianalisis dalam dashboard ini, beserta formula perhitungannya:</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <h4 className="font-bold text-rose-600 mb-2">1. Stunting (Kerdil)</h4>
                                <p className="mb-2">Pertumbuhan terhambat akibat kekurangan gizi kronis, terlihat dari tinggi badan balita yang jauh di bawah standar untuk usianya. Memiliki dampak jangka panjang terhadap perkembangan kognitif.</p>
                                <p className="font-mono text-xs bg-white p-2 border border-slate-200 rounded text-slate-600 overflow-x-auto">Prevalensi = (Balita Stunting / Balita Diukur PBTB) × 100</p>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <h4 className="font-bold text-amber-500 mb-2">2. Wasting (Kurus)</h4>
                                <p className="mb-2">Kekurangan gizi akut, di mana berat badan balita sangat rendah dibandingkan dengan tinggi badannya. Sering terjadi akibat kelaparan atau penyakit akut.</p>
                                <p className="font-mono text-xs bg-white p-2 border border-slate-200 rounded text-slate-600 overflow-x-auto">Prevalensi = (Balita Wasting / Balita Ditimbang & Diukur) × 100</p>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <h4 className="font-bold text-blue-500 mb-2">3. Underweight (Berat Badan Kurang)</h4>
                                <p className="mb-2">Mengindikasikan berat badan balita yang rendah untuk usianya, yang dapat disebabkan oleh kekurangan gizi baik akut maupun kronis.</p>
                                <p className="font-mono text-xs bg-white p-2 border border-slate-200 rounded text-slate-600 overflow-x-auto">Prevalensi = (Balita Underweight / Balita Ditimbang) × 100</p>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <h4 className="font-bold text-purple-500 mb-2">4. Overweight (Berat Badan Berlebih)</h4>
                                <p className="mb-2">Berat badan balita yang melebihi standar untuk usianya, sering kali akibat asupan kalori berlebih. Dapat meningkatkan risiko obesitas di masa depan.</p>
                                <p className="font-mono text-xs bg-white p-2 border border-slate-200 rounded text-slate-600 overflow-x-auto">Prevalensi = (Balita Overweight / Balita Ditimbang) × 100</p>
                            </div>
                        </div>

                        <div className="mt-6 p-4 bg-blue-50 rounded-xl flex gap-3 text-blue-800">
                            <Info className="shrink-0" />
                            <div>
                                <h5 className="font-bold mb-1">Catatan Penting tentang Target Prevalensi Gizi:</h5>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                    <li><strong>Stunting</strong>: Target maksimal 14% (Kita ingin angka ini tetap rendah untuk kesehatan balita!)</li>
                                    <li><strong>Wasting</strong>: Target maksimal 7% (Pastikan balita terhindar dari kekurangan gizi akut!)</li>
                                    <li><strong>Underweight</strong>: Target maksimal 10% (Mari jaga berat badan balita ideal!)</li>
                                    <li><strong>Overweight</strong>: Target maksimal 5% (Keseimbangan gizi sangat penting!)</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin"></div>
                </div>
            ) : metricsResult && (
                <>
                    {/* Scorecards */}
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-rose-500" />
                            Metrik Prevalensi Masalah Gizi
                        </h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {overallMetrics.map((m) => {
                                const isWarning = m.current > m.target;
                                return (
                                    <div key={m.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-sm font-bold text-slate-600 break-words pr-2">{m.name}</h3>
                                            {isWarning ? (
                                                <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                                                    Perhatian <AlertTriangle size={10} />
                                                </span>
                                            ) : (
                                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                                                    Baik <CheckCircle2 size={10} />
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-end justify-between mt-4">
                                            <div className="text-3xl font-black text-slate-800">
                                                {m.current.toFixed(1)}<span className="text-lg text-slate-400">%</span>
                                            </div>
                                        </div>
                                        <div className="text-xs text-slate-400 mt-2 flex justify-between">
                                            <span>Target: &le;{m.target}%</span>
                                            <span className={`font-semibold ${m.delta > 0 ? 'text-rose-500' : m.delta < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                {m.delta > 0 ? '+' : ''}{m.delta.toFixed(2)}% dari periode lalu
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Chart Combined */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-6">Grafik Prevalensi Masalah Gizi</h3>
                        <div className="h-80 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={overallMetrics} margin={{ top: 20, right: 30, left: 0, bottom: 20 }} barSize={60}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="id" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748b', fontWeight: 600 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} tickFormatter={(val) => `${val}%`} />
                                    <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="current" radius={[6, 6, 0, 0]}>
                                        <LabelList dataKey="current" position="top" formatter={(val: any) => `${val.toFixed(2)}%`} style={{ fontSize: '11px', fill: '#64748b', fontWeight: 'bold' }} />
                                        {overallMetrics.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={TARGETS[entry.id as keyof typeof TARGETS].color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Geografis Map Widget */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <MapIcon className="w-5 h-5 text-rose-500" />
                                Peta Analisis Geografis Masalah Gizi
                            </h3>

                            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                                {[
                                    { id: 'stunting', label: 'Stunting', color: 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200' },
                                    { id: 'wasting', label: 'Wasting', color: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200' },
                                    { id: 'underweight', label: 'Underweight', color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' },
                                    { id: 'obesitas', label: 'Overweight', color: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200' },
                                ].map((metric) => (
                                    <button
                                        key={metric.id}
                                        onClick={() => setSelectedMapMetric(metric.id as any)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border whitespace-nowrap transition-colors ${selectedMapMetric === metric.id ? metric.color + ' ring-2 ring-offset-1 ring-' + metric.color.split('-')[1] + '-400' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                                    >
                                        {metric.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-[500px] w-full bg-slate-50/50 rounded-xl border border-slate-100 overflow-hidden relative">
                            {effectiveRole === "superadmin" && selectedPuskesmas === "ALL" ? (
                                <MapPuskesmas
                                    key={`map-puskesmas-${selectedMapMetric}`}
                                    data={mapData}
                                    metric={selectedMapMetric}
                                    selectedPuskesmas={selectedPuskesmas !== "ALL" ? puskesmasOptions.find(p => p.id === selectedPuskesmas)?.name ?? null : null}
                                />
                            ) : (
                                <MapDesa
                                    key={`map-desa-${selectedMapMetric}`}
                                    data={mapData}
                                    metric={selectedMapMetric}
                                    selectedDesa={selectedKelurahan !== "ALL" ? kelurahanOptions.find(k => k.id === selectedKelurahan)?.name ?? null : null}
                                />
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-3 text-center">
                            Warna lebih gelap menunjukkan persentase prevalensi yang lebih tinggi. Arahkan kursor ke area peta untuk melihat nilai detail.
                        </p>
                    </div>

                    {/* ── Unified Prevalence Chart with Metric Selector ── */}
                    {(() => {
                        const PREV_METRICS = [
                            { id: 'stunting', label: 'Stunting', key: 'stunting', target: TARGETS.Stunting.val, gradient: ['#dc2626', '#ef4444'], emoji: '📏' },
                            { id: 'wasting', label: 'Wasting', key: 'wasting', target: TARGETS.Wasting.val, gradient: ['#d97706', '#f59e0b'], emoji: '⚖️' },
                            { id: 'underweight', label: 'Underweight', key: 'underweight', target: TARGETS.Underweight.val, gradient: ['#2563eb', '#3b82f6'], emoji: '📊' },
                            { id: 'obesitas', label: 'Overweight', key: 'obesitas', target: TARGETS.Overweight.val, gradient: ['#7c3aed', '#8b5cf6'], emoji: '🔴' },
                        ];

                        const activeMetric = PREV_METRICS.find(m => m.id === selectedPrevalenceMetric) || PREV_METRICS[0];
                        const sortedData = [...metricsResult.summaryTable].sort((a, b) => {
                            const valA = Number(a[activeMetric.key as keyof typeof a]) || 0;
                            const valB = Number(b[activeMetric.key as keyof typeof b]) || 0;
                            return valB - valA;
                        });
                        const avgValue = sortedData.length > 0
                            ? sortedData.reduce((sum, r) => sum + (Number(r[activeMetric.key as keyof typeof r]) || 0), 0) / sortedData.length
                            : 0;
                        const top3 = sortedData.slice(0, 3);
                        const bottom3 = sortedData.slice(-3).reverse();
                        const aboveTarget = sortedData.filter(r => (Number(r[activeMetric.key as keyof typeof r]) || 0) > activeMetric.target).length;

                        return (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                {/* Header with Metric Selector */}
                                <div className="p-5 border-b border-slate-100">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 rounded-xl" style={{ background: `linear-gradient(135deg, ${activeMetric.gradient[0]}, ${activeMetric.gradient[1]})` }}>
                                                <Activity className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-lg">Grafik Prevalensi per {(effectiveRole === "superadmin" && selectedPuskesmas === "ALL") ? "Puskesmas" : "Kelurahan"}</h3>
                                                <p className="text-sm text-slate-500 mt-0.5">Pilih indikator untuk melihat distribusi prevalensi</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-center">
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Rata-rata</p>
                                                <p className="text-xl font-black" style={{ color: activeMetric.gradient[0] }}>{avgValue.toFixed(1)}<span className="text-xs text-slate-400">%</span></p>
                                            </div>
                                            <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
                                            <div className="text-center hidden md:block">
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Target</p>
                                                <p className="text-xl font-black text-slate-600">{activeMetric.target}<span className="text-xs text-slate-400">%</span></p>
                                            </div>
                                            {aboveTarget > 0 && (
                                                <>
                                                    <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
                                                    <div className="text-center hidden md:block">
                                                        <p className="text-[10px] text-rose-400 uppercase tracking-wider font-semibold">Melebihi Target</p>
                                                        <p className="text-xl font-black text-rose-500">{aboveTarget}<span className="text-xs text-slate-400"> wilayah</span></p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Pill Selector */}
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {PREV_METRICS.map(m => (
                                            <button
                                                key={m.id}
                                                onClick={() => setSelectedPrevalenceMetric(m.id)}
                                                className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all duration-200 flex items-center gap-1.5 ${selectedPrevalenceMetric === m.id
                                                        ? 'text-white shadow-md scale-[1.02]'
                                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                                    }`}
                                                style={selectedPrevalenceMetric === m.id ? { background: `linear-gradient(135deg, ${m.gradient[0]}, ${m.gradient[1]})`, borderColor: m.gradient[0] } : {}}
                                            >
                                                <span>{m.emoji}</span>
                                                {m.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Chart + Insights Side by Side */}
                                <div className="flex flex-col lg:flex-row">
                                    {/* Chart Area */}
                                    <div className="flex-1 p-5" style={{ minHeight: 420 }}>
                                        <ResponsiveContainer width="100%" height={400}>
                                            <BarChart data={sortedData} margin={{ top: 25, right: 10, left: 0, bottom: 85 }}>
                                                <defs>
                                                    <linearGradient id="prevBarGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor={activeMetric.gradient[1]} stopOpacity={0.95} />
                                                        <stop offset="100%" stopColor={activeMetric.gradient[0]} stopOpacity={0.85} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis
                                                    dataKey="name"
                                                    interval={0}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={({ x, y, payload }: { x: any; y: any; payload: { value: string } }) => {
                                                        const name = payload.value;
                                                        const abbreviated = name.length > 12
                                                            ? name.split(" ").map((w: string) => w.length > 4 ? w.slice(0, 4) + "." : w).join(" ")
                                                            : name;
                                                        return (
                                                            <g transform={`translate(${x},${y})`}>
                                                                <text x={0} y={0} dy={8} textAnchor="end" fill="#64748b" fontSize={10} fontFamily="'Public Sans', monospace" transform="rotate(-45)">
                                                                    {abbreviated}
                                                                </text>
                                                            </g>
                                                        );
                                                    }}
                                                />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dx={-5} tickFormatter={(v) => `${v}%`} />
                                                <RechartsTooltip
                                                    cursor={{ fill: 'rgba(241,245,249,0.7)', radius: 6 }}
                                                    formatter={(value: any) => [`${Number(value).toFixed(2)}%`, `Prevalensi ${activeMetric.label}`]}
                                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 600 }}
                                                />
                                                <ReferenceLine y={activeMetric.target} stroke="#ef4444" strokeDasharray="6 4" strokeWidth={1.5} label={{ value: `Target: ${activeMetric.target}%`, position: 'right', fill: '#ef4444', fontSize: 11, fontWeight: 700 }} />
                                                <ReferenceLine y={avgValue} stroke={activeMetric.gradient[0]} strokeDasharray="3 3" strokeWidth={1} strokeOpacity={0.5} />
                                                <Bar dataKey={activeMetric.key} fill="url(#prevBarGrad)" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                                    <LabelList position="top" formatter={(val: any) => `${Number(val).toFixed(1)}%`} fill="#475569" fontSize={9} fontWeight={700} dy={-4} />
                                                    {sortedData.map((entry, index) => {
                                                        const val = Number(entry[activeMetric.key as keyof typeof entry]) || 0;
                                                        const isAboveTarget = val > activeMetric.target;
                                                        return <Cell key={`cell-${index}`} fill={isAboveTarget ? activeMetric.gradient[0] : activeMetric.gradient[1]} fillOpacity={isAboveTarget ? 0.95 : 0.7} />;
                                                    })}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Insight Panel */}
                                    <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-slate-100 p-5 bg-slate-50/50 flex flex-col gap-5">
                                        {/* Highest Prevalence (worst) */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="p-1.5 bg-rose-100 rounded-lg">
                                                    <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
                                                </div>
                                                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">3 Prevalensi Tertinggi</h4>
                                            </div>
                                            <div className="space-y-2">
                                                {top3.map((r, i) => (
                                                    <div key={r.name} className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2.5 border border-rose-100 shadow-sm">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white ${i === 0 ? 'bg-rose-500' : i === 1 ? 'bg-rose-400' : 'bg-rose-300'
                                                            }`}>{i + 1}</div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-slate-700 truncate">{r.name}</p>
                                                        </div>
                                                        <span className="text-sm font-black" style={{ color: activeMetric.gradient[0] }}>
                                                            {Number(r[activeMetric.key as keyof typeof r]).toFixed(1)}%
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Lowest Prevalence (best) */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="p-1.5 bg-emerald-100 rounded-lg">
                                                    <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                                                </div>
                                                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">3 Prevalensi Terendah</h4>
                                            </div>
                                            <div className="space-y-2">
                                                {bottom3.map((r, i) => (
                                                    <div key={r.name} className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2.5 border border-emerald-100 shadow-sm">
                                                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-slate-700 truncate">{r.name}</p>
                                                        </div>
                                                        <span className="text-sm font-black text-emerald-600">
                                                            {Number(r[activeMetric.key as keyof typeof r]).toFixed(1)}%
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Quick Stats */}
                                        <div className="mt-auto pt-4 border-t border-slate-200">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-white rounded-xl p-3 border border-slate-100 text-center">
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Tertinggi</p>
                                                    <p className="text-lg font-black" style={{ color: activeMetric.gradient[0] }}>
                                                        {sortedData.length > 0 ? Number(sortedData[0][activeMetric.key as keyof (typeof sortedData)[0]]).toFixed(1) : 0}%
                                                    </p>
                                                </div>
                                                <div className="bg-white rounded-xl p-3 border border-slate-100 text-center">
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Terendah</p>
                                                    <p className="text-lg font-black text-emerald-600">
                                                        {sortedData.length > 0 ? Number(sortedData[sortedData.length - 1][activeMetric.key as keyof (typeof sortedData)[0]]).toFixed(1) : 0}%
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Summary Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800">Rekapitulasi Prevalensi Masalah Gizi</h3>
                        </div>
                        <div className="p-4 bg-sky-50 border-b border-sky-100 flex gap-2">
                            <Info size={16} className="text-sky-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-700">
                                <strong>Catatan Penting:</strong> Nilai outlier yang melebihi target di-highlight dengan warna <span className="text-rose-600 font-bold">merah</span>. Untuk analisis lebih lanjut dan koreksi data, mohon dilakukan pemeriksaan pada Menu Daftar Entry di masing-masing Indikator Balita Gizi.
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4">{(effectiveRole === "superadmin" && selectedPuskesmas === "ALL") ? "Puskesmas" : "Kelurahan"}</th>
                                        <th className="px-6 py-4 text-center">Prev. Stunting (%)</th>
                                        <th className="px-6 py-4 text-center">Prev. Wasting (%)</th>
                                        <th className="px-6 py-4 text-center">Prev. Underweight (%)</th>
                                        <th className="px-6 py-4 text-center">Prev. Overweight (%)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {metricsResult.summaryTable.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map((row) => (
                                        <tr key={row.name} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-3 font-semibold text-slate-800">{row.name}</td>
                                            <td className={`px-6 py-3 text-center font-medium ${row.stunting > TARGETS.Stunting.val ? 'bg-rose-100 text-rose-700' : 'text-slate-600'}`}>
                                                {row.stunting.toFixed(2)}%
                                            </td>
                                            <td className={`px-6 py-3 text-center font-medium ${row.wasting > TARGETS.Wasting.val ? 'bg-rose-100 text-rose-700' : 'text-slate-600'}`}>
                                                {row.wasting.toFixed(2)}%
                                            </td>
                                            <td className={`px-6 py-3 text-center font-medium ${row.underweight > TARGETS.Underweight.val ? 'bg-rose-100 text-rose-700' : 'text-slate-600'}`}>
                                                {row.underweight.toFixed(2)}%
                                            </td>
                                            <td className={`px-6 py-3 text-center font-medium ${row.obesitas > TARGETS.Overweight.val ? 'bg-rose-100 text-rose-700' : 'text-slate-600'}`}>
                                                {row.obesitas.toFixed(2)}%
                                            </td>
                                        </tr>
                                    ))}
                                    {metricsResult.summaryTable.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                                Tidak ada data untuk periode terpilih.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {metricsResult.summaryTable.length > 0 && Math.ceil(metricsResult.summaryTable.length / rowsPerPage) > 1 && (
                            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
                                <span className="text-sm text-slate-500">
                                    Menampilkan {((currentPage - 1) * rowsPerPage) + 1} - {Math.min(currentPage * rowsPerPage, metricsResult.summaryTable.length)} dari {metricsResult.summaryTable.length} data
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Sebelumnya
                                    </button>
                                    <span className="text-sm font-bold text-slate-700 mx-2">
                                        Halaman {currentPage} dari {Math.ceil(metricsResult.summaryTable.length / rowsPerPage)}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(metricsResult.summaryTable.length / rowsPerPage), p + 1))}
                                        disabled={currentPage === Math.ceil(metricsResult.summaryTable.length / rowsPerPage)}
                                        className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Selanjutnya
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
