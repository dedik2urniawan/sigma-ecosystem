"use client";

import React, { useState } from "react";
import { getEppgbmAiSummary } from "@/app/actions/get-eppgbm-ai-summary";

interface Filters {
    periode: string;
    kecamatan: string;
    puskesmas: string;
    kelurahan?: string;
}

export default function AiExecutiveSummary({ filters }: { filters: Filters }) {
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const res = await getEppgbmAiSummary(filters);
            if (res?.summary) {
                setSummary(res.summary);
            } else {
                setSummary("Gagal memuat ringkasan dari AI.");
            }
        } catch (error) {
            console.error("Failed to generate summary", error);
            setSummary("Terjadi kesalahan sistem saat menghubungi AI.");
        } finally {
            setLoading(false);
        }
    };

    // Helper to format the AI Markdown output (bolding text)
    const formatAiText = (text: string) => {
        // Split by newlines for paragraphs
        return text.split('\n').filter(p => p.trim() !== '').map((paragraph, i) => {
            // Very simple markdown parser for bold (**text**)
            const parts = paragraph.split(/(\*\*.*?\*\*)/g);
            return (
                <p key={i} className="mb-4 text-slate-700 leading-relaxed text-[15px]">
                    {parts.map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={j} className="font-extrabold text-slate-900">{part.slice(2, -2)}</strong>;
                        }
                        return part;
                    })}
                </p>
            );
        });
    };

    return (
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-lg shadow-teal-900/5 transition-all duration-500 mb-6 group">
            {/* Ambient AI Glow Background */}
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none group-hover:bg-teal-400/20 transition-all duration-700"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-700"></div>

            <div className="relative z-10 p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
                                <span className="material-icons-round text-white">auto_awesome</span>
                            </div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">
                                AI Executive Summary
                            </h2>
                        </div>
                        <p className="text-sm text-slate-500 font-medium max-w-2xl">
                            Dapatkan kesimpulan analitis instan dan rekomendasi kebijakan dari sistem pakar (Vertex AI) berdasarkan data agregasi EPPGBM yang sedang Anda filter.
                        </p>
                    </div>

                    <div className="shrink-0 flex flex-col items-end">
                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300
                                ${loading 
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                    : 'bg-slate-900 text-white hover:bg-teal-600 hover:shadow-lg hover:shadow-teal-500/30 hover:-translate-y-0.5'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <span className="material-icons-round animate-spin text-[18px]">autorenew</span>
                                    AI Sedang Menganalisis...
                                </>
                            ) : (
                                <>
                                    <span className="material-icons-round text-[18px]">psychology</span>
                                    {summary ? "Regenerate Insight" : "Generate Insight"}
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* AI Result Area */}
                {(loading || summary) && (
                    <div className="mt-8 pt-6 border-t border-slate-200/60 relative">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-10">
                                <div className="relative w-16 h-16 mb-4">
                                    <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                                    <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
                                    <span className="absolute inset-0 flex items-center justify-center material-icons-round text-teal-500 text-xl animate-pulse">auto_awesome</span>
                                </div>
                                <p className="text-slate-500 font-bold text-sm animate-pulse">
                                    Mengekstraksi pola data dan menyusun rekomendasi kebijakan...
                                </p>
                            </div>
                        ) : summary ? (
                            <div className="bg-slate-50/50 rounded-2xl p-6 md:p-8 border border-slate-100/80 shadow-inner">
                                <div className="prose prose-slate prose-p:leading-relaxed max-w-none">
                                    {formatAiText(summary)}
                                </div>
                                <div className="mt-6 flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                    <span className="material-icons-round text-[14px]">verified_user</span>
                                    Generated by SIGMA Advisor Intelegences
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}
