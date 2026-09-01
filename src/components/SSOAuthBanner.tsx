"use client";

/**
 * SSOAuthBanner — Toolbar Autentikasi Modern (Light Theme)
 * Muncul sebagai sticky top bar di seluruh module landing pages.
 * Menampilkan status SSO, identitas user, CTA ke sistem dashboard,
 * serta tombol "Semua Modul" dengan expand menu 5 modul terpadu.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatRoleDisplay } from "@/lib/sso-utils";
import SSOModuleDropdown from "./SSOModuleDropdown";

interface SSOAuthBannerProps {
    /** Path ke system/app dari modul ini */
    appPath: string;
    /** Label CTA button, e.g. "Masuk ke Dashboard" */
    ctaLabel?: string;
    /** Warna aksen banner */
    accentColor?: "emerald" | "amber" | "indigo" | "purple" | "blue";
    /** Icon untuk CTA button */
    ctaIcon?: string;
}

interface UserInfo {
    nama_lengkap: string | null;
    role: string;
    puskesmas_id: string | null;
    email: string;
}

const ACCENT_STYLES = {
    emerald: {
        cta: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 hover:shadow-emerald-300",
        badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
        dot: "bg-emerald-500",
    },
    amber: {
        cta: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200 hover:shadow-amber-300",
        badge: "bg-amber-50 text-amber-800 border-amber-200",
        dot: "bg-amber-500",
    },
    indigo: {
        cta: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:shadow-indigo-300",
        badge: "bg-indigo-50 text-indigo-800 border-indigo-200",
        dot: "bg-indigo-500",
    },
    purple: {
        cta: "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200 hover:shadow-purple-300",
        badge: "bg-purple-50 text-purple-800 border-purple-200",
        dot: "bg-purple-500",
    },
    blue: {
        cta: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 hover:shadow-blue-300",
        badge: "bg-blue-50 text-blue-800 border-blue-200",
        dot: "bg-blue-500",
    },
};

export default function SSOAuthBanner({
    appPath,
    ctaLabel = "Masuk ke Sistem",
    accentColor = "emerald",
    ctaIcon = "dashboard",
}: SSOAuthBannerProps) {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(false);
    const style = ACCENT_STYLES[accentColor];

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (!authUser) { setLoading(false); return; }

                const { data: appUser } = await supabase
                    .from("app_users")
                    .select("nama_lengkap, role, puskesmas_id, email")
                    .eq("id", authUser.id)
                    .single();

                if (appUser) {
                    setUser({
                        nama_lengkap: appUser.nama_lengkap,
                        role: appUser.role || "user",
                        puskesmas_id: appUser.puskesmas_id,
                        email: appUser.email || authUser.email || "",
                    });
                }
            } catch { /* silent */ } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    // Animate in after data load
    useEffect(() => {
        if (!loading && user) {
            const t = setTimeout(() => setVisible(true), 100);
            return () => clearTimeout(t);
        }
    }, [loading, user]);

    if (loading || !user) return null;

    const displayName = user.nama_lengkap || user.email.split("@")[0] || "User";
    const roleDisplay = formatRoleDisplay(user.role);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/sso/login";
    };

    return (
        <div
            className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-500 ${visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}`}
        >
            {/* Top Toolbar Bar */}
            <div className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14 gap-3 sm:gap-6">
                        {/* Left: User Identity */}
                        <div className="flex items-center gap-3 min-w-0">
                            {/* Pulsing Status Dot */}
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${style.dot} opacity-75`} />
                                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${style.dot}`} />
                                </span>
                                <span className="text-[11px] font-extrabold uppercase tracking-wider font-mono text-emerald-800 hidden sm:inline">
                                    SSO Aktif
                                </span>
                            </div>

                            <div className="w-px h-5 bg-slate-200 hidden sm:block" />

                            {/* User Avatar & Name */}
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm shrink-0">
                                    <span className="material-icons-round text-lg">account_circle</span>
                                </div>
                                <div className="truncate">
                                    <p className="text-sm font-extrabold text-slate-900 truncate">
                                        {displayName}
                                    </p>
                                </div>
                            </div>

                            {/* Role Badge */}
                            <div className="hidden md:block">
                                <span className={`text-[10px] font-bold uppercase tracking-wider font-mono px-2.5 py-1 rounded-md border ${style.badge}`}>
                                    {roleDisplay}
                                </span>
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            {/* Expandable "Semua Modul" Dropdown */}
                            <SSOModuleDropdown align="right" />

                            {/* Logout Button */}
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 hover:border-red-200 transition-colors text-xs font-bold font-mono"
                                title="Keluar dari akun"
                            >
                                <span className="material-icons-round text-base">logout</span>
                                <span className="hidden md:inline">Logout</span>
                            </button>

                            {/* Main CTA Button: Enter System */}
                            <Link
                                href={appPath}
                                className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl ${style.cta} text-xs font-extrabold uppercase tracking-wider transition-all shadow-md hover:-translate-y-0.5 group font-mono`}
                            >
                                <span className="material-icons-round text-base">{ctaIcon}</span>
                                <span>{ctaLabel}</span>
                                <span className="material-icons-round text-sm group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
