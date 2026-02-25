"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { calculateAsiMpasiMetrics, AsiMpasiMetricsResult } from "@/lib/asiMpasiHelper";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine } from "recharts";
import { useAuth } from "@/app/dashboard/layout";
import { Info, ChevronDown, Activity, AlertTriangle, CheckCircle2, Table as TableIcon, TrendingUp, TrendingDown, Award } from "lucide-react";

interface FilterState {
    jenisLaporan: "Bulanan" | "Tahunan TW";
    tahun: number;
    bulanTW: number | "ALL";
    puskesmas: string;
    kelurahan: string;
}

export default function AsiMpasiDashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    const effectiveRole = user?.role === "admin_puskesmas" ? "admin_puskesmas" : "superadmin";

    // Options States
    const [puskesmasOptions, setPuskesmasOptions] = useState<{ id: string; name: string }[]>([]);
    const [kelurahanOptions, setKelurahanOptions] = useState<{ id: string; name: string; puskesmas_id: string }[]>([]);

    // Filter States
    const [selectedJenisLaporan, setSelectedJenisLaporan] = useState<"Bulanan" | "Tahunan TW">("Bulanan");
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedMonthOrTW, setSelectedMonthOrTW] = useState<number | "ALL">("ALL");
    const [selectedPuskesmas, setSelectedPuskesmas] = useState<string>("ALL");
    const [selectedKelurahan, setSelectedKelurahan] = useState<string>("ALL");

    const [metricsResult, setMetricsResult] = useState<AsiMpasiMetricsResult | null>(null);

    // UI State
    const [showDefinitions, setShowDefinitions] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedChartMetric, setSelectedChartMetric] = useState<string>('recall_0_5');
    const rowsPerPage = 10;

    // Load filter options (Puskesmas & Desa)
    useEffect(() => {
        const loadOptions = async () => {
            try {
                const { data: pData } = await supabase.from('ref_puskesmas').select('id, nama').order('nama');
                const { data: kData } = await supabase.from('ref_desa').select('id, desa_kel, puskesmas_id').order('desa_kel');
                if (pData) setPuskesmasOptions(pData.filter(d => !d.nama.toLowerCase().includes('dinkes')).map(d => ({ id: d.id.toString(), name: d.nama })));
                if (kData) setKelurahanOptions(kData.map(d => ({ id: d.id.toString(), name: d.desa_kel, puskesmas_id: d.puskesmas_id.toString() })));

                // Set default puskesmas for admin_puskesmas
                if (user?.role === "admin_puskesmas" && user?.puskesmas_id) {
                    setSelectedPuskesmas(user.puskesmas_id.toString());
                }
            } catch (error) {
                console.error("Error loading options", error);
            }
        };
        loadOptions();
    }, [user]);

    // Derived kelurahan options
    const activeKelurahanOptions = React.useMemo(() => {
        if (selectedPuskesmas === "ALL") return kelurahanOptions;
        return kelurahanOptions.filter(k => k.puskesmas_id === selectedPuskesmas);
    }, [kelurahanOptions, selectedPuskesmas]);

    // Ensure selected kelurahan is valid for selected puskesmas
    useEffect(() => {
        if (selectedPuskesmas !== "ALL" && selectedKelurahan !== "ALL") {
            const isValid = kelurahanOptions.find(k => k.id === selectedKelurahan)?.puskesmas_id === selectedPuskesmas;
            if (!isValid) setSelectedKelurahan("ALL");
        }
    }, [selectedPuskesmas, kelurahanOptions, selectedKelurahan]);

    // Data Fetching Logic
    useEffect(() => {
        const fetchData = async () => {
            if (puskesmasOptions.length === 0) return;
            setLoading(true);
            try {
                let currentQuery = supabase.from('data_balita_gizi').select('*').eq('tahun', selectedYear);

                // Role Logic: Apply Dinkes exception (if valid data length > 0 we exclude dinkes later, or just handle in DB. Actually let's assume DB RLS or we exclude puskesmas_id for dinkes)
                // Actually matching DataQualityDashboard logic for "Pengecualian Dinkes" is handle by not selecting it or it doesn't exist in ref_desa.

                if (effectiveRole === "admin_puskesmas") {
                    const pName = puskesmasOptions.find(p => p.id === selectedPuskesmas)?.name;
                    if (pName) currentQuery = currentQuery.eq('puskesmas', pName);

                    if (selectedKelurahan !== "ALL") {
                        const kName = kelurahanOptions.find(k => k.id === selectedKelurahan)?.name;
                        if (kName) currentQuery = currentQuery.eq('kelurahan', kName);
                    }
                } else if (effectiveRole === "superadmin") {
                    if (selectedPuskesmas !== "ALL") {
                        const pName = puskesmasOptions.find(p => p.id === selectedPuskesmas)?.name;
                        if (pName) currentQuery = currentQuery.eq('puskesmas', pName);

                        if (selectedKelurahan !== "ALL") {
                            const kName = kelurahanOptions.find(k => k.id === selectedKelurahan)?.name;
                            if (kName) currentQuery = currentQuery.eq('kelurahan', kName);
                        }
                    }
                }

                if (selectedMonthOrTW !== "ALL") {
                    if (selectedJenisLaporan === "Bulanan") {
                        currentQuery = currentQuery.eq('bulan', selectedMonthOrTW);
                    } else if (selectedJenisLaporan === "Tahunan TW") {
                        const twNum = Number(selectedMonthOrTW);
                        const monthMap: Record<number, number[]> = {
                            1: [1, 2, 3],
                            2: [1, 2, 3, 4, 5, 6],
                            3: [1, 2, 3, 4, 5, 6, 7, 8, 9],
                            4: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
                        };
                        const monthsToInclude = monthMap[twNum] || [];
                        currentQuery = currentQuery.in('bulan', monthsToInclude);
                    }
                }

                const fetchAllPages = async (query: any) => {
                    let allData: any[] = [];
                    let page = 0;
                    const pageSize = 1000;
                    let hasMore = true;
                    while (hasMore) {
                        const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
                        if (error) throw error;
                        if (data && data.length > 0) {
                            allData = [...allData, ...data];
                            page++;
                            if (data.length < pageSize) hasMore = false;
                        } else {
                            hasMore = false;
                        }
                    }
                    return allData;
                };

                const data = await fetchAllPages(currentQuery);
                const groupingRole = (effectiveRole === "superadmin" && selectedPuskesmas === "ALL") ? "superadmin" : "admin_puskesmas";
                const metrics = calculateAsiMpasiMetrics(data, groupingRole, selectedMonthOrTW);
                setMetricsResult(metrics);
            } catch (error) {
                console.error("Failed to fetch ASI MPASI data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [
        selectedJenisLaporan, selectedYear, selectedMonthOrTW,
        selectedPuskesmas, selectedKelurahan,
        puskesmasOptions.length, kelurahanOptions.length, effectiveRole
    ]);

    if (loading || !metricsResult) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium animate-pulse">Memuat Data ASI & MPASI...</p>
            </div>
        );
    }

    const { overallMetrics, summaryTable } = metricsResult;
    const groupingRole = (effectiveRole === "superadmin" && selectedPuskesmas === "ALL") ? "superadmin" : "admin_puskesmas";
    const totalPages = Math.ceil(summaryTable.length / rowsPerPage);

    // Metrics array for mapping cards and charts
    const metricCards = [
        { id: 'imd', title: '% Bayi Mendapat IMD', val: overallMetrics.imd, color: 'emerald' },
        { id: 'recall_0_5', title: '% Bayi 0-5 Bln Di-recall', val: overallMetrics.recall_0_5, color: 'teal' },
        { id: 'asi_0_5', title: '% Bayi 0-5 Bln ASI Eksklusif', val: overallMetrics.asi_0_5, color: 'cyan' },
        { id: 'asi_6', title: '% Bayi ASI Eksklusif s/d 6 Bln', val: overallMetrics.asi_6, color: 'blue' },
        { id: 'wawancara_6_23', title: '% Anak 6-23 Bln Diwawancarai', val: overallMetrics.wawancara_6_23, color: 'indigo' },
        { id: 'mpasi_5_8', title: '% MPASI 5 dari 8 Kelompok', val: overallMetrics.mpasi_5_8, color: 'violet' },
        { id: 'mpasi_telur_ikan_daging', title: '% MPASI Telur/Ikan/Daging', val: overallMetrics.mpasi_telur_ikan_daging, color: 'purple' },
        { id: 'mpasi_baik', title: '% MPASI Baik', val: overallMetrics.mpasi_baik, color: 'fuchsia' },
    ];

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pilih Periode Laporan</label>
                    <div className="flex gap-2">
                        <select
                            value={selectedJenisLaporan}
                            onChange={(e) => {
                                setSelectedJenisLaporan(e.target.value as "Bulanan" | "Tahunan TW");
                                setSelectedMonthOrTW(e.target.value === "Bulanan" ? 2 : 1);
                            }}
                            className="w-1/3 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none transition-all"
                        >
                            <option value="Bulanan">Bulanan</option>
                            <option value="Tahunan TW">Triwulanan</option>
                        </select>
                        <select
                            value={selectedMonthOrTW}
                            onChange={(e) => setSelectedMonthOrTW(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                            className="w-2/3 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none transition-all"
                        >
                            {selectedJenisLaporan === "Bulanan" ? (
                                <>
                                    <option value="ALL">Semua Bulan</option>
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
                                    <option value="ALL">Semua Triwulan</option>
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
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 outline-none transition-all"
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
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 outline-none transition-all"
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
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 outline-none transition-all"
                    >
                        <option value="ALL">Semua Desa/Kelurahan</option>
                        {activeKelurahanOptions.map((k) => (
                            <option key={k.id} value={k.id}>{k.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Definitions Accordion */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <button
                    onClick={() => setShowDefinitions(!showDefinitions)}
                    className="w-full px-6 py-4 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Info className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold text-slate-800 text-left">Definisi Operasional & Formula ASI - MPASI</h3>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${showDefinitions ? 'rotate-180' : ''}`} />
                </button>

                {showDefinitions && (
                    <div className="p-6 border-t border-slate-200 space-y-6 bg-white overflow-x-auto text-sm text-slate-700 leading-relaxed">

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h4 className="font-bold text-slate-800 mb-2">1. Persentase Bayi Usia Kurang dari 6 Bulan Mendapat ASI Eksklusif</h4>
                            <p className="mb-3 border-l-4 border-indigo-400 pl-3">Persentase bayi usia 0-5 bulan yang diberikan ASI saja. Pencatatan by recall 24 jam.</p>
                            <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto">
                                <span className="font-semibold whitespace-nowrap">Formula =</span>
                                <div className="flex flex-col items-center">
                                    <span className="border-b border-slate-800 px-2 pb-1 whitespace-nowrap text-center text-xs">Jml bayi 0-5 bulan dapat ASI Eksklusif (Recall 24 jam)</span>
                                    <span className="px-2 pt-1 whitespace-nowrap text-center text-xs">Jml bayi 0-5 bulan yang direcall 24 jam</span>
                                </div>
                                <span className="font-semibold whitespace-nowrap">× 100%</span>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h4 className="font-bold text-slate-800 mb-2">2. Persentase Bayi Usia 6 Bulan Mendapatkan ASI Eksklusif</h4>
                            <p className="mb-3 border-l-4 border-indigo-400 pl-3">Bayi usia 6 bulan yang dari lahir sampai 5 bulan 29 hari <b>hanya</b> diberikan ASI saja.</p>
                            <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto">
                                <span className="font-semibold whitespace-nowrap">Formula =</span>
                                <div className="flex flex-col items-center">
                                    <span className="border-b border-slate-800 px-2 pb-1 whitespace-nowrap text-center text-xs">Jml bayi 6 bln dapat ASI Eksklusif</span>
                                    <span className="px-2 pt-1 whitespace-nowrap text-center text-xs">Jml sasaran bayi 6 bulan di wilayah tsb</span>
                                </div>
                                <span className="font-semibold whitespace-nowrap">× 100%</span>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h4 className="font-bold text-slate-800 mb-2">3. Persentase Anak Usia 6 - 23 Bulan Mendapat MPASI (5 dari 8 Kelompok)</h4>
                            <p className="mb-3 border-l-4 border-indigo-400 pl-3">Mengkonsumsi min 5 dari 8 jenis: 1. ASI, 2. Pokok, 3. Kacang, 4. Susu, 5. Daging, 6. Telur, 7. Sayur Vit A, 8. Buah/Sayur lainnya.</p>
                            <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto">
                                <span className="font-semibold whitespace-nowrap">Formula =</span>
                                <div className="flex flex-col items-center">
                                    <span className="border-b border-slate-800 px-2 pb-1 whitespace-nowrap text-center text-xs">Jml anak 6-23 bln konsumsi ≥5 dari 8 kelompok mkn</span>
                                    <span className="px-2 pt-1 whitespace-nowrap text-center text-xs">Jml anak 6-23 bln yang diwawancarai</span>
                                </div>
                                <span className="font-semibold whitespace-nowrap">× 100%</span>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h4 className="font-bold text-slate-800 mb-2">4. Persentase Anak Usia 6 - 23 Bulan Mengonsumsi Telur, Ikan dan/atau Daging</h4>
                            <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto">
                                <span className="font-semibold whitespace-nowrap">Formula =</span>
                                <div className="flex flex-col items-center">
                                    <span className="border-b border-slate-800 px-2 pb-1 whitespace-nowrap text-center text-xs">Jml anak 6-23 bln konsumsi telur/ikan/daging</span>
                                    <span className="px-2 pt-1 whitespace-nowrap text-center text-xs">Jml anak 6-23 bln yang diwawancarai</span>
                                </div>
                                <span className="font-semibold whitespace-nowrap">× 100%</span>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h4 className="font-bold text-slate-800 mb-2">5. Persentase Anak Usia 6 - 23 Bulan Mendapat MPASI Baik</h4>
                            <p className="mb-3 border-l-4 border-indigo-400 pl-3">Mengkonsumsi 5 dari 8 kelompok <b>DAN</b> mengkonsumsi telur, ikan, daging.</p>
                            <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto">
                                <span className="font-semibold whitespace-nowrap">Formula =</span>
                                <div className="flex flex-col items-center">
                                    <span className="border-b border-slate-800 px-2 pb-1 whitespace-nowrap text-center text-xs">Jml anak 6-23 bln mendapat MPASI Baik</span>
                                    <span className="px-2 pt-1 whitespace-nowrap text-center text-xs">Jml anak 6-23 bln yang diwawancarai</span>
                                </div>
                                <span className="font-semibold whitespace-nowrap">× 100%</span>
                            </div>
                        </div>

                        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 flex gap-3 text-amber-800">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <p><strong>Catatan Agregasi Triwulanan:</strong> Capaian ASI dihitung dengan cara dijumlah (SUM) dalam rentang bulan. Sedangkan Capaian MPASI dihitung dengan nilai Rata-Rata bulan yang bersangkutan per Triwulan.</p>
                        </div>

                    </div>
                )}
            </div>

            {/* Scorecards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metricCards.map(metric => (
                    <div key={metric.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <h4 className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-2">{metric.title}</h4>
                        {metric.id === "imd" && (!metric.val || metric.val === 0) ? (
                            <div className="text-sm font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg inline-block self-start mt-2 border border-amber-200">
                                Masih Proses Integrasi
                            </div>
                        ) : (
                            <div className="flex items-end gap-2">
                                <span className={`text-3xl font-black text-${metric.color}-600`}>
                                    {metric.val.toFixed(2)}<span className="text-lg text-slate-400">%</span>
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* ── Unified Chart with Metric Selector ── */}
            {(() => {
                const CHART_METRICS = [
                    { id: 'recall_0_5', label: 'Recall 0-5 Bln', key: 'recall_rate', gradient: ['#0d9488', '#14b8a6'], emoji: '📋' },
                    { id: 'asi_0_5', label: 'ASI Ekskl. 0-5 Bln', key: 'asi_0_5_rate', gradient: ['#0891b2', '#06b6d4'], emoji: '🤱' },
                    { id: 'asi_6', label: 'ASI Ekskl. 6 Bln', key: 'asi_6_rate', gradient: ['#2563eb', '#3b82f6'], emoji: '💧' },
                    { id: 'wawancara_6_23', label: 'Wawancara 6-23 Bln', key: 'wawancara_rate', gradient: ['#4f46e5', '#6366f1'], emoji: '🎤' },
                    { id: 'mpasi_5_8', label: 'MPASI 5 Kelompok', key: 'mpasi_5_8_rate', gradient: ['#7c3aed', '#8b5cf6'], emoji: '🥣' },
                    { id: 'mpasi_telur_ikan_daging', label: 'Telur/Ikan/Daging', key: 'mpasi_telur_rate', gradient: ['#9333ea', '#a855f7'], emoji: '🍗' },
                    { id: 'mpasi_baik', label: 'MPASI Baik', key: 'mpasi_baik_rate', gradient: ['#c026d3', '#d946ef'], emoji: '✅' },
                ];

                const activeMetric = CHART_METRICS.find(m => m.id === selectedChartMetric) || CHART_METRICS[0];
                const sortedData = [...summaryTable].sort((a, b) => {
                    const valA = Number(a[activeMetric.key as keyof typeof a]) || 0;
                    const valB = Number(b[activeMetric.key as keyof typeof b]) || 0;
                    return valB - valA;
                });
                const avgValue = sortedData.length > 0
                    ? sortedData.reduce((sum, r) => sum + (Number(r[activeMetric.key as keyof typeof r]) || 0), 0) / sortedData.length
                    : 0;
                const top3 = sortedData.slice(0, 3);
                const bottom3 = sortedData.slice(-3).reverse();

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
                                        <h3 className="font-bold text-slate-800 text-lg">Grafik Capaian per {groupingRole === "superadmin" ? "Puskesmas" : "Kelurahan"}</h3>
                                        <p className="text-sm text-slate-500 mt-0.5">Pilih indikator untuk melihat distribusi capaian</p>
                                    </div>
                                </div>
                                <div className="text-right hidden md:block">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Rata-rata</p>
                                    <p className="text-2xl font-black" style={{ color: activeMetric.gradient[0] }}>{avgValue.toFixed(1)}<span className="text-sm text-slate-400">%</span></p>
                                </div>
                            </div>

                            {/* Pill Selector */}
                            <div className="flex flex-wrap gap-2 mt-4">
                                {CHART_METRICS.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setSelectedChartMetric(m.id)}
                                        className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition-all duration-200 flex items-center gap-1.5 ${selectedChartMetric === m.id
                                            ? 'text-white shadow-md scale-[1.02]'
                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                            }`}
                                        style={selectedChartMetric === m.id ? { background: `linear-gradient(135deg, ${m.gradient[0]}, ${m.gradient[1]})`, borderColor: m.gradient[0] } : {}}
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
                                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
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
                                            formatter={(value: any) => [`${Number(value).toFixed(2)}%`, activeMetric.label]}
                                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 600 }}
                                        />
                                        <ReferenceLine y={avgValue} stroke={activeMetric.gradient[0]} strokeDasharray="6 4" strokeWidth={1.5} label={{ value: `Avg: ${avgValue.toFixed(1)}%`, position: 'right', fill: activeMetric.gradient[0], fontSize: 11, fontWeight: 700 }} />
                                        <Bar dataKey={activeMetric.key} fill="url(#barGradient)" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                            <LabelList position="top" formatter={(val: any) => `${Number(val).toFixed(1)}%`} fill="#475569" fontSize={9} fontWeight={700} dy={-4} />
                                            {sortedData.map((entry, index) => {
                                                const val = Number(entry[activeMetric.key as keyof typeof entry]) || 0;
                                                const isAboveAvg = val >= avgValue;
                                                return <Cell key={`cell-${index}`} fill={isAboveAvg ? activeMetric.gradient[1] : '#cbd5e1'} fillOpacity={isAboveAvg ? 0.9 : 0.6} />;
                                            })}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Insight Panel */}
                            <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-slate-100 p-5 bg-slate-50/50 flex flex-col gap-5">
                                {/* Top Performers */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-1.5 bg-emerald-100 rounded-lg">
                                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                                        </div>
                                        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Top 3 Tertinggi</h4>
                                    </div>
                                    <div className="space-y-2">
                                        {top3.map((r, i) => (
                                            <div key={r.name} className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2.5 border border-slate-100 shadow-sm">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : 'bg-orange-400'
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

                                {/* Bottom Performers */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-1.5 bg-rose-100 rounded-lg">
                                            <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                                        </div>
                                        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">3 Terendah</h4>
                                    </div>
                                    <div className="space-y-2">
                                        {bottom3.map((r, i) => (
                                            <div key={r.name} className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2.5 border border-rose-100 shadow-sm">
                                                <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center">
                                                    <TrendingDown className="w-3 h-3 text-rose-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-slate-700 truncate">{r.name}</p>
                                                </div>
                                                <span className="text-sm font-black text-rose-500">
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
                                            <p className="text-lg font-black text-rose-500">
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

            {/* Comprehensive Data Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 rounded-xl">
                            <TableIcon className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Detail Rekapitulasi ASI Eksklusif & MPASI</h3>
                            <p className="text-sm text-slate-500 mt-1">Data agregat level {groupingRole === 'superadmin' ? 'Puskesmas' : 'Desa'}</p>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left align-middle min-w-[1000px]">
                        <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-y border-slate-200">
                            <tr>
                                <th className="px-6 py-4">{groupingRole === "superadmin" ? "Puskesmas" : "Kelurahan"}</th>
                                <th className="px-6 py-4 text-center">Recall 0-5 Bln</th>
                                <th className="px-6 py-4 text-center">ASI Eksklusif 0-5 Bln</th>
                                <th className="px-6 py-4 text-center">ASI Eksklusif 6 Bln</th>
                                <th className="px-6 py-4 text-center">Diwawancarai 6-23 Bln</th>
                                <th className="px-6 py-4 text-center">MPASI 5 Kelompok</th>
                                <th className="px-6 py-4 text-center">MPASI Telur/Ikan</th>
                                <th className="px-6 py-4 text-center">MPASI Baik</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(() => {
                                // Year-based targets
                                const MPASI_TARGETS: Record<number, number> = { 2025: 73, 2026: 76, 2027: 79, 2028: 82, 2029: 85 };
                                const ASI_05_TARGETS: Record<number, number> = { 2025: 73, 2026: 76, 2027: 79, 2028: 82, 2029: 85 };
                                const ASI_6_TARGETS: Record<number, number> = { 2025: 61, 2026: 64, 2027: 67, 2028: 70, 2029: 73 };
                                const RECALL_TARGET = 80;
                                const WAWANCARA_TARGET = 80;
                                const mpasiTarget = MPASI_TARGETS[selectedYear] || 73;
                                const asi05Target = ASI_05_TARGETS[selectedYear] || 73;
                                const asi6Target = ASI_6_TARGETS[selectedYear] || 61;

                                const deficitCell = (val: number, target: number) => {
                                    const below = val > 0 && val < target;
                                    return (
                                        <td className={`px-6 py-4 text-center font-medium ${below ? 'text-red-600 bg-red-50 font-bold' : 'text-slate-700'}`}>
                                            {val.toFixed(2)}%{below && <span className="ml-1 text-[10px]">▼</span>}
                                        </td>
                                    );
                                };

                                return summaryTable.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map((row) => (
                                    <tr key={row.name} className="hover:bg-slate-50 border-b border-slate-100 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-slate-800">{row.name}</td>
                                        {deficitCell(row.recall_rate, RECALL_TARGET)}
                                        {deficitCell(row.asi_0_5_rate, asi05Target)}
                                        {deficitCell(row.asi_6_rate, asi6Target)}
                                        {deficitCell(row.wawancara_rate, WAWANCARA_TARGET)}
                                        {deficitCell(row.mpasi_5_8_rate, mpasiTarget)}
                                        {deficitCell(row.mpasi_telur_rate, mpasiTarget)}
                                        {deficitCell(row.mpasi_baik_rate, mpasiTarget)}
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-slate-50">
                        <span className="text-sm text-slate-500">
                            Halaman <span className="font-semibold text-slate-700">{currentPage}</span> dari <span className="font-semibold text-slate-700">{totalPages}</span>
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Sebelumnya
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Selanjutnya
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
