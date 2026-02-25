"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/dashboard/layout";
import { SUPERVISI_SECTIONS, calculateCompletionScore, TOTAL_ITEMS } from "@/lib/supervisiConfig";
import { generateSupervisiPDF } from "@/lib/generateSupervisiPDF";
import { ArrowLeft, Save, CheckCircle2, Upload, X, FileText, ChevronDown, Trash2, Camera, Download } from "lucide-react";

interface Props {
    sessionId: string;
    puskesmasOptions: { id: string; name: string }[];
    onBack: () => void;
}

interface ItemData {
    id?: string;
    session_id: string;
    section: string;
    item_number: number;
    item_label: string;
    value: string | null;
    bukti_url: string | null;
    catatan: string | null;
}

interface SessionMeta {
    puskesmas_id: string;
    tanggal_supervisi: string;
    tim_supervisor: string;
    penanggung_jawab: string;
    status: string;
}

export default function SupervisiForm({ sessionId, puskesmasOptions, onBack }: Props) {
    const { user } = useAuth();
    const effectiveRole = user?.role === "admin_puskesmas" ? "admin_puskesmas" : "superadmin";
    const [meta, setMeta] = useState<SessionMeta>({
        puskesmas_id: "",
        tanggal_supervisi: new Date().toISOString().split("T")[0],
        tim_supervisor: "",
        penanggung_jawab: "",
        status: "draft",
    });
    const [items, setItems] = useState<ItemData[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const [uploadingItem, setUploadingItem] = useState<string | null>(null);
    const [generatingPDF, setGeneratingPDF] = useState(false);

    // Load session data
    useEffect(() => {
        async function loadSession() {
            setLoading(true);
            const { data: sessionData, error: sErr } = await supabase
                .from("supervisi_sessions")
                .select("puskesmas_id, tanggal_supervisi, tim_supervisor, penanggung_jawab, status")
                .eq("id", sessionId)
                .single();

            if (sErr || !sessionData) {
                console.error("Error loading session:", sErr);
                setLoading(false);
                return;
            }

            setMeta({
                puskesmas_id: sessionData.puskesmas_id,
                tanggal_supervisi: sessionData.tanggal_supervisi,
                tim_supervisor: sessionData.tim_supervisor || "",
                penanggung_jawab: sessionData.penanggung_jawab || "",
                status: sessionData.status,
            });

            const { data: itemsData } = await supabase
                .from("supervisi_items")
                .select("*")
                .eq("session_id", sessionId)
                .order("item_number", { ascending: true });

            const existingItems = itemsData || [];
            const allItems: ItemData[] = [];

            for (const section of SUPERVISI_SECTIONS) {
                for (const item of section.items) {
                    const existing = existingItems.find(
                        e => e.section === section.id && e.item_number === item.number
                    );
                    allItems.push({
                        id: existing?.id,
                        session_id: sessionId,
                        section: section.id,
                        item_number: item.number,
                        item_label: item.label,
                        value: existing?.value || null,
                        bukti_url: existing?.bukti_url || null,
                        catatan: existing?.catatan || null,
                    });
                }
            }

            setItems(allItems);

            const expanded: Record<string, boolean> = {};
            SUPERVISI_SECTIONS.forEach(s => (expanded[s.id] = true));
            setExpandedSections(expanded);
            setLoading(false);
        }
        loadSession();
    }, [sessionId]);

    const handleMetaChange = (key: keyof SessionMeta, value: string) => {
        setMeta(prev => ({ ...prev, [key]: value }));
    };

    const handleItemChange = (section: string, itemNumber: number, field: keyof ItemData, value: string | null) => {
        setItems(prev =>
            prev.map(item =>
                item.section === section && item.item_number === itemNumber
                    ? { ...item, [field]: value }
                    : item
            )
        );
    };

    // Upload bukti file
    const handleUploadBukti = async (section: string, itemNumber: number, file: File) => {
        const itemKey = `${section}_${itemNumber}`;
        setUploadingItem(itemKey);

        try {
            const fileExt = file.name.split(".").pop();
            const fileName = `supervisi/${sessionId}/${section}_${itemNumber}_${Date.now()}.${fileExt}`;

            const { error: uploadErr } = await supabase.storage
                .from("supervisi-bukti")
                .upload(fileName, file, { upsert: true });

            if (uploadErr) {
                console.error("Upload error:", uploadErr);
                alert("Gagal upload file: " + (uploadErr.message || "Unknown error"));
                return;
            }

            const { data: urlData } = supabase.storage
                .from("supervisi-bukti")
                .getPublicUrl(fileName);

            handleItemChange(section, itemNumber, "bukti_url", urlData.publicUrl);
        } catch (err) {
            console.error("Upload failed:", err);
        } finally {
            setUploadingItem(null);
        }
    };

    const handleDeleteBukti = (section: string, itemNumber: number) => {
        handleItemChange(section, itemNumber, "bukti_url", null);
    };

    // Save all
    const handleSave = async (markCompleted = false) => {
        setSaving(true);
        try {
            // Update session meta
            const { error: metaErr } = await supabase
                .from("supervisi_sessions")
                .update({
                    puskesmas_id: meta.puskesmas_id,
                    tanggal_supervisi: meta.tanggal_supervisi,
                    tim_supervisor: meta.tim_supervisor || null,
                    penanggung_jawab: meta.penanggung_jawab || null,
                    status: markCompleted ? "completed" : meta.status,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", sessionId);

            if (metaErr) {
                console.error("Meta save error:", metaErr);
                throw metaErr;
            }

            // Upsert items — omit 'id' to let DB handle via onConflict
            const upsertData = items.map(item => ({
                session_id: sessionId,
                section: item.section,
                item_number: item.item_number,
                item_label: item.item_label,
                value: item.value,
                bukti_url: item.bukti_url,
                catatan: item.catatan,
            }));

            const { error: upsertErr } = await supabase
                .from("supervisi_items")
                .upsert(upsertData, { onConflict: "session_id,section,item_number" });

            if (upsertErr) {
                console.error("Items upsert error:", upsertErr);
                throw upsertErr;
            }

            if (markCompleted) {
                setMeta(prev => ({ ...prev, status: "completed" }));
            }

            // Refresh items to get IDs
            const { data: refreshed } = await supabase
                .from("supervisi_items")
                .select("*")
                .eq("session_id", sessionId);

            if (refreshed) {
                setItems(prev =>
                    prev.map(item => {
                        const dbItem = refreshed.find(
                            r => r.section === item.section && r.item_number === item.item_number
                        );
                        return dbItem ? { ...item, id: dbItem.id } : item;
                    })
                );
            }

            alert(markCompleted ? "Supervisi berhasil disimpan dan ditandai selesai!" : "Data berhasil disimpan!");
        } catch (err: any) {
            console.error("Save error:", JSON.stringify(err));
            alert("Gagal menyimpan: " + (err?.message || "Terjadi kesalahan."));
        } finally {
            setSaving(false);
        }
    };

    // Generate PDF
    const handleGeneratePDF = async () => {
        setGeneratingPDF(true);
        try {
            await generateSupervisiPDF(
                {
                    puskesmasName: pkmName,
                    tanggalSupervisi: meta.tanggal_supervisi,
                    timSupervisor: meta.tim_supervisor,
                    penanggungJawab: meta.penanggung_jawab,
                },
                items.map(i => ({
                    section: i.section,
                    item_number: i.item_number,
                    item_label: i.item_label,
                    value: i.value,
                    catatan: i.catatan,
                }))
            );
        } catch (err) {
            console.error("PDF generation error:", err);
            alert("Gagal generate PDF.");
        } finally {
            setGeneratingPDF(false);
        }
    };

    const toggleSection = (sectionId: string) => {
        setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
    };

    const score = calculateCompletionScore(items);
    const pkmName = puskesmasOptions.find(p => p.id === meta.puskesmas_id)?.name || "—";

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium animate-pulse">Memuat form supervisi...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Top Bar */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="font-bold text-slate-800 text-lg">Tools Supervisi & Bimtek</h2>
                        <p className="text-sm text-slate-500">Integrasi Program Kesga Gizi</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${meta.status === "completed"
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : "bg-amber-50 text-amber-600 border-amber-200"}`}>
                        {meta.status === "completed" ? "✓ Selesai" : "⏳ Draft"}
                    </span>
                    <button
                        onClick={handleGeneratePDF}
                        disabled={generatingPDF}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-purple-600 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors border border-purple-100 disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" />
                        {generatingPDF ? "Generating..." : "Download PDF"}
                    </button>
                    <button
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-100 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? "Menyimpan..." : "Simpan Draft"}
                    </button>
                    {meta.status !== "completed" && (
                        <button
                            onClick={() => handleSave(true)}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-md disabled:opacity-50"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Simpan & Selesai
                        </button>
                    )}
                </div>
            </div>

            {/* Session Metadata */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    Informasi Supervisi
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nama Puskesmas</label>
                        {effectiveRole === "admin_puskesmas" ? (
                            <div className="w-full bg-slate-100 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 font-semibold cursor-not-allowed">
                                {pkmName}
                            </div>
                        ) : (
                            <select
                                value={meta.puskesmas_id}
                                onChange={(e) => handleMetaChange("puskesmas_id", e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                {puskesmasOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tanggal Supervisi</label>
                        <input
                            type="date"
                            value={meta.tanggal_supervisi}
                            onChange={(e) => handleMetaChange("tanggal_supervisi", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tim Supervisor</label>
                        <input
                            type="text"
                            placeholder="Nama tim supervisor..."
                            value={meta.tim_supervisor}
                            onChange={(e) => handleMetaChange("tim_supervisor", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Penanggung Jawab Program</label>
                        <input
                            type="text"
                            placeholder="Nama penanggung jawab..."
                            value={meta.penanggung_jawab}
                            onChange={(e) => handleMetaChange("penanggung_jawab", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>
            </div>

            {/* Progress Overview */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-700">Progress Pengisian</h3>
                    <span className="text-sm font-bold text-indigo-600">{score.filled}/{score.total} ({score.percentage}%)</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${score.percentage >= 100 ? "bg-gradient-to-r from-emerald-400 to-green-500" : score.percentage >= 50 ? "bg-gradient-to-r from-indigo-400 to-purple-500" : "bg-gradient-to-r from-amber-400 to-orange-500"}`}
                        style={{ width: `${score.percentage}%` }}
                    />
                </div>
                <div className="flex gap-6 text-xs">
                    <span className="text-emerald-600 font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Ya: {score.yaCount}</span>
                    <span className="text-red-500 font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Tidak: {score.tidakCount}</span>
                    <span className="text-slate-400 font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Belum: {score.total - score.filled}</span>
                </div>
            </div>

            {/* Checklist Sections */}
            {SUPERVISI_SECTIONS.map((section, sIdx) => {
                const sectionItems = items.filter(i => i.section === section.id);
                const sectionScore = calculateCompletionScore(sectionItems);
                const isExpanded = expandedSections[section.id] ?? true;

                const sectionColors = [
                    { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', accent: 'from-orange-500 to-amber-500' },
                    { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', accent: 'from-blue-500 to-cyan-500' },
                    { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', accent: 'from-emerald-500 to-teal-500' },
                    { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', accent: 'from-rose-500 to-pink-500' },
                    { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', accent: 'from-violet-500 to-purple-500' },
                    { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', accent: 'from-indigo-500 to-blue-500' },
                ][sIdx] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', accent: 'from-slate-500 to-gray-500' };

                return (
                    <div key={section.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        {/* Section Header */}
                        <button
                            onClick={() => toggleSection(section.id)}
                            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`h-10 w-1.5 rounded-full bg-gradient-to-b ${sectionColors.accent}`} />
                                <div className="text-left">
                                    <h3 className="font-bold text-slate-800">{section.title}</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {sectionScore.filled}/{sectionScore.total} terisi
                                        {sectionScore.yaCount > 0 && <span className="text-emerald-600 ml-2">✓ {sectionScore.yaCount}</span>}
                                        {sectionScore.tidakCount > 0 && <span className="text-red-500 ml-2">✗ {sectionScore.tidakCount}</span>}
                                    </p>
                                </div>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>

                        {/* Section Items */}
                        {isExpanded && (
                            <div className="border-t border-slate-100">
                                {sectionItems.map((item, idx) => {
                                    const itemKey = `${item.section}_${item.item_number}`;
                                    const isUploading = uploadingItem === itemKey;

                                    return (
                                        <div
                                            key={itemKey}
                                            className={`p-4 flex flex-col gap-3 ${idx < sectionItems.length - 1 ? "border-b border-slate-50" : ""} hover:bg-slate-50/50 transition-colors`}
                                        >
                                            {/* Row: number + label + Toggle Switch */}
                                            <div className="flex items-start gap-3">
                                                <span className={`w-7 h-7 shrink-0 rounded-lg ${sectionColors.bg} ${sectionColors.text} flex items-center justify-center text-xs font-bold`}>
                                                    {item.item_number}
                                                </span>
                                                <span className="flex-1 text-sm text-slate-700 font-medium pt-1">{item.item_label}</span>

                                                {/* Toggle Switch — 3-state: null → Ya → Tidak → null */}
                                                <div className="shrink-0 flex items-center gap-2">
                                                    {/* Label left */}
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider w-10 text-right ${item.value === "tidak" ? "text-red-500" : "text-slate-300"}`}>
                                                        Tidak
                                                    </span>
                                                    {/* Toggle track */}
                                                    <button
                                                        onClick={() => {
                                                            if (item.value === null) handleItemChange(item.section, item.item_number, "value", "ya");
                                                            else if (item.value === "ya") handleItemChange(item.section, item.item_number, "value", "tidak");
                                                            else handleItemChange(item.section, item.item_number, "value", null);
                                                        }}
                                                        className={`relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 ${item.value === "ya"
                                                            ? "bg-emerald-500 focus:ring-emerald-300"
                                                            : item.value === "tidak"
                                                                ? "bg-red-500 focus:ring-red-300"
                                                                : "bg-slate-200 focus:ring-slate-300"
                                                            }`}
                                                    >
                                                        <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 flex items-center justify-center ${item.value === "ya"
                                                            ? "left-[30px]"
                                                            : item.value === "tidak"
                                                                ? "left-[2px]"
                                                                : "left-[15px]"
                                                            }`}>
                                                            {item.value === "ya" && <span className="text-emerald-500 text-xs font-bold">✓</span>}
                                                            {item.value === "tidak" && <span className="text-red-500 text-xs font-bold">✕</span>}
                                                            {item.value === null && <span className="text-slate-300 text-[8px] font-bold">—</span>}
                                                        </div>
                                                    </button>
                                                    {/* Label right */}
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider w-6 ${item.value === "ya" ? "text-emerald-600" : "text-slate-300"}`}>
                                                        Ya
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Bukti + Catatan row */}
                                            <div className="flex gap-3 ml-10">
                                                {/* Upload Bukti */}
                                                <div className="flex-1">
                                                    {item.bukti_url ? (
                                                        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                                                            <Camera className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                            <a href={item.bukti_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 font-medium truncate hover:underline">
                                                                Lihat Bukti
                                                            </a>
                                                            <button onClick={() => handleDeleteBukti(item.section, item.item_number)} className="ml-auto p-0.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600">
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <label className={`flex items-center gap-2 px-3 py-2 border border-dashed border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-indigo-300 transition-colors ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
                                                            <Upload className="w-3.5 h-3.5 text-slate-400" />
                                                            <span className="text-xs text-slate-500">{isUploading ? "Mengupload..." : "Upload Bukti"}</span>
                                                            <input
                                                                type="file"
                                                                className="hidden"
                                                                accept="image/*,.pdf,.doc,.docx"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) handleUploadBukti(item.section, item.item_number, file);
                                                                }}
                                                            />
                                                        </label>
                                                    )}
                                                </div>

                                                {/* Catatan */}
                                                <div className="flex-1">
                                                    <input
                                                        type="text"
                                                        placeholder="Catatan..."
                                                        value={item.catatan || ""}
                                                        onChange={(e) => handleItemChange(item.section, item.item_number, "catatan", e.target.value || null)}
                                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                                                    />
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

            {/* Bottom Save Bar */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-xl p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="text-sm text-slate-600">
                    <span className="font-bold text-slate-800">{pkmName}</span>
                    <span className="mx-2 text-slate-300">|</span>
                    <span>{score.filled}/{score.total} terisi</span>
                </div>
                <div className="flex gap-3">
                    <button onClick={onBack} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                        Kembali
                    </button>
                    <button
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-100 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? "Menyimpan..." : "Simpan"}
                    </button>
                    {meta.status !== "completed" && (
                        <button
                            onClick={() => handleSave(true)}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-md disabled:opacity-50"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Selesai
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
