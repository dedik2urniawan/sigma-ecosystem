"use client";

import React, { useState } from "react";
import ComingSoonModal from "./ComingSoonModal";

interface AppInfo {
    id: string;
    name: string;
    description: string;
    materialIcon: string;
    iconGradient: string;
    iconShadow: string;
    status: "active" | "priority" | "high-priority" | "dev" | "beta-soon" | "roadmap";
    statusLabel: string;
    statusStyle: string;
    isDashed: boolean;
    buttonLabel: string;
    buttonIcon: string;
    buttonIconType: "round" | "outlined";
    buttonStyle: string;
    link?: string;
    isDisabled: boolean;
}

const apps: AppInfo[] = [
    {
        id: "rcs",
        name: "SIGMA RCS",
        description: "Rapid Communication System for emergency nutritional response and sync.",
        materialIcon: "monitor_heart",
        iconGradient: "from-emerald-400 to-emerald-600",
        iconShadow: "shadow-emerald-200",
        status: "high-priority",
        statusLabel: "High Priority",
        statusStyle: "bg-emerald-50 text-emerald-600",
        isDashed: false,
        buttonLabel: "Launch Application",
        buttonIcon: "arrow_forward",
        buttonIconType: "round",
        buttonStyle: "bg-rcs-green hover:bg-rcs-green-hover text-white shadow-lg shadow-emerald-100 hover:shadow-emerald-200",
        link: "/rcs",
        isDisabled: false,
    },
    {
        id: "calculator",
        name: "SIGMA Calculator",
        description: "Advanced nutritional value calculator and dietary planning tools.",
        materialIcon: "calculate",
        iconGradient: "from-blue-500 to-indigo-600",
        iconShadow: "shadow-blue-200",
        status: "priority",
        statusLabel: "Priority",
        statusStyle: "bg-blue-50 text-blue-600",
        isDashed: false,
        buttonLabel: "Open Tool",
        buttonIcon: "open_in_new",
        buttonIconType: "outlined",
        buttonStyle: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300",
        link: "/calculator",
        isDisabled: false,
    },
    {
        id: "pkmk",
        name: "SIGMA PKMK",
        description: "Pusat Kendali Mutu Kesehatan dashboard for standardized reporting.",
        materialIcon: "medical_services",
        iconGradient: "bg-[#1e293b]", // Special solid case
        iconShadow: "shadow-slate-200",
        status: "active",
        statusLabel: "Active",
        statusStyle: "bg-emerald-50 text-emerald-600",
        isDashed: false,
        buttonLabel: "Access Dashboard",
        buttonIcon: "chevron_right",
        buttonIconType: "outlined",
        buttonStyle: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300",
        link: "https://pkmk-malangkab.app/landing-page.html",
        isDisabled: false,
    },
    {
        id: "api",
        name: "SIGMA API Gateway",
        description: "Centralized API management for third-party integrations.",
        materialIcon: "hub",
        iconGradient: "bg-slate-100", // Special solid case
        iconShadow: "",
        status: "dev",
        statusLabel: "Dev",
        statusStyle: "bg-slate-100 text-slate-500",
        isDashed: true,
        buttonLabel: "Unavailable",
        buttonIcon: "lock",
        buttonIconType: "outlined",
        buttonStyle: "bg-slate-100 text-slate-400 cursor-not-allowed",
        isDisabled: true,
    },
    {
        id: "chatbot",
        name: "SIGMA Chatbot AI",
        description: "AI-powered assistant for instant nutrition queries.",
        materialIcon: "smart_toy",
        iconGradient: "bg-slate-100", // Special solid case
        iconShadow: "",
        status: "beta-soon",
        statusLabel: "Beta Soon",
        statusStyle: "bg-amber-50 text-amber-600",
        isDashed: true,
        buttonLabel: "Coming Soon",
        buttonIcon: "smart_toy",
        buttonIconType: "outlined",
        buttonStyle: "bg-slate-100 text-slate-400 cursor-not-allowed",
        isDisabled: true,
    },
    {
        id: "mobile",
        name: "SIGMA Mobile App",
        description: "Field reporting application for Posyandu cadres.",
        materialIcon: "smartphone",
        iconGradient: "bg-slate-100", // Special solid case
        iconShadow: "",
        status: "roadmap",
        statusLabel: "Roadmap",
        statusStyle: "bg-slate-100 text-slate-500",
        isDashed: true,
        buttonLabel: "Not Available",
        buttonIcon: "grid_view",
        buttonIconType: "outlined",
        buttonStyle: "bg-slate-100 text-slate-400 cursor-not-allowed",
        isDisabled: true,
    },
];

