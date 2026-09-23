"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/app/dashboard/layout";
import { supabase } from "@/lib/supabase";
import { generateMbgSupervisiPDF } from "@/lib/generateMbgSupervisiPDF";
import MbgAnalyticalDashboard from "@/components/mbg/MbgAnalyticalDashboard";
import AnalisisPertumbuhanMbgTab from "@/components/mbg/AnalisisPertumbuhanMbgTab";

// Dynamic import for Leaflet Map
const SupervisiMap = dynamic(() => import("@/components/mbg/SupervisiMap"), {
    ssr: false,
    loading: () => (
        <div className="h-[400px] w-full rounded-2xl bg-slate-100 animate-pulse flex items-center justify-center border border-slate-200">
            <span className="text-slate-400 font-bold flex items-center gap-2">
                <span className="material-icons-round animate-spin">sync</span>
                Memuat Peta Geospasial...
            </span>
        </div>
    )
});

interface SupervisiData {
    id: string;
    created_at: string;
    puskesmas: string;
    desa: string;
    sppg_id: string;
    nama_sppg?: string;
    nama_yayasan: string;
    nama_ahli_gizi: string;
    nama_petugas_dinkes?: string;
    nama_kepala_sppg?: string;
    score_percentage: number;
    lat: number;
    lng: number;
    status: string;
    open_preferensi?: string;
    open_fortifikasi?: string;
    open_konsultasi?: string;
    open_edukasi?: string;
    open_kedaruratan?: string;
    audit_weighting?: any[];
    audit_gizi?: any[];
    q2_siklus_menu?: string;
    sasaran_penerima?: Record<string, number>;
    q1_ans?: boolean; q1_note?: string;
    q2_ans?: boolean; q2_note?: string;
    q3_ans?: boolean; q3_note?: string;
    q4_ans?: boolean; q4_note?: string;
    q5_ans?: boolean; q5_note?: string;
    q6_ans?: boolean; q6_note?: string;
    q7_ans?: boolean; q7_note?: string;
    q8_ans?: boolean; q8_note?: string;
    q9_ans?: boolean; q9_note?: string;
    q10_ans?: boolean; q10_note?: string;
    q11_ans?: boolean; q11_note?: string;
    q12_ans?: boolean; q12_note?: string;
    q13_ans?: boolean; q13_note?: string;
    q14_ans?: boolean; q14_note?: string;
    q15_ans?: boolean; q15_note?: string;
    q16_ans?: boolean; q16_note?: string;
    q17_ans?: boolean; q17_note?: string;
    q18_ans?: boolean; q18_note?: string;
    q19_ans?: boolean; q19_note?: string;
    q20_ans?: boolean; q20_note?: string;
    q21_ans?: boolean; q21_note?: string;
}

const SASARAN_PENERIMA_LIST = ["Balita", "PAUD", "SD Kelas 1-3", "SD Kelas 4-6", "SMP", "SMA", "Ibu Hamil", "Ibu Menyusui"];

