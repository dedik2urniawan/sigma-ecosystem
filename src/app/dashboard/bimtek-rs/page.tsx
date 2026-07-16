"use client";

import React, { useState } from "react";
import { useAuth } from "@/app/dashboard/layout";
import SupervisiRsList from "./components/SupervisiRsList";
import MonevRsDashboard from "./components/MonevRsDashboard";
import BaRsList from "./components/BaRsList";
import BaRsForm from "./components/BaRsForm";

type TabId = "dashboard" | "supervisi" | "ba";

export default function BimtekRsPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabId>("dashboard");
    const [baRsSessionId, setBaRsSessionId] = useState<string | null>(null);

    // Redirect non-superadmin and non-stakeholder
    if (!user) return null;
    const canAccess = user.role === "superadmin" || user.role === "stakeholder";
    if (!canAccess) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
                    <span className="material-icons-round text-red-400 text-3xl">lock</span>
                </div>
                <h3 className="text-lg font-bold text-slate-700">Akses Terbatas</h3>
                <p className="text-sm text-slate-500 text-center max-w-xs">
                    Menu Bimtek RS hanya dapat diakses oleh Admin Dinas Kesehatan.
                </p>
            </div>
        );
    }

    const handleOpenBA = (sessionId: string) => {
        setBaRsSessionId(sessionId);
        setActiveTab("ba");
    };
    const handleBackBA = () => setBaRsSessionId(null);

    const tabs = [
        { id: "dashboard" as TabId, label: "Dashboard Monev", icon: "dashboard", ready: true },
        { id: "supervisi" as TabId, label: "Supervisi Gizi RS", icon: "fact_check", ready: true },
        { id: "ba" as TabId, label: "Berita Acara Bimtek RS", icon: "description", ready: true },
    ];

    return (
        <div className="space-y-6 min-w-0" style={{ overflowX: "hidden" }}>
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-200/50">
                    <span className="material-icons-round text-white text-3xl">local_hospital</span>
                </div>
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Bimtek RS</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Supervisi dan bimbingan teknis Gizi Rumah Sakit Kabupaten Malang
                    </p>
                </div>
                {user.role === "stakeholder" && (
                    <span className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-500">
                        <span className="material-icons-round text-base">visibility</span>
                        Mode Lihat
                    </span>
                )}
            </div>

            {/* Tab Pills */}
            <div className="flex bg-slate-50 p-1.5 rounded-2xl flex-wrap gap-1 border border-slate-100 mb-6">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => {
                            setActiveTab(t.id);
                            if (t.id !== "ba") setBaRsSessionId(null);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap
                            ${activeTab === t.id
                                ? "bg-cyan-600 text-white shadow-md shadow-cyan-200"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            }`}
                    >
                        <span className={`material-icons-round text-[18px] ${activeTab === t.id ? "text-white" : "text-slate-500"}`}>
                            {t.icon}
                        </span>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {activeTab === "dashboard" ? (
                <MonevRsDashboard />
            ) : activeTab === "supervisi" ? (
                <SupervisiRsList />
            ) : activeTab === "ba" ? (
                baRsSessionId ? (
                    <BaRsForm sessionId={baRsSessionId} onBack={handleBackBA} />
                ) : (
                    <BaRsList onOpenForm={handleOpenBA} />
                )
            ) : null}
        </div>
    );
}
