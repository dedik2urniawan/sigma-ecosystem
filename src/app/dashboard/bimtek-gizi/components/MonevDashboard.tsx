"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/dashboard/layout";
import { SUPERVISI_SECTIONS, TOTAL_ITEMS } from "@/lib/supervisiConfig";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Session {
    id: string;
    puskesmas_id: string;
    puskesmas_name: string;
    tanggal_supervisi: string;
    status: string;
}

interface SectionStats {
    id: string;
    title: string;
    inputType: 'text' | 'integer';
    yaCount: number;
    tidakCount: number;
    total: number;                          // total possible answers (section.items.length × sessionCount)
    integerData: { label: string; value: number; count: number }[];  // sum + count for average
}

interface PKMRow {
    puskesmas_id: string;
    puskesmas_name: string;
    session_id: string;
    tanggal: string;
    status: string;
    ya: number;
    tidak: number;
    percentage: number;
}

// ─── Mini components ─────────────────────────────────────────────────────────
function RadialGauge({ value, color }: { value: number; color: string }) {
    const r = 40, circ = 2 * Math.PI * r;
    const dash = (value / 100) * circ;
    return (
        <svg viewBox="0 0 100 100" className="w-28 h-28">
            <circle cx="50" cy="50" r={r} fill="none" stroke="#E2E8F0" strokeWidth="10" />
            <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 0.9s ease' }} />
            <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="800" fill="#1E293B">{value}</text>
            <text x="50" y="60" textAnchor="middle" fontSize="10" fill="#94A3B8">%</text>
        </svg>
    );
}

