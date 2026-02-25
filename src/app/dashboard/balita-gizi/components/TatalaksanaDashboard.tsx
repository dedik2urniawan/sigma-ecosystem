"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { calculateTatalaksanaMetrics, TatalaksanaMetricsResult, TATALAKSANA_COLUMNS } from "@/lib/tatalaksanaHelper";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine } from "recharts";
import { useAuth } from "@/app/dashboard/layout";
import { Info, ChevronDown, Activity, AlertTriangle, TrendingUp, TrendingDown, Table as TableIcon } from "lucide-react";

export default function TatalaksanaDashboard() {
    const { user } = useAuth();
    const effectiveRole = user?.role === "admin_puskesmas" ? "admin_puskesmas" : "superadmin";

    const [selectedJenisLaporan, setSelectedJenisLaporan] = useState<"Bulanan" | "Tahunan TW">("Bulanan");
    const [selectedMonthOrTW, setSelectedMonthOrTW] = useState(2);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [selectedPuskesmas, setSelectedPuskesmas] = useState(
        effectiveRole === "admin_puskesmas" && user?.puskesmas_id ? user.puskesmas_id : "ALL"
    );
    const [selectedKelurahan, setSelectedKelurahan] = useState("ALL");

    const [puskesmasOptions, setPuskesmasOptions] = useState<{ id: string; name: string }[]>([]);
    const [kelurahanOptions, setKelurahanOptions] = useState<{ id: string; name: string; puskesmas_id: string }[]>([]);
    const [metricsResult, setMetricsResult] = useState<TatalaksanaMetricsResult | null>(null);
    const [loading, setLoading] = useState(true);

    const [showDefinitions, setShowDefinitions] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedChartMetric, setSelectedChartMetric] = useState<string>('gizi_kurang_pmt');
    const rowsPerPage = 10;

    // Year-based targets
    const PMT_TARGETS: Record<string, number> = { '2025': 65, '2026': 70, '2027': 75, '2028': 80, '2029': 85 };
    const GB_TARGETS: Record<string, number> = { '2025': 91, '2026': 92, '2027': 93, '2028': 94, '2029': 95 };
    const pmtTarget = PMT_TARGETS[selectedYear] || 65;
    const gbTarget = GB_TARGETS[selectedYear] || 91;

    // Load options
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
                // Determine months to fetch
                let monthsToFetch: number[];
                if (selectedJenisLaporan === "Bulanan") {
                    monthsToFetch = [selectedMonthOrTW];
                } else {
                    // TW: need cumulative month (last of TW) + all months from Jan to end for average
                    const twEndMonth: Record<number, number> = { 1: 3, 2: 6, 3: 9, 4: 12 };
                    const end = twEndMonth[selectedMonthOrTW] || 12;
                    monthsToFetch = Array.from({ length: end }, (_, i) => i + 1);
                }

                const selectCols = ["kelurahan", "puskesmas", "bulan", "tahun", ...TATALAKSANA_COLUMNS].join(", ");
                let query = supabase.from("data_balita_gizi").select(selectCols)
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

                // Paginated fetch
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
                    query = supabase.from("data_balita_gizi").select(selectCols)
                        .eq("tahun", year).in("bulan", monthsToFetch);
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
                const result = calculateTatalaksanaMetrics(allData, groupingRole, selectedJenisLaporan, selectedMonthOrTW);
                setMetricsResult(result);
            } catch (err) {
                console.error("TatalaksanaDashboard fetch error:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [puskesmasOptions.length, kelurahanOptions.length, selectedJenisLaporan, selectedMonthOrTW, selectedYear, selectedPuskesmas, selectedKelurahan, effectiveRole]);

    useEffect(() => { setCurrentPage(1); }, [metricsResult]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium animate-pulse">Memuat data tatalaksana...</p>
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

    const { summaryTable, overallMetrics } = metricsResult;
    const groupingRole = (effectiveRole === "superadmin" && selectedPuskesmas === "ALL") ? "superadmin" : "admin_puskesmas";
    const totalPages = Math.ceil(summaryTable.length / rowsPerPage);
    const filteredKelurahan = selectedPuskesmas === "ALL" ? kelurahanOptions : kelurahanOptions.filter(k => k.puskesmas_id === selectedPuskesmas);

    // Scorecard config
    const SCORE_CARDS = [
        { id: 'gizi_kurang_pmt', title: '% Gizi Kurang PMT', val: overallMetrics.gizi_kurang_pmt, color: 'orange', target: pmtTarget, emoji: '🍽️' },
        { id: 'bgm_pmt', title: '% BGM PMT', val: overallMetrics.bgm_pmt, color: 'amber', target: pmtTarget, emoji: '⚖️' },
        { id: 'bb_t_pmt', title: '% BB Tidak Naik (T) PMT', val: overallMetrics.bb_t_pmt, color: 'yellow', target: pmtTarget, emoji: '📉' },
        { id: 'gb_05', title: '% Gizi Buruk 0-5 Bln Dirawat', val: overallMetrics.gb_05, color: 'red', target: gbTarget, emoji: '🏥' },
        { id: 'gb_659', title: '% Gizi Buruk 6-59 Bln Dirawat', val: overallMetrics.gb_659, color: 'rose', target: gbTarget, emoji: '🩺' },
        { id: 'stunting_rujuk', title: '% Stunting Dirujuk PKM→RS', val: overallMetrics.stunting_rujuk, color: 'violet', target: null, emoji: '🔀' },
    ];

    // Chart metrics
    const CHART_METRICS = [
        { id: 'gizi_kurang_pmt', label: 'Gizi Kurang PMT', key: 'gizi_kurang_pmt_rate', gradient: ['#ea580c', '#f97316'], emoji: '🍽️' },
        { id: 'bgm_pmt', label: 'BGM PMT', key: 'bgm_pmt_rate', gradient: ['#d97706', '#f59e0b'], emoji: '⚖️' },
        { id: 'bb_t_pmt', label: 'BB Tidak Naik PMT', key: 'bb_t_pmt_rate', gradient: ['#ca8a04', '#eab308'], emoji: '📉' },
        { id: 'gb_05', label: 'Gizi Buruk 0-5 Bln', key: 'gb_05_rate', gradient: ['#dc2626', '#ef4444'], emoji: '🏥' },
        { id: 'gb_659', label: 'Gizi Buruk 6-59 Bln', key: 'gb_659_rate', gradient: ['#be123c', '#f43f5e'], emoji: '🩺' },
        { id: 'stunting_rujuk', label: 'Stunting Dirujuk', key: 'stunting_rujuk_rate', gradient: ['#7c3aed', '#8b5cf6'], emoji: '🔀' },
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
        <div className="space-y-6 min-w-0" style={{ overflowX: 'hidden' }}>
            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pilih Periode Laporan</label>
                    <div className="flex gap-2">
                        <select
                            value={selectedJenisLaporan}
                            onChange={(e) => { setSelectedJenisLaporan(e.target.value as any); setSelectedMonthOrTW(e.target.value === "Bulanan" ? 2 : 1); }}
                            className="w-1/3 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-rose-500 focus:border-rose-500 block p-2.5 outline-none"
                        >
                            <option value="Bulanan">Bulanan</option>
                            <option value="Tahunan TW">Triwulanan</option>
                        </select>
                        <select
                            value={selectedMonthOrTW}
                            onChange={(e) => setSelectedMonthOrTW(Number(e.target.value))}
                            className="w-2/3 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-rose-500 focus:border-rose-500 block p-2.5 outline-none"
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
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-rose-500 focus:border-rose-500 block p-2.5 outline-none">
                        <option value="2025">2025</option><option value="2026">2026</option>
                    </select>
                </div>
                {effectiveRole === "superadmin" && (
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Puskesmas</label>
                        <select value={selectedPuskesmas} onChange={(e) => { setSelectedPuskesmas(e.target.value); setSelectedKelurahan("ALL"); }} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-rose-500 focus:border-rose-500 block p-2.5 outline-none">
                            <option value="ALL">Semua Puskesmas</option>
                            {puskesmasOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                )}
                {(effectiveRole === "admin_puskesmas" || selectedPuskesmas !== "ALL") && (
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kelurahan</label>
                        <select value={selectedKelurahan} onChange={(e) => setSelectedKelurahan(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-rose-500 focus:border-rose-500 block p-2.5 outline-none">
                            <option value="ALL">Semua Kelurahan</option>
                            {filteredKelurahan.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* Definisi Operasional */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <button onClick={() => setShowDefinitions(!showDefinitions)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-50 rounded-xl"><Info className="w-5 h-5 text-rose-600" /></div>
                        <span className="font-bold text-slate-800">Definisi Operasional Indikator</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showDefinitions ? 'rotate-180' : ''}`} />
                </button>
                {showDefinitions && (
                    <div className="p-5 border-t border-slate-100 space-y-5 text-sm text-slate-700">
                        {/* Def 1 */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h4 className="font-bold text-slate-800 mb-2">1. Cakupan Balita Gizi Kurang Mendapat Makanan Tambahan</h4>
                            <p className="mb-3 border-l-4 border-orange-400 pl-3">Persentase balita usia 6-59 bulan gizi kurang (BB/PB atau BB/TB z-score &gt;-3 SD s/d &lt;-2 SD) dengan atau tanpa stunting yang mendapatkan makanan tambahan berbahan pangan lokal.</p>
                            <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto">
                                <span className="font-semibold whitespace-nowrap">Formula =</span>
                                <div className="flex flex-col items-center">
                                    <span className="border-b border-slate-800 px-2 pb-1 whitespace-nowrap text-center text-xs">Jml balita 6-59 bln gizi kurang mendapat PMT</span>
                                    <span className="px-2 pt-1 whitespace-nowrap text-center text-xs">Jml seluruh balita 6-59 bln gizi kurang</span>
                                </div>
                                <span className="font-semibold whitespace-nowrap">× 100%</span>
                            </div>
                            <p className="mt-3 text-xs text-slate-500"><strong>Sumber Data:</strong> Sigizi Kesga. Pencatatan setiap waktu saat pemberian PMT. Laporan kumulatif bulanan, tahunan per Desember.</p>
                        </div>
                        {/* Def 2 */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h4 className="font-bold text-slate-800 mb-2">2. Cakupan Balita BB Kurang (BGM) Mendapat Makanan Tambahan</h4>
                            <p className="mb-3 border-l-4 border-amber-400 pl-3">Persentase balita usia 6-59 bulan BB kurang (BB/U z-score &lt;-2 SD) atau BGM yang tidak wasting, dengan/tanpa stunting, mendapat PMT berbahan pangan lokal.</p>
                            <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto">
                                <span className="font-semibold whitespace-nowrap">Formula =</span>
                                <div className="flex flex-col items-center">
                                    <span className="border-b border-slate-800 px-2 pb-1 whitespace-nowrap text-center text-xs">Jml balita 6-59 bln BB kurang tidak wasting mendapat PMT</span>
                                    <span className="px-2 pt-1 whitespace-nowrap text-center text-xs">Jml balita 6-59 bln BB kurang tidak wasting</span>
                                </div>
                                <span className="font-semibold whitespace-nowrap">× 100%</span>
                            </div>
                            <p className="mt-3 text-xs text-slate-500"><strong>Sumber Data:</strong> Sigizi Kesga. Laporan bulanan, tahunan diperoleh berdasarkan rerata pelaporan dalam satu tahun.</p>
                        </div>
                        {/* Def 3 */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h4 className="font-bold text-slate-800 mb-2">3. Cakupan Balita BB Tidak Naik (T) Mendapat Makanan Tambahan</h4>
                            <p className="mb-3 border-l-4 border-yellow-400 pl-3">Persentase balita usia 6-59 bulan dengan status pertumbuhan tidak naik (T) yang BB normal, tidak wasting/underweight/overweight, dengan/tanpa stunting, mendapat PMT.</p>
                            <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto">
                                <span className="font-semibold whitespace-nowrap">Formula =</span>
                                <div className="flex flex-col items-center">
                                    <span className="border-b border-slate-800 px-2 pb-1 whitespace-nowrap text-center text-xs">Jml balita T659 mendapatkan PMT</span>
                                    <span className="px-2 pt-1 whitespace-nowrap text-center text-xs">Jml sasaran balita T</span>
                                </div>
                                <span className="font-semibold whitespace-nowrap">× 100%</span>
                            </div>
                            <p className="mt-3 text-xs text-slate-500"><strong>Sumber Data:</strong> Sigizi Kesga. Laporan bulanan, tahunan berdasarkan rerata pelaporan dalam satu tahun.</p>
                        </div>
                        {/* Def 4 */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h4 className="font-bold text-slate-800 mb-2">4. Persentase Balita Gizi Buruk Mendapat Tata Laksana</h4>
                            <p className="mb-3 border-l-4 border-red-400 pl-3">Persentase balita usia 0-59 bulan gizi buruk (BB/PB atau BB/TB z-score &lt;-3 SD atau LILA &lt;11.5 cm) yang dirawat sesuai tata laksana gizi buruk di fasyankes.</p>
                            <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto">
                                <span className="font-semibold whitespace-nowrap">Formula =</span>
                                <div className="flex flex-col items-center">
                                    <span className="border-b border-slate-800 px-2 pb-1 whitespace-nowrap text-center text-xs">Jml balita 0-59 bln gizi buruk mendapat tatalaksana sesuai standar</span>
                                    <span className="px-2 pt-1 whitespace-nowrap text-center text-xs">Jml seluruh balita 0-59 bln gizi buruk</span>
                                </div>
                                <span className="font-semibold whitespace-nowrap">× 100%</span>
                            </div>
                            <p className="mt-3 text-xs text-slate-500"><strong>Sumber Data:</strong> Sigizi Kesga. Pencatatan saat balita mendapat tatalaksana pertama kali. Laporan tahunan per Desember.</p>
                        </div>
                        {/* Def 5 */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <h4 className="font-bold text-slate-800 mb-2">5. Persentase Balita Stunting Dirujuk PKM ke RS</h4>
                            <p className="mb-3 border-l-4 border-violet-400 pl-3">Persentase balita stunting yang dirujuk oleh Puskesmas ke Rumah Sakit dalam kurun 1 tahun yang sama.</p>
                            <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto">
                                <span className="font-semibold whitespace-nowrap">Formula =</span>
                                <div className="flex flex-col items-center">
                                    <span className="border-b border-slate-800 px-2 pb-1 whitespace-nowrap text-center text-xs">Jml balita stunting dirujuk PKM ke RS</span>
                                    <span className="px-2 pt-1 whitespace-nowrap text-center text-xs">Jml seluruh balita stunting</span>
                                </div>
                                <span className="font-semibold whitespace-nowrap">× 100%</span>
                            </div>
                            <p className="mt-3 text-xs text-slate-500"><strong>Sumber Data:</strong> Sigizi Kesga. Pencatatan saat balita stunting dirujuk. Laporan kumulatif, tahunan per Desember.</p>
                        </div>

                        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 flex gap-3 text-amber-800">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <p><strong>Catatan Agregasi TW:</strong> Metrik kumulatif (Gizi Kurang PMT, Gizi Buruk 0-5 & 6-59, Stunting Dirujuk) mengambil nilai bulan terakhir TW. Metrik rata-rata (BGM PMT, BB T PMT) menggunakan rerata denom & numerator dari Januari s/d akhir TW.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Score Cards — 3×2 grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {SCORE_CARDS.map(card => (
                    <div key={card.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <h4 className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider mb-1 leading-tight">{card.title}</h4>
                        <div className="flex items-end gap-2 mt-auto">
                            <span className={`text-2xl font-black text-${card.color}-600`}>
                                {card.val.toFixed(2)}<span className="text-base text-slate-400">%</span>
                            </span>
                            {card.target !== null && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${card.val >= card.target
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                    : 'bg-red-50 text-red-600 border border-red-200'}`}>
                                    Target: {card.target}%
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Unified Chart ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                    {/* Pill selector */}
                    <div className="flex flex-wrap gap-2 mt-4">
                        {CHART_METRICS.map(m => (
                            <button key={m.id} onClick={() => setSelectedChartMetric(m.id)}
                                className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition-all duration-200 flex items-center gap-1.5 ${selectedChartMetric === m.id
                                    ? 'text-white shadow-md scale-[1.02]'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'}`}
                                style={selectedChartMetric === m.id ? { background: `linear-gradient(135deg, ${m.gradient[0]}, ${m.gradient[1]})`, borderColor: m.gradient[0] } : {}}>
                                <span>{m.emoji}</span>{m.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row">
                    <div className="flex-1 p-5" style={{ minHeight: 420 }}>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={sortedData} margin={{ top: 25, right: 10, left: 0, bottom: 85 }}>
                                <defs>
                                    <linearGradient id="tatBarGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={activeMetric.gradient[1]} stopOpacity={0.95} />
                                        <stop offset="100%" stopColor={activeMetric.gradient[0]} stopOpacity={0.85} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" interval={0} axisLine={false} tickLine={false}
                                    tick={({ x, y, payload }: { x: any; y: any; payload: { value: string } }) => {
                                        const name = payload.value;
                                        const abbreviated = name.length > 12 ? name.split(" ").map((w: string) => w.length > 4 ? w.slice(0, 4) + "." : w).join(" ") : name;
                                        return (<g transform={`translate(${x},${y})`}><text x={0} y={0} dy={8} textAnchor="end" fill="#64748b" fontSize={10} fontFamily="'Public Sans', monospace" transform="rotate(-45)">{abbreviated}</text></g>);
                                    }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} dx={-5} tickFormatter={(v) => `${v}%`} />
                                <RechartsTooltip cursor={{ fill: 'rgba(241,245,249,0.7)', radius: 6 }} formatter={(value: any) => [`${Number(value).toFixed(2)}%`, activeMetric.label]} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 600 }} />
                                <ReferenceLine y={avgValue} stroke={activeMetric.gradient[0]} strokeDasharray="6 4" strokeWidth={1.5} label={{ value: `Avg: ${avgValue.toFixed(1)}%`, position: 'right', fill: activeMetric.gradient[0], fontSize: 11, fontWeight: 700 }} />
                                <Bar dataKey={activeMetric.key} fill="url(#tatBarGrad)" radius={[6, 6, 0, 0]} maxBarSize={40}>
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
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 bg-emerald-100 rounded-lg"><TrendingUp className="w-3.5 h-3.5 text-emerald-600" /></div>
                                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Top 3 Tertinggi</h4>
                            </div>
                            <div className="space-y-2">
                                {top3.map((r, i) => (
                                    <div key={r.name} className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2.5 border border-slate-100 shadow-sm">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : 'bg-orange-400'}`}>{i + 1}</div>
                                        <div className="flex-1 min-w-0"><p className="text-xs font-bold text-slate-700 truncate">{r.name}</p></div>
                                        <span className="text-sm font-black" style={{ color: activeMetric.gradient[0] }}>{Number(r[activeMetric.key as keyof typeof r]).toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
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
                                        <span className="text-sm font-black text-rose-500">{Number(r[activeMetric.key as keyof typeof r]).toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="mt-auto pt-4 border-t border-slate-200">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white rounded-xl p-3 border border-slate-100 text-center">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Tertinggi</p>
                                    <p className="text-lg font-black" style={{ color: activeMetric.gradient[0] }}>{sortedData.length > 0 ? Number(sortedData[0][activeMetric.key as keyof (typeof sortedData)[0]]).toFixed(1) : 0}%</p>
                                </div>
                                <div className="bg-white rounded-xl p-3 border border-slate-100 text-center">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Terendah</p>
                                    <p className="text-lg font-black text-rose-500">{sortedData.length > 0 ? Number(sortedData[sortedData.length - 1][activeMetric.key as keyof (typeof sortedData)[0]]).toFixed(1) : 0}%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detail Rekap Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-rose-50 rounded-xl"><TableIcon className="w-5 h-5 text-rose-600" /></div>
                        <div>
                            <h3 className="font-bold text-slate-800">Detail Rekapitulasi Tatalaksana Balita Bermasalah Gizi</h3>
                            <p className="text-sm text-slate-500 mt-1">Data agregat level {groupingRole === 'superadmin' ? 'Puskesmas' : 'Desa'}</p>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-sky-50 border-b border-sky-100 flex gap-2">
                    <Info size={16} className="text-sky-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-700">
                        <strong>Catatan:</strong> Sel dengan warna <span className="text-red-600 font-bold">merah</span> menandakan nilai di bawah target program. PMT Target: <strong>{pmtTarget}%</strong> | Gizi Buruk Target: <strong>{gbTarget}%</strong>
                    </p>
                </div>
                <div className="overflow-auto" style={{ maxHeight: 480 }}>
                    <table className="w-full text-sm text-left align-middle min-w-[1100px]">
                        <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-y border-slate-200" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr>
                                <th className="px-6 py-4">{groupingRole === "superadmin" ? "Puskesmas" : "Kelurahan"}</th>
                                <th className="px-4 py-4 text-center whitespace-nowrap">Gizi Kurang PMT</th>
                                <th className="px-4 py-4 text-center whitespace-nowrap">BGM PMT</th>
                                <th className="px-4 py-4 text-center whitespace-nowrap">BB T PMT</th>
                                <th className="px-4 py-4 text-center whitespace-nowrap">Gizi Buruk 0-5 Bln</th>
                                <th className="px-4 py-4 text-center whitespace-nowrap">Gizi Buruk 6-59 Bln</th>
                                <th className="px-4 py-4 text-center whitespace-nowrap">Stunting Dirujuk</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {summaryTable.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map((row) => {
                                const deficitCell = (val: number, target: number | null) => {
                                    const below = target !== null && val > 0 && val < target;
                                    return (
                                        <td className={`px-4 py-4 text-center font-medium ${below ? 'text-red-600 bg-red-50 font-bold' : 'text-slate-700'}`}>
                                            {val.toFixed(2)}%{below && <span className="ml-1 text-[10px]">▼</span>}
                                        </td>
                                    );
                                };
                                return (
                                    <tr key={row.name} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-slate-800">{row.name}</td>
                                        {deficitCell(row.gizi_kurang_pmt_rate, pmtTarget)}
                                        {deficitCell(row.bgm_pmt_rate, pmtTarget)}
                                        {deficitCell(row.bb_t_pmt_rate, pmtTarget)}
                                        {deficitCell(row.gb_05_rate, gbTarget)}
                                        {deficitCell(row.gb_659_rate, gbTarget)}
                                        {deficitCell(row.stunting_rujuk_rate, null)}
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
                            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}
                                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Sebelumnya</button>
                            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}
                                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Selanjutnya</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
