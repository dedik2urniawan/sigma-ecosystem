"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, ZAxis, ReferenceLine
} from "recharts";

interface Filters {
    periode: string;
    kecamatan: string;
    puskesmas: string;
    kelurahan?: string;
    userRole?: string;
    userPuskesmasId?: string | null;
}

export default function DifferensiasiPrevalensiTab({ filters }: { filters: Filters }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const { data: rawData, error } = await supabase.rpc('get_eppgbm_prevalensi_stunting_wilayah', {
                    p_periode: filters.periode,
                    p_puskesmas: filters.puskesmas,
                    p_kecamatan: filters.kecamatan
                });

                if (!error && rawData) {
                    const formatted = rawData.map((d: any) => ({
                        ...d,
                        prevalensi: Number(d.prevalensi),
                        total_sasaran: Number(d.total_sasaran),
                        total_stunting: Number(d.total_stunting),
                        color: Number(d.prevalensi) >= 20 ? "#ef4444"
                            : Number(d.prevalensi) >= 10 ? "#f59e0b"
                                : "#10b981"
                    }));
                    setData(formatted);
                }
            } catch (err) {
                console.error("Fetch Differensiasi Error", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [filters]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-slate-100">
                    <p className="font-bold text-slate-800 text-sm">{data.kelurahan}</p>
                    <p className="text-xs text-slate-500 mb-2">{data.puskesmas} - {data.kecamatan}</p>
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-rose-600">Prevalensi Stunting: {data.prevalensi}%</p>
                        <p className="text-xs font-medium text-slate-600">Total Balita Stunting: {data.total_stunting}</p>
                        <p className="text-xs font-medium text-slate-600">Total Sasaran (N): {data.total_sasaran}</p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-xl font-extrabold text-slate-800">
                            Peta Scatter Differensiasi Prevalensi Stunting
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                            Visualisasi sebaran Kelurahan/Desa berdasarkan persentase prevalensi stunting (Sumbu X) dan ukuran populasi balita (Sumbu Y). Kuadran Kanan Atas menunjukkan prioritas intervensi utama.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> {'<'}10% (Rendah)</div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500"></div> 10-20% (Sedang)</div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"></div> {'>'}20% (Tinggi/Kritis)</div>
                    </div>
                </div>

                {loading ? (
                    <div className="h-[500px] flex items-center justify-center">
                        <span className="material-icons-round text-5xl text-cyan-200 animate-spin">refresh</span>
                    </div>
                ) : data.length === 0 ? (
                    <div className="h-[500px] flex flex-col items-center justify-center text-slate-400">
                        <span className="material-icons-round text-6xl opacity-50 mb-4">location_off</span>
                        <p>Tidak ada data wilayah untuk filter ini</p>
                    </div>
                ) : (
                    <div className="h-[500px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis
                                    type="number"
                                    dataKey="prevalensi"
                                    name="Prevalensi"
                                    unit="%"
                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                                    label={{ value: 'Prevalensi Stunting (%)', position: 'insideBottom', offset: -15, fill: '#64748b', fontSize: 12, fontWeight: 'bold' }}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="total_sasaran"
                                    name="Sasaran"
                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                                    label={{ value: 'Total Sasaran (Populasi Balita)', angle: -90, position: 'insideLeft', offset: 0, fill: '#64748b', fontSize: 12, fontWeight: 'bold' }}
                                />
                                <ZAxis type="number" dataKey="total_sasaran" range={[40, 400]} name="Ukuran" />
                                <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />

                                <ReferenceLine x={20} stroke="#ef4444" strokeDasharray="5 5" opacity={0.5} label={{ position: 'insideTopRight', value: 'Batas Kritis (20%)', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                                <ReferenceLine x={10} stroke="#f59e0b" strokeDasharray="5 5" opacity={0.5} label={{ position: 'insideTopLeft', value: 'Batas Sedang (10%)', fill: '#f59e0b', fontSize: 10, fontWeight: 'bold' }} />

                                <Scatter data={data} name="Desa/Kelurahan">
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} opacity={0.8} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* List Table of High Priority Areas */}
            {!loading && data.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Top 15 Wilayah Prioritas (Prevalensi Tertinggi)</h3>
                            <p className="text-xs text-slate-500 mt-1">Berdasarkan data {filters.periode === 'Semua' ? 'semua periode' : `periode ${filters.periode}`}</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto -mx-6 px-6">
                        <table className="w-full text-xs text-left">
                            <thead>
                                <tr className="border-b-2 border-slate-100">
                                    <th className="py-3 px-4 font-bold text-slate-500 uppercase whitespace-nowrap">Kelurahan</th>
                                    <th className="py-3 px-4 font-bold text-slate-500 uppercase whitespace-nowrap">Puskesmas</th>
                                    <th className="py-3 px-4 font-bold text-slate-500 uppercase whitespace-nowrap text-right">Sasaran</th>
                                    <th className="py-3 px-4 font-bold text-slate-500 uppercase whitespace-nowrap text-right">Stunting</th>
                                    <th className="py-3 px-4 font-bold text-slate-500 uppercase whitespace-nowrap text-right">Prevalensi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.slice(0, 15).map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 px-4 font-bold text-slate-800">{row.kelurahan}</td>
                                        <td className="py-3 px-4 text-slate-600">{row.puskesmas}</td>
                                        <td className="py-3 px-4 text-slate-700 text-right font-mono">{row.total_sasaran.toLocaleString('id-ID')}</td>
                                        <td className="py-3 px-4 text-rose-600 font-bold text-right font-mono">{row.total_stunting.toLocaleString('id-ID')}</td>
                                        <td className="py-3 px-4 text-right">
                                            <span className={`px-2 py-1 rounded-md font-bold ${row.prevalensi >= 20 ? 'bg-red-100 text-red-700' : row.prevalensi >= 10 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-600'}`}>
                                                {row.prevalensi}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
