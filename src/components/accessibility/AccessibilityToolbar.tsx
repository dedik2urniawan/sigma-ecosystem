"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAccessibility, FontSize, ContrastMode } from "@/context/AccessibilityContext";
import {
    Eye,
    Type,
    Sun,
    Moon,
    Contrast,
    Underline,
    MousePointer,
    Volume2,
    VolumeX,
    RotateCcw,
    X,
    Check,
    Sparkles,
    ShieldCheck,
    Sliders
} from "lucide-react";

export default function AccessibilityToolbar() {
    const pathname = usePathname();
    const {
        settings,
        isToolbarOpen,
        setIsToolbarOpen,
        toggleToolbar,
        setFontSize,
        setContrastMode,
        toggleDyslexicFont,
        toggleTextSpacing,
        toggleUnderlineLinks,
        toggleReduceMotion,
        toggleBigCursor,
        resetAll,
        isSpeaking,
        speakText,
        stopSpeaking,
    } = useAccessibility();

    const panelRef = useRef<HTMLDivElement>(null);

    // Detect if current page has conflicting floating action buttons at bottom-6 right-6
    // (e.g. SIGMA Advisor on Pelayanan Kesehatan, or ModuleSwitcher on standalone modules)
    const hasBottomRightWidget = Boolean(
        pathname?.includes("pelayanan-kesehatan") ||
        pathname === "/rcs" ||
        pathname === "/calculator" ||
        pathname === "/chatbot" ||
        pathname === "/api-gateway" ||
        pathname === "/mbg"
    );

    // Count how many custom accessibility settings are active
    const activeCustomCount = [
        settings.fontSize !== "normal",
        settings.contrastMode !== "default",
        settings.dyslexicFont,
        settings.textSpacing,
        settings.underlineLinks,
        settings.reduceMotion,
        settings.bigCursor,
    ].filter(Boolean).length;

    // Close on Escape key press
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isToolbarOpen) {
                setIsToolbarOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isToolbarOpen, setIsToolbarOpen]);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                // Ignore if clicked the launcher button
                const launcher = document.getElementById("a11y-floating-trigger");
                if (launcher && launcher.contains(e.target as Node)) return;
                setIsToolbarOpen(false);
            }
        };
        if (isToolbarOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isToolbarOpen, setIsToolbarOpen]);

    return (
        <>
            {/* ─── Floating Launcher Button ───────────────────────────── */}
            <button
                id="a11y-floating-trigger"
                onClick={toggleToolbar}
                aria-label="Buka Menu Aksesibilitas Web (WCAG)"
                aria-expanded={isToolbarOpen}
                aria-controls="a11y-panel"
                className={`fixed ${
                    hasBottomRightWidget ? "bottom-24" : "bottom-6"
                } right-6 z-40 w-13 h-13 rounded-full bg-[#09666B] hover:bg-[#0B6268] text-white shadow-xl hover:shadow-2xl shadow-[#09666B]/30 flex items-center justify-center transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-amber-400 cursor-pointer group`}
                title="Aksesibilitas Web (WCAG 2.1 Level AA)"
            >
                <span className="material-icons-round text-28px text-white group-hover:rotate-12 transition-transform">
                    accessibility_new
                </span>

                {/* Active settings badge counter */}
                {activeCustomCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-900 font-extrabold text-[11px] flex items-center justify-center shadow-md border-2 border-white animate-in zoom-in-50">
                        {activeCustomCount}
                    </span>
                )}
            </button>

            {/* ─── Accessible Backdrop & Modal Panel ─────────────────── */}
            {isToolbarOpen && (
                <div
                    className="fixed inset-0 z-[70] flex items-end sm:items-center justify-end sm:pr-6 sm:pb-6 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                    role="presentation"
                >
                    <div
                        id="a11y-panel"
                        ref={panelRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="a11y-dialog-title"
                        className="w-full sm:w-[420px] max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 sm:slide-in-from-right-6 duration-300"
                    >
                        {/* Panel Header */}
                        <div className="bg-gradient-to-r from-[#09666B] to-[#21AFA9] p-5 text-white flex items-start justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                                    <span className="material-icons-round text-2xl text-white">
                                        accessibility_new
                                    </span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <h2
                                            id="a11y-dialog-title"
                                            className="text-base font-extrabold tracking-tight text-white"
                                        >
                                            Aksesibilitas Web
                                        </h2>
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 uppercase tracking-wider">
                                            WCAG 2.1
                                        </span>
                                    </div>
                                    <p className="text-xs text-white/80 mt-0.5">
                                        Penyesuaian kenyamanan visual & bantuan navigasi
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsToolbarOpen(false)}
                                aria-label="Tutup menu aksesibilitas"
                                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Panel Body (Scrollable) */}
                        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs">
                            {/* SECTION 1: Ukuran Font */}
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-900 flex items-center gap-2">
                                        <Type className="w-4 h-4 text-[#09666B]" />
                                        Ukuran Teks (Font Scaling)
                                    </span>
                                    <span className="text-[11px] font-mono text-slate-500 font-semibold">
                                        {settings.fontSize === "normal" && "100%"}
                                        {settings.fontSize === "medium" && "115%"}
                                        {settings.fontSize === "large" && "130%"}
                                        {settings.fontSize === "xlarge" && "145%"}
                                    </span>
                                </div>

                                <div className="grid grid-cols-4 gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
                                    {[
                                        { id: "normal" as FontSize, label: "100%", sub: "Normal" },
                                        { id: "medium" as FontSize, label: "115%", sub: "Sedang" },
                                        { id: "large" as FontSize, label: "130%", sub: "Besar" },
                                        { id: "xlarge" as FontSize, label: "145%", sub: "Ekstra" },
                                    ].map((s) => {
                                        const isActive = settings.fontSize === s.id;
                                        return (
                                            <button
                                                key={s.id}
                                                onClick={() => setFontSize(s.id)}
                                                className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                                                    isActive
                                                        ? "bg-[#09666B] text-white shadow-md shadow-[#09666B]/20 scale-[1.02]"
                                                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                                                }`}
                                            >
                                                <span className="text-xs">{s.label}</span>
                                                <span className="text-[9px] opacity-80">{s.sub}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* SECTION 2: Mode Kontras Tampilan */}
                            <div className="space-y-2.5">
                                <span className="font-bold text-slate-900 flex items-center gap-2">
                                    <Contrast className="w-4 h-4 text-[#09666B]" />
                                    Mode Kontras & Tampilan
                                </span>

                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: "default" as ContrastMode, label: "Default (Asli)", icon: Sun, desc: "Warna standar SIGMA" },
                                        { id: "high-contrast-dark" as ContrastMode, label: "Kontras Gelap", icon: Moon, desc: "Latar hitam teks kuning" },
                                        { id: "high-contrast-light" as ContrastMode, label: "Kontras Terang", icon: Sun, desc: "Hitam-putih kontras 7:1" },
                                        { id: "monochrome" as ContrastMode, label: "Monokrom", icon: Contrast, desc: "Skala abu-abu (Grayscale)" },
                                    ].map((m) => {
                                        const isActive = settings.contrastMode === m.id;
                                        const IconComp = m.icon;
                                        return (
                                            <button
                                                key={m.id}
                                                onClick={() => setContrastMode(m.id)}
                                                className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                                                    isActive
                                                        ? "border-[#09666B] bg-[#F3FAF9] ring-2 ring-[#09666B]/20"
                                                        : "border-slate-200 bg-white hover:bg-slate-50"
                                                }`}
                                            >
                                                <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? "bg-[#09666B] text-white" : "bg-slate-100 text-slate-600"}`}>
                                                    <IconComp className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold text-slate-800 text-[11px] truncate flex items-center gap-1">
                                                        <span>{m.label}</span>
                                                        {isActive && <Check className="w-3 h-3 text-[#09666B] shrink-0" />}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                                                        {m.desc}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* SECTION 3: Bantuan Membaca & Navigasi */}
                            <div className="space-y-2.5">
                                <span className="font-bold text-slate-900 flex items-center gap-2">
                                    <Sliders className="w-4 h-4 text-[#09666B]" />
                                    Kenyamanan Membaca & Navigasi
                                </span>

                                <div className="space-y-2">
                                    {/* Dyslexic Font */}
                                    <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${settings.dyslexicFont ? "bg-[#09666B] text-white" : "bg-slate-100 text-slate-600"}`}>
                                                Aa
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-[11px]">Font Ramah Disleksia</div>
                                                <div className="text-[10px] text-slate-500">Bentuk huruf mudah dibedakan</div>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={settings.dyslexicFont}
                                            onChange={toggleDyslexicFont}
                                            className="w-4 h-4 rounded text-[#09666B] focus:ring-[#09666B] accent-[#09666B] cursor-pointer"
                                        />
                                    </label>

                                    {/* Text Spacing */}
                                    <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${settings.textSpacing ? "bg-[#09666B] text-white" : "bg-slate-100 text-slate-600"}`}>
                                                <Type className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-[11px]">Spasi Teks Longgar (WCAG 1.4.12)</div>
                                                <div className="text-[10px] text-slate-500">Spasi baris & huruf lebih renggang</div>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={settings.textSpacing}
                                            onChange={toggleTextSpacing}
                                            className="w-4 h-4 rounded text-[#09666B] focus:ring-[#09666B] accent-[#09666B] cursor-pointer"
                                        />
                                    </label>

                                    {/* Underline Links */}
                                    <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${settings.underlineLinks ? "bg-[#09666B] text-white" : "bg-slate-100 text-slate-600"}`}>
                                                <Underline className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-[11px]">Garis Bawah Semua Tautan</div>
                                                <div className="text-[10px] text-slate-500">Membantu mengenali link interaktif</div>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={settings.underlineLinks}
                                            onChange={toggleUnderlineLinks}
                                            className="w-4 h-4 rounded text-[#09666B] focus:ring-[#09666B] accent-[#09666B] cursor-pointer"
                                        />
                                    </label>

                                    {/* Big Cursor */}
                                    <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${settings.bigCursor ? "bg-[#09666B] text-white" : "bg-slate-100 text-slate-600"}`}>
                                                <MousePointer className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-[11px]">Kursor Besar Kontras</div>
                                                <div className="text-[10px] text-slate-500">Penunjuk mouse lebih mudah dilihat</div>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={settings.bigCursor}
                                            onChange={toggleBigCursor}
                                            className="w-4 h-4 rounded text-[#09666B] focus:ring-[#09666B] accent-[#09666B] cursor-pointer"
                                        />
                                    </label>

                                    {/* Reduce Motion */}
                                    <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${settings.reduceMotion ? "bg-[#09666B] text-white" : "bg-slate-100 text-slate-600"}`}>
                                                <Sparkles className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-[11px]">Hentikan Gerakan & Animasi</div>
                                                <div className="text-[10px] text-slate-500">Mencegah pusing / gangguan vestibular</div>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={settings.reduceMotion}
                                            onChange={toggleReduceMotion}
                                            className="w-4 h-4 rounded text-[#09666B] focus:ring-[#09666B] accent-[#09666B] cursor-pointer"
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* SECTION 4: Bantuan Suara (Text-to-Speech) */}
                            <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-900 flex items-center gap-2">
                                        <Volume2 className="w-4 h-4 text-[#09666B]" />
                                        Pembaca Layar Bersuara (TTS)
                                    </span>
                                    {isSpeaking && (
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 animate-pulse">
                                            Sedang Membaca...
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-500">
                                    Membacakan ringkasan konten halaman saat ini dalam Bahasa Indonesia untuk membantu tuna netra ringan atau lansia.
                                </p>

                                <div className="flex items-center gap-2 pt-1">
                                    {!isSpeaking ? (
                                        <button
                                            onClick={() => speakText()}
                                            className="flex-1 py-2 px-3 rounded-xl bg-[#09666B] hover:bg-[#0B6268] text-white font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer text-xs"
                                        >
                                            <Volume2 className="w-4 h-4" />
                                            <span>Bacakan Halaman Ini</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={stopSpeaking}
                                            className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer text-xs"
                                        >
                                            <VolumeX className="w-4 h-4" />
                                            <span>Hentikan Suara</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Panel Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                            <button
                                onClick={resetAll}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reset ke Standar</span>
                            </button>

                            <button
                                onClick={() => setIsToolbarOpen(false)}
                                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#09666B] hover:bg-[#0B6268] text-white transition-colors cursor-pointer shadow-sm"
                            >
                                Selesai
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
