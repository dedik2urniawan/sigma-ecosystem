"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

// ============================================================
// Feature Cards Data
// ============================================================
const calculatorFeatures = [
    {
        id: "individual",
        title: "Penilaian Status Gizi Individu",
        titleEn: "Individual Nutritional Assessment",
        description:
            "Hitung status gizi individu (balita) secara personal menggunakan metode WHO ZScore LMS. Mencakup indeks BBU, TBU, dan BBTB dengan Growth Chart interaktif, deteksi Red Flag, dan analisis Probable Stunting.",
        icon: "person_search",
        status: "Tersedia",
        statusColor: "emerald",
        link: "/calculator/individual",
        features: [
            "ZScore BBU, TBU, BBTB",
            "Growth Chart WHO per indeks",
            "Red Flag Detection",
            "Analisis Probable Stunting",
            "Export PDF & Excel",
        ],
        gradient: "from-emerald-500 to-teal-600",
        shadow: "shadow-emerald-200",
        border: "border-emerald-100",
        badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        badgeDot: "bg-emerald-500",
        btnClass: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200",
        available: true,
    },
    {
        id: "survey",
        title: "Analisis Status Gizi Massal",
        titleEn: "Population Nutritional Survey",
        description:
            "Upload data Excel untuk perhitungan massal dan analisis prevalensi status gizi populasi. Dilengkapi distribusi WHO TEAM, prevalensi per wilayah, dan laporan komprehensif.",
        icon: "groups",
        status: "Tersedia",
        statusColor: "amber",
        link: "/calculator/massal",
        features: [
            "Upload Excel / CSV",
            "Perhitungan Massal Otomatis",
            "Analisis Prevalensi WHO",
            "Probable Stunting Massal",
            "Export Laporan Lengkap",
        ],
        gradient: "from-amber-500 to-orange-600",
        shadow: "shadow-amber-200",
        border: "border-amber-100",
        badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
        badgeDot: "bg-amber-500",
        btnClass: "bg-amber-600 hover:bg-amber-700 shadow-amber-200",
        available: true,
    },
    {
        id: "fct",
        title: "Analisis Komposisi Pangan (FCT)",
        titleEn: "Food Composition Table Analysis",
        description:
            "Hitung kandungan gizi makanan dan bandingkan dengan Angka Kecukupan Gizi (AKG/RDA). Analisis asupan gizi harian dan identifikasi defisiensi nutrisi spesifik.",
        icon: "restaurant_menu",
        status: "Segera Hadir",
        statusColor: "blue",
        link: "#",
        features: [
            "Database Pangan Indonesia",
            "Perbandingan dengan AKG",
            "Analisis Multi-Nutrisi",
            "Dietary Assessment",
            "Rekomendasi Menu",
        ],
        gradient: "from-blue-500 to-indigo-600",
        shadow: "shadow-blue-200",
        border: "border-blue-100",
        badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
        badgeDot: "bg-blue-500",
        btnClass: "bg-slate-200 text-slate-500 cursor-not-allowed",
        available: false,
    },
];

// ============================================================
// Stats Data
// ============================================================
const stats = [
    { value: "3", label: "Indeks ZScore", sub: "BBU · TBU · BBTB", icon: "monitoring" },
    { value: "WHO", label: "Standar Referensi", sub: "Child Growth Standards 2006", icon: "verified" },
    { value: "0-60", label: "Rentang Usia", sub: "Bulan (0-5 Tahun)", icon: "child_care" },
    { value: "100%", label: "Privasi Data", sub: "Tanpa Simpan ke Database", icon: "security" },
];

