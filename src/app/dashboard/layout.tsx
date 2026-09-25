"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import Image from "next/image";
import Link from "next/link";
import SigmaLogo from "@/components/SigmaLogo";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import UnifiedSessionTimeout from "@/components/UnifiedSessionTimeout";
import SSOModuleDropdown from "@/components/SSOModuleDropdown";
import { useAccessibility } from "@/context/AccessibilityContext";

// ─── Auth Context ───────────────────────────────────────────────────────────
interface UserData {
    id: string;
    email: string;
    role: string;
    puskesmas_id: string | null;
    nama_lengkap: string | null;
}

const AuthContext = createContext<{ user: UserData | null; loading: boolean }>({
    user: null,
    loading: true,
});

export const useAuth = () => useContext(AuthContext);

// ─── Menu Groups & Items ───────────────────────────────────────────────────
interface SidebarMenuItem {
    id: string;
    label: string;
    icon: string;
    href: string;
    ready: boolean;
    roleFilter?: (role: string) => boolean;
}

interface SidebarGroup {
    id: string;
    label: string;
    icon: string;
    items: SidebarMenuItem[];
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
    {
        id: "indikator-utama",
        label: "Indikator Utama",
        icon: "dashboard_customize",
        items: [
            {
                id: "pelayanan-kesehatan",
                label: "Pelayanan Kesehatan",
                icon: "local_hospital",
                href: "/dashboard/pelayanan-kesehatan",
                ready: true,
            },
            {
                id: "balita-gizi",
                label: "Balita Gizi",
                icon: "child_care",
                href: "/dashboard/balita-gizi",
                ready: true,
            },
            {
                id: "balita-kia",
                label: "Balita KIA",
                icon: "favorite",
                href: "/dashboard/balita-kia",
                ready: false,
            },
            {
                id: "ibu-hamil",
                label: "Ibu Hamil",
                icon: "pregnant_woman",
                href: "/dashboard/ibu-hamil",
                ready: true,
            },
            {
                id: "remaja-putri",
                label: "Remaja Putri",
                icon: "girl",
                href: "/dashboard/remaja-putri",
                ready: true,
            },
            {
                id: "analisis-pertumbuhan",
                label: "Analisis Pertumbuhan",
                icon: "query_stats",
                href: "/dashboard/analisis-pertumbuhan",
                ready: true,
            },
            {
                id: "analisis-mpdn",
                label: "Analisis MPDN",
                icon: "monitor_heart",
                href: "/dashboard/analisis-mpdn",
                ready: false,
            },
            {
                id: "program-catin",
                label: "Program Catin",
                icon: "favorite_border",
                href: "/dashboard/program-catin",
                ready: false,
            },
        ],
    },
    {
        id: "tatalaksana-balita",
        label: "Tatalaksana Balita Bermasalah Gizi",
        icon: "healing",
        items: [
            {
                id: "program-mbg",
                label: "Program MBG",
                icon: "restaurant_menu",
                href: "/dashboard/program-mbg",
                ready: true,
            },
            {
                id: "intervensi-pkmk",
                label: "Intervensi PKMK",
                icon: "medication_liquid",
                href: "/dashboard/intervensi-pkmk",
                ready: true,
            },
            {
                id: "analisis-pmt-lokal",
                label: "Analisis PMT Lokal",
                icon: "soup_kitchen",
                href: "/dashboard/analisis-pmt-lokal",
                ready: true,
            },
            {
                id: "intervensi-gizi-buruk",
                label: "Intervensi Gizi Buruk",
                icon: "emergency",
                href: "/dashboard/intervensi-gizi-buruk",
                ready: false,
            },
            {
                id: "obat-gizi",
                label: "Logistik Obat Gizi",
                icon: "medication",
                href: "/dashboard/obat-gizi",
                ready: false,
            },
        ],
    },
    {
        id: "portal-dddm",
        label: "Portal DDDM",
        icon: "hub",
        items: [
            {
                id: "ai-analytics",
                label: "AI Analytics",
                icon: "auto_awesome",
                href: "/dashboard/ai-analytics",
                ready: true,
            },
            {
                id: "dddm-insight",
                label: "DDDM Insight",
                icon: "insights",
                href: "/dashboard/dddm-insight",
                ready: false,
            },
        ],
    },
    {
        id: "monev-reports",
        label: "Monev Reports",
        icon: "summarize",
        items: [
            {
                id: "bimtek-gizi",
                label: "Bimtek Gizi",
                icon: "assignment",
                href: "/dashboard/bimtek-gizi",
                ready: true,
            },
            {
                id: "bimtek-rs",
                label: "Bimtek RS",
                icon: "domain",
                href: "/dashboard/bimtek-rs",
                ready: true,
                roleFilter: (role: string) => role === "superadmin" || role === "stakeholder",
            },
            {
                id: "pkp",
                label: "PKP",
                icon: "assessment",
                href: "/dashboard/pkp",
                ready: false,
            },
        ],
    },
];

