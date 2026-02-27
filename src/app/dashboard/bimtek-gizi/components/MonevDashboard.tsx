"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/dashboard/layout";
import { SUPERVISI_SECTIONS, INTEGER_SECTIONS } from "@/lib/supervisiConfig";

interface Session {
    id: string;
    puskesmas_id: string;
    puskesmas_name: string;
    tanggal_supervisi: string;
    status: string;
}

interface ItemAgg {
    section: string;
    item_number: number;
    item_label: string;
    value: string | null;
    catatan_integer: number | null;
    catatan: string | null;
}

interface SectionStats {
    id: string;
    title: string;
    inputType: 'text' | 'integer';
    yaCount: number;
    tidakCount: number;
    total: number;
    percentage: number;
    integerData: { label: string; value: number }[];
}

interface PKMRow {
    puskesmas_id: string;
    puskesmas_name: string;
    session_id: string;
    tanggal: string;
    status: string;
    total: number;
    ya: number;
    tidak: number;
    percentage: number;
}

// SVG radial gauge
function RadialGauge({ value, color }: { value: number; color: string }) {
    const r = 40;
    const circ = 2 * Math.PI * r;
    const dash = (value / 100) * circ;
    return (
        <svg viewBox="0 0 100 100" className="w-28 h-28">
            <circle cx="50" cy="50" r={r} fill="none" stroke="#E2E8F0" strokeWidth="10" />
            <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dasharray 0.9s ease' }} />
            <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="800" fill="#1E293B">{value}</text>
            <text x="50" y="60" textAnchor="middle" fontSize="10" fill="#94A3B8">%</text>
        </svg>
    );
}

// Horizontal bar
function HBar({ pct, color, label, sub }: { pct: number; color: string; label: string; sub: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-32 text-xs text-slate-600 font-semibold text-right leading-tight truncate">{label}</div>
            <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="w-14 text-xs text-slate-500 font-bold text-right">{sub}</div>
        </div>
    );
}

