"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { generateHealthAnalysis, AnalysisContext } from "@/app/actions/get-ai-analysis";

interface AiAdvisorPanelProps {
    data: AnalysisContext;
}

export default function AiAdvisorPanel({ data }: AiAdvisorPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const hasAnalyzed = useRef(false);
    const [showQuotaInfo, setShowQuotaInfo] = useState(false);

    const handleAnalyze = async () => {
        if (hasAnalyzed.current && analysisResult) return;

        setIsAnalyzing(true);
        setError(null);

        try {
            const result = await generateHealthAnalysis(data);
            if (result.success && result.data) {
                setAnalysisResult(result.data);
                hasAnalyzed.current = true;
            } else {
                setError(result.error || "Gagal mendapatkan analisis.");
                if (result.debugInfo) {
                    console.error("AI Debug Info:", result.debugInfo);
                    // Optional: Show debug info in UI for dev
                    // setError(`${result.error} (${result.debugInfo})`);
                }
            }
        } catch (err) {
            setError("Terjadi kesalahan sistem.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Auto-analyze when opened for the first time
    useEffect(() => {
        if (isOpen && !hasAnalyzed.current && !isAnalyzing) {
            handleAnalyze();
        }
    }, [isOpen]);

    // Reset analysis if data changes significantly (optional, simplified for now)
    useEffect(() => {
        hasAnalyzed.current = false;
        setAnalysisResult(null);
    }, [data.filterTahun, data.filterBulan, data.filterPuskesmas]);

    // Determine status color and text
    const getStatus = () => {
        if (isAnalyzing) return { color: "bg-amber-400", text: "Proses...", pulse: true };
        if (error?.includes("429") || error?.includes("Quota")) return { color: "bg-red-500", text: "Limit Tercapai", pulse: false };
        if (error) return { color: "bg-red-500", text: "Gangguan", pulse: false };
        return { color: "bg-emerald-500", text: "Sistem Ready", pulse: false };
    };

    const status = getStatus();

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 hover:shadow-indigo-200 hover:-translate-y-1 transition-all duration-300 group"
            >
                <div className="relative">
                    <span className="material-icons-round text-xl animate-pulse">auto_awesome</span>
                    <div className="absolute inset-0 bg-white opacity-20 rounded-full animate-ping"></div>
                </div>
                <span className="font-bold pr-1">SIGMA Advisor</span>
            </button>

            {/* Drawer Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[60] bg-slate-900/20 backdrop-blur-sm transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Drawer Panel */}
            <div
                className={`fixed inset-y-0 right-0 z-[70] w-full md:w-[480px] bg-white shadow-2xl transform transition-transform duration-500 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"
                    }`}
            >
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shadow-sm">
                                <span className="material-icons-round text-indigo-600">psychology</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-extrabold text-slate-900 leading-tight">SIGMA Advisor</h2>
                                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowQuotaInfo(true)}>
                                    <div className={`w-2 h-2 rounded-full ${status.color} ${status.pulse ? 'animate-pulse' : ''}`}></div>
                                    <p className="text-xs text-slate-500 font-medium hover:text-indigo-600 transition-colors">
                                        {status.text} <span className="text-[10px] text-slate-300 ml-1">(Klik info)</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setShowQuotaInfo(true)}
                                className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 transition-colors"
                                title="Info Kuota & Model"
                            >
                                <span className="material-icons-round text-lg">info</span>
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <span className="material-icons-round">close</span>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
                        {/* Quota Info Overlay/Modal */}
                        {showQuotaInfo && (
                            <div className="absolute inset-x-6 top-6 bg-white/95 backdrop-blur shadow-2xl border border-indigo-100 rounded-2xl p-5 z-10 animation-fade-in">
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <span className="material-icons-round text-indigo-600">dns</span>
                                        Status & Kuota AI
                                    </h3>
                                    <button onClick={() => setShowQuotaInfo(false)} className="text-slate-400 hover:text-slate-600">
                                        <span className="material-icons-round text-base">close</span>
                                    </button>
                                </div>
                                <div className="space-y-3 text-xs text-slate-600">
                                    <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                                        <div className="flex justify-between mb-1">
                                            <span className="font-semibold text-indigo-900">Model Aktif:</span>
                                            <span className="font-mono text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded text-[10px]">Gemini 1.5 Flash</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-indigo-900">Kecepatan:</span>
                                            <span className="text-emerald-600 font-bold">Sangat Cepat ⚡</span>
                                        </div>
                                        <div className="h-1 w-full bg-indigo-200 mt-2 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 w-full animate-pulse-slow" style={{ width: '100%' }}></div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-slate-800 mb-1">Panduan Kuota Global:</h4>
                                        <ul className="list-disc pl-4 space-y-1">
                                            <li><b className="text-slate-800">15 Request / Menit:</b> Batas untuk seluruh 39 Puskesmas.</li>
                                            <li><b className="text-slate-800">1,500 Request / Hari:</b> Total kuota harian.</li>
                                            <li>Jika muncul error <span className="text-red-500 font-semibold">Limit Tercapai</span>, mohon tunggu 1 menit sebelum mencoba lagi.</li>
                                        </ul>
                                    </div>

                                    <div className="flex items-start gap-2 bg-amber-50 p-2 rounded-lg border border-amber-100 text-amber-800">
                                        <span className="material-icons-round text-base mt-0.5">lightbulb</span>
                                        <p>Tips: Gunakan fitur ini secara bergantian dengan rekan Puskesmas lain untuk menghindari antrian.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isAnalyzing ? (
                            <div className="flex flex-col items-center justify-center h-full space-y-4">
                                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                <p className="text-sm font-medium text-slate-500 animate-pulse">Sedang menganalisis data kesehatan...</p>
                            </div>
                        ) : error ? (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-center">
                                <span className="material-icons-round text-red-500 text-3xl mb-2">error_outline</span>
                                <p className="text-sm text-red-700 font-bold">{error}</p>
                                <button
                                    onClick={handleAnalyze}
                                    className="mt-3 px-4 py-2 bg-white border border-red-200 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50"
                                >
                                    Coba Lagi
                                </button>
                            </div>
                        ) : analysisResult ? (
                            <div className="prose prose-sm prose-indigo max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {analysisResult}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            <div className="text-center mt-20 opacity-50">
                                <span className="material-icons-round text-6xl text-slate-300">smart_toy</span>
                                <p className="mt-4">Siap menganalisis data Anda.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50 text-center flex justify-between items-center px-6">
                        <p className="text-[10px] text-slate-400">
                            AI Experiment by SIGMA
                        </p>
                        <p className="text-[10px] text-slate-300 font-mono">
                            v1.5-flash
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
