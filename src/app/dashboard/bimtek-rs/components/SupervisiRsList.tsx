"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/dashboard/layout";
import { calculateRsScore } from "@/lib/supervisiRsConfig";
import SupervisiRsForm from "./SupervisiRsForm";
import { Plus, Trash2, Edit3, Eye, Calendar, CheckCircle2, Search } from "lucide-react";

interface RsOption {
    id: string;
    nama: string;
}

interface Session {
    id: string;
    rs_id: string;
    rs_name: string;
    tanggal_supervisi: string;
    tim_supervisor: string | null;
    penanggung_jawab: string | null;
    status: string;
    created_at: string;
    totalScore: number;
    maxScore: number;
    percentage: number;
    classification: string;
    classBadge: string;
    filled: number;
}

export default function SupervisiRsList() {
    const { user } = useAuth();
    const isSuperadmin = user?.role === "superadmin";
    const isStakeholder = user?.role === "stakeholder";

    const [rsOptions, setRsOptions] = useState<RsOption[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [dbNotReady, setDbNotReady] = useState(false);
    const [filterRs, setFilterRs] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    // Load RS options
    useEffect(() => {
        async function load() {
            const { data, error } = await supabase.from("ref_rumah_sakit").select("id, nama").order("nama");
            if (error) {
                setDbNotReady(true);
                setLoading(false);
                return;
            }
            if (data) setRsOptions(data);
            else setLoading(false);
        }
        load();
    }, []);

    // Fetch sessions
    const fetchSessions = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("supervisi_rs_sessions")
                .select("id, rs_id, tanggal_supervisi, tim_supervisor, penanggung_jawab, status, created_at")
                .order("tanggal_supervisi", { ascending: false });

            if (filterRs !== "ALL") query = query.eq("rs_id", filterRs);

            const { data: sessionData, error } = await query;
            if (error) throw error;
            if (!sessionData || sessionData.length === 0) { setSessions([]); setLoading(false); return; }

            const sessionIds = sessionData.map(s => s.id);
            const { data: itemsData } = await supabase
                .from("supervisi_rs_items")
                .select("session_id, score")
                .in("session_id", sessionIds);

            const itemsBySession: Record<string, { score: number | null }[]> = {};
            (itemsData || []).forEach(item => {
                if (!itemsBySession[item.session_id]) itemsBySession[item.session_id] = [];
                itemsBySession[item.session_id].push({ score: item.score });
            });

            const enriched: Session[] = sessionData.map(s => {
                const items = itemsBySession[s.id] || [];
                const sc = calculateRsScore(items.map(i => ({ score: i.score as any })));
                const rs = rsOptions.find(r => r.id === s.rs_id);
                return {
                    id: s.id,
                    rs_id: s.rs_id,
                    rs_name: rs?.nama || "—",
                    tanggal_supervisi: s.tanggal_supervisi,
                    tim_supervisor: s.tim_supervisor,
                    penanggung_jawab: s.penanggung_jawab,
                    status: s.status,
                    created_at: s.created_at,
                    totalScore: sc.totalScore,
                    maxScore: sc.maxScore,
                    percentage: sc.percentage,
                    classification: sc.classification,
                    classBadge: sc.classBadge,
                    filled: sc.filled,
                };
            });

            setSessions(enriched);
        } catch (err) {
            console.error("Error fetching RS sessions:", err);
        } finally {
            setLoading(false);
        }
    }, [rsOptions, filterRs]);

    useEffect(() => {
        if (rsOptions.length > 0) fetchSessions();
        // rsOptions came back empty (table exists but no data)
        else if (!loading) setLoading(false);
    }, [rsOptions, fetchSessions]);

    const handleCreateNew = async () => {
        if (!isSuperadmin) return;
        if (filterRs === "ALL") { alert("Pilih Rumah Sakit terlebih dahulu."); return; }
        setCreating(true);
        try {
            const { data: session, error } = await supabase
                .from("supervisi_rs_sessions")
                .insert({
                    rs_id: filterRs,
                    tanggal_supervisi: new Date().toISOString().split("T")[0],
                    created_by: (await supabase.auth.getUser()).data.user?.id,
                })
                .select("id").single();
            if (error) { alert("Gagal membuat sesi baru: " + error.message); return; }
            setActiveSessionId(session.id);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (sessionId: string) => {
        if (!isSuperadmin) return;
        if (!confirm("Yakin ingin menghapus sesi supervisi ini?")) return;
        const { error } = await supabase.from("supervisi_rs_sessions").delete().eq("id", sessionId);
        if (error) { alert("Gagal menghapus: " + error.message); return; }
        fetchSessions();
    };

    // DB schema belum diapply
    if (dbNotReady) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
                <span className="material-icons-round text-amber-400 text-5xl">build_circle</span>
                <div>
                    <h3 className="font-bold text-amber-800 text-lg mb-1">Database Belum Disetup</h3>
                    <p className="text-sm text-amber-700 max-w-md">
                        Jalankan <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">sql/bimtek_rs_schema.sql</code> di Supabase SQL Editor, lalu buat storage bucket <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">supervisi-rs-bukti</code>.
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

    if (activeSessionId) {
        return (
            <SupervisiRsForm
                sessionId={activeSessionId}
                rsOptions={rsOptions}
                onBack={() => { setActiveSessionId(null); fetchSessions(); }}
            />
        );
    }

    const filtered = searchQuery
        ? sessions.filter(s =>
            s.rs_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.tim_supervisor || "").toLowerCase().includes(searchQuery.toLowerCase())
        )
        : sessions;

    const getClassBadgeStyle = (classification: string) => {
        if (classification === 'BAIK')   return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (classification === 'CUKUP')  return 'bg-amber-50 text-amber-700 border-amber-200';
        if (classification === 'KURANG') return 'bg-red-50 text-red-700 border-red-200';
        return 'bg-slate-100 text-slate-500 border-slate-200';
    };

    return (
        <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[220px]">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Rumah Sakit</label>
                    <select
                        value={filterRs}
                        onChange={e => setFilterRs(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 outline-none focus:ring-cyan-500 focus:border-cyan-500"
                    >
                        <option value="ALL">Semua Rumah Sakit</option>
                        {rsOptions.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                    </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cari</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari RS, tim supervisor..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-sm rounded-xl outline-none focus:ring-cyan-500 focus:border-cyan-500"
                        />
                    </div>
                </div>
                {isSuperadmin && (
                    <button
                        onClick={handleCreateNew}
                        disabled={creating}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-bold rounded-xl hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg shadow-cyan-200/50 disabled:opacity-60"
                    >
                        <Plus className="w-4 h-4" />
                        {creating ? "Membuat..." : "Tambah Supervisi Baru"}
                    </button>
                )}
            </div>

            {/* Sessions */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 font-medium animate-pulse">Memuat data supervisi RS...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="material-icons-round text-cyan-400 text-3xl">local_hospital</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">Belum ada data supervisi RS</h3>
                    {isSuperadmin && <p className="text-sm text-slate-500">Pilih RS lalu klik &quot;Tambah Supervisi Baru&quot;</p>}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(s => {
                        const isCompleted = s.status === "completed";
                        return (
                            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-cyan-200 group overflow-hidden">
                                <div className={`h-1.5 ${isCompleted ? "bg-gradient-to-r from-emerald-400 to-green-500" : "bg-gradient-to-r from-cyan-400 to-blue-500"}`} />
                                <div className="p-5 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0 mr-2">
                                            <h3 className="font-bold text-slate-800 text-sm group-hover:text-cyan-700 transition-colors leading-snug">{s.rs_name}</h3>
                                            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                                <span>{new Date(s.tanggal_supervisi).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${isCompleted ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
                                            {isCompleted ? "✓ Selesai" : "⏳ Draft"}
                                        </span>
                                    </div>

                                    {/* Score display */}
                                    {s.filled > 0 && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-500 font-medium">Total Skor</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-700">{s.totalScore}/{s.maxScore}</span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getClassBadgeStyle(s.classification)}`}>
                                                        {s.classification}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${s.percentage >= 80 ? "bg-emerald-500" : s.percentage >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                                                    style={{ width: `${s.percentage}%` }}
                                                />
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-medium">{s.percentage}% • {s.filled} item dinilai</p>
                                        </div>
                                    )}

                                    {(s.tim_supervisor || s.penanggung_jawab) && (
                                        <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl space-y-1">
                                            {s.tim_supervisor && <p><span className="font-semibold text-slate-600">Tim:</span> {s.tim_supervisor}</p>}
                                            {s.penanggung_jawab && <p><span className="font-semibold text-slate-600">PJ:</span> {s.penanggung_jawab}</p>}
                                        </div>
                                    )}

                                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                                        <button
                                            onClick={() => setActiveSessionId(s.id)}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-cyan-600 bg-cyan-50 rounded-xl hover:bg-cyan-100 transition-colors border border-cyan-100"
                                        >
                                            {isCompleted || isStakeholder ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                                            {isCompleted || isStakeholder ? "Lihat" : "Edit"}
                                        </button>
                                        {isSuperadmin && (
                                            <button
                                                onClick={() => handleDelete(s.id)}
                                                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Hapus
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
