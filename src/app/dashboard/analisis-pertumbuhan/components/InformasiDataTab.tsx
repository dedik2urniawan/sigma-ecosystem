"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";

interface Filters {
    periode: string;
    kecamatan: string;
    puskesmas: string;
    kelurahan?: string;
    userRole?: string;
    userPuskesmasId?: string | null;
}

export default function InformasiDataTab({ filters }: { filters: Filters }) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        lakiLaki: 0,
        perempuan: 0,
        mismatchUnder2Standing: 0,
        mismatchOver2Supine: 0,
        ageGroups: {
            "0-5": 0, "6-11": 0, "12-23": 0, "24-35": 0, "36-47": 0, "48-59": 0, ">59": 0
        }
    });

    const [mismatchData, setMismatchData] = useState<any[]>([]);
    const [orData, setOrData] = useState<any[]>([]);

    useEffect(() => {
        async function fetchStats() {
            setLoading(true);
            try {
                // Base query builder helper
                const buildQuery = () => {
                    let q = supabase.from("data_eppgbm").select('*', { count: 'exact', head: true });
                    if (filters.periode && filters.periode !== "Semua") {
                        q = q.eq("periode", filters.periode);
                    }
                    if (filters.puskesmas && filters.puskesmas !== "Semua") {
                        q = q.eq("puskesmas", filters.puskesmas);
                    }
                    return q;
                };

                // Concurrent counting
                const [
                    totalRes, lRes, pRes,
                    mismatchUnderRes, mismatchOverRes,
                    age0_5, age6_11, age12_23, age24_35, age36_47, age48_59, ageOver59,
                    mismatchRes,
                    orRes
                ] = await Promise.all([
                    buildQuery(),
                    buildQuery().ilike("jk", "L%"),
                    buildQuery().ilike("jk", "P%"),
                    buildQuery().lt("usia_saatukur", 24).ilike("cara_ukur", "%Berdiri%"),
                    buildQuery().gte("usia_saatukur", 24).ilike("cara_ukur", "%Terlentang%"),
                    buildQuery().gte("usia_saatukur", 0).lte("usia_saatukur", 5),
                    buildQuery().gte("usia_saatukur", 6).lte("usia_saatukur", 11),
                    buildQuery().gte("usia_saatukur", 12).lte("usia_saatukur", 23),
                    buildQuery().gte("usia_saatukur", 24).lte("usia_saatukur", 35),
                    buildQuery().gte("usia_saatukur", 36).lte("usia_saatukur", 47),
                    buildQuery().gte("usia_saatukur", 48).lte("usia_saatukur", 59),
                    buildQuery().gt("usia_saatukur", 59),
                    supabase.rpc("get_eppgbm_mismatch_posisi", { 
                        p_periode: filters.periode !== "Semua" ? filters.periode : null,
                        p_puskesmas: filters.puskesmas !== "Semua" ? filters.puskesmas : null,
                        p_kelurahan: filters.kelurahan && filters.kelurahan !== "Semua" ? filters.kelurahan : null
                    }),
                    supabase.rpc("get_eppgbm_odds_ratio_stunting", {
                        p_periode: filters.periode !== "Semua" ? filters.periode : null,
                        p_puskesmas: filters.puskesmas !== "Semua" ? filters.puskesmas : null,
                        p_kelurahan: filters.kelurahan && filters.kelurahan !== "Semua" ? filters.kelurahan : null
                    })
                ]);

                setStats({
                    total: totalRes.count || 0,
                    lakiLaki: lRes.count || 0,
                    perempuan: pRes.count || 0,
                    mismatchUnder2Standing: mismatchUnderRes.count || 0,
                    mismatchOver2Supine: mismatchOverRes.count || 0,
                    ageGroups: {
                        "0-5": age0_5.count || 0,
                        "6-11": age6_11.count || 0,
                        "12-23": age12_23.count || 0,
                        "24-35": age24_35.count || 0,
                        "36-47": age36_47.count || 0,
                        "48-59": age48_59.count || 0,
                        ">59": ageOver59.count || 0,
                    }
                });

                if (mismatchRes.data) setMismatchData(mismatchRes.data);
                if (orRes.data) setOrData(orRes.data);

            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, [filters]);

    const pieData = useMemo(() => [
        { name: "Laki-laki", value: stats.lakiLaki, color: "#3b82f6" },
        { name: "Perempuan", value: stats.perempuan, color: "#ec4899" }
    ], [stats]);

    const ageData = useMemo(() => [
        { name: "0-5 Bln", count: stats.ageGroups["0-5"] },
        { name: "6-11 Bln", count: stats.ageGroups["6-11"] },
        { name: "12-23 Bln", count: stats.ageGroups["12-23"] },
        { name: "24-35 Bln", count: stats.ageGroups["24-35"] },
        { name: "36-47 Bln", count: stats.ageGroups["36-47"] },
        { name: "48-59 Bln", count: stats.ageGroups["48-59"] },
        { name: ">59 Bln", count: stats.ageGroups[">59"] },
    ], [stats]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <span className="material-icons-round text-5xl text-cyan-200 animate-spin">refresh</span>
                    <p className="text-sm font-bold text-cyan-700 animate-pulse tracking-widest uppercase">Memproses Data Agregasi...</p>
                </div>
            </div>
        );
    }

    // Only show if we actually have data, else show empty state
    if (stats.total === 0) {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center text-center">
                <span className="material-icons-round text-6xl text-slate-300 mb-4">folder_off</span>
                <h3 className="text-xl font-bold text-slate-700 mb-2">Tidak ada data</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                    Data analisis pertumbuhan belum tersedia atau tidak ada data yang cocok dengan kriteria filter saat ini.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-cyan-200/50 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-10">
                        <span className="material-icons-round text-9xl">groups</span>
                    </div>
                    <p className="text-cyan-100 text-xs font-bold uppercase tracking-wider mb-1">Total Populasi Balita</p>
                    <h3 className="text-4xl font-black tracking-tight">{stats.total.toLocaleString("id-ID")}</h3>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Balita Laki-laki</p>
                        <h3 className="text-3xl font-black text-slate-800">{stats.lakiLaki.toLocaleString("id-ID")}</h3>
                        <p className="text-xs font-semibold text-blue-500 mt-1">
                            {((stats.lakiLaki / stats.total) * 100).toFixed(1)}% dari total
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                        <span className="material-icons-round text-blue-500 text-2xl">boy</span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Balita Perempuan</p>
                        <h3 className="text-3xl font-black text-slate-800">{stats.perempuan.toLocaleString("id-ID")}</h3>
                        <p className="text-xs font-semibold text-pink-500 mt-1">
                            {((stats.perempuan / stats.total) * 100).toFixed(1)}% dari total
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center">
                        <span className="material-icons-round text-pink-500 text-2xl">girl</span>
                    </div>
                </div>

                <div className="bg-rose-50 rounded-2xl p-5 border border-rose-100 shadow-sm relative overflow-hidden group">
                    <p className="text-rose-600/70 text-xs font-bold uppercase tracking-wider mb-1 transition-all">Mismatch Posisi Ukur</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-black text-rose-600">{(stats.mismatchUnder2Standing + stats.mismatchOver2Supine).toLocaleString("id-ID")}</h3>
                        <span className="text-xs font-bold text-rose-500">Kasus</span>
                    </div>
                    <div className="mt-2 text-[10px] font-semibold text-rose-500/80 space-y-0.5">
                        <p>• {stats.mismatchUnder2Standing} anak {'<'}2th diukur berdiri</p>
                        <p>• {stats.mismatchOver2Supine} anak {'>='}2th diukur telentang</p>
                    </div>
                    <span className="material-icons-round text-4xl text-rose-200 absolute right-4 top-1/2 -translate-y-1/2 opacity-50 group-hover:scale-125 transition-transform duration-500">warning</span>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Age Distribution */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-2">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Distribusi Kelompok Usia</h3>
                            <p className="text-xs text-slate-500 mt-1">Menggunakan rentang usia standar WHO Anthro</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center">
                            <span className="material-icons-round text-cyan-600">bar_chart</span>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ageData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <RechartsTooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', fontWeight: 600 }}
                                />
                                <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} barSize={40}>
                                    {ageData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#0ea5e9" : "#38bdf8"} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gender Distribution */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col">
                    <div className="mb-2">
                        <h3 className="text-lg font-bold text-slate-800">Proporsi Gender</h3>
                    </div>
                    <div className="flex-1 min-h-[250px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%" cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontWeight: 700 }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-20px]">
                            <span className="text-3xl font-black text-slate-700">{stats.total < 1000 ? stats.total : (stats.total / 1000).toFixed(1) + 'K'}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mismatch Posisi Ukur */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 lg:p-8 shadow-sm overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                                <span className="material-icons-round text-rose-500">rule</span>
                            </div>
                            <h3 className="text-xl font-extrabold text-slate-800">Analisis Mismatch Posisi Ukur</h3>
                        </div>
                        <p className="text-sm text-slate-500">Evaluasi konsistensi posisi ukur (Berdiri/Terlentang) berdasarkan standar usia WHO Anthro</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-12">
                    {/* Left Col: Table */}
                    <div className="xl:col-span-7 flex flex-col">
                        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="py-4 px-5 font-bold text-slate-500 uppercase tracking-wider text-xs">Kelompok Usia</th>
                                        <th className="py-4 px-5 font-bold text-slate-500 uppercase tracking-wider text-xs text-center">Posisi Standar</th>
                                        <th className="py-4 px-5 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Total Balita</th>
                                        <th className="py-4 px-5 font-bold text-rose-500 uppercase tracking-wider text-xs text-right">Mismatches</th>
                                        <th className="py-4 px-5 font-bold text-rose-500 uppercase tracking-wider text-xs text-right">% Kasus</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {mismatchData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3.5 px-5 font-bold text-slate-700 whitespace-nowrap">{row.age_group}</td>
                                            <td className="py-3.5 px-5 text-center whitespace-nowrap">
                                                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold uppercase tracking-wider">
                                                    {row.expected_position}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-5 text-slate-600 font-medium text-right">{row.total.toLocaleString("id-ID")}</td>
                                            <td className="py-3.5 px-5 text-rose-600 font-bold text-right">{row.mismatch.toLocaleString("id-ID")}</td>
                                            <td className="py-3.5 px-5 text-rose-600 font-extrabold text-right">{row.percentage}%</td>
                                        </tr>
                                    ))}
                                    {mismatchData.length > 0 && (
                                        <tr className="bg-slate-50/80 border-t-2 border-slate-100">
                                            <td className="py-4 px-5 font-black text-slate-800">TOTAL KESELURUHAN</td>
                                            <td className="py-4 px-5"></td>
                                            <td className="py-4 px-5 font-bold text-slate-800 text-right">
                                                {mismatchData.reduce((acc, curr) => acc + Number(curr.total), 0).toLocaleString("id-ID")}
                                            </td>
                                            <td className="py-4 px-5 font-black text-rose-600 text-right">
                                                {mismatchData.reduce((acc, curr) => acc + Number(curr.mismatch), 0).toLocaleString("id-ID")}
                                            </td>
                                            <td className="py-4 px-5 font-black text-rose-600 text-right">
                                                {(() => {
                                                    const tot = mismatchData.reduce((acc, curr) => acc + Number(curr.total), 0);
                                                    const mism = mismatchData.reduce((acc, curr) => acc + Number(curr.mismatch), 0);
                                                    return tot > 0 ? ((mism / tot) * 100).toFixed(2) + "%" : "0%";
                                                })()}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right Col: Chart & Notes */}
                    <div className="xl:col-span-5 flex flex-col justify-between">
                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-6 flex-1 flex flex-col">
                            <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                Grafik Persentase Mismatch
                            </h4>
                            <div className="h-[200px] w-full flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={mismatchData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="age_group" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `${val}%`} />
                                        <RechartsTooltip 
                                            formatter={(value: any) => [`${value}%`, 'Mismatch']}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 600 }}
                                            cursor={{ fill: '#f1f5f9' }}
                                        />
                                        <Bar dataKey="percentage" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={32} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-5">
                            <div className="flex items-start gap-3">
                                <span className="material-icons-round text-amber-500 text-xl shrink-0">lightbulb</span>
                                <div className="text-xs text-amber-800/80 leading-relaxed font-medium">
                                    <strong className="text-amber-900 block mb-1">Pedoman Pengukuran:</strong>
                                    Anak dibawah usia 24 bulan wajib diukur panjang badannya secara terlentang (recumbent length). Sebaliknya, anak usia 24 bulan ke atas diukur tinggi badannya secara berdiri (standing height). Adanya correction factor otomatis tidak menggugurkan pentingnya kedisiplinan kader dalam mengambil posisi ukur awal.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Odds Ratio Analysis */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100/60 rounded-3xl p-6 lg:p-8 shadow-sm mb-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-200">
                        <span className="material-icons-round text-white">analytics</span>
                    </div>
                    <div>
                        <h4 className="text-xl font-extrabold text-emerald-900 tracking-tight">Analisis Odds Ratio (OR) Risiko Stunting</h4>
                        <p className="text-sm text-emerald-700/80">Perbandingan tingkat risiko balita mengalami stunting berdasarkan riwayat lahir</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {orData.map((item, idx) => {
                        let title = "";
                        let condition = "";
                        let icon = "scale";
                        let colorClass = "text-emerald-600";
                        let bgClass = "bg-emerald-50";

                        if (item.exposure === "PBLR") {
                            title = "PBLR (TB Lahir < 48 cm)";
                            condition = "PBLR";
                            icon = "height";
                        } else if (item.exposure === "BBLR") {
                            title = "BBLR (BB Lahir < 2.5 kg)";
                            condition = "BBLR";
                            icon = "monitor_weight";
                        } else {
                            title = "BBLR + PBLR";
                            condition = "BBLR & PBLR";
                            icon = "warning";
                            colorClass = "text-rose-600";
                            bgClass = "bg-rose-50";
                        }
                        
                        return (
                            <div key={idx} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                {/* Decorative Icon Background */}
                                <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                                    <span className="material-icons-round text-8xl">{icon}</span>
                                </div>
                                
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-lg ${bgClass} flex items-center justify-center`}>
                                            <span className={`material-icons-round text-[18px] ${colorClass}`}>{icon}</span>
                                        </div>
                                        <h5 className="font-bold text-slate-700 text-sm tracking-wide">{title}</h5>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className={`text-4xl font-black tracking-tighter ${colorClass}`}>
                                            {item.odds_ratio === null ? '∞' : item.odds_ratio}x
                                        </span>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lipat</span>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        Balita dengan <strong>{condition}</strong> memiliki risiko stunting <strong>{item.odds_ratio} kali lebih tinggi</strong> dibandingkan yang normal.
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-slate-100/80">
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">Tabel Kontingensi (Jumlah Kasus)</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-600 bg-slate-50/50 rounded-lg p-2 border border-slate-100">
                                        <div className="flex justify-between"><span className="text-slate-400">Stunting + {item.exposure} +</span> <span className="font-bold text-slate-700">{item.a}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-400">Stunting - {item.exposure} +</span> <span className="font-bold text-slate-700">{item.b}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-400">Stunting + {item.exposure} -</span> <span className="font-bold text-slate-700">{item.c}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-400">Stunting - {item.exposure} -</span> <span className="font-bold text-slate-700">{item.d}</span></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
