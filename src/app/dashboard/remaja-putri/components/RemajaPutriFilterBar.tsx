"use client";

import React from "react";
import { RotateCcw } from "lucide-react";

interface RemajaPutriFilterBarProps {
    mode: "bulanan" | "triwulan" | "tahun_ajaran";
    setMode: (m: "bulanan" | "triwulan" | "tahun_ajaran") => void;
    periodVal: number;
    setPeriodVal: (p: number) => void;
    year: string;
    setYear: (y: string) => void;
    selectedPuskesmas: string;
    setSelectedPuskesmas: (p: string) => void;
    selectedKelurahan: string;
    setSelectedKelurahan: (k: string) => void;
    refPuskesmas: { id: string; name: string }[];
    availableDesaList: { id: string; name: string }[];
    isPuskesmasAdmin: boolean;
    userPuskesmasName?: string;
}

export default function RemajaPutriFilterBar({
    mode,
    setMode,
    periodVal,
    setPeriodVal,
    year,
    setYear,
    selectedPuskesmas,
    setSelectedPuskesmas,
    selectedKelurahan,
    setSelectedKelurahan,
    refPuskesmas,
    availableDesaList,
    isPuskesmasAdmin,
    userPuskesmasName
}: RemajaPutriFilterBarProps) {
    const handleReset = () => {
        if (!isPuskesmasAdmin) {
            setSelectedPuskesmas("ALL");
        }
        setSelectedKelurahan("ALL");
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm sticky top-4 z-20 backdrop-blur-md bg-white/95">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Mode Laporan Toggle */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => {
                                setMode("bulanan");
                                setPeriodVal(2);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                mode === "bulanan"
                                    ? "bg-white text-pink-700 shadow-sm"
                                    : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            Bulanan
                        </button>
                        <button
                            onClick={() => {
                                setMode("triwulan");
                                setPeriodVal(1);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                mode === "triwulan"
                                    ? "bg-white text-pink-700 shadow-sm"
                                    : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            Triwulanan
                        </button>
                        <button
                            onClick={() => {
                                setMode("tahun_ajaran");
                                setPeriodVal(1);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                mode === "tahun_ajaran"
                                    ? "bg-white text-pink-700 shadow-sm"
                                    : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            Tahun Ajaran
                        </button>
                    </div>

                    {/* Periode Selector */}
                    {mode === "bulanan" && (
                        <select
                            value={periodVal}
                            onChange={(e) => setPeriodVal(Number(e.target.value))}
                            className="text-xs font-semibold rounded-xl border border-slate-200 py-2 px-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                        >
                            {[
                                "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                                "Juli", "Agustus", "September", "Oktober", "November", "Desember"
                            ].map((m, idx) => (
                                <option key={m} value={idx + 1}>{m}</option>
                            ))}
                        </select>
                    )}

                    {mode === "triwulan" && (
                        <select
                            value={periodVal}
                            onChange={(e) => setPeriodVal(Number(e.target.value))}
                            className="text-xs font-semibold rounded-xl border border-slate-200 py-2 px-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                        >
                            <option value={1}>TW I (s.d. Maret)</option>
                            <option value={2}>TW II (s.d. Juni)</option>
                            <option value={3}>TW III (s.d. September)</option>
                            <option value={4}>TW IV (s.d. Desember)</option>
                        </select>
                    )}

                    {mode === "tahun_ajaran" && (
                        <div className="px-3 py-1.5 rounded-xl border border-slate-200 bg-pink-50 text-pink-700 text-xs font-bold">
                            Tahun Ajaran {Number(year) - 1}/{year}
                        </div>
                    )}

                    {/* Tahun Selector */}
                    <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="text-xs font-semibold rounded-xl border border-slate-200 py-2 px-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                    >
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                    </select>
                </div>

                {/* Wilayah Dropdowns with RBAC */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <select
                            value={selectedPuskesmas}
                            disabled={isPuskesmasAdmin}
                            onChange={(e) => {
                                setSelectedPuskesmas(e.target.value);
                                setSelectedKelurahan("ALL");
                            }}
                            className={`text-xs font-semibold rounded-xl border border-slate-200 py-2 px-3 text-slate-800 max-w-[210px] truncate focus:outline-none focus:ring-2 focus:ring-pink-500/20 ${
                                isPuskesmasAdmin ? "bg-slate-100 cursor-not-allowed text-slate-600 font-bold" : "bg-white"
                            }`}
                        >
                            {!isPuskesmasAdmin && <option value="ALL">Semua Puskesmas</option>}
                            {refPuskesmas.map((p) => (
                                <option key={p.id} value={p.name}>
                                    {p.name} {isPuskesmasAdmin ? "(Puskesmas Anda)" : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    <select
                        value={selectedKelurahan}
                        onChange={(e) => setSelectedKelurahan(e.target.value)}
                        className="text-xs font-semibold rounded-xl border border-slate-200 py-2 px-3 bg-white text-slate-800 max-w-[180px] truncate focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                    >
                        <option value="ALL">Semua Desa/Kel</option>
                        {availableDesaList.map((d) => (
                            <option key={d.id || d.name} value={d.name}>{d.name}</option>
                        ))}
                    </select>

                    {((!isPuskesmasAdmin && selectedPuskesmas !== "ALL") || selectedKelurahan !== "ALL") && (
                        <button
                            onClick={handleReset}
                            className="text-xs text-rose-600 hover:text-rose-700 font-bold px-2 py-1 flex items-center gap-1 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Reset filter wilayah"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Reset
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