const QUESTION_LABELS: Record<string, { label: string; category: string; type?: string }> = {
    q1: { label: "Tenaga Ahli Gizi memenuhi kualifikasi", category: "A. SDM & Perencanaan Menu" },
    q2: { label: "Penyusunan master menu berkala (siklus)", category: "A. SDM & Perencanaan Menu", type: "siklus" },
    q3: { label: "Menu disesuaikan per kelompok sasaran", category: "A. SDM & Perencanaan Menu" },
    q4: { label: "Koordinasi antar-tenaga gizi SPPG", category: "A. SDM & Perencanaan Menu" },
    q5: { label: "Bahan pangan wajib terfortifikasi digunakan", category: "A. SDM & Perencanaan Menu" },
    q6: { label: "Mengutamakan bahan makanan lokal", category: "A. SDM & Perencanaan Menu" },
    q7: { label: "Identifikasi alergi/fobia sasaran", category: "A. SDM & Perencanaan Menu" },
    q8: { label: "Struktur menu Gizi Seimbang (4 komponen)", category: "B. Standar Kontribusi Gizi" },
    q9: { label: "Pengolahan makan pagi max 4-6 jam sebelum saji", category: "B. Standar Kontribusi Gizi", type: "sesuai" },
    q10: { label: "Pengolahan makan siang max 4-6 jam sebelum saji", category: "B. Standar Kontribusi Gizi", type: "sesuai" },
    q11: { label: "Masakan kering/minim kuah", category: "B. Standar Kontribusi Gizi" },
    q12: { label: "SPPG memiliki Sertifikat Halal", category: "B. Standar Kontribusi Gizi" },
    q13: { label: "Memasak max 4-6 jam sebelum makan", category: "C. Food Safety & Operasional" },
    q14: { label: "QC fisik sebelum pengiriman", category: "C. Food Safety & Operasional" },
    q15: { label: "Food handler berseragam higienis", category: "C. Food Safety & Operasional" },
    q16: { label: "[KRUSIAL] Sampel makanan harian disimpan", category: "C. Food Safety & Operasional" },
    q17: { label: "Wadah foodtray stainless 5 cekungan", category: "C. Food Safety & Operasional" },
    q18: { label: "Kendaraan mobil box tertutup higienis", category: "C. Food Safety & Operasional" },
    q19: { label: "Waktu tempuh pengiriman max 20 menit", category: "D. Distribusi & Pemantauan" },
    q20: { label: "Kolaborasi bidan/kader Posyandu", category: "D. Distribusi & Pemantauan" },
    q21: { label: "Pemantauan status gizi setiap 6 bulan", category: "D. Distribusi & Pemantauan" },
};

