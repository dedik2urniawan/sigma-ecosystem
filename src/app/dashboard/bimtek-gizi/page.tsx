"use client";

import React, { useState } from "react";
import ComingSoon from "@/components/dashboard/ComingSoon";
import SupervisiList from "./components/SupervisiList";
import MonevDashboard from "./components/MonevDashboard";
import BaBimtekList from "./components/BaBimtekList";
import BaBimtekForm from "./components/BaBimtekForm";

type TabId = "dashboard" | "supervisi" | "kpi" | "ba";

export default function BimtekGiziPage() {
    const [activeTab, setActiveTab] = useState<TabId>("dashboard");
    const [baBimtekSessionId, setBaBimtekSessionId] = useState<string | null>(null);

    const handleOpenBA = (sessionId: string) => {
        setBaBimtekSessionId(sessionId);
    };

    const handleBackBA = () => {
        setBaBimtekSessionId(null);
    };

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
            <div className="flex bg-slate-50 p-1.5 rounded-2xl flex-wrap gap-1 border border-slate-100 mb-6">
                {[
                    { id: "dashboard" as TabId, label: "Dashboard Monev", icon: "dashboard", ready: true },
                    { id: "supervisi" as TabId, label: "Supervisi & Kesiapan Layanan", icon: "fact_check", ready: true },
                    { id: "kpi" as TabId, label: "Analisis KPI", icon: "bar_chart", ready: false },
                    { id: "ba" as TabId, label: "Berita Acara Bimtek KGM", icon: "description", ready: true },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => {
                            if (t.ready) {
                                setActiveTab(t.id);
                                if (t.id !== "ba") setBaBimtekSessionId(null);
                            }
                        }}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${activeTab === t.id
                            ? "bg-teal-600 text-white shadow-md shadow-teal-200"
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            } ${!t.ready ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                        <span className={`material-icons-round text-[18px] ${activeTab === t.id ? "text-white" : "text-slate-500"}`}>{t.icon}</span>
                        {t.label}
                        {!t.ready && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-wider ml-1">
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
            ) : activeTab === "ba" ? (
                baBimtekSessionId ? (
                    <BaBimtekForm sessionId={baBimtekSessionId} onBack={handleBackBA} />
                ) : (
                    <BaBimtekList onOpenForm={handleOpenBA} />
                )
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
