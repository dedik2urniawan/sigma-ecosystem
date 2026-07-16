"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/dashboard/layout";
import {
    SUPERVISI_RS_SECTIONS, calculateRsScore, getScoreLabel, ScoreValue
} from "@/lib/supervisiRsConfig";
import { generateSupervisiRsPDF } from "@/lib/generateSupervisiRsPDF";
import {
    ArrowLeft, Save, CheckCircle2, Upload, X, FileText,
    ChevronDown, Camera, Download, RotateCcw, Info
} from "lucide-react";

interface Props {
    sessionId: string;
    rsOptions: { id: string; nama: string }[];
    onBack: () => void;
}

interface ItemData {
    id?: string;
    session_id: string;
    section: string;
    item_number: number;
    item_label: string;
    score: ScoreValue;
    bukti_url: string | null;
    catatan: string | null;
    rtl: string | null;
}

interface SessionMeta {
    rs_id: string;
    tanggal_supervisi: string;
    tim_supervisor: string;
    penanggung_jawab: string;
    status: string;
}

const SCORE_OPTIONS: { value: ScoreValue; label: string; short: string; bg: string; text: string; ring: string }[] = [
    { value: 0, label: "Tidak Ada Dokumen", short: "0", bg: "bg-red-500",   text: "text-white", ring: "ring-red-300"   },
    { value: 1, label: "Ada, Tidak Lengkap", short: "1", bg: "bg-amber-500", text: "text-white", ring: "ring-amber-300" },
    { value: 2, label: "Dokumen Lengkap",    short: "2", bg: "bg-emerald-500", text: "text-white", ring: "ring-emerald-300" },
];

