"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/dashboard/layout";
import { SUPERVISI_RS_SECTIONS, calculateRsScore, ScoreValue } from "@/lib/supervisiRsConfig";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import * as xlsx from "xlsx";
import { Download, FileSpreadsheet } from "lucide-react";

interface RsRow {
    rs_id: string;
    rs_name: string;
    session_id: string;
    tanggal: string;
    status: string;
    totalScore: number;
    maxScore: number;
    percentage: number;
    classification: string;
    classBadge: string;
    score0: number;
    score1: number;
    score2: number;
    filled: number;
}

interface SectionStat {
    id: string;
    title: string;
    avgScore: number;
    maxScore: number;
    percentage: number;
}

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
            <div className="w-48 text-xs text-slate-600 font-semibold text-right leading-tight truncate">{label}</div>
            <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.max(pct, 0)}%` }} />
            </div>
            <div className="w-20 text-xs text-slate-500 font-bold text-right">{sub}</div>
        </div>
    );
}

export default function MonevRsDashboard() {
    const { user } = useAuth();
    const [rsOptions, setRsOptions] = useState<{ id: string; nama: string }[]>([]);
    const [selectedRs, setSelectedRs] = useState("all");
    const [rsTable, setRsTable] = useState<RsRow[]>([]);
    const [sectionStats, setSectionStats] = useState<SectionStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [dbNotReady, setDbNotReady] = useState(false);
    const [exportingPDF, setExportingPDF] = useState(false);
    const [exportingExcel, setExportingExcel] = useState(false);
    const dashboardRef = useRef<HTMLDivElement>(null);

    // Load RS options
    useEffect(() => {
        supabase.from("ref_rumah_sakit").select("id, nama").order("nama").then(({ data, error }) => {
            if (error) {
                // Table doesn't exist yet — schema belum diapply
                setDbNotReady(true);
                setLoading(false);
                return;
            }
            if (data && data.length > 0) {
                setRsOptions(data);
            } else {
                // Table exists but empty or schema not applied
                setLoading(false);
            }
        });
    }, []);

    // Load data
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            let sessQuery = supabase
                .from("supervisi_rs_sessions")
                .select("id, rs_id, tanggal_supervisi, status")
                .order("tanggal_supervisi", { ascending: false });

            if (selectedRs !== "all") sessQuery = sessQuery.eq("rs_id", selectedRs);

            const { data: sessions } = await sessQuery;
            if (!sessions || sessions.length === 0) {
                setRsTable([]); setSectionStats([]); setLoading(false); return;
            }

            // Take latest session per RS for aggregation
            const latestByRs: Record<string, typeof sessions[0]> = {};
            sessions.forEach(s => {
                if (!latestByRs[s.rs_id]) latestByRs[s.rs_id] = s;
            });
            const targetSessions = Object.values(latestByRs);
            const targetIds = targetSessions.map(s => s.id);

            const { data: items } = await supabase
                .from("supervisi_rs_items")
                .select("session_id, section, item_number, score")
                .in("session_id", targetIds);

            // Build RS table
            const rows: RsRow[] = targetSessions.map(s => {
                const sItems = (items || []).filter(i => i.session_id === s.id).map(i => ({ score: i.score as ScoreValue }));
                const sc = calculateRsScore(sItems);
                const rs = rsOptions.find(r => r.id === s.rs_id);
                return {
                    rs_id: s.rs_id,
                    rs_name: rs?.nama || s.rs_id,
                    session_id: s.id,
                    tanggal: s.tanggal_supervisi,
                    status: s.status,
                    ...sc,
                };
            });
            rows.sort((a, b) => b.percentage - a.percentage);
            setRsTable(rows);

            // Build section stats (across all target sessions)
            const secStats: SectionStat[] = SUPERVISI_RS_SECTIONS.map(sec => {
                const secItems = (items || []).filter(i => i.section === sec.id).map(i => ({ score: i.score as ScoreValue }));
                const sc = calculateRsScore(secItems);
                return {
                    id: sec.id,
                    title: sec.title,
                    avgScore: sc.totalScore,
                    maxScore: sc.maxScore,
                    percentage: sc.maxScore > 0 ? Math.round((sc.totalScore / sc.maxScore) * 100) : 0,
                };
            });
            setSectionStats(secStats);
        } finally {
            setLoading(false);
        }
    }, [selectedRs, rsOptions]);

    useEffect(() => {
        if (rsOptions.length > 0) {
            loadData();
        }
        // If rsOptions loaded but still empty (table just seeded empty), stop loading
    }, [rsOptions, loadData]);

    // Overall aggregate
    const overall = rsTable.length > 0
        ? Math.round(rsTable.reduce((s, r) => s + r.percentage, 0) / rsTable.length)
        : 0;
    const baik  = rsTable.filter(r => r.classification === 'BAIK').length;
    const cukup = rsTable.filter(r => r.classification === 'CUKUP').length;
    const kurang= rsTable.filter(r => r.classification === 'KURANG').length;

    const overallColor = overall >= 80 ? "#10b981" : overall >= 60 ? "#f59e0b" : "#ef4444";

    // Export PDF
    const handleExportPDF = async () => {
        if (!dashboardRef.current) return;
        setExportingPDF(true);
        try {
            const dataUrl = await toPng(dashboardRef.current, { backgroundColor: '#ffffff', cacheBust: true });
            const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            doc.addImage(dataUrl, "PNG", 0, 0, pageW, pageH);
            doc.save(`Dashboard_Monev_RS_${new Date().toISOString().split('T')[0]}.pdf`);
        } finally {
            setExportingPDF(false);
        }
    };

    // Export Excel
    const handleExportExcel = () => {
        setExportingExcel(true);
        try {
            const wsData = [
                ["Nama Rumah Sakit", "Tanggal", "Status", "Total Skor", "Maks Skor", "Persentase (%)", "Klasifikasi", "Skor 2 (Lengkap)", "Skor 1 (Tdk Lengkap)", "Skor 0 (Tidak Ada)"],
                ...rsTable.map(r => [
                    r.rs_name, r.tanggal, r.status === "completed" ? "Selesai" : "Draft",
                    r.totalScore, r.maxScore, r.percentage, r.classification,
                    r.score2, r.score1, r.score0,
                ]),
            ];
            const ws = xlsx.utils.aoa_to_sheet(wsData);
            ws['!cols'] = [{ wch: 40 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 14 }];

            const wsSec = xlsx.utils.aoa_to_sheet([
                ["Domain / Bab", "Total Skor", "Maks Skor", "Persentase (%)"],
                ...sectionStats.map(s => [s.title, s.avgScore, s.maxScore, s.percentage]),
            ]);

            const wb = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(wb, ws, "Rekapitulasi RS");
            xlsx.utils.book_append_sheet(wb, wsSec, "Per Domain");
            xlsx.writeFile(wb, `Monev_Supervisi_RS_${new Date().toISOString().split('T')[0]}.xlsx`);
        } finally {
            setExportingExcel(false);
        }
    };

    // Schema belum diapply ke Supabase
    if (dbNotReady) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
                <span className="material-icons-round text-amber-400 text-5xl">build_circle</span>
                <div>
                    <h3 className="font-bold text-amber-800 text-lg mb-1">Database Belum Disetup</h3>
                    <p className="text-sm text-amber-700 max-w-md">
                        Tabel <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">ref_rumah_sakit</code> belum ada di Supabase.
                        Jalankan file <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">sql/bimtek_rs_schema.sql</code> di Supabase SQL Editor terlebih dahulu.
                    </p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-amber-700 bg-amber-100 rounded-xl hover:bg-amber-200 border border-amber-300"
                >
                    <span className="material-icons-round text-base">refresh</span>
                    Coba Lagi
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 font-medium animate-pulse">Memuat dashboard monev RS...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filter & Export Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end justify-between">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Filter Rumah Sakit</label>
                    <select value={selectedRs} onChange={e => setSelectedRs(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 outline-none focus:ring-cyan-500 focus:border-cyan-500">
                        <option value="all">Semua Rumah Sakit (Agregat)</option>
                        {rsOptions.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                    </select>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExportExcel} disabled={exportingExcel || rsTable.length === 0}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-emerald-600 bg-emerald-50 rounded-xl hover:bg-emerald-100 border border-emerald-100 disabled:opacity-50">
                        <FileSpreadsheet className="w-4 h-4" />
                        {exportingExcel ? "Mengekspor..." : "Excel"}
                    </button>
                    <button onClick={handleExportPDF} disabled={exportingPDF || rsTable.length === 0}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-purple-600 bg-purple-50 rounded-xl hover:bg-purple-100 border border-purple-100 disabled:opacity-50">
                        <Download className="w-4 h-4" />
                        {exportingPDF ? "Mengekspor..." : "PDF"}
                    </button>
                </div>
            </div>

            {rsTable.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <span className="material-icons-round text-slate-300 text-5xl mb-4 block">bar_chart</span>
                    <p className="text-slate-500">Belum ada data supervisi RS yang tersedia.</p>
                </div>
            ) : (
                <div ref={dashboardRef} className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: "Total RS Dievaluasi", value: rsTable.length, icon: "local_hospital", color: "text-cyan-600", bg: "bg-cyan-50" },
                            { label: "Kategori BAIK", value: baik, icon: "verified", color: "text-emerald-600", bg: "bg-emerald-50" },
                            { label: "Kategori CUKUP", value: cukup, icon: "warning", color: "text-amber-600", bg: "bg-amber-50" },
                            { label: "Kategori KURANG", value: kurang, icon: "error", color: "text-red-600", bg: "bg-red-50" },
                        ].map(k => (
                            <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                                <div className={`w-10 h-10 ${k.bg} rounded-xl flex items-center justify-center mb-3`}>
                                    <span className={`material-icons-round ${k.color} text-xl`}>{k.icon}</span>
                                </div>
                                <p className="text-2xl font-extrabold text-slate-800">{k.value}</p>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">{k.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Gauge + Section Bars */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Radial Gauge */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <h3 className="font-bold text-slate-700 mb-4">Rata-rata Kepatuhan</h3>
                            <div className="flex items-center gap-6">
                                <RadialGauge value={overall} color={overallColor} />
                                <div className="space-y-2">
                                    <div className="text-sm text-slate-600">
                                        <span className="font-bold text-slate-800">Agregat semua RS</span>
                                        <br />
                                        <span className="text-xs">berdasarkan supervisi terakhir</span>
                                    </div>
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold ${overall >= 80 ? "bg-emerald-50 text-emerald-700" : overall >= 60 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                                        {overall >= 80 ? "BAIK" : overall >= 60 ? "CUKUP" : "KURANG"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section Bars */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <h3 className="font-bold text-slate-700 mb-4">Capaian per Domain</h3>
                            <div className="space-y-3">
                                {sectionStats.map(s => (
                                    <HBar
                                        key={s.id}
                                        label={s.title}
                                        pct={s.percentage}
                                        sub={`${s.percentage}%`}
                                        color={s.percentage >= 80 ? "bg-emerald-500" : s.percentage >= 60 ? "bg-amber-500" : "bg-red-500"}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RS Ranking Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-700">Tabel Ranking Rumah Sakit</h3>
                            <span className="text-xs text-slate-400">{rsTable.length} RS tersupervisi</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nama RS</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Skor</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">%</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Klasifikasi</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Lengkap</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Tdk Lengkap</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Tidak Ada</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {rsTable.map((r, idx) => (
                                        <tr key={r.rs_id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3 font-bold text-slate-400 text-xs">{idx + 1}</td>
                                            <td className="px-4 py-3 font-semibold text-slate-800 text-xs max-w-[200px]">
                                                <span className="line-clamp-2">{r.rs_name}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs text-slate-500">
                                                {new Date(r.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-slate-700">{r.totalScore}/{r.maxScore}</td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="font-bold text-slate-800 text-sm">{r.percentage}%</span>
                                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${r.percentage >= 80 ? "bg-emerald-500" : r.percentage >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${r.percentage}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${r.classBadge}`}>{r.classification}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs font-bold text-emerald-600 hidden md:table-cell">{r.score2}</td>
                                            <td className="px-4 py-3 text-center text-xs font-bold text-amber-600 hidden md:table-cell">{r.score1}</td>
                                            <td className="px-4 py-3 text-center text-xs font-bold text-red-500 hidden md:table-cell">{r.score0}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${r.status === "completed" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
                                                    {r.status === "completed" ? "✓ Selesai" : "⏳ Draft"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Classification Distribution */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h3 className="font-bold text-slate-700 mb-4">Distribusi Klasifikasi RS</h3>
                        <div className="flex flex-wrap gap-4">
                            {[
                                { label: "BAIK (≥80%)", count: baik, pct: rsTable.length ? Math.round(baik/rsTable.length*100) : 0, color: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                                { label: "CUKUP (60–79%)", count: cukup, pct: rsTable.length ? Math.round(cukup/rsTable.length*100) : 0, color: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200" },
                                { label: "KURANG (<60%)", count: kurang, pct: rsTable.length ? Math.round(kurang/rsTable.length*100) : 0, color: "bg-red-500", badge: "bg-red-50 text-red-700 border-red-200" },
                            ].map(c => (
                                <div key={c.label} className={`flex-1 min-w-[150px] border rounded-xl p-4 ${c.badge}`}>
                                    <div className="text-3xl font-extrabold">{c.count}</div>
                                    <div className="text-sm font-bold mt-1">{c.label}</div>
                                    <div className="text-xs opacity-70 mt-0.5">{c.pct}% dari total</div>
                                    <div className="w-full h-1.5 bg-white/50 rounded-full mt-2 overflow-hidden">
                                        <div className={`h-full ${c.color} rounded-full transition-all duration-700`} style={{ width: `${c.pct}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
