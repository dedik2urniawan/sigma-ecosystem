import React from "react";

export default function AboutSection() {
    return (
        <>
            <section className="relative w-full py-24 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-widest mb-6 border border-indigo-100">
                            Why Choose SIGMA?
                        </div>
                        <h1 className="text-4xl md:text-5xl lg:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                            Penguatan Kebijakan Berbasis Data
                        </h1>
                        <p className="text-lg text-slate-500 max-w-3xl mx-auto leading-relaxed">
                            SIGMA dirancang untuk meningkatkan efisiensi, ketepatan, dan presisi
                            dalam upaya penurunan stunting melalui ekosistem digital terintegrasi.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 hover:border-blue-100 shadow-[0_4px_24px_rgb(0,0,0,0.02)] hover:shadow-[0_12px_32px_rgb(0,0,0,0.06)] transition-all duration-300 group">
                            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <span className="material-icons-round text-2xl">database</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-3">
                                Data Terpusat
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Seluruh data gizi dari berbagai sumber terintegrasi dalam satu
                                platform untuk analisis komprehensif.
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 hover:border-purple-100 shadow-[0_4px_24px_rgb(0,0,0,0.02)] hover:shadow-[0_12px_32px_rgb(0,0,0,0.06)] transition-all duration-300 group">
                            <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <span className="material-icons-round text-2xl">psychology</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-3">
                                AI-Powered Insights
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Analisis cerdas menggunakan artificial intelligence untuk
                                rekomendasi kebijakan berbasis data.
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 hover:border-amber-100 shadow-[0_4px_24px_rgb(0,0,0,0.02)] hover:shadow-[0_12px_32px_rgb(0,0,0,0.06)] transition-all duration-300 group">
                            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <span className="material-icons-round text-2xl">bolt</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-3">
                                Real-Time Monitoring
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Pantau indikator gizi secara real-time dengan dashboard
                                interaktif dan alert otomatis.
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 hover:border-emerald-100 shadow-[0_4px_24px_rgb(0,0,0,0.02)] hover:shadow-[0_12px_32px_rgb(0,0,0,0.06)] transition-all duration-300 group">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <span className="material-icons-round text-2xl">verified_user</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-3">
                                Keamanan Terstandar
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Role-based access control dan enkripsi data untuk menjamin
                                kerahasiaan informasi kesehatan.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-24 bg-slate-50 border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row gap-16 items-start">
                        <div className="lg:w-5/12">
                            <div className="text-indigo-600 font-bold tracking-[0.2em] text-xs uppercase mb-4">
                                Architecture
                            </div>
                            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                                Interoperabilitas Terpadu
                            </h2>
                            <p className="text-slate-500 leading-relaxed mb-10 text-lg">
                                Data dari SIGIZI KESGA diproses melalui SIGMA RCS untuk analisis
                                komprehensif, terintegrasi dengan SIGMA Calculator untuk
                                kalkulasi standar WHO, dan didistribusikan melalui API Gateway
                                ke seluruh ekosistem.
                            </p>
                            <div className="flex flex-wrap gap-2.5">
                                <span className="px-5 py-2 rounded-lg bg-white text-slate-600 text-[11px] font-bold border border-slate-200 uppercase tracking-wide shadow-sm">
                                    SIGIZI KESGA
                                </span>
                                <span className="px-5 py-2 rounded-lg bg-white text-slate-600 text-[11px] font-bold border border-slate-200 uppercase tracking-wide shadow-sm">
                                    EPPGBM
                                </span>
                                <span className="px-5 py-2 rounded-lg bg-white text-slate-600 text-[11px] font-bold border border-slate-200 uppercase tracking-wide shadow-sm">
                                    Tatalaksana Gizi
                                </span>
                                <span className="px-5 py-2 rounded-lg bg-white text-slate-600 text-[11px] font-bold border border-slate-200 uppercase tracking-wide shadow-sm">
                                    Indikator Program
                                </span>
                                <span className="px-5 py-2 rounded-lg bg-white text-slate-600 text-[11px] font-bold border border-slate-200 uppercase tracking-wide shadow-sm">
                                    WHO Anthro
                                </span>
                                <span className="px-5 py-2 rounded-lg bg-white text-slate-600 text-[11px] font-bold border border-slate-200 uppercase tracking-wide shadow-sm">
                                    AI Analysis
                                </span>
                            </div>
                        </div>
                        <div className="lg:w-7/12 w-full">
                            <div className="space-y-6 relative pl-4 lg:pl-12">
                                <div className="bg-white border border-blue-100 rounded-2xl p-6 text-center shadow-md relative z-10 w-full max-w-lg mx-auto">
                                    <h4 className="text-blue-600 font-bold text-base mb-1">
                                        Input Data
                                    </h4>
                                    <p className="text-blue-400 text-[10px] uppercase font-bold tracking-widest">
                                        SIGIZI KESGA → Excel Upload
                                    </p>
                                </div>
                                <div className="h-10 w-0.5 bg-slate-200 mx-auto"></div>
                                <div className="bg-white border border-indigo-100 rounded-2xl p-6 text-center shadow-md relative z-10 w-full max-w-lg mx-auto">
                                    <h4 className="text-indigo-600 font-bold text-base mb-1">
                                        Process & Analysis
                                    </h4>
                                    <p className="text-indigo-400 text-[10px] uppercase font-bold tracking-widest">
                                        SIGMA RCS → AI Insights
                                    </p>
                                </div>
                                <div className="h-10 w-0.5 bg-slate-200 mx-auto"></div>
                                <div className="bg-white border border-purple-100 rounded-2xl p-6 text-center shadow-md relative z-10 w-full max-w-lg mx-auto">
                                    <h4 className="text-purple-600 font-bold text-base mb-1">
                                        Output & Result
                                    </h4>
                                    <p className="text-purple-400 text-[10px] uppercase font-bold tracking-widest">
                                        Dashboard, API, Reports
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
