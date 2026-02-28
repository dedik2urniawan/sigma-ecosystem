"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/dashboard/layout";
import { BA_PROGRAMS, DASAR_HUKUM, PEMBUKAAN_TEXT, PENUTUP_TEXT } from "@/lib/baBimtekConfig";
import { generateBaBimtekPDF } from "@/lib/generateBaBimtekPDF";
import {
    ArrowLeft, Save, CheckCircle2, Plus, Trash2, Download,
    FileText, Calendar, MapPin, ChevronDown, Lock, Unlock
} from "lucide-react";

interface Props {
    sessionId: string;
    onBack: () => void;
}

interface SessionMeta {
    puskesmas_id: string;
    puskesmas_name: string;
    tanggal_kegiatan: string;
    tempat_kegiatan: string;
    status: string;
    // Signatory — PJ Dinkes
    pj_dinkes_nama: string;
    pj_dinkes_nip: string;
    // Signatory — Kepala Puskesmas
    kepala_pkm_nama: string;
    kepala_pkm_nip: string;
}

interface ProgramRow {
    id?: string;
    item_order: number;
    hasil_supervisi: string;
    rencana_tindak_lanjut: string;
}

type ProgramData = Record<string, ProgramRow[]>;

const PROGRAM_COLORS = [
    { bg: 'bg-rose-50', border: 'border-rose-200', accent: 'from-rose-500 to-pink-500', badge: 'bg-rose-100 text-rose-700', icon: 'bg-rose-100 text-rose-500' },
    { bg: 'bg-purple-50', border: 'border-purple-200', accent: 'from-purple-500 to-violet-500', badge: 'bg-purple-100 text-purple-700', icon: 'bg-purple-100 text-purple-500' },
    { bg: 'bg-blue-50', border: 'border-blue-200', accent: 'from-blue-500 to-cyan-500', badge: 'bg-blue-100 text-blue-700', icon: 'bg-blue-100 text-blue-500' },
    { bg: 'bg-amber-50', border: 'border-amber-200', accent: 'from-amber-500 to-orange-500', badge: 'bg-amber-100 text-amber-700', icon: 'bg-amber-100 text-amber-500' },
    { bg: 'bg-teal-50', border: 'border-teal-200', accent: 'from-teal-500 to-emerald-500', badge: 'bg-teal-100 text-teal-700', icon: 'bg-teal-100 text-teal-500' },
];

