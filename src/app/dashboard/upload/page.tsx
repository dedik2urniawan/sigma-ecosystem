"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "../layout";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

// ─── Types ──────────────────────────────────────────────────────────────────
interface UploadConfig {
    id: string;
    label: string;
    icon: string;
    gradient: string;
    tableName: string;
    fileName: string;
    description: string;
    columns: string[];
    ready: boolean;
}

const UPLOAD_CONFIGS: UploadConfig[] = [
    {
        id: "pelayanan-kesehatan",
        label: "Pelayanan Kesehatan",
        icon: "local_hospital",
        gradient: "from-emerald-500 to-emerald-700",
        tableName: "data_bultim",
        fileName: "data_bultim",
        description: "Data bulanan indikator pelayanan kesehatan dari SIGIZI KESGA",
        columns: [
            "Tahun", "Bulan", "Puskesmas", "data_sasaran",
            "BBSangat_Kurang", "BB_Kurang", "Berat_Badan_Normal", "Risiko_Lebih", "BB_Outlier",
            "Sangat_Pendek", "Pendek", "TB_Normal", "Tinggi", "TB_Outlier",
            "Gizi_Buruk", "Gizi_Kurang", "Normal", "Risiko_Gizi_Lebih", "Gizi_Lebih", "Obesitas", "Outlier",
            "Stunting", "Wasting", "Underweight",
            "jumlah_timbang", "jumlah_ukur", "jumlah_timbang_ukur",
        ],
        ready: true,
    },
    {
        id: "pelayanan-kesehatan-desa",
        label: "Pelayanan Kesehatan (Level Desa)",
        icon: "holiday_village",
        gradient: "from-teal-500 to-emerald-700",
        tableName: "data_bultim_desa",
        fileName: "data_bultim_desa",
        description: "Data bulanan pelayanan kesehatan level Desa/Kelurahan dari SIGIZI KESGA",
        columns: [
            "Tahun", "Bulan", "Puskesmas", "Kelurahan",
            "data_sasaran_L", "data_sasaran_P",
            "BBSangat_Kurang", "BB_Kurang", "Berat_Badan_Normal", "Risiko_Lebih", "BB_Outlier",
            "Sangat_Pendek", "Pendek", "TB_Normal", "Tinggi", "TB_Outlier",
            "Gizi_Buruk", "Gizi_Kurang", "Normal", "Risiko_Gizi_Lebih", "Gizi_Lebih", "Obesitas",
            "Stunting", "Wasting", "Underweight",
            "jumlah_timbang", "jumlah_ukur", "jumlah_timbang_ukur",
        ],
        ready: true,
    },
    {
        id: "insiden-stunting",
        label: "Analisis Insidens Stunting",
        icon: "trending_up",
        gradient: "from-orange-500 to-orange-700",
        tableName: "data_insiden_stunting",
        fileName: "insiden_stunting",
        description: "Data insiden stunting baru (Baduta vs Balita Tua)",
        columns: [
            "Tahun", "Bulan", "Puskesmas", "data_sasaran",
            "jumlah_timbang_ukur", "Stunting",
            "insiden_stunting_L", "insiden_stunting_P",
            "insiden_stunting_L_baduta", "insiden_stunting_P_baduta",
        ],
        ready: true,
    },
    {
        id: "balita-gizi",
        label: "Balita Gizi",
        icon: "child_care",
        gradient: "from-teal-500 to-teal-700",
        tableName: "data_balita_gizi",
        fileName: "data_balita_gizi",
        description: "Data indikator gizi balita",
        columns: [
            "Tahun", "Puskesmas", "Kelurahan", "Bulan",
            "Jumlah_sasaran_balita",
            "Jumlah_balita_bulan_ini",
            "Jumlah_balita_ditimbang",
            "Jumlah_balita_ditimbang_dan_diukur",
            "Jumlah_balita_diukur_PBTB",
            "Jumlah_balita_punya_KIA",
            "Jumlah_balita_naik_berat_badannya_N",
            "Jumlah_balita_tidak_naik_berat_badannya_T",
            "Jumlah_balita_tidak_ditimbang_bulan_lalu_O",
            "Jumlah_bayi_baru_lahir_bulan_ini_B",
            "Jumlah_balita_ditimbang_terkoreksi_Daksen",
            "Jumlah_balita_stunting",
            "Jumlah_balita_wasting",
            "Jumlah_balita_overweight",
            "Jumlah_balita_underweight",
            "Jumlah_Bayi_Mendapat_IMD",
            "Jumlah_Bayi_usia_0-5_bulan",
            "Jumlah_Bayi_usia_0-5_bulan_yang_direcall",
            "Jumlah_Bayi_usia_0-5_bulan_yang_mendapat_ASI_Eksklusif_berdasarkan_recall_24_jam",
            "Jumlah_Bayi_usia_6_bulan",
            "Jumlah_Bayi_Asi_Eksklusif_sampai_6_bulan",
            "Jumlah_anak_usia_6-23_bulan",
            "Jumlah_anak_usia_6-23_bulan_yang_diwawancarai",
            "Jumlah_anak_usia_6-23_bulan_yang_mengkonsumsi_makanan_dan_minuman_setidaknya_5_dari_8_jenis_kelompok_makanan_pada_hari_kemarin_sebelum_wawancara",
            "Jumlah_anak_usia_6-23_bulan_yang_mengkonsumsi_telur_ikan_dan_atau_daging_pada_hari_kemarin_sebelum_wawancara",
            "Jumlah_anak_usia_6-23_bulan_yang_mendapat_MPASI_baik",
            "Jumlah_bayi_6-11_bulan",
            "Jumlah_bayi_6-11_bulan_mendapat_Vitamin_A",
            "Jumlah_anak_12-59_bulan",
            "Jumlah_anak_12-59_bulan_mendapat_Vitamin_A",
            "Jumlah_anak_12-59_bulan_mendapat_Vitamin_A_2_kali_dalam_setahun",
            "Jumlah_balita_Underweight_suplemen",
            "Jumlah_balita_yang_mendapatkan_suplementasi_gizi_mikro",
            "Jumlah_seluruh_balita_(usia_6-59_bulan)_gizi_kurang_dengan_atau_tanpa_stunting_sampai_bulan_ini",
            "Jumlah_balita_gizi_kurang_usia_6-59_bulan_yang_mendapatkan_makanan_tambahan_berbahan_pangan_lokal_sampai_bulan_ini",
            "Jumlah_seluruh_balita_(usia_6-59_bulan)_BB_kurang_yang_tidak_wasting_dengan_atau_tanpa_stunting_dan_tanpa_wasting",
            "Jumlah_balita_BB_kurang_usia_6-59_bulan_yang_mendapatkan_makanan_tambahan_berbahan_pangan_lokal",
            "Jumlah_sasaran_balita_T",
            "Jumlah_Balita_T659_mendapatkan_PMT",
            "Jumlah_kasus_gizi_buruk_bayi_0-5_Bulan_sampai_bulan_ini",
            "Jumlah_Kasus_Gizi_Buruk_bayi_0-5_Bulan_mendapat_perawatan_sampai_bulan_ini",
            "Jumlah_kasus_gizi_buruk_Balita_6-59_Bulan_sampai_bulan_ini",
            "Jumlah_Kasus_Gizi_Buruk_Balita_6-59_Bulan_mendapat_perawatan_sampai_bulan_ini",
            "Jumlah_balita_stunting_sampai_bulan_ini",
            "Jumlah_balita_stunting_dirujuk_Puskesmas_ke_RS_sampai_bulan_ini"
        ],
        ready: true,
    },
    {
        id: "analisis-pertumbuhan",
        label: "Analisis Pertumbuhan (EPPGBM)",
        icon: "query_stats",
        gradient: "from-cyan-500 to-cyan-700",
        tableName: "data_eppgbm",
        fileName: "data_eppgbm",
        description: "Data analisis pertumbuhan EPPGBM",
        columns: [],
        ready: false,
    },
    {
        id: "balita-kia",
        label: "Balita KIA",
        icon: "favorite",
        gradient: "from-rose-500 to-rose-700",
        tableName: "data_balita_kia",
        fileName: "data_balita_kia",
        description: "Data indikator kesehatan ibu dan anak",
        columns: [],
        ready: false,
    },
    {
        id: "ibu-hamil",
        label: "Ibu Hamil",
        icon: "pregnant_woman",
        gradient: "from-purple-500 to-purple-700",
        tableName: "data_ibu_hamil",
        fileName: "data_ibu_hamil",
        description: "Data indikator ibu hamil",
        columns: [],
        ready: false,
    },
    {
        id: "remaja-putri",
        label: "Remaja Putri",
        icon: "girl",
        gradient: "from-pink-500 to-pink-700",
        tableName: "data_remaja_putri",
        fileName: "data_remaja_putri",
        description: "Data indikator kesehatan remaja putri",
        columns: [],
        ready: false,
    },
];

