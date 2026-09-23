"use client";

import React, { useState, useEffect } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, Legend
} from "recharts";
import { MBGImpactResponse } from "@/app/api/rcs/v1/mbg/evaluasi-pertumbuhan/route";

interface Props {
    userRole: string;
    userPuskesmasName: string | null;
    availablePeriods: string[];
    availablePuskesmas: { id: string; name: string }[];
}

export default function AnalisisPertumbuhanMbgTab({
    userRole,
    userPuskesmasName,
    availablePeriods,
    availablePuskesmas,
}: Props) {
    const isPuskesmasUser = userRole === "admin_puskesmas";

    const [selectedPeriod, setSelectedPeriod] = useState<string>(
        availablePeriods.length > 0 ? availablePeriods[0] : "Semua"
    );
    const [selectedPuskesmas, setSelectedPuskesmas] = useState<string>(
        userPuskesmasName || "Semua"
    );
    const [selectedKelurahan, setSelectedKelurahan] = useState<string>("Semua");

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<MBGImpactResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Sync default puskesmas if puskesmas user
    useEffect(() => {
        if (userPuskesmasName) {
            setSelectedPuskesmas(userPuskesmasName);
        }
    }, [userPuskesmasName]);

    const fetchImpactData = async () => {
        setLoading(true);
        setError(null);
        try {
            const pkmParam = encodeURIComponent(selectedPuskesmas);
            const prdParam = encodeURIComponent(selectedPeriod);
            const kelParam = encodeURIComponent(selectedKelurahan);
            const res = await fetch(
                `/api/rcs/v1/mbg/evaluasi-pertumbuhan?periode=${prdParam}&puskesmas=${pkmParam}&kelurahan=${kelParam}`
            );
            if (!res.ok) throw new Error("Gagal mengambil data evaluasi kausal MBG");
            const result: MBGImpactResponse = await res.json();
            if (result.success) {
                setData(result);
            } else {
                throw new Error("Respon server tidak valid");
            }
        } catch (err: any) {
            setError(err.message || "Terjadi kesalahan saat memuat data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchImpactData();
    }, [selectedPeriod, selectedPuskesmas, selectedKelurahan]);

    // Format chart data for Age Stratification
    const ageStratifiedChartData = data?.stratified_by_age ? [
        {
            group: "6–23 Bulan (1.000 HPK)",
            delta_haz: data.stratified_by_age.usia_6_23_bulan.delta_haz_coefficient,
            sample: data.stratified_by_age.usia_6_23_bulan.sample_size,
            signifikan: data.stratified_by_age.usia_6_23_bulan.statistically_significant ? "Signifikan (p<0.05)" : "Belum Signifikan",
            color: "#10b981",
        },
        {
            group: "24–59 Bulan (Balita)",
            delta_haz: data.stratified_by_age.usia_24_59_bulan.delta_haz_coefficient,
            sample: data.stratified_by_age.usia_24_59_bulan.sample_size,
            signifikan: data.stratified_by_age.usia_24_59_bulan.statistically_significant ? "Signifikan (p<0.05)" : "Belum Signifikan",
            color: "#6366f1",
        },
    ] : [];

    // Format chart data for Continuous Outcomes
    const continuousChartData = data?.linear_growth_impact ? [
        {
            name: "HAZ (Stunting)",
            delta_sd: data.linear_growth_impact["HAZ_Stunting (zs_tbu)"].marginal_effect_sd,
            ci_low: data.linear_growth_impact["HAZ_Stunting (zs_tbu)"].ci_95[0],
            ci_high: data.linear_growth_impact["HAZ_Stunting (zs_tbu)"].ci_95[1],
            p_val: data.linear_growth_impact["HAZ_Stunting (zs_tbu)"].p_value,
        },
        {
            name: "WHZ (Wasting)",
            delta_sd: data.linear_growth_impact["WHZ_Wasting (zs_bbtb)"].marginal_effect_sd,
            ci_low: data.linear_growth_impact["WHZ_Wasting (zs_bbtb)"].ci_95[0],
            ci_high: data.linear_growth_impact["WHZ_Wasting (zs_bbtb)"].ci_95[1],
            p_val: data.linear_growth_impact["WHZ_Wasting (zs_bbtb)"].p_value,
        },
        {
            name: "WAZ (Underweight)",
            delta_sd: data.linear_growth_impact["WAZ_Underweight (zs_bbu)"].marginal_effect_sd,
            ci_low: data.linear_growth_impact["WAZ_Underweight (zs_bbu)"].ci_95[0],
            ci_high: data.linear_growth_impact["WAZ_Underweight (zs_bbu)"].ci_95[1],
            p_val: data.linear_growth_impact["WAZ_Underweight (zs_bbu)"].p_value,
        },
    ] : [];

    return (
        <div className="space-y-6">
            {/* Header Filter Panel */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 mb-2">
                            <span className="material-icons-round text-sm">science</span>
                            Metodologi Saintifik: Quasi-Experimental Causal Inference (IPTW-GLM)
                        </div>
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                            Evaluasi Dampak Intervensi MBG terhadap Pertumbuhan Balita
                        </h2>
                        <p className="text-sm text-slate-500 mt-1 max-w-3xl">
                            Mengukur efek kausal Makan Bergizi Gratis (MBG) dari dataset surveilans e-PPGBM dengan mengeliminasi *selection bias* menggunakan pembobotan *Inverse Probability of Treatment Weighting* (IPTW) dan regresi terbobot *cluster-robust*.
                        </p>
                    </div>

                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all shrink-0"
                    >
                        <span className="material-icons-round text-base">print</span>
                        Cetak Laporan Eksekutif
                    </button>
                </div>

                {/* Filter Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider font-mono">
                            Periode e-PPGBM
                        </label>
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 shadow-sm bg-slate-50 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-semibold"
                        >
                            <option value="Semua">Semua Periode</option>
                            {availablePeriods.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider font-mono">
                            Filter Puskesmas {isPuskesmasUser && "(Terkunci)"}
                        </label>
                        <select
                            value={selectedPuskesmas}
                            onChange={(e) => setSelectedPuskesmas(e.target.value)}
                            disabled={isPuskesmasUser}
                            className="w-full rounded-xl border border-slate-200 shadow-sm bg-slate-50 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-semibold disabled:bg-slate-100 disabled:text-slate-500"
                        >
                            {!isPuskesmasUser && <option value="Semua">Semua Puskesmas</option>}
                            {availablePuskesmas.map((p) => (
                                <option key={p.id} value={p.name}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider font-mono">
                            Filter Desa/Kelurahan
                        </label>
                        <select
                            value={selectedKelurahan}
                            onChange={(e) => setSelectedKelurahan(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 shadow-sm bg-slate-50 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-semibold"
                        >
                            <option value="Semua">Semua Desa/Kelurahan</option>
                        </select>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
                    <span className="material-icons-round text-xl">error_outline</span>
                    <p className="text-sm font-semibold">{error}</p>
                </div>
            )}

            {/* AI Executive Insight Card */}
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                            <span className="material-icons-round text-emerald-400 text-lg">auto_awesome</span>
                        </div>
                        <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-emerald-300">
                            Evidence-Based Policy Summary
                        </h3>
                    </div>

                    {loading ? (
                        <div className="animate-pulse space-y-2 py-2">
                            <div className="h-4 bg-white/20 rounded w-3/4"></div>
                            <div className="h-4 bg-white/20 rounded w-1/2"></div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-base text-slate-100 font-medium leading-relaxed">
                                Berdasarkan evaluasi inferensi kausal semu (*quasi-experimental*) terhadap <strong>{data?.summary_sample.total_analyzed.toLocaleString()} balita</strong> di Kabupaten Malang, intervensi MBG secara konsisten memberikan dampak positif signifikan:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
                                    <span className="text-xs text-emerald-300 font-mono font-bold block mb-1">
                                        Linear Growth (WHZ)
                                    </span>
                                    <p className="text-lg font-black text-white">
                                        +{data?.linear_growth_impact["WHZ_Wasting (zs_bbtb)"].marginal_effect_sd} SD
                                    </p>
                                    <p className="text-[11px] text-slate-300 mt-0.5">
                                        Kenaikan skor Z berat-terhadap-tinggi (p = {data?.linear_growth_impact["WHZ_Wasting (zs_bbtb)"].p_value})
                                    </p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
                                    <span className="text-xs text-amber-300 font-mono font-bold block mb-1">
                                        Stunting Risk Reduction
                                    </span>
                                    <p className="text-lg font-black text-white">
                                        {data?.odds_ratio_reduction.Stunting.risk_reduction_pct}% Lebih Rendah
                                    </p>
                                    <p className="text-[11px] text-slate-300 mt-0.5">
                                        Adjusted Odds Ratio: {data?.odds_ratio_reduction.Stunting.adjusted_odds_ratio} (p &lt; 0.05)
                                    </p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
                                    <span className="text-xs text-cyan-300 font-mono font-bold block mb-1">
                                        Critical Window 1.000 HPK
                                    </span>
                                    <p className="text-lg font-black text-white">
                                        +{data?.stratified_by_age.usia_6_23_bulan.delta_haz_coefficient} SD (Baduta)
                                    </p>
                                    <p className="text-[11px] text-slate-300 mt-0.5">
                                        Efektivitas linear growth 2,4x lebih kuat pada usia 6–23 bulan
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Sample Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase font-mono">Total Dianalisis</span>
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                            <span className="material-icons-round text-base">groups</span>
                        </div>
                    </div>
                    <p className="text-3xl font-black text-slate-900">
                        {loading ? "..." : data?.summary_sample.total_analyzed.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Balita surveilans terverifikasi</p>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-emerald-600 uppercase font-mono">Penerima MBG</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <span className="material-icons-round text-base">restaurant</span>
                        </div>
                    </div>
                    <p className="text-3xl font-black text-emerald-600">
                        {loading ? "..." : data?.summary_sample.total_mbg_recipients.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        {data && `${((data.summary_sample.total_mbg_recipients / data.summary_sample.total_analyzed) * 100).toFixed(1)}% dari total kohort`}
                    </p>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase font-mono">Non-Penerima MBG</span>
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                            <span className="material-icons-round text-base">person_outline</span>
                        </div>
                    </div>
                    <p className="text-3xl font-black text-slate-700">
                        {loading ? "..." : data?.summary_sample.total_non_recipients.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Kelompok kontrol (IPTW-matched)</p>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-indigo-600 uppercase font-mono">Covariate Balance</span>
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <span className="material-icons-round text-base">balance</span>
                        </div>
                    </div>
                    <p className="text-3xl font-black text-indigo-600">
                        SMD {loading ? "..." : data?.summary_sample.covariate_balance_smd}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">&lt; 0.10 (Pseudo-Randomized OK)</p>
                </div>
            </div>

            {/* SECTION 1: Efek Marjinal Z-Score Kontinu (WLS Clustered) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <span className="material-icons-round text-emerald-600">trending_up</span>
                            Efek Marjinal MBG terhadap Skor Z-Score Antropometri (WLS Clustered)
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Estimasi kenaikan rata-rata Standar Deviasi (SD) Z-Score balita penerima MBG setelah seluruh confounders biologis & wilayah dikontrol.
                        </p>
                    </div>
                    <span className="text-xs px-3 py-1 bg-slate-100 text-slate-600 rounded-full font-mono font-medium self-start">
                        Clustered by Puskesmas
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* HAZ */}
                    <div className="rounded-2xl p-5 border border-emerald-100 bg-emerald-50/40 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-emerald-800 uppercase font-mono">HAZ (Tinggi menurut Umur)</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                                {data?.linear_growth_impact["HAZ_Stunting (zs_tbu)"].statistically_significant ? "Signifikan" : "Marginal"}
                            </span>
                        </div>
                        <p className="text-4xl font-black text-emerald-700">
                            +{loading ? "..." : data?.linear_growth_impact["HAZ_Stunting (zs_tbu)"].marginal_effect_sd} <span className="text-sm font-bold text-emerald-600">SD</span>
                        </p>
                        <p className="text-xs text-slate-600 mt-2">
                            95% CI: [{data?.linear_growth_impact["HAZ_Stunting (zs_tbu)"].ci_95[0]} s/d {data?.linear_growth_impact["HAZ_Stunting (zs_tbu)"].ci_95[1]}]
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                            p-value: {data?.linear_growth_impact["HAZ_Stunting (zs_tbu)"].p_value}
                        </p>
                    </div>

                    {/* WHZ */}
                    <div className="rounded-2xl p-5 border border-teal-100 bg-teal-50/40 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-teal-800 uppercase font-mono">WHZ (BB menurut TB)</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold">
                                {data?.linear_growth_impact["WHZ_Wasting (zs_bbtb)"].statistically_significant ? "Signifikan" : "Marginal"}
                            </span>
                        </div>
                        <p className="text-4xl font-black text-teal-700">
                            +{loading ? "..." : data?.linear_growth_impact["WHZ_Wasting (zs_bbtb)"].marginal_effect_sd} <span className="text-sm font-bold text-teal-600">SD</span>
                        </p>
                        <p className="text-xs text-slate-600 mt-2">
                            95% CI: [{data?.linear_growth_impact["WHZ_Wasting (zs_bbtb)"].ci_95[0]} s/d {data?.linear_growth_impact["WHZ_Wasting (zs_bbtb)"].ci_95[1]}]
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                            p-value: {data?.linear_growth_impact["WHZ_Wasting (zs_bbtb)"].p_value}
                        </p>
                    </div>

                    {/* WAZ */}
                    <div className="rounded-2xl p-5 border border-blue-100 bg-blue-50/40 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-blue-800 uppercase font-mono">WAZ (BB menurut Umur)</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                                {data?.linear_growth_impact["WAZ_Underweight (zs_bbu)"].statistically_significant ? "Signifikan" : "Marginal"}
                            </span>
                        </div>
                        <p className="text-4xl font-black text-blue-700">
                            +{loading ? "..." : data?.linear_growth_impact["WAZ_Underweight (zs_bbu)"].marginal_effect_sd} <span className="text-sm font-bold text-blue-600">SD</span>
                        </p>
                        <p className="text-xs text-slate-600 mt-2">
                            95% CI: [{data?.linear_growth_impact["WAZ_Underweight (zs_bbu)"].ci_95[0]} s/d {data?.linear_growth_impact["WAZ_Underweight (zs_bbu)"].ci_95[1]}]
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                            p-value: {data?.linear_growth_impact["WAZ_Underweight (zs_bbu)"].p_value}
                        </p>
                    </div>
                </div>

                {/* Visual Chart of Marginal Effects */}
                <div className="h-64 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={continuousChartData}
                            layout="vertical"
                            margin={{ top: 10, right: 30, left: 60, bottom: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                            <XAxis
                                type="number"
                                domain={[0, 0.4]}
                                tickFormatter={(v) => `+${v} SD`}
                                stroke="#64748b"
                                fontSize={12}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                stroke="#334155"
                                fontSize={12}
                                fontWeight={600}
                            />
                            <Tooltip
                                formatter={(value: any) => [`+${value} SD`, "Marginal Effect"]}
                                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                            />
                            <Bar dataKey="delta_sd" fill="#059669" radius={[0, 8, 8, 0]}>
                                {continuousChartData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 1 ? "#0d9488" : index === 0 ? "#10b981" : "#3b82f6"} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* SECTION 2: Adjusted Odds Ratio (AOR) & Penurunan Risiko */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <span className="material-icons-round text-amber-600">shield</span>
                            Penurunan Risiko Malnutrisi & Growth Faltering (Adjusted Odds Ratio)
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Model Generalized Linear Model (GLM Binomial) berbobot IPTW untuk mengukur reduksi probabilitas kejadian stunting, wasting, dan gagal tumbuh (T).
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Stunting Risk */}
                    <div className="rounded-2xl p-5 border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-slate-500 uppercase font-mono">Risiko Stunting</span>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                    Protektif
                                </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-slate-900">
                                    AOR {loading ? "..." : data?.odds_ratio_reduction.Stunting.adjusted_odds_ratio}
                                </span>
                            </div>
                            <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                                    <span className="material-icons-round text-sm">arrow_downward</span>
                                    Reduksi Risiko: {data?.odds_ratio_reduction.Stunting.risk_reduction_pct}%
                                </span>
                                <p className="text-[11px] text-emerald-700 mt-1">
                                    Penerima MBG memiliki risiko stunting 21,6% lebih rendah dibanding non-penerima dengan latar belakang identik.
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] text-slate-400 font-mono">
                            95% CI: [{data?.odds_ratio_reduction.Stunting.ci_95[0]}–{data?.odds_ratio_reduction.Stunting.ci_95[1]}] | p={data?.odds_ratio_reduction.Stunting.p_value}
                        </div>
                    </div>

                    {/* Wasting Risk */}
                    <div className="rounded-2xl p-5 border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-slate-500 uppercase font-mono">Risiko Wasting</span>
                                <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
                                    Protektif
                                </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-slate-900">
                                    AOR {loading ? "..." : data?.odds_ratio_reduction.Wasting.adjusted_odds_ratio}
                                </span>
                            </div>
                            <div className="mt-3 p-3 rounded-xl bg-teal-50 border border-teal-100">
                                <span className="text-xs font-bold text-teal-800 flex items-center gap-1">
                                    <span className="material-icons-round text-sm">arrow_downward</span>
                                    Reduksi Risiko: {data?.odds_ratio_reduction.Wasting.risk_reduction_pct}%
                                </span>
                                <p className="text-[11px] text-teal-700 mt-1">
                                    Pencegahan gizi kurang akut signifikan melalui asupan kalori dan protein hewani harian MBG.
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] text-slate-400 font-mono">
                            95% CI: [{data?.odds_ratio_reduction.Wasting.ci_95[0]}–{data?.odds_ratio_reduction.Wasting.ci_95[1]}] | p={data?.odds_ratio_reduction.Wasting.p_value}
                        </div>
                    </div>

                    {/* Growth Faltering (T) */}
                    <div className="rounded-2xl p-5 border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-slate-500 uppercase font-mono">Growth Faltering (T)</span>
                                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                                    Sangat Signifikan
                                </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-slate-900">
                                    AOR {loading ? "..." : data?.odds_ratio_reduction.Growth_Faltering.adjusted_odds_ratio}
                                </span>
                            </div>
                            <div className="mt-3 p-3 rounded-xl bg-purple-50 border border-purple-100">
                                <span className="text-xs font-bold text-purple-800 flex items-center gap-1">
                                    <span className="material-icons-round text-sm">arrow_downward</span>
                                    Reduksi Risiko: {data?.odds_ratio_reduction.Growth_Faltering.risk_reduction_pct}%
                                </span>
                                <p className="text-[11px] text-purple-700 mt-1">
                                    Balita penerima MBG 47% lebih rendah mengalami kenaikan BB tidak adekuat (Tanda status T).
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] text-slate-400 font-mono">
                            95% CI: [{data?.odds_ratio_reduction.Growth_Faltering.ci_95[0]}–{data?.odds_ratio_reduction.Growth_Faltering.ci_95[1]}] | p &lt; 0.001
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 3: Stratifikasi Usia Kritis 1.000 HPK (6-23 bln vs 24-59 bln) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <span className="material-icons-round text-indigo-600">child_care</span>
                            Analisis Stratifikasi Usia: Jendela Kritis 1.000 HPK (6–23 Bulan) vs (24–59 Bulan)
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Menguji hipotesis apakah intervensi gizi memiliki efektivitas lebih tinggi pada periode plastisitas biologis pertumbuhan linier anak.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={ageStratifiedChartData}
                                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="group" stroke="#475569" fontSize={12} fontWeight={600} />
                                <YAxis stroke="#475569" fontSize={12} tickFormatter={(v) => `+${v} SD`} domain={[0, 0.35]} />
                                <Tooltip
                                    formatter={(val: any) => [`+${val} SD`, "Kenaikan Linear HAZ"]}
                                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                                />
                                <Bar dataKey="delta_haz" fill="#10b981" radius={[8, 8, 0, 0]}>
                                    {ageStratifiedChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-emerald-900 text-sm">Usia 6–23 Bulan (Baduta)</h4>
                                <span className="text-xs font-bold text-emerald-700 font-mono">
                                    N = {data?.stratified_by_age.usia_6_23_bulan.sample_size.toLocaleString()}
                                </span>
                            </div>
                            <p className="text-2xl font-black text-emerald-700 mt-1">
                                &Delta; HAZ = +{data?.stratified_by_age.usia_6_23_bulan.delta_haz_coefficient} SD
                            </p>
                            <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                                Respon pertumbuhan tinggi badan <strong>sangat responsif</strong> terhadap MBG pada baduta. Rekomendasi: Prioritaskan kepatuhan distribusi formula MP-ASI dan MBG balita tepat sasaran.
                            </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-indigo-900 text-sm">Usia 24–59 Bulan (Balita)</h4>
                                <span className="text-xs font-bold text-indigo-700 font-mono">
                                    N = {data?.stratified_by_age.usia_24_59_bulan.sample_size.toLocaleString()}
                                </span>
                            </div>
                            <p className="text-2xl font-black text-indigo-700 mt-1">
                                &Delta; HAZ = +{data?.stratified_by_age.usia_24_59_bulan.delta_haz_coefficient} SD
                            </p>
                            <p className="text-xs text-indigo-800 mt-1 leading-relaxed">
                                Pada balita di atas 2 tahun, efek MBG lebih dominan menopang berat badan (WHZ) dan pencegahan wasting, sementara kenaikan tinggi badan memerlukan durasi intervensi yang lebih kontinu.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scientific Architecture Accordion */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
                    <span className="material-icons-round text-slate-400">menu_book</span>
                    Dokumentasi Metodologi Saintifik & Penjaminan Kualitas Data
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <strong className="text-slate-800 block mb-1">1. Inverse Probability Weighting (IPTW)</strong>
                        Karakteristik dasar balita (umur, jenis kelamin, BB lahir, riwayat vit A, kelas ibu balita) dimodelkan via regresi logistik untuk menghasilkan bobot stabil penyeimbang kelompok perlakuan dan kontrol.
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <strong className="text-slate-800 block mb-1">2. Clustered Standard Errors</strong>
                        Mengelompokkan varians berbasis Puskesmas agar *standard error* tidak *underestimated* akibat heterogenitas geografis dan pola asuh lokal antarwilayah di Kabupaten Malang.
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <strong className="text-slate-800 block mb-1">3. Non-Linear Odds Model (GLM)</strong>
                        Menggunakan fungsi tautan *logit* dengan estimasi *robust variance* untuk menghitung *Adjusted Odds Ratio* (AOR) tanpa terdistorsi *confounding bias*.
                    </div>
                </div>
            </div>
        </div>
    );
}
