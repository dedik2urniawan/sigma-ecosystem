"use client";

import React, { useMemo } from "react";
import { BultimRow } from "@/app/dashboard/pelayanan-kesehatan/page";
import { calculateCiafMetrics, calculateCiafPerVillage } from "@/lib/ciaf-data";
import dynamic from "next/dynamic";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LabelList,
} from "recharts";
import CiafTriageTable from "./CiafTriageTable";

const CiafMap = dynamic(() => import("./CiafMap"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[500px] bg-slate-100 rounded-2xl animate-pulse flex items-center justify-center">
            <span className="text-slate-400 text-sm">Memuat peta...</span>
        </div>
    ),
});

interface CiafDashboardProps {
    data: BultimRow[];
    currentPuskesmas?: string;
}

export default function CiafDashboardView({ data, currentPuskesmas }: CiafDashboardProps) {
    const metrics = useMemo(() => calculateCiafMetrics(data), [data]);
    const villageData = useMemo(() => calculateCiafPerVillage(data), [data]);

    // Prepare data for Map: Record<VillageName, RiskScore>
    const mapData = useMemo(() => {
        const record: Record<string, number> = {};
        villageData.forEach(v => {
            // Use normalized upper case name as key to match GeoJSON properties if possible,
            // but Map component handles normalization too.
            if (v.namaDesa) record[v.namaDesa] = v.riskScore;
        });
        return record;
    }, [villageData]);

    return (
        <div className="space-y-6 animation-fade-in">
            {/* ─── ZONE 1: TRUE BURDEN (KPIs) ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total CIAF Card */}
                <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-indigo-100"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg material-icons-round text-sm">
                                diversity_3
                            </span>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Total Beban CIAF
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-extrabold text-slate-800">
                                {metrics.kpi.totalCiaf.toLocaleString("id-ID")}
                            </h3>
                            <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                {metrics.kpi.ciafRate.toFixed(1)}%
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                            Total balita mengalami minimal satu kegagalan (Stunting/Wasting/Underweight).
                        </p>
                    </div>
                </div>

                {/* Group D (Critical) Card */}
                <div className="bg-gradient-to-br from-red-50 to-white rounded-2xl p-5 border border-red-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-red-100 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-red-200"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="p-2 bg-red-100 text-red-600 rounded-lg material-icons-round text-sm animate-pulse-slow">
                                warning
                            </span>
                            <span className="text-xs font-bold text-red-800 uppercase tracking-wider">
                                Kasus Kritis (Group D)
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-extrabold text-red-700">
                                {metrics.kpi.groupDCount.toLocaleString("id-ID")}
                            </h3>
                            <span className="text-sm font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                                {metrics.kpi.groupDRate.toFixed(2)}%
                            </span>
                        </div>
                        <p className="text-[10px] text-red-400 mt-2 leading-relaxed font-semibold">
                            Mengalami Stunting + Wasting + Underweight sekaligus. Butuh rujukan segera.
                        </p>
                    </div>
                </div>

                {/* Intersection Rates */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm grid grid-rows-2 divide-y divide-slate-100">
                    <div className="pb-2">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-slate-500 font-medium">Stunting + Underweight (E)</span>
                            <span className="text-sm font-bold text-slate-800">{metrics.venn.stuntingUnderweight.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="bg-purple-500 h-full rounded-full"
                                style={{ width: `${(metrics.venn.stuntingUnderweight / metrics.kpi.totalBalita) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                    <div className="pt-2">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-slate-500 font-medium">Wasting + Underweight (C)</span>
                            <span className="text-sm font-bold text-slate-800">{metrics.venn.wastingUnderweight.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="bg-orange-500 h-full rounded-full"
                                style={{ width: `${(metrics.venn.wastingUnderweight / metrics.kpi.totalBalita) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Legend / Info */}
                <div className="bg-slate-800 text-white rounded-2xl p-5 border border-slate-700 shadow-sm flex flex-col justify-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Rekomendasi Triase
                    </p>
                    <ul className="space-y-2 text-[11px]">
                        <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            <span className="text-slate-200">Group D: Rujuk RS & PKMK</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                            <span className="text-slate-200">Group C: PMT Pemulihan</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            <span className="text-slate-200">Group E: Edukasi & Sanitasi</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* ─── ZONE 2: INTERSECTION ANALYSIS ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Visual Representation */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <span className="material-icons-round text-indigo-500">bubble_chart</span>
                        Distribusi Kegagalan Pertumbuhan (CIAF)
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={metrics.distribution.filter(d => d.name !== "Group A (Normal)")} // Show only failures for detail
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" hide />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={150}
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    interval={0}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                    {metrics.distribution.filter(d => d.name !== "Group A (Normal)").map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                    <LabelList dataKey="value" position="right" fontSize={10} fontWeight="bold" fill="#475569" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Explanation Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
                    <h3 className="font-bold text-slate-800 mb-4">Klasifikasi Nandy et al. (2005)</h3>
                    <div className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4">
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0 text-red-600 font-bold border border-red-200">D</div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">Multiple Failure (Triple Burden)</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Anak mengalami Stunting, Wasting, dan Underweight secara bersamaan. Risiko mortalitas 12x lipat lebih tinggi dari anak normal.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 text-orange-600 font-bold border border-orange-200">C</div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">Wasting + Underweight</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Sangat kurus. Indikasi kekurangan asupan akut atau penyakit infeksi yang sedang berlangsung.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 text-purple-600 font-bold border border-purple-200">E</div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm">Stunting + Underweight</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Pendek dan ringan. Indikasi masalah gizi kronis yang sudah berlangsung lama.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── ZONE 3: SPATIAL ANALYSIS (MAP) ─── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <span className="material-icons-round text-lg text-indigo-500">map</span>
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Peta Sebaran Risiko Kegagalan Ganda</h3>
                        <p className="text-xs text-slate-400">Visualisasi kepadatan risiko (Group D + C + E)</p>
                    </div>
                </div>
                <CiafMap
                    data={mapData}
                    metric="risk_score"
                    selectedDesa={null}
                    selectedPuskesmas={currentPuskesmas || null}
                />
            </div>

            {/* ─── ZONE 4: TRIAGE TABLE ─── */}
            <CiafTriageTable data={villageData} />

        </div>
    );
}
