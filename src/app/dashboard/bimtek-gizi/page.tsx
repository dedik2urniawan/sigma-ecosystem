"use client";

import React, { useState } from "react";
import ComingSoon from "@/components/dashboard/ComingSoon";
import SupervisiList from "./components/SupervisiList";
import MonevDashboard from "./components/MonevDashboard";

export default function BimtekGiziPage() {
    const [activeTab, setActiveTab] = useState<"dashboard" | "supervisi" | "kpi">("dashboard");

    return (
        <div className="space-y-6 min-w-0" style={{ overflowX: 'hidden' }}>
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200/50">
                    <span className="material-icons-round text-white text-3xl">assignment</span>
                </div>
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Bimtek Gizi</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Supervisi dan bimbingan teknis integrasi program Kesga Gizi</p>
                </div>
            </div>

            {/* Tab Pills */}
            <div className="flex gap-1 border-b border-slate-200 pb-0">
                {[
                    { id: "dashboard" as const, label: "Dashboard Monev", icon: "dashboard", ready: true },
                    { id: "supervisi" as const, label: "Supervisi & Kesiapan Layanan", icon: "fact_check", ready: true },
                    { id: "kpi" as const, label: "Analisis KPI", icon: "bar_chart", ready: false },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => t.ready && setActiveTab(t.id)}
                        className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${activeTab === t.id
                            ? "text-indigo-600 border-indigo-600 bg-indigo-50"
                            : "text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700"
                            } ${!t.ready ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                        <span className={`material-icons-round text-base ${activeTab === t.id ? "text-indigo-500" : "text-slate-400"}`}>{t.icon}</span>
                        {t.label}
                        {!t.ready && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-wider">
                                Soon
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            {activeTab === "dashboard" ? (
                <MonevDashboard />
            ) : activeTab === "supervisi" ? (
                <SupervisiList />
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                    <ComingSoon
                        title="Analisis KPI"
                        icon="assessment"
                        description="Fitur analisis KPI Bimtek Gizi sedang dalam tahap pengembangan."
                        gradient="from-indigo-500 to-purple-600"
                    />
                </div>
            )}
        </div>
    );
}