// ============================================================
// Main Page
// ============================================================
export default function CalculatorPage() {
    return (
        <div className="min-h-screen bg-slate-50 font-display">
            {/* ---- NAVIGATION ---- */}
            <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-3">
                            <Link href="/" className="relative w-9 h-9 shadow-md rounded-xl overflow-hidden bg-white flex items-center justify-center border border-slate-100 p-1 hover:shadow-indigo-100 transition-shadow">
                                <Image src="/sigma_logo.png" alt="SIGMA Logo" fill className="object-contain" />
                            </Link>
                            <div className="flex flex-col">
                                <span className="font-extrabold text-base text-slate-900 leading-none">SIGMA</span>
                                <span className="text-[9px] text-emerald-600 font-bold tracking-[0.2em] uppercase font-mono">Calculator</span>
                            </div>
                        </div>
                        <Link
                            href="/"
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors py-2 px-3 rounded-lg hover:bg-indigo-50"
                        >
                            <span className="material-icons-round text-sm">arrow_back</span>
                            SIGMA Ecosystem
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ---- HERO SECTION ---- */}
            <section className="relative pt-16 overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-900 z-0" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(52,211,153,0.15)_0%,transparent_60%)] z-0" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.1)_0%,transparent_60%)] z-0" />
                {/* Grid pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] z-0" />

                <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 py-24 lg:py-32 text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold tracking-widest uppercase font-mono mb-8">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                        </span>
                        Public Access · No Login Required
                    </div>

                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white mb-6 tracking-tight leading-none">
                        SIGMA{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                            Calculator
                        </span>
                    </h1>

                    <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed mb-4 font-medium">
                        Platform kalkulator gizi berbasis{" "}
                        <span className="text-emerald-300 font-bold">WHO ZScore LMS Method</span> untuk penilaian status gizi
                        individu maupun populasi secara akurat, cepat, dan tanpa perlu login.
                    </p>

                    <p className="text-sm text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
                        Dilengkapi analisis{" "}
                        <span className="text-amber-300 font-semibold">Probable Stunting</span> menggunakan pendekatan{" "}
                        <span className="font-mono text-slate-300">Growth Age Equivalent</span> — fitur eksklusif yang membedakan
                        SIGMA Calculator dari kalkulator gizi lainnya.
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                        {stats.map((s, i) => (
                            <div
                                key={i}
                                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 text-center hover:bg-white/10 transition-colors"
                            >
                                <span className="material-icons-round text-emerald-400 text-2xl mb-2 block">{s.icon}</span>
                                <div className="text-2xl font-black text-white font-mono">{s.value}</div>
                                <div className="text-xs font-bold text-slate-300 mt-0.5">{s.label}</div>
                                <div className="text-[10px] text-slate-500 mt-1 font-mono">{s.sub}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom curve */}
                <div className="relative z-10 -mb-1">
                    <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
                        <path d="M0 60 L0 30 Q360 0 720 30 Q1080 60 1440 30 L1440 60 Z" fill="#f8fafc" />
                    </svg>
                </div>
            </section>

            {/* ---- CALCULATOR OPTIONS SECTION ---- */}
            <section className="py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="text-emerald-600 font-bold tracking-[0.2em] text-xs uppercase mb-3 block font-mono">
              // Pilih Calculator
                        </span>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                            3 Modul Analisis Gizi
                        </h2>
                        <p className="text-slate-500 max-w-2xl mx-auto text-base leading-relaxed">
                            Mulai dari penilaian individu hingga survei populasi — semua menggunakan standar WHO yang tervalidasi secara internasional.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {calculatorFeatures.map((feat) => (
                            <div
                                key={feat.id}
                                className={`bg-white rounded-3xl border ${feat.border} shadow-xl ${feat.shadow} flex flex-col overflow-hidden group transition-all duration-500 ${feat.available ? "hover:-translate-y-2 hover:shadow-2xl" : "opacity-80"
                                    }`}
                            >
                                {/* Card Header */}
                                <div className={`bg-gradient-to-br ${feat.gradient} p-8 relative overflow-hidden`}>
                                    <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 blur-2xl -translate-y-1/2 translate-x-1/2" />
                                    <div className="relative z-10 flex items-start justify-between">
                                        <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm">
                                            <span className="material-icons-round text-white text-3xl">{feat.icon}</span>
                                        </div>
                                        <span
                                            className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border font-mono ${feat.badgeBg}`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${feat.badgeDot} ${feat.available ? "animate-pulse" : ""}`} />
                                            {feat.status}
                                        </span>
                                    </div>
                                    <div className="relative z-10 mt-5">
                                        <h3 className="text-xl font-extrabold text-white leading-tight">{feat.title}</h3>
                                        <p className="text-[11px] text-white/60 font-mono mt-1 tracking-wide">{feat.titleEn}</p>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="flex-1 p-8 flex flex-col">
                                    <p className="text-slate-500 text-sm leading-relaxed mb-6">{feat.description}</p>

                                    {/* Feature list */}
                                    <ul className="space-y-2 mb-8 flex-1">
                                        {feat.features.map((f, i) => (
                                            <li key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
                                                <span className={`material-icons-round text-sm ${feat.available ? "text-emerald-500" : "text-slate-300"}`}>
                                                    {feat.available ? "check_circle" : "radio_button_unchecked"}
                                                </span>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>

                                    {/* CTA Button */}
                                    {feat.available ? (
                                        <Link
                                            href={feat.link}
                                            className={`w-full py-4 rounded-xl text-white text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg ${feat.btnClass}`}
                                        >
                                            <span className="material-icons-round text-base">play_arrow</span>
                                            Mulai Perhitungan
                                        </Link>
                                    ) : (
                                        <button
                                            disabled
                                            className="w-full py-4 rounded-xl text-slate-400 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 bg-slate-100 border border-slate-200 cursor-not-allowed"
                                        >
                                            <span className="material-icons-round text-base">schedule</span>
                                            Segera Hadir
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ---- PRIVACY NOTICE ---- */}
            <section className="py-12 bg-white border-t border-slate-100">
                <div className="max-w-4xl mx-auto px-6 lg:px-8">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-8 flex flex-col sm:flex-row gap-6 items-center">
                        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <span className="material-icons-round text-blue-600 text-2xl">privacy_tip</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-1">Privasi & Keamanan Data Anda</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                SIGMA Calculator berjalan sebagai <strong>sesi publik tanpa autentikasi</strong>. Data yang Anda masukkan{" "}
                                <strong className="text-blue-700">tidak disimpan ke server atau database manapun</strong>. Semua kalkulasi
                                dilakukan secara lokal di browser Anda, dan data akan otomatis terhapus saat sesi berakhir.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="py-8 bg-slate-900">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
                    <div className="flex flex-col md:flex-row gap-3 items-center text-center md:text-left">
                        <span className="font-mono">
                            SIGMA Calculator · Bagian dari{" "}
                            <Link href="/" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                                SIGMA Ecosystem
                            </Link>
                            {" "}· WHO Child Growth Standards 2006
                        </span>
                        <span className="hidden md:inline text-slate-700">·</span>
                        <span className="font-mono text-slate-600">Permenkes No.2/2020</span>
                    </div>
                    <div>
                        Crafted with <span className="text-red-400">♥</span> by{" "}
                        <a href="https://dedik2urniawan.github.io/" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors">DK</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
