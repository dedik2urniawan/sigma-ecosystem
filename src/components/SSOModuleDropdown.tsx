"use client";

/**
 * SSOModuleDropdown — Komponen Reusable Dropdown Menu 5 Modul SIGMA
 * Desain Modern, Fresh, & Profesional (Light/Dark Theme).
 */

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface SSOModuleDropdownProps {
    align?: "left" | "right";
    theme?: "light" | "dark";
    buttonClassName?: string;
}

const EXPAND_MODULES = [
    {
        id: "rcs",
        label: "SIGMA RCS",
        desc: "Surveilans Gizi & Dashboard Analitik",
        icon: "monitor_heart",
        iconClass: "bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md shadow-emerald-200",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
        landingUrl: "/rcs",
        tag: "Surveilans",
    },
    {
        id: "mbg",
        label: "SIGMA MBG",
        desc: "Monev & Pelaporan Makan Bergizi",
        icon: "restaurant",
        iconClass: "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-200",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
        landingUrl: "/mbg",
        tag: "Makan Bergizi",
    },
    {
        id: "chatbot",
        label: "Chatbot AI",
        desc: "Asisten Gizi Cerdas Berbasis LLM",
        icon: "smart_toy",
        iconClass: "bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-200",
        badgeClass: "bg-purple-50 text-purple-800 border-purple-200",
        landingUrl: "/chatbot",
        tag: "AI Assistant",
    },
    {
        id: "api_gateway",
        label: "API Gateway",
        desc: "Portal Data Sharing Standar & Aman",
        icon: "hub",
        iconClass: "bg-gradient-to-br from-indigo-500 to-purple-700 text-white shadow-md shadow-indigo-200",
        badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200",
        landingUrl: "/api-gateway",
        tag: "Integrasi",
    },
    {
        id: "calculator",
        label: "SIGMA Calculator",
        desc: "Kalkulator Nilai Gizi & Kebutuhan AKG",
        icon: "calculate",
        iconClass: "bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-md shadow-blue-200",
        badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
        landingUrl: "/calculator",
        tag: "Kalkulator",
    },
];

export default function SSOModuleDropdown({
    align = "right",
    theme = "light",
    buttonClassName = "",
}: SSOModuleDropdownProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isDark = theme === "dark";

    const defaultBtnClass = isDark
        ? `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
            dropdownOpen
                ? "bg-white/20 text-white border border-white/30 shadow-md shadow-indigo-500/20"
                : "bg-white/5 text-slate-200 border border-white/10 hover:bg-white/10 hover:text-white"
        }`
        : `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
            dropdownOpen
                ? "bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm"
                : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 shadow-2xs"
        }`;

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={buttonClassName || defaultBtnClass}
                title="Pilih Layanan Modul SIGMA"
            >
                <span className="material-icons-round text-base text-emerald-600">grid_view</span>
                <span>Semua Modul</span>
                <span
                    className={`material-icons-round text-sm transition-transform duration-200 ${
                        dropdownOpen ? "rotate-180" : ""
                    }`}
                >
                    expand_more
                </span>
            </button>

            {/* Expand Popup Menu */}
            {dropdownOpen && (
                <div
                    className={`absolute ${
                        align === "right" ? "right-0" : "left-0"
                    } mt-2.5 w-84 sm:w-96 bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[9999] text-left ring-1 ring-slate-900/5`}
                >
                    {/* Header */}
                    <div className="px-5 py-3.5 bg-gradient-to-r from-slate-50 to-emerald-50/40 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <p className="text-xs font-black text-slate-900 font-mono uppercase tracking-wider">
                                    Ekosistem 5 Modul SIGMA
                                </p>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Pilih modul untuk berpindah layanan</p>
                        </div>
                        <Link
                            href="/sso/modules"
                            onClick={() => setDropdownOpen(false)}
                            className="text-[10px] font-extrabold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 font-mono uppercase bg-white border border-emerald-200 px-2.5 py-1 rounded-lg shadow-2xs"
                        >
                            <span>Buka Hub</span>
                            <span className="material-icons-round text-xs">arrow_forward</span>
                        </Link>
                    </div>

                    {/* 5 Modules List */}
                    <div className="p-3 space-y-1.5 max-h-[390px] overflow-y-auto">
                        {EXPAND_MODULES.map((mod) => (
                            <Link
                                key={mod.id}
                                href={mod.landingUrl}
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-emerald-50/50 transition-all duration-200 group border border-transparent hover:border-emerald-200 hover:shadow-sm"
                            >
                                <div
                                    className={`w-11 h-11 rounded-2xl ${mod.iconClass} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200`}
                                >
                                    <span className="material-icons-round text-2xl">{mod.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                                            {mod.label}
                                        </p>
                                        <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full border ${mod.badgeClass}`}>
                                            {mod.tag}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">{mod.desc}</p>
                                </div>
                                <div className="w-7 h-7 rounded-xl bg-slate-50 group-hover:bg-emerald-100/80 flex items-center justify-center text-slate-400 group-hover:text-emerald-700 transition-all shrink-0">
                                    <span className="material-icons-round text-sm group-hover:translate-x-0.5 transition-transform">
                                        arrow_forward
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Footer Button: Open Hub */}
                    <div className="p-3 bg-slate-50/80 border-t border-slate-100 text-center">
                        <Link
                            href="/sso/modules"
                            onClick={() => setDropdownOpen(false)}
                            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-200 hover:shadow-lg hover:shadow-emerald-300 uppercase tracking-wider font-mono"
                        >
                            <span className="material-icons-round text-base">apps</span>
                            <span>Buka Halaman Hub 5 Modul</span>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