// ─── Column mapping from Excel headers to DB columns ────────────────────────
const COLUMN_MAP: Record<string, string> = {
    tahun: "tahun",
    bulan: "bulan",
    puskesmas: "puskesmas",
    data_sasaran: "data_sasaran",
    kelurahan: "kelurahan",
    data_sasaran_l: "data_sasaran_l",
    data_sasaran_p: "data_sasaran_p",
    bbsangat_kurang: "bb_sangat_kurang",
    bb_kurang: "bb_kurang",
    berat_badan_normal: "berat_badan_normal",
    risiko_lebih: "risiko_lebih",
    bb_outlier: "bb_outlier",
    sangat_pendek: "sangat_pendek",
    pendek: "pendek",
    tb_normal: "tb_normal",
    tinggi: "tinggi",
    tb_outlier: "tb_outlier",
    gizi_buruk: "gizi_buruk",
    gizi_kurang: "gizi_kurang",
    normal: "normal",
    risiko_gizi_lebih: "risiko_gizi_lebih",
    gizi_lebih: "gizi_lebih",
    obesitas: "obesitas",
    outlier: "outlier",
    stunting: "stunting",
    wasting: "wasting",
    underweight: "underweight",
    jumlah_timbang: "jumlah_timbang",
    jumlah_ukur: "jumlah_ukur",
    jumlah_timbang_ukur: "jumlah_timbang_ukur",
    // Insiden Stunting Mappings
    insiden_stunting_l: "insiden_l",
    insiden_stunting_p: "insiden_p",
    insiden_stunting_l_baduta: "insiden_l_baduta",
    insiden_stunting_p_baduta: "insiden_p_baduta",
    // Data Balita Gizi
    jumlah_sasaran_balita: "jumlah_sasaran_balita",
    jumlah_balita_bulan_ini: "jumlah_balita_bulan_ini",
    jumlah_balita_ditimbang: "jumlah_balita_ditimbang",
    jumlah_balita_ditimbang_dan_diukur: "jumlah_balita_ditimbang_dan_diukur",
    jumlah_balita_diukur_pbtb: "jumlah_balita_diukur_pbtb",
    jumlah_balita_punya_kia: "jumlah_balita_punya_kia",
    jumlah_balita_naik_berat_badannya_n: "jumlah_balita_naik_berat_badannya_n",
    jumlah_balita_tidak_naik_berat_badannya_t: "jumlah_balita_tidak_naik_berat_badannya_t",
    jumlah_balita_tidak_ditimbang_bulan_lalu_o: "jumlah_balita_tidak_ditimbang_bulan_lalu_o",
    jumlah_bayi_baru_lahir_bulan_ini_b: "jumlah_bayi_baru_lahir_bulan_ini_b",
    jumlah_balita_ditimbang_terkoreksi_daksen: "jumlah_balita_ditimbang_terkoreksi_daksen",
    jumlah_balita_stunting: "jumlah_balita_stunting",
    jumlah_balita_wasting: "jumlah_balita_wasting",
    jumlah_balita_overweight: "jumlah_balita_overweight",
    jumlah_balita_underweight: "jumlah_balita_underweight",
    jumlah_bayi_mendapat_imd: "jumlah_bayi_mendapat_imd",
    "jumlah_bayi_usia_0-5_bulan": "jumlah_bayi_usia_0_5_bulan",
    "jumlah_bayi_usia_0-5_bulan_yang_direcall": "jumlah_bayi_usia_0_5_bulan_yang_direcall",
    "jumlah_bayi_usia_0-5_bulan_yang_mendapat_asi_eksklusif_berdasarkan_recall_24_jam": "jumlah_bayi_usia_0_5_bulan_yang_mendapat_asi_eksklusif_berdasar",
    "jumlah_bayi_usia_6_bulan": "jumlah_bayi_usia_6_bulan",
    "jumlah_bayi_asi_eksklusif_sampai_6_bulan": "jumlah_bayi_asi_eksklusif_sampai_6_bulan",
    "jumlah_anak_usia_6-23_bulan": "jumlah_anak_usia_6_23_bulan",
    "jumlah_anak_usia_6-23_bulan_yang_diwawancarai": "jumlah_anak_usia_6_23_bulan_yang_diwawancarai",
    "jumlah_anak_usia_6-23_bulan_yang_mengkonsumsi_makanan_dan_minuman_setidaknya_5_dari_8_jenis_kelompok_makanan_pada_hari_kemarin_sebelum_wawancara": "jumlah_anak_usia_6_23_bulan_yang_mengkonsumsi_makanan_dan_minum",
    "jumlah_anak_usia_6-23_bulan_yang_mengkonsumsi_telur_ikan_dan_atau_daging_pada_hari_kemarin_sebelum_wawancara": "jumlah_anak_usia_6_23_bulan_yang_mengkonsumsi_telur_ikan_dan_at",
    "jumlah_anak_usia_6-23_bulan_yang_mendapat_mpasi_baik": "jumlah_anak_usia_6_23_bulan_yang_mendapat_mpasi_baik",
    "jumlah_bayi_6-11_bulan": "jumlah_bayi_6_11_bulan",
    "jumlah_bayi_6-11_bulan_mendapat_vitamin_a": "jumlah_bayi_6_11_bulan_mendapat_vitamin_a",
    "jumlah_anak_12-59_bulan": "jumlah_anak_12_59_bulan",
    "jumlah_anak_12-59_bulan_mendapat_vitamin_a": "jumlah_anak_12_59_bulan_mendapat_vitamin_a",
    "jumlah_anak_12-59_bulan_mendapat_vitamin_a_2_kali_dalam_setahun": "jumlah_anak_12_59_bulan_mendapat_vitamin_a_2_kali_dalam_setahun",
    "jumlah_balita_underweight_suplemen": "jumlah_balita_underweight_suplemen",
    "jumlah_balita_yang_mendapatkan_suplementasi_gizi_mikro": "jumlah_balita_yang_mendapatkan_suplementasi_gizi_mikro",
    "jumlah_seluruh_balita_(usia_6-59_bulan)_gizi_kurang_dengan_atau_tanpa_stunting_sampai_bulan_ini": "jumlah_seluruh_balita_usia_6_59_bulan_gizi_kurang_dengan_atau_t",
    "jumlah_balita_gizi_kurang_usia_6-59_bulan_yang_mendapatkan_makanan_tambahan_berbahan_pangan_lokal_sampai_bulan_ini": "jumlah_balita_gizi_kurang_usia_6_59_bulan_yang_mendapatkan_maka",
    "jumlah_seluruh_balita_(usia_6-59_bulan)_bb_kurang_yang_tidak_wasting_dengan_atau_tanpa_stunting_dan_tanpa_wasting": "jumlah_seluruh_balita_usia_6_59_bulan_bb_kurang_yang_tidak_wast",
    "jumlah_balita_bb_kurang_usia_6-59_bulan_yang_mendapatkan_makanan_tambahan_berbahan_pangan_lokal": "jumlah_balita_bb_kurang_usia_6_59_bulan_yang_mendapatkan_makana",
    "jumlah_sasaran_balita_t": "jumlah_sasaran_balita_t",
    "jumlah_balita_t659_mendapatkan_pmt": "jumlah_balita_t659_mendapatkan_pmt",
    "jumlah_kasus_gizi_buruk_bayi_0-5_bulan_sampai_bulan_ini": "jumlah_kasus_gizi_buruk_bayi_0_5_bulan_sampai_bulan_ini",
    "jumlah_kasus_gizi_buruk_bayi_0-5_bulan_mendapat_perawatan_sampai_bulan_ini": "jumlah_kasus_gizi_buruk_bayi_0_5_bulan_mendapat_perawatan_sampa",
    "jumlah_kasus_gizi_buruk_balita_6-59_bulan_sampai_bulan_ini": "jumlah_kasus_gizi_buruk_balita_6_59_bulan_sampai_bulan_ini",
    "jumlah_kasus_gizi_buruk_balita_6-59_bulan_mendapat_perawatan_sampai_bulan_ini": "jumlah_kasus_gizi_buruk_balita_6_59_bulan_mendapat_perawatan_sa",
    "jumlah_balita_stunting_sampai_bulan_ini": "jumlah_balita_stunting_sampai_bulan_ini",
    "jumlah_balita_stunting_dirujuk_puskesmas_ke_rs_sampai_bulan_ini": "jumlah_balita_stunting_dirujuk_puskesmas_ke_rs_sampai_bulan_ini",
};

