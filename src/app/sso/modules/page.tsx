"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
    canAccessModule,
    formatRoleDisplay,
    type SigmaRole,
    type SigmaModule
} from "@/lib/sso-utils";

interface ModuleCardData {
    id: SigmaModule;
    title: string;
    tagline: string;
    desc: string;
    icon: string;
    badge: string;
    landingUrl: string;
    appUrl: string;
    accent: {
        bgLight: string;
        border: string;
        badgeBg: string;
        badgeText: string;
        iconBg: string;
        buttonBg: string;
        shadow: string;
    };
    highlights: string[];
}

const MODULES: ModuleCardData[] = [
    {
        id: "rcs",
        title: "SIGMA RCS",
        tagline: "Surveilans Gizi & Analitik",
        desc: "Dashboard analitik surveilans gizi komprehensif yang me-mirror data dari SIGIZI KESGA untuk pemantauan stunting, wasting, dan underweight.",
        icon: "monitor_heart",
        badge: "Surveilans Gizi",
        landingUrl: "/rcs",
        appUrl: "/dashboard",
        accent: {
            bgLight: "bg-emerald-50/50",
            border: "border-emerald-200/80 hover:border-emerald-400",
            badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
            badgeText: "text-emerald-700",
            iconBg: "bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-emerald-200",
            buttonBg: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 hover:shadow-emerald-300",
            shadow: "hover:shadow-xl hover:shadow-emerald-100/60",
        },
        highlights: ["Mirroring SIGIZI KESGA", "Early Warning System", "AI Tren Prevalensi"],
    },
    {
        id: "mbg",
        title: "SIGMA MBG",
        tagline: "Makan Bergizi Gratis",
        desc: "Platform pemantauan, supervisi, dan pelaporan pelaksanaan program Makan Bergizi Gratis (MBG) terintegrasi lintas seksi Dinas Kesehatan.",
        icon: "restaurant",
        badge: "Monev & SPPG",
        landingUrl: "/mbg",
        appUrl: "/mbg",
        accent: {
            bgLight: "bg-amber-50/50",
            border: "border-amber-200/80 hover:border-amber-400",
            badgeBg: "bg-amber-100 text-amber-800 border-amber-200",
            badgeText: "text-amber-700",
            iconBg: "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-200",
            buttonBg: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200 hover:shadow-amber-300",
            shadow: "hover:shadow-xl hover:shadow-amber-100/60",
        },
        highlights: ["Audit Kepatuhan Menu", "Supervisi Puskesmas", "Pelaporan Sasaran SPPG"],
    },
    {
        id: "chatbot",
        title: "Chatbot AI",
        tagline: "Asisten Gizi Cerdas",
        desc: "Kecerdasan buatan berbasis LLM untuk konsultasi interaktif, penelusuran data gizi cepat, rekomendasi intervensi, dan regulasi kesehatan.",
        icon: "smart_toy",
        badge: "AI Nutrition",
        landingUrl: "/chatbot",
        appUrl: "/chatbot/app",
        accent: {
            bgLight: "bg-purple-50/50",
            border: "border-purple-200/80 hover:border-purple-400",
            badgeBg: "bg-purple-100 text-purple-800 border-purple-200",
            badgeText: "text-purple-700",
            iconBg: "bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-purple-200",
            buttonBg: "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200 hover:shadow-purple-300",
            shadow: "hover:shadow-xl hover:shadow-purple-100/60",
        },
        highlights: ["Konsultasi 24/7", "Integrasi Data SIGMA", "Rekomendasi Intervensi"],
    },
    {
        id: "api_gateway",
        title: "API Gateway",
        tagline: "Portal Data Sharing",
        desc: "Infrastruktur pertukaran data standar, aman, dan berkecepatan tinggi antara ekosistem SIGMA dengan sistem informasi mitra dan pihak ketiga.",
        icon: "hub",
        badge: "Interoperabilitas",
        landingUrl: "/api-gateway",
        appUrl: "/api-gateway/portal",
        accent: {
            bgLight: "bg-indigo-50/50",
            border: "border-indigo-200/80 hover:border-indigo-400",
            badgeBg: "bg-indigo-100 text-indigo-800 border-indigo-200",
            badgeText: "text-indigo-700",
            iconBg: "bg-gradient-to-br from-indigo-500 to-purple-700 text-white shadow-indigo-200",
            buttonBg: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:shadow-indigo-300",
            shadow: "hover:shadow-xl hover:shadow-indigo-100/60",
        },
        highlights: ["REST API Standar", "Autentikasi API Key", "Log & Rate Limiting"],
    },
    {
        id: "calculator",
        title: "SIGMA Calculator",
        tagline: "Kalkulator Gizi Terpadu",
        desc: "Peralatan komputasi nilai gizi presisi, konversi takaran porsi pangan, perhitungan AKG harian, dan perencanaan diet sesuai standar antropometri.",
        icon: "calculate",
        badge: "Kalkulator Gizi",
        landingUrl: "/calculator",
        appUrl: "/calculator",
        accent: {
            bgLight: "bg-blue-50/50",
            border: "border-blue-200/80 hover:border-blue-400",
            badgeBg: "bg-blue-100 text-blue-800 border-blue-200",
            badgeText: "text-blue-700",
            iconBg: "bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-blue-200",
            buttonBg: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 hover:shadow-blue-300",
            shadow: "hover:shadow-xl hover:shadow-blue-100/60",
        },
        highlights: ["Kebutuhan Kalori & AKG", "Analisis Menu Harian", "Format Siap Cetak"],
    },
];

