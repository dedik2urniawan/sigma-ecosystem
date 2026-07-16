"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/dashboard/layout";
import { BA_RS_PROGRAMS, PEMBUKAAN_RS_TEXT } from "@/lib/baBimtekRsConfig";
import { generateBaBimtekRsPDF } from "@/lib/generateBaBimtekRsPDF";
import { ArrowLeft, Save, CheckCircle2, Download, RotateCcw, Plus, Trash2, FileText } from "lucide-react";

interface Props {
    sessionId: string;
    onBack: () => void;
}

interface SessionMeta {
    rs_id: string;
    rs_name: string;
    tanggal_kegiatan: string;
    tempat_kegiatan: string;
    status: string;
    pj_dinkes_nama: string;
    pj_dinkes_nip: string;
    direktur_rs_nama: string;
    direktur_rs_nip: string;
}

interface ProgramRow {
    id?: string;
    item_order: number;
    hasil_supervisi: string;
    rencana_tindak_lanjut: string;
}

type ProgramData = Record<string, ProgramRow[]>;

const EMPTY_ROW = (): ProgramRow => ({
    item_order: 0,
    hasil_supervisi: "",
    rencana_tindak_lanjut: "",
});

export default function BaRsForm({ sessionId, onBack }: Props) {
    const { user } = useAuth();
    const isSuperadmin = user?.role === "superadmin";
    const isStakeholder = user?.role === "stakeholder";

    const [meta, setMeta] = useState<SessionMeta>({
        rs_id: "", rs_name: "", tanggal_kegiatan: new Date().toISOString().split("T")[0],
        tempat_kegiatan: "", status: "draft",
        pj_dinkes_nama: "", pj_dinkes_nip: "",
        direktur_rs_nama: "", direktur_rs_nip: "",
    });
    const [programs, setPrograms] = useState<ProgramData>(() =>
        Object.fromEntries(BA_RS_PROGRAMS.map(p => [p.id, [{ ...EMPTY_ROW(), item_order: 1 }]]))
    );
    const [loading, setLoading] = useState(true);
    const [savingMeta, setSavingMeta] = useState(false);
    const [savingProgram, setSavingProgram] = useState<string | null>(null);
    const [savedPrograms, setSavedPrograms] = useState<Record<string, boolean>>({});
    const [dirtyPrograms, setDirtyPrograms] = useState<Record<string, boolean>>({});
    const [expandedPrograms, setExpandedPrograms] = useState<Record<string, boolean>>(
        Object.fromEntries(BA_RS_PROGRAMS.map(p => [p.id, true]))
    );
    const [generatingPDF, setGeneratingPDF] = useState(false);

    useEffect(() => {
        async function load() {
            setLoading(true);
            const { data: s } = await supabase
                .from("ba_rs_sessions")
                .select("rs_id, rs_name, tanggal_kegiatan, tempat_kegiatan, status, pj_dinkes_nama, pj_dinkes_nip, direktur_rs_nama, direktur_rs_nip")
                .eq("id", sessionId).single();

            if (!s) { setLoading(false); return; }

            setMeta({
                rs_id: s.rs_id, rs_name: s.rs_name,
                tanggal_kegiatan: s.tanggal_kegiatan,
                tempat_kegiatan: s.tempat_kegiatan || "",
                status: s.status,
                pj_dinkes_nama: s.pj_dinkes_nama || "",
                pj_dinkes_nip: s.pj_dinkes_nip || "",
                direktur_rs_nama: s.direktur_rs_nama || "",
                direktur_rs_nip: s.direktur_rs_nip || "",
            });

            const { data: items } = await supabase
                .from("ba_rs_items")
                .select("*")
                .eq("session_id", sessionId)
                .order("item_order");

            if (items && items.length > 0) {
                const prog: ProgramData = {};
                BA_RS_PROGRAMS.forEach(p => {
                    const rows = items.filter(i => i.program === p.id).map(i => ({
                        id: i.id, item_order: i.item_order,
                        hasil_supervisi: i.hasil_supervisi || "",
                        rencana_tindak_lanjut: i.rencana_tindak_lanjut || "",
                    }));
                    prog[p.id] = rows.length > 0 ? rows : [{ ...EMPTY_ROW(), item_order: 1 }];
                });
                setPrograms(prog);
            }
            setLoading(false);
        }
        load();
    }, [sessionId]);

    const handleMetaChange = (k: keyof SessionMeta, v: string) => {
        if (isStakeholder) return;
        setMeta(prev => ({ ...prev, [k]: v }));
    };

    const handleSaveMeta = async () => {
        if (isStakeholder) return;
        setSavingMeta(true);
        const { error } = await supabase.from("ba_rs_sessions").update({
            tanggal_kegiatan: meta.tanggal_kegiatan,
            tempat_kegiatan: meta.tempat_kegiatan || null,
            pj_dinkes_nama: meta.pj_dinkes_nama || null,
            pj_dinkes_nip: meta.pj_dinkes_nip || null,
            direktur_rs_nama: meta.direktur_rs_nama || null,
            direktur_rs_nip: meta.direktur_rs_nip || null,
            updated_at: new Date().toISOString(),
        }).eq("id", sessionId);
        setSavingMeta(false);
        if (error) alert("Gagal menyimpan: " + error.message);
    };

    const handleRowChange = (programId: string, rowIdx: number, field: "hasil_supervisi" | "rencana_tindak_lanjut", value: string) => {
        if (isStakeholder) return;
        setPrograms(prev => {
            const rows = [...(prev[programId] || [])];
            rows[rowIdx] = { ...rows[rowIdx], [field]: value };
            return { ...prev, [programId]: rows };
        });
        setDirtyPrograms(prev => ({ ...prev, [programId]: true }));
        setSavedPrograms(prev => ({ ...prev, [programId]: false }));
    };

    const handleAddRow = (programId: string) => {
        if (isStakeholder) return;
        setPrograms(prev => {
            const rows = [...(prev[programId] || [])];
            rows.push({ ...EMPTY_ROW(), item_order: rows.length + 1 });
            return { ...prev, [programId]: rows };
        });
        setDirtyPrograms(prev => ({ ...prev, [programId]: true }));
    };

    const handleRemoveRow = (programId: string, rowIdx: number) => {
        if (isStakeholder) return;
        setPrograms(prev => {
            const rows = (prev[programId] || []).filter((_, i) => i !== rowIdx).map((r, i) => ({ ...r, item_order: i + 1 }));
            return { ...prev, [programId]: rows.length > 0 ? rows : [{ ...EMPTY_ROW(), item_order: 1 }] };
        });
        setDirtyPrograms(prev => ({ ...prev, [programId]: true }));
        setSavedPrograms(prev => ({ ...prev, [programId]: false }));
    };

    const handleSaveProgram = async (programId: string) => {
        if (isStakeholder) return;
        setSavingProgram(programId);
        try {
            const prog = BA_RS_PROGRAMS.find(p => p.id === programId);
            await supabase.from("ba_rs_items").delete().eq("session_id", sessionId).eq("program", programId);
            const rows = (programs[programId] || []).filter(r => r.hasil_supervisi || r.rencana_tindak_lanjut);
            if (rows.length > 0) {
                const { error } = await supabase.from("ba_rs_items").insert(
                    rows.map((r, i) => ({
                        session_id: sessionId,
                        program: programId,
                        program_label: prog?.label || "",
                        item_order: i + 1,
                        hasil_supervisi: r.hasil_supervisi,
                        rencana_tindak_lanjut: r.rencana_tindak_lanjut,
                    }))
                );
                if (error) { alert("Gagal simpan: " + error.message); return; }
            }
            setSavedPrograms(prev => ({ ...prev, [programId]: true }));
            setDirtyPrograms(prev => ({ ...prev, [programId]: false }));
        } finally {
            setSavingProgram(null);
        }
    };

    const handleCompleteSession = async () => {
        if (!isSuperadmin) return;
        if (!confirm("Tandai Berita Acara ini sebagai Selesai?")) return;
        await supabase.from("ba_rs_sessions").update({ status: "completed" }).eq("id", sessionId);
        setMeta(prev => ({ ...prev, status: "completed" }));
    };

    const handleRevertToDraft = async () => {
        if (!isSuperadmin) return;
        if (!confirm("Kembalikan ke Draft?")) return;
        await supabase.from("ba_rs_sessions").update({ status: "draft" }).eq("id", sessionId);
        setMeta(prev => ({ ...prev, status: "draft" }));
    };

    const handleGeneratePDF = async () => {
        setGeneratingPDF(true);
        try {
            await generateBaBimtekRsPDF({ meta, programs });
        } catch (err) {
            alert("Gagal membuat PDF.");
        } finally {
            setGeneratingPDF(false);
        }
    };

    const tanggalFormatted = meta.tanggal_kegiatan
        ? new Date(meta.tanggal_kegiatan).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
        : "_______________";

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 font-medium animate-pulse">Memuat Berita Acara RS...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Top Bar */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="font-bold text-slate-800 text-lg">Berita Acara Bimtek RS</h2>
                        <p className="text-sm text-slate-500">{meta.rs_name}</p>
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
                    {!isStakeholder && meta.status !== "completed" && (
                        <button onClick={handleCompleteSession}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl shadow-md">
                            <CheckCircle2 className="w-4 h-4" />
                            Tandai Selesai
                        </button>
                    )}
                    {isSuperadmin && meta.status === "completed" && (
                        <button onClick={handleRevertToDraft}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-amber-600 bg-amber-50 rounded-xl border border-amber-200">
                            <RotateCcw className="w-4 h-4" />
                            Kembalikan ke Draft
                        </button>
                    )}
                </div>
            </div>

            {/* Meta Form */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-teal-500" />
                    Informasi Berita Acara
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Rumah Sakit</label>
                        <input type="text" value={meta.rs_name} readOnly className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 opacity-70 cursor-default" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tanggal Kegiatan</label>
                        <input type="date" value={meta.tanggal_kegiatan} onChange={e => handleMetaChange("tanggal_kegiatan", e.target.value)} disabled={isStakeholder}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 outline-none" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tempat Kegiatan</label>
                        <input type="text" placeholder="Tempat kegiatan..." value={meta.tempat_kegiatan} onChange={e => handleMetaChange("tempat_kegiatan", e.target.value)} disabled={isStakeholder}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">PJ Dinkes (Nama)</label>
                        <input type="text" placeholder="Nama PJ Program KGM..." value={meta.pj_dinkes_nama} onChange={e => handleMetaChange("pj_dinkes_nama", e.target.value)} disabled={isStakeholder}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">PJ Dinkes (NIP)</label>
                        <input type="text" placeholder="NIP..." value={meta.pj_dinkes_nip} onChange={e => handleMetaChange("pj_dinkes_nip", e.target.value)} disabled={isStakeholder}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Direktur / Pimpinan RS (Nama)</label>
                        <input type="text" placeholder="Nama Direktur RS..." value={meta.direktur_rs_nama} onChange={e => handleMetaChange("direktur_rs_nama", e.target.value)} disabled={isStakeholder}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Direktur / Pimpinan RS (NIP / No. SK)</label>
                        <input type="text" placeholder="NIP / Nomor SK..." value={meta.direktur_rs_nip} onChange={e => handleMetaChange("direktur_rs_nip", e.target.value)} disabled={isStakeholder}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 outline-none" />
                    </div>
                </div>
                {!isStakeholder && (
                    <div className="mt-4 flex justify-end">
                        <button onClick={handleSaveMeta} disabled={savingMeta}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-teal-600 bg-teal-50 rounded-xl hover:bg-teal-100 border border-teal-100 disabled:opacity-50">
                            <Save className="w-4 h-4" />
                            {savingMeta ? "Menyimpan..." : "Simpan Info"}
                        </button>
                    </div>
                )}
            </div>

            {/* Preview Pembukaan */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-5 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Preview Pembukaan BA</h4>
                <p className="text-sm text-slate-700 italic leading-relaxed">
                    {PEMBUKAAN_RS_TEXT(tanggalFormatted, meta.tempat_kegiatan)}
                </p>
            </div>

            {/* Program Cards */}
            {BA_RS_PROGRAMS.map((prog, pIdx) => {
                const isDirty = dirtyPrograms[prog.id];
                const isSaved = savedPrograms[prog.id];
                const isThisSaving = savingProgram === prog.id;
                const isExpanded = expandedPrograms[prog.id] ?? true;
                const rows = programs[prog.id] || [];

                return (
                    <div key={prog.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div
                            onClick={() => setExpandedPrograms(prev => ({ ...prev, [prog.id]: !isExpanded }))}
                            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${pIdx === 0 ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"}`}>
                                    {pIdx + 1}
                                </div>
                                <span className="font-bold text-slate-800 text-sm">{prog.label.toUpperCase()}</span>
                                {isDirty && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full animate-pulse border border-amber-200">
                                        • Belum disimpan
                                    </span>
                                )}
                                {isSaved && !isDirty && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-full border border-emerald-200">
                                        ✓ Tersimpan
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {!isStakeholder && (
                                    <button
                                        onClick={e => { e.stopPropagation(); handleSaveProgram(prog.id); }}
                                        disabled={isThisSaving}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 border border-teal-100 disabled:opacity-50"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        {isThisSaving ? "Menyimpan..." : "Simpan"}
                                    </button>
                                )}
                                <span className="material-icons-round text-slate-400 text-lg">
                                    {isExpanded ? "expand_less" : "expand_more"}
                                </span>
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="border-t border-slate-100 p-4 space-y-3">
                                <div className="grid grid-cols-2 text-xs font-bold text-slate-500 uppercase tracking-wider px-1 gap-3">
                                    <span>Hasil Supervisi</span>
                                    <span>Rencana Tindak Lanjut</span>
                                </div>
                                {rows.map((row, rowIdx) => (
                                    <div key={rowIdx} className="grid grid-cols-2 gap-3 items-start group">
                                        <textarea
                                            rows={3}
                                            placeholder="Tuliskan hasil supervisi..."
                                            value={row.hasil_supervisi}
                                            disabled={isStakeholder || (!isSuperadmin)}
                                            onChange={e => handleRowChange(prog.id, rowIdx, "hasil_supervisi", e.target.value)}
                                            className="px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-teal-400 focus:border-teal-400 resize-none disabled:opacity-70"
                                        />
                                        <div className="flex gap-2 items-start">
                                            <textarea
                                                rows={3}
                                                placeholder="Rencana tindak lanjut..."
                                                value={row.rencana_tindak_lanjut}
                                                disabled={isStakeholder}
                                                onChange={e => handleRowChange(prog.id, rowIdx, "rencana_tindak_lanjut", e.target.value)}
                                                className="flex-1 px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-teal-400 focus:border-teal-400 resize-none disabled:opacity-70"
                                            />
                                            {!isStakeholder && rows.length > 1 && (
                                                <button onClick={() => handleRemoveRow(prog.id, rowIdx)}
                                                    className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors mt-0.5 opacity-0 group-hover:opacity-100">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {!isStakeholder && (
                                    <button onClick={() => handleAddRow(prog.id)}
                                        className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-xl border border-dashed border-slate-200 hover:border-teal-300 transition-all w-full justify-center">
                                        <Plus className="w-3.5 h-3.5" />
                                        Tambah Baris
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