const uploadMenuItem: SidebarMenuItem = {
    id: "upload",
    label: "Upload Data",
    icon: "cloud_upload",
    href: "/dashboard/upload",
    ready: true,
};

// ─── Dashboard Layout ───────────────────────────────────────────────────────
export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const { toggleToolbar } = useAccessibility();
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        "indikator-utama": true,
        "tatalaksana-balita": true,
        "portal-dddm": true,
        "monev-reports": true,
    });

    // Auto-expand group that contains current pathname
    useEffect(() => {
        const activeGroup = SIDEBAR_GROUPS.find((group) =>
            group.items.some((item) => item.href === pathname)
        );
        if (activeGroup) {
            setExpandedGroups((prev) => ({
                ...prev,
                [activeGroup.id]: true,
            }));
        }
    }, [pathname]);

    const toggleGroup = (groupId: string) => {
        setExpandedGroups((prev) => ({
            ...prev,
            [groupId]: !prev[groupId],
        }));
    };

    useEffect(() => {
        const fetchUser = async () => {
            const {
                data: { user: authUser },
            } = await supabase.auth.getUser();

            if (!authUser) {
                router.push("/login");
                return;
            }

            const { data: appUser } = await supabase
                .from("app_users")
                .select("*")
                .eq("id", authUser.id)
                .single();

            if (appUser) {
                setUser({
                    id: appUser.id,
                    email: appUser.email,
                    role: appUser.role?.toLowerCase()?.trim() || "user",
                    puskesmas_id: appUser.puskesmas_id,
                    nama_lengkap: appUser.nama_lengkap,
                });
            } else {
                // Fallback: use auth data if app_users lookup fails
                const isSuperadmin = authUser.email === "admin@dinkes.go.id";
                setUser({
                    id: authUser.id,
                    email: authUser.email || "",
                    role: isSuperadmin ? "superadmin" : "user",
                    puskesmas_id: null,
                    nama_lengkap: authUser.email?.split("@")[0] || "User",
                });
            }
            setLoading(false);
        };

        fetchUser();

        // Listen for auth state changes (so layout updates after login redirect)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchUser();
            }
        });

        return () => subscription.unsubscribe();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/sso/login");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm text-slate-500 font-mono uppercase tracking-widest">
                        Memuat Dashboard...
                    </p>
                </div>
            </div>
        );
    }

    const isActive = (href: string) => pathname === href;

    return (
        <AuthContext.Provider value={{ user, loading }}>
            <UnifiedSessionTimeout />
            <div className="min-h-screen bg-slate-100 font-display w-full relative">
                {/* ─── Mobile Overlay ──────────────────────────── */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* ─── Sidebar ────────────────────────────────── */}
                <aside
                    className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200 shadow-sm transition-all duration-300 ease-in-out shrink-0
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            ${sidebarCollapsed ? "w-20" : "w-72"}
          `}
                >
                    {/* Logo */}
                    <div className={`flex items-center h-16 border-b border-slate-100 shrink-0 ${sidebarCollapsed ? "px-4 justify-center" : "px-6"}`}>
                        <Link href="/rcs" className="flex items-center gap-2.5 group" aria-label="SIGMA RCS Dashboard">
                            {sidebarCollapsed ? (
                                <SigmaLogo variant="mark" className="w-8 h-8 object-contain" priority />
                            ) : (
                                <>
                                    <SigmaLogo variant="navbar" tone="color" className="h-7 w-auto object-contain" priority />
                                    <span className="text-[9px] text-emerald-600 font-bold tracking-[0.15em] uppercase font-mono border-l border-slate-200 pl-2">
                                        RCS
                                    </span>
                                </>
                            )}
                        </Link>

                        {/* Collapse toggle - desktop only */}
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="hidden lg:flex ml-auto p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <span className="material-icons-round text-lg">
                                {sidebarCollapsed ? "chevron_right" : "chevron_left"}
                            </span>
                        </button>

                        {/* Close mobile */}
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden ml-auto p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                        >
                            <span className="material-icons-round text-lg">close</span>
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto sidebar-scroll py-3 px-3 space-y-3">
                        {SIDEBAR_GROUPS.map((group) => {
                            const visibleItems = group.items.filter(
                                (item) => !item.roleFilter || item.roleFilter(user?.role || "")
                            );
                            if (visibleItems.length === 0) return null;

                            const isExpanded = expandedGroups[group.id] ?? true;
                            const hasActiveItem = visibleItems.some((item) => isActive(item.href));

                            return (
                                <div key={group.id} className="space-y-1">
                                    {!sidebarCollapsed ? (
                                        <>
                                            {/* Expandable Group Header */}
                                            <button
                                                type="button"
                                                onClick={() => toggleGroup(group.id)}
                                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 select-none group cursor-pointer ${
                                                    hasActiveItem && !isExpanded
                                                        ? "text-emerald-800 bg-emerald-50/90 border border-emerald-200/80 shadow-xs"
                                                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/70"
                                                }`}
                                                aria-expanded={isExpanded}
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span
                                                        className={`material-icons-round text-base transition-colors ${
                                                            hasActiveItem
                                                                ? "text-emerald-600"
                                                                : "text-slate-400 group-hover:text-emerald-600"
                                                        }`}
                                                    >
                                                        {group.icon}
                                                    </span>
                                                    <span className="uppercase tracking-wider font-mono text-[10px] font-extrabold truncate">
                                                        {group.label}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                                    {!isExpanded && hasActiveItem && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    )}
                                                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 group-hover:bg-slate-200">
                                                        {visibleItems.length}
                                                    </span>
                                                    <span
                                                        className={`material-icons-round text-base text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
                                                            isExpanded ? "rotate-90" : ""
                                                        }`}
                                                    >
                                                        chevron_right
                                                    </span>
                                                </div>
                                            </button>

                                            {/* Expandable Items List */}
                                            <div
                                                className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                                                    isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                                                }`}
                                            >
                                                <div className="overflow-hidden space-y-0.5 pt-0.5">
                                                    {visibleItems.map((item) => (
                                                        <Link
                                                            key={item.id}
                                                            href={item.href}
                                                            onClick={() => setSidebarOpen(false)}
                                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-[13px] font-medium transition-all duration-150 group relative ${
                                                                isActive(item.href)
                                                                    ? "bg-emerald-50 text-emerald-700 shadow-xs border border-emerald-200/80 font-semibold"
                                                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                            }`}
                                                        >
                                                            <span
                                                                className={`material-icons-round text-lg shrink-0 ${
                                                                    isActive(item.href)
                                                                        ? "text-emerald-600"
                                                                        : "text-slate-400 group-hover:text-slate-600"
                                                                }`}
                                                            >
                                                                {item.icon}
                                                            </span>
                                                            <span className="truncate">{item.label}</span>
                                                            {!item.ready && (
                                                                <span className="ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200/70 uppercase tracking-wider shrink-0 font-mono">
                                                                    Soon
                                                                </span>
                                                            )}
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        /* Collapsed Icon Rail Mode */
                                        <div className="space-y-1">
                                            <div className="border-t border-slate-100 my-2 first:hidden" />
                                            {visibleItems.map((item) => (
                                                <Link
                                                    key={item.id}
                                                    href={item.href}
                                                    onClick={() => setSidebarOpen(false)}
                                                    className={`flex items-center justify-center p-2.5 rounded-xl text-sm transition-all duration-150 group relative ${
                                                        isActive(item.href)
                                                            ? "bg-emerald-50 text-emerald-700 shadow-xs border border-emerald-200/80"
                                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                    }`}
                                                    title={`${item.label}${!item.ready ? " (Soon)" : ""}`}
                                                >
                                                    <span
                                                        className={`material-icons-round text-xl shrink-0 ${
                                                            isActive(item.href)
                                                                ? "text-emerald-600"
                                                                : "text-slate-400 group-hover:text-slate-600"
                                                        }`}
                                                    >
                                                        {item.icon}
                                                    </span>
                                                    {!item.ready && (
                                                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white"></span>
                                                    )}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Administrasi - Superadmin Only */}
                        {user?.role === "superadmin" && (
                            <div className="pt-2 border-t border-slate-100">
                                {!sidebarCollapsed ? (
                                    <>
                                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-2.5 mb-1 font-mono">
                                            Administrasi
                                        </p>
                                        <Link
                                            href={uploadMenuItem.href}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-[13px] font-medium transition-all duration-150 group ${
                                                isActive(uploadMenuItem.href)
                                                    ? "bg-emerald-50 text-emerald-700 shadow-xs border border-emerald-200/80 font-semibold"
                                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                            }`}
                                        >
                                            <span
                                                className={`material-icons-round text-lg shrink-0 ${
                                                    isActive(uploadMenuItem.href)
                                                        ? "text-emerald-600"
                                                        : "text-slate-400 group-hover:text-slate-600"
                                                }`}
                                            >
                                                {uploadMenuItem.icon}
                                            </span>
                                            <span className="truncate">{uploadMenuItem.label}</span>
                                        </Link>
                                    </>
                                ) : (
                                    <Link
                                        href={uploadMenuItem.href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`flex items-center justify-center p-2.5 rounded-xl text-sm transition-all duration-150 group ${
                                            isActive(uploadMenuItem.href)
                                                ? "bg-emerald-50 text-emerald-700 shadow-xs border border-emerald-200/80"
                                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                        title={uploadMenuItem.label}
                                    >
                                        <span
                                            className={`material-icons-round text-xl shrink-0 ${
                                                isActive(uploadMenuItem.href)
                                                    ? "text-emerald-600"
                                                    : "text-slate-400 group-hover:text-slate-600"
                                            }`}
                                        >
                                            {uploadMenuItem.icon}
                                        </span>
                                    </Link>
                                )}
                            </div>
                        )}
                    </nav>

                    {/* User Info */}
                    <div className={`border-t border-slate-100 p-4 shrink-0 ${sidebarCollapsed ? "px-2" : ""}`}>
                        {sidebarCollapsed ? (
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                                title="Logout"
                            >
                                <span className="material-icons-round text-xl">logout</span>
                            </button>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                                    <span className="material-icons-round text-emerald-600 text-lg">
                                        person
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                        {user?.nama_lengkap || user?.email?.split("@")[0]}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                                        {user?.role === "superadmin"
                                            ? "Super Admin"
                                            : (user?.email?.includes("opd") || user?.nama_lengkap?.toLowerCase().includes("opd"))
                                                ? "OPD Kab Malang"
                                                : user?.role === "stakeholder"
                                                    ? "Stakeholder Dinkes"
                                                    : "Admin PKM"}
                                    </p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors shrink-0"
                                    title="Logout"
                                >
                                    <span className="material-icons-round text-lg">logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </aside>

                {/* ─── Main Content ───────────────────────────── */}
                <div className={`flex flex-col min-h-screen min-w-0 w-full max-w-full overflow-x-hidden transition-all duration-300 ease-in-out ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-72"}`}>
                    {/* Top Header */}
                    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200 h-16 flex items-center px-4 lg:px-8 shrink-0">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-500 mr-3"
                        >
                            <span className="material-icons-round">menu</span>
                        </button>

                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-400 font-mono text-xs uppercase tracking-wider">
                                Dashboard
                            </span>
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-700 font-semibold capitalize">
                                {pathname
                                    .split("/")
                                    .pop()
                                    ?.replace(/-/g, " ") || "Overview"}
                            </span>
                        </div>

                        {/* Right side */}
                        <div className="ml-auto flex items-center gap-2 sm:gap-3">
                            {/* Accessibility Shortcut Button */}
                            <button
                                onClick={toggleToolbar}
                                aria-label="Buka Menu Aksesibilitas Web"
                                title="Aksesibilitas Web (WCAG 2.1 Level AA)"
                                className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-[#09666B] transition-colors flex items-center gap-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#09666B] cursor-pointer"
                            >
                                <span className="material-icons-round text-xl text-[#09666B]">
                                    accessibility_new
                                </span>
                                <span className="hidden md:inline text-slate-700">Aksesibilitas</span>
                            </button>

                            <SSOModuleDropdown align="right" />

                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider font-mono">
                                    System Active
                                </span>
                            </div>
                        </div>
                    </header>

                    {/* Page Content */}
                    <main id="main-content" className="flex-1 p-4 lg:p-8 min-w-0 w-full max-w-full overflow-x-hidden">{children}</main>

                    {/* Footer */}
                    <footer className="border-t border-slate-200 bg-white px-4 lg:px-8 py-4 flex items-center justify-between text-xs text-slate-400">
                        <span>
                            © 2026 Dinas Kesehatan Kabupaten Malang • SIGMA RCS v2.0
                        </span>
                        <span>
                            Crafted with{" "}
                            <span className="text-red-400">♥</span> by{" "}
                            <a
                                href="https://dedik2urniawan.github.io/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold text-emerald-600 hover:text-emerald-500 transition-colors"
                            >
                                DK
                            </a>
                        </span>
                    </footer>
                </div>
            </div>
        </AuthContext.Provider>
    );
}
