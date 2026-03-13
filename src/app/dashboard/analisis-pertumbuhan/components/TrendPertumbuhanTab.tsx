"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
    LineChart, Line, Legend
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
    const [ciafData, setCiafData] = useState<any[]>([]);

    const [searchNik, setSearchNik] = useState("");
    const [loadingLongitudinal, setLoadingLongitudinal] = useState(false);
    const [longitudinalData, setLongitudinalData] = useState<any[]>([]);
    const [balitaInfo, setBalitaInfo] = useState<any>(null);

    // Fetch CIAF Summary
    useEffect(() => {
        async function fetchCIAF() {
            setLoadingCiaf(true);
            try {
                const { data, error } = await supabase.rpc('get_eppgbm_ciaf_summary', {
                    p_periode: filters.periode,
                    p_puskesmas: filters.puskesmas,
                    p_kecamatan: filters.kecamatan
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
        "A (Normal)": "#10b981",
        "B (Wasting)": "#f59e0b",
        "C (Wasting & Underweight)": "#ea580c",
        "D (Stunting, Wasting, Underweight)": "#b91c1c",
        "E (Stunting & Underweight)": "#e11d48",
        "F (Stunting)": "#c026d3",
        "Y (Underweight)": "#4f46e5",
        "Data Tidak Lengkap": "#94a3b8"
    };

    const totalCiaf = ciafData.reduce((sum, item) => sum + Number(item.count), 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* CIAF Classification */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                    <div className="mb-6">
                        <h3 className="text-xl font-extrabold text-slate-800">
                            Prevalensi CIAF
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Composite Index of Anthropometric Failure (Agregasi multi-indikator gizi).
                        </p>
                    </div>

                    {loadingCiaf ? (
                        <div className="h-[300px] flex items-center justify-center">
                            <span className="material-icons-round text-5xl text-cyan-200 animate-spin">refresh</span>
                        </div>
                    ) : (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={ciafData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="category"
                                        type="category"
                                        axisLine={false}
                                        tickLine={false}
                                        width={140}
                                        tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                                    />
                                    <RechartsTooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(val: any) => [
                                            `${Number(val).toLocaleString("id-ID")} anak (${((Number(val) / totalCiaf) * 100).toFixed(1)}%)`,
                                            "Jumlah"
                                        ]}
                                    />
                                    <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={30}>
                                        {ciafData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={ciafColors[entry.category] || "#cbd5e1"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Longitudinal Analysis Search */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col">
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
