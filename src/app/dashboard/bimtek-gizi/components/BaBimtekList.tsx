"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/dashboard/layout";
import { Plus, Trash2, FileText, Calendar, MapPin, Clock, CheckCircle2, RotateCcw } from "lucide-react";

interface Props {
    onOpenForm: (sessionId: string) => void;
}

interface Session {
    id: string;
    puskesmas_id: string;
    puskesmas_name: string;
    tanggal_kegiatan: string;
    tempat_kegiatan: string | null;
    status: string;
    created_at: string;
}

export default function BaBimtekList({ onOpenForm }: Props) {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin_puskesmas";

    const isStakeholder = user?.role === "stakeholder";

    const [sessions, setSessions] = useState<Session[]>([]);
    const [pkmOptions, setPkmOptions] = useState<{ id: string; nama: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [filterPKM, setFilterPKM] = useState("all");

    // Load puskesmas options for superadmin filter
    useEffect(() => {
        if (!isAdmin) {
            supabase.from("ref_puskesmas").select("id, nama").order("nama").then(({ data }) => {
                if (data) setPkmOptions(data.map((p: any) => ({ id: p.id, nama: p.nama })));
            });
        }
    }, [isAdmin]);

    // Load sessions
    const loadSessions = async () => {
        setLoading(true);
        let q = supabase
            .from("ba_bimtek_sessions")
            .select("id, puskesmas_id, tanggal_kegiatan, tempat_kegiatan, status, created_at")
            .order("created_at", { ascending: false });

        if (isAdmin && user?.puskesmas_id) q = q.eq("puskesmas_id", user.puskesmas_id);
        else if (filterPKM !== "all") q = q.eq("puskesmas_id", filterPKM);

        const { data } = await q;
        if (!data) { setLoading(false); return; }

        // Fetch PKM names
        const pkmIds = [...new Set(data.map((s: any) => s.puskesmas_id))];
        const { data: pkmData } = await supabase.from("ref_puskesmas").select("id, nama").in("id", pkmIds);
        const pkmMap: Record<string, string> = {};
        (pkmData || []).forEach((p: any) => { pkmMap[p.id] = p.nama; });

        setSessions(data.map((s: any) => ({
            ...s,
            puskesmas_name: pkmMap[s.puskesmas_id] || "—",
        })));
        setLoading(false);
    };

    useEffect(() => { loadSessions(); }, [filterPKM, isAdmin, user]);

    // Create new session
    const handleCreate = async () => {
        if (creating || isStakeholder) return;
        const pkmId = isAdmin ? user?.puskesmas_id : (filterPKM !== "all" ? filterPKM : pkmOptions[0]?.id);
        if (!pkmId) { alert("Pilih Puskesmas terlebih dahulu."); return; }

        setCreating(true);
        const { data, error } = await supabase
            .from("ba_bimtek_sessions")
            .insert({ puskesmas_id: pkmId, tanggal_kegiatan: new Date().toISOString().split("T")[0], status: "draft", created_by: user?.id })
            .select("id")
            .single();

        if (error || !data) { alert("Gagal membuat BA: " + error?.message); setCreating(false); return; }
        onOpenForm(data.id);
        setCreating(false);
    };

    // Delete session
    const handleDelete = async (id: string) => {
        if (isStakeholder) return;
        if (!confirm("Hapus Berita Acara ini? Semua data akan terhapus.")) return;
        await supabase.from("ba_bimtek_sessions").delete().eq("id", id);
        await loadSessions();
    };

    // Revert session to draft
    const handleRevert = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (isAdmin || isStakeholder) return;
        if (!confirm("Kembalikan Berita Acara ini ke Draft? Tim Puskesmas akan dapat mengedit kembali form ini.")) return;

        const { error } = await supabase.from("ba_bimtek_sessions").update({ status: "draft" }).eq("id", id);
        if (error) {
            alert("Gagal mengembalikan ke Draft: " + error.message);
        } else {
            await loadSessions();
        }
    };

    const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

    return (
        <div className="space-y-5">
            {/* Top Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
                {!isAdmin && (
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Filter Puskesmas</label>
                        <select value={filterPKM} onChange={e => setFilterPKM(e.target.value)}
                            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-teal-400 font-medium text-slate-700 min-w-[220px]">
                            <option value="all">Semua Puskesmas</option>
                            {pkmOptions.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
                        </select>
                    </div>
                )}
                {!isStakeholder && (
                    <div className="ml-auto">
                        <button onClick={handleCreate} disabled={creating}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl hover:from-teal-700 hover:to-emerald-700 shadow-md shadow-teal-200/50 disabled:opacity-60 transition-all">
                            <Plus className="w-4 h-4" />
                            {creating ? "Membuat..." : "Buat Berita Acara"}
                        </button>
                    </div>
                )}
            </div>

            {/* Sessions List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm animate-pulse">Memuat data...</p>
                </div>
            ) : sessions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-100 flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-teal-400" />
                    </div>
                    <p className="text-slate-600 font-semibold">Belum ada Berita Acara</p>
                    {!isStakeholder && <p className="text-slate-400 text-sm mt-1">Klik "Buat Berita Acara" untuk membuat dokumen baru.</p>}
                </div>
            ) : (
                <div className="space-y-3">
                    {sessions.map(s => (
                        <div key={s.id}
                            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 hover:border-teal-200 hover:shadow-md transition-all cursor-pointer group"
                            onClick={() => onOpenForm(s.id)}>
                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${s.status === "completed" ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-teal-400 to-cyan-500"} shadow-sm`}>
                                {s.status === "completed"
                                    ? <CheckCircle2 className="w-6 h-6 text-white" />
                                    : <FileText className="w-6 h-6 text-white" />}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-bold text-slate-800 text-base truncate">BA Supervisi — {s.puskesmas_name}</h3>
                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${s.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                        {s.status === "completed" ? "✓ Selesai" : "⏳ Draft"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <Calendar className="w-3.5 h-3.5 text-teal-400" />
                                        {formatDate(s.tanggal_kegiatan)}
                                    </span>
                                    {s.tempat_kegiatan && (
                                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <MapPin className="w-3.5 h-3.5 text-teal-400" />
                                            {s.tempat_kegiatan}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <Clock className="w-3.5 h-3.5" />
                                        Dibuat {new Date(s.created_at).toLocaleDateString("id-ID")}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            {!isStakeholder && (
                                <div className="flex items-center gap-2 shrink-0">
                                    {!isAdmin && s.status === "completed" && (
                                        <button onClick={(e) => handleRevert(s.id, e)}
                                            title="Kembalikan ke Draft"
                                            className="p-2 rounded-xl hover:bg-amber-50 text-slate-300 hover:text-amber-500 transition-colors border border-transparent hover:border-amber-100 flex items-center justify-center">
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                                        title="Hapus Berita Acara"
                                        className="p-2 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors border border-transparent hover:border-red-100 flex items-center justify-center">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