export default function SSOModulesHubPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState<string>("Pengguna");
    const [userEmail, setUserEmail] = useState<string>("");
    const [userRole, setUserRole] = useState<SigmaRole>("user");
    const [modulesAccess, setModulesAccess] = useState<string[]>([]);
    const [puskesmasName, setPuskesmasName] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.replace("/sso/login?redirect_to=/sso/modules");
                    return;
                }

                setUserEmail(user.email || "");

                const { data: appUser } = await supabase
                    .from("app_users")
                    .select("nama_lengkap, role, puskesmas_id, modules_access")
                    .eq("id", user.id)
                    .single();

                if (appUser) {
                    setUserName(appUser.nama_lengkap || user.email?.split("@")[0] || "Pengguna");
                    setUserRole((appUser.role?.toLowerCase()?.trim() || "user") as SigmaRole);
                    setModulesAccess(appUser.modules_access || []);

                    // Fetch puskesmas name if available
                    if (appUser.puskesmas_id) {
                        const { data: pkm } = await supabase
                            .from("puskesmas")
                            .select("name, nama_puskesmas")
                            .eq("id", appUser.puskesmas_id)
                            .single();
                        if (pkm) {
                            setPuskesmasName(pkm.nama_puskesmas || pkm.name || null);
                        }
                    }
                } else {
                    setUserName(user.email?.split("@")[0] || "Pengguna");
                }
            } catch (err) {
                console.error("Error loading user profile:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/sso/login";
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 font-display">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-200 flex items-center justify-center mb-4">
                    <div className="w-6 h-6 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                </div>
                <p className="text-sm font-bold text-slate-600 font-mono tracking-wide">
                    Menyiapkan Portal SIGMA...
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-800 font-display selection:bg-emerald-100 selection:text-emerald-900 flex flex-col">
            {/* ─── Top Navbar ────────────────────────────────────────────── */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        {/* Logo & Title */}
                        <div className="flex items-center gap-3">
                            <Link href="/" className="flex items-center gap-3 group">
                                <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-white border border-slate-200 shadow-sm p-1.5 group-hover:border-emerald-300 transition-colors">
                                    <Image src="/sigma_logo.png" alt="SIGMA" fill className="object-contain" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-xl tracking-tight text-slate-900">SIGMA</span>
                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md uppercase font-mono tracking-wider">
                                            Ecosystem
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium">
                                        Single Sign-On • Portal Layanan Terpadu
                                    </p>
                                </div>
                            </Link>
                        </div>

                        {/* Right: User Profile & Actions */}
                        <div className="flex items-center gap-3 sm:gap-4">
                            {/* User Profile Badge */}
                            <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200/80">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                                    <span className="material-icons-round text-base">person</span>
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                                        {userName}
                                    </p>
                                    <p className="text-[10px] font-medium text-slate-500 font-mono flex items-center gap-1">
                                        <span>{formatRoleDisplay(userRole)}</span>
                                        {puskesmasName && (
                                            <>
                                                <span>•</span>
                                                <span className="text-emerald-700 font-semibold truncate max-w-[120px]">
                                                    {puskesmasName}
                                                </span>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Back to Home Button */}
                            <Link
                                href="/"
                                className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors text-xs font-bold"
                            >
                                <span className="material-icons-round text-sm">home</span>
                                Beranda
                            </Link>

                            {/* Logout Button */}
                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 border border-red-200/80 text-red-700 hover:bg-red-100 hover:border-red-300 transition-colors text-xs font-bold"
                            >
                                <span className="material-icons-round text-sm">logout</span>
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* ─── Main Content ────────────────────────────────────────── */}
            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full">
                {/* Hero Header */}
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 shadow-xs mb-4">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase font-mono">
                            SSO Active • Akses Terautentikasi
                        </span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4">
                        Pilih Layanan Modul{" "}
                        <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                            SIGMA
                        </span>
                    </h1>
                    <p className="text-base text-slate-600 leading-relaxed">
                        Selamat datang, <span className="font-bold text-slate-900">{userName}</span>. Seluruh modul di bawah ini saling terkoneksi dalam satu sesi login. Pilih modul untuk membuka halaman informasi dan masuk ke dashboard sistem.
                    </p>
                </div>

                {/* Grid 5 Modul Terintegrasi */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    {MODULES.map((mod) => {
                        const hasAccess = canAccessModule(userRole, modulesAccess, mod.id);

                        return (
                            <div
                                key={mod.id}
                                className={`group bg-white rounded-3xl p-7 border ${mod.accent.border} shadow-sm ${mod.accent.shadow} transition-all duration-300 flex flex-col justify-between relative overflow-hidden`}
                            >
                                {/* Top Content */}
                                <div>
                                    {/* Header Icon & Badges */}
                                    <div className="flex items-start justify-between gap-4 mb-5">
                                        <div className={`w-14 h-14 rounded-2xl ${mod.accent.iconBg} flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform duration-300`}>
                                            <span className="material-icons-round text-2xl">{mod.icon}</span>
                                        </div>

                                        <div className="flex flex-col items-end gap-1.5">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider font-mono px-3 py-1 rounded-full border ${mod.accent.badgeBg}`}>
                                                {mod.badge}
                                            </span>
                                            {hasAccess ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-mono">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    Akses Siap
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                    Perlu Izin
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Title & Tagline */}
                                    <div className="mb-3">
                                        <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                            {mod.title}
                                        </h3>
                                        <p className={`text-xs font-bold uppercase tracking-wide font-mono mt-0.5 ${mod.accent.badgeText}`}>
                                            {mod.tagline}
                                        </p>
                                    </div>

                                    {/* Description */}
                                    <p className="text-sm text-slate-500 leading-relaxed mb-6">
                                        {mod.desc}
                                    </p>

                                    {/* Highlights List */}
                                    <div className="space-y-2 mb-6 pt-4 border-t border-slate-100">
                                        {mod.highlights.map((h, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                                                <span className="material-icons-round text-emerald-600 text-sm">check_circle</span>
                                                <span className="font-medium">{h}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-4 border-t border-slate-100">
                                    <Link
                                        href={mod.landingUrl}
                                        className={`w-full py-3.5 px-5 rounded-xl ${mod.accent.buttonBg} font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 group-hover:translate-y-[-1px] shadow-sm`}
                                    >
                                        <span>Buka Layanan {mod.title.replace("SIGMA ", "")}</span>
                                        <span className="material-icons-round text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                    </Link>
                                </div>
                            </div>
                        );
                    })}

                    {/* Card ke-6: SIGMA PKMK (Sistem Terpisah) */}
                    <div className="group bg-gradient-to-br from-violet-50/50 to-white rounded-3xl p-7 border border-violet-200/80 hover:border-violet-400 shadow-sm hover:shadow-xl hover:shadow-violet-100/60 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
                        <div>
                            <div className="flex items-start justify-between gap-4 mb-5">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-violet-200 group-hover:scale-105 transition-transform duration-300">
                                    <span className="material-icons-round text-2xl">medical_services</span>
                                </div>

                                <div className="flex flex-col items-end gap-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider font-mono px-3 py-1 rounded-full border bg-violet-100 text-violet-800 border-violet-200">
                                        Domain Eksternal
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-mono">
                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                        Terpisah
                                    </span>
                                </div>
                            </div>

                            <div className="mb-3">
                                <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors">
                                    SIGMA PKMK
                                </h3>
                                <p className="text-xs font-bold uppercase tracking-wide font-mono mt-0.5 text-violet-700">
                                    Intervensi Pangan Medis Khusus
                                </p>
                            </div>

                            <p className="text-sm text-slate-500 leading-relaxed mb-6">
                                Dashboard Analisis Intervensi Pemberian Formulasi PKMK bagi anak stunting di Kabupaten Malang pada domain terpisah.
                            </p>

                            <div className="space-y-2 mb-6 pt-4 border-t border-slate-100">
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <span className="material-icons-round text-purple-600 text-sm">open_in_new</span>
                                    <span className="font-medium">Aplikasi Web Mandiri</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <span className="material-icons-round text-purple-600 text-sm">cloud_queue</span>
                                    <span className="font-medium">Basis Data PKMK Terpisah</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <a
                                href="https://pkmk-malangkab.app/landing-page.html"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-3.5 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm shadow-violet-200 hover:shadow-violet-300"
                            >
                                <span>Akses PKMK Eksternal</span>
                                <span className="material-icons-round text-base">open_in_new</span>
                            </a>
                        </div>
                    </div>
                </div>
            </main>

            {/* ─── Footer ──────────────────────────────────────────────── */}
            <footer className="mt-auto border-t border-slate-200 bg-white py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                    <p>© 2026 Dinas Kesehatan Kabupaten Malang · SIGMA Ecosystem v2.1</p>
                    <p>
                        Pusat Bantuan:{" "}
                        <a
                            href="https://wa.me/6281216354887"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-emerald-700 hover:text-emerald-800 underline"
                        >
                            WhatsApp Dinkes (+6281216354887)
                        </a>
                    </p>
                </div>
            </footer>
        </div>
    );
}
