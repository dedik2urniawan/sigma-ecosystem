"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SSOModuleDropdown from "@/components/SSOModuleDropdown";

function ChatbotAppLayoutInner({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeThreadId = searchParams.get("thread_id");

    const [user, setUser] = useState<any>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [threads, setThreads] = useState<any[]>([]);
    const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const fetchThreads = useCallback(async (userId: string) => {
        try {
            // 1. Try Cloud Supabase
            const { data, error } = await supabase
                .from("chat_threads")
                .select("*")
                .eq("user_id", userId)
                .order("updated_at", { ascending: false });

            if (!error && data && data.length > 0) {
                setThreads(data);
                // Sync to local cache
                localStorage.setItem(`sigma_chat_threads_${userId}`, JSON.stringify(data));
                return;
            }
        } catch (e) {
            console.warn("Supabase chat_threads not yet migrated or offline, using fallback", e);
        }

        // 2. Fallback to LocalStorage
        try {
            const stored = localStorage.getItem(`sigma_chat_threads_${userId}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                parsed.sort((a: any, b: any) => {
                    const timeA = typeof a.created_at === "number" ? a.created_at : new Date(a.created_at).getTime();
                    const timeB = typeof b.created_at === "number" ? b.created_at : new Date(b.created_at).getTime();
                    return (timeB || 0) - (timeA || 0);
                });
                setThreads(parsed);
            }
        } catch (e) {
            console.error("Failed to load threads from local storage", e);
        }
    }, []);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/chatbot/login");
            } else {
                setUser(session.user);
                fetchThreads(session.user.id);
            }
        };

        checkAuth();
    }, [router, fetchThreads]);

    // Listen for new threads created in page.tsx
    useEffect(() => {
        const handleThreadCreated = () => {
            if (user) {
                fetchThreads(user.id);
            }
        };

        window.addEventListener("sigma_chat_thread_created", handleThreadCreated);
        window.addEventListener("storage", handleThreadCreated);
        return () => {
            window.removeEventListener("sigma_chat_thread_created", handleThreadCreated);
            window.removeEventListener("storage", handleThreadCreated);
        };
    }, [user, fetchThreads]);

    const handleRenameThread = async (threadId: string, newTitle: string) => {
        if (!newTitle.trim()) return;
        setThreads(prev => {
            const updated = prev.map(t => t.id === threadId ? { ...t, title: newTitle } : t);
            if (user) {
                localStorage.setItem(`sigma_chat_threads_${user.id}`, JSON.stringify(updated));
            }
            return updated;
        });

        try {
            await supabase
                .from("chat_threads")
                .update({ title: newTitle, updated_at: new Date().toISOString() })
                .eq("id", threadId);
        } catch (e) {
            console.warn("Failed to rename thread in cloud", e);
        }
    };

    const startRename = (e: React.MouseEvent, thread: any) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingThreadId(thread.id);
        setEditingTitle(thread.title);
    };

    const submitRename = (threadId: string) => {
        handleRenameThread(threadId, editingTitle);
        setEditingThreadId(null);
    };

    const handleDeleteThread = async (e: React.MouseEvent, threadId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm("Hapus percakapan ini secara permanen dari riwayat?")) {
            setThreads(prev => {
                const updated = prev.filter(t => t.id !== threadId);
                if (user) localStorage.setItem(`sigma_chat_threads_${user.id}`, JSON.stringify(updated));
                return updated;
            });
            localStorage.removeItem(`sigma_chat_messages_${threadId}`);

            try {
                await supabase.from("chat_threads").delete().eq("id", threadId);
            } catch (e) {
                console.warn("Failed to delete thread from cloud", e);
            }

            if (window.location.search.includes(threadId)) {
                router.push("/chatbot/app");
            }
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/chatbot/login");
    };

    const filteredThreads = threads.filter(t => 
        t.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-purple-500/30 border-t-purple-600 rounded-full animate-spin" />
                    <span className="text-xs text-slate-500 font-medium">Memuat sesi SIGMA Advisor...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50/50 font-display text-slate-800 overflow-hidden selection:bg-purple-100 selection:text-purple-900">
            {/* Sidebar Left: Chat History Drawer */}
            <aside className={`${isSidebarOpen ? 'w-72' : 'w-0'} flex-shrink-0 transition-all duration-300 ease-in-out border-r border-slate-200/80 bg-white/95 backdrop-blur-md flex flex-col relative z-20`}>
                {isSidebarOpen && (
                    <div className="flex flex-col h-full opacity-100 transition-opacity duration-300 w-72">
                        {/* Header Sidebar */}
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
                                    <span className="material-icons-round text-lg">smart_toy</span>
                                </div>
                                <div>
                                    <h2 className="font-black text-sm text-slate-900 tracking-tight flex items-center gap-1.5">
                                        SIGMA Advisor
                                    </h2>
                                    <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">AI Assistant Dinkes</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                title="Tutup Menu Riwayat"
                            >
                                <span className="material-icons-round text-lg">view_sidebar</span>
                            </button>
                        </div>

                        {/* New Chat Action */}
                        <div className="p-3">
                            <Link 
                                href="/chatbot/app" 
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30 transition-all group"
                            >
                                <span className="material-icons-round text-base group-hover:rotate-90 transition-transform duration-300">add</span>
                                <span>Obrolan Baru</span>
                            </Link>
                        </div>

                        {/* Search Filter if threads exist */}
                        {threads.length > 5 && (
                            <div className="px-3 pb-2">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                                    <span className="material-icons-round text-slate-400 text-sm">search</span>
                                    <input
                                        type="text"
                                        placeholder="Cari obrolan..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="bg-transparent text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none w-full"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Thread List */}
                        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 custom-scrollbar">
                            <div className="flex items-center justify-between px-2 pt-2 pb-1">
                                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Riwayat Sesi</span>
                                <span className="text-[10px] text-slate-400 font-mono">{filteredThreads.length} Sesi</span>
                            </div>

                            {filteredThreads.length === 0 ? (
                                <div className="p-6 text-center">
                                    <span className="material-icons-round text-3xl text-slate-300 mb-1">chat_bubble_outline</span>
                                    <p className="text-xs text-slate-400 font-medium">Belum ada obrolan</p>
                                </div>
                            ) : (
                                filteredThreads.map((thread) => {
                                    const isActive = activeThreadId === thread.id;
                                    return (
                                        <div 
                                            key={thread.id} 
                                            className={`group relative flex items-center justify-between rounded-xl transition-all ${
                                                isActive 
                                                    ? 'bg-purple-50/80 border border-purple-200/90 text-purple-900 shadow-2xs font-semibold' 
                                                    : 'hover:bg-slate-100/80 text-slate-600 hover:text-slate-900 border border-transparent'
                                            }`}
                                        >
                                            <Link
                                                href={`/chatbot/app?thread_id=${thread.id}`}
                                                className="flex items-center gap-2.5 px-3 py-2 text-xs flex-1 min-w-0"
                                            >
                                                <span className={`material-icons-round text-[16px] shrink-0 ${isActive ? 'text-purple-600' : 'text-slate-400 group-hover:text-purple-500'}`}>
                                                    chat
                                                </span>
                                                {editingThreadId === thread.id ? (
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={editingTitle}
                                                        onChange={(e) => setEditingTitle(e.target.value)}
                                                        onBlur={() => submitRename(thread.id)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') submitRename(thread.id);
                                                            if (e.key === 'Escape') setEditingThreadId(null);
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-full text-xs font-medium text-slate-800 bg-white border border-purple-300 rounded px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-purple-200"
                                                    />
                                                ) : (
                                                    <span className="truncate text-xs">{thread.title}</span>
                                                )}
                                            </Link>
                                            <div className="opacity-0 group-hover:opacity-100 pr-1.5 flex items-center gap-0.5 transition-opacity">
                                                <button
                                                    onClick={(e) => startRename(e, thread)}
                                                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md transition-all"
                                                    title="Ganti Nama"
                                                >
                                                    <span className="material-icons-round text-[13px]">edit</span>
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteThread(e, thread.id)}
                                                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-white rounded-md transition-all"
                                                    title="Hapus Obrolan"
                                                >
                                                    <span className="material-icons-round text-[13px]">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Profiling / User Card */}
                        <div className="p-3 border-t border-slate-100 bg-white">
                            <div className="p-2 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                                    {user.email?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-800 truncate">{user.email}</p>
                                    <p className="text-[10px] text-emerald-600 font-mono font-medium flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Terhubung SSO
                                    </p>
                                </div>
                                <button 
                                    onClick={handleLogout} 
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" 
                                    title="Logout"
                                >
                                    <span className="material-icons-round text-base">logout</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative bg-white overflow-hidden">
                {/* Header Navbar — High Z-Index to prevent clipping */}
                <header className="h-16 border-b border-slate-100 flex items-center justify-between px-4 sm:px-6 bg-white/95 backdrop-blur-md z-40 sticky top-0">
                    <div className="flex items-center gap-3">
                        {!isSidebarOpen && (
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                title="Buka Riwayat Percakapan"
                            >
                                <span className="material-icons-round text-xl">menu</span>
                            </button>
                        )}
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                                <span className="material-icons-round text-sm">smart_toy</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <h1 className="font-extrabold text-slate-900 text-sm tracking-tight">SIGMA Advisor</h1>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-50 text-purple-700 border border-purple-200 hidden sm:inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                                    Gemini 3.1 Flash-Lite
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <SSOModuleDropdown align="right" />
                    </div>
                </header>

                {/* Subpage Children (Full-Width Chat Viewport) */}
                <div className="flex-1 flex flex-col min-h-0 relative z-10">
                    {children}
                </div>

                {/* Ambient Subtle Gradient Orb */}
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px] pointer-events-none z-0" />
            </main>
        </div>
    );
}

export default function ChatbotAppLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-purple-500/30 border-t-purple-600 rounded-full animate-spin" />
                    <span className="text-xs text-slate-500 font-medium">Memuat SIGMA Advisor...</span>
                </div>
            </div>
        }>
            <ChatbotAppLayoutInner>{children}</ChatbotAppLayoutInner>
        </Suspense>
    );
}

