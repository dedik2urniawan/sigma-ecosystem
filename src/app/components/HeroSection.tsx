"use client";

import React from "react";

export default function HeroSection() {
    return (
        <section className="relative w-full pt-16 pb-24 lg:pt-24 lg:pb-32 overflow-hidden bg-slate-50">
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute w-full h-full bg-grid-pattern opacity-40"></div>
                <svg
                    className="absolute top-0 left-0 w-full h-full opacity-[0.07] animate-spin-slow origin-center scale-150"
                    viewBox="0 0 800 800"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <circle cx="400" cy="400" r="200" fill="none" stroke="currentColor" strokeDasharray="4 4" strokeWidth="1"></circle>
                    <circle cx="400" cy="400" r="300" fill="none" stroke="currentColor" strokeDasharray="8 8" strokeWidth="0.5"></circle>
                    <circle cx="400" cy="400" r="380" fill="none" stroke="currentColor" strokeWidth="0.5"></circle>
                    <path d="M400,200 Q550,250 600,400 T400,600 T200,400 T400,200" fill="none" stroke="currentColor" strokeWidth="0.5"></path>
                    <path d="M400,100 Q650,200 700,400 T400,700 T100,400 T400,100" fill="none" stroke="currentColor" strokeWidth="0.5" transform="rotate(45 400 400)"></path>
                </svg>
                <div className="absolute top-1/4 left-1/2 w-[800px] h-[800px] bg-indigo-100/40 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 animate-pulse-slow"></div>
                <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-100/30 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3"></div>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-8 text-center flex flex-col items-center">
                <div className="flex items-center gap-2 mb-6 animate-fade-in-up">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    <span className="text-xs font-bold tracking-[0.15em] text-slate-500 uppercase">
                        Sistem Informasi Gizi Kabupaten Malang
                    </span>
                </div>
                <h1 className="text-7xl md:text-8xl lg:text-9xl font-black text-slate-900 mb-1 tracking-tighter leading-none relative">
                    SIGMA
                    <span className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[1.2em] text-indigo-100 blur-xl opacity-60 select-none">
                        SIGMA
                    </span>
                </h1>
                <p className="text-2xl md:text-3xl font-light text-slate-400 tracking-[0.4em] uppercase mb-10">
                    Ecosystem
                </p>
                <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed mb-12">
                    Platform terintegrasi untuk surveilans gizi komprehensif, monitoring
                    intervensi PKMK, dan analisis data kesehatan berbasis AI.
                </p>
                <div className="flex flex-wrap justify-center gap-5 mb-12">
                    <div className="bg-white rounded-2xl px-8 py-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center min-w-[160px] transform hover:-translate-y-1 transition-transform duration-300">
                        <span className="text-4xl font-extrabold text-slate-900 mb-1">6</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                            Modul Aplikasi
                        </span>
                    </div>
                    <div className="bg-white rounded-2xl px-8 py-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center min-w-[160px] transform hover:-translate-y-1 transition-transform duration-300">
                        <span className="text-4xl font-extrabold text-slate-900 mb-1">39</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                            Puskesmas
                        </span>
                    </div>
                    <div className="bg-white rounded-2xl px-8 py-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center min-w-[160px] transform hover:-translate-y-1 transition-transform duration-300">
                        <span className="text-4xl font-extrabold text-indigo-600 mb-1">AI</span>
                        <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">
                            Powered Analytics
                        </span>
                    </div>
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                    <a
                        className="px-8 py-3.5 rounded-full bg-indigo-600 text-white font-bold text-sm tracking-wide hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transform hover:-translate-y-0.5 min-w-[180px]"
                        href="#applications"
                    >
                        Jelajahi Aplikasi
                    </a>
                    <a
                        className="px-8 py-3.5 rounded-full bg-white text-slate-600 font-bold text-sm tracking-wide border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5 min-w-[180px]"
                        href="https://pkmk-malangkab.app/login"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Masuk Dashboard
                    </a>
                </div>
                <div className="mt-20">
                    <div className="w-6 h-10 rounded-full border-2 border-slate-300 flex justify-center p-1 animate-bounce opacity-50">
                        <div className="w-1 h-2 bg-slate-400 rounded-full"></div>
                    </div>
                </div>
            </div>
        </section>
    );
}
