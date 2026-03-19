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
                <div className="mb-8 p-6 lg:p-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl md:rounded-3xl shadow-lg relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/5 blur-3xl mix-blend-overlay"></div>
                    <div className="absolute bottom-0 left-10 -mb-20 w-48 h-48 rounded-full bg-teal-500/10 blur-2xl mix-blend-overlay"></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
                                <span className="material-icons-round text-teal-400">group_off</span>
                            </div>
                            <h3 className="text-2xl font-black text-white tracking-tight">
                                Daftar Balita Bermasalah Gizi
                            </h3>
                        </div>
                        <p className="text-slate-300 text-sm max-w-2xl leading-relaxed font-medium">
                            Rekapitulasi data spesifik balita berdasarkan klasifikasi <span className="font-bold text-teal-300">Composite Index of Anthropometric Failure (CIAF)</span>. 
                            Diperuntukkan sebagai instrumen dasar dalam merumuskan tata laksana dan intervensi gizi terpadu.
                        </p>
                    </div>
                </div>

                {/* Accordion Privasi & Keamanan Data */}
                <details className="group bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6 shadow-sm hover:shadow-md transition-shadow">
                    <summary className="flex items-center justify-between p-5 cursor-pointer font-bold text-slate-800 hover:bg-slate-50 transition-colors list-none">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                                <span className="material-icons-round text-amber-500 text-[18px]">gpp_bad</span>
                            </div>
                            <span className="tracking-wide">Informasi Keamanan dan Privasi Data Khusus</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                            <span className="material-icons-round text-slate-500 group-open:rotate-180 transition-transform">expand_more</span>
                        </div>
                    </summary>
                    <div className="p-5 md:p-6 border-t border-slate-100 bg-slate-50/50 text-sm text-slate-600 leading-relaxed space-y-4">
                        <p className="text-justify">
                            Rekapitulasi data balita bermasalah gizi ini disusun <strong>khusus untuk kepentingan intervensi gizi</strong> dalam rangka meningkatkan status gizi anak balita. Data ini bersifat konfidensial dan hanya boleh digunakan oleh otoritas yang berwenang, meliputi Dinas Kesehatan tingkat Kabupaten/Kota, Fasilitas Kesehatan Primer (Puskesmas), atau Tim Percepatan Penurunan Stunting (TPPS) yang memiliki mandat dan izin resmi.
                        </p>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm my-4">
                            <strong className="flex items-center gap-2 text-slate-800 mb-2">
                                <span className="material-icons-round text-rose-500 text-[18px]">policy</span>
                                Aspek Keamanan dan Privasi Data
                            </strong>
                            <p className="text-justify text-slate-600">
                                Penggunaan data ini diatur secara ketat berdasarkan <strong>Undang-Undang Privasi Kesehatan</strong> yang berlaku di Indonesia, termasuk didalamnya Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP). <strong>Dilarang keras menyebarluaskan, mempublikasikan, memperjualbelikan, atau menggunakan data individual balita tanpa sepengetahuan dan rekomendasi tertulis dari Dinas Kesehatan atau perizinan resmi dari Kepala Puskesmas setempat</strong>. Segala bentuk pelanggaran terhadap ketentuan integritas data ini dapat diproses untuk dikenakan sanksi administratif, gugatan perdata, maupun tuntutan pidana sesuai dengan koridor hukum yang berlaku.
                            </p>
                        </div>
                        <p>
                            <strong>Tujuan Sah Penggunaan Data:</strong>
                        </p>
                        <ul className="list-none space-y-2">
                            <li className="flex gap-2 items-start"><span className="material-icons-round text-teal-500 text-[16px] mt-0.5">check_circle</span> <span>Mengidentifikasi target sasaran balita yang memerlukan pemantauan dan intervensi gizi segera (spesifik maupun sensitif).</span></li>
                            <li className="flex gap-2 items-start"><span className="material-icons-round text-teal-500 text-[16px] mt-0.5">check_circle</span> <span>Merancang dan mengeksekusi program intervensi yang presisi, seperti penyaluran Pemberian Makanan Tambahan (PMT), rujukan faskes, edukasi gizi pola asuh untuk orang tua, atau perbaikan sanitasi.</span></li>
                            <li className="flex gap-2 items-start"><span className="material-icons-round text-teal-500 text-[16px] mt-0.5">check_circle</span> <span>Melakukan monitoring dan evaluasi terhadap tren perbaikan status gizi balita pada lokus stunting tertentu dari waktu ke waktu.</span></li>
                        </ul>
                    </div>
                </details>

                {/* Warning Card & Checkbox */}
                <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-5 md:p-6 mb-8 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-4 md:gap-5 items-start">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-200">
                            <span className="material-icons-round text-white font-bold">priority_high</span>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-extrabold text-amber-900 mb-2 truncate text-lg">Pakta Integritas Pengunduhan Data</h4>
                            <p className="text-sm text-amber-800 leading-relaxed mb-5 font-medium">
                                Tindakan mengunduh data dan informasi individu (<em>by name by address</em>) rentan terhadap penyalahgunaan, penyebaran, dan pengubahan data pribadi yang tidak sah. Setiap entitas yang menyalahgunakan data pribadi orang lain berpotensi memikul tanggung jawab secara penuh di mata hukum. Saya memahami risiko pengunduhan data ini, dan berjanji untuk menjaga data dari akses, penyebaran, serta pemanfaatan yang menyimpang dari mandat yang diberikan.
                            </p>
                            
                            <label className="flex items-start gap-4 cursor-pointer group p-3 bg-white/60 hover:bg-white rounded-xl border border-amber-200/40 transition-colors">
                                <div className="relative flex items-center justify-center mt-0.5">
                                    <input 
                                        type="checkbox" 
                                        className="peer sr-only"
                                        checked={agreed}
                                        onChange={(e) => setAgreed(e.target.checked)}
                                    />
                                    <div className={`w-6 h-6 rounded-md border-2 transition-all duration-300 shadow-sm flex items-center justify-center 
                                        ${agreed ? 'bg-amber-500 border-amber-500' : 'bg-white border-amber-300 group-hover:border-amber-400 group-hover:shadow'}`}>
                                        <span className={`material-icons-round text-[16px] text-white font-bold transition-transform duration-300 ${agreed ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>check</span>
                                    </div>
                                </div>
                                <span className={`text-sm md:text-base font-bold select-none leading-snug transition-colors duration-300
                                    ${agreed ? 'text-amber-900' : 'text-amber-700/80 group-hover:text-amber-800'}`}>
                                    Demi Tuhan dan negara, saya setuju dengan pakta integritas privasi di atas dan mengambil tanggung jawab penuh atas kerahasiaan data yang saya unduh.
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Download Grid */}
                <div className="pt-2">
                    <h4 className="font-extrabold text-slate-800 mb-6 text-lg flex items-center gap-2">
                        <span className="w-1.5 h-6 rounded-full bg-teal-500"></span>
                        Kategori CIAF (Kegagalan Antropometri)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                        {categories.map((cat) => {
                            // Extract base color name (e.g., "amber" from "bg-amber-50")
                            const baseColorMatch = cat.color.match(/bg-([a-z]+)-/);
                            const baseColor = baseColorMatch ? baseColorMatch[1] : "slate";
                            
                            return (
                            <div key={cat.id} className="relative bg-white rounded-2xl border border-slate-200/60 p-5 md:p-6 flex flex-col justify-between h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group overflow-hidden">
                                {/* Danger Level Accent Line */}
                                <div className={`absolute top-0 left-0 w-full h-1 bg-${baseColor}-400 opacity-80`}></div>
                                
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`px-3 py-1.5 rounded-lg bg-slate-100 flex items-center gap-1.5 border border-slate-200/50`}>
                                            <span className={`w-2 h-2 rounded-full bg-${baseColor}-500 shadow-sm shadow-${baseColor}-300`}></span>
                                            <span className={`text-[11px] font-black text-slate-600 tracking-wider`}>KATEGORI {cat.id}</span>
                                        </div>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-${baseColor}-50 text-${baseColor}-600 group-hover:scale-110 group-hover:bg-${baseColor}-100 transition-all duration-300`}>
                                            <span className="material-icons-round text-[20px]">analytics</span>
                                        </div>
                                    </div>
                                    <h5 className="font-extrabold text-slate-800 text-lg mb-2 leading-tight group-hover:text-slate-900 transition-colors">{cat.title}</h5>
                                    <p className="text-sm font-medium text-slate-500 leading-relaxed mb-6">{cat.desc}</p>
                                </div>
                                
                                <button
                                    onClick={() => handleDownload(cat.id, cat.title)}
                                    disabled={!agreed || downloadingCat === cat.id}
                                    className={`relative z-10 w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 overflow-hidden
                                        ${!agreed ? 'bg-slate-100/80 text-slate-400 cursor-not-allowed border border-slate-200/50' : 
                                          downloadingCat === cat.id ? `bg-${baseColor}-100 text-${baseColor}-700 cursor-wait border border-${baseColor}-200` : 
                                          `bg-white text-slate-700 hover:text-${baseColor}-700 border border-slate-200 shadow-sm hover:border-${baseColor}-300 hover:shadow-${baseColor}-100 hover:bg-${baseColor}-50/30`
                                        }`}
                                >
                                    {downloadingCat === cat.id ? (
                                        <>
                                            <span className="material-icons-round text-[18px] animate-spin">autorenew</span>
                                            Memproses Data...
                                        </>
                                    ) : (
                                        <>
                                            <span className={`material-icons-round text-[18px] ${!agreed ? 'text-slate-400' : `text-${baseColor}-500 group-hover:-translate-y-0.5 transition-transform`}`}>download</span>
                                            Unduh Excel
                                        </>
                                    )}
                                </button>
                            </div>
                        )})}
                    </div>
                </div>

            </div>
        </div>
    );
}