export default function MonevDashboard() {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin_puskesmas";

    const [puskesmasOptions, setPuskesmasOptions] = useState<{ id: string; nama: string }[]>([]);
    const [selectedPKM, setSelectedPKM] = useState<string>("all");
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedSession, setSelectedSession] = useState<string>("latest");
    const [items, setItems] = useState<ItemAgg[]>([]);
    const [pkmTable, setPkmTable] = useState<PKMRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingSessions, setLoadingSessions] = useState(true);

    // 1. Load puskesmas list from ref_puskesmas
    useEffect(() => {
        async function loadPKM() {
            if (isAdmin && user?.puskesmas_id) {
                const { data } = await supabase
                    .from("ref_puskesmas")
                    .select("id, nama")
                    .eq("id", user.puskesmas_id)
                    .single();
                if (data) setPuskesmasOptions([{ id: data.id, nama: data.nama }]);
            } else {
                const { data } = await supabase
                    .from("ref_puskesmas")
                    .select("id, nama")
                    .order("nama");
                if (data) setPuskesmasOptions(data.map((p: any) => ({ id: p.id, nama: p.nama })));
            }
        }
        loadPKM();
    }, [isAdmin, user]);

    // 2. Load sessions — NO join, fetch puskesmas name separately
    useEffect(() => {
        async function loadSessions() {
            setLoadingSessions(true);
            let q = supabase
                .from("supervisi_sessions")
                .select("id, puskesmas_id, tanggal_supervisi, status")
                .order("tanggal_supervisi", { ascending: false });

            if (isAdmin && user?.puskesmas_id) {
                q = q.eq("puskesmas_id", user.puskesmas_id);
            } else if (selectedPKM !== "all") {
                q = q.eq("puskesmas_id", selectedPKM);
            }

            const { data: sessionData, error } = await q;
            if (error) {
                console.error("Sessions load error:", error);
                setLoadingSessions(false);
                return;
            }

            if (!sessionData || sessionData.length === 0) {
                setSessions([]);
                setLoadingSessions(false);
                return;
            }

            // Fetch puskesmas names
            const pkmIds = [...new Set(sessionData.map((s: any) => s.puskesmas_id))];
            const { data: pkmData } = await supabase
                .from("ref_puskesmas")
                .select("id, nama")
                .in("id", pkmIds);
            const pkmMap: Record<string, string> = {};
            (pkmData || []).forEach((p: any) => { pkmMap[p.id] = p.nama; });

            setSessions(sessionData.map((s: any) => ({
                id: s.id,
                puskesmas_id: s.puskesmas_id,
                puskesmas_name: pkmMap[s.puskesmas_id] || "—",
                tanggal_supervisi: s.tanggal_supervisi,
                status: s.status,
            })));
            setLoadingSessions(false);
        }
        loadSessions();
    }, [isAdmin, user, selectedPKM]);

    // 3. Load items for selected session + build PKM comparison table
    const loadData = useCallback(async () => {
        if (sessions.length === 0) {
            setItems([]);
            setPkmTable([]);
            setLoading(false);
            return;
        }
        setLoading(true);

        // Items for the selected session
        const targetSession =
            selectedSession === "latest"
                ? sessions[0]
                : sessions.find(s => s.id === selectedSession) || sessions[0];

        if (targetSession) {
            const { data, error } = await supabase
                .from("supervisi_items")
                .select("section, item_number, item_label, value, catatan_integer, catatan")
                .eq("session_id", targetSession.id);
            if (error) console.error("Items load error:", error);
            setItems(data || []);
        }

        // PKM comparison (superadmin: latest session per PKM)
        if (!isAdmin) {
            // Group sessions: keep only the latest per PKM
            const latestPerPKM: Record<string, Session> = {};
            sessions.forEach(s => {
                if (!latestPerPKM[s.puskesmas_id] ||
                    s.tanggal_supervisi > latestPerPKM[s.puskesmas_id].tanggal_supervisi) {
                    latestPerPKM[s.puskesmas_id] = s;
                }
            });

            const latestSessions = Object.values(latestPerPKM);
            const sessionIds = latestSessions.map(s => s.id);

            const { data: allItems } = await supabase
                .from("supervisi_items")
                .select("session_id, value")
                .in("session_id", sessionIds);

            const rows: PKMRow[] = latestSessions.map(session => {
                const sessionItems = (allItems || []).filter((i: any) => i.session_id === session.id);
                const ya = sessionItems.filter((i: any) => i.value === "ya").length;
                const tidak = sessionItems.filter((i: any) => i.value === "tidak").length;
                const total = 32;
                return {
                    puskesmas_id: session.puskesmas_id,
                    puskesmas_name: session.puskesmas_name,
                    session_id: session.id,
                    tanggal: session.tanggal_supervisi,
                    status: session.status,
                    total, ya, tidak,
                    percentage: Math.round(((ya + tidak) / total) * 100),
                };
            }).sort((a, b) => b.percentage - a.percentage);

            setPkmTable(rows);
        }

        setLoading(false);
    }, [sessions, selectedSession, isAdmin]);

    useEffect(() => {
        if (!loadingSessions) loadData();
    }, [loadData, loadingSessions]);

    // ─── Compute section stats ──────────────────────────────────────────
    const sectionStats: SectionStats[] = SUPERVISI_SECTIONS.map(section => {
        const sItems = items.filter(i => i.section === section.id);
        const ya = sItems.filter(i => i.value === "ya").length;
        const tidak = sItems.filter(i => i.value === "tidak").length;
        const total = section.items.length;
        const pct = total > 0 ? Math.round(((ya + tidak) / total) * 100) : 0;
        const integerData = sItems
            .filter(i => i.catatan_integer !== null && i.catatan_integer !== undefined)
            .map(i => ({ label: i.item_label, value: i.catatan_integer as number }));
        return {
            id: section.id, title: section.title, inputType: section.inputType,
            yaCount: ya, tidakCount: tidak, total, percentage: pct, integerData,
        };
    });

    const totalYa = sectionStats.reduce((a, s) => a + s.yaCount, 0);
    const totalTidak = sectionStats.reduce((a, s) => a + s.tidakCount, 0);
    const totalFilled = totalYa + totalTidak;
    const overallPct = Math.round((totalFilled / 32) * 100);

    const currentSession = selectedSession === "latest"
        ? sessions[0]
        : sessions.find(s => s.id === selectedSession) || sessions[0];

    const sectionColors = [
        { bar: 'bg-gradient-to-r from-orange-400 to-amber-500', gauge: '#F97316' },
        { bar: 'bg-gradient-to-r from-blue-400 to-cyan-500', gauge: '#3B82F6' },
        { bar: 'bg-gradient-to-r from-emerald-400 to-teal-500', gauge: '#10B981' },
        { bar: 'bg-gradient-to-r from-rose-400 to-pink-500', gauge: '#F43F5E' },
        { bar: 'bg-gradient-to-r from-violet-400 to-purple-500', gauge: '#8B5CF6' },
        { bar: 'bg-gradient-to-r from-indigo-400 to-blue-500', gauge: '#6366F1' },
    ];

    if (loadingSessions) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 font-medium animate-pulse">Memuat dashboard...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
                {!isAdmin && (
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Puskesmas</label>
                        <select value={selectedPKM} onChange={e => setSelectedPKM(e.target.value)}
                            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-400 font-medium text-slate-700 min-w-[220px]">
                            <option value="all">Semua Puskesmas</option>
                            {puskesmasOptions.map(p => (
                                <option key={p.id} value={p.id}>{p.nama}</option>
                            ))}
                        </select>
                    </div>
                )}
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Sesi / Periode</label>
                    <select value={selectedSession} onChange={e => setSelectedSession(e.target.value)}
                        className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-400 font-medium text-slate-700 min-w-[260px]">
                        <option value="latest">Terbaru (Latest)</option>
                        {sessions.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.puskesmas_name} — {new Date(s.tanggal_supervisi).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            </option>
                        ))}
                    </select>
                </div>
                {currentSession && (
                    <div className="ml-auto flex items-center gap-2">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${currentSession.status === "completed" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
                            {currentSession.status === "completed" ? "✓ Selesai" : "⏳ Draft"}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">{currentSession.puskesmas_name}</span>
                    </div>
                )}
            </div>

            {/* Empty State */}
            {sessions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <span className="material-icons-round text-slate-400 text-3xl">bar_chart</span>
                    </div>
                    <p className="text-slate-600 font-semibold">Belum ada data supervisi</p>
                    <p className="text-slate-400 text-sm mt-1">Buat sesi supervisi di tab "Supervisi & Kesiapan Layanan" terlebih dahulu.</p>
                </div>
            ) : loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm animate-pulse">Memuat analisis...</p>
                </div>
            ) : (
                <>
                    {/* 4 Scorecard */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: "Total Sesi", value: String(sessions.length), icon: "assignment", grad: "from-indigo-500 to-purple-600" },
                            { label: "Kepatuhan Pengisian", value: `${overallPct}%`, icon: "check_circle", grad: "from-emerald-500 to-teal-600" },
                            { label: "Ya (Tersedia)", value: String(totalYa), icon: "thumb_up", grad: "from-blue-500 to-cyan-600" },
                            { label: "Tidak / Belum", value: String(totalTidak), icon: "thumb_down", grad: "from-rose-500 to-pink-600" },
                        ].map(card => (
                            <div key={card.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.grad} flex items-center justify-center shadow-md shrink-0`}>
                                    <span className="material-icons-round text-white text-2xl">{card.icon}</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                                    <p className="text-2xl font-extrabold text-slate-800 mt-0.5">{card.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Overall Gauge + Section Bar Chart */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="md:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col items-center justify-center gap-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Overall Score</p>
                            <RadialGauge value={overallPct} color="#6366F1" />
                            <p className="text-xs text-slate-500 font-medium text-center leading-tight">
                                {currentSession?.puskesmas_name || "—"}
                            </p>
                        </div>
                        <div className="md:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Skor Per Seksi</p>
                            <div className="space-y-3">
                                {sectionStats.map((s, idx) => (
                                    <HBar
                                        key={s.id}
                                        label={s.title}
                                        pct={s.total > 0 ? Math.round((s.yaCount / s.total) * 100) : 0}
                                        color={sectionColors[idx]?.bar || 'bg-slate-400'}
                                        sub={`${s.yaCount}/${s.total} Ya`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Text Section Analysis */}
                    <div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">📊 Analisis Seksi Text (Ya / Tidak)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {sectionStats.filter(s => s.inputType === 'text').map((s, idx) => (
                                <div key={s.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-bold text-slate-700 text-sm leading-tight">{s.title}</h4>
                                        <span className="text-xs font-bold text-indigo-600 shrink-0 ml-2">{s.total > 0 ? Math.round((s.yaCount / s.total) * 100) : 0}%</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                                        <div className={`h-full rounded-full transition-all duration-700 ${sectionColors[idx]?.bar || 'bg-indigo-500'}`}
                                            style={{ width: `${s.total > 0 ? (s.yaCount / s.total) * 100 : 0}%` }} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-emerald-50 rounded-xl py-2.5">
                                            <p className="text-xl font-extrabold text-emerald-600">{s.yaCount}</p>
                                            <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Ya</p>
                                        </div>
                                        <div className="bg-red-50 rounded-xl py-2.5">
                                            <p className="text-xl font-extrabold text-red-500">{s.tidakCount}</p>
                                            <p className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Tidak</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl py-2.5">
                                            <p className="text-xl font-extrabold text-slate-400">{s.total - s.yaCount - s.tidakCount}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Kosong</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Integer Section Analysis */}
                    <div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">🔢 Analisis Seksi Numerik (Jumlah)</h3>
                        <div className="space-y-4">
                            {sectionStats.filter(s => s.inputType === 'integer').map((s, idx) => (
                                <div key={s.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-bold text-slate-700">{s.title}</h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-400">Pengisian: </span>
                                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${s.percentage >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {s.percentage}%
                                            </span>
                                        </div>
                                    </div>
                                    {s.integerData.length > 0 ? (
                                        <>
                                            <div className="space-y-2.5">
                                                {s.integerData.map((d, i) => {
                                                    const maxVal = Math.max(...s.integerData.map(x => x.value), 1);
                                                    const pct = Math.round((d.value / maxVal) * 100);
                                                    return (
                                                        <div key={i} className="flex items-center gap-3">
                                                            <div className="w-40 text-xs text-slate-600 font-medium text-right leading-tight shrink-0 truncate" title={d.label}>{d.label}</div>
                                                            <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden">
                                                                <div className={`h-full rounded-lg flex items-center justify-end pr-2 transition-all duration-700 ${sectionColors[3 + idx]?.bar || 'bg-blue-500'}`}
                                                                    style={{ width: `${Math.max(pct, 8)}%` }}>
                                                                    <span className="text-[10px] font-bold text-white">{d.value}</span>
                                                                </div>
                                                            </div>
                                                            <div className="w-10 text-xs font-bold text-slate-600 text-right shrink-0">{d.value.toLocaleString('id-ID')}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                                <span className="text-xs text-slate-400 font-medium">Total Keseluruhan</span>
                                                <span className="text-base font-extrabold text-slate-700">
                                                    {s.integerData.reduce((a, b) => a + b.value, 0).toLocaleString('id-ID')}
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-xl">
                                            Belum ada data numerik diisi untuk sesi ini
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Superadmin PKM Comparison Table */}
                    {!isAdmin && pkmTable.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-700">🏥 Rekap Per Puskesmas</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Sesi terbaru per PKM · diurutkan berdasarkan kepatuhan pengisian</p>
                                </div>
                                <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                                    {pkmTable.length} PKM
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-10">#</th>
                                            <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Puskesmas</th>
                                            <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanggal</th>
                                            <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                            <th className="text-center py-3 px-4 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Ya</th>
                                            <th className="text-center py-3 px-4 text-[10px] font-bold text-red-400 uppercase tracking-wider">Tidak</th>
                                            <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-[160px]">Progress</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {pkmTable.map((row, idx) => (
                                            <tr key={row.session_id} className={`hover:bg-indigo-50/30 transition-colors ${idx === 0 ? 'bg-amber-50/20' : ''}`}>
                                                <td className="py-3 px-4 text-center">
                                                    {idx === 0 && <span title="Terbaik">🥇</span>}
                                                    {idx === 1 && <span title="Kedua">🥈</span>}
                                                    {idx === 2 && <span title="Ketiga">🥉</span>}
                                                    {idx > 2 && <span className="text-xs font-bold text-slate-400">{idx + 1}</span>}
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-slate-700">{row.puskesmas_name}</td>
                                                <td className="py-3 px-4 text-slate-500 text-xs">
                                                    {new Date(row.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${row.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                                        {row.status === "completed" ? "Selesai" : "Draft"}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center font-bold text-emerald-600">{row.ya}</td>
                                                <td className="py-3 px-4 text-center font-bold text-red-500">{row.tidak}</td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all duration-700 ${row.percentage >= 75 ? 'bg-gradient-to-r from-emerald-400 to-green-500' : row.percentage >= 50 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-red-400 to-rose-500'}`}
                                                                style={{ width: `${row.percentage}%` }} />
                                                        </div>
                                                        <span className={`text-xs font-bold w-10 text-right shrink-0 ${row.percentage >= 75 ? 'text-emerald-600' : row.percentage >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                                                            {row.percentage}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
