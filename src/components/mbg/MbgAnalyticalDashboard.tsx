"use client";

import React, { useMemo, useState } from "react";
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";

interface MbgAnalyticalDashboardProps {
    data: any[];
    isLoading: boolean;
}

const COLORS_PIE = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316", "#84cc16"];

const CLOSED_QUESTIONS_META = [
    { id: "q1",  label: "Tenaga Ahli Gizi",               fullLabel: "Apakah SPPG memiliki Tenaga Ahli Gizi yang memenuhi kualifikasi (D3/D4/S1 Gizi atau berpengalaman min. 1 tahun)?", category: "SDM" },
    { id: "q2",  label: "Penyusunan Master Menu",          fullLabel: "Apakah penyusunan master menu dilakukan berkala setiap minggu oleh Ahli Gizi bersama tim dapur?", category: "SDM" },
    { id: "q3",  label: "Menu per Kelompok Sasaran",       fullLabel: "Apakah master menu disusun spesifik dan disesuaikan berdasarkan variasi kebutuhan gizi masing-masing kelompok sasaran?", category: "SDM" },
    { id: "q4",  label: "Koordinasi Antar SPPG",           fullLabel: "Apakah penentuan bahan pangan dan siklus menu telah dikoordinasikan antar-tenaga gizi SPPG sewilayah?", category: "SDM" },
    { id: "q5",  label: "Bahan Terfortifikasi",            fullLabel: "Apakah bahan pangan wajib terfortifikasi (tepung terigu, minyak, garam beryodium) digunakan dalam setiap pengolahan?", category: "SDM" },
    { id: "q6",  label: "Bahan Makanan Lokal",             fullLabel: "Apakah menu hidangan dirancang dengan mengutamakan bahan makanan lokal yang sudah dikenal masyarakat setempat?", category: "SDM" },
    { id: "q7",  label: "Identifikasi Alergi Sasaran",    fullLabel: "Apakah sudah dilakukan identifikasi sasaran yang memiliki riwayat alergi/intoleransi dan disediakan menu alternatif?", category: "SDM" },
    { id: "q8",  label: "Struktur Menu Seimbang",          fullLabel: "Apakah struktur menu sudah lengkap mengacu prinsip Gizi Seimbang (makanan pokok, lauk-pauk, sayuran, buah)?", category: "Gizi" },
    { id: "q9",  label: "Kontribusi Gizi Pagi 20-25%",    fullLabel: "Jika MBG disajikan sebagai makan pagi (06.00–09.00), apakah kontribusi gizinya 20–25% dari AKG harian sasaran?", category: "Gizi" },
    { id: "q10", label: "Kontribusi Gizi Siang 30-35%",   fullLabel: "Jika MBG disajikan sebagai makan siang (11.00–14.00), apakah kontribusi gizinya 30–35% dari AKG harian sasaran?", category: "Gizi" },
    { id: "q11", label: "Kering/Minim Kuah",              fullLabel: "Apakah masakan diupayakan kering atau minim kuah untuk mencegah makanan cepat basi dan risiko tumpah saat distribusi?", category: "Gizi" },
    { id: "q12", label: "Sertifikat Halal",               fullLabel: "Apakah pihak dapur SPPG telah memiliki Sertifikat Halal resmi?", category: "Gizi" },
    { id: "q13", label: "Pengolahan Max 4-6 Jam",         fullLabel: "Apakah pengolahan makanan dilakukan dalam rentang waktu maksimal 4–6 jam sebelum jam makan bersama di sekolah/posyandu?", category: "Food Safety" },
    { id: "q14", label: "Quality Control Fisik",          fullLabel: "Apakah Ahli Gizi melakukan QC fisik (rasa, warna, aroma) terhadap masakan sebelum dikemas dan dikirim?", category: "Food Safety" },
    { id: "q15", label: "Seragam Higienis Food Handler",  fullLabel: "Apakah petugas penjamah makanan mengenakan seragam dan perlengkapan higienis (masker, sarung tangan, penutup kepala)?", category: "Food Safety" },
    { id: "q16", label: "Sampel Makanan Harian (KRUSIAL)",fullLabel: "[KRUSIAL] Apakah SPPG mengambil dan menyimpan sampel makanan 1 porsi lengkap di lemari pendingin setiap hari?", category: "Food Safety" },
    { id: "q17", label: "Wadah Foodtray Stainless",       fullLabel: "Apakah makanan dikemas menggunakan foodtray tertutup stainless steel foodgrade (tipe 304/316/430) dengan 5 cekungan?", category: "Food Safety" },
    { id: "q18", label: "Mobil Box Tertutup Higienis",    fullLabel: "Apakah kendaraan pengantaran menggunakan mobil box tertutup yang higienis dan dilengkapi rak khusus penyimpanan wadah?", category: "Food Safety" },
    { id: "q19", label: "Waktu Tempuh Max 20 Menit",      fullLabel: "Apakah waktu tempuh pengiriman dari dapur SPPG sampai titik sasaran terjaga maksimal 20 menit (radius max 6 km)?", category: "Distribusi" },
    { id: "q20", label: "Kolaborasi Bidan/Kader",         fullLabel: "Untuk kelompok non-sekolah (Ibu Hamil, Balita), apakah distribusi berkolaborasi aktif dengan bidan desa dan kader Posyandu?", category: "Distribusi" },
    { id: "q21", label: "Pemantauan Status Gizi 6 Bulan", fullLabel: "Apakah dilakukan pemantauan perkembangan gizi penerima manfaat secara berkala setiap 6 bulan melalui prosedur kesehatan?", category: "Distribusi" },
];

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; border: string; icon: string; num: string }> = {
    SDM:           { label: "A. SDM & Perencanaan Menu",          color: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200", icon: "people",        num: "A" },
    Gizi:          { label: "B. Standar Kontribusi Gizi",          color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: "nutrition",     num: "B" },
    "Food Safety": { label: "C. Operasional & Food Safety",        color: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-200", icon: "health_and_safety", num: "C" },
    Distribusi:    { label: "D. Distribusi & Pemantauan Status Gizi", color: "text-blue-700", bg: "bg-blue-50",    border: "border-blue-200",   icon: "local_shipping", num: "D" },
};

const SCALE_COLORS = [
    { min: 90, max: 100, bg: "bg-emerald-500",  ring: "ring-emerald-300", text: "text-emerald-400", hex: "#10b981", label: "≥90% Sesuai"              },
    { min: 75, max: 89,  bg: "bg-amber-400",    ring: "ring-amber-300",   text: "text-amber-400",   hex: "#fbbf24", label: "75-89% Cukup"              },
    { min: 50, max: 74,  bg: "bg-orange-400",   ring: "ring-orange-300",  text: "text-orange-400",  hex: "#fb923c", label: "50-74% Perlu Perhatian"    },
    { min: 0,  max: 49,  bg: "bg-red-500",      ring: "ring-red-300",     text: "text-red-400",     hex: "#ef4444", label: "<50% Kritis"                },
];

function getScale(pct: number) {
    return SCALE_COLORS.find(s => pct >= s.min && pct <= s.max) || SCALE_COLORS[3];
}

function HeatmapSection({ perQScores, catNumLabels }: { perQScores: { id: string; label: string; pct: number; cat: string }[]; catNumLabels: Record<string, string> }) {
    const [selected, setSelected] = useState<string | null>(null);

    const selectedQ = CLOSED_QUESTIONS_META.find(q => q.id === selected);
    const selectedScore = perQScores.find(q => q.id === selected);
    const categories = ["SDM", "Gizi", "Food Safety", "Distribusi"];

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                            <span className="material-icons-round text-indigo-600 text-lg">grid_view</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Heatmap Kepatuhan per Indikator</h3>
                            <p className="text-xs text-slate-500">Klik indikator untuk melihat keterangan lengkap pertanyaan</p>
                        </div>
                    </div>
                    {/* Legend inline */}
                    <div className="flex items-center gap-3 flex-wrap">
                        {SCALE_COLORS.map(s => (
                            <div key={s.label} className="flex items-center gap-1.5">
                                <div className={`w-3.5 h-3.5 rounded-md ${s.bg}`}></div>
                                <span className="text-[11px] text-slate-500 font-medium">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row">
                {/* LEFT: Heatmap grid by category */}
                <div className="flex-1 p-6 space-y-5">
                    {categories.map(cat => {
                        const meta = CATEGORY_META[cat];
                        const qs = perQScores.filter(q => q.cat === cat);
                        const catAvg = qs.length > 0 ? Math.round(qs.reduce((a, b) => a + b.pct, 0) / qs.length) : 0;
                        const catScale = getScale(catAvg);
                        return (
                            <div key={cat}>
                                {/* Category Header */}
                                <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${meta.bg} ${meta.border} border mb-2`}>
                                    <div className="flex items-center gap-2">
                                        <span className={`material-icons-round text-base ${meta.color}`}>{meta.icon}</span>
                                        <span className={`text-xs font-black ${meta.color} uppercase tracking-wide`}>{meta.label}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-slate-500">Rata-rata:</span>
                                        <span className={`text-xs font-black px-2 py-0.5 rounded-lg text-white ${catScale.bg}`}>{catAvg}%</span>
                                    </div>
                                </div>
                                {/* Question Cells */}
                                <div className="flex flex-wrap gap-2">
                                    {qs.map(q => {
                                        const scale = getScale(q.pct);
                                        const isSelected = selected === q.id;
                                        const qNum = q.id.replace("q", "");
                                        return (
                                            <button
                                                key={q.id}
                                                onClick={() => setSelected(isSelected ? null : q.id)}
                                                className={`relative flex flex-col items-center justify-center w-[72px] h-[72px] rounded-2xl text-white transition-all duration-200 select-none
                                                    ${scale.bg}
                                                    ${isSelected ? `ring-4 ${scale.ring} scale-110 shadow-xl z-10` : "hover:scale-105 hover:shadow-md opacity-90 hover:opacity-100"}
                                                `}
                                            >
                                                {/* Code badge */}
                                                <span className="text-[9px] font-black bg-white/20 rounded-md px-1.5 py-0.5 mb-1 tracking-widest">
                                                    {catNumLabels[q.cat]}{qNum}
                                                </span>
                                                {/* Score */}
                                                <span className="text-base font-black leading-none">{q.pct}%</span>
                                                {/* Selected pip */}
                                                {isSelected && (
                                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full shadow-md flex items-center justify-center">
                                                        <span className="material-icons-round text-slate-800" style={{ fontSize: 12 }}>info</span>
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* RIGHT: Detail Panel */}
                <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-100 bg-slate-50/60 p-6 flex flex-col">
                    {selectedQ && selectedScore ? (() => {
                        const scale = getScale(selectedScore.pct);
                        const catM = CATEGORY_META[selectedQ.category];
                        const qNum = selectedQ.id.replace("q", "");
                        const allInCat = perQScores.filter(q => q.cat === selectedQ.category);
                        const rank = [...allInCat].sort((a, b) => b.pct - a.pct).findIndex(q => q.id === selectedQ.id) + 1;
                        return (
                            <div className="flex-1 space-y-4">
                                {/* Indicator badge */}
                                <div className="flex items-center gap-3">
                                    <div className={`w-14 h-14 ${scale.bg} rounded-2xl flex flex-col items-center justify-center text-white shadow-lg flex-shrink-0`}>
                                        <span className="text-[9px] font-bold opacity-75">{catM.num}{qNum}</span>
                                        <span className="text-xl font-black leading-none">{selectedScore.pct}%</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-500 uppercase tracking-wider">{catM.label}</p>
                                        <p className="text-sm font-bold text-slate-800 leading-tight mt-0.5">{selectedQ.label}</p>
                                    </div>
                                </div>

                                {/* Status badge */}
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white ${scale.bg}`}>
                                    <span className="material-icons-round text-sm">
                                        {selectedScore.pct >= 90 ? "verified" : selectedScore.pct >= 75 ? "info" : selectedScore.pct >= 50 ? "warning" : "error"}
                                    </span>
                                    {scale.label}
                                </div>

                                {/* Progress arc */}
                                <div>
                                    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                                        <span>Tingkat Kepatuhan</span>
                                        <span className={`font-black ${scale.text}`}>{selectedScore.pct}%</span>
                                    </div>
                                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${scale.bg}`}
                                            style={{ width: `${selectedScore.pct}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                        <span>0%</span><span>50%</span><span>100%</span>
                                    </div>
                                </div>

                                {/* Full question text */}
                                <div className={`${catM.bg} ${catM.border} border rounded-2xl p-3`}>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${catM.color} mb-1.5`}>Pertanyaan Lengkap</p>
                                    <p className="text-xs text-slate-700 leading-relaxed">{selectedQ.fullLabel}</p>
                                </div>

                                {/* Rank in category */}
                                <div className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-3">
                                    <div className={`w-8 h-8 ${scale.bg} rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0`}>
                                        {rank}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-700">Ranking dalam Aspek {catM.num}</p>
                                        <p className="text-[10px] text-slate-400">Peringkat {rank} dari {allInCat.length} indikator</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })() : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                                <span className="material-icons-round text-3xl text-slate-300">touch_app</span>
                            </div>
                            <p className="text-sm font-bold text-slate-400">Pilih Indikator</p>
                            <p className="text-xs text-slate-300 leading-relaxed">Klik salah satu sel heatmap untuk melihat keterangan pertanyaan dan detail kepatuhan</p>
                            {/* Quick stats */}
                            <div className="w-full mt-2 space-y-2">
                                {SCALE_COLORS.map(s => {
                                    const count = perQScores.filter(q => q.pct >= s.min && q.pct <= s.max).length;
                                    return (
                                        <div key={s.label} className="flex items-center gap-2">
                                            <div className={`w-2.5 h-2.5 rounded-full ${s.bg} shrink-0`}></div>
                                            <span className="text-[11px] text-slate-500 flex-1 text-left">{s.label}</span>
                                            <span className="text-xs font-black text-slate-700">{count} <span className="font-medium text-slate-400">indikator</span></span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-3">
                <p className="text-xs font-bold text-slate-600 mb-1">{label}</p>
                {payload.map((p: any, i: number) => (
                    <p key={i} className="text-xs" style={{ color: p.color }}>
                        {p.name}: <span className="font-bold">{typeof p.value === "number" ? p.value.toFixed(1) : p.value}{p.name && p.name.includes("Skor") ? "%" : ""}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};


export default function MbgAnalyticalDashboard({ data, isLoading }: MbgAnalyticalDashboardProps) {
    const analytics = useMemo(() => {
        if (!data || data.length === 0) return null;

        const catScores: Record<string, { yes: number; total: number }> = {
            "SDM": { yes: 0, total: 0 },
            "Gizi": { yes: 0, total: 0 },
            "Food Safety": { yes: 0, total: 0 },
            "Distribusi": { yes: 0, total: 0 },
        };
        const perQScores: { id: string; label: string; pct: number; cat: string }[] = [];

        CLOSED_QUESTIONS_META.forEach(q => {
            let yes = 0, total = 0;
            data.forEach(item => {
                const val = item[`${q.id}_ans`];
                if (val !== null && val !== undefined) {
                    total++;
                    if (val === true || val === "true" || val === 1) yes++;
                }
            });
            const pct = total > 0 ? Math.round((yes / total) * 100) : 0;
            perQScores.push({ id: q.id, label: q.label, pct, cat: q.category });
            if (catScores[q.category]) {
                catScores[q.category].yes += yes;
                catScores[q.category].total += total;
            }
        });

        const radarData = Object.keys(catScores).map(cat => ({
            subject: cat,
            skor: catScores[cat].total > 0 ? Math.round((catScores[cat].yes / catScores[cat].total) * 100) : 0,
            fullMark: 100
        }));

        const bottleneck = [...perQScores].sort((a, b) => a.pct - b.pct).slice(0, 5);
        const topPerform = [...perQScores].sort((a, b) => b.pct - a.pct).slice(0, 5);

        const buckets: Record<string, number> = { "<60%": 0, "60-69%": 0, "70-79%": 0, "80-89%": 0, "90-94%": 0, ">=95%": 0 };
        data.forEach(item => {
            const s = Number(item.score_percentage) || 0;
            if (s < 60) buckets["<60%"]++;
            else if (s < 70) buckets["60-69%"]++;
            else if (s < 80) buckets["70-79%"]++;
            else if (s < 90) buckets["80-89%"]++;
            else if (s < 95) buckets["90-94%"]++;
            else buckets[">=95%"]++;
        });
        const distroData = Object.keys(buckets).map(k => ({ label: k, count: buckets[k] }));

        const pkmMap: Record<string, { total: number; count: number }> = {};
        data.forEach(item => {
            const p = (item.puskesmas || "Lainnya").replace("Puskesmas ", "");
            if (!pkmMap[p]) pkmMap[p] = { total: 0, count: 0 };
            pkmMap[p].total += Number(item.score_percentage) || 0;
            pkmMap[p].count += 1;
        });
        const pkmBar = Object.keys(pkmMap).map(k => ({
            name: k,
            skor: Number((pkmMap[k].total / pkmMap[k].count).toFixed(1)),
            n: pkmMap[k].count
        })).sort((a, b) => b.skor - a.skor);

        const sasaranMap: Record<string, number> = {};
        data.forEach(item => {
            if (Array.isArray(item.audit_weighting)) {
                item.audit_weighting.forEach((s: any) => {
                    const name = s.sasaran_name || "Lainnya";
                    sasaranMap[name] = (sasaranMap[name] || 0) + 1;
                });
            }
        });
        const sasaranPie = Object.keys(sasaranMap).map(k => ({ name: k, value: sasaranMap[k] }));

        const monthMap: Record<string, { total: number; count: number }> = {};
        data.forEach(item => {
            const d = new Date(item.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            if (!monthMap[key]) monthMap[key] = { total: 0, count: 0 };
            monthMap[key].total += Number(item.score_percentage) || 0;
            monthMap[key].count++;
        });
        const trendData = Object.keys(monthMap).sort().map(k => ({
            bulan: k,
            skor: Number((monthMap[k].total / monthMap[k].count).toFixed(1)),
            n: monthMap[k].count
        }));

        const openFields = ["open_preferensi", "open_fortifikasi", "open_konsultasi", "open_edukasi", "open_kedaruratan"];
        const openLabels: Record<string, string> = {
            open_preferensi: "Preferensi Lokal",
            open_fortifikasi: "Fortifikasi Bahan",
            open_konsultasi: "Konsultasi Gizi",
            open_edukasi: "Edukasi Sasaran",
            open_kedaruratan: "Protokol Darurat"
        };
        const openFilled = openFields.map(f => ({
            label: openLabels[f],
            filled: data.filter(d => d[f] && String(d[f]).trim() !== "").length,
            total: data.length
        }));

        const avgScore = data.reduce((acc, d) => acc + (Number(d.score_percentage) || 0), 0) / data.length;
        const excellent = data.filter(d => Number(d.score_percentage) >= 95).length;
        const good = data.filter(d => Number(d.score_percentage) >= 90 && Number(d.score_percentage) < 95).length;
        const warning = data.filter(d => Number(d.score_percentage) < 90).length;

        const lowestCat = radarData.reduce((a, b) => a.skor < b.skor ? a : b);
        const highestCat = radarData.reduce((a, b) => a.skor > b.skor ? a : b);

        return {
            radarData, perQScores, bottleneck, topPerform, distroData,
            pkmBar, sasaranPie, trendData, openFilled,
            avgScore, excellent, good, warning,
            lowestCat, highestCat, total: data.length
        };
    }, [data]);

    if (isLoading) {
        return (
            <div className="h-64 flex items-center justify-center bg-white rounded-3xl border border-slate-200">
                <div className="text-center">
                    <div className="inline-block w-10 h-10 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin mb-3"></div>
                    <p className="text-slate-400 font-bold text-sm">Menghitung Analitik Data...</p>
                </div>
            </div>
        );
    }

    if (!analytics || data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center bg-white rounded-3xl border border-slate-200 flex-col gap-3">
                <span className="material-icons-round text-5xl text-slate-200">analytics</span>
                <p className="text-slate-400 font-bold text-sm">Belum ada data untuk dianalisis. Tambahkan laporan supervisi terlebih dahulu.</p>
            </div>
        );
    }

    const { radarData, bottleneck, topPerform, distroData, pkmBar, sasaranPie, trendData, openFilled, avgScore, excellent, good, warning, lowestCat, highestCat, total, perQScores } = analytics;
    const catNumLabels: Record<string, string> = { SDM: "A", Gizi: "B", "Food Safety": "C", Distribusi: "D" };

    return (
        <div className="space-y-8">

            {/* AI Insight Banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-amber-900 rounded-3xl p-6 text-white">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-400 rounded-full blur-3xl"></div>
                </div>
                <div className="relative z-10 flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-500/20 border border-amber-400/30 rounded-2xl flex items-center justify-center shrink-0">
                        <span className="material-icons-round text-amber-400 text-2xl">auto_awesome</span>
                    </div>
                    <div>
                        <p className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-1">Insight Analitik Supervisi</p>
                        <p className="font-bold text-white text-sm leading-relaxed">
                            Dari <span className="text-amber-300">{total}</span> laporan supervisi, rata-rata skor kesesuaian&nbsp;
                            <span className={`font-black ${avgScore >= 90 ? "text-emerald-400" : avgScore >= 75 ? "text-amber-400" : "text-red-400"}`}>{avgScore.toFixed(1)}%</span>.&nbsp;
                            Aspek <span className="text-amber-300">{lowestCat.subject}</span> perlu perbaikan (skor {lowestCat.skor}%),
                            sementara <span className="text-emerald-400">{highestCat.subject}</span> menjadi keunggulan ({highestCat.skor}%).
                        </p>
                    </div>
                </div>
                <div className="relative z-10 mt-4 flex flex-wrap gap-3">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-xs text-emerald-300 font-bold">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full inline-block"></span>
                        Sangat Sesuai &ge;95%: {excellent} SPPG
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-xs text-blue-300 font-bold">
                        <span className="w-2 h-2 bg-blue-400 rounded-full inline-block"></span>
                        Sesuai 90-94%: {good} SPPG
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-400/30 rounded-full text-xs text-red-300 font-bold">
                        <span className="w-2 h-2 bg-red-400 rounded-full inline-block"></span>
                        Perlu Perhatian &lt;90%: {warning} SPPG
                    </span>
                </div>
            </div>

            {/* Row 1: Radar + Score Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-icons-round text-amber-500 text-lg">radar</span>
                        <h3 className="font-bold text-slate-800">Profil Kepatuhan per Aspek</h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-5">Rata-rata kepatuhan berdasarkan 4 aspek kuesioner (A, B, C, D).</p>
                    <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                                <Radar name="Skor (%)" dataKey="skor" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.35} strokeWidth={2} />
                                <Tooltip content={<CustomTooltip />} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        {radarData.map(r => (
                            <div key={r.subject} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                                <span className="text-xs font-medium text-slate-600">{r.subject}</span>
                                <span className={`text-xs font-black ${r.skor >= 90 ? "text-emerald-600" : r.skor >= 70 ? "text-amber-600" : "text-red-600"}`}>{r.skor}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-icons-round text-blue-500 text-lg">bar_chart</span>
                        <h3 className="font-bold text-slate-800">Distribusi Skor Kesesuaian</h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-5">Sebaran frekuensi skor dari seluruh SPPG yang tersupervisi.</p>
                    <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={distroData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" name="Jumlah SPPG" radius={[8, 8, 0, 0]} maxBarSize={48}>
                                    {distroData.map((_, idx) => {
                                        const colors = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981", "#3b82f6"];
                                        return <Cell key={idx} fill={colors[idx] || "#94a3b8"} />;
                                    })}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Row 2: Per-Puskesmas + Kelompok Sasaran */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-icons-round text-emerald-500 text-lg">leaderboard</span>
                        <h3 className="font-bold text-slate-800">Rata-rata Skor per Puskesmas</h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-5">Perbandingan kinerja supervisi antar wilayah Puskesmas.</p>
                    <div className="h-[230px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={pkmBar} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }} width={90} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="skor" name="Skor (%)" radius={[0, 8, 8, 0]} maxBarSize={28} background={{ fill: "#f8fafc", radius: 4 }}>
                                    {pkmBar.map((entry, idx) => (
                                        <Cell key={idx} fill={entry.skor >= 95 ? "#3b82f6" : entry.skor >= 90 ? "#10b981" : entry.skor >= 75 ? "#f59e0b" : "#ef4444"} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-icons-round text-purple-500 text-lg">pie_chart</span>
                        <h3 className="font-bold text-slate-800">Kelompok Sasaran</h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">Distribusi sasaran uji petik kuantitatif.</p>
                    {sasaranPie.length > 0 ? (
                        <>
                            <div className="h-[160px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={sasaranPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                                            {sasaranPie.map((_, idx) => (
                                                <Cell key={idx} fill={COLORS_PIE[idx % COLORS_PIE.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-1.5 mt-2">
                                {sasaranPie.slice(0, 5).map((s, idx) => (
                                    <div key={idx} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS_PIE[idx % COLORS_PIE.length] }}></div>
                                            <span className="text-xs text-slate-600 font-medium">{s.name}</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-800">{s.value}x</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-40 text-slate-300 flex-col gap-2">
                            <span className="material-icons-round text-3xl">donut_large</span>
                            <p className="text-xs">Belum ada data sasaran</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Row 3: Trend + Open Questions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-icons-round text-cyan-500 text-lg">trending_up</span>
                        <h3 className="font-bold text-slate-800">Tren Kesesuaian Supervisi</h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-5">Perkembangan rata-rata skor dari waktu ke waktu.</p>
                    <div className="h-[210px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="colorSkor" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="bulan" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} domain={[0, 100]} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="skor" name="Rata-rata Skor (%)" stroke="#f59e0b" strokeWidth={2.5} fill="url(#colorSkor)" dot={{ fill: "#f59e0b", r: 4, strokeWidth: 2, stroke: "#fff" }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-icons-round text-orange-500 text-lg">edit_note</span>
                        <h3 className="font-bold text-slate-800">Respons Kualitatif</h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-5">Tingkat pengisian pertanyaan terbuka dari {total} laporan.</p>
                    <div className="space-y-3">
                        {openFilled.map((of, idx) => {
                            const pct = of.total > 0 ? Math.round((of.filled / of.total) * 100) : 0;
                            return (
                                <div key={idx}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-medium text-slate-600 truncate pr-2">{of.label}</span>
                                        <span className="text-xs font-black text-slate-800 shrink-0">{pct}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444" }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Row 4: Bottleneck + Top Perform */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-icons-round text-red-500 text-lg">warning_amber</span>
                        <h3 className="font-bold text-slate-800">5 Indikator Terendah</h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-5">Pertanyaan dengan tingkat ketidakpatuhan tertinggi, prioritas tindak lanjut.</p>
                    <div className="space-y-3">
                        {bottleneck.map((q, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="w-6 h-6 bg-red-100 text-red-600 rounded-lg flex items-center justify-center text-xs font-black shrink-0">{idx + 1}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-slate-700 truncate">{q.label}</p>
                                    <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-400 rounded-full" style={{ width: `${q.pct}%` }}></div>
                                    </div>
                                </div>
                                <span className="text-xs font-black text-red-600 shrink-0 w-10 text-right">{q.pct}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="material-icons-round text-emerald-500 text-lg">emoji_events</span>
                        <h3 className="font-bold text-slate-800">5 Indikator Terbaik</h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-5">Pertanyaan dengan kepatuhan tertinggi, keunggulan yang perlu dipertahankan.</p>
                    <div className="space-y-3">
                        {topPerform.map((q, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-xs font-black shrink-0">{idx + 1}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-slate-700 truncate">{q.label}</p>
                                    <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${q.pct}%` }}></div>
                                    </div>
                                </div>
                                <span className="text-xs font-black text-emerald-600 shrink-0 w-10 text-right">{q.pct}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Row 5: Full Heatmap */}
            <HeatmapSection perQScores={perQScores} catNumLabels={catNumLabels} />

        </div>
    );
}
