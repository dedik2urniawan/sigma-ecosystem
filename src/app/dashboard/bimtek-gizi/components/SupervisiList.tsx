"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/dashboard/layout";
import { calculateCompletionScore, TOTAL_ITEMS } from "@/lib/supervisiConfig";
import SupervisiForm from "./SupervisiForm";
import { Plus, Trash2, Edit3, Eye, Calendar, MapPin, CheckCircle2, Clock, AlertTriangle, Search } from "lucide-react";

interface Session {
    id: string;
    puskesmas_id: string;
    puskesmas_name: string;
    tanggal_supervisi: string;
    tim_supervisor: string | null;
    penanggung_jawab: string | null;
    status: string;
    created_at: string;
    yaCount: number;
    tidakCount: number;
    filled: number;
    percentage: number;
}

export default function SupervisiList() {
    const { user } = useAuth();
    const effectiveRole = user?.role === "admin_puskesmas" ? "admin_puskesmas" : "superadmin";
    const isStakeholder = user?.role === "stakeholder";

    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [puskesmasOptions, setPuskesmasOptions] = useState<{ id: string; name: string }[]>([]);
    const [filterPuskesmas, setFilterPuskesmas] = useState("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    // Form view state
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [creatingNew, setCreatingNew] = useState(false);

    // Load puskesmas options
    useEffect(() => {
        async function load() {
            const { data } = await supabase.from("ref_puskesmas").select("id, nama").order("nama");
            if (data) {
                const filtered = data.filter(d => !d.nama.toLowerCase().includes("dinkes"));
                setPuskesmasOptions(filtered.map(d => ({ id: d.id, name: d.nama })));

                if (effectiveRole === "admin_puskesmas" && user?.puskesmas_id) {
                    setFilterPuskesmas(user.puskesmas_id);
                }
            }
        }
        load();
    }, [effectiveRole, user?.puskesmas_id]);

    // Fetch sessions
    const fetchSessions = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("supervisi_sessions")
                .select("id, puskesmas_id, tanggal_supervisi, tim_supervisor, penanggung_jawab, status, created_at")
                .order("tanggal_supervisi", { ascending: false });

            if (effectiveRole === "admin_puskesmas" && user?.puskesmas_id) {
                query = query.eq("puskesmas_id", user.puskesmas_id);
            } else if (filterPuskesmas !== "ALL") {
                query = query.eq("puskesmas_id", filterPuskesmas);
            }

            const { data: sessionData, error } = await query;
            if (error) throw error;
            if (!sessionData || sessionData.length === 0) {
                setSessions([]);
                setLoading(false);
                return;
            }

            // Fetch all items for these sessions to calculate scores
            const sessionIds = sessionData.map(s => s.id);
            const { data: itemsData } = await supabase
                .from("supervisi_items")
                .select("session_id, value")
                .in("session_id", sessionIds);

            const itemsBySession: Record<string, { value: string | null }[]> = {};
            (itemsData || []).forEach(item => {
                if (!itemsBySession[item.session_id]) itemsBySession[item.session_id] = [];
                itemsBySession[item.session_id].push({ value: item.value });
            });

            const enriched: Session[] = sessionData.map(s => {
                const items = itemsBySession[s.id] || [];
                const score = calculateCompletionScore(items);
                const pkm = puskesmasOptions.find(p => p.id === s.puskesmas_id);
                return {
                    id: s.id,
                    puskesmas_id: s.puskesmas_id,
                    puskesmas_name: pkm?.name || "—",
                    tanggal_supervisi: s.tanggal_supervisi,
                    tim_supervisor: s.tim_supervisor,
                    penanggung_jawab: s.penanggung_jawab,
                    status: s.status,
                    created_at: s.created_at,
                    yaCount: score.yaCount,
                    tidakCount: score.tidakCount,
                    filled: score.filled,
                    percentage: score.percentage,
                };
            });

            setSessions(enriched);
        } catch (err) {
            console.error("Error fetching sessions:", err);
        } finally {
            setLoading(false);
        }
    }, [puskesmasOptions, effectiveRole, user?.puskesmas_id, filterPuskesmas]);

    useEffect(() => {
        if (puskesmasOptions.length > 0) fetchSessions();
    }, [puskesmasOptions, fetchSessions]);

    // Create new session
    const handleCreateNew = async () => {
        if (isStakeholder) return;
        const pkmId = effectiveRole === "admin_puskesmas" ? user?.puskesmas_id : filterPuskesmas !== "ALL" ? filterPuskesmas : null;
        if (!pkmId) {
            alert("Pilih Puskesmas terlebih dahulu.");
            return;
        }

        const { data: session, error } = await supabase
            .from("supervisi_sessions")
            .insert({
                puskesmas_id: pkmId,
                tanggal_supervisi: new Date().toISOString().split("T")[0],
                created_by: (await supabase.auth.getUser()).data.user?.id,
            })
            .select("id")
            .single();

        if (error) {
            console.error("Error creating session:", error);
            alert("Gagal membuat sesi supervisi baru.");
            return;
        }

        setActiveSessionId(session.id);
        setCreatingNew(true);
    };

    // Delete session
    const handleDelete = async (sessionId: string) => {
        if (isStakeholder) return;
        if (!confirm("Yakin ingin menghapus sesi supervisi ini beserta semua data terkait?")) return;
        const { error } = await supabase.from("supervisi_sessions").delete().eq("id", sessionId);
        if (error) {
            console.error("Error deleting session:", error);
            alert("Gagal menghapus sesi.");
            return;
        }
        fetchSessions();
    };

    // If form is open, show form
    if (activeSessionId) {
        return (
            <SupervisiForm
                sessionId={activeSessionId}
                puskesmasOptions={puskesmasOptions}
                onBack={() => {
                    setActiveSessionId(null);
                    setCreatingNew(false);
                    fetchSessions();
                }}
            />
        );
    }

    const filteredSessions = searchQuery
        ? sessions.filter(s =>
            s.puskesmas_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.tim_supervisor || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.penanggung_jawab || "").toLowerCase().includes(searchQuery.toLowerCase())
        )
        : sessions;

    return (
        <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
                {effectiveRole === "superadmin" && (
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Puskesmas</label>
                        <select
                            value={filterPuskesmas}
                            onChange={(e) => setFilterPuskesmas(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none"
                        >
                            <option value="ALL">Semua Puskesmas</option>
                            {puskesmasOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                )}
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cari</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari Puskesmas, Tim, atau PJ..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 text-sm rounded-xl outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>
                {!isStakeholder && (
                    <button
                        onClick={handleCreateNew}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200/50"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Supervisi Baru
                    </button>
                )}
            </div>

            {/* Loading */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium animate-pulse">Memuat data supervisi...</p>
                </div>
            ) : filteredSessions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="material-icons-round text-indigo-400 text-3xl">assignment</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">Belum ada data supervisi</h3>
                    {!isStakeholder && <p className="text-sm text-slate-500 mb-6">Klik tombol "Tambah Supervisi Baru" untuk memulai.</p>}
                </div>
            ) : (
                /* Session Cards */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSessions.map((s) => {
                        const isCompleted = s.status === "completed";
                        return (
                            <div
                                key={s.id}
                                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-indigo-200 group overflow-hidden"
                            >
                                {/* Header stripe */}
                                <div className={`h-1.5 ${isCompleted ? "bg-gradient-to-r from-emerald-400 to-green-500" : "bg-gradient-to-r from-amber-400 to-orange-500"}`} />

                                <div className="p-5 space-y-4">
                                    {/* Title + Status */}
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-base group-hover:text-indigo-700 transition-colors">{s.puskesmas_name}</h3>
                                            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span>{new Date(s.tanggal_supervisi).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${isCompleted
                                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                            : "bg-amber-50 text-amber-600 border-amber-200"}`}>
                                            {isCompleted ? "✓ Selesai" : "⏳ Draft"}
                                        </span>
                                    </div>

                                    {/* Meta */}
                                    {(s.tim_supervisor || s.penanggung_jawab) && (
                                        <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-3 rounded-xl">
                                            {s.tim_supervisor && <p><span className="font-semibold text-slate-600">Tim:</span> {s.tim_supervisor}</p>}
                                            {s.penanggung_jawab && <p><span className="font-semibold text-slate-600">PJ:</span> {s.penanggung_jawab}</p>}
                                        </div>
                                    )}

                                    {/* Progress */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span className="font-medium text-slate-500">Progress pengisian</span>
                                            <span className="font-bold text-slate-700">{s.filled}/{TOTAL_ITEMS} ({s.percentage}%)</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${s.percentage >= 100 ? "bg-emerald-500" : s.percentage >= 50 ? "bg-indigo-500" : "bg-amber-500"}`}
                                                style={{ width: `${s.percentage}%` }}
                                            />
                                        </div>
                                        <div className="flex gap-3 mt-2 text-[10px]">
                                            <span className="text-emerald-600 font-bold">✓ Ya: {s.yaCount}</span>
                                            <span className="text-red-500 font-bold">✗ Tidak: {s.tidakCount}</span>
                                            <span className="text-slate-400 font-bold">○ Belum: {TOTAL_ITEMS - s.filled}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                                        <button
                                            onClick={() => setActiveSessionId(s.id)}
                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-100"
                                        >
                                            {isCompleted || isStakeholder ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                                            {isCompleted || isStakeholder ? "Lihat" : "Edit"}
                                        </button>
                                        {!isStakeholder && (
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
