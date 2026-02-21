"use client";

import React, { useState } from "react";
import ComingSoon from "@/components/dashboard/ComingSoon";
import DataQualityDashboard from "./components/DataQualityDashboard";

import GrowthAnalysisDashboard from "./components/GrowthAnalysisDashboard";
import NutritionIssuesDashboard from "./components/NutritionIssuesDashboard";

export default function BalitaGiziPage() {
    const [mainTab, setMainTab] = useState<"kualitas" | "indikator">("kualitas");
    const [indikatorSubTab, setIndikatorSubTab] = useState<
        "pemantauan" | "masalah_gizi" | "asi" | "suplemen" | "tatalaksana"
    >("pemantauan");

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
                    </div>
                </div>

                {/* Main Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
                    <button
                        onClick={() => setMainTab("kualitas")}
                        className={`flex-1 md:flex-none px-5 py-2.5 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${mainTab === "kualitas"
                            ? "bg-white text-teal-700 shadow-sm"
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            }`}
                    >
                        Kelengkapan Data Laporan
                    </button>
                    <button
                        onClick={() => setMainTab("indikator")}
                        className={`flex-1 md:flex-none px-5 py-2.5 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${mainTab === "indikator"
                            ? "bg-white text-teal-700 shadow-sm"
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            }`}
                    >
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
                    <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
                        {[
                            { id: "pemantauan", label: "Analisis Pertumbuhan" },
                            { id: "masalah_gizi", label: "Masalah Gizi" },
                            { id: "asi", label: "ASI Eksklusif dan MPASI" },
                            { id: "suplemen", label: "Suplementasi Zat Gizi Mikro" },
                            { id: "tatalaksana", label: "Tatalaksana Balita Bermasalah Gizi" }
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setIndikatorSubTab(t.id as any)}
                                className={`px-4 py-2 text-sm font-semibold rounded-t-xl transition-all border-b-2 ${indikatorSubTab === t.id
                                    ? "text-teal-600 border-teal-600 bg-teal-50"
                                    : "text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700"
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {indikatorSubTab === "pemantauan" ? (
                        <GrowthAnalysisDashboard />
                    ) : indikatorSubTab === "masalah_gizi" ? (
                        <NutritionIssuesDashboard />
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                            <ComingSoon
                                title={`Modul ${indikatorSubTab.replace(/_/g, " ")}`}
                                icon="analytics"
                                description="Fitur visualisasi indikator gizi ini sedang dalam tahap pengembangan."
                                gradient="from-teal-500 to-cyan-600"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
