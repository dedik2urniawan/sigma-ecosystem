"use client";

import React from "react";

interface ComingSoonProps {
    title: string;
    icon: string;
    description: string;
    gradient: string;
}

export default function ComingSoon({ title, icon, description, gradient }: ComingSoonProps) {
    return (
        <div className="flex items-center justify-center min-h-[70vh]">
            <div className="max-w-lg text-center px-6">
                {/* Animated icon */}
                <div className="relative inline-block mb-8">
                    <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-2xl mx-auto`}>
                        <span className="material-icons-round text-white text-4xl">{icon}</span>
                    </div>
                    <div className={`absolute inset-0 w-24 h-24 rounded-3xl bg-gradient-to-br ${gradient} animate-ping opacity-20 mx-auto`}></div>
                </div>

                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 mb-6">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span className="text-[10px] font-bold tracking-[0.2em] text-amber-700 uppercase font-mono">
                        Dalam Pengembangan
                    </span>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
                    {title}
                </h1>

                {/* Description */}
                <p className="text-sm text-slate-500 leading-relaxed mb-8 max-w-md mx-auto">
                    {description}
                </p>

                {/* Progress */}
                <div className="max-w-xs mx-auto mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                            Progress
                        </span>
                        <span className="text-[10px] font-bold text-amber-600 font-mono">15%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-1000`} style={{ width: "15%" }}></div>
                    </div>
                </div>

                {/* Features preview */}
                <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
                    {["Analisis Data", "Visualisasi", "Laporan"].map((f) => (
                        <div key={f} className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mx-auto mb-2">
                                <div className="w-4 h-2 bg-slate-200 rounded"></div>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{f}</span>
                        </div>
                    ))}
                </div>

                <p className="text-xs text-slate-400 mt-8">
                    Fitur ini akan segera tersedia. Pantau terus perkembangan SIGMA RCS.
                </p>
            </div>
        </div>
    );
}
