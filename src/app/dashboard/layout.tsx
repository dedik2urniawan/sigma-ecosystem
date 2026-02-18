"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

// ─── Menu Items ─────────────────────────────────────────────────────────────
const menuItems = [
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
        ready: false,
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
        ready: false,
    },
    {
        id: "remaja-putri",
        label: "Remaja Putri",
        icon: "girl",
        href: "/dashboard/remaja-putri",
        ready: false,
    },
    {
        id: "analisis-pertumbuhan",
        label: "Analisis Pertumbuhan",
        icon: "query_stats",
        href: "/dashboard/analisis-pertumbuhan",
        ready: false,
    },
    {
        id: "ai-analytics",
        label: "AI Analytics",
        icon: "auto_awesome",
        href: "/dashboard/ai-analytics",
        ready: false,
    },
];

const uploadMenuItem = {
    id: "upload",
    label: "Upload Data",
    icon: "cloud_upload",
    href: "/dashboard/upload",
    ready: true,
    superadminOnly: true,
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
        router.push("/login");
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
            <div className="flex min-h-screen bg-slate-100 font-display">
                {/* ─── Mobile Overlay ──────────────────────────── */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* ─── Sidebar ────────────────────────────────── */}
                <aside
                    className={`fixed lg:sticky top-0 left-0 h-screen z-50 flex flex-col bg-white border-r border-slate-200 shadow-sm transition-all duration-300 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            ${sidebarCollapsed ? "w-20" : "w-72"}
          `}
                >
                    {/* Logo */}
                    <div className={`flex items-center h-16 border-b border-slate-100 shrink-0 ${sidebarCollapsed ? "px-4 justify-center" : "px-6"}`}>
                        <Link href="/rcs" className="flex items-center gap-3 group">
                            <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-white border border-slate-100 shadow p-0.5 shrink-0">
                                <Image
                                    src="/sigma_logo.png"
                                    alt="SIGMA"
                                    fill
                                    className="object-contain"
                                />
                            </div>
                            {!sidebarCollapsed && (
                                <div className="flex flex-col">
                                    <span className="font-extrabold text-sm text-slate-900 leading-none tracking-tight">
                                        SIGMA
                                    </span>
                                    <span className="text-[9px] text-emerald-600 font-bold tracking-[0.15em] uppercase font-mono">
                                        RCS Dashboard
                                    </span>
                                </div>
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
                    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                        {!sidebarCollapsed && (
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 font-mono">
                                Indikator
                            </p>
                        )}

                        {menuItems.map((item) => (
                            <Link
                                key={item.id}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative
                  ${isActive(item.href)
                                        ? "bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    }
                  ${sidebarCollapsed ? "justify-center" : ""}
                `}
                                title={sidebarCollapsed ? item.label : undefined}
                            >
                                <span
                                    className={`material-icons-round text-xl shrink-0 ${isActive(item.href)
                                        ? "text-emerald-600"
                                        : "text-slate-400 group-hover:text-slate-600"
                                        }`}
                                >
                                    {item.icon}
                                </span>
                                {!sidebarCollapsed && (
                                    <>
                                        <span className="truncate">{item.label}</span>
                                        {!item.ready && (
                                            <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-wider shrink-0">
                                                Soon
                                            </span>
                                        )}
                                    </>
                                )}
                                {sidebarCollapsed && !item.ready && (
                                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400"></span>
                                )}
                            </Link>
                        ))}

                        {/* Upload - Superadmin only */}
                        {user?.role === "superadmin" && (
                            <>
                                {!sidebarCollapsed && (
                                    <div className="pt-4 mt-4 border-t border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 font-mono">
                                            Administrasi
                                        </p>
                                    </div>
                                )}
                                {sidebarCollapsed && <div className="border-t border-slate-100 my-2"></div>}
                                <Link
                                    href={uploadMenuItem.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                    ${isActive(uploadMenuItem.href)
                                            ? "bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        }
                    ${sidebarCollapsed ? "justify-center" : ""}
                  `}
                                    title={sidebarCollapsed ? uploadMenuItem.label : undefined}
                                >
                                    <span
                                        className={`material-icons-round text-xl shrink-0 ${isActive(uploadMenuItem.href)
                                            ? "text-emerald-600"
                                            : "text-slate-400 group-hover:text-slate-600"
                                            }`}
                                    >
                                        {uploadMenuItem.icon}
                                    </span>
                                    {!sidebarCollapsed && (
                                        <span className="truncate">{uploadMenuItem.label}</span>
                                    )}
                                </Link>
                            </>
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
                <div className="flex-1 flex flex-col min-h-screen">
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
                        <div className="ml-auto flex items-center gap-3">
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
                    <main className="flex-1 p-4 lg:p-8">{children}</main>

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
