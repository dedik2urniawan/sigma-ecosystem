"use client";

import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { getAdvancedAnalytics, AIAnalyticsData } from "@/app/actions/get-advanced-analytics";
import { useAuth } from "@/app/dashboard/layout";
import { supabase } from "@/lib/supabase";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';

export const PUSKESMAS_LIST = [
    "Ampelgading", "Bantur", "Bululawang", "Dampit", "Dau", "Donomulyo",
    "Gedangan", "Gondanglegi", "Jabung", "Kalipare", "Karangploso", "Kasembon",
    "Kepanjen", "Kromengan", "Lawang", "Ngajum", "Ngantang", "Pagak",
    "Pagelaran", "Panceng", "Pakis", "Pakisaji", "Poncokusumo", "Pujon",
    "Singosari", "Situraja", "Sumbermanjing Wetan", "Sumberpucung", "Tajinan",
    "Tirtoyudo", "Tumpang", "Turen", "Wagir", "Wajak", "Wonosari", "Ardimulyo",
    "Pamotan", "Glosari", "Sitiarjo", "Sumbermanjing Kulon", "Ketawang"
].sort();

// Leaflet map must be dynamically imported to avoid SSR issues
const MapScoring = dynamic(() => import("./MapScoring"), {
    ssr: false,
    loading: () => <div className="animate-pulse bg-slate-100 rounded-2xl h-[400px] w-full border border-slate-200" />
});

type TabView = 'kabupaten' | 'puskesmas';

