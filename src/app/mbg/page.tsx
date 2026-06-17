import React from "react";
import Link from "next/link";

export default function MbgLandingPage() {
    return (
        <div className="min-h-screen bg-slate-50 font-display">
            {/* Header / Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100/50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <div className="flex items-center gap-4">
                            <Link href="/" className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                                <span className="material-icons-round">arrow_back</span>
                            </Link>
                            <div className="flex flex-col">
                                <h1 className="font-extrabold text-xl tracking-tight text-slate-900 leading-none">
                                    SIGMA <span className="text-amber-600">MBG</span>
                                </h1>
                                <p className="text-[10px] text-amber-600 font-bold tracking-[0.2em] uppercase mt-0.5 font-mono">
                                    Portal Evaluasi Gizi
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-xl shadow-amber-200 mb-6">
                        <span className="material-icons-round text-4xl">restaurant</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
                        Makan Bergizi Gratis
                    </h2>
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
                        Platform terintegrasi untuk pemantauan, evaluasi, dan pelaporan pelaksanaan program Makan Bergizi Gratis (MBG) di wilayah Kabupaten Malang.
                    </p>
                </div>

                {/* 2 Domains Grid */}
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Domain 1: Supervisi */}
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative group flex flex-col h-full overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 z-10">
                            <span className="bg-amber-50 text-amber-600 text-[10px] uppercase font-bold px-3 py-1.5 rounded-full border border-amber-100 tracking-wider font-mono">
                                Dinkes
                            </span>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-amber-200 relative z-10">
                            <span className="material-icons-round text-3xl">fact_check</span>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-3 relative z-10">
                            Supervisi & Monev
                        </h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-8 flex-grow relative z-10">
                            Modul untuk petugas Dinas Kesehatan melakukan audit kepatuhan gramasi, evaluasi keamanan pangan, dan standar gizi di SPPG.
                        </p>
                        <Link
                            href="/mbg/supervisi"
                            className="w-full py-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold uppercase tracking-widest text-center transition-colors shadow-md relative z-10 flex items-center justify-center gap-2"
                        >
                            Masuk Portal Dinkes
                            <span className="material-icons-round text-lg">arrow_forward</span>
                        </Link>
                        
                        {/* Decorative Background */}
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-50 rounded-full blur-3xl group-hover:bg-amber-100 transition-colors duration-500"></div>
                    </div>

                    {/* Domain 2: Pelaporan Sasaran */}
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative group flex flex-col h-full overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 z-10">
                            <span className="bg-emerald-50 text-emerald-600 text-[10px] uppercase font-bold px-3 py-1.5 rounded-full border border-emerald-100 tracking-wider font-mono">
                                SPPG / Sekolah
                            </span>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-emerald-200 relative z-10">
                            <span className="material-icons-round text-3xl">assignment_ind</span>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-3 relative z-10">
                            Pelaporan Sasaran
                        </h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-8 flex-grow relative z-10">
                            Modul bagi SPPG untuk melaporkan jumlah penerima manfaat, monitoring progres status gizi sasaran, dan pelaporan harian MBG.
                        </p>
                        <Link
                            href="/mbg/pelaporan"
                            className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold uppercase tracking-widest text-center transition-colors shadow-md relative z-10 flex items-center justify-center gap-2"
                        >
                            Masuk Portal SPPG
                            <span className="material-icons-round text-lg">arrow_forward</span>
                        </Link>

                        {/* Decorative Background */}
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-50 rounded-full blur-3xl group-hover:bg-emerald-100 transition-colors duration-500"></div>
                    </div>
                </div>
            </main>
        </div>
    );
}