export default function AppGrid() {
    const [modalOpen, setModalOpen] = useState(false);
    const [modalApp, setModalApp] = useState("");

    const handleClick = (app: AppInfo) => {
        if (app.isDisabled) {
            setModalApp(app.name);
            setModalOpen(true);
        } else if (app.link) {
            if (app.link.startsWith("http")) {
                window.open(app.link, "_blank", "noopener,noreferrer");
            }
        }
    };

    return (
        <>
            <section className="py-24 bg-white relative" id="applications">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="text-center mb-20">
                        <span className="text-indigo-600 font-bold tracking-[0.2em] text-xs uppercase mb-3 block">
                            Integrated Platform
                        </span>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
                            Ekosistem Aplikasi
                        </h2>
                        <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
                            Enam modul terintegrasi yang saling terhubung untuk mendukung surveilans gizi komprehensif di Kabupaten Malang.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {apps.map((app) => (
                            <div
                                key={app.id}
                                className={`rounded-[2rem] p-8 transition-all duration-300 group flex flex-col h-full relative overflow-hidden ${app.isDashed
                                        ? "bg-white border border-slate-100/80 border-dashed shadow-sm"
                                        : "bg-white border border-slate-100 shadow-[0_8px_40px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)]"
                                    }`}
                            >
                                <div className="absolute top-0 right-0 p-8">
                                    <span
                                        className={`${app.statusStyle} text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 tracking-tight`}
                                    >
                                        {app.status === "active" && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        )}
                                        {app.statusLabel}
                                    </span>
                                </div>
                                <div
                                    className={`w-[3.5rem] h-[3.5rem] rounded-2xl flex items-center justify-center mb-6 ${app.isDashed
                                            ? "bg-slate-100 text-slate-500"
                                            : app.iconGradient.startsWith("bg-")
                                                ? `${app.iconGradient} text-white shadow-lg ${app.iconShadow}`
                                                : `bg-gradient-to-br ${app.iconGradient} text-white shadow-lg ${app.iconShadow}`
                                        }`}
                                >
                                    <span className="material-icons-round text-3xl">
                                        {app.materialIcon}
                                    </span>
                                </div>
                                <h3
                                    className={`text-xl font-bold mb-2 ${app.isDashed ? "text-slate-600" : "text-slate-900"
                                        }`}
                                >
                                    {app.name}
                                </h3>
                                <p
                                    className={`text-sm leading-relaxed mb-8 flex-grow ${app.isDashed ? "text-slate-400" : "text-slate-500"
                                        }`}
                                >
                                    {app.description}
                                </p>
                                <div className="mt-auto">
                                    <button
                                        onClick={() => handleClick(app)}
                                        disabled={app.isDisabled}
                                        className={`w-full py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${app.buttonStyle}`}
                                    >
                                        {app.isDisabled ? (
                                            <span className="material-symbols-outlined text-sm">
                                                {app.buttonIcon}
                                            </span>
                                        ) : (
                                            <>
                                                {app.buttonLabel}
                                                <span
                                                    className={
                                                        app.buttonIconType === "round"
                                                            ? "material-icons-round text-base"
                                                            : "material-symbols-outlined text-base"
                                                    }
                                                >
                                                    {app.buttonIcon}
                                                </span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <ComingSoonModal
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setModalApp("");
                }}
                appName={modalApp}
            />
        </>
    );
}