export default function ProgramMbgPage() {
    const { user } = useAuth();
    const isSuperadmin = user?.role === "superadmin" || user?.role === "admin_dinkes";
    const isPuskesmasUser = user?.role === "admin_puskesmas";

    const [activeTab, setActiveTab] = useState<"peta_riwayat" | "analitik" | "pertumbuhan">("peta_riwayat");

    // Supervisi states
    const [data, setData] = useState<SupervisiData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    // Filter states
    const [filterPuskesmas, setFilterPuskesmas] = useState<string>("");
    const [filterDesa, setFilterDesa] = useState<string>("");
    const [puskesmasOptions, setPuskesmasOptions] = useState<{ id: string; name: string }[]>([]);
    const [desaOptions, setDesaOptions] = useState<{ id: string; name: string; puskesmas_name: string }[]>([]);
    const [filteredDesaOptions, setFilteredDesaOptions] = useState<{ id: string; name: string }[]>([]);
    const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);

    // Modal states
    const [modalState, setModalState] = useState<{ isOpen: boolean; type: "view" | "edit" | null; id: string | null }>({
        isOpen: false,
        type: null,
        id: null
    });
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [editForm, setEditForm] = useState<Partial<SupervisiData>>({});

    // Fetch initial metadata and data
    const fetchInitial = useCallback(async () => {
        setIsLoading(true);
        setError("");
        try {
            // Fetch puskesmas and desa refs
            const resRefs = await fetch("/api/mbg/refs");
            const resData = await resRefs.json();
            let pOptions: { id: string; name: string }[] = [];
            if (resData.success) {
                const pData = resData.data.puskesmas;
                const dData = resData.data.desa;
                pOptions = pData ? pData.map((p: any) => ({ id: p.id, name: p.nama })) : [];
                setPuskesmasOptions(pOptions);
                if (dData) {
                    setDesaOptions(dData.map((d: any) => ({ id: d.id, name: d.desa_kel, puskesmas_name: d.puskesmas })));
                }
            }

            // If admin_puskesmas, match and set filter
            let resolvedPkm: string | null = null;
            if (isPuskesmasUser && user?.puskesmas_id) {
                const { data: pkmData } = await supabase
                    .from("ref_puskesmas")
                    .select("nama")
                    .eq("id", user.puskesmas_id)
                    .single();
                if (pkmData?.nama) {
                    resolvedPkm = pkmData.nama;
                    setFilterPuskesmas(pkmData.nama);
                }
            }

            // Fetch distinct periods for Subtab 3
            const { data: periodData } = await supabase.rpc("get_distinct_periods");
            if (periodData) {
                const periods = periodData.map((p: any) => p.periode).filter(Boolean).sort().reverse();
                setAvailablePeriods(periods);
            }

            // Fetch supervisi reports
            let url = "/api/mbg/supervisi?limit=100";
            if (isPuskesmasUser && resolvedPkm) {
                url += `&role=admin_puskesmas&puskesmas=${encodeURIComponent(resolvedPkm)}`;
            }
            const resSup = await fetch(url);
            const supResult = await resSup.json();
            if (supResult.success) {
                setData(supResult.data);
            }
        } catch (err: any) {
            console.error("Failed to load MBG data:", err);
            setError(err.message || "Gagal memuat data");
        } finally {
            setIsLoading(false);
        }
    }, [isPuskesmasUser, user?.puskesmas_id]);

    useEffect(() => {
        fetchInitial();
    }, [fetchInitial]);

    const handleRefresh = useCallback(async () => {
        await fetchInitial();
    }, [fetchInitial]);

    // Handle filter puskesmas changing
    useEffect(() => {
        if (filterPuskesmas) {
            setFilteredDesaOptions(desaOptions.filter(d => d.puskesmas_name === filterPuskesmas));
            if (!desaOptions.find(d => d.puskesmas_name === filterPuskesmas && d.name === filterDesa)) {
                setFilterDesa("");
            }
        } else {
            setFilteredDesaOptions(desaOptions);
        }
    }, [filterPuskesmas, desaOptions, filterDesa]);

    const handleDelete = async (id: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus data supervisi ini? Tindakan ini tidak dapat dibatalkan.")) return;
        try {
            const res = await fetch(`/api/mbg/supervisi/${id}`, { method: "DELETE" });
            if (res.ok) {
                setData(prev => prev.filter(d => d.id !== id));
                alert("Data berhasil dihapus.");
            } else {
                alert("Gagal menghapus data. Silakan coba lagi.");
            }
        } catch {
            alert("Gagal menghapus data.");
        }
    };

    const openEditModal = (item: SupervisiData) => {
        setEditForm({ ...item });
        setModalState({ isOpen: true, type: "edit", id: item.id });
    };

    const handleSaveEdit = async () => {
        if (!modalState.id) return;
        setIsSavingEdit(true);
        try {
            const payload = {
                ...editForm,
                audit_gizi: editForm.audit_weighting
            };

            const res = await fetch(`/api/mbg/supervisi/${modalState.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                throw new Error(errData?.error || "Gagal menyimpan.");
            }
            const updated = await res.json();
            if (updated.success && updated.data) {
                setData(prev => prev.map(d => d.id === modalState.id ? { ...d, ...updated.data } : d));
            }
            setModalState({ isOpen: false, type: null, id: null });
            alert("Data berhasil diperbarui!");
        } catch (e: any) {
            alert("Gagal menyimpan perubahan: " + e.message);
        } finally {
            setIsSavingEdit(false);
        }
    };

    // Filter Data for Subtab 1 & 2
    const filteredData = data.filter(d => {
        if (filterPuskesmas && d.puskesmas !== filterPuskesmas) return false;
        if (filterDesa && d.desa !== filterDesa) return false;
        return true;
    });

    const totalSppg = filteredData.length;
    const avgScore = totalSppg > 0 ? filteredData.reduce((acc, curr) => acc + (Number(curr.score_percentage) || 0), 0) / totalSppg : 0;
    const excellentCount = filteredData.filter(d => Number(d.score_percentage) >= 95).length;
    const warningCount = filteredData.filter(d => Number(d.score_percentage) < 90).length;

    return (
        <div className="space-y-6">
            {/* Top Page Header */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-200">
                            <span className="material-icons-round text-2xl">restaurant_menu</span>
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                Program <span className="text-amber-600">MBG</span>
                            </h1>
                            <p className="text-xs font-bold uppercase tracking-wider text-amber-600 font-mono">
                                SIGMA RCS &bull; Evaluasi & Pemantauan Makan Bergizi Gratis
                            </p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 max-w-2xl mt-2">
                        Platform monitoring terpadu pelaksanaan Makan Bergizi Gratis (MBG), mencakup supervisi SPPG lapangan, analitik kepatuhan gizi & food safety, serta evaluasi saintifik kausalitas pertumbuhan balita e-PPGBM.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
                        <span>Muat Ulang</span>
                    </button>
                    <Link
                        href="/mbg/supervisi/form"
                        className="px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-amber-200 transition-all hover:-translate-y-0.5"
                    >
                        <span className="material-icons-round text-lg">add</span>
                        Buat Laporan Supervisi
                    </Link>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
                    <span className="material-icons-round">error</span>
                    <p className="text-sm font-bold">{error}</p>
                </div>
            )}

            {/* Subtab Navigation Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                        onClick={() => setActiveTab("peta_riwayat")}
                        className={`py-3 px-4 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${
                            activeTab === "peta_riwayat"
                                ? "bg-amber-500 text-white shadow-md shadow-amber-200"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                    >
                        <span className="material-icons-round text-lg">map</span>
                        Peta & Riwayat Supervisi
                    </button>

                    <button
                        onClick={() => setActiveTab("analitik")}
                        className={`py-3 px-4 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${
                            activeTab === "analitik"
                                ? "bg-amber-500 text-white shadow-md shadow-amber-200"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                    >
                        <span className="material-icons-round text-lg">analytics</span>
                        Analisis Data Kualitatif & Kuantitatif
                    </button>

                    <button
                        onClick={() => setActiveTab("pertumbuhan")}
                        className={`py-3 px-4 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${
                            activeTab === "pertumbuhan"
                                ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                    >
                        <span className="material-icons-round text-lg">query_stats</span>
                        Analisis Pertumbuhan MBG
                    </button>
                </div>
            </div>

            {/* ─── TAB 3: ANALISIS PERTUMBUHAN MBG ─── */}
            {activeTab === "pertumbuhan" ? (
                <AnalisisPertumbuhanMbgTab
                    userRole={user?.role || "user"}
                    userPuskesmasName={isPuskesmasUser && filterPuskesmas ? filterPuskesmas : null}
                    availablePeriods={availablePeriods}
                    availablePuskesmas={puskesmasOptions}
                />
            ) : (
                <>
                    {/* Filters for Subtab 1 & 2 */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase font-mono">
                                Filter Puskesmas {isPuskesmasUser && "(Terkunci)"}
                            </label>
                            <select
                                value={filterPuskesmas}
                                onChange={(e) => setFilterPuskesmas(e.target.value)}
                                disabled={isPuskesmasUser}
                                className="w-full rounded-xl border border-slate-200 shadow-sm bg-slate-50 px-4 py-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm font-medium disabled:bg-slate-100 disabled:text-slate-500"
                            >
                                {!isPuskesmasUser && <option value="">Semua Puskesmas</option>}
                                {puskesmasOptions.map((p) => (
                                    <option key={p.id} value={p.name}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase font-mono">
                                Filter Desa/Kelurahan
                            </label>
                            <select
                                value={filterDesa}
                                onChange={(e) => setFilterDesa(e.target.value)}
                                disabled={!filterPuskesmas && isSuperadmin}
                                className="w-full rounded-xl border border-slate-200 shadow-sm bg-slate-50 px-4 py-2.5 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm font-medium disabled:bg-slate-100 disabled:text-slate-400"
                            >
                                <option value="">Semua Desa</option>
                                {filteredDesaOptions.map((d) => (
                                    <option key={d.id} value={d.name}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* ─── TAB 2: ANALISIS KUALITATIF & KUANTITATIF ─── */}
                    {activeTab === "analitik" ? (
                        <MbgAnalyticalDashboard data={filteredData} isLoading={isLoading} />
                    ) : (
                        /* ─── TAB 1: PETA & RIWAYAT SUPERVISI ─── */
                        <>
                            {/* KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                        <span className="material-icons-round text-6xl text-amber-500">storefront</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 relative z-10 font-mono">
                                        Total SPPG Tersupervisi
                                    </p>
                                    <p className="text-4xl font-black text-slate-900 relative z-10">
                                        {isLoading ? <span className="animate-pulse text-slate-300">...</span> : totalSppg}
                                    </p>
                                </div>

                                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                        <span className="material-icons-round text-6xl text-emerald-500">fact_check</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 relative z-10 font-mono">
                                        Rata-rata Kesesuaian
                                    </p>
                                    <p className="text-4xl font-black text-emerald-600 relative z-10">
                                        {isLoading ? <span className="animate-pulse text-emerald-200">...</span> : `${avgScore.toFixed(1)}%`}
                                    </p>
                                </div>

                                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                        <span className="material-icons-round text-6xl text-blue-500">verified</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 relative z-10 font-mono">
                                        Sangat Sesuai (&ge;95%)
                                    </p>
                                    <p className="text-4xl font-black text-blue-600 relative z-10">
                                        {isLoading ? <span className="animate-pulse text-blue-200">...</span> : excellentCount}
                                    </p>
                                </div>

                                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                        <span className="material-icons-round text-6xl text-red-500">warning</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 relative z-10 font-mono">
                                        Perlu Perhatian (&lt;90%)
                                    </p>
                                    <p className="text-4xl font-black text-red-500 relative z-10">
                                        {isLoading ? <span className="animate-pulse text-red-200">...</span> : warningCount}
                                    </p>
                                </div>
                            </div>

                            {/* Rekapitulasi Penerima Sasaran MBG */}
                            {(() => {
                                const totals: Record<string, number> = {};
                                filteredData.forEach((d) => {
                                    if (d.sasaran_penerima && typeof d.sasaran_penerima === "object") {
                                        Object.entries(d.sasaran_penerima).forEach(([k, v]) => {
                                            totals[k] = (totals[k] || 0) + (Number(v) || 0);
                                        });
                                    }
                                });
                                const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);
                                const groups = [
                                    { label: "Total Balita", keys: ["Balita"], icon: "child_care", color: "text-pink-600", bg: "bg-pink-50", border: "border-pink-100" },
                                    { label: "Total PAUD", keys: ["PAUD"], icon: "school", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
                                    { label: "Total SD", keys: ["SD Kelas 1-3", "SD Kelas 4-6"], icon: "menu_book", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
                                    { label: "Total SMP+SMA", keys: ["SMP", "SMA"], icon: "school", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
                                    { label: "Ibu Hamil & Menyusui", keys: ["Ibu Hamil", "Ibu Menyusui"], icon: "pregnant_woman", color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
                                    { label: "Grand Total Penerima", keys: SASARAN_PENERIMA_LIST, icon: "groups", color: "text-white", bg: "bg-gradient-to-br from-emerald-500 to-teal-600", border: "border-emerald-200", isGrand: true },
                                ];

                                return (
                                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                                                <span className="material-icons-round text-blue-600 text-lg">group</span>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800">Rekapitulasi Penerima Sasaran MBG</h3>
                                                <p className="text-xs text-slate-400">Total penerima berdasarkan kelompok sasaran dari seluruh SPPG tersupervisi</p>
                                            </div>
                                        </div>
                                        {isLoading ? (
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                                {[...Array(6)].map((_, i) => (
                                                    <div key={i} className="rounded-2xl p-4 border border-slate-100 bg-slate-50 animate-pulse h-20" />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                                {groups.map((g: any) => {
                                                    const val = g.isGrand ? grandTotal : g.keys.reduce((s: number, k: string) => s + (totals[k] || 0), 0);
                                                    return (
                                                        <div key={g.label} className={`rounded-2xl p-4 border relative overflow-hidden ${g.border} ${g.isGrand ? g.bg : "bg-white"}`}>
                                                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                                                <span className={`material-icons-round text-5xl ${g.isGrand ? "text-white" : g.color}`}>{g.icon}</span>
                                                            </div>
                                                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 relative z-10 ${g.isGrand ? "text-white/80" : "text-slate-500"}`}>{g.label}</p>
                                                            <p className={`text-2xl font-black relative z-10 ${g.isGrand ? "text-white" : g.color}`}>{val.toLocaleString()}</p>
                                                            <p className={`text-[10px] relative z-10 ${g.isGrand ? "text-white/70" : "text-slate-400"}`}>orang</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Peta Sebaran Supervisi SPPG */}
                            <div className="bg-white rounded-3xl p-2 border border-slate-200 shadow-sm">
                                <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                                    <span className="material-icons-round text-amber-500">map</span>
                                    <h3 className="font-bold text-slate-800">Peta Sebaran Supervisi SPPG</h3>
                                </div>
                                <div className="p-2">
                                    <SupervisiMap data={filteredData} />
                                </div>
                            </div>

                            {/* Riwayat Supervisi Terbaru Table */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg">Riwayat Supervisi Terbaru</h3>
                                        <p className="text-xs text-slate-500 mt-1">Daftar laporan hasil inspeksi dari lapangan.</p>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest bg-white border-b border-slate-200">Tanggal</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest bg-white border-b border-slate-200">Kode / Nama SPPG</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest bg-white border-b border-slate-200">Puskesmas & Wilayah</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest bg-white border-b border-slate-200">Ahli Gizi Pengawas</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest bg-white border-b border-slate-200 text-center">Skor Kesesuaian</th>
                                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest bg-white border-b border-slate-200 text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {isLoading ? (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                                        <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin mb-2"></div>
                                                        <p className="font-bold text-sm">Mengambil Data Supervisi...</p>
                                                    </td>
                                                </tr>
                                            ) : filteredData.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                                                        Belum ada data supervisi yang tersimpan.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredData.map((item) => (
                                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <p className="text-sm font-bold text-slate-700">
                                                                {new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                                            </p>
                                                            <p className="text-[11px] text-slate-400">
                                                                {new Date(item.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                                                            </p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">{item.sppg_id || "-"}</span>
                                                            {item.nama_sppg && <p className="text-xs font-semibold text-slate-700 mt-0.5">{item.nama_sppg}</p>}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="text-sm font-bold text-slate-800">{item.puskesmas}</p>
                                                            <p className="text-xs text-slate-500">Desa: {item.desa}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="text-sm text-slate-700">{item.nama_ahli_gizi || "-"}</p>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {(() => {
                                                                const score = Number(item.score_percentage) || 0;
                                                                let badgeClass = "bg-slate-100 text-slate-600";
                                                                if (score >= 95) badgeClass = "bg-blue-100 text-blue-700 border border-blue-200";
                                                                else if (score >= 90) badgeClass = "bg-emerald-100 text-emerald-700 border border-emerald-200";
                                                                else badgeClass = "bg-red-100 text-red-700 border border-red-200";

                                                                return (
                                                                    <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold ${badgeClass}`}>
                                                                        {score.toFixed(1)}%
                                                                    </span>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <button
                                                                    onClick={() => setModalState({ isOpen: true, type: "view", id: item.id })}
                                                                    className="p-2 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                                                    title="Lihat Detail"
                                                                >
                                                                    <span className="material-icons-round text-lg">visibility</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => generateMbgSupervisiPDF(item)}
                                                                    className="p-2 text-purple-500 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                                                                    title="Cetak PDF"
                                                                >
                                                                    <span className="material-icons-round text-lg">print</span>
                                                                </button>
                                                                {(isSuperadmin || isPuskesmasUser) && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => openEditModal(item)}
                                                                            className="p-2 text-amber-500 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                                                                            title="Edit Data"
                                                                        >
                                                                            <span className="material-icons-round text-lg">edit</span>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDelete(item.id)}
                                                                            className="p-2 text-red-400 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                                                            title="Hapus Data"
                                                                        >
                                                                            <span className="material-icons-round text-lg">delete</span>
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}

            {/* ── VIEW MODAL ──────────────────────────────── */}
            {modalState.isOpen && modalState.type === "view" && (() => {
                const item = data.find(d => d.id === modalState.id);
                if (!item) return null;
                const categories = ["A. SDM & Perencanaan Menu", "B. Standar Kontribusi Gizi", "C. Food Safety & Operasional", "D. Distribusi & Pemantauan"];
                const catQuestions: Record<string, { id: string; label: string }[]> = {};
                categories.forEach(c => { catQuestions[c] = []; });
                Object.keys(QUESTION_LABELS).forEach(qid => {
                    const meta = QUESTION_LABELS[qid];
                    if (catQuestions[meta.category]) catQuestions[meta.category].push({ id: qid, label: meta.label });
                });
                const scoreNum = Number(item.score_percentage) || 0;
                return (
                    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-6 relative overflow-hidden">
                            <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-6 text-white relative overflow-hidden">
                                <button onClick={() => setModalState({ isOpen: false, type: null, id: null })} className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                                    <span className="material-icons-round">close</span>
                                </button>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                                            <span className="material-icons-round">assignment_turned_in</span>
                                        </div>
                                        <div>
                                            <h3 className="font-black text-lg">Detail Laporan Supervisi MBG</h3>
                                            <p className="text-xs text-white/70">SPPG: {item.sppg_id} &bull; {item.nama_sppg || item.nama_yayasan}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 pt-2 border-t border-white/20">
                                        <div><p className="text-xs text-white/70">Puskesmas</p><p className="font-bold text-sm">{item.puskesmas}</p></div>
                                        <div><p className="text-xs text-white/70">Desa</p><p className="font-bold text-sm">{item.desa}</p></div>
                                        <div>
                                            <p className="text-xs text-white/70">Skor Kesesuaian</p>
                                            <p className="font-black text-xl text-white">{scoreNum.toFixed(1)}%</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                                {categories.map(cat => {
                                    const qs = catQuestions[cat] || [];
                                    return (
                                        <div key={cat} className="space-y-2">
                                            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 font-mono">{cat}</h4>
                                            <div className="space-y-2">
                                                {qs.map(q => {
                                                    const isYes = (item as any)[`${q.id}_ans`] === true;
                                                    const note = (item as any)[`${q.id}_note`];
                                                    return (
                                                        <div key={q.id} className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${isYes ? "bg-emerald-50/50 border-emerald-100" : "bg-red-50/50 border-red-100"}`}>
                                                            <div className="flex-1">
                                                                <p className="text-xs font-semibold text-slate-800">{q.label}</p>
                                                                {note && <p className="text-[11px] text-slate-500 mt-1 italic">&ldquo;{note}&rdquo;</p>}
                                                            </div>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${isYes ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                                                                {isYes ? "Sesuai" : "Tidak Sesuai"}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                                <button
                                    onClick={() => setModalState({ isOpen: false, type: null, id: null })}
                                    className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-xs text-slate-700 transition-colors"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── EDIT MODAL ──────────────────────────────── */}
            {modalState.isOpen && modalState.type === "edit" && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                            <h3 className="font-black text-lg text-slate-900">Edit Laporan Supervisi</h3>
                            <button onClick={() => setModalState({ isOpen: false, type: null, id: null })} className="text-slate-400 hover:text-slate-600">
                                <span className="material-icons-round">close</span>
                            </button>
                        </div>
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Nama Ahli Gizi</label>
                                <input
                                    type="text"
                                    value={editForm.nama_ahli_gizi || ""}
                                    onChange={e => setEditForm({ ...editForm, nama_ahli_gizi: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Nama SPPG / Yayasan</label>
                                <input
                                    type="text"
                                    value={editForm.nama_sppg || editForm.nama_yayasan || ""}
                                    onChange={e => setEditForm({ ...editForm, nama_sppg: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Skor Kesesuaian (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={editForm.score_percentage || 0}
                                    onChange={e => setEditForm({ ...editForm, score_percentage: parseFloat(e.target.value) || 0 })}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                            <button
                                onClick={() => setModalState({ isOpen: false, type: null, id: null })}
                                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={isSavingEdit}
                                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-50"
                            >
                                {isSavingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