export default function AIAnalyticsClient() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabView>('kabupaten');
    const [selectedPuskesmas, setSelectedPuskesmas] = useState<string>("all");

    const [data, setData] = useState<AIAnalyticsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [renderedTarget, setRenderedTarget] = useState<{ tab: string, puskesmas: string }>({ tab: '', puskesmas: '' });

    // Determines if dropdown is locked to a single puskesmas based on RBAC
    const isPuskesmasLocked = user && user.role !== 'superadmin' && user.puskesmas_id;
    const [lockedPuskesmasName, setLockedPuskesmasName] = useState<string | null>(null);

    useEffect(() => {
        if (isPuskesmasLocked && user?.puskesmas_id) {
            const fetchPuskesmasName = async () => {
                // Check if it's already a valid name
                const directMatch = PUSKESMAS_LIST.find(p => p.toLowerCase() === user.puskesmas_id?.toLowerCase());
                if (directMatch) {
                    setLockedPuskesmasName(directMatch);
                    return;
                }

                // Otherwise, assume it's a UUID and try fetching from ref_puskesmas
                try {
                    const { data } = await supabase
                        .from('ref_puskesmas')
                        .select('nama')
                        .eq('id', user.puskesmas_id)
                        .single();
                    if (data && data.nama) {
                        const capitalizedMatch = PUSKESMAS_LIST.find(p => p.toLowerCase() === data.nama.toLowerCase());
                        setLockedPuskesmasName(capitalizedMatch || data.nama);
                    } else {
                        setLockedPuskesmasName(user.puskesmas_id);
                    }
                } catch (e) {
                    setLockedPuskesmasName(user.puskesmas_id);
                }
            };
            fetchPuskesmasName();
        }
    }, [isPuskesmasLocked, user?.puskesmas_id]);

    useEffect(() => {
        if (activeTab === 'puskesmas' && isPuskesmasLocked && lockedPuskesmasName) {
            setSelectedPuskesmas(lockedPuskesmasName);
        } else if (activeTab === 'kabupaten') {
            setSelectedPuskesmas("all");
        } else if (activeTab === 'puskesmas' && selectedPuskesmas === "all" && !isPuskesmasLocked) {
            // For superadmins navigating to puskesmas tab without a selection, pick the first one
            setSelectedPuskesmas(PUSKESMAS_LIST[0]);
        }
    }, [activeTab, isPuskesmasLocked, lockedPuskesmasName, selectedPuskesmas]);



    const handleFetchAnalytics = async () => {
        if (activeTab === 'puskesmas' && selectedPuskesmas === "all") return;

        setLoading(true);
        setError(null);
        try {
            const targetId = activeTab === 'kabupaten' ? undefined : selectedPuskesmas;
            const res = await getAdvancedAnalytics(targetId);

            if (res.success && res.data) {
                setData(res.data);
                setRenderedTarget({ tab: activeTab, puskesmas: selectedPuskesmas });
            } else {
                setError(res.error || "Gagal merumuskan analitik AI.");
            }
        } catch (err: any) {
            setError(err.message || "Unknown error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const isCurrentModeRendered = renderedTarget.tab === activeTab &&
        (activeTab === 'kabupaten' || renderedTarget.puskesmas === selectedPuskesmas);

    const renderContent = () => {
        if (error) {
            return (
                <div className="bg-red-50/50 border border-red-200 rounded-3xl p-10 flex flex-col items-center justify-center text-center mt-6">
                    <span className="material-icons-round text-red-500 text-5xl mb-4">error_outline</span>
                    <h3 className="text-xl font-bold text-red-800 mb-2">Sistem AI Terkendala</h3>
                    <p className="text-red-600/80 mb-6">{error}</p>
                    <button
                        onClick={handleFetchAnalytics}
                        className="px-6 py-3 bg-red-100 text-red-700 font-bold rounded-xl hover:bg-red-200 transition-colors"
                    >
                        Coba Refresh
                    </button>
                </div>
            );
        }

        if (loading && !isCurrentModeRendered) {
            return (
                <div className="bg-slate-50 border border-slate-200/60 rounded-[2rem] p-10 flex flex-col items-center justify-center min-h-[400px] animate-pulse relative overflow-hidden mt-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-[200%] animate-[shimmer_2s_infinite]" />
                    <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mb-6 z-10">
                        <span className="material-icons-round text-indigo-400 text-4xl animate-spin-slow">auto_awesome</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2 z-10">SIGMA AI sedang menganalisis data...</h2>
                    <p className="text-slate-500 max-w-lg text-center leading-relaxed z-10">
                        Mengekstraksi wawasan prediktif dan mendeteksi anomali gizi balita dari data historis. Proses ini memerlukan waktu beberapa saat.
                    </p>
                </div>
            );
        }

        if (!isCurrentModeRendered) {
            return (
                <div className="bg-white border border-slate-200 shadow-sm rounded-[2rem] p-10 flex flex-col items-center justify-center min-h-[400px] mt-6 text-center">
                    <div className="w-24 h-24 rounded-full border-4 border-indigo-50 bg-indigo-100/50 flex items-center justify-center mb-6">
                        <span className="material-icons-round text-indigo-500 text-5xl">manage_search</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                        {activeTab === 'kabupaten' ? 'Analisis Tingkat Kabupaten' : `Analisis Spesifik: Puskesmas ${selectedPuskesmas !== 'all' ? selectedPuskesmas : ''}`}
                    </h2>
                    <p className="text-slate-500 max-w-lg mb-8 leading-relaxed">
                        Klik tombol di bawah untuk meminta AI membaca data {activeTab === 'kabupaten' ? 'seluruh puskesmas' : `Puskesmas ${selectedPuskesmas}`} dan merumuskan wawasan strategis.
                    </p>
                    <button
                        onClick={handleFetchAnalytics}
                        disabled={activeTab === 'puskesmas' && selectedPuskesmas === 'all'}
                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-3 group"
                    >
                        <span className="material-icons-round animate-pulse">auto_awesome</span>
                        <span>Mulai Analisis</span>
                    </button>
                </div>
            );
        }

        if (!data) return null;

        return (
            <div className="space-y-8 mt-6">
                {/* Header & Macro Status */}
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[2rem] p-8 lg:p-12 text-white relative overflow-hidden shadow-2xl shadow-indigo-900/20">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center shrink-0">
                            <span className="material-icons-round text-3xl text-indigo-300">hub</span>
                        </div>
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-4">
                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                                {activeTab === 'kabupaten' ? 'Tinjauan Tingkat Kabupaten' : `Tinjauan Spesifik: Puskesmas ${selectedPuskesmas}`}
                            </div>
                            <h2 className="text-3xl lg:text-4xl font-black mb-6 leading-tight max-w-3xl drop-shadow-sm">
                                Ikhtisar Kebijakan Berbasis AI
                            </h2>
                            <div className="prose prose-invert prose-indigo max-w-none text-slate-300 leading-relaxed text-sm md:text-base">
                                {data.macroStatus.split('\n').map((para, i) => (
                                    <p key={i}>{para}</p>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Split Grid: Anomalies & Predictions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Anomaly Detection */}
                    <div className="bg-white border text-left border-red-100 hover:border-red-200 rounded-[2rem] p-8 shadow-sm transition-colors relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-100 transition-opacity">
                            <span className="material-icons-round text-6xl text-red-500/10">warning_amber</span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-6 border border-red-100">
                            <span className="material-icons-round text-2xl">radar</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-6">Deteksi Anomali Gizi</h3>
                        <ul className="space-y-4 relative z-10">
                            {data.anomalyDetection.map((anomaly, i) => (
                                <li key={i} className="flex gap-3 text-slate-600 text-sm leading-relaxed items-start">
                                    <span className="material-icons-round text-red-500 text-sm shrink-0 mt-0.5">error</span>
                                    <span>{anomaly}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Predictive Trend */}
                    <div className="bg-white border text-left border-blue-100 hover:border-blue-200 rounded-[2rem] p-8 shadow-sm transition-colors relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-100 transition-opacity">
                            <span className="material-icons-round text-6xl text-blue-500/10">trending_up</span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 border border-blue-100">
                            <span className="material-icons-round text-2xl">timeline</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-6">Analisis Prediktif Tren</h3>

                        {/* Chart Area */}
                        {data.predictiveAnalysis.trendData && data.predictiveAnalysis.trendData.length > 0 && (
                            <div className="h-48 w-full mb-6 relative z-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.predictiveAnalysis.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorStunting" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="bulan"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                            dx={-10}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                                            formatter={(value: any) => [`${value}%`, 'Prediksi Stunting']}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="prediksiStunting"
                                            stroke="#3b82f6"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorStunting)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        <p className="text-slate-600 leading-relaxed text-sm relative z-10 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            {data.predictiveAnalysis.narrative}
                        </p>
                    </div>
                </div>

                {/* Tactical Recommendations */}
                <div className="bg-white border text-left border-emerald-100 hover:border-emerald-200 rounded-[2rem] p-8 lg:p-10 shadow-sm transition-colors relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-100 transition-opacity">
                        <span className="material-icons-round text-6xl text-emerald-500/10">check_circle</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 border border-emerald-100">
                        <span className="material-icons-round text-2xl">lightbulb</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-6">Rekomendasi Intervensi Taktis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                        {data.tacticalRecommendations.map((rec, i) => (
                            <div key={i} className="flex gap-4 bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/50">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold font-mono text-xs shrink-0">
                                    {i + 1}
                                </div>
                                <p className="text-slate-600 text-sm leading-relaxed">{rec}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Geospatial - Only show if in Kabupaten View */}
                {activeTab === 'kabupaten' && (
                    <div className="bg-white border text-left border-slate-200 rounded-[2rem] p-8 shadow-sm overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-[10px] font-bold uppercase tracking-widest mb-3">
                                    Geospatial AI Analysis
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800">Peta Prioritas Intervensi Wilayah</h3>
                                <p className="text-sm text-slate-500 mt-2 max-w-2xl leading-relaxed">
                                    Algoritma penggabungan data prevalensi stunting, wasting, dan input intervensi merumuskan skor risiko. Puskesmas berwarna paling gelap memerlukan atensi segera.
                                </p>
                            </div>
                        </div>

                        <MapScoring scores={data.regionScoring} />

                        {/* Scoring Table */}
                        <div className="mt-8 pt-6 border-t border-slate-100">
                            <h4 className="font-bold text-slate-700 text-sm mb-4">Daftar Wilayah Berisiko Tinggi (Top Scores)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[...data.regionScoring].sort((a, b) => b.riskScore - a.riskScore).slice(0, 9).map((score, i) => (
                                    <div key={i} className="flex flex-col sm:flex-row items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm transition-all hover:shadow-md hover:border-indigo-100">
                                        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border border-white/20 shadow-inner ${score.riskScore >= 60 ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' : score.riskScore >= 40 ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white' : 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white'
                                            }`}>
                                            <span className="text-xl font-black">{score.riskScore}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <p className="font-bold text-slate-800 text-base truncate">{score.puskesmas}</p>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${score.riskScore >= 60 ? 'bg-red-100 text-red-700' : score.riskScore >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{score.status}</span>
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                                                {score.reason}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="pb-12">
            {/* Header Tabs Navigation */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="flex bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50 w-full md:w-auto">
                    <button
                        onClick={() => !loading && setActiveTab('kabupaten')}
                        className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === 'kabupaten'
                            ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/80'
                            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <span className="material-icons-round text-lg">public</span>
                        Tingkat Kabupaten
                    </button>
                    <button
                        onClick={() => !loading && setActiveTab('puskesmas')}
                        className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === 'puskesmas'
                            ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/80'
                            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <span className="material-icons-round text-lg">domain</span>
                        Spesifik Puskesmas
                    </button>
                </div>

                {/* Puskesmas Selector (Only visible in Puskesmas Tab) */}
                {activeTab === 'puskesmas' && (
                    <div className="w-full md:w-64 animate-in fade-in slide-in-from-right-4 duration-300">
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                            Pilih Puskesmas
                            {isPuskesmasLocked && ' (Terkunci)'}
                        </label>
                        <select
                            value={selectedPuskesmas}
                            onChange={(e) => setSelectedPuskesmas(e.target.value)}
                            disabled={loading || !!isPuskesmasLocked}
                            className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${isPuskesmasLocked
                                ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed font-medium'
                                : 'bg-white border-slate-300 text-slate-800 hover:border-slate-400'
                                }`}
                        >
                            <option value="all" disabled>-- Pilih Puskesmas --</option>
                            {PUSKESMAS_LIST.map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Dynamic Analytical Views */}
            {renderContent()}
        </div>
    );
}
