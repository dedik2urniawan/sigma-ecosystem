"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell, ReferenceArea, ReferenceLine
} from "recharts";

interface Filters {
    periode: string;
    kecamatan: string;
    puskesmas: string;
    kelurahan?: string;
    userRole?: string;
    userPuskesmasId?: string | null;
}

export default function DistribusiZScoreTab({ filters }: { filters: Filters }) {
    const [loading, setLoading] = useState(true);
    const [indicator, setIndicator] = useState<"zs_bbu" | "zs_tbu" | "zs_bbtb">("zs_tbu");
    const [histogramData, setHistogramData] = useState<any[]>([]);

    useEffect(() => {
        async function fetchHistogram() {
            setLoading(true);
            try {
                const { data, error } = await supabase.rpc('get_eppgbm_zscore_histogram', {
                    p_column_name: indicator,
                    p_periode: filters.periode,
                    p_puskesmas: filters.puskesmas,
                    p_kecamatan: filters.kecamatan,
                    p_bin_size: 0.2
                });

                if (error) {
                    console.error("RPC Error:", error);
                    return;
                }

                if (data) {
                    // Calculate total N for the theoretical curve
                    const totalN = data.reduce((sum: number, row: any) => sum + Number(row.count), 0);
                    const binSize = 0.2;

                    // Compute Normal Distribution curve values
                    const processed = data.map((row: any) => {
                        const bin = Number(row.bin);
                        const count = Number(row.count);

                        // WHO Standard Normal Distribution (mu=0, sigma=1)
                        const f_x = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * Math.pow(bin, 2));
                        const theoretical_count = Math.round(totalN * binSize * f_x);

                        // Determine Z-Score classification color
                        let color = "#10b981"; // Normal (emerald)
                        if (indicator === "zs_bbu") {
                            if (bin < -3) color = "#ef4444"; // Sangat Kurang
                            else if (bin < -2) color = "#f59e0b"; // Kurang
                            else if (bin > 1) color = "#8b5cf6"; // Risiko BB Lebih
                        } else if (indicator === "zs_tbu") {
                            if (bin < -3) color = "#ef4444"; // Sangat Pendek
                            else if (bin < -2) color = "#f59e0b"; // Pendek
                            else if (bin > 3) color = "#8b5cf6"; // Tinggi
                        } else if (indicator === "zs_bbtb") {
                            if (bin < -3) color = "#ef4444"; // Gizi Buruk
                            else if (bin < -2) color = "#f59e0b"; // Gizi Kurang
                            else if (bin > 3) color = "#e11d48"; // Obesitas
                            else if (bin > 2) color = "#8b5cf6"; // Gizi Lebih
                            else if (bin > 1) color = "#3b82f6"; // Risiko Gizi Lebih
                        }

                        return {
                            bin,
                            count,
                            theoretical: theoretical_count,
                            color
                        };
                    });

                    // Ensure bins smoothly cover the range from -6 to +6 even if empty
                    const minBin = Math.min(-6, processed[0]?.bin || 0);
                    const maxBin = Math.max(6, processed[processed.length - 1]?.bin || 0);

                    const filledData = [];
                    for (let b = minBin; b <= maxBin; b = Math.round((b + 0.2) * 10) / 10) {
                        const existing = processed.find((p: any) => p.bin === b);
                        if (existing) {
                            filledData.push(existing);
                        } else {
                            const f_x = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * Math.pow(b, 2));
                            filledData.push({
                                bin: b,
                                count: 0,
                                theoretical: Math.round(totalN * binSize * f_x),
                                color: "#cbd5e1"
                            });
                        }
                    }

                    setHistogramData(filledData);
                }
            } catch (err) {
                console.error("Fetch Histogram Failed", err);
            } finally {
                setLoading(false);
            }
        }

        fetchHistogram();
    }, [filters, indicator]);

    const titleMap = {
        zs_bbu: "Berat Badan menurut Umur (BB/U)",
        zs_tbu: "Panjang/Tinggi Badan menurut Umur (PB/U atau TB/U)",
        zs_bbtb: "Berat Badan menurut Panjang/Tinggi Badan (BB/PB atau BB/TB)"
    };

    return (
        <div className="space-y-6">
            {/* Filter Controls for Indicator */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-2">
                {[
                    { id: "zs_tbu", label: "TB/U (Stunting)" },
                    { id: "zs_bbu", label: "BB/U (Underweight)" },
                    { id: "zs_bbtb", label: "BB/TB (Wasting/Obesitas)" }
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setIndicator(item.id as any)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${indicator === item.id
                            ? "bg-cyan-600 text-white shadow-md shadow-cyan-200"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Histogram View */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h3 className="text-xl font-extrabold text-slate-800">
                            Distribusi {titleMap[indicator]}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Histogram persebaran Z-Score balita berbanding dengan Kurva Referensi Standar Normal WHO.
                        </p>
                    </div>
                    {/* Legend keys mapping */}
                    <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Normal</div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Kurang/Pendek</div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"></div> Sangat Kurang/Sangat Pendek / Gizi Buruk</div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-1 bg-slate-800 rounded-full"></div> Referensi WHO</div>
                    </div>
                </div>

                {loading ? (
                    <div className="h-[400px] flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <span className="material-icons-round text-5xl text-slate-200 animate-spin">refresh</span>
                            <span className="text-sm font-bold text-slate-400 animate-pulse tracking-widest uppercase">Memuat Histogram...</span>
                        </div>
                    </div>
                ) : (
                    <div className="h-[450px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={histogramData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="bin"
                                    type="number"
                                    domain={[-6, 6]}
                                    tickCount={13}
                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                                    axisLine={{ stroke: '#cbd5e1' }}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <RechartsTooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontWeight: 600 }}
                                    labelFormatter={(val) => `Z-Score: ${Number(val).toFixed(1)}`}
                                />

                                {/* Reference Areas for WHO Classification Regions */}
                                <ReferenceArea x1={-6} x2={-3} fill="#ef4444" fillOpacity={0.03} />
                                <ReferenceArea x1={-3} x2={-2} fill="#f59e0b" fillOpacity={0.03} />
                                <ReferenceArea x1={-2} x2={indicator === 'zs_bbtb' ? 1 : indicator === 'zs_tbu' ? 3 : 1} fill="#10b981" fillOpacity={0.03} />

                                <ReferenceLine x={-2} stroke="#f59e0b" strokeDasharray="3 3" opacity={0.5} label={{ position: 'insideTopLeft', value: '-2 SD', fill: '#f59e0b', fontSize: 10, fontWeight: 'bold' }} />
                                <ReferenceLine x={-3} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} label={{ position: 'insideTopLeft', value: '-3 SD', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                                <ReferenceLine x={0} stroke="#10b981" strokeDasharray="5 5" opacity={0.5} label={{ position: 'insideTopLeft', value: 'Median (0 SD)', fill: '#10b981', fontSize: 10, fontWeight: 'bold' }} />

                                <Bar dataKey="count" name="Frekuensi Balita" maxBarSize={30} radius={[4, 4, 0, 0]}>
                                    {histogramData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>

                                <Line
                                    type="monotone"
                                    dataKey="theoretical"
                                    name="Standar WHO (Populasi Normal)"
                                    stroke="#1e293b"
                                    strokeWidth={3}
                                    dot={false}
                                    activeDot={{ r: 6, fill: '#1e293b', stroke: '#fff', strokeWidth: 2 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Context/Insight Card */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <div className="flex items-start gap-3">
                    <span className="material-icons-round text-slate-400">info</span>
                    <div>
                        <h4 className="text-sm font-bold text-slate-700">Interpretasi Kurva Z-Score</h4>
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                            Kurva garis tebal mewakili distribusi normal standar WHO. Jika grafik batang memuncak dan bergeser ke arah kiri dari kurva WHO (negatif), itu mengindikasikan bahwa masalah gizi pada populasi balita di wilayah ini lebih tinggi dibanding standar WHO. Semakin batang grafik "gemuk" ke arah area merah (kiri -2 SD), semakin besar beban masalah kesehatan lingkungan yang butuh intervensi.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
