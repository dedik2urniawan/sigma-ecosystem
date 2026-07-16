"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/dashboard/layout";
import { Plus, Trash2, Edit3, Eye, Calendar, RotateCcw, Search } from "lucide-react";

interface Props {
    onOpenForm: (sessionId: string) => void;
}

interface Session {
    id: string;
    rs_id: string;
    rs_name: string;
    tanggal_kegiatan: string;
    tempat_kegiatan: string | null;
    status: string;
    created_at: string;
}

export default function BaRsList({ onOpenForm }: Props) {
    const { user } = useAuth();
    const isSuperadmin = user?.role === "superadmin";
    const isStakeholder = user?.role === "stakeholder";

    const [rsOptions, setRsOptions] = useState<{ id: string; nama: string }[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [dbNotReady, setDbNotReady] = useState(false);
    const [filterRs, setFilterRs] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [creating, setCreating] = useState(false);

    // Load RS options
    useEffect(() => {
        supabase.from("ref_rumah_sakit").select("id, nama").order("nama").then(({ data, error }) => {
            if (error) {
                setDbNotReady(true);
                setLoading(false);
                return;
            }
            if (data) setRsOptions(data);
        });
    }, []);

    const fetchSessions = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("ba_rs_sessions")
                .select("id, rs_id, rs_name, tanggal_kegiatan, tempat_kegiatan, status, created_at")
                .order("created_at", { ascending: false });

            if (filterRs !== "ALL") query = query.eq("rs_id", filterRs);

            const { data, error } = await query;
            if (error) {
                // Table doesn't exist — schema not applied yet
                if (error.code === '42P01' || error.message?.includes('does not exist')) {
                    setDbNotReady(true);
                } else {
                    console.error("Error fetching BA RS sessions:", error.message);
                }
                setSessions([]);
                return;
            }
            setSessions(data || []);
        } catch (err: any) {
            console.error("Unexpected error:", err?.message || err);
        } finally {
            setLoading(false);
        }
    }, [filterRs]);

    useEffect(() => { fetchSessions(); }, [fetchSessions]);

    // If dbNotReady, show setup instructions
    if (dbNotReady) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
                <span className="material-icons-round text-amber-400 text-5xl">build_circle</span>
                <div>
                    <h3 className="font-bold text-amber-800 text-lg mb-1">Database Belum Disetup</h3>
                    <p className="text-sm text-amber-700 max-w-md">
                        Jalankan <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">sql/bimtek_rs_schema.sql</code> di Supabase SQL Editor terlebih dahulu.
                    </p>
                </div>
                <button onClick={() => window.location.reload()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-amber-700 bg-amber-100 rounded-xl hover:bg-amber-200 border border-amber-300">
                    <span className="material-icons-round text-base">refresh</span>
                    Coba Lagi
                </button>
            </div>
        );
    }

    const handleCreateNew = async () => {
        if (!isSuperadmin) return;
        if (filterRs === "ALL") { alert("Pilih Rumah Sakit terlebih dahulu."); return; }
        setCreating(true);
        try {
            const rs = rsOptions.find(r => r.id === filterRs);
            const { data: session, error } = await supabase
                .from("ba_rs_sessions")
                .insert({
                    rs_id: filterRs,
                    rs_name: rs?.nama || "—",
                    tanggal_kegiatan: new Date().toISOString().split("T")[0],
                    created_by: (await supabase.auth.getUser()).data.user?.id,
                })
                .select("id").single();
            if (error) { alert("Gagal membuat BA: " + error.message); return; }
            onOpenForm(session.id);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (sessionId: string) => {
        if (!isSuperadmin) return;
        if (!confirm("Yakin ingin menghapus Berita Acara ini?")) return;
        const { error } = await supabase.from("ba_rs_sessions").delete().eq("id", sessionId);
        if (error) { alert("Gagal menghapus: " + error.message); return; }
        fetchSessions();
    };

    const handleRevert = async (sessionId: string) => {
        if (!isSuperadmin) return;
        if (!confirm("Kembalikan BA ini ke Draft?")) return;
        await supabase.from("ba_rs_sessions").update({ status: "draft" }).eq("id", sessionId);
        fetchSessions();
    };

    const filtered = searchQuery
        ? sessions.filter(s =>
            s.rs_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.tempat_kegiatan || "").toLowerCase().includes(searchQuery.toLowerCase())
        )
        : sessions;

    return (
        <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[220px]">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Rumah Sakit</label>
                    <select value={filterRs} onChange={e => setFilterRs(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 outline-none focus:ring-cyan-500 focus:border-cyan-500">
                        <option value="ALL">Semua Rumah Sakit</option>
                        {rsOptions.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                    </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cari</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Cari RS atau tempat kegiatan..."
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-sm rounded-xl outline-none focus:ring-cyan-500 focus:border-cyan-500" />
                    </div>
                </div>
                {isSuperadmin && (
                    <button onClick={handleCreateNew} disabled={creating}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-sm font-bold rounded-xl hover:from-teal-700 hover:to-emerald-700 transition-all shadow-lg shadow-teal-200/50 disabled:opacity-60">
                        <Plus className="w-4 h-4" />
                        {creating ? "Membuat..." : "Buat Berita Acara Baru"}
                    </button>
                )}
            </div>

            {/* Sessions */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 font-medium animate-pulse">Memuat daftar Berita Acara...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="material-icons-round text-teal-400 text-3xl">description</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">Belum ada Berita Acara RS</h3>
                    {isSuperadmin && <p className="text-sm text-slate-500">Pilih RS lalu klik &quot;Buat Berita Acara Baru&quot;</p>}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(s => {
                        const isCompleted = s.status === "completed";
                        return (
                            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-teal-200 group overflow-hidden">
                                <div className={`h-1.5 ${isCompleted ? "bg-gradient-to-r from-emerald-400 to-green-500" : "bg-gradient-to-r from-teal-400 to-cyan-500"}`} />
                                <div className="p-5 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0 mr-2">
                                            <h3 className="font-bold text-slate-800 text-sm group-hover:text-teal-700 transition-colors leading-snug">{s.rs_name}</h3>
                                            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                                <span>{new Date(s.tanggal_kegiatan).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                                            </div>
                                            {s.tempat_kegiatan && (
                                                <p className="text-xs text-slate-400 mt-1 truncate">{s.tempat_kegiatan}</p>
                                            )}
                                        </div>
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${isCompleted ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
                                            {isCompleted ? "✓ Selesai" : "⏳ Draft"}
                                        </span>
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                                        <button onClick={() => onOpenForm(s.id)}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-teal-600 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors border border-teal-100">
                                            {isCompleted || isStakeholder ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                                            {isCompleted || isStakeholder ? "Lihat" : "Edit"}
                                        </button>
                                        {isSuperadmin && isCompleted && (
                                            <button onClick={() => handleRevert(s.id)}
                                                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-600 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors border border-amber-100">
                                                <RotateCcw className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        {isSuperadmin && (
                                            <button onClick={() => handleDelete(s.id)}
                                                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors border border-red-100">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
