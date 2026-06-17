"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import MbgAnalyticalDashboard from "@/components/mbg/MbgAnalyticalDashboard";
import { supabase } from "@/lib/supabase";

// Dynamic import for Leaflet Map to prevent SSR issues
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
    nama_yayasan: string;
    nama_ahli_gizi: string;
    score_percentage: number;
    lat: number;
    lng: number;
    status: string;
    open_preferensi?: string;
    open_fortifikasi?: string;
    open_konsultasi?: string;
    open_edukasi?: string;
    open_kedaruratan?: string;
    audit_weighting?: any;
    audit_gizi?: any;
    // q1-q21 closed questions
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

const QUESTION_LABELS: Record<string, { label: string; category: string }> = {
    q1: { label: "Tenaga Ahli Gizi memenuhi kualifikasi", category: "A. SDM & Perencanaan Menu" },
    q2: { label: "Penyusunan master menu berkala mingguan", category: "A. SDM & Perencanaan Menu" },
    q3: { label: "Menu disesuaikan per kelompok sasaran", category: "A. SDM & Perencanaan Menu" },
    q4: { label: "Koordinasi antar-tenaga gizi SPPG", category: "A. SDM & Perencanaan Menu" },
    q5: { label: "Bahan pangan wajib terfortifikasi digunakan", category: "A. SDM & Perencanaan Menu" },
    q6: { label: "Mengutamakan bahan makanan lokal", category: "A. SDM & Perencanaan Menu" },
    q7: { label: "Identifikasi alergi/fobia sasaran", category: "A. SDM & Perencanaan Menu" },
    q8: { label: "Struktur menu Gizi Seimbang (4 komponen)", category: "B. Standar Kontribusi Gizi" },
    q9: { label: "Kontribusi gizi pagi 20-25% AKG", category: "B. Standar Kontribusi Gizi" },
    q10: { label: "Kontribusi gizi siang 30-35% AKG", category: "B. Standar Kontribusi Gizi" },
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

export default function DashboardSupervisi() {
    const router = useRouter();
    const [role, setRole] = useState<string | null>(null);
    const [puskesmasName, setPuskesmasName] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"peta_riwayat" | "analitik">("peta_riwayat");
    
    const [data, setData] = useState<SupervisiData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    // Filter states
    const [filterPuskesmas, setFilterPuskesmas] = useState<string>("");
    const [filterDesa, setFilterDesa] = useState<string>("");
    const [puskesmasOptions, setPuskesmasOptions] = useState<{ id: string; name: string }[]>([]);
    const [desaOptions, setDesaOptions] = useState<{ id: string; name: string; puskesmas_name: string }[]>([]);
    const [filteredDesaOptions, setFilteredDesaOptions] = useState<{ id: string; name: string }[]>([]);

    // Modal states
    const [modalState, setModalState] = useState<{ isOpen: boolean; type: "view" | "edit" | null; id: string | null }>({ isOpen: false, type: null, id: null });
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [editForm, setEditForm] = useState<Partial<SupervisiData>>({});

    useEffect(() => {
        const storedRole = localStorage.getItem("mbg_role");
        const storedPuskesmas = localStorage.getItem("mbg_puskesmas");
        if (!storedRole) {
            router.push("/mbg/supervisi/login");
        } else {
            setRole(storedRole);
            setPuskesmasName(storedPuskesmas);
            fetchRefs(storedRole, storedPuskesmas);
            fetchData(storedRole, storedPuskesmas);
        }
    }, [router]);

    const fetchRefs = async (currentRole: string, currentPuskesmas: string | null) => {
        try {
            const res = await fetch("/api/mbg/refs");
            const data = await res.json();
            if (data.success) {
                const pData = data.data.puskesmas;
                const dData = data.data.desa;
                
                let pOptions = pData ? pData.map((p: any) => ({ id: p.id, name: p.nama })) : [];
                if (pData) setPuskesmasOptions(pOptions);
                if (dData) setDesaOptions(dData.map((d: any) => ({ id: d.id, name: d.desa_kel, puskesmas_name: d.puskesmas })));

                if (currentRole === "admin_puskesmas" && currentPuskesmas) {
                    const cleanStored = currentPuskesmas.toLowerCase().replace('puskesmas', '').trim();
                    const myPuskesmas = pOptions.find((p: any) => p.name.toLowerCase().includes(cleanStored));
                    if (myPuskesmas) {
                        setFilterPuskesmas(myPuskesmas.name);
                    }
                }
            }
        } catch (e) {
            console.error("Failed to fetch refs", e);
        }
    };

    useEffect(() => {
        if (filterPuskesmas) {
            setFilteredDesaOptions(desaOptions.filter(d => d.puskesmas_name === filterPuskesmas));
            if (!desaOptions.find(d => d.puskesmas_name === filterPuskesmas && d.name === filterDesa)) {
                setFilterDesa(""); // reset if selected desa is not in new puskesmas
            }
        } else {
            setFilteredDesaOptions(desaOptions);
        }
    }, [filterPuskesmas, desaOptions]);

    const fetchData = async (currentRole: string, currentPuskesmas: string | null) => {
        try {
            let url = "/api/mbg/supervisi?limit=100";
            if (currentRole === "admin_puskesmas" && currentPuskesmas) {
                url += `&role=${currentRole}&puskesmas=${encodeURIComponent(currentPuskesmas)}`;
            }
            const res = await fetch(url);
            if (!res.ok) throw new Error("Gagal mengambil data dari server");
            const result = await res.json();
            if (result.success) {
                setData(result.data);
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("mbg_role");
        localStorage.removeItem("mbg_puskesmas");
        router.push("/mbg/supervisi/login");
    };

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
            const res = await fetch(`/api/mbg/supervisi/${modalState.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editForm)
            });
            if (!res.ok) throw new Error("Gagal menyimpan.");
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

    if (!role) return null; // Prevent flash before redirect

    // Filter Data
    const filteredData = data.filter(d => {
        if (filterPuskesmas && d.puskesmas !== filterPuskesmas) return false;
        if (filterDesa && d.desa !== filterDesa) return false;
        return true;
    });

    // Kalkulasi Statistik
    const totalSppg = filteredData.length;
    const avgScore = totalSppg > 0 ? filteredData.reduce((acc, curr) => acc + (Number(curr.score_percentage) || 0), 0) / totalSppg : 0;
    
    const excellentCount = filteredData.filter(d => Number(d.score_percentage) >= 95).length;
    const warningCount = filteredData.filter(d => Number(d.score_percentage) < 90).length;

    return (
        <div className="min-h-screen bg-slate-50 font-display">
            {/* Header */}
            <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm px-6 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-amber-200">
                            <span className="material-icons-round">restaurant_menu</span>
                        </div>
                        <div>
                            <h1 className="font-extrabold text-slate-900 text-lg leading-tight tracking-tight">Supervisi MBG</h1>
                            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">Dinas Kesehatan</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:block text-right">
                            <p className="text-sm font-bold text-slate-800">{role === 'superadmin' ? 'Superadmin Dinkes' : 'Admin Puskesmas'}</p>
                            <p className="text-xs text-slate-500">{puskesmasName || 'Kabupaten Malang'}</p>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                            title="Keluar"
                        >
                            <span className="material-icons-round text-lg">logout</span>
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard Pemantauan</h2>
                        <p className="text-slate-500 mt-1">Evaluasi pelaksanaan Makan Bergizi Gratis di {puskesmasName || 'Semua Wilayah'}.</p>
                    </div>
                    
                    <Link 
                        href="/mbg/supervisi/form"
                        className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg transition-transform hover:-translate-y-0.5"
                    >
                        <span className="material-icons-round text-sm">add</span>
                        Buat Laporan Supervisi
                    </Link>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
                        <span className="material-icons-round">error</span>
                        <p className="text-sm font-bold">{error}</p>
                    </div>
                )}

                {/* Global Filters */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-6 flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Filter Puskesmas</label>
                        <select 
                            value={filterPuskesmas} 
                            onChange={e => setFilterPuskesmas(e.target.value)}
                            disabled={role === "admin_puskesmas"}
                            className="w-full rounded-xl border border-slate-200 shadow-sm bg-slate-50 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm appearance-none disabled:text-slate-400 disabled:bg-slate-100"
                        >
                            <option value="">Semua Puskesmas</option>
                            {puskesmasOptions.map(p => (
                                <option key={p.id} value={p.name}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Filter Desa/Kelurahan</label>
                        <select 
                            value={filterDesa} 
                            onChange={e => setFilterDesa(e.target.value)}
                            disabled={!filterPuskesmas && role === "superadmin"}
                            className="w-full rounded-xl border border-slate-200 shadow-sm bg-slate-50 px-4 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm appearance-none disabled:text-slate-400 disabled:bg-slate-100"
                        >
                            <option value="">Semua Desa</option>
                            {filteredDesaOptions.map(d => (
                                <option key={d.id} value={d.name}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm mb-6">
                    <div className="flex flex-col sm:flex-row gap-1">
                        <button
                            onClick={() => setActiveTab("peta_riwayat")}
                            className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === "peta_riwayat"
                                ? "bg-amber-500 text-white shadow-lg shadow-amber-200"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                }`}
                        >
                            <span className="material-icons-round text-lg">map</span>
                            Peta & Riwayat Supervisi
                        </button>
                        <button
                            onClick={() => setActiveTab("analitik")}
                            className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === "analitik"
                                ? "bg-amber-500 text-white shadow-lg shadow-amber-200"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                }`}
                        >
                            <span className="material-icons-round text-lg">analytics</span>
                            Analitik Data Kualitatif & Kuantitatif
                        </button>
                    </div>
                </div>

                {activeTab === "analitik" ? (
                    <MbgAnalyticalDashboard data={filteredData} isLoading={isLoading} />
                ) : (
                    <>
                        {/* Statistik Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><span className="material-icons-round text-6xl text-amber-500">storefront</span></div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 relative z-10">Total SPPG Tersupervisi</p>
                                <p className="text-4xl font-black text-slate-900 relative z-10">
                                    {isLoading ? <span className="animate-pulse text-slate-300">...</span> : totalSppg}
                                </p>
                            </div>
                            
                            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><span className="material-icons-round text-6xl text-emerald-500">fact_check</span></div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 relative z-10">Rata-rata Kesesuaian</p>
                                <p className="text-4xl font-black text-emerald-600 relative z-10">
                                    {isLoading ? <span className="animate-pulse text-emerald-200">...</span> : `${avgScore.toFixed(1)}%`}
                                </p>
                            </div>

                            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><span className="material-icons-round text-6xl text-blue-500">verified</span></div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 relative z-10">Sangat Sesuai (&ge;95%)</p>
                                <p className="text-4xl font-black text-blue-600 relative z-10">
                                    {isLoading ? <span className="animate-pulse text-blue-200">...</span> : excellentCount}
                                </p>
                            </div>

                            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><span className="material-icons-round text-6xl text-red-500">warning</span></div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 relative z-10">Perlu Perhatian (&lt;90%)</p>
                                <p className="text-4xl font-black text-red-500 relative z-10">
                                    {isLoading ? <span className="animate-pulse text-red-200">...</span> : warningCount}
                                </p>
                            </div>
                        </div>

                        {/* Map Section */}
                        <div className="bg-white rounded-3xl p-2 border border-slate-200 shadow-sm mb-8">
                            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                                <span className="material-icons-round text-amber-500">map</span>
                                <h3 className="font-bold text-slate-800">Peta Sebaran Supervisi SPPG</h3>
                            </div>
                            <div className="p-2">
                                <SupervisiMap data={filteredData} />
                            </div>
                        </div>

                        {/* Data Grid Section */}
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">Riwayat Supervisi Terbaru</h3>
                                    <p className="text-xs text-slate-500 mt-1">Daftar laporan hasil inspeksi dari lapangan.</p>
                                </div>
                                <button className="px-4 py-2 text-sm font-bold text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                                    Unduh CSV
                                </button>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest bg-white border-b border-slate-200">Tanggal</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest bg-white border-b border-slate-200">ID SPPG</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest bg-white border-b border-slate-200">Puskesmas & Wilayah</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest bg-white border-b border-slate-200">Ahli Gizi Pengawas</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest bg-white border-b border-slate-200 text-center">Skor Gramasi</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest bg-white border-b border-slate-200 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                                    <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin mb-2"></div>
                                                    <p className="font-bold text-sm">Mengambil Data dari Supabase...</p>
                                                </td>
                                            </tr>
                                        ) : filteredData.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">Belum ada data supervisi yang tersimpan.</td>
                                            </tr>
                                        ) : (
                                            filteredData.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <p className="text-sm font-bold text-slate-700">
                                                            {new Date(item.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400">
                                                            {new Date(item.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} WIB
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-mono font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded">{item.sppg_id || "-"}</span>
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
                                                             <button onClick={() => setModalState({ isOpen: true, type: "view", id: item.id })} className="p-2 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors" title="Lihat Detail">
                                                                 <span className="material-icons-round text-lg">visibility</span>
                                                             </button>
                                                             <button onClick={() => openEditModal(item)} className="p-2 text-amber-500 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors" title="Edit Data">
                                                                 <span className="material-icons-round text-lg">edit</span>
                                                             </button>
                                                             <button onClick={() => handleDelete(item.id)} className="p-2 text-red-400 bg-red-50 hover:bg-red-100 rounded-lg transition-colors" title="Hapus Data">
                                                                 <span className="material-icons-round text-lg">delete</span>
                                                             </button>
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
                    const yesCount = Array.from({length: 21}, (_, i) => i + 1).filter(i => (item as any)[`q${i}_ans`] === true).length;
                    return (
                        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-6 relative overflow-hidden">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-10"><div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl"></div></div>
                                    <button onClick={() => setModalState({ isOpen: false, type: null, id: null })} className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                                        <span className="material-icons-round">close</span>
                                    </button>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                                                <span className="material-icons-round">assignment_turned_in</span>
                                            </div>
                                            <div>
                                                <h3 className="font-black text-lg">Detail Laporan Supervisi</h3>
                                                <p className="text-xs text-white/70">ID: {item.id}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div><p className="text-xs text-white/70">Puskesmas</p><p className="font-bold">{item.puskesmas}</p></div>
                                            <div><p className="text-xs text-white/70">Desa</p><p className="font-bold">{item.desa}</p></div>
                                            <div><p className="text-xs text-white/70">Skor Kesesuaian</p>
                                                <p className={`font-black text-xl ${scoreNum >= 90 ? "text-emerald-300" : scoreNum >= 75 ? "text-amber-300" : "text-red-300"}`}>{scoreNum.toFixed(1)}%</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Body */}
                                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                                    {/* Identity */}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="bg-slate-50 rounded-2xl p-4">
                                            <p className="text-xs text-slate-400 font-bold uppercase mb-1">ID SPPG</p>
                                            <p className="font-bold text-amber-700">{item.sppg_id || "-"}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-2xl p-4">
                                            <p className="text-xs text-slate-400 font-bold uppercase mb-1">Nama Yayasan</p>
                                            <p className="font-bold text-slate-800">{item.nama_yayasan || "-"}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-2xl p-4">
                                            <p className="text-xs text-slate-400 font-bold uppercase mb-1">Ahli Gizi Pengawas</p>
                                            <p className="font-bold text-slate-800">{item.nama_ahli_gizi || "-"}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-2xl p-4">
                                            <p className="text-xs text-slate-400 font-bold uppercase mb-1">Tanggal Inspeksi</p>
                                            <p className="font-bold text-slate-800">{new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                                        </div>
                                    </div>
                                    {/* Compliance Summary Bar */}
                                    <div className="bg-slate-50 rounded-2xl p-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-sm font-bold text-slate-700">Kepatuhan Kuesioner ({yesCount}/21 terpenuhi)</p>
                                            <span className={`text-sm font-black ${scoreNum >= 90 ? "text-emerald-600" : scoreNum >= 75 ? "text-amber-600" : "text-red-600"}`}>{scoreNum.toFixed(1)}%</span>
                                        </div>
                                        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-700 ${scoreNum >= 90 ? "bg-emerald-500" : scoreNum >= 75 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${scoreNum}%` }}></div>
                                        </div>
                                    </div>
                                    {/* Closed Questions by Category */}
                                    {categories.map(cat => (
                                        <div key={cat}>
                                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">{cat}</h4>
                                            <div className="space-y-2">
                                                {catQuestions[cat].map(q => {
                                                    const ans = (item as any)[`${q.id}_ans`];
                                                    const note = (item as any)[`${q.id}_note`];
                                                    const isYes = ans === true;
                                                    const isNo = ans === false;
                                                    const isNull = ans === null || ans === undefined;
                                                    return (
                                                        <div key={q.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isYes ? "bg-emerald-100" : isNo ? "bg-red-100" : "bg-slate-200"}`}>
                                                                {isYes && <span className="material-icons-round text-emerald-600 text-sm">check</span>}
                                                                {isNo && <span className="material-icons-round text-red-500 text-sm">close</span>}
                                                                {isNull && <span className="material-icons-round text-slate-400 text-sm">remove</span>}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-xs font-medium ${isYes ? "text-slate-700" : isNo ? "text-red-700" : "text-slate-400"}`}>{q.label}</p>
                                                                {note && <p className="text-xs text-slate-400 italic mt-0.5">Catatan: {note}</p>}
                                                            </div>
                                                            <span className={`text-xs font-black shrink-0 ${isYes ? "text-emerald-600" : isNo ? "text-red-500" : "text-slate-400"}`}>
                                                                {isNull ? "-" : isYes ? "YA" : "TIDAK"}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                    {/* Open Questions */}
                                    {(item.open_preferensi || item.open_fortifikasi || item.open_konsultasi || item.open_edukasi || item.open_kedaruratan) && (
                                        <div>
                                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Jawaban Kualitatif (Pertanyaan Terbuka)</h4>
                                            <div className="space-y-3">
                                                {[{key: "open_preferensi", label: "Preferensi Pangan Lokal"}, {key: "open_fortifikasi", label: "Fortifikasi Bahan"}, {key: "open_konsultasi", label: "Konsultasi Gizi"}, {key: "open_edukasi", label: "Edukasi Sasaran"}, {key: "open_kedaruratan", label: "Protokol Kedaruratan"}].map(o => {
                                                    const val = (item as any)[o.key];
                                                    if (!val) return null;
                                                    return (
                                                        <div key={o.key} className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                                                            <p className="text-xs font-bold text-amber-700 mb-1">{o.label}</p>
                                                            <p className="text-sm text-slate-700">{val}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    {/* Kuantitatif */}
                                    {Array.isArray(item.audit_weighting) && item.audit_weighting.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Evaluasi Kuantitatif (Kelompok Sasaran)</h4>
                                            <div className="space-y-3">
                                                {item.audit_weighting.map((s: any, idx: number) => (
                                                    <div key={idx} className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                                        <p className="text-sm font-bold text-blue-800 mb-2">{s.sasaran_name || `Sasaran ${idx + 1}`}</p>
                                                        {s.rows && Array.isArray(s.rows) && (
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-xs">
                                                                    <thead><tr className="border-b border-blue-200">
                                                                        <th className="text-left py-1 pr-2 text-blue-600 font-bold">Komponen</th>
                                                                        <th className="text-right py-1 px-2 text-blue-600 font-bold">Standar</th>
                                                                        <th className="text-right py-1 pl-2 text-blue-600 font-bold">FCT/Sigma</th>
                                                                    </tr></thead>
                                                                    <tbody>
                                                                        {s.rows.map((row: any, ri: number) => (
                                                                            <tr key={ri} className="border-b border-blue-100">
                                                                                <td className="py-1 pr-2 text-slate-700 font-medium">{row.komponen || "-"}</td>
                                                                                <td className="py-1 px-2 text-right text-slate-600">{row.standar || "-"}</td>
                                                                                <td className="py-1 pl-2 text-right font-bold text-slate-800">{row.sigma || row.hasil || "-"}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* Footer */}
                                <div className="p-6 border-t border-slate-100 flex justify-end">
                                    <button onClick={() => setModalState({ isOpen: false, type: null, id: null })} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Tutup</button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* ── EDIT MODAL ──────────────────────────────── */}
                {modalState.isOpen && modalState.type === "edit" && (() => {
                    const item = data.find(d => d.id === modalState.id);
                    if (!item) return null;
                    return (
                        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-6 relative overflow-hidden">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-10"><div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl"></div></div>
                                    <button onClick={() => setModalState({ isOpen: false, type: null, id: null })} className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                                        <span className="material-icons-round">close</span>
                                    </button>
                                    <div className="relative z-10 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                                            <span className="material-icons-round">edit</span>
                                        </div>
                                        <div>
                                            <h3 className="font-black text-lg">Edit Data Supervisi</h3>
                                            <p className="text-xs text-white/70">ID: {item.id}</p>
                                        </div>
                                    </div>
                                </div>
                                {/* Body */}
                                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                                    {/* Identity Fields */}
                                    <div>
                                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Identitas SPPG</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[{key:"nama_yayasan",label:"Nama Yayasan"},{key:"nama_ahli_gizi",label:"Nama Ahli Gizi"},{key:"sppg_id",label:"ID SPPG"},{key:"puskesmas",label:"Puskesmas"},{key:"desa",label:"Desa"}].map(f => (
                                                <div key={f.key}>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">{f.label}</label>
                                                    <input
                                                        type="text"
                                                        value={(editForm as any)[f.key] || ""}
                                                        onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200 transition-all"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Closed Questions Edit */}
                                    <div>
                                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Jawaban Kuesioner (A–D)</h4>
                                        <div className="space-y-2">
                                            {Object.keys(QUESTION_LABELS).map(qid => {
                                                const meta = QUESTION_LABELS[qid];
                                                const ansKey = `${qid}_ans` as keyof SupervisiData;
                                                const noteKey = `${qid}_note` as keyof SupervisiData;
                                                const currentAns = (editForm as any)[ansKey];
                                                return (
                                                    <div key={qid} className="bg-slate-50 rounded-xl p-3">
                                                        <p className="text-xs text-slate-400 font-bold mb-1.5">{qid.toUpperCase()} — {meta.label}</p>
                                                        <div className="flex gap-2 items-center">
                                                            <button onClick={() => setEditForm(p => ({...p, [ansKey]: true}))} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentAns === true ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600 hover:bg-emerald-100"}`}>YA</button>
                                                            <button onClick={() => setEditForm(p => ({...p, [ansKey]: false}))} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentAns === false ? "bg-red-500 text-white" : "bg-slate-200 text-slate-600 hover:bg-red-100"}`}>TIDAK</button>
                                                            <input
                                                                type="text"
                                                                placeholder="Catatan..."
                                                                value={(editForm as any)[noteKey] || ""}
                                                                onChange={e => setEditForm(p => ({...p, [noteKey]: e.target.value}))}
                                                                className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-amber-400"
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    {/* Open Questions Edit */}
                                    <div>
                                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Jawaban Kualitatif</h4>
                                        <div className="space-y-3">
                                            {[{key:"open_preferensi",label:"Preferensi Pangan Lokal"},{key:"open_fortifikasi",label:"Fortifikasi Bahan"},{key:"open_konsultasi",label:"Konsultasi Gizi"},{key:"open_edukasi",label:"Edukasi Sasaran"},{key:"open_kedaruratan",label:"Protokol Kedaruratan"}].map(f => (
                                                <div key={f.key}>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">{f.label}</label>
                                                    <textarea
                                                        rows={2}
                                                        value={(editForm as any)[f.key] || ""}
                                                        onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200 transition-all resize-none"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                {/* Footer */}
                                <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                                    <button onClick={() => setModalState({ isOpen: false, type: null, id: null })} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Batal</button>
                                    <button onClick={handleSaveEdit} disabled={isSavingEdit} className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-md shadow-amber-200 disabled:opacity-60 flex items-center gap-2">
                                        {isSavingEdit && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>}
                                        {isSavingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </main>
        </div>
    );
}
