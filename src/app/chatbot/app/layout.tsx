"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ChatbotAppLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [threads, setThreads] = useState<any[]>([]);

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
    }, [router]);

    const fetchThreads = async (userId: string) => {
        const { data, error } = await supabase
            .from("chatbot_threads")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (!error && data) {
            setThreads(data);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/chatbot/login");
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-white font-display text-slate-800 overflow-hidden selection:bg-purple-100 selection:text-purple-900">
            {/* Sidebar Left */}
            <aside className={`\${isSidebarOpen ? 'w-72' : 'w-0'} flex-shrink-0 transition-all duration-300 ease-in-out border-r border-slate-100 bg-slate-50/50 flex flex-col relative`}>
                {isSidebarOpen && (
                    <div className="flex flex-col h-full opacity-100 transition-opacity duration-300 w-72">
                        {/* Header Sidebar */}
                        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-white">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                                <span className="material-icons-round text-lg">smart_toy</span>
                            </div>
                            <div>
                                <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">SIGMA Advisor</h2>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Chat History</p>
                            </div>
                        </div>

                        {/* New Chat Button */}
                        <div className="p-4">
                            <Link href="/chatbot/app" className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800 border border-purple-100 transition-colors font-semibold text-xs shadow-sm group">
                                <span className="material-icons-round text-lg text-purple-600 group-hover:text-purple-700 transition-colors">add</span>
                                Obrolan Baru
                            </Link>
                        </div>

                        {/* Thread List */}
                        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 custom-scrollbar">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 ml-1 mt-2">Riwayat Percakapan</p>
                            {threads.length === 0 ? (
                                <p className="text-xs text-slate-500 italic ml-1">Belum ada percakapan</p>
                            ) : (
                                threads.map((thread) => (
                                    <div key={thread.id} className="group relative flex items-center justify-between rounded-lg hover:bg-slate-100 transition-colors">
                                        <Link
                                            href={`/chatbot/app?thread_id=\${thread.id}`}
                                            className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:text-slate-900 flex-1 truncate"
                                        >
                                            <span className="material-icons-round text-[16px] text-slate-400 group-hover:text-purple-500 transition-colors">chat_bubble_outline</span>
                                            <span className="text-xs font-medium truncate">{thread.title}</span>
                                        </Link>
                                        <button
                                            onClick={async (e) => {
                                                e.preventDefault();
                                                if (confirm("Hapus percakapan ini secara permanen?")) {
                                                    await supabase.from("chatbot_threads").delete().eq("id", thread.id);
                                                    setThreads((prev) => prev.filter((t) => t.id !== thread.id));
                                                    if (window.location.search.includes(thread.id)) {
                                                        router.push("/chatbot/app");
                                                    }
                                                }
                                            }}
                                            className="opacity-0 group-hover:opacity-100 absolute right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                            title="Hapus Obrolan"
                                        >
                                            <span className="material-icons-round text-[14px]">delete</span>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Profiling / User Menu */}
                        <div className="p-4 border-t border-slate-100 bg-white">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                                    {user.email?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-xs font-bold text-slate-800 truncate">{user.email}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{user.id.slice(0, 8)}...</p>
                                </div>
                                <button onClick={handleLogout} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Logout">
                                    <span className="material-icons-round text-lg">logout</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative bg-white">
                {/* Header Navbar */}
                <header className="h-16 border-b border-slate-100 flex items-center justify-between px-4 sm:px-6 bg-white z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <span className="material-icons-round">{isSidebarOpen ? 'keyboard_double_arrow_left' : 'keyboard_double_arrow_right'}</span>
                        </button>
                        {!isSidebarOpen && (
                            <Link href="/chatbot/app" className="flex items-center justify-center gap-2">
                                <div className="w-7 h-7 rounded bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                                    <span className="material-icons-round text-[14px]">smart_toy</span>
                                </div>
                                <span className="font-bold text-slate-800 text-sm">SIGMA Advisor</span>
                            </Link>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/rcs" className="text-xs font-bold text-slate-500 hover:text-purple-600 flex items-center gap-1.5 uppercase tracking-wide border border-transparent hover:border-purple-100 hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-all">
                            <span className="material-icons-round text-sm">dashboard</span>
                            <span className="hidden sm:inline">RCS Dashboard</span>
                        </Link>
                    </div>
                </header>

                {/* Subpage Children (Chat Area) */}
                {children}

                {/* Background Decor (Optional) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none z-0"></div>
            </main>
        </div>
    );
}
