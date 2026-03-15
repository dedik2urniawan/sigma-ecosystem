"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import ComingSoon from "@/components/dashboard/ComingSoon";
import DataQualityDashboard from "./components/DataQualityDashboard";

import GrowthAnalysisDashboard from "./components/GrowthAnalysisDashboard";
import NutritionIssuesDashboard from "./components/NutritionIssuesDashboard";
import AsiMpasiDashboard from "./components/AsiMpasiDashboard";
import SuplemenDashboard from "./components/SuplemenDashboard";
import TatalaksanaDashboard from "./components/TatalaksanaDashboard";

export default function BalitaGiziPage() {
    const [mainTab, setMainTab] = useState<"kualitas" | "indikator">("kualitas");
    const [indikatorSubTab, setIndikatorSubTab] = useState<
        "pemantauan" | "masalah_gizi" | "asi" | "suplemen" | "tatalaksana"
    >("pemantauan");

    // Dynamic last updated from data_balita_gizi
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    useEffect(() => {
        async function fetchLastUpdated() {
            const { data } = await supabase
                .from('data_balita_gizi')
                .select('uploaded_at')
                .order('uploaded_at', { ascending: false })
                .limit(1)
                .single();
            if (data?.uploaded_at) setLastUpdated(data.uploaded_at);
        }
        fetchLastUpdated();
    }, []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-lg shadow-teal-200">
                        <span className="material-icons-round text-white text-2xl">child_care</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                            Balita Gizi
                        </h1>
                        <p className="text-sm text-slate-500">
                            Monitoring pemantauan pertumbuhan, masalah gizi, dan kepatuhan pelaporan.
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                            <span className="material-icons-round text-sm">schedule</span>
                            {lastUpdated ? (
                                <span>
                                    Data terakhir diperbarui:{" "}
                                    <span className="font-semibold text-slate-600">
                                        {new Date(lastUpdated).toLocaleDateString("id-ID", {
                                            day: "numeric",
                                            month: "long",
                                            year: "numeric",
                                        })}{" "}
                                        pukul{" "}
                                        {new Date(lastUpdated).toLocaleTimeString("id-ID", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                </span>
                            ) : (
                                <span className="text-slate-300">Memuat...</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Tabs */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto shadow-inner">
                    <button
                        onClick={() => setMainTab("kualitas")}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${mainTab === "kualitas"
                            ? "bg-white text-teal-700 shadow-sm border border-slate-200/60"
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            }`}
                    >
                        <span className="material-icons-round text-[18px]">fact_check</span>
                        Kelengkapan Data Laporan
                    </button>
                    <button
                        onClick={() => setMainTab("indikator")}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${mainTab === "indikator"
                            ? "bg-white text-teal-700 shadow-sm border border-slate-200/60"
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            }`}
                    >
                        <span className="material-icons-round text-[18px]">analytics</span>
                        Analisis Indikator Balita Gizi
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {mainTab === "kualitas" ? (
                <DataQualityDashboard />
            ) : (
                <div className="space-y-6">
                    {/* Sub Tabs for Indikator */}
                    <div className="flex bg-slate-50 p-1.5 rounded-2xl flex-wrap gap-1 border border-slate-100">
                        {[
                            { id: "pemantauan", label: "Analisis Pertumbuhan", icon: "timeline" },
                            { id: "masalah_gizi", label: "Masalah Gizi", icon: "health_and_safety" },
                            { id: "asi", label: "ASI Eksklusif dan MPASI", icon: "child_friendly" },
                            { id: "suplemen", label: "Suplementasi Zat Gizi Mikro", icon: "medication" },
                            { id: "tatalaksana", label: "Tatalaksana Balita Bermasalah Gizi", icon: "medical_services" }
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setIndikatorSubTab(t.id as any)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${indikatorSubTab === t.id
                                    ? "bg-white text-teal-700 shadow-sm border border-slate-200/60"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                    }`}
                            >
                                <span className="material-icons-round text-[18px]">{t.icon}</span>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {indikatorSubTab === "pemantauan" ? (
                        <GrowthAnalysisDashboard />
                    ) : indikatorSubTab === "masalah_gizi" ? (
                        <NutritionIssuesDashboard />
                    ) : indikatorSubTab === "asi" ? (
                        <AsiMpasiDashboard />
                    ) : indikatorSubTab === "suplemen" ? (
                        <SuplemenDashboard />
                    ) : (
                        <TatalaksanaDashboard />
                    )}
                </div>
            )}
        </div>
    );
}
