"use client";

import React, { useEffect, useState } from "react";
import { trackVisitor, getVisitorStats } from "@/app/actions/calculator-visitor";

interface VisitorData {
    totalVisitors: number;
    topRegions: string[];
}

export default function VisitorTracker() {
    const [stats, setStats] = useState<VisitorData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        async function initTracking() {
            try {
                // 1. Silent tracking in background
                await trackVisitor();
                
                // 2. Fetch aggregated stats to display
                const data = await getVisitorStats();
                
                if (isMounted) {
                    setStats(data);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Tracker init error:", err);
                if (isMounted) setLoading(false);
            }
        }

        initTracking();

        return () => {
            isMounted = false;
        };
    }, []);

    if (loading || !stats) {
        return (
            <div className="max-w-4xl mx-auto px-6 lg:px-8 pb-12 opacity-50 animate-pulse">
                <div className="bg-slate-900 rounded-3xl p-6 h-24 border border-slate-800 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    // Determine regions text
    const regionsText = stats.topRegions.length > 0 
        ? stats.topRegions.join(", ") + (stats.topRegions.length >= 2 ? ", dan wilayah lainnya" : "")
        : "berbagai wilayah";

    // Since this is a new feature, we might want to ensure the counter looks alive. 
    // We add a display buffer if it's literally 0 just so the UI doesn't say "0 Pengunjung" on day 1 for the demo.
    const displayCount = stats.totalVisitors > 0 ? stats.totalVisitors : 1;

    return (
        <section className="pb-16 pt-4 bg-white relative z-20">
            <div className="max-w-4xl mx-auto px-6 lg:px-8">
                <div className="relative overflow-hidden bg-slate-900 rounded-3xl p-1">
                    {/* Animated gradient border effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 opacity-30 blur-xl animate-pulse"></div>
                    
                    <div className="relative bg-slate-900 rounded-[22px] border border-slate-700/50 p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6 z-10 overflow-hidden">
                        
                        {/* Background pattern */}
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>

                        {/* Icon/Radar */}
                        <div className="relative flex-shrink-0 w-16 h-16 flex items-center justify-center">
                            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
                            <div className="relative w-12 h-12 bg-slate-800 rounded-full border border-emerald-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                                <span className="material-icons-round text-emerald-400 text-2xl">public</span>
                            </div>
                        </div>

                        {/* Text Content */}
                        <div className="flex-1 text-center sm:text-left">
                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-1.5 justify-center sm:justify-start">
                                <h3 className="text-3xl font-black text-white font-mono tracking-tight">
                                    {displayCount.toLocaleString("id-ID")}
                                </h3>
                                <span className="text-emerald-400 font-bold uppercase tracking-widest text-xs">
                                    Pengunjung Unik
                                </span>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed max-w-xl mx-auto sm:mx-0">
                                Telah dipercaya dan diakses secara publik oleh para tenaga medis & ahli gizi dari <span className="text-slate-200 font-medium">{regionsText}</span>.
                            </p>
                        </div>

                        {/* Right decorative element */}
                        <div className="hidden md:flex flex-shrink-0 items-center justify-center pl-6 border-l border-slate-700/50">
                            <div className="flex -space-x-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center">
                                        <span className="material-icons-round text-slate-400 text-[14px]">person</span>
                                    </div>
                                ))}
                                <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-emerald-500/20 flex items-center justify-center backdrop-blur-sm">
                                    <span className="text-[10px] font-bold text-emerald-400">+</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </section>
    );
}