function HBar({ pct, color, label, sub }: { pct: number; color: string; label: string; sub: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-32 text-xs text-slate-600 font-semibold text-right leading-tight truncate">{label}</div>
            <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.max(pct, 0)}%` }} />
            </div>
            <div className="w-16 text-xs text-slate-500 font-bold text-right">{sub}</div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MonevDashboard() {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin_puskesmas";

    // Filter state
    const [pkmOptions, setPkmOptions] = useState<{ id: string; nama: string }[]>([]);
    const [selectedPKM, setSelectedPKM] = useState<string>("all");          // "all" | pkm_id
    const [allSessions, setAllSessions] = useState<Session[]>([]);           // All sessions matching PKM filter
    const [selectedSession, setSelectedSession] = useState<string>("latest-aggregate"); // "latest-aggregate" | session_id

    // Data
    const [sectionStats, setSectionStats] = useState<SectionStats[]>([]);
    const [pkmTable, setPkmTable] = useState<PKMRow[]>([]);
    const [aggregatedSessionIds, setAggregatedSessionIds] = useState<string[]>([]);  // which sessions are shown
    const [loading, setLoading] = useState(true);
    const [loadingSessions, setLoadingSessions] = useState(true);

    const sectionColors = [
        { bar: 'bg-gradient-to-r from-orange-400 to-amber-500' },
        { bar: 'bg-gradient-to-r from-blue-400 to-cyan-500' },
        { bar: 'bg-gradient-to-r from-emerald-400 to-teal-500' },
        { bar: 'bg-gradient-to-r from-rose-400 to-pink-500' },
        { bar: 'bg-gradient-to-r from-violet-400 to-purple-500' },
        { bar: 'bg-gradient-to-r from-indigo-400 to-blue-500' },
    ];

    // ── 1. Load puskesmas options ──────────────────────────────────────────
    useEffect(() => {
        async function loadPKM() {
            if (isAdmin && user?.puskesmas_id) {
                const { data } = await supabase.from("ref_puskesmas").select("id, nama").eq("id", user.puskesmas_id).single();
                if (data) setPkmOptions([{ id: data.id, nama: data.nama }]);
            } else {
                const { data } = await supabase.from("ref_puskesmas").select("id, nama").order("nama");
                if (data) setPkmOptions(data.map((p: any) => ({ id: p.id, nama: p.nama })));
            }
        }
        loadPKM();
    }, [isAdmin, user]);

    // ── 2. Load sessions whenever PKM filter changes ───────────────────────
    useEffect(() => {
        async function loadSessions() {
            setLoadingSessions(true);
            let q = supabase
                .from("supervisi_sessions")
                .select("id, puskesmas_id, tanggal_supervisi, status")
                .order("tanggal_supervisi", { ascending: false });

            if (isAdmin && user?.puskesmas_id) q = q.eq("puskesmas_id", user.puskesmas_id);
            else if (selectedPKM !== "all") q = q.eq("puskesmas_id", selectedPKM);

            const { data: sessionData, error } = await q;
            if (error || !sessionData) { setLoadingSessions(false); return; }

            // Fetch PKM names
            const pkmIds = [...new Set(sessionData.map((s: any) => s.puskesmas_id))];
            const { data: pkmData } = await supabase.from("ref_puskesmas").select("id, nama").in("id", pkmIds);
            const pkmMap: Record<string, string> = {};
            (pkmData || []).forEach((p: any) => { pkmMap[p.id] = p.nama; });

            setAllSessions(sessionData.map((s: any) => ({
                id: s.id, puskesmas_id: s.puskesmas_id,
                puskesmas_name: pkmMap[s.puskesmas_id] || "—",
                tanggal_supervisi: s.tanggal_supervisi, status: s.status,
            })));

            // Reset session selection when PKM filter changes
            setSelectedSession("latest-aggregate");
            setLoadingSessions(false);
        }
        loadSessions();
    }, [isAdmin, user, selectedPKM]);

    // ── 3. Load & aggregate items based on filter mode ────────────────────
    const loadData = useCallback(async () => {
        if (allSessions.length === 0) {
            setSectionStats(SUPERVISI_SECTIONS.map(s => ({
                id: s.id, title: s.title, inputType: s.inputType,
                yaCount: 0, tidakCount: 0, total: s.items.length,
                integerData: [],
            })));
            setPkmTable([]);
            setAggregatedSessionIds([]);
            setLoading(false);
            return;
        }
        setLoading(true);

        // ── Determine which session(s) to aggregate ──
        let targetSessionIds: string[] = [];

        if (selectedSession === "latest-aggregate") {
            if (selectedPKM === "all" && !isAdmin) {
                // AGGREGATE MODE: latest session per PKM
                const latestPerPKM: Record<string, Session> = {};
                allSessions.forEach(s => {
                    if (!latestPerPKM[s.puskesmas_id] ||
                        s.tanggal_supervisi > latestPerPKM[s.puskesmas_id].tanggal_supervisi) {
                        latestPerPKM[s.puskesmas_id] = s;
                    }
                });
                targetSessionIds = Object.values(latestPerPKM).map(s => s.id);
            } else {
                // SINGLE MODE: latest session for this PKM
                targetSessionIds = [allSessions[0].id];
            }
        } else {
            // Specific session selected
            targetSessionIds = [selectedSession];
        }

        setAggregatedSessionIds(targetSessionIds);

        // ── Load items for those sessions ──
        const { data: rawItems, error: itemErr } = await supabase
            .from("supervisi_items")
            .select("session_id, section, item_number, item_label, value, catatan_integer, catatan")
            .in("session_id", targetSessionIds);

        if (itemErr) console.error("Items load error:", itemErr);
        const items = rawItems || [];

        // ── Compute section stats ──
        const stats: SectionStats[] = SUPERVISI_SECTIONS.map(section => {
            const sItems = items.filter(i => i.section === section.id);
            const ya = sItems.filter(i => i.value === "ya").length;
            const tidak = sItems.filter(i => i.value === "tidak").length;
            // Total possible = items per section × number of sessions aggregated
            const total = section.items.length * targetSessionIds.length;

            // Integer data: sum by item_label across all sessions
            const intMap: Record<string, { sum: number; count: number }> = {};
            sItems.forEach(i => {
                if (i.catatan_integer !== null && i.catatan_integer !== undefined) {
                    if (!intMap[i.item_label]) intMap[i.item_label] = { sum: 0, count: 0 };
                    intMap[i.item_label].sum += i.catatan_integer;
                    intMap[i.item_label].count += 1;
                }
            });
            const integerData = section.items
                .filter(si => intMap[si.label])
                .map(si => ({ label: si.label, value: intMap[si.label].sum, count: intMap[si.label].count }));

            return { id: section.id, title: section.title, inputType: section.inputType, yaCount: ya, tidakCount: tidak, total, integerData };
        });
        setSectionStats(stats);

        // ── Build PKM comparison table (superadmin: always latest per PKM) ──
        if (!isAdmin) {
            const latestPerPKM: Record<string, Session> = {};
            allSessions.forEach(s => {
                if (!latestPerPKM[s.puskesmas_id] ||
                    s.tanggal_supervisi > latestPerPKM[s.puskesmas_id].tanggal_supervisi) {
                    latestPerPKM[s.puskesmas_id] = s;
                }
            });
            const latestSessions = Object.values(latestPerPKM);
            const latestIds = latestSessions.map(s => s.id);

            // Only reload if we don't already have these in items
            let tableItems: any[] = items.filter((i: any) => latestIds.includes(i.session_id));
            if (tableItems.length === 0 && latestIds.length > 0) {
                const { data: extraItems } = await supabase.from("supervisi_items").select("session_id, value").in("session_id", latestIds);
                tableItems = extraItems || [];
            }

            const rows: PKMRow[] = latestSessions.map(session => {
                const si = tableItems.filter((i: any) => i.session_id === session.id);
                const ya = si.filter((i: any) => i.value === "ya").length;
                const tidak = si.filter((i: any) => i.value === "tidak").length;
                return {
                    puskesmas_id: session.puskesmas_id,
                    puskesmas_name: session.puskesmas_name,
                    session_id: session.id,
                    tanggal: session.tanggal_supervisi,
                    status: session.status,
                    ya, tidak,
                    percentage: Math.round(((ya + tidak) / TOTAL_ITEMS) * 100),
                };
            }).sort((a, b) => b.percentage - a.percentage);
            setPkmTable(rows);
        }

        setLoading(false);
    }, [allSessions, selectedSession, selectedPKM, isAdmin]);

    useEffect(() => { if (!loadingSessions) loadData(); }, [loadData, loadingSessions]);

    // ── Derived stats ──────────────────────────────────────────────────────
    const totalYa = sectionStats.reduce((a, s) => a + s.yaCount, 0);
    const totalTidak = sectionStats.reduce((a, s) => a + s.tidakCount, 0);
    const totalPossible = TOTAL_ITEMS * Math.max(aggregatedSessionIds.length, 1);
    const overallPct = Math.round(((totalYa + totalTidak) / totalPossible) * 100);
    const yaOnlyPct = Math.round((totalYa / totalPossible) * 100);

    const isAggregateMode = selectedSession === "latest-aggregate" && selectedPKM === "all" && !isAdmin;
    const aggregateLabel = isAggregateMode
        ? `Agregasi ${aggregatedSessionIds.length} PKM`
        : allSessions.find(s => s.id === selectedSession || selectedSession === "latest-aggregate")?.puskesmas_name || "—";

    // ── Selected PKM name for display ──────────────────────────────────────
    const selectedPKMLabel = selectedPKM === "all"
        ? "Semua Puskesmas"
        : pkmOptions.find(p => p.id === selectedPKM)?.nama || "—";

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
            {/* ── Filter Bar ── */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap gap-4 items-end">
                    {!isAdmin && (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Puskesmas</label>
                            <select value={selectedPKM} onChange={e => setSelectedPKM(e.target.value)}
                                className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-400 font-medium text-slate-700 min-w-[220px]">
                                <option value="all">Semua Puskesmas</option>
                                {pkmOptions.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Sesi / Periode</label>
                        <select value={selectedSession} onChange={e => setSelectedSession(e.target.value)}
                            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-indigo-400 font-medium text-slate-700 min-w-[280px]">
                            {/* Default option changes label based on mode */}
                            <option value="latest-aggregate">
                                {isAggregateMode
                                    ? `⚡ Terbaru (Agreg. ${aggregatedSessionIds.length} PKM)`
                                    : "⚡ Terbaru (Latest)"}
                            </option>
                            {allSessions.map(s => (
                                <option key={s.id} value={s.id}>
                                    {!isAdmin && selectedPKM === "all" ? `${s.puskesmas_name} — ` : ""}
                                    {new Date(s.tanggal_supervisi).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                    {s.status === "completed" ? " ✓" : " (draft)"}
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* Active mode badge */}
                    <div className="ml-auto flex items-center gap-2 flex-wrap">
                        {isAggregateMode ? (
                            <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse inline-block" />
                                Agregasi {aggregatedSessionIds.length} PKM
                            </span>
                        ) : (
                            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                {selectedPKMLabel}
                            </span>
                        )}
                    </div>
                </div>
                {/* Aggregate mode info banner */}
                {isAggregateMode && (
                    <div className="mt-3 flex items-start gap-2 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                        <span className="material-icons-round text-indigo-500 text-base mt-0.5">info</span>
                        <p className="text-xs text-indigo-700">
                            <strong>Mode Agregasi Semua PKM:</strong> Dashboard menampilkan gabungan sesi terbaru dari semua {aggregatedSessionIds.length} Puskesmas.
                            Pilih Puskesmas atau sesi spesifik untuk melihat data individual.
                        </p>
                    </div>
                )}
            </div>

            {/* ── Empty State ── */}
            {allSessions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <span className="material-icons-round text-slate-400 text-3xl">bar_chart</span>
                    </div>
                    <p className="text-slate-600 font-semibold">Belum ada data supervisi</p>
                    <p className="text-slate-400 text-sm mt-1">Buat sesi supervisi di tab "Supervisi & Kesiapan Layanan" terlebih dahulu.</p>
                </div>
            ) : loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm animate-pulse">Menghitung agregasi...</p>
                </div>
            ) : (
                <>
                    {/* ── 4 Scorecards ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            {
                                label: isAggregateMode ? "PKM Terdata" : "Sesi Terdata",
                                value: isAggregateMode ? String(aggregatedSessionIds.length) : "1",
                                icon: isAggregateMode ? "location_city" : "assignment",
                                grad: "from-indigo-500 to-purple-600",
                            },
                            {
                                label: "Kepatuhan Pengisian",
                                value: `${overallPct}%`,
                                icon: "check_circle",
                                grad: "from-emerald-500 to-teal-600",
                            },
                            {
                                label: "Ya (Tersedia)",
                                value: String(totalYa),
                                icon: "thumb_up",
                                grad: "from-blue-500 to-cyan-600",
                            },
                            {
                                label: "Tidak / Belum",
                                value: String(totalTidak),
                                icon: "thumb_down",
                                grad: "from-rose-500 to-pink-600",
                            },
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

                    {/* ── Gauge + Section Bars ── */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="md:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col items-center justify-center gap-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Ya Score</p>
                            <RadialGauge value={yaOnlyPct} color="#6366F1" />
                            <p className="text-xs text-slate-500 font-medium text-center leading-tight">{aggregateLabel}</p>
                        </div>
                        <div className="md:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
                                Skor Per Seksi — Ya / Total {isAggregateMode ? `(${aggregatedSessionIds.length} PKM)` : ""}
                            </p>
                            <div className="space-y-3">
                                {sectionStats.map((s, idx) => {
                                    const pct = s.total > 0 ? Math.round((s.yaCount / s.total) * 100) : 0;
                                    return (
                                        <HBar key={s.id} label={s.title}
                                            pct={pct}
                                            color={sectionColors[idx]?.bar || 'bg-slate-400'}
                                            sub={`${s.yaCount}/${s.total} Ya`}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ── Text Section Cards ── */}
                    <div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
                            📊 Analisis Seksi Text (Ya / Tidak)
                            {isAggregateMode && <span className="ml-2 text-indigo-400 normal-case">— gabungan {aggregatedSessionIds.length} PKM</span>}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {sectionStats.filter(s => s.inputType === 'text').map((s, idx) => {
                                const yaPct = s.total > 0 ? Math.round((s.yaCount / s.total) * 100) : 0;
                                return (
                                    <div key={s.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-bold text-slate-700 text-sm leading-tight">{s.title}</h4>
                                            <span className="text-xs font-bold text-indigo-600 shrink-0 ml-2">{yaPct}%</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                                            <div className={`h-full rounded-full transition-all duration-700 ${sectionColors[idx]?.bar || 'bg-indigo-500'}`}
                                                style={{ width: `${yaPct}%` }} />
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
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Integer Section Cards ── */}
                    <div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
                            🔢 Analisis Seksi Numerik (Jumlah)
                            {isAggregateMode && <span className="ml-2 text-indigo-400 normal-case">— total kumulatif {aggregatedSessionIds.length} PKM</span>}
                        </h3>
                        <div className="space-y-4">
                            {sectionStats.filter(s => s.inputType === 'integer').map((s, idx) => {
                                const fillPct = s.total > 0 ? Math.round(((s.yaCount + s.tidakCount) / s.total) * 100) : 0;
                                return (
                                    <div key={s.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-bold text-slate-700">{s.title}</h4>
                                            <div className="flex items-center gap-2">
                                                {isAggregateMode && (
                                                    <span className="text-[10px] text-indigo-500 font-bold border border-indigo-100 bg-indigo-50 px-2 py-0.5 rounded-full">
                                                        Total Kumulatif
                                                    </span>
                                                )}
                                                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${fillPct >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {fillPct}% terisi
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
                                                                <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden">
                                                                    <div className={`h-full rounded-lg flex items-center px-3 transition-all duration-700 ${sectionColors[3 + idx]?.bar || 'bg-blue-500'}`}
                                                                        style={{ width: `${Math.max(pct, 10)}%` }}>
                                                                        <span className="text-[10px] font-bold text-white">{d.value.toLocaleString('id-ID')}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="w-16 text-xs font-bold text-slate-600 text-right shrink-0">
                                                                    {d.value.toLocaleString('id-ID')}
                                                                    {isAggregateMode && d.count > 1 && (
                                                                        <span className="block text-[9px] text-slate-400 font-normal">{d.count} PKM</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                                    <span className="text-xs text-slate-400">
                                                        {isAggregateMode ? "Total Kumulatif" : "Total"}
                                                    </span>
                                                    <span className="text-base font-extrabold text-slate-700">
                                                        {s.integerData.reduce((a, b) => a + b.value, 0).toLocaleString('id-ID')}
                                                    </span>
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-xl">
                                                Belum ada data numerik diisi
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── PKM Comparison Table (superadmin only) ── */}
                    {!isAdmin && pkmTable.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-700">🏥 Rekap Per Puskesmas</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Sesi terbaru per PKM · diurutkan berdasarkan kepatuhan pengisian</p>
                                </div>
                                <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">{pkmTable.length} PKM</span>
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
                                                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : <span className="text-xs font-bold text-slate-400">{idx + 1}</span>}
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
