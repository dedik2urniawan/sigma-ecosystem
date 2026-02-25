"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { calculateSuplemenMetrics, SuplemenMetricsResult, SUPLEMEN_COLUMNS, VisibleCard } from "@/lib/suplemenHelper";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine } from "recharts";
import { useAuth } from "@/app/dashboard/layout";
import { Info, ChevronDown, Activity, AlertTriangle, CheckCircle2, Table as TableIcon, TrendingUp, TrendingDown, Pill } from "lucide-react";

interface FilterState {
    jenisLaporan: "Bulanan" | "Tahunan TW";
    monthOrTW: number;
    year: string;
    puskesmas: string;
    kelurahan: string;
}

export default function SuplemenDashboard() {
    const { user } = useAuth();
    const effectiveRole = user?.role === "admin_puskesmas" ? "admin_puskesmas" : "superadmin";

    // Filters
    const [selectedJenisLaporan, setSelectedJenisLaporan] = useState<"Bulanan" | "Tahunan TW">("Bulanan");
    const [selectedMonthOrTW, setSelectedMonthOrTW] = useState(2);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [selectedPuskesmas, setSelectedPuskesmas] = useState(
        effectiveRole === "admin_puskesmas" && user?.puskesmas_id ? user.puskesmas_id : "ALL"
    );
    const [selectedKelurahan, setSelectedKelurahan] = useState("ALL");

    // Options
    const [puskesmasOptions, setPuskesmasOptions] = useState<{ id: string; name: string }[]>([]);
    const [kelurahanOptions, setKelurahanOptions] = useState<{ id: string; name: string; puskesmas_id: string }[]>([]);

    // Data
    const [metricsResult, setMetricsResult] = useState<SuplemenMetricsResult | null>(null);
    const [loading, setLoading] = useState(true);

    // UI State
    const [showDefinitions, setShowDefinitions] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedChartMetric, setSelectedChartMetric] = useState<string>('vit_a_6_11_feb');
    const rowsPerPage = 10;

    // Load filter options
    useEffect(() => {
        async function loadOptions() {
            const { data: pData } = await supabase.from('ref_puskesmas').select('id, nama').order('nama');
            const { data: kData } = await supabase.from('ref_desa').select('id, desa_kel, puskesmas_id').order('desa_kel');
            if (pData) setPuskesmasOptions(pData.filter(d => !d.nama.toLowerCase().includes('dinkes')).map(d => ({ id: d.id.toString(), name: d.nama })));
            if (kData) setKelurahanOptions(kData.map(d => ({ id: d.id.toString(), name: d.desa_kel, puskesmas_id: d.puskesmas_id.toString() })));
        }
        loadOptions();
    }, []);

    // Fetch data
    useEffect(() => {
        if (puskesmasOptions.length === 0) return;

        async function fetchData() {
            setLoading(true);
            try {
                const year = Number(selectedYear);

                // We always need Feb and Aug data for Vitamin A, plus the selected month for Suplemen
                // Determine which months to fetch
                let monthsToFetch: number[] = [2, 8]; // always need Feb & Aug
                if (selectedJenisLaporan === "Bulanan") {
                    monthsToFetch.push(selectedMonthOrTW);
                } else {
                    // TW: also need the TW-end month for suplemen
                    const twMonths: Record<number, number> = { 1: 3, 2: 6, 3: 9, 4: 12 };
                    monthsToFetch.push(twMonths[selectedMonthOrTW] || 12);
                }
                // Deduplicate
                monthsToFetch = [...new Set(monthsToFetch)];

                // Build query
                const selectCols = ["kelurahan", "puskesmas", "bulan", "tahun", ...SUPLEMEN_COLUMNS].join(", ");
                let query = supabase.from("data_balita_gizi").select(selectCols)
                    .eq("tahun", year)
                    .in("bulan", monthsToFetch);

                // RBAC filter
                if (selectedPuskesmas !== "ALL") {
                    const pName = puskesmasOptions.find(p => p.id === selectedPuskesmas)?.name;
                    if (pName) query = query.eq("puskesmas", pName);
                }

                if (selectedKelurahan !== "ALL") {
                    const kName = kelurahanOptions.find(k => k.id === selectedKelurahan)?.name;
                    if (kName) query = query.eq("kelurahan", kName);
                }

                // Fetch all pages
                let allData: any[] = [];
                let from = 0;
                const step = 1000;
                while (true) {
                    const { data, error } = await query.range(from, from + step - 1);
                    if (error) throw error;
                    if (!data || data.length === 0) break;
                    allData = allData.concat(data);
                    if (data.length < step) break;
                    from += step;
                    // Rebuild query for next page
                    query = supabase.from("data_balita_gizi").select(selectCols)
                        .eq("tahun", year)
                        .in("bulan", monthsToFetch);
                    if (selectedPuskesmas !== "ALL") {
                        const pName = puskesmasOptions.find(p => p.id === selectedPuskesmas)?.name;
                        if (pName) query = query.eq("puskesmas", pName);
                    }
                    if (selectedKelurahan !== "ALL") {
                        const kName = kelurahanOptions.find(k => k.id === selectedKelurahan)?.name;
                        if (kName) query = query.eq("kelurahan", kName);
                    }
                }

                const groupingRole = (effectiveRole === "superadmin" && selectedPuskesmas === "ALL") ? "superadmin" : "admin_puskesmas";
                const result = calculateSuplemenMetrics(allData, groupingRole, selectedJenisLaporan, selectedMonthOrTW);
                setMetricsResult(result);

                // Set default chart metric based on visible cards
                if (result.visibleCards.length > 0) {
                    const firstChart = result.visibleCards.find(c => c.id !== 'program_belum');
                    if (firstChart) setSelectedChartMetric(firstChart.id);
                }
            } catch (err) {
                console.error("SuplemenDashboard fetch error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [puskesmasOptions.length, kelurahanOptions.length, selectedJenisLaporan, selectedMonthOrTW, selectedYear, selectedPuskesmas, selectedKelurahan, effectiveRole]);

    useEffect(() => { setCurrentPage(1); }, [metricsResult]);

    // Loading
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium animate-pulse">Memuat data suplementasi...</p>
            </div>
        );
    }

    if (!metricsResult) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                <p className="text-amber-800 font-semibold">Data tidak tersedia untuk periode yang dipilih.</p>
            </div>
        );
    }

    const { summaryTable, visibleCards } = metricsResult;
    const groupingRole = (effectiveRole === "superadmin" && selectedPuskesmas === "ALL") ? "superadmin" : "admin_puskesmas";
    const totalPages = Math.ceil(summaryTable.length / rowsPerPage);

    // Year-based Vitamin A targets
    const VIT_A_TARGETS: Record<string, number> = { '2025': 91, '2026': 92, '2027': 93, '2028': 94, '2029': 95 };
    const vitATarget = VIT_A_TARGETS[selectedYear] || 91;

    // Filtered kelurahan options
    const filteredKelurahan = selectedPuskesmas === "ALL"
        ? kelurahanOptions
        : kelurahanOptions.filter(k => k.puskesmas_id === selectedPuskesmas);

    // Chart metrics config — maps card ids to summary table keys
    const CHART_METRICS = [
        { id: 'vit_a_6_11_feb', label: 'Vit.A 6-11 Bln (Feb)', key: 'vit_a_6_11_feb_rate', gradient: ['#ea580c', '#f97316'], emoji: '💊' },
        { id: 'vit_a_12_59_feb', label: 'Vit.A 12-59 Bln (Feb)', key: 'vit_a_12_59_feb_rate', gradient: ['#d97706', '#f59e0b'], emoji: '🧡' },
        { id: 'vit_a_6_11_aug', label: 'Vit.A 6-11 Bln (Agu)', key: 'vit_a_6_11_aug_rate', gradient: ['#0d9488', '#14b8a6'], emoji: '💚' },
        { id: 'vit_a_12_59_aug', label: 'Vit.A 12-59 Bln (Agu)', key: 'vit_a_12_59_aug_rate', gradient: ['#0891b2', '#06b6d4'], emoji: '🩵' },
        { id: 'vit_a_6_11_tahunan', label: 'Vit.A 6-11 Tahunan', key: 'vit_a_6_11_tahunan_rate', gradient: ['#2563eb', '#3b82f6'], emoji: '📅' },
        { id: 'vit_a_12_59_tahunan', label: 'Vit.A 12-59 Tahunan', key: 'vit_a_12_59_tahunan_rate', gradient: ['#4f46e5', '#6366f1'], emoji: '📆' },
        { id: 'vit_a_2x', label: 'Vit.A 2× Setahun', key: 'vit_a_2x_rate', gradient: ['#7c3aed', '#8b5cf6'], emoji: '✌️' },
        { id: 'suplemen_mikro', label: 'Suplemen Mikro', key: 'suplemen_mikro_rate', gradient: ['#be185d', '#ec4899'], emoji: '🧬' },
    ];

    // Only show chart metrics that are in visible cards (exclude program_belum)
    const chartableMetrics = CHART_METRICS.filter(m => visibleCards.some(c => c.id === m.id));

    return (
        <div className="space-y-6 min-w-0" style={{ overflowX: 'hidden' }}>
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
                            className="w-1/3 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-teal-500 focus:border-teal-500 block p-2.5 outline-none transition-all"
                        >
                            <option value="Bulanan">Bulanan</option>
                            <option value="Tahunan TW">Triwulanan</option>
                        </select>
                        <select
                            value={selectedMonthOrTW}
                            onChange={(e) => setSelectedMonthOrTW(Number(e.target.value))}
                            className="w-2/3 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-teal-500 focus:border-teal-500 block p-2.5 outline-none transition-all"
                        >
                            {selectedJenisLaporan === "Bulanan" ? (
                                <>
                                    <option value={1}>Januari</option><option value={2}>Februari</option>
                                    <option value={3}>Maret</option><option value={4}>April</option>
                                    <option value={5}>Mei</option><option value={6}>Juni</option>
                                    <option value={7}>Juli</option><option value={8}>Agustus</option>
                                    <option value={9}>September</option><option value={10}>Oktober</option>
                                    <option value={11}>November</option><option value={12}>Desember</option>
                                </>
                            ) : (
                                <>
                                    <option value={1}>Triwulan 1 (Jan - Mar)</option>
                                    <option value={2}>Triwulan 2 (Apr - Jun)</option>
                                    <option value={3}>Triwulan 3 (Jul - Sep)</option>
                                    <option value={4}>Triwulan 4 (Okt - Des)</option>
                                </>
                            )}
                        </select>
                    </div>
                </div>

                <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tahun</label>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-teal-500 focus:border-teal-500 block p-2.5 outline-none"
                    >
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                    </select>
                </div>

                {effectiveRole === "superadmin" && (
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Puskesmas</label>
                        <select
                            value={selectedPuskesmas}
                            onChange={(e) => { setSelectedPuskesmas(e.target.value); setSelectedKelurahan("ALL"); }}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-teal-500 focus:border-teal-500 block p-2.5 outline-none"
                        >
                            <option value="ALL">Semua Puskesmas</option>
                            {puskesmasOptions.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {(effectiveRole === "admin_puskesmas" || selectedPuskesmas !== "ALL") && (
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kelurahan</label>
                        <select
                            value={selectedKelurahan}
                            onChange={(e) => setSelectedKelurahan(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-teal-500 focus:border-teal-500 block p-2.5 outline-none"
                        >
                            <option value="ALL">Semua Kelurahan</option>
                            {filteredKelurahan.map(k => (
                                <option key={k.id} value={k.id}>{k.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Definisi Operasional (Expandable) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <button
                    onClick={() => setShowDefinitions(!showDefinitions)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-50 rounded-xl">
                            <Info className="w-5 h-5 text-teal-600" />
                        </div>
                        <span className="font-bold text-slate-800">Definisi Operasional Indikator</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showDefinitions ? 'rotate-180' : ''}`} />
                </button>
                {showDefinitions && (
                    <div className="p-5 border-t border-slate-100 space-y-5 text-sm text-slate-700">
                        {/* Definition 1 */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h4 className="font-bold text-slate-800 mb-2">1. Cakupan Suplementasi Vitamin A Balita 6-59 Bulan</h4>
                            <p className="mb-3 border-l-4 border-orange-400 pl-3">Persentase balita usia 6-59 bulan mendapat suplementasi kapsul vitamin A sesuai dosis usianya.</p>
                            <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto">
                                <span className="font-semibold whitespace-nowrap">Formula =</span>
                                <div className="flex flex-col items-center">
                                    <span className="border-b border-slate-800 px-2 pb-1 whitespace-nowrap text-center text-xs">Jml balita 6-59 bln mendapat suplementasi kapsul vitamin A sesuai dosis usia</span>
                                    <span className="px-2 pt-1 whitespace-nowrap text-center text-xs">Jml seluruh sasaran balita usia 6-59 bulan</span>
                                </div>
                                <span className="font-semibold whitespace-nowrap">× 100%</span>
                            </div>
                            <p className="mt-3 text-xs text-slate-500"><strong>Sumber Data:</strong> Sigizi Kesga. Pencatatan dilakukan setiap pemberian vitamin A (bulan Februari dan Agustus) sesuai kelompok usia.</p>
                        </div>

                        {/* Definition 2 */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h4 className="font-bold text-slate-800 mb-2">2. Cakupan Balita 12-59 Bulan Mendapat Vitamin A 2× Setahun</h4>
                            <p className="mb-3 border-l-4 border-violet-400 pl-3">Persentase balita usia 12-59 bulan mendapat suplementasi vitamin A 2 kali dalam 1 tahun program berjalan.</p>
                            <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto">
                                <span className="font-semibold whitespace-nowrap">Formula =</span>
                                <div className="flex flex-col items-center">
                                    <span className="border-b border-slate-800 px-2 pb-1 whitespace-nowrap text-center text-xs">Jml balita 12-59 bln mendapat suplementasi vitamin A 2 kali dalam setahun</span>
                                    <span className="px-2 pt-1 whitespace-nowrap text-center text-xs">Jml seluruh sasaran balita usia 12-59 bulan</span>
                                </div>
                                <span className="font-semibold whitespace-nowrap">× 100%</span>
                            </div>
                            <p className="mt-3 text-xs text-slate-500"><strong>Sumber Data:</strong> Sigizi Kesga. Pelaporan pada bulan Agustus sebagai akhir periode program vitamin A tahunan.</p>
                        </div>

                        {/* Definition 3 */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h4 className="font-bold text-slate-800 mb-2">3. Jumlah Balita Mendapatkan Suplementasi Gizi Mikro</h4>
                            <p className="mb-3 border-l-4 border-rose-400 pl-3">Jumlah balita usia 6-59 bulan dengan kategori <em>underweight</em> (BB/U Z-score &lt; -2 SD) dan <strong>tidak</strong> termasuk <em>wasting</em> (BB/PB atau BB/TB Z-score &lt; -2 SD) yang mendapat taburia.</p>
                            <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto">
                                <span className="font-semibold whitespace-nowrap">Formula =</span>
                                <div className="flex flex-col items-center">
                                    <span className="border-b border-slate-800 px-2 pb-1 whitespace-nowrap text-center text-xs">Jml balita underweight mendapat suplementasi gizi mikro</span>
                                    <span className="px-2 pt-1 whitespace-nowrap text-center text-xs">Jml balita underweight sasaran suplemen</span>
                                </div>
                                <span className="font-semibold whitespace-nowrap">× 100%</span>
                            </div>
                            <p className="mt-3 text-xs text-slate-500"><strong>Sumber Data:</strong> Sigizi Kesga. Pencatatan setiap waktu pemberian. Rekapitulasi bulanan secara kumulatif. Laporan tahunan berdasarkan data bulan Desember.</p>
                        </div>

                        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 flex gap-3 text-amber-800">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <p><strong>Catatan Agregasi:</strong> Program Vitamin A dilaksanakan pada bulan Februari dan Agustus. Laporan Tahunan untuk usia 6-11 bulan diperoleh dari penjumlahan Februari + Agustus, sedangkan usia 12-59 bulan dihitung dari data Agustus saja.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Score Cards — 3-column grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {visibleCards.map(card => (
                    <div key={card.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <h4 className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider mb-1 leading-tight">{card.title}</h4>
                        {card.subtitle && (
                            <p className="text-[10px] text-indigo-500 font-medium italic mb-2">({card.subtitle})</p>
                        )}
                        {card.id === "program_belum" ? (
                            <div className="text-sm font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg inline-block self-start mt-2 border border-amber-200">
                                Belum Dilaksanakan
                            </div>
                        ) : (
                            <div className="flex items-end gap-2 mt-auto">
                                <span className={`text-2xl font-black text-${card.color}-600`}>
                                    {card.val.toFixed(2)}<span className="text-base text-slate-400">%</span>
                                </span>
                                {card.id !== 'suplemen_mikro' && card.id !== 'program_belum' && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${card.val >= vitATarget
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                        : 'bg-red-50 text-red-600 border border-red-200'
                                        }`}>
                                        Target: {vitATarget}%
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* ── Unified Chart with Metric Selector ── */}
            {chartableMetrics.length > 0 && (() => {
                const activeMetric = chartableMetrics.find(m => m.id === selectedChartMetric) || chartableMetrics[0];
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
                        {/* Header */}
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
                                {chartableMetrics.map(m => (
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

                        {/* Chart + Insights */}
                        <div className="flex flex-col lg:flex-row">
                            {/* Chart */}
                            <div className="flex-1 p-5" style={{ minHeight: 420 }}>
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={sortedData} margin={{ top: 25, right: 10, left: 0, bottom: 85 }}>
                                        <defs>
                                            <linearGradient id="supBarGrad" x1="0" y1="0" x2="0" y2="1">
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
                                        <Bar dataKey={activeMetric.key} fill="url(#supBarGrad)" radius={[6, 6, 0, 0]} maxBarSize={40}>
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
                                {/* Top 3 */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-1.5 bg-emerald-100 rounded-lg"><TrendingUp className="w-3.5 h-3.5 text-emerald-600" /></div>
                                        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Top 3 Tertinggi</h4>
                                    </div>
                                    <div className="space-y-2">
                                        {top3.map((r, i) => (
                                            <div key={r.name} className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2.5 border border-slate-100 shadow-sm">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : 'bg-orange-400'
                                                    }`}>{i + 1}</div>
                                                <div className="flex-1 min-w-0"><p className="text-xs font-bold text-slate-700 truncate">{r.name}</p></div>
                                                <span className="text-sm font-black" style={{ color: activeMetric.gradient[0] }}>
                                                    {Number(r[activeMetric.key as keyof typeof r]).toFixed(1)}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Bottom 3 */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-1.5 bg-rose-100 rounded-lg"><TrendingDown className="w-3.5 h-3.5 text-rose-600" /></div>
                                        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">3 Terendah</h4>
                                    </div>
                                    <div className="space-y-2">
                                        {bottom3.map((r, i) => (
                                            <div key={r.name} className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2.5 border border-rose-100 shadow-sm">
                                                <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center"><TrendingDown className="w-3 h-3 text-rose-500" /></div>
                                                <div className="flex-1 min-w-0"><p className="text-xs font-bold text-slate-700 truncate">{r.name}</p></div>
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

            {/* Detail Rekap Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-teal-50 rounded-xl"><TableIcon className="w-5 h-5 text-teal-600" /></div>
                        <div>
                            <h3 className="font-bold text-slate-800">Detail Rekapitulasi Suplementasi Zat Gizi Mikro</h3>
                            <p className="text-sm text-slate-500 mt-1">Data agregat level {groupingRole === 'superadmin' ? 'Puskesmas' : 'Desa'}</p>
                        </div>
                    </div>
                </div>
                <div className="overflow-auto" style={{ maxHeight: 480 }}>
                    <table className="w-full text-sm text-left align-middle min-w-[900px]">
                        <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-y border-slate-200" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr>
                                <th className="px-6 py-4">{groupingRole === "superadmin" ? "Puskesmas" : "Kelurahan"}</th>
                                {visibleCards.filter(c => c.id !== 'program_belum').map(c => (
                                    <th key={c.id} className="px-4 py-4 text-center whitespace-nowrap">{c.title.replace('% ', '')}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {summaryTable.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map((row) => {
                                // Map card id to summary table key
                                const keyMap: Record<string, string> = {
                                    'vit_a_6_11_feb': 'vit_a_6_11_feb_rate',
                                    'vit_a_12_59_feb': 'vit_a_12_59_feb_rate',
                                    'vit_a_6_11_aug': 'vit_a_6_11_aug_rate',
                                    'vit_a_12_59_aug': 'vit_a_12_59_aug_rate',
                                    'vit_a_6_11_tahunan': 'vit_a_6_11_tahunan_rate',
                                    'vit_a_12_59_tahunan': 'vit_a_12_59_tahunan_rate',
                                    'vit_a_2x': 'vit_a_2x_rate',
                                    'suplemen_mikro': 'suplemen_mikro_rate',
                                };
                                // Cards that are Vitamin A metrics (should be checked against target)
                                const vitACardIds = ['vit_a_6_11_feb', 'vit_a_12_59_feb', 'vit_a_6_11_aug', 'vit_a_12_59_aug', 'vit_a_6_11_tahunan', 'vit_a_12_59_tahunan', 'vit_a_2x'];
                                return (
                                    <tr key={row.name} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-slate-800">{row.name}</td>
                                        {visibleCards.filter(c => c.id !== 'program_belum').map(c => {
                                            const val = Number(row[keyMap[c.id] as keyof typeof row] || 0);
                                            const isVitA = vitACardIds.includes(c.id);
                                            const isBelowTarget = isVitA && val < vitATarget && val > 0;
                                            return (
                                                <td key={c.id} className={`px-4 py-4 text-center font-medium ${isBelowTarget ? 'text-red-600 bg-red-50 font-bold' : 'text-slate-700'
                                                    }`}>
                                                    {val.toFixed(2)}%
                                                    {isBelowTarget && <span className="ml-1 text-[10px]">▼</span>}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
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
        </div>
    );
}
