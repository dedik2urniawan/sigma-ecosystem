"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
    LineChart, Line, Legend, PieChart, Pie
} from "recharts";

interface Filters {
    periode: string;
    kecamatan: string;
    puskesmas: string;
    kelurahan?: string;
    userRole?: string;
    userPuskesmasId?: string | null;
}

export default function TrendPertumbuhanTab({ filters }: { filters: Filters }) {
    const [loadingCiaf, setLoadingCiaf] = useState(true);
    const [ciafData, setCiafData] = useState<any>(null);

    const [searchNik, setSearchNik] = useState("");
    const [loadingLongitudinal, setLoadingLongitudinal] = useState(false);
    const [longitudinalData, setLongitudinalData] = useState<any[]>([]);
    const [balitaInfo, setBalitaInfo] = useState<any>(null);

    // Fetch CIAF Summary
    useEffect(() => {
        async function fetchCIAF() {
            setLoadingCiaf(true);
            try {
                const { data, error } = await supabase.rpc('get_eppgbm_ciaf_comprehensive', {
                    p_periode: filters.periode,
                    p_puskesmas: filters.puskesmas,
                    p_kelurahan: filters.kelurahan || "Semua"
                });

                if (!error && data) {
                    setCiafData(data);
                }
            } catch (err) {
                console.error("Fetch CIAF Failed", err);
            } finally {
                setLoadingCiaf(false);
            }
        }
        fetchCIAF();
    }, [filters]);

    const handleSearchLongitudinal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchNik.trim()) return;

        setLoadingLongitudinal(true);
        setLongitudinalData([]);
        setBalitaInfo(null);

        try {
            const { data, error } = await supabase
                .from('data_eppgbm')
                .select('periode, tgl_ukur, usia_saatukur, bb, tinggi, zs_bbu, zs_tbu, zs_bbtb, nama_balita, jk, tgl_lahir')
                .eq('nik', searchNik.trim())
                .order('tgl_ukur', { ascending: true });

            if (!error && data && data.length > 0) {
                setBalitaInfo({
                    nama: data[0].nama_balita,
                    jk: data[0].jk,
                    tglLahir: data[0].tgl_lahir
                });
                setLongitudinalData(data);
            } else {
                setLongitudinalData([]);
            }
        } catch (err) {
            console.error("Longitudinal Error:", err);
        } finally {
            setLoadingLongitudinal(false);
        }
    };

    const ciafColors: Record<string, string> = {
        "A": "#10b981",
        "B": "#f59e0b",
        "C": "#ea580c",
        "D": "#b91c1c",
        "E": "#e11d48",
        "F": "#c026d3",
        "Y": "#4f46e5",
    };

    const ciafLabels: Record<string, string> = {
        "A": "A (Normal)",
        "B": "B (Wasting)",
        "C": "C (Wasting & Underweight)",
        "D": "D (Stunting, Wasting, Underweight)",
        "E": "E (Stunting & Underweight)",
        "F": "F (Stunting)",
        "Y": "Y (Underweight)",
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* CIAF Classification Comprehensive */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 lg:col-span-2 space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-xl font-extrabold text-slate-800">
                                Analisis Composite Index of Anthropometric Failure (CIAF)
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                                CIAF mengklasifikasikan balita ke dalam tujuh kategori berdasarkan kombinasi stunting, wasting, dan underweight.
                            </p>
                        </div>
                    </div>

                    {/* Accordion Definisi Operational */}
                    <details className="group bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                        <summary className="flex items-center justify-between p-4 cursor-pointer font-bold text-slate-700 hover:bg-slate-100 transition-colors list-none">
                            <div className="flex items-center gap-3">
                                <span className="material-icons-round text-cyan-600">lightbulb</span>
                                <span>Definisi Operasional dan Insight Analisis CIAF</span>
                            </div>
                            <span className="material-icons-round text-slate-400 group-open:rotate-180 transition-transform">expand_more</span>
                        </summary>
                        <div className="p-4 border-t border-slate-200 text-sm text-slate-600 leading-relaxed space-y-4">
                            <p>
                                Composite Index of Anthropometric Failure (CIAF) adalah indeks komposit yang menggabungkan tiga indikator utama status gizi: stunting, wasting, dan underweight. Anak yang termasuk dalam kategori B-Y dianggap mengalami kegagalan antropometri.
                            </p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>A:</strong> Tidak ada kegagalan (normal).</li>
                                <li><strong>B:</strong> Hanya wasting.</li>
                                <li><strong>C:</strong> Wasting dan underweight.</li>
                                <li><strong>D:</strong> Wasting, underweight, dan stunting.</li>
                                <li><strong>E:</strong> Hanya underweight.</li>
                                <li><strong>F:</strong> Hanya stunting.</li>
                                <li><strong>Y:</strong> Stunting dan underweight.</li>
                            </ul>
                            <p className="bg-blue-50/50 p-4 border border-blue-100 rounded-xl text-blue-800">
                                <strong>💡 Penjelasan Sederhana:</strong><br/>
                                CIAF seperti "detektor" yang menangkap semua masalah pertumbuhan balita. Dengan CIAF, kita bisa tahu berapa banyak anak yang bermasalah dan seberapa parah masalahnya (kegagalan ganda/tiga), sehingga bisa membantu menentukan prioritas intervensi.
                            </p>
                        </div>
                    </details>

                    {loadingCiaf ? (
                        <div className="h-[300px] flex items-center justify-center">
                            <span className="material-icons-round text-5xl text-cyan-200 animate-spin">refresh</span>
                        </div>
                    ) : ciafData ? (
                        <div className="space-y-8">
                            
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-center items-center text-center">
                                    <p className="text-sm font-semibold text-slate-500 mb-1">Total Populasi Teralisis</p>
                                    <p className="text-3xl font-extrabold text-slate-800">{ciafData.total_population.toLocaleString('id-ID')}</p>
                                </div>
                                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex flex-col justify-center items-center text-center">
                                    <p className="text-sm font-semibold text-rose-600 mb-1">Total Kegagalan (B-Y)</p>
                                    <p className="text-3xl font-extrabold text-rose-700">{ciafData.ciaf_failures.toLocaleString('id-ID')}</p>
                                </div>
                                <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-4 flex flex-col justify-center items-center text-center">
                                    <p className="text-sm font-semibold text-cyan-700 mb-1">Prevalensi CIAF</p>
                                    <p className="text-4xl font-extrabold text-cyan-600 tracking-tight">{ciafData.prevalence_overall}%</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                                {/* Distribusi Kategori CIAF */}
                                <div>
                                    <h4 className="font-bold text-slate-700 mb-4">Distribusi Kategori CIAF</h4>
                                    <div className="h-[280px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={ciafData.distribution || []} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                <XAxis type="number" hide />
                                                <YAxis
                                                    dataKey="category"
                                                    type="category"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    width={160}
                                                    tickFormatter={(val) => ciafLabels[val] || val}
                                                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                                                />
                                                <RechartsTooltip
                                                    cursor={{ fill: '#f8fafc' }}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    formatter={(val: any, name: any, props: any) => [
                                                        `${Number(val).toLocaleString("id-ID")} anak (${props.payload.percentage}%)`,
                                                        "Jumlah"
                                                    ]}
                                                    labelFormatter={(label) => ciafLabels[label as string] || label}
                                                />
                                                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={30}>
                                                    {(ciafData.distribution || []).map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={ciafColors[entry.category] || "#cbd5e1"} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Prevalensi by Age/Gender */}
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="font-bold text-slate-700 mb-4">Prevalensi CIAF Kelompok Usia</h4>
                                        <div className="h-[180px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={ciafData.by_age || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="age_group" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}%`} />
                                                    <RechartsTooltip
                                                        cursor={{ fill: '#f8fafc' }}
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    />
                                                    <Bar dataKey="prevalence" fill="#0ea5e9" name="Prevalensi (%)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {(ciafData.by_gender || []).map((g: any, i: number) => (
                                            <div key={i} className="bg-slate-50 rounded-xl p-4 flex items-center justify-between border border-slate-200">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${g.gender === 'L' ? 'bg-blue-500' : 'bg-pink-500'}`}>
                                                        <span className="material-icons-round">{g.gender === 'L' ? 'boy' : 'girl'}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-500">{g.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
                                                        <p className="text-sm font-bold text-slate-800">{g.total.toLocaleString()} Anak</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-black text-slate-700">{g.prevalence}%</p>
                                                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Prevalensi</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Grouped Bar Chart by Area */}
                            <div className="pt-8 border-t border-slate-100">
                                <h4 className="font-bold text-slate-700 mb-2">Grafik Perbandingan Prevalensi CIAF, Stunting, Underweight, dan Wasting</h4>
                                <p className="text-xs text-slate-500 mb-6 font-medium">Berdasarkan wilayah untuk membandingkan indikator kumulatif (CIAF) dengan indikator tunggal.</p>
                                
                                <div className="h-[400px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart 
                                            data={ciafData.by_area || []} 
                                            margin={{ top: 20, right: 30, left: -10, bottom: 40 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis 
                                                dataKey="area" 
                                                tick={{ fill: '#475569', fontSize: 11 }} 
                                                axisLine={false} 
                                                tickLine={false} 
                                                angle={-45}
                                                textAnchor="end"
                                                height={60}
                                            />
                                            <YAxis 
                                                tickFormatter={(val) => `${val}%`}
                                                tick={{ fill: '#475569', fontSize: 11 }}
                                                axisLine={false} 
                                                tickLine={false} 
                                            />
                                            <RechartsTooltip
                                                cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: 12 }} />
                                            <Bar dataKey="ciaf_prevalence" name="CIAF" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="stunting_prevalence" name="Stunting" fill="#10b981" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="underweight_prevalence" name="Underweight" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="wasting_prevalence" name="Wasting" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-slate-400 flex-col">
                            <span className="material-icons-round text-4xl mb-2">bar_chart</span>
                            <p className="font-medium text-sm">Gagal memuat data CIAF</p>
                        </div>
                    )}
                </div>

                {/* Longitudinal Analysis Search */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col lg:col-span-2">
                    <div className="mb-6">
                        <h3 className="text-xl font-extrabold text-slate-800">
                            Tracking Longitudinal Balita
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Cari berdasarkan NIK untuk melihat trend pertumbuhan balita lintas periode.
                        </p>
                    </div>

                    <form onSubmit={handleSearchLongitudinal} className="flex gap-2 mb-6">
                        <div className="relative flex-1">
                            <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">badge</span>
                            <input
                                type="text"
                                placeholder="Masukkan NIK Balita (16 digit)"
                                value={searchNik}
                                onChange={(e) => setSearchNik(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-slate-700 font-mono tracking-wider"
                                maxLength={16}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loadingLongitudinal || searchNik.length < 5}
                            className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl px-5 py-3 font-bold transition-all flex items-center gap-2"
                        >
                            {loadingLongitudinal ? (
                                <span className="material-icons-round animate-spin">refresh</span>
                            ) : (
                                <span className="material-icons-round">search</span>
                            )}
                            <span className="hidden sm:inline">Cari</span>
                        </button>
                    </form>

                    {/* Longitudinal Result Empty State / Content */}
                    <div className="flex-1 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
                        {balitaInfo ? (
                            <div className="w-full h-full flex flex-col">
                                <div className="flex items-center gap-3 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                        <span className="material-icons-round">{balitaInfo.jk === 'L' ? 'boy' : 'girl'}</span>
                                    </div>
                                    <div className="text-left w-full overflow-hidden">
                                        <h4 className="font-bold text-slate-800 truncate">{balitaInfo.nama}</h4>
                                        <p className="text-xs text-slate-500">Lahir: {balitaInfo.tglLahir}</p>
                                    </div>
                                </div>
                                <div className="flex-1 min-h-[200px] w-full mt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={longitudinalData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="periode" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <YAxis domain={[-5, 5]} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                            <RechartsTooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: 11 }} />
                                            <Line type="monotone" dataKey="zs_bbu" name="BB/U" stroke="#f59e0b" strokeWidth={2} activeDot={{ r: 6 }} />
                                            <Line type="monotone" dataKey="zs_tbu" name="TB/U" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 6 }} />
                                            <Line type="monotone" dataKey="zs_bbtb" name="BB/TB" stroke="#ec4899" strokeWidth={2} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        ) : (
                            <>
                                <span className="material-icons-round text-4xl text-slate-300 mb-2">timeline</span>
                                <p className="text-sm font-semibold text-slate-500">Cari NIK untuk melihat grafik</p>
                            </>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