export default function UploadPage() {
    const { user } = useAuth();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedConfig, setSelectedConfig] = useState<UploadConfig | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
    const [previewData, setPreviewData] = useState<Record<string, unknown>[] | null>(null);
    const [fullParsedData, setFullParsedData] = useState<Record<string, unknown>[] | null>(null);
    const [fileName, setFileName] = useState<string>("");

    useEffect(() => {
        if (user && user.role !== "superadmin") {
            router.push("/dashboard");
        }
    }, [user, router]);

    if (!user || user.role !== "superadmin") {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <span className="material-icons-round text-6xl text-red-300 mb-4 block">block</span>
                    <h2 className="text-xl font-bold text-slate-700 mb-2">Akses Ditolak</h2>
                    <p className="text-sm text-slate-500">Hanya superadmin yang dapat mengakses halaman ini.</p>
                </div>
            </div>
        );
    }

    const handleDownloadTemplate = (config: UploadConfig) => {
        const ws = XLSX.utils.aoa_to_sheet([
            ["No", ...config.columns],
            [1, "", "", "", ...Array(config.columns.length - 3).fill(0)],
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");

        // Set column widths
        ws["!cols"] = config.columns.map(() => ({ wch: 18 }));

        XLSX.writeFile(wb, `template_${config.fileName}.xlsx`);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, config: UploadConfig) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setUploadResult(null);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

            if (jsonData.length === 0) {
                setUploadResult({ success: false, message: "File kosong atau format tidak sesuai." });
                return;
            }

            // Store full data in state so we don't need to re-read
            setFullParsedData(jsonData);
            setPreviewData(jsonData.slice(0, 5));
            setSelectedConfig(config);
        } catch {
            setUploadResult({ success: false, message: "Gagal membaca file. Pastikan format Excel (.xlsx) yang benar." });
        }

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleUpload = async () => {
        if (!fullParsedData || !selectedConfig) return;

        setUploading(true);
        setUploadResult(null);

        try {
            // Map columns and prepare rows
            const rows = fullParsedData.map((row) => {
                const mapped: Record<string, unknown> = {};

                Object.entries(row).forEach(([key, value]) => {
                    const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, "_");
                    const dbCol = COLUMN_MAP[normalizedKey];
                    if (dbCol) {
                        if (dbCol === "puskesmas" || dbCol === "kelurahan") {
                            mapped[dbCol] = String(value).trim();
                        } else if (dbCol === "tahun" || dbCol === "bulan") {
                            mapped[dbCol] = Number(value);
                        } else {
                            mapped[dbCol] = Number(value) || 0;
                        }
                    }
                });

                mapped["uploaded_by"] = user.id;
                mapped["uploaded_at"] = new Date().toISOString();

                return mapped;
            });

            // Filter out rows that don't have required fields
            const isDesa = selectedConfig.tableName === "data_bultim_desa" || selectedConfig.tableName === "data_balita_gizi";
            const validRows = rows.filter((r) => r.puskesmas && r.tahun && r.bulan && (!isDesa || r.kelurahan));

            if (validRows.length === 0) {
                setUploadResult({
                    success: false,
                    message: "Tidak ada baris valid. Pastikan kolom Tahun, Bulan, dan Puskesmas terisi.",
                });
                setUploading(false);
                return;
            }

            // ─── FULL REPLACE strategy ──────────────────────────
            // Delete ALL existing rows for each tahun+bulan period
            // found in the uploaded file, then insert the new data.
            // This ensures SIGIZI KESGA data is always a clean snapshot.
            const periods = new Set(validRows.map((r) => `${r.tahun}-${r.bulan}`));

            for (const period of periods) {
                const [tahun, bulan] = period.split("-").map(Number);

                // Delete ALL rows for this tahun+bulan (full replace)
                const { error: delError } = await supabase
                    .from(selectedConfig.tableName)
                    .delete()
                    .eq("tahun", tahun)
                    .eq("bulan", bulan);

                if (delError) {
                    setUploadResult({
                        success: false,
                        message: `Gagal menghapus data lama periode ${bulan}/${tahun}: ${delError.message}`,
                    });
                    setUploading(false);
                    return;
                }
            }

            // Insert new data
            const { error } = await supabase.from(selectedConfig.tableName).insert(validRows);

            if (error) {
                setUploadResult({
                    success: false,
                    message: `Error upload: ${error.message}`,
                });
            } else {
                const periodList = Array.from(periods)
                    .map((p) => {
                        const [t, b] = p.split("-");
                        const bulanNames = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
                        return `${bulanNames[Number(b)]} ${t}`;
                    })
                    .join(", ");

                setUploadResult({
                    success: true,
                    message: `Berhasil replace ${validRows.length} baris data ${selectedConfig.label} untuk periode: ${periodList}`,
                    count: validRows.length,
                });
                setPreviewData(null);
                setFullParsedData(null);
            }
        } catch (err) {
            setUploadResult({
                success: false,
                message: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-200">
                        <span className="material-icons-round text-white text-xl">cloud_upload</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                            Upload Data
                        </h1>
                        <p className="text-xs text-slate-400 font-mono uppercase tracking-widest">
                            Superadmin Only
                        </p>
                    </div>
                </div>
            </div>

            {/* Instructions */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6">
                <div className="flex items-start gap-3">
                    <span className="material-icons-round text-blue-600 text-xl mt-0.5 shrink-0">menu_book</span>
                    <div>
                        <h3 className="text-sm font-bold text-blue-900 mb-3">Panduan Upload Data</h3>
                        <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                            <li>
                                Pilih indikator yang akan diupload dari daftar di bawah.
                            </li>
                            <li>
                                Download <strong>template Excel</strong> untuk memastikan format kolom sesuai.
                            </li>
                            <li>
                                Isi data pada template sesuai dengan data dari <strong>SIGIZI KESGA</strong>.
                            </li>
                            <li>
                                Upload file Excel (.xlsx) yang sudah terisi data.
                            </li>
                            <li>
                                Preview data dan konfirmasi upload. Data pada <strong>periode yang sama (Tahun + Bulan)</strong> akan <strong>otomatis di-replace seluruhnya</strong> dengan data baru.
                            </li>
                        </ol>
                    </div>
                </div>
            </div>

            {/* Upload Result */}
            {uploadResult && (
                <div className={`p-5 rounded-2xl border flex items-start gap-3 ${uploadResult.success
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-red-50 border-red-200"
                    }`}>
                    <span className={`material-icons-round text-xl mt-0.5 shrink-0 ${uploadResult.success ? "text-emerald-600" : "text-red-600"
                        }`}>
                        {uploadResult.success ? "check_circle" : "error"}
                    </span>
                    <div>
                        <p className={`text-sm font-semibold ${uploadResult.success ? "text-emerald-800" : "text-red-800"}`}>
                            {uploadResult.success ? "Upload Berhasil!" : "Upload Gagal"}
                        </p>
                        <p className={`text-xs mt-0.5 ${uploadResult.success ? "text-emerald-600" : "text-red-600"}`}>
                            {uploadResult.message}
                        </p>
                    </div>
                    <button
                        onClick={() => setUploadResult(null)}
                        className={`ml-auto shrink-0 ${uploadResult.success ? "text-emerald-400 hover:text-emerald-600" : "text-red-400 hover:text-red-600"}`}
                    >
                        <span className="material-icons-round text-lg">close</span>
                    </button>
                </div>
            )}

            {/* Preview Modal */}
            {previewData && selectedConfig && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Preview Data Upload</h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {selectedConfig.label} • {fileName} • Menampilkan 5 baris pertama
                            </p>
                        </div>
                        <button
                            onClick={() => { setPreviewData(null); setSelectedConfig(null); }}
                            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"
                        >
                            <span className="material-icons-round">close</span>
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 mb-4">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-slate-50">
                                    {Object.keys(previewData[0]).slice(0, 10).map((key) => (
                                        <th key={key} className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                            {key}
                                        </th>
                                    ))}
                                    {Object.keys(previewData[0]).length > 10 && (
                                        <th className="px-3 py-2 text-left font-bold text-slate-400">
                                            ...+{Object.keys(previewData[0]).length - 10}
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.map((row, i) => (
                                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                                        {Object.values(row).slice(0, 10).map((val, j) => (
                                            <td key={j} className="px-3 py-2 text-slate-700 whitespace-nowrap">
                                                {String(val)}
                                            </td>
                                        ))}
                                        {Object.keys(row).length > 10 && (
                                            <td className="px-3 py-2 text-slate-400">...</td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200 flex items-center gap-2"
                        >
                            {uploading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Mengupload...
                                </>
                            ) : (
                                <>
                                    <span className="material-icons-round text-lg">cloud_upload</span>
                                    Konfirmasi Upload
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => { setPreviewData(null); setSelectedConfig(null); }}
                            className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                            Batal
                        </button>
                    </div>
                </div>
            )}

            {/* Upload Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {UPLOAD_CONFIGS.map((config) => (
                    <div
                        key={config.id}
                        className={`rounded-2xl border overflow-hidden transition-all duration-300 ${config.ready
                            ? "bg-white border-slate-200 hover:shadow-lg hover:-translate-y-0.5"
                            : "bg-slate-50 border-slate-200 opacity-60"
                            }`}
                    >
                        <div className={`h-1.5 w-full bg-gradient-to-r ${config.gradient}`}></div>
                        <div className="p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}>
                                    <span className="material-icons-round text-white text-xl">{config.icon}</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-slate-900">{config.label}</h3>
                                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                                        {config.ready ? config.fileName : "Coming Soon"}
                                    </p>
                                </div>
                                {!config.ready && (
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-wider">
                                        Soon
                                    </span>
                                )}
                            </div>

                            <p className="text-xs text-slate-500 mb-4">{config.description}</p>

                            {config.ready ? (
                                <div className="space-y-2">
                                    <button
                                        onClick={() => handleDownloadTemplate(config)}
                                        className="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        <span className="material-icons-round text-sm">download</span>
                                        Download Template
                                    </button>

                                    <label className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 cursor-pointer">
                                        <span className="material-icons-round text-sm">upload_file</span>
                                        Upload File Excel
                                        <input
                                            id={`file-${config.id}`}
                                            type="file"
                                            accept=".xlsx,.xls"
                                            className="hidden"
                                            onChange={(e) => handleFileSelect(e, config)}
                                        />
                                    </label>
                                </div>
                            ) : (
                                <div className="py-2.5 px-4 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold uppercase tracking-widest text-center">
                                    Belum Tersedia
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