export default function BaBimtekForm({ sessionId, onBack }: Props) {
    const { user } = useAuth();
    const isSuperadmin = user?.role === "superadmin" || user?.role !== "admin_puskesmas";

    const [meta, setMeta] = useState<SessionMeta>({
        puskesmas_id: '', puskesmas_name: '', tanggal_kegiatan: '', tempat_kegiatan: '', status: 'draft',
        pj_dinkes_nama: '', pj_dinkes_nip: '',
        kepala_pkm_nama: '', kepala_pkm_nip: '',
    });
    const [programs, setPrograms] = useState<ProgramData>({});
    const [expandedPrograms, setExpandedPrograms] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generatingPDF, setGeneratingPDF] = useState(false);

    // Load session data
    const loadSession = useCallback(async () => {
        setLoading(true);
        const { data: s } = await supabase
            .from("ba_bimtek_sessions")
            .select("puskesmas_id, tanggal_kegiatan, tempat_kegiatan, status, pj_dinkes_nama, pj_dinkes_nip, kepala_pkm_nama, kepala_pkm_nip")
            .eq("id", sessionId).single();

        if (!s) { setLoading(false); return; }

        // Fetch PKM name
        const { data: pkm } = await supabase.from("ref_puskesmas").select("nama").eq("id", s.puskesmas_id).single();

        setMeta({
            puskesmas_id: s.puskesmas_id,
            puskesmas_name: pkm?.nama || "—",
            tanggal_kegiatan: s.tanggal_kegiatan,
            tempat_kegiatan: s.tempat_kegiatan || "",
            status: s.status,
            pj_dinkes_nama: s.pj_dinkes_nama || "",
            pj_dinkes_nip: s.pj_dinkes_nip || "",
            kepala_pkm_nama: s.kepala_pkm_nama || "",
            kepala_pkm_nip: s.kepala_pkm_nip || "",
        });

        // Load items
        const { data: items } = await supabase
            .from("ba_bimtek_items")
            .select("id, program, program_label, item_order, hasil_supervisi, rencana_tindak_lanjut")
            .eq("session_id", sessionId)
            .order("item_order", { ascending: true });

        // Build program rows map
        const progData: ProgramData = {};
        BA_PROGRAMS.forEach(p => {
            const pItems = (items || []).filter((i: any) => i.program === p.id);
            progData[p.id] = pItems.length > 0
                ? pItems.map((i: any) => ({
                    id: i.id,
                    item_order: i.item_order,
                    hasil_supervisi: i.hasil_supervisi || "",
                    rencana_tindak_lanjut: i.rencana_tindak_lanjut || "",
                }))
                : [{ item_order: 1, hasil_supervisi: "", rencana_tindak_lanjut: "" }];
        });
        setPrograms(progData);

        // Expand all by default
        const exp: Record<string, boolean> = {};
        BA_PROGRAMS.forEach(p => (exp[p.id] = true));
        setExpandedPrograms(exp);

        setLoading(false);
    }, [sessionId]);

    useEffect(() => { loadSession(); }, [loadSession]);

    // Add row to program
    const addRow = (programId: string) => {
        setPrograms(prev => {
            const rows = prev[programId] || [];
            const nextOrder = Math.max(...rows.map(r => r.item_order), 0) + 1;
            return { ...prev, [programId]: [...rows, { item_order: nextOrder, hasil_supervisi: "", rencana_tindak_lanjut: "" }] };
        });
    };

    // Remove row from program
    const removeRow = (programId: string, idx: number) => {
        setPrograms(prev => {
            const rows = [...(prev[programId] || [])];
            if (rows.length <= 1) return prev; // keep at least 1 row
            rows.splice(idx, 1);
            return { ...prev, [programId]: rows.map((r, i) => ({ ...r, item_order: i + 1 })) };
        });
    };

    // Update cell value
    const updateCell = (programId: string, idx: number, field: 'hasil_supervisi' | 'rencana_tindak_lanjut', value: string) => {
        setPrograms(prev => {
            const rows = [...(prev[programId] || [])];
            rows[idx] = { ...rows[idx], [field]: value };
            return { ...prev, [programId]: rows };
        });
    };

    // Save all data
    const handleSave = async (markCompleted = false) => {
        setSaving(true);
        try {
            // Update session meta
            const { error: metaErr } = await supabase
                .from("ba_bimtek_sessions")
                .update({
                    tanggal_kegiatan: meta.tanggal_kegiatan,
                    tempat_kegiatan: meta.tempat_kegiatan || null,
                    status: markCompleted ? "completed" : meta.status,
                    pj_dinkes_nama: meta.pj_dinkes_nama || null,
                    pj_dinkes_nip: meta.pj_dinkes_nip || null,
                    kepala_pkm_nama: meta.kepala_pkm_nama || null,
                    kepala_pkm_nip: meta.kepala_pkm_nip || null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", sessionId);
            if (metaErr) throw metaErr;

            // Delete existing items and re-insert (simplest approach for dynamic rows)
            await supabase.from("ba_bimtek_items").delete().eq("session_id", sessionId);

            const insertRows: any[] = [];
            BA_PROGRAMS.forEach(prog => {
                const rows = programs[prog.id] || [];
                rows.forEach((row, idx) => {
                    insertRows.push({
                        session_id: sessionId,
                        program: prog.id,
                        program_label: prog.label,
                        item_order: idx + 1,
                        hasil_supervisi: row.hasil_supervisi || null,
                        rencana_tindak_lanjut: row.rencana_tindak_lanjut || null,
                    });
                });
            });

            if (insertRows.length > 0) {
                const { error: insertErr } = await supabase.from("ba_bimtek_items").insert(insertRows);
                if (insertErr) throw insertErr;
            }

            if (markCompleted) setMeta(prev => ({ ...prev, status: "completed" }));
            alert(markCompleted ? "Berita Acara berhasil disimpan dan ditandai selesai!" : "Data berhasil disimpan!");
            await loadSession();
        } catch (err: any) {
            alert("Gagal menyimpan: " + (err?.message || "Terjadi kesalahan."));
        } finally {
            setSaving(false);
        }
    };

    // Generate PDF
    const handleGeneratePDF = async () => {
        setGeneratingPDF(true);
        try {
            await generateBaBimtekPDF({ meta, programs });
        } finally {
            setGeneratingPDF(false);
        }
    };

    const formatDateLong = (d: string) => {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 font-medium animate-pulse">Memuat Berita Acara...</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Top Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="font-bold text-slate-800 text-lg">Berita Acara Supervisi</h2>
                        <p className="text-sm text-slate-500">{meta.puskesmas_name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${meta.status === "completed" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"}`}>
                        {meta.status === "completed" ? "✓ Selesai" : "⏳ Draft"}
                    </span>
                    <button onClick={handleGeneratePDF} disabled={generatingPDF}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-purple-600 bg-purple-50 rounded-xl hover:bg-purple-100 border border-purple-100 disabled:opacity-50">
                        <Download className="w-4 h-4" />
                        {generatingPDF ? "Generating..." : "PDF"}
                    </button>
                    <button onClick={() => handleSave(false)} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-teal-600 bg-teal-50 rounded-xl hover:bg-teal-100 border border-teal-100 disabled:opacity-50">
                        <Save className="w-4 h-4" />
                        {saving ? "Menyimpan..." : "Simpan"}
                    </button>
                    {meta.status !== "completed" && (
                        <button onClick={() => handleSave(true)} disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 shadow-md disabled:opacity-50">
                            <CheckCircle2 className="w-4 h-4" />
                            Selesai
                        </button>
                    )}
                </div>
            </div>

            {/* RBAC Info Banner */}
            {!isSuperadmin && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <Lock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700">
                        Kolom <strong>Hasil Supervisi</strong> hanya dapat diisi oleh Petugas Dinas Kesehatan. Anda dapat mengisi kolom <strong>Rencana Tindak Lanjut</strong>.
                    </p>
                </div>
            )}
            {isSuperadmin && (
                <div className="flex items-start gap-2 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <Unlock className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-indigo-700">
                        <strong>Mode Superadmin:</strong> Anda dapat mengisi kolom <strong>Hasil Supervisi</strong> (5 PJ Program Dinkes) dan <strong>Rencana Tindak Lanjut</strong>.
                    </p>
                </div>
            )}

            {/* Session Metadata */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-teal-500" />
                    Informasi Kegiatan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Puskesmas</label>
                        <div className="w-full bg-slate-100 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 font-semibold">
                            {meta.puskesmas_name}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tanggal Kegiatan</label>
                        <input type="date" value={meta.tanggal_kegiatan}
                            onChange={e => setMeta(prev => ({ ...prev, tanggal_kegiatan: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-teal-400" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tempat Kegiatan</label>
                        <input type="text" placeholder="Contoh: Aula Puskesmas Kepanjen" value={meta.tempat_kegiatan}
                            onChange={e => setMeta(prev => ({ ...prev, tempat_kegiatan: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-teal-400" />
                    </div>

                    {/* PJ Dinkes */}
                    <div className="md:col-span-2 pt-2 border-t border-slate-100">
                        <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] flex items-center justify-center font-black">I</span>
                            Penanggung Jawab Program KGM Dinas Kesehatan Kab. Malang
                        </p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Lengkap PJ Dinkes</label>
                        <input type="text" placeholder="dr. Nama Lengkap" value={meta.pj_dinkes_nama}
                            onChange={e => setMeta(prev => ({ ...prev, pj_dinkes_nama: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-indigo-400" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">NIP PJ Dinkes</label>
                        <input type="text" placeholder="19801010 200501 1 001" value={meta.pj_dinkes_nip}
                            onChange={e => setMeta(prev => ({ ...prev, pj_dinkes_nip: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-indigo-400" />
                    </div>

                    {/* Kepala Puskesmas */}
                    <div className="md:col-span-2 pt-2 border-t border-slate-100">
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] flex items-center justify-center font-black">II</span>
                            Kepala Puskesmas {meta.puskesmas_name}
                        </p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Lengkap Kepala PKM</label>
                        <input type="text" placeholder="dr. Nama Kepala Puskesmas" value={meta.kepala_pkm_nama}
                            onChange={e => setMeta(prev => ({ ...prev, kepala_pkm_nama: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-emerald-400" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">NIP Kepala PKM</label>
                        <input type="text" placeholder="19801010 200501 1 001" value={meta.kepala_pkm_nip}
                            onChange={e => setMeta(prev => ({ ...prev, kepala_pkm_nip: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-emerald-400" />
                    </div>
                </div>
            </div>

            {/* Document Preview Info */}
            <div className="bg-gradient-to-r from-slate-50 to-teal-50/30 p-4 rounded-2xl border border-slate-200">
                <div className="text-xs text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-600 mb-2">📋 Preview Pembukaan Dokumen</p>
                    <p className="italic">{PEMBUKAAN_TEXT(formatDateLong(meta.tanggal_kegiatan), meta.tempat_kegiatan)}</p>
                    <p className="text-slate-400 mt-2">
                        <span className="font-semibold">Dasar Hukum:</span> {DASAR_HUKUM.length} regulasi (preset) |
                        <span className="font-semibold ml-2">Tanda tangan:</span> diisi manual setelah cetak
                    </p>
                </div>
            </div>

            {/* 5 Program Sections */}
            <div className="space-y-4">
                {BA_PROGRAMS.map((prog, progIdx) => {
                    const color = PROGRAM_COLORS[progIdx];
                    const rows = programs[prog.id] || [];
                    const isExpanded = expandedPrograms[prog.id] ?? true;
                    const filledHS = rows.filter(r => r.hasil_supervisi.trim()).length;
                    const filledRTL = rows.filter(r => r.rencana_tindak_lanjut.trim()).length;

                    return (
                        <div key={prog.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            {/* Section Header */}
                            <button onClick={() => setExpandedPrograms(prev => ({ ...prev, [prog.id]: !prev[prog.id] }))}
                                className="w-full flex items-center justify-between p-4 hover:bg-slate-50/70 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`h-10 w-1.5 rounded-full bg-gradient-to-b ${color.accent}`} />
                                    <div className="text-left">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color.badge}`}>{progIdx + 1}</span>
                                            <h3 className="font-bold text-slate-800">{prog.label}</h3>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {rows.length} baris ·
                                            <span className="text-indigo-500 ml-1">{filledHS} Hasil Supervisi</span> ·
                                            <span className="text-emerald-500 ml-1">{filledRTL} RTL terisi</span>
                                        </p>
                                    </div>
                                </div>
                                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </button>

                            {isExpanded && (
                                <div className="border-t border-slate-100">
                                    {/* Column Headers */}
                                    <div className="grid grid-cols-2 gap-0">
                                        <div className="bg-indigo-50 px-4 py-2.5 flex items-center gap-2 border-r border-slate-100">
                                            {isSuperadmin
                                                ? <Unlock className="w-3.5 h-3.5 text-indigo-500" />
                                                : <Lock className="w-3.5 h-3.5 text-slate-400" />}
                                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Hasil Supervisi</span>
                                            {!isSuperadmin && <span className="text-[9px] text-slate-400 ml-auto">(Dinkes only)</span>}
                                        </div>
                                        <div className="bg-emerald-50 px-4 py-2.5 flex items-center gap-2">
                                            <Unlock className="w-3.5 h-3.5 text-emerald-500" />
                                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Rencana Tindak Lanjut</span>
                                        </div>
                                    </div>

                                    {/* Rows */}
                                    {rows.map((row, rowIdx) => (
                                        <div key={rowIdx} className="grid grid-cols-2 gap-0 border-t border-slate-50 group relative">
                                            {/* Hasil Supervisi */}
                                            <div className="p-3 border-r border-slate-100">
                                                {isSuperadmin ? (
                                                    <textarea
                                                        rows={3}
                                                        placeholder={`Temuan hasil supervisi ${prog.label}...`}
                                                        value={row.hasil_supervisi}
                                                        onChange={e => updateCell(prog.id, rowIdx, "hasil_supervisi", e.target.value)}
                                                        className="w-full text-sm bg-indigo-50/40 border border-indigo-100 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-indigo-400 resize-none text-slate-700 placeholder:text-slate-300"
                                                    />
                                                ) : (
                                                    <div className="w-full text-sm bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-slate-700 min-h-[80px] whitespace-pre-wrap">
                                                        {row.hasil_supervisi || <span className="text-slate-300 italic">Belum diisi oleh Dinkes</span>}
                                                    </div>
                                                )}
                                            </div>
                                            {/* RTL */}
                                            <div className="p-3 relative">
                                                <textarea
                                                    rows={3}
                                                    placeholder="Rencana tindak lanjut dari Puskesmas..."
                                                    value={row.rencana_tindak_lanjut}
                                                    onChange={e => updateCell(prog.id, rowIdx, "rencana_tindak_lanjut", e.target.value)}
                                                    className="w-full text-sm bg-emerald-50/40 border border-emerald-100 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-emerald-400 resize-none text-slate-700 placeholder:text-slate-300"
                                                />
                                                {/* Delete row button */}
                                                {rows.length > 1 && (
                                                    <button onClick={() => removeRow(prog.id, rowIdx)}
                                                        className="absolute top-3 right-3 p-1 rounded-lg hover:bg-red-50 text-slate-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add Row Button */}
                                    <div className="p-3 border-t border-slate-50 flex justify-center">
                                        <button onClick={() => addRow(prog.id)}
                                            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-dashed transition-colors ${color.border} ${color.bg} text-slate-500 hover:text-slate-700`}>
                                            <Plus className="w-3.5 h-3.5" />
                                            Tambah Baris
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Bottom Save Bar */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-xl p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="text-sm text-slate-600">
                    <span className="font-bold text-slate-800">{meta.puskesmas_name}</span>
                    <span className="mx-2 text-slate-300">|</span>
                    <span className="text-slate-400">{formatDateLong(meta.tanggal_kegiatan)}</span>
                </div>
                <div className="flex gap-3">
                    <button onClick={onBack} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Kembali</button>
                    <button onClick={() => handleSave(false)} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-teal-600 bg-teal-50 rounded-xl hover:bg-teal-100 border border-teal-100 disabled:opacity-50">
                        <Save className="w-4 h-4" />
                        {saving ? "Menyimpan..." : "Simpan"}
                    </button>
                    {meta.status !== "completed" && (
                        <button onClick={() => handleSave(true)} disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-md disabled:opacity-50">
                            <CheckCircle2 className="w-4 h-4" />
                            Selesai & Simpan
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
