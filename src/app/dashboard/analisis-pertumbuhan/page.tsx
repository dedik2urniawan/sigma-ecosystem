"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/dashboard/layout";
import InformasiDataTab from "./components/InformasiDataTab";
import DistribusiDataTab from "./components/DistribusiDataTab";
import DistribusiZScoreTab from "./components/DistribusiZScoreTab";
import TrendPertumbuhanTab from "./components/TrendPertumbuhanTab";
import DifferensiasiPrevalensiTab from "./components/DifferensiasiPrevalensiTab";

export default function AnalisisPertumbuhanPage() {
    const { user } = useAuth();
    const isSuperadmin = user?.role === "superadmin";

    const [mainTab, setMainTab] = useState<
        "informasi" | "distribusi" | "zscore" | "trend" | "differensiasi"
    >("informasi");

    // Global Filters
    const [selectedPeriode, setSelectedPeriode] = useState<string>("Semua");
    const [selectedPuskesmas, setSelectedPuskesmas] = useState<string>("Semua");
    const [selectedKelurahan, setSelectedKelurahan] = useState<string>("Semua");

    const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
    const [availablePuskesmas, setAvailablePuskesmas] = useState<string[]>([]);
    const [availableKelurahan, setAvailableKelurahan] = useState<string[]>([]);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    // Fetch periods & last updated
    useEffect(() => {
        async function fetchMetadata() {
            const { data: periodData } = await supabase.rpc("get_distinct_periods");
            if (periodData) {
                const periods = periodData
                    .map((p: any) => p.periode)
                    .filter(Boolean)
                    .sort()
                    .reverse();
                setAvailablePeriods(periods);
                if (periods.length > 0) setSelectedPeriode(periods[0]);
            }

            const { data: lastData } = await supabase
                .from("data_eppgbm")
                .select("created_at")
                .order("created_at", { ascending: false })
                .limit(1)
                .single();
            if (lastData?.created_at) setLastUpdated(lastData.created_at);

            // If admin_puskesmas, lock puskesmas to their own via ref_puskesmas table
            if (!isSuperadmin && user?.puskesmas_id) {
                const { data: pkm } = await supabase
                    .from("ref_puskesmas")
                    .select("nama")
                    .eq("id", user.puskesmas_id)
                    .single();
                if (pkm?.nama) {
                    setSelectedPuskesmas(pkm.nama);
                }
            }
        }
        fetchMetadata();
    }, [isSuperadmin, user?.puskesmas_id]);

    // Fetch puskesmas list when periode changes (superadmin only)
    useEffect(() => {
        if (!isSuperadmin) return;
        async function fetchPuskesmas() {
            const { data } = await supabase.rpc("get_distinct_puskesmas_by_periode", {
                p_periode: selectedPeriode,
            });
            if (data) {
                setAvailablePuskesmas(data.map((d: any) => d.puskesmas).filter(Boolean));
            }
            // Reset puskesmas & kelurahan selection
            setSelectedPuskesmas("Semua");
            setSelectedKelurahan("Semua");
        }
        fetchPuskesmas();
    }, [selectedPeriode, isSuperadmin]);

    // Fetch kelurahan list when puskesmas changes
    useEffect(() => {
        async function fetchKelurahan() {
            const { data } = await supabase.rpc("get_distinct_kelurahan_by_puskesmas", {
                p_puskesmas: selectedPuskesmas,
                p_periode: selectedPeriode,
            });
            if (data) {
                setAvailableKelurahan(data.map((d: any) => d.kelurahan).filter(Boolean));
            }
            setSelectedKelurahan("Semua");
        }
        if (selectedPuskesmas) fetchKelurahan();
    }, [selectedPuskesmas, selectedPeriode]);

    const filterProps = {
        periode: selectedPeriode,
        kecamatan: "Semua",
        puskesmas: selectedPuskesmas,
        kelurahan: selectedKelurahan,
        userRole: user?.role || "user",
        userPuskesmasId: user?.puskesmas_id || null,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center shadow-lg shadow-cyan-200 shrink-0">
                        <span className="material-icons-round text-white text-3xl">query_stats</span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                            Analisis Pertumbuhan <span className="text-cyan-600">(EPPGBM)</span>
                        </h1>
                        <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
                            Evaluasi komprehensif pertumbuhan balita berdasarkan dataset EPPGBM (Pendekatan WHO Anthro R).
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-400">
                            <span className="material-icons-round text-sm">update</span>
                            {lastUpdated ? (
                                <span>
                                    Terakhir diperbarui:{" "}
                                    <span className="text-slate-600">
                                        {new Date(lastUpdated).toLocaleDateString("id-ID", {
                                            day: "numeric", month: "long", year: "numeric",
                                        })} pukul {new Date(lastUpdated).toLocaleTimeString("id-ID", {
                                            hour: "2-digit", minute: "2-digit",
                                        })}
                                    </span>
                                </span>
                            ) : (
                                <span>Belum ada data</span>
                            )}
                        </div>
                        {/* RBAC badge */}
                        <div className="mt-2">
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${isSuperadmin
                                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                                    : "bg-cyan-50 text-cyan-700 border border-cyan-200"
                                }`}>
                                <span className="material-icons-round text-[12px]">
                                    {isSuperadmin ? "admin_panel_settings" : "person"}
                                </span>
                                {isSuperadmin ? "Superadmin – Akses Semua Wilayah" : `Admin Puskesmas – ${selectedPuskesmas}`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Global Filters */}
                <div className="flex flex-wrap items-end gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm w-full xl:w-auto">
                    {/* Periode */}
                    <div className="flex-1 min-w-[140px]">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Periode</label>
                        <select
                            value={selectedPeriode}
                            onChange={(e) => setSelectedPeriode(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all font-semibold"
                        >
                            <option value="Semua">Semua Periode</option>
                            {availablePeriods.map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>

                    {/* Puskesmas – Superadmin only */}
                    {isSuperadmin && (
                        <div className="flex-1 min-w-[160px]">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Puskesmas</label>
                            <select
                                value={selectedPuskesmas}
                                onChange={(e) => setSelectedPuskesmas(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all font-semibold"
                            >
                                <option value="Semua">Semua Puskesmas</option>
                                {availablePuskesmas.map((p) => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Kelurahan – both roles */}
                    <div className="flex-1 min-w-[140px]">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Kelurahan/Desa</label>
                        <select
                            value={selectedKelurahan}
                            onChange={(e) => setSelectedKelurahan(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all font-semibold"
                        >
                            <option value="Semua">Semua Kelurahan</option>
                            {availableKelurahan.map((k) => (
                                <option key={k} value={k}>{k}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
                {[
                    { id: "informasi", label: "Informasi Data EPPGBM", icon: "dataset" },
                    { id: "distribusi", label: "Distribusi Data", icon: "bar_chart" },
                    { id: "zscore", label: "Distribusi Z-Score", icon: "area_chart" },
                    { id: "trend", label: "Trend Pertumbuhan", icon: "timeline" },
                    { id: "differensiasi", label: "Differensiasi Prevalensi", icon: "scatter_plot" },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setMainTab(t.id as any)}
                        className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${mainTab === t.id
                            ? "text-cyan-700 border-cyan-600 bg-cyan-50/50"
                            : "text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700"
                            }`}
                    >
                        <span className="material-icons-round text-[18px]">{t.icon}</span>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="min-h-[500px]">
                {mainTab === "informasi" && <InformasiDataTab filters={filterProps} />}
                {mainTab === "distribusi" && <DistribusiDataTab filters={filterProps} />}
                {mainTab === "zscore" && <DistribusiZScoreTab filters={filterProps} />}
                {mainTab === "trend" && <TrendPertumbuhanTab filters={filterProps} />}
                {mainTab === "differensiasi" && <DifferensiasiPrevalensiTab filters={filterProps} />}
            </div>
        </div>
    );
}
