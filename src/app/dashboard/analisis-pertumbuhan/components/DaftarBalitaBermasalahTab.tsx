"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

interface Filters {
    periode: string;
    kecamatan: string;
    puskesmas: string;
    kelurahan?: string;
    userRole?: string;
    userPuskesmasId?: string | null;
}

export default function DaftarBalitaBermasalahTab({ filters }: { filters: Filters }) {
    const [agreed, setAgreed] = useState(false);
    const [downloadingCat, setDownloadingCat] = useState<string | null>(null);

    const categories = [
        { id: "B", title: "Hanya Wasting", desc: "Z-Score BB/TB < -2", color: "bg-amber-50", borderColor: "border-amber-200", textColor: "text-amber-700" },
        { id: "C", title: "Wasting & Underweight", desc: "Z-Score BB/TB < -2 dan BB/U < -2", color: "bg-orange-50", borderColor: "border-orange-200", textColor: "text-orange-700" },
        { id: "D", title: "Wasting, Underweight, Stunting", desc: "Ketiga indikator < -2 (Risiko Tertinggi)", color: "bg-red-50", borderColor: "border-red-200", textColor: "text-red-700" },
        { id: "E", title: "Hanya Underweight", desc: "Z-Score BB/U < -2", color: "bg-rose-50", borderColor: "border-rose-200", textColor: "text-rose-700" },
        { id: "F", title: "Hanya Stunting", desc: "Z-Score TB/U < -2", color: "bg-fuchsia-50", borderColor: "border-fuchsia-200", textColor: "text-fuchsia-700" },
        { id: "Y", title: "Stunting & Underweight", desc: "Z-Score TB/U < -2 dan BB/U < -2", color: "bg-indigo-50", borderColor: "border-indigo-200", textColor: "text-indigo-700" },
    ];

    const handleDownload = async (categoryId: string, categoryTitle: string) => {
        if (!agreed) return;
        setDownloadingCat(categoryId);

        try {
            const { data, error } = await supabase.rpc('get_eppgbm_balita_bermasalah', {
                p_periode: filters.periode,
                p_puskesmas: filters.puskesmas,
                p_kelurahan: filters.kelurahan || "Semua",
                p_category: categoryId
            });

            if (error) {
                console.error("Error fetching data for download:", error);
                alert("Gagal mengunduh data dari server.");
                setDownloadingCat(null);
                return;
            }

            if (!data || data.length === 0) {
                alert(`Tidak ada data balita bermasalah untuk Kategori ${categoryId} pada filter ini.`);
                setDownloadingCat(null);
                return;
            }

            // Format data for Excel
            const exportData = data.map((item: any, index: number) => ({
                "No": index + 1,
                "NIK": item.nik || "-",
                "Nama Balita": item.nama_balita || "-",
                "Jenis Kelamin": item.jk === 'L' ? 'Laki-laki' : item.jk === 'P' ? 'Perempuan' : item.jk,
                "Tanggal Lahir": item.tgl_lahir || "-",
                "Nama Orang Tua": item.nama_ortu || "-",
                "Puskesmas": item.puskesmas || "-",
                "Alamat": item.alamat || "-",
                "Tanggal Ukur": item.tgl_ukur || "-",
                "Berat Badan (kg)": item.bb || "-",
                "Tinggi Badan (cm)": item.tinggi || "-",
                "ZScore BBU": item.zs_bbu || "-",
                "Klasifikasi BBU": item.bbu || "-",
                "ZScore TBU": item.zs_tbu || "-",
                "Klasifikasi TBU": item.tbu || "-",
                "ZScore BBTB": item.zs_bbtb || "-",
                "Klasifikasi BBTB": item.bbtb || "-"
            }));

            // Create Excel file
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            
            // Auto-size columns (rough approximation)
            const wscols = Object.keys(exportData[0]).map(key => ({ wch: Math.max(key.length, 15) }));
            worksheet['!cols'] = wscols;

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, `Kategori_${categoryId}`);

            // Generate filename based on filters
            const areaName = filters.kelurahan !== "Semua" ? filters.kelurahan : filters.puskesmas !== "Semua" ? filters.puskesmas : "Semua_Wilayah";
            const safeAreaName = areaName?.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const fileName = `Daftar_Balita_Bermasalah_Kategori_${categoryId}_${safeAreaName}_${filters.periode}.xlsx`;

            // Download file
            XLSX.writeFile(workbook, fileName);

        } catch (err) {
            console.error("Export error:", err);
            alert("Terjadi kesalahan saat memproses file Excel.");
        } finally {
            setDownloadingCat(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
                
                <div className="mb-6">
                    <h3 className="text-xl font-extrabold text-slate-800">
                        Unduh Daftar Balita Bermasalah Gizi
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Berdasarkan kategori Composite Index of Anthropometric Failure (CIAF). 
                        Data ini bersifat rahasia dan dikhususkan untuk keperluan intervensi gizi.
                    </p>
                </div>

                {/* Accordion Privasi & Keamanan Data */}
                <details className="group bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden mb-6">
                    <summary className="flex items-center justify-between p-4 cursor-pointer font-bold text-slate-700 hover:bg-slate-100 transition-colors list-none">
                        <div className="flex items-center gap-3">
                            <span className="material-icons-round text-amber-500">lock</span>
                            <span>Informasi Keamanan dan Privasi Data</span>
                        </div>
                        <span className="material-icons-round text-slate-400 group-open:rotate-180 transition-transform">expand_more</span>
                    </summary>
                    <div className="p-4 border-t border-slate-200 text-sm text-slate-600 leading-relaxed space-y-4">
                        <p>
                            Rekapitulasi data balita bermasalah gizi ini disusun <strong>khusus untuk kepentingan intervensi gizi</strong> dalam rangka meningkatkan status gizi anak balita. Data ini bersifat rahasia dan hanya boleh digunakan oleh pihak yang berwenang, seperti Dinas Kesehatan, Puskesmas, atau petugas gizi yang memiliki izin resmi.
                        </p>
                        <p>
                            <strong>Aspek Keamanan dan Privasi Data:</strong><br/>
                            Penggunaan data ini harus sesuai dengan ketentuan <strong>Undang-Undang Privasi Kesehatan</strong> yang berlaku di Indonesia, termasuk Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP). <strong>Dilarang menyebarluaskan, mempublikasikan, atau menggunakan data tanpa sepengetahuan dan rekomendasi Dinas Kesehatan atau perizinan resmi dari Puskesmas</strong>. Pelanggaran terhadap ketentuan ini dapat dikenakan sanksi administratif, gugatan perdata, atau pidana sesuai hukum yang berlaku.
                        </p>
                        <p>
                            <strong>Tujuan Penggunaan:</strong>
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Mengidentifikasi balita yang memerlukan intervensi gizi segera.</li>
                            <li>Merancang program intervensi yang tepat sasaran, seperti pemberian makanan tambahan, edukasi gizi untuk orang tua, atau perbaikan sanitasi.</li>
                            <li>Memantau perkembangan status gizi balita dari waktu ke waktu.</li>
                        </ul>
                    </div>
                </details>

                {/* Warning Card & Checkbox */}
                <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5 mb-8">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                            <span className="material-icons-round text-amber-600">warning</span>
                        </div>
                        <div>
                            <h4 className="font-bold text-amber-900 mb-1">Peringatan Privasi Data</h4>
                            <p className="text-sm text-amber-800 leading-relaxed mb-4">
                                Mengunduh data dan informasi individu bertaraf penggunaan, penyebaran, dan pengubahan data pribadi yang tidak sah dan tidak bertanggungjawab. Setiap orang yang menyalahgunakan data pribadi orang lain berpotensi bertanggung jawab secara hukum. Saya memahami risiko pengunduhan data, dan bertanggung jawab untuk menjaga dari akses, penyebaran, dan penggunaan data yang tidak sah terhadap data yang saya unduh.
                            </p>
                            
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <div className="relative flex items-center justify-center mt-0.5">
                                    <input 
                                        type="checkbox" 
                                        className="peer sr-only"
                                        checked={agreed}
                                        onChange={(e) => setAgreed(e.target.checked)}
                                    />
                                    <div className={`w-5 h-5 rounded border-2 transition-all ${agreed ? 'bg-amber-500 border-amber-500' : 'bg-white border-amber-300 group-hover:border-amber-400'}`}></div>
                                    <span className={`material-icons-round text-[16px] text-white absolute pointer-events-none transition-transform scale-0 peer-checked:scale-100`}>check</span>
                                </div>
                                <span className={`text-sm font-bold select-none ${agreed ? 'text-amber-900' : 'text-amber-700'}`}>
                                    Saya setuju dengan kebijakan privasi dan bertanggung jawab penuh atas penggunaan data yang saya unduh.
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Download Grid */}
                <div>
                    <h4 className="font-bold text-slate-800 mb-4">Kategori CIAF (Kegagalan Antropometri)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categories.map((cat) => (
                            <div key={cat.id} className={`${cat.color} border ${cat.borderColor} rounded-2xl p-5 flex flex-col justify-between h-full transition-all hover:shadow-md`}>
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-sm font-black ${cat.textColor}`}>KATEGORI {cat.id}</span>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cat.borderColor} border border-dashed`}>
                                            <span className={`material-icons-round text-[18px] ${cat.textColor}`}>download</span>
                                        </div>
                                    </div>
                                    <h5 className="font-bold text-slate-800 mb-1 leading-tight">{cat.title}</h5>
                                    <p className="text-xs text-slate-600 mb-4">{cat.desc}</p>
                                </div>
                                
                                <button
                                    onClick={() => handleDownload(cat.id, cat.title)}
                                    disabled={!agreed || downloadingCat === cat.id}
                                    className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all
                                        ${!agreed ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 
                                          downloadingCat === cat.id ? 'bg-cyan-100 text-cyan-600 cursor-wait' : 
                                          'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm'
                                        }`}
                                >
                                    {downloadingCat === cat.id ? (
                                        <>
                                            <span className="material-icons-round text-[16px] animate-spin">refresh</span>
                                            Memproses...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-icons-round text-[18px]">file_download</span>
                                            Unduh Excel
                                        </>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
