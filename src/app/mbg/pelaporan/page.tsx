"use client";

import React, { useState } from "react";
import Link from "next/link";
import SSOModuleDropdown from "@/components/SSOModuleDropdown";

export default function MbgPelaporanPage() {
    const [activeTab, setActiveTab] = useState<"sasaran" | "gizi">("sasaran");

    return (
        <div className="min-h-screen bg-slate-50 font-display">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-3">
                            <Link href="/mbg" className="p-2 -ml-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                                <span className="material-icons-round">arrow_back</span>
                            </Link>
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center">
                                <span className="material-icons-round text-sm">assignment_ind</span>
                            </div>
                            <div>
                                <h1 className="font-bold text-slate-900 leading-tight">Portal SPPG (Pelaporan MBG)</h1>
                                <p className="text-[10px] font-mono text-emerald-600 uppercase tracking-widest">Sekolah / Yayasan</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <SSOModuleDropdown align="right" />
                        </div>
                    </div>
                </div>
            </nav>

            <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <span className="material-icons-round text-8xl text-emerald-600">info</span>
                    </div>
                    <div className="relative z-10">
                        <h2 className="text-xl font-bold text-emerald-800 mb-1">Selamat Datang di Portal Pelaporan</h2>
                        <p className="text-sm text-emerald-700 max-w-2xl">
                            Gunakan portal ini untuk melaporkan data sasaran penerima manfaat (khususnya sasaran 3B) dan progres pemantauan status gizi sasaran secara berkala.
                        </p>
                    </div>
                    <button className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 transition-colors relative z-10">
                        + Laporan Baru
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl mb-6 max-w-md">
                    <button
                        onClick={() => setActiveTab("sasaran")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === "sasaran" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                        <span className="material-icons-round text-sm">groups</span>
                        Data Sasaran 3B
                    </button>
                    <button
                        onClick={() => setActiveTab("gizi")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === "gizi" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                        <span className="material-icons-round text-sm">monitor_weight</span>
                        Progres Gizi
                    </button>
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <span className="material-icons-round text-slate-300 text-3xl">
                            {activeTab === "sasaran" ? "groups" : "analytics"}
                        </span>
                    </div>
                    <h4 className="text-slate-700 font-bold mb-1">
                        {activeTab === "sasaran" ? "Belum ada laporan sasaran 3B" : "Belum ada rekaman progres status gizi"}
                    </h4>
                    <p className="text-slate-500 text-sm max-w-sm">
                        Modul ini masih dalam tahap simulasi. Nantinya data akan tersinkronisasi otomatis dengan database pusat SIGMA.
                    </p>
                </div>
            </main>
        </div>
    );
}
