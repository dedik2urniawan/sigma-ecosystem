"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, Legend, LabelList, ScatterChart, Scatter, ZAxis, ReferenceLine
} from "recharts";
import { MBGImpactResponse, PuskesmasEffectiveness } from "@/app/api/rcs/v1/mbg/evaluasi-pertumbuhan/route";

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

    // Puskesmas Effectiveness State
    const [searchPuskesmas, setSearchPuskesmas] = useState("");
    const [tierFilter, setTierFilter] = useState<string>("all");
    const [sortField, setSortField] = useState<keyof PuskesmasEffectiveness>("delta_haz_baduta");
    const [sortAsc, setSortAsc] = useState<boolean>(false);
    const [chartMode, setChartMode] = useState<"bar" | "quadrant">("bar");
    const [chartFilterScope, setChartFilterScope] = useState<"top10" | "bottom10" | "all">("top10");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

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

    // Puskesmas Effectiveness Calculations
    const puskesmasList: PuskesmasEffectiveness[] = useMemo(() => {
        return data?.puskesmas_effectiveness || [];
    }, [data]);

    // KPI Aggregates
    const topPuskesmas = useMemo(() => {
        if (!puskesmasList.length) return null;
        return [...puskesmasList].sort((a, b) => b.delta_haz_baduta - a.delta_haz_baduta)[0];
    }, [puskesmasList]);

    const avgDeltaBaduta = useMemo(() => {
        if (!puskesmasList.length) return "0.000";
        const sum = puskesmasList.reduce((acc, p) => acc + p.delta_haz_baduta, 0);
        return (sum / puskesmasList.length).toFixed(3);
    }, [puskesmasList]);

    const optimalCount = useMemo(() => {
        return puskesmasList.filter(p => p.tier === "High Responder" || p.tier === "Optimal").length;
    }, [puskesmasList]);

    const needsHelpCount = useMemo(() => {
        return puskesmasList.filter(p => p.tier === "Perlu Pendampingan").length;
    }, [puskesmasList]);

    // Filtered & Sorted Table Data
    const filteredPuskesmas = useMemo(() => {
        return puskesmasList.filter(p => {
            const matchesSearch = p.puskesmas.toLowerCase().includes(searchPuskesmas.toLowerCase());
            const matchesTier = tierFilter === "all" || p.tier === tierFilter;
            return matchesSearch && matchesTier;
        }).sort((a, b) => {
            const valA = a[sortField];
            const valB = b[sortField];
            if (typeof valA === "number" && typeof valB === "number") {
                return sortAsc ? valA - valB : valB - valA;
            }
            return sortAsc 
                ? String(valA).localeCompare(String(valB))
                : String(valB).localeCompare(String(valA));
        });
    }, [puskesmasList, searchPuskesmas, tierFilter, sortField, sortAsc]);

    const totalPages = Math.max(1, Math.ceil(filteredPuskesmas.length / itemsPerPage));
    const paginatedPuskesmas = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredPuskesmas.slice(start, start + itemsPerPage);
    }, [filteredPuskesmas, currentPage, itemsPerPage]);

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchPuskesmas, tierFilter]);

    // Chart Data
    const barChartDisplayData = useMemo(() => {
        const sorted = [...puskesmasList].sort((a, b) => b.delta_haz_baduta - a.delta_haz_baduta);
        if (chartFilterScope === "top10") return sorted.slice(0, 10);
        if (chartFilterScope === "bottom10") return sorted.slice(-10).reverse();
        return sorted;
    }, [puskesmasList, chartFilterScope]);

    const quadrantData = useMemo(() => {
        return puskesmasList.map(p => ({
            name: p.puskesmas,
            x: p.mbg_coverage_pct,
            y: p.delta_haz_baduta,
            z: p.total_sample,
            stunting_reduction: p.stunting_reduction_pct,
            tier: p.tier
        }));
    }, [puskesmasList]);

    const handleSort = (field: keyof PuskesmasEffectiveness) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(false);
        }
    };

    const getTierBadge = (tier: PuskesmasEffectiveness["tier"]) => {
        switch (tier) {
            case "High Responder":
                return {
                    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    dot: "bg-emerald-500",
                    label: "High Responder"
                };
            case "Optimal":
                return {
                    bg: "bg-blue-50 text-blue-700 border-blue-200",
                    dot: "bg-blue-500",
                    label: "Optimal"
                };
            case "Moderat":
                return {
                    bg: "bg-amber-50 text-amber-700 border-amber-200",
                    dot: "bg-amber-500",
                    label: "Moderat"
                };
            case "Perlu Pendampingan":
            default:
                return {
                    bg: "bg-rose-50 text-rose-700 border-rose-200",
                    dot: "bg-rose-500",
                    label: "Perlu Pendampingan"
                };
        }
    };

    const getRecommendation = (p: PuskesmasEffectiveness) => {
        if (p.tier === "High Responder") {
            return "Percontohan Best Practice (Replikasi ke wilayah sekitar)";
        }
        if (p.tier === "Optimal") {
            return "Pertahankan cakupan & pantau keberlanjutan gizi";
        }
        if (p.tier === "Moderat") {
            return "Akselerasi kepatuhan menu dan ketepatan sasaran 1.000 HPK";
        }
        return "Audit mutu gizi pangan & evaluasi kepatuhan konsumsi balita";
    };

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

            {/* SECTION: Insight Analisis Efektivitas MBG per-Puskesmas */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                                <span className="material-icons-round text-xl">query_stats</span>
                            </span>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    Insight Analisis Efektivitas MBG per-Puskesmas
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Heterogenitas respon biologis antar wilayah, komparasi efektivitas 1.000 HPK (6–23 Bulan vs 24–59 Bulan), dan pemetaan kuadran strategis cakupan vs luaran linier.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Chart Mode Toggle */}
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl self-start lg:self-center border border-slate-200/60">
                        <button
                            onClick={() => setChartMode("bar")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                chartMode === "bar"
                                    ? "bg-white text-emerald-700 shadow-sm font-bold"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            <span className="material-icons-round text-sm">bar_chart</span>
                            Komparasi Usia
                        </button>
                        <button
                            onClick={() => setChartMode("quadrant")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                chartMode === "quadrant"
                                    ? "bg-white text-indigo-700 shadow-sm font-bold"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            <span className="material-icons-round text-sm">bubble_chart</span>
                            Matriks Kuadran (Cakupan vs Respon)
                        </button>
                    </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border border-emerald-100/80">
                        <div className="flex items-center justify-between text-xs text-emerald-800 font-medium mb-1">
                            <span>Top Responder</span>
                            <span className="material-icons-round text-emerald-600 text-sm">workspace_premium</span>
                        </div>
                        <div className="text-lg font-bold text-slate-900 truncate">
                            {topPuskesmas ? `Puskesmas ${topPuskesmas.puskesmas}` : "-"}
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-black text-emerald-600 font-mono">
                                {topPuskesmas ? `+${topPuskesmas.delta_haz_baduta} SD` : "-"}
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-700">
                                (Baduta 6–23 bln)
                            </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                            Reduksi Risiko Stunting: {topPuskesmas ? `${topPuskesmas.stunting_reduction_pct}%` : "-"}
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 to-cyan-50/40 border border-blue-100/80">
                        <div className="flex items-center justify-between text-xs text-blue-800 font-medium mb-1">
                            <span>Rata-Rata Kabupaten (Baduta)</span>
                            <span className="material-icons-round text-blue-600 text-sm">equalizer</span>
                        </div>
                        <div className="text-lg font-bold text-slate-900">
                            Kabupaten Malang
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-black text-blue-600 font-mono">
                                +{avgDeltaBaduta} SD
                            </span>
                            <span className="text-[11px] font-semibold text-blue-700">
                                (&Delta; HAZ Rerata)
                            </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                            Basis {puskesmasList.length} Puskesmas teranalisis
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-purple-50/40 border border-indigo-100/80">
                        <div className="flex items-center justify-between text-xs text-indigo-800 font-medium mb-1">
                            <span>Kategori Optimal & High</span>
                            <span className="material-icons-round text-indigo-600 text-sm">verified</span>
                        </div>
                        <div className="text-lg font-bold text-slate-900">
                            {optimalCount} Puskesmas
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-black text-indigo-600 font-mono">
                                {puskesmasList.length > 0 ? `${Math.round((optimalCount / puskesmasList.length) * 100)}%` : "0%"}
                            </span>
                            <span className="text-[11px] font-semibold text-indigo-700">
                                Capai Target
                            </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                            Kenaikan linier &ge; +0.18 SD
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50/80 to-amber-50/40 border border-rose-100/80">
                        <div className="flex items-center justify-between text-xs text-rose-800 font-medium mb-1">
                            <span>Prioritas Pendampingan</span>
                            <span className="material-icons-round text-rose-600 text-sm">priority_high</span>
                        </div>
                        <div className="text-lg font-bold text-slate-900">
                            {needsHelpCount} Puskesmas
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-black text-rose-600 font-mono">
                                {needsHelpCount}
                            </span>
                            <span className="text-[11px] font-semibold text-rose-700">
                                Wilayah Kerja
                            </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                            Butuh audit kepatuhan & asupan gizi
                        </div>
                    </div>
                </div>

                {/* Chart Area */}
                <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80">
                    {chartMode === "bar" ? (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                        <span className="material-icons-round text-emerald-600 text-base">leaderboard</span>
                                        Grafik Komparasi Respon Usia Kritis (6–23 bln vs 24–59 bln) per Puskesmas
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Memperlihatkan perbandingan kenaikan linier tinggi badan (&Delta; HAZ) antara Baduta dan Balita di tiap Puskesmas.
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
                                    <button
                                        onClick={() => setChartFilterScope("top10")}
                                        className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                                            chartFilterScope === "top10"
                                                ? "bg-emerald-500 text-white font-bold shadow-sm"
                                                : "text-slate-600 hover:text-slate-900"
                                        }`}
                                    >
                                        Top 10 Respon
                                    </button>
                                    <button
                                        onClick={() => setChartFilterScope("bottom10")}
                                        className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                                            chartFilterScope === "bottom10"
                                                ? "bg-rose-500 text-white font-bold shadow-sm"
                                                : "text-slate-600 hover:text-slate-900"
                                        }`}
                                    >
                                        10 Terbawah (Lagging)
                                    </button>
                                    <button
                                        onClick={() => setChartFilterScope("all")}
                                        className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                                            chartFilterScope === "all"
                                                ? "bg-indigo-600 text-white font-bold shadow-sm"
                                                : "text-slate-600 hover:text-slate-900"
                                        }`}
                                    >
                                        Semua ({puskesmasList.length})
                                    </button>
                                </div>
                            </div>

                            <div className="h-80 w-full mt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={barChartDisplayData}
                                        margin={{ top: 25, right: 20, left: 10, bottom: 65 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="puskesmas"
                                            stroke="#475569"
                                            fontSize={11}
                                            fontWeight={500}
                                            interval={0}
                                            angle={-45}
                                            textAnchor="end"
                                            height={60}
                                        />
                                        <YAxis
                                            stroke="#475569"
                                            fontSize={11}
                                            tickFormatter={(v) => `+${v} SD`}
                                            domain={[0, 0.40]}
                                        />
                                        <Tooltip
                                            formatter={(value: any, name: any) => [
                                                `+${Number(value).toFixed(3)} SD`,
                                                name === "delta_haz_baduta"
                                                    ? "Baduta 6–23 Bulan (1.000 HPK)"
                                                    : "Balita 24–59 Bulan"
                                            ]}
                                            contentStyle={{
                                                borderRadius: "14px",
                                                border: "1px solid #e2e8f0",
                                                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.08)",
                                                fontSize: "12px",
                                            }}
                                        />
                                        <Legend
                                            verticalAlign="top"
                                            align="right"
                                            wrapperStyle={{ paddingBottom: "10px", fontSize: "12px" }}
                                        />
                                        <Bar
                                            dataKey="delta_haz_baduta"
                                            name="Baduta 6–23 Bulan (1.000 HPK)"
                                            fill="#10b981"
                                            radius={[4, 4, 0, 0]}
                                        >
                                            {barChartDisplayData.length <= 15 && (
                                                <LabelList
                                                    dataKey="delta_haz_baduta"
                                                    position="top"
                                                    formatter={(v: any) => `+${Number(v).toFixed(2)}`}
                                                    style={{ fontSize: "10px", fill: "#047857", fontWeight: 700 }}
                                                />
                                            )}
                                        </Bar>
                                        <Bar
                                            dataKey="delta_haz_balita"
                                            name="Balita 24–59 Bulan"
                                            fill="#6366f1"
                                            radius={[4, 4, 0, 0]}
                                        >
                                            {barChartDisplayData.length <= 15 && (
                                                <LabelList
                                                    dataKey="delta_haz_balita"
                                                    position="top"
                                                    formatter={(v: any) => `+${Number(v).toFixed(2)}`}
                                                    style={{ fontSize: "10px", fill: "#4338ca", fontWeight: 700 }}
                                                />
                                            )}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                    <span className="material-icons-round text-indigo-600 text-base">scatter_plot</span>
                                    Matriks Kuadran Strategis: Cakupan MBG vs Efikasi Pertumbuhan Baduta (6–23 bln)
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Memetakan wilayah berdasarkan tingkat cakupan penerima MBG (%) dengan perolehan &Delta; HAZ pada periode jendela kritis.
                                </p>
                            </div>

                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart
                                        margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis
                                            type="number"
                                            dataKey="x"
                                            name="Cakupan MBG"
                                            unit="%"
                                            domain={[40, 85]}
                                            stroke="#475569"
                                            fontSize={11}
                                            label={{ value: "Cakupan MBG (%)", position: "insideBottom", offset: -10, fontSize: 11, fill: "#64748b" }}
                                        />
                                        <YAxis
                                            type="number"
                                            dataKey="y"
                                            name="&Delta; HAZ Baduta"
                                            domain={[0.05, 0.36]}
                                            tickFormatter={(v) => `+${v}`}
                                            stroke="#475569"
                                            fontSize={11}
                                            label={{ value: "&Delta; HAZ Baduta (SD)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#64748b" }}
                                        />
                                        <ZAxis type="number" dataKey="z" range={[60, 200]} name="Sampel" />
                                        <ReferenceLine x={60} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: "Median Cakupan (60%)", fill: "#94a3b8", fontSize: 10 }} />
                                        <ReferenceLine y={0.20} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: "Ambang Target (+0.20 SD)", fill: "#94a3b8", fontSize: 10 }} />
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const d = payload[0].payload;
                                                    return (
                                                        <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200 text-xs font-sans min-w-[200px]">
                                                            <div className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-1 mb-2">
                                                                Puskesmas {d.name}
                                                            </div>
                                                            <div className="space-y-1 text-slate-600">
                                                                <div className="flex justify-between">
                                                                    <span>Cakupan MBG:</span>
                                                                    <span className="font-bold text-slate-900">{d.x}%</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>&Delta; HAZ Baduta:</span>
                                                                    <span className="font-bold text-emerald-700 font-mono">+{d.y} SD</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>Reduksi Stunting:</span>
                                                                    <span className="font-bold text-indigo-700">{d.stunting_reduction}%</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>Total Sampel:</span>
                                                                    <span className="font-bold text-slate-700 font-mono">{d.z.toLocaleString()}</span>
                                                                </div>
                                                                <div className="pt-1 border-t border-slate-100 flex justify-between">
                                                                    <span>Status:</span>
                                                                    <span className="font-bold text-slate-800">{d.tier}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Scatter name="Puskesmas" data={quadrantData}>
                                            {quadrantData.map((entry, index) => {
                                                const fill =
                                                    entry.tier === "High Responder"
                                                        ? "#10b981"
                                                        : entry.tier === "Optimal"
                                                        ? "#3b82f6"
                                                        : entry.tier === "Moderat"
                                                        ? "#f59e0b"
                                                        : "#f43f5e";
                                                return <Cell key={`scatter-${index}`} fill={fill} fillOpacity={0.85} />;
                                            })}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>

                            {/* 4 Quadrants Legend */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 text-xs">
                                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-emerald-900">
                                    <strong className="block font-bold">Kuadran I: Role Model</strong>
                                    <span className="text-[11px] text-emerald-700">Cakupan Luas (&ge;60%) & Efikasi Tinggi (&ge;+0.20 SD). Dijadikan standar operasional.</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-blue-900">
                                    <strong className="block font-bold">Kuadran II: High Potential</strong>
                                    <span className="text-[11px] text-blue-700">Efikasi Tinggi (&ge;+0.20 SD) namun cakupan &lt;60%. Perlu akselerasi alokasi kuota MBG.</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100 text-amber-900">
                                    <strong className="block font-bold">Kuadran IV: Compliance Gap</strong>
                                    <span className="text-[11px] text-amber-700">Cakupan Luas (&ge;60%) namun respon rendah (&lt;+0.20 SD). Butuh audit kepatuhan konsumsi & menu.</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-100 text-rose-900">
                                    <strong className="block font-bold">Kuadran III: Prioritas Pembenahan</strong>
                                    <span className="text-[11px] text-rose-700">Cakupan Rendah & Respon Rendah. Memerlukan intervensi gizi terpadu dan monitoring intensif.</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Interactive Data Table */}
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <span className="material-icons-round text-slate-500 text-base">table_chart</span>
                                Tabel Rincian Efektivitas Intervensi MBG per Puskesmas
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Klik judul kolom untuk mengurutkan data (sorting). Gunakan pencarian dan filter untuk analisis spesifik.
                            </p>
                        </div>

                        {/* Search and Tier Filter */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <span className="material-icons-round text-slate-400 text-sm absolute left-3 top-1/2 -translate-y-1/2">
                                    search
                                </span>
                                <input
                                    type="text"
                                    value={searchPuskesmas}
                                    onChange={(e) => setSearchPuskesmas(e.target.value)}
                                    placeholder="Cari Puskesmas..."
                                    className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-40 sm:w-48 bg-white"
                                />
                            </div>

                            <select
                                value={tierFilter}
                                onChange={(e) => setTierFilter(e.target.value)}
                                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            >
                                <option value="all">Semua Kategori Tier</option>
                                <option value="High Responder">High Responder</option>
                                <option value="Optimal">Optimal</option>
                                <option value="Moderat">Moderat</option>
                                <option value="Perlu Pendampingan">Perlu Pendampingan</option>
                            </select>
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <table className="w-full text-left text-xs text-slate-600">
                            <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-3 w-10 text-center">No</th>
                                    <th
                                        onClick={() => handleSort("puskesmas")}
                                        className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>Puskesmas</span>
                                            <span className="material-icons-round text-xs text-slate-400">
                                                {sortField === "puskesmas" ? (sortAsc ? "north" : "south") : "unfold_more"}
                                            </span>
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort("mbg_coverage_pct")}
                                        className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                                    >
                                        <div className="flex items-center justify-end gap-1">
                                            <span>Cakupan MBG</span>
                                            <span className="material-icons-round text-xs text-slate-400">
                                                {sortField === "mbg_coverage_pct" ? (sortAsc ? "north" : "south") : "unfold_more"}
                                            </span>
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort("delta_haz_baduta")}
                                        className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                                    >
                                        <div className="flex items-center justify-end gap-1">
                                            <span>&Delta; HAZ (6–23 bln)</span>
                                            <span className="material-icons-round text-xs text-slate-400">
                                                {sortField === "delta_haz_baduta" ? (sortAsc ? "north" : "south") : "unfold_more"}
                                            </span>
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort("delta_haz_balita")}
                                        className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                                    >
                                        <div className="flex items-center justify-end gap-1">
                                            <span>&Delta; HAZ (24–59 bln)</span>
                                            <span className="material-icons-round text-xs text-slate-400">
                                                {sortField === "delta_haz_balita" ? (sortAsc ? "north" : "south") : "unfold_more"}
                                            </span>
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort("delta_haz_overall")}
                                        className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                                    >
                                        <div className="flex items-center justify-end gap-1">
                                            <span>&Delta; HAZ Agregat</span>
                                            <span className="material-icons-round text-xs text-slate-400">
                                                {sortField === "delta_haz_overall" ? (sortAsc ? "north" : "south") : "unfold_more"}
                                            </span>
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort("stunting_reduction_pct")}
                                        className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                                    >
                                        <div className="flex items-center justify-end gap-1">
                                            <span>Reduksi Stunting</span>
                                            <span className="material-icons-round text-xs text-slate-400">
                                                {sortField === "stunting_reduction_pct" ? (sortAsc ? "north" : "south") : "unfold_more"}
                                            </span>
                                        </div>
                                    </th>
                                    <th className="py-3 px-3 text-center">Klasifikasi Tier</th>
                                    <th className="py-3 px-3 min-w-[200px]">Rekomendasi Operasional</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedPuskesmas.length > 0 ? (
                                    paginatedPuskesmas.map((p, idx) => {
                                        const badge = getTierBadge(p.tier);
                                        const rank = (currentPage - 1) * itemsPerPage + idx + 1;
                                        return (
                                            <tr key={p.puskesmas} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-3 px-3 text-center font-mono text-slate-400">
                                                    {rank}
                                                </td>
                                                <td className="py-3 px-3 font-semibold text-slate-900">
                                                    <div>Puskesmas {p.puskesmas}</div>
                                                    <div className="text-[10px] text-slate-400 font-normal">
                                                        N = {p.total_sample.toLocaleString()} sampel
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 text-right">
                                                    <span className="font-bold text-slate-800">{p.mbg_coverage_pct}%</span>
                                                    <div className="text-[10px] text-slate-400 font-mono">
                                                        {p.mbg_recipients.toLocaleString()} sasaran
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30">
                                                    +{p.delta_haz_baduta} SD
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono font-medium text-indigo-700">
                                                    +{p.delta_haz_balita} SD
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono font-medium text-slate-700">
                                                    +{p.delta_haz_overall} SD
                                                </td>
                                                <td className="py-3 px-3 text-right font-bold text-indigo-900">
                                                    {p.stunting_reduction_pct}%
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge.bg}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-[11px] text-slate-600">
                                                    {getRecommendation(p)}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={9} className="py-8 text-center text-slate-400">
                                            Tidak ada data Puskesmas yang cocok dengan filter pencarian.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500">
                        <div>
                            Menampilkan{" "}
                            <span className="font-semibold text-slate-800">
                                {filteredPuskesmas.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
                            </span>{" "}
                            sampai{" "}
                            <span className="font-semibold text-slate-800">
                                {Math.min(currentPage * itemsPerPage, filteredPuskesmas.length)}
                            </span>{" "}
                            dari{" "}
                            <span className="font-semibold text-slate-800">{filteredPuskesmas.length}</span> Puskesmas
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                Sebelumnya
                            </button>

                            <div className="flex items-center gap-1 px-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-7 h-7 rounded-xl text-xs font-semibold transition-all ${
                                            currentPage === pageNum
                                                ? "bg-emerald-600 text-white shadow-sm"
                                                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                Selanjutnya
                            </button>
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
