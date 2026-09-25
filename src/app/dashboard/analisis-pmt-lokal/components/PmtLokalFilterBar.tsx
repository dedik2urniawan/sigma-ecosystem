"use client";

import React from "react";
import { Filter, Calendar, MapPin, Layers, RefreshCw, AlertCircle } from "lucide-react";

interface PmtFilterBarProps {
    primaryTab: "analisis" | "dqa";
    setPrimaryTab: (tab: "analisis" | "dqa") => void;
    selectedYear: string;
    setSelectedYear: (y: string) => void;
    selectedCohortMonth: string;
    setSelectedCohortMonth: (m: string) => void;
    selectedPuskesmas: string;
    setSelectedPuskesmas: (p: string) => void;
    selectedIndication: string;
    setSelectedIndication: (i: string) => void;
    puskesmasList: { id: string; name: string }[];
    isSampleData: boolean;
    isLockedRole: boolean;
    onRefresh: () => void;
    loading: boolean;
    totalRows: number;
}

export default function PmtLokalFilterBar({
    primaryTab,
    setPrimaryTab,
    selectedYear,
    setSelectedYear,
    selectedCohortMonth,
    setSelectedCohortMonth,
    selectedPuskesmas,
    setSelectedPuskesmas,
    selectedIndication,
    setSelectedIndication,
    puskesmasList,
    isSampleData,
    isLockedRole,
    onRefresh,
    loading,
    totalRows
}: PmtFilterBarProps) {
    const months = [
        { value: "ALL", label: "Semua Bulan (Juni - Des)" },
        { value: "6", label: "Juni (Awal Mulai PMT)" },
        { value: "7", label: "Juli" },
        { value: "8", label: "Agustus" },
        { value: "9", label: "September (Data Saat Ini)" },
        { value: "10", label: "Oktober" },
        { value: "11", label: "November" },
        { value: "12", label: "Desember" },
    ];

    const indications = [
        { value: "ALL", label: "Semua Sasaran PMT" },
        { value: "gizi_kurang", label: "Balita Gizi Kurang (GK)" },
        { value: "underweight", label: "Balita Berat Badan Kurang (UW)" },
        { value: "balita_t", label: "Balita BB Tidak Naik (T)" },
        { value: "bumil_kek", label: "Ibu Hamil KEK / Risiko KEK" },
    ];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 mb-6">
            {/* Top row: Primary tab pills & Data badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setPrimaryTab("analisis")}
                        className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                            primaryTab === "analisis"
                                ? "bg-white text-purple-700 shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        Analisis PMT Lokal
                    </button>
                    <button
                        onClick={() => setPrimaryTab("dqa")}
                        className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                            primaryTab === "dqa"
                                ? "bg-white text-purple-700 shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        Kelengkapan Data & DQA
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {isSampleData && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-full text-[11px] font-medium">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Kohort Audit Malang 2026 ({totalRows.toLocaleString()} Episode)</span>
                        </div>
                    )}
                    <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                        Observasi: Baseline & Luaran Program Teramati
                    </div>
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                        title="Perbarui data"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-purple-600" : ""}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Filter controls row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                {/* Tahun */}
                <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                        Tahun Kohort
                    </label>
                    <div className="relative">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 pr-8 font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all cursor-pointer"
                        >
                            <option value="2026">2026 (Tahun Berjalan)</option>
                            <option value="2025">2025</option>
                        </select>
                        <Calendar className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>

                {/* Bulan Intake / Pengukuran Awal */}
                <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                        Bulan Pengukuran Awal (Proksi)
                    </label>
                    <div className="relative">
                        <select
                            value={selectedCohortMonth}
                            onChange={(e) => setSelectedCohortMonth(e.target.value)}
                            className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 pr-8 font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all cursor-pointer"
                        >
                            {months.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                        <Filter className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>

                {/* Puskesmas */}
                <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                        Puskesmas
                    </label>
                    <div className="relative">
                        <select
                            value={selectedPuskesmas}
                            disabled={isLockedRole}
                            onChange={(e) => setSelectedPuskesmas(e.target.value)}
                            className={`w-full border text-xs rounded-xl px-3 py-2.5 pr-8 font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all ${
                                isLockedRole
                                    ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                                    : "bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800 cursor-pointer"
                            }`}
                        >
                            <option value="ALL">Semua Puskesmas Terwakili</option>
                            {puskesmasList.map(p => (
                                <option key={p.id} value={p.name}>{p.name}</option>
                            ))}
                        </select>
                        <MapPin className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>

                {/* Indikasi PMT */}
                <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                        Kelompok Sasaran
                    </label>
                    <div className="relative">
                        <select
                            value={selectedIndication}
                            onChange={(e) => setSelectedIndication(e.target.value)}
                            className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 pr-8 font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all cursor-pointer"
                        >
                            {indications.map(ind => (
                                <option key={ind.value} value={ind.value}>{ind.label}</option>
                            ))}
                        </select>
                        <Layers className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>
            </div>
        </div>
    );
}
