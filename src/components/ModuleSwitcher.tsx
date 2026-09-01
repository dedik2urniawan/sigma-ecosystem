"use client";

/**
 * ModuleSwitcher — Widget untuk berpindah antar modul tanpa logout.
 * Digunakan di layout dashboard (inline sidebar) atau floating button.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SIGMA_MODULES, canAccessModule, type SigmaRole } from "@/lib/sso-utils";

interface ModuleSwitcherProps {
    /** Mode tampilan: floating (default) atau inline di sidebar */
    mode?: "floating" | "inline";
}

export default function ModuleSwitcher({ mode = "floating" }: ModuleSwitcherProps) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [role, setRole] = useState<SigmaRole>("user");
    const [modules, setModules] = useState<string[]>([]);

    useEffect(() => {
        const fetchRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: appUser } = await supabase
                .from("app_users")
                .select("role, modules_access")
                .eq("id", user.id)
                .single();
            if (appUser) {
                setRole((appUser.role?.toLowerCase()?.trim() || "user") as SigmaRole);
                setModules(appUser.modules_access || []);
            }
        };
        fetchRole();
    }, []);

    const accessibleModules = SIGMA_MODULES.filter(m =>
        canAccessModule(role, modules, m.id)
    );

    if (mode === "inline") {
        return (
            <div className="space-y-1">
                <div className="flex items-center justify-between px-3 mb-2">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">
                        Lintas Modul
                    </p>
                    <Link
                        href="/sso/modules"
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline font-mono"
                    >
                        Hub ↗
                    </Link>
                </div>
                {accessibleModules.map(mod => {
                    const isActive = pathname.startsWith(mod.appPath) || pathname.startsWith(mod.landingPath);
                    return mod.isExternal ? (
                        <a
                            key={mod.id}
                            href={mod.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all group text-xs font-semibold"
                        >
                            <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${mod.color} flex items-center justify-center shrink-0 shadow-xs`}>
                                <span className="material-icons-round text-white text-xs">{mod.icon}</span>
                            </div>
                            <span className="truncate">{mod.label}</span>
                            <span className="material-icons-round text-xs ml-auto text-slate-400">open_in_new</span>
                        </a>
                    ) : (
                        <Link
                            key={mod.id}
                            href={mod.landingPath}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all group text-xs font-semibold ${
                                isActive
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-100 shadow-2xs"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                            }`}
                        >
                            <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${mod.color} flex items-center justify-center shrink-0 shadow-xs`}>
                                <span className="material-icons-round text-white text-xs">{mod.icon}</span>
                            </div>
                            <span className="truncate">{mod.label}</span>
                            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 ml-auto" />}
                        </Link>
                    );
                })}
            </div>
        );
    }

    // Floating mode (Light Theme)
    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Dropdown */}
            {open && (
                <div className="absolute bottom-14 right-0 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <p className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider font-mono">
                            Pindah Layanan Modul
                        </p>
                        <Link
                            href="/sso/modules"
                            onClick={() => setOpen(false)}
                            className="text-[10px] font-bold text-emerald-700 hover:underline uppercase font-mono"
                        >
                            Hub Modul ↗
                        </Link>
                    </div>
                    <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
                        {accessibleModules.map(mod => {
                            const isActive = pathname.startsWith(mod.appPath);
                            return mod.isExternal ? (
                                <a
                                    key={mod.id}
                                    href={mod.externalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 transition-all text-xs font-semibold group"
                                >
                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${mod.color} flex items-center justify-center shrink-0 shadow-xs`}>
                                        <span className="material-icons-round text-white text-sm">{mod.icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-xs text-slate-900 truncate">{mod.label}</p>
                                        <p className="text-[10px] text-slate-400 truncate">Domain terpisah</p>
                                    </div>
                                    <span className="material-icons-round text-slate-400 text-xs">open_in_new</span>
                                </a>
                            ) : (
                                <Link
                                    key={mod.id}
                                    href={mod.landingPath}
                                    onClick={() => setOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-xs font-semibold ${
                                        isActive
                                            ? "bg-emerald-50 text-emerald-900 border border-emerald-100"
                                            : "text-slate-700 hover:bg-slate-50"
                                    }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${mod.color} flex items-center justify-center shrink-0 shadow-xs`}>
                                        <span className="material-icons-round text-white text-sm">{mod.icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-xs text-slate-900 truncate">{mod.label}</p>
                                        <p className="text-[10px] text-slate-400 truncate">{mod.description}</p>
                                    </div>
                                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* FAB Button */}
            <button
                onClick={() => setOpen(!open)}
                className={`w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center transition-all ${
                    open
                        ? "bg-slate-900 text-white"
                        : "bg-white border border-slate-200 text-slate-700 hover:text-emerald-700 hover:border-emerald-300 hover:shadow-2xl"
                }`}
                title="Pilih Modul SIGMA"
            >
                <span className="material-icons-round text-xl">{open ? "close" : "grid_view"}</span>
            </button>
        </div>
    );
}