const SECTION_COLORS = [
    { accent: 'from-blue-500 to-cyan-500',    bg: 'bg-blue-50',    text: 'text-blue-600',    badge: 'bg-blue-100 text-blue-700'    },
    { accent: 'from-orange-500 to-amber-500', bg: 'bg-orange-50',  text: 'text-orange-600',  badge: 'bg-orange-100 text-orange-700' },
    { accent: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
    { accent: 'from-violet-500 to-purple-500',bg: 'bg-violet-50',  text: 'text-violet-600',  badge: 'bg-violet-100 text-violet-700' },
    { accent: 'from-rose-500 to-pink-500',    bg: 'bg-rose-50',    text: 'text-rose-600',    badge: 'bg-rose-100 text-rose-700'    },
];

export default function SupervisiRsForm({ sessionId, rsOptions, onBack }: Props) {
    const { user } = useAuth();
    const isSuperadmin = user?.role === "superadmin";
    const isStakeholder = user?.role === "stakeholder";

    const [meta, setMeta] = useState<SessionMeta>({
        rs_id: "", tanggal_supervisi: new Date().toISOString().split("T")[0],
        tim_supervisor: "", penanggung_jawab: "", status: "draft",
    });
    const [items, setItems] = useState<ItemData[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generatingPDF, setGeneratingPDF] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const [uploadingItem, setUploadingItem] = useState<string | null>(null);
    const [showHints, setShowHints] = useState<Record<string, boolean>>({});

    useEffect(() => {
        async function loadSession() {
            setLoading(true);
            const { data: s } = await supabase
                .from("supervisi_rs_sessions")
                .select("rs_id, tanggal_supervisi, tim_supervisor, penanggung_jawab, status")
                .eq("id", sessionId).single();

            if (!s) { setLoading(false); return; }

            setMeta({
                rs_id: s.rs_id,
                tanggal_supervisi: s.tanggal_supervisi,
                tim_supervisor: s.tim_supervisor || "",
                penanggung_jawab: s.penanggung_jawab || "",
                status: s.status,
            });

            const { data: existing } = await supabase
                .from("supervisi_rs_items")
                .select("*")
                .eq("session_id", sessionId);

            const allItems: ItemData[] = [];
            for (const section of SUPERVISI_RS_SECTIONS) {
                for (const item of section.items) {
                    const ex = (existing || []).find(
                        e => e.section === section.id && e.item_number === item.number
                    );
                    allItems.push({
                        id: ex?.id,
                        session_id: sessionId,
                        section: section.id,
                        item_number: item.number,
                        item_label: item.label,
                        score: ex?.score ?? null,
                        bukti_url: ex?.bukti_url || null,
                        catatan: ex?.catatan || null,
                        rtl: ex?.rtl || null,
                    });
                }
            }

            setItems(allItems);
            const exp: Record<string, boolean> = {};
            SUPERVISI_RS_SECTIONS.forEach(s => (exp[s.id] = true));
            setExpandedSections(exp);
            setLoading(false);
        }
        loadSession();
    }, [sessionId]);

    const handleMetaChange = (key: keyof SessionMeta, value: string) => {
        if (isStakeholder) return;
        setMeta(prev => ({ ...prev, [key]: value }));
    };

    const handleItemChange = (section: string, itemNumber: number, field: keyof ItemData, value: ScoreValue | string | null) => {
        if (isStakeholder) return;
        setItems(prev => prev.map(item =>
            item.section === section && item.item_number === itemNumber
                ? { ...item, [field]: value }
                : item
        ));
    };

    const handleUploadBukti = async (section: string, itemNumber: number, file: File) => {
        if (isStakeholder) return;
        const key = `${section}_${itemNumber}`;
        setUploadingItem(key);
        try {
            const ext = file.name.split(".").pop();
            const path = `supervisi-rs/${sessionId}/${section}_${itemNumber}_${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from("supervisi-rs-bukti").upload(path, file, { upsert: true });
            if (error) { alert("Gagal upload: " + error.message); return; }
            const { data: urlData } = supabase.storage.from("supervisi-rs-bukti").getPublicUrl(path);
            handleItemChange(section, itemNumber, "bukti_url", urlData.publicUrl);
        } finally {
            setUploadingItem(null);
        }
    };

    const handleSave = async (markCompleted = false) => {
        if (isStakeholder) return;
        setSaving(true);
        try {
            await supabase.from("supervisi_rs_sessions").update({
                rs_id: meta.rs_id,
                tanggal_supervisi: meta.tanggal_supervisi,
                tim_supervisor: meta.tim_supervisor || null,
                penanggung_jawab: meta.penanggung_jawab || null,
                status: markCompleted ? "completed" : meta.status,
                updated_at: new Date().toISOString(),
            }).eq("id", sessionId);

            const upsertData = items.map(item => ({
                session_id: sessionId,
                section: item.section,
                item_number: item.item_number,
                item_label: item.item_label,
                score: item.score,
                bukti_url: item.bukti_url,
                catatan: item.catatan,
                rtl: item.rtl,
            }));

            const { error } = await supabase
                .from("supervisi_rs_items")
                .upsert(upsertData, { onConflict: "session_id,section,item_number" });
            if (error) throw error;

            if (markCompleted) setMeta(prev => ({ ...prev, status: "completed" }));

            // Refresh IDs
            const { data: refreshed } = await supabase.from("supervisi_rs_items").select("*").eq("session_id", sessionId);
            if (refreshed) {
                setItems(prev => prev.map(item => {
                    const db = refreshed.find(r => r.section === item.section && r.item_number === item.item_number);
                    return db ? { ...item, id: db.id } : item;
                }));
            }

            alert(markCompleted ? "Supervisi berhasil disimpan dan ditandai selesai!" : "Data berhasil disimpan!");
        } catch (err: any) {
            alert("Gagal menyimpan: " + (err?.message || "Terjadi kesalahan."));
        } finally {
            setSaving(false);
        }
    };

    const handleRevertToDraft = async () => {
        if (!confirm("Kembalikan ke Draft?")) return;
        setSaving(true);
        const { error } = await supabase.from("supervisi_rs_sessions").update({ status: "draft" }).eq("id", sessionId);
        if (!error) setMeta(prev => ({ ...prev, status: "draft" }));
        setSaving(false);
    };

    const handleGeneratePDF = async () => {
        setGeneratingPDF(true);
        try {
            const currentRsName = rsOptions.find(r => r.id === meta.rs_id)?.nama || "—";
            await generateSupervisiRsPDF(
                {
                    rsName: currentRsName,
                    tanggalSupervisi: meta.tanggal_supervisi,
                    timSupervisor: meta.tim_supervisor,
                    penanggungJawab: meta.penanggung_jawab
                },
                items
            );
        } catch (err) {
            alert("Gagal membuat PDF.");
        } finally {
            setGeneratingPDF(false);
        }
    };

    const rsName = rsOptions.find(r => r.id === meta.rs_id)?.nama || "—";
    const score = calculateRsScore(items.map(i => ({ score: i.score })));

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 font-medium animate-pulse">Memuat form supervisi RS...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Top Bar */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="font-bold text-slate-800 text-lg">Supervisi Gizi RS</h2>
                        <p className="text-sm text-slate-500">{rsName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${meta.status === "completed" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
                        {meta.status === "completed" ? "✓ Selesai" : "⏳ Draft"}
                    </span>
                    <button onClick={handleGeneratePDF} disabled={generatingPDF}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-purple-600 bg-purple-50 rounded-xl hover:bg-purple-100 border border-purple-100 disabled:opacity-50">
                        <Download className="w-4 h-4" />
                        {generatingPDF ? "Membuat PDF..." : "Download PDF"}
                    </button>
                    {!isStakeholder && (
                        <>
                            <button onClick={() => handleSave(false)} disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-cyan-600 bg-cyan-50 rounded-xl hover:bg-cyan-100 border border-cyan-100 disabled:opacity-50">
                                <Save className="w-4 h-4" />
                                {saving ? "Menyimpan..." : "Simpan"}
                            </button>
                            {meta.status !== "completed" ? (
                                <button onClick={() => handleSave(true)} disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl hover:from-emerald-700 hover:to-green-700 shadow-md disabled:opacity-50">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Selesai
                                </button>
                            ) : (
                                isSuperadmin && (
                                    <button onClick={handleRevertToDraft} disabled={saving}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-amber-600 bg-amber-50 rounded-xl hover:bg-amber-100 border border-amber-200 disabled:opacity-50">
                                        <RotateCcw className="w-4 h-4" />
                                        Kembalikan ke Draft
                                    </button>
                                )
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Session Meta */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-500" />
                    Informasi Supervisi
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Rumah Sakit</label>
                        <select value={meta.rs_id} onChange={e => handleMetaChange("rs_id", e.target.value)}
                            disabled={isStakeholder}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 outline-none focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-70">
                            <option value="">-- Pilih Rumah Sakit --</option>
                            {rsOptions.map(r => <option key={r.id} value={r.id}>{r.nama}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tanggal Supervisi</label>
                        <input type="date" value={meta.tanggal_supervisi} onChange={e => handleMetaChange("tanggal_supervisi", e.target.value)}
                            disabled={isStakeholder}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 outline-none focus:ring-cyan-500 focus:border-cyan-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tim Supervisor</label>
                        <input type="text" placeholder="Nama tim supervisor..." value={meta.tim_supervisor} onChange={e => handleMetaChange("tim_supervisor", e.target.value)}
                            disabled={isStakeholder}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 outline-none focus:ring-cyan-500 focus:border-cyan-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Penanggung Jawab</label>
                        <input type="text" placeholder="Nama penanggung jawab..." value={meta.penanggung_jawab} onChange={e => handleMetaChange("penanggung_jawab", e.target.value)}
                            disabled={isStakeholder}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 outline-none focus:ring-cyan-500 focus:border-cyan-500" />
                    </div>
                </div>
            </div>

            {/* Score Legend */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-700 text-sm">Progress Penilaian</h3>
                    <span className="text-sm font-bold text-cyan-600">{score.totalScore}/{score.maxScore} ({score.percentage}%)</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${score.percentage >= 80 ? "bg-gradient-to-r from-emerald-400 to-green-500" : score.percentage >= 60 ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-gradient-to-r from-red-400 to-rose-500"}`}
                        style={{ width: `${score.percentage}%` }}
                    />
                </div>
                <div className="flex flex-wrap gap-4 text-xs mb-3">
                    <span className="text-emerald-600 font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Skor 2 (Lengkap): {score.score2}</span>
                    <span className="text-amber-600 font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Skor 1 (Tidak Lengkap): {score.score1}</span>
                    <span className="text-red-500 font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Skor 0 (Tidak Ada): {score.score0}</span>
                    <span className="text-slate-400 font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300" /> Belum Dinilai: {score.maxScore / 2 - score.filled}</span>
                </div>
                {score.filled > 0 && (
                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-bold border ${score.classBadge}`}>
                        <span className="material-icons-round text-base">
                            {score.classification === 'BAIK' ? 'verified' : score.classification === 'CUKUP' ? 'warning' : 'error'}
                        </span>
                        Klasifikasi: {score.classification} — {score.percentage}%
                    </div>
                )}
            </div>

            {/* Sections */}
            {SUPERVISI_RS_SECTIONS.map((section, sIdx) => {
                const sectionItems = items.filter(i => i.section === section.id);
                const sectionScore = calculateRsScore(sectionItems.map(i => ({ score: i.score })));
                const isExpanded = expandedSections[section.id] ?? true;
                const colors = SECTION_COLORS[sIdx] || SECTION_COLORS[0];

                return (
                    <div key={section.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <button onClick={() => setExpandedSections(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
                            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`h-10 w-1.5 rounded-full bg-gradient-to-b ${colors.accent}`} />
                                <div className="text-left">
                                    <h3 className="font-bold text-slate-800">{section.title}</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {sectionScore.filled}/{sectionItems.length} dinilai
                                        {sectionScore.filled > 0 && (
                                            <span className="ml-2">• Skor {sectionScore.totalScore}/{sectionScore.maxScore} ({sectionScore.percentage}%)</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>

                        {isExpanded && (
                            <div className="border-t border-slate-100 divide-y divide-slate-50">
                                {sectionItems.map((item) => {
                                    const sectionDef = SUPERVISI_RS_SECTIONS.find(s => s.id === section.id);
                                    const itemDef = sectionDef?.items.find(i => i.number === item.item_number);
                                    const itemKey = `${item.section}_${item.item_number}`;
                                    const isUploading = uploadingItem === itemKey;
                                    const hintVisible = showHints[itemKey];

                                    return (
                                        <div key={itemKey} className="p-4 hover:bg-slate-50/50 transition-colors space-y-3">
                                            {/* Item header */}
                                            <div className="flex items-start gap-3">
                                                <span className={`w-7 h-7 shrink-0 rounded-lg ${colors.bg} ${colors.text} flex items-center justify-center text-xs font-bold`}>
                                                    {item.item_number}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-slate-700 font-medium leading-snug">{item.item_label}</p>
                                                    {itemDef && (
                                                        <button
                                                            onClick={() => setShowHints(prev => ({ ...prev, [itemKey]: !prev[itemKey] }))}
                                                            className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 hover:text-cyan-600 transition-colors"
                                                        >
                                                            <Info className="w-3 h-3" />
                                                            {hintVisible ? "Sembunyikan hint" : `${itemDef.metode} — ${itemDef.standar}`}
                                                        </button>
                                                    )}
                                                </div>
                                                {/* Current score badge */}
                                                {item.score !== null && (
                                                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${getScoreLabel(item.score).bg} ${getScoreLabel(item.score).color}`}>
                                                        {getScoreLabel(item.score).label}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Hint box */}
                                            {hintVisible && itemDef && (
                                                <div className="ml-10 p-3 bg-cyan-50 rounded-xl border border-cyan-100 text-xs text-cyan-700 space-y-1">
                                                    <p><span className="font-bold">Metode:</span> {itemDef.metode}</p>
                                                    <p><span className="font-bold">Bukti Objektif:</span> {itemDef.buktiObjektif}</p>
                                                </div>
                                            )}

                                            {/* Score selector (0/1/2) */}
                                            <div className="ml-10 flex flex-wrap gap-2">
                                                {SCORE_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        disabled={isStakeholder}
                                                        onClick={() => handleItemChange(item.section, item.item_number, "score", item.score === opt.value ? null : opt.value)}
                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all
                                                            ${item.score === opt.value
                                                                ? `${opt.bg} ${opt.text} border-transparent ring-2 ${opt.ring} scale-105`
                                                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                                                            } disabled:cursor-default`}
                                                    >
                                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${item.score === opt.value ? "bg-white/30" : "bg-slate-100"}`}>
                                                            {opt.short}
                                                        </span>
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Catatan + RTL + Upload */}
                                            <div className="ml-10 grid grid-cols-1 md:grid-cols-3 gap-2">
                                                <input type="text" placeholder="Catatan temuan..."
                                                    value={item.catatan || ""}
                                                    disabled={isStakeholder}
                                                    onChange={e => handleItemChange(item.section, item.item_number, "catatan", e.target.value || null)}
                                                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 disabled:opacity-70"
                                                />
                                                <input type="text" placeholder="Rencana Tindak Lanjut..."
                                                    value={item.rtl || ""}
                                                    disabled={isStakeholder}
                                                    onChange={e => handleItemChange(item.section, item.item_number, "rtl", e.target.value || null)}
                                                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 disabled:opacity-70"
                                                />
                                                {/* Upload bukti */}
                                                <div>
                                                    {item.bukti_url ? (
                                                        <div className="flex items-center gap-2 bg-cyan-50 border border-cyan-100 rounded-lg px-3 py-2">
                                                            <Camera className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                                                            <a href={item.bukti_url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-600 font-medium truncate hover:underline flex-1">Lihat Bukti</a>
                                                            {!isStakeholder && (
                                                                <button onClick={() => handleItemChange(item.section, item.item_number, "bukti_url", null)} className="p-0.5 rounded hover:bg-red-100 text-red-400">
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        !isStakeholder && (
                                                            <label className={`flex items-center gap-2 px-3 py-2 border border-dashed border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-cyan-300 transition-colors ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
                                                                <Upload className="w-3.5 h-3.5 text-slate-400" />
                                                                <span className="text-xs text-slate-500">{isUploading ? "Mengupload..." : "Upload Bukti"}</span>
                                                                <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx"
                                                                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadBukti(item.section, item.item_number, f); }} />
                                                            </label>
                                                        )
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
            })}

            {/* Sticky Bottom Bar */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-xl p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="text-sm text-slate-600">
                    <span className="font-bold text-slate-800">{rsName}</span>
                    <span className="mx-2 text-slate-300">|</span>
                    <span>Skor {score.totalScore}/{score.maxScore} ({score.percentage}%)</span>
                    {score.filled > 0 && (
                        <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full border ${score.classBadge}`}>
                            {score.classification}
                        </span>
                    )}
                </div>
                <div className="flex gap-3">
                    <button onClick={onBack} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Kembali</button>
                    {!isStakeholder && (
                        <>
                            <button onClick={() => handleSave(false)} disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-cyan-600 bg-cyan-50 rounded-xl hover:bg-cyan-100 border border-cyan-100 disabled:opacity-50">
                                <Save className="w-4 h-4" />
                                {saving ? "Menyimpan..." : "Simpan"}
                            </button>
                            {meta.status !== "completed" ? (
                                <button onClick={() => handleSave(true)} disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl shadow-md disabled:opacity-50">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Selesai & Simpan
                                </button>
                            ) : (
                                isSuperadmin && (
                                    <button onClick={handleRevertToDraft} disabled={saving}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-amber-600 bg-amber-50 rounded-xl border border-amber-200 disabled:opacity-50">
                                        <RotateCcw className="w-4 h-4" />
                                        Kembalikan ke Draft
                                    </button>
                                )
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
