"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type FontSize = "normal" | "medium" | "large" | "xlarge";
export type ContrastMode = "default" | "high-contrast-dark" | "high-contrast-light" | "monochrome";

export interface AccessibilitySettings {
    fontSize: FontSize;
    contrastMode: ContrastMode;
    dyslexicFont: boolean;
    textSpacing: boolean;
    underlineLinks: boolean;
    reduceMotion: boolean;
    bigCursor: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
    fontSize: "normal",
    contrastMode: "default",
    dyslexicFont: false,
    textSpacing: false,
    underlineLinks: false,
    reduceMotion: false,
    bigCursor: false,
};

interface AccessibilityContextType {
    settings: AccessibilitySettings;
    isToolbarOpen: boolean;
    setIsToolbarOpen: (open: boolean) => void;
    toggleToolbar: () => void;
    setFontSize: (size: FontSize) => void;
    setContrastMode: (mode: ContrastMode) => void;
    toggleDyslexicFont: () => void;
    toggleTextSpacing: () => void;
    toggleUnderlineLinks: () => void;
    toggleReduceMotion: () => void;
    toggleBigCursor: () => void;
    resetAll: () => void;
    // Text-to-Speech
    isSpeaking: boolean;
    speakText: (text?: string) => void;
    stopSpeaking: () => void;
    // Screen reader live announce
    announcement: string;
    announce: (message: string, priority?: "polite" | "assertive") => void;
    announcePriority: "polite" | "assertive";
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const STORAGE_KEY = "sigma_accessibility_settings_v1";

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
    const [isToolbarOpen, setIsToolbarOpen] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [announcement, setAnnouncement] = useState("");
    const [announcePriority, setAnnouncePriority] = useState<"polite" | "assertive">("polite");
    const [mounted, setMounted] = useState(false);

    // 1. Load settings from localStorage or system preference
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setSettings((prev) => ({ ...prev, ...parsed }));
            } else {
                // Auto-detect system prefers-reduced-motion
                if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                    setSettings((prev) => ({ ...prev, reduceMotion: true }));
                }
            }
        } catch (e) {
            console.warn("Failed to load accessibility settings from localStorage:", e);
        }
        setMounted(true);
    }, []);

    // 2. Apply classes to document.documentElement
    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;

        // Font scaling
        root.classList.remove("a11y-font-medium", "a11y-font-large", "a11y-font-xlarge");
        if (settings.fontSize === "medium") root.classList.add("a11y-font-medium");
        if (settings.fontSize === "large") root.classList.add("a11y-font-large");
        if (settings.fontSize === "xlarge") root.classList.add("a11y-font-xlarge");

        // Contrast modes
        root.classList.remove("a11y-contrast-dark", "a11y-contrast-light", "a11y-monochrome");
        if (settings.contrastMode === "high-contrast-dark") root.classList.add("a11y-contrast-dark");
        if (settings.contrastMode === "high-contrast-light") root.classList.add("a11y-contrast-light");
        if (settings.contrastMode === "monochrome") root.classList.add("a11y-monochrome");

        // Feature toggles
        root.classList.toggle("a11y-dyslexic", settings.dyslexicFont);
        root.classList.toggle("a11y-text-spacing", settings.textSpacing);
        root.classList.toggle("a11y-underline-links", settings.underlineLinks);
        root.classList.toggle("a11y-reduce-motion", settings.reduceMotion);
        root.classList.toggle("a11y-big-cursor", settings.bigCursor);

        // Save to localStorage
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (e) {
            console.warn("Failed to save accessibility settings:", e);
        }
    }, [settings, mounted]);

    // Announce helper
    const announce = useCallback((message: string, priority: "polite" | "assertive" = "polite") => {
        setAnnouncePriority(priority);
        setAnnouncement("");
        // slight tick to re-trigger screen reader aria-live
        setTimeout(() => {
            setAnnouncement(message);
        }, 50);
    }, []);

    // Handlers
    const toggleToolbar = useCallback(() => {
        setIsToolbarOpen((prev) => !prev);
    }, []);

    const setFontSize = useCallback((size: FontSize) => {
        setSettings((prev) => ({ ...prev, fontSize: size }));
        announce(`Ukuran teks diubah ke ${size === "normal" ? "Normal" : size === "medium" ? "Sedang (115%)" : size === "large" ? "Besar (130%)" : "Ekstra Besar (145%)"}`);
    }, [announce]);

    const setContrastMode = useCallback((mode: ContrastMode) => {
        setSettings((prev) => ({ ...prev, contrastMode: mode }));
        const label = mode === "default" ? "Tampilan Standar" : mode === "high-contrast-dark" ? "Kontras Tinggi Gelap" : mode === "high-contrast-light" ? "Kontras Tinggi Terang" : "Monokrom";
        announce(`Mode warna diubah ke ${label}`);
    }, [announce]);

    const toggleDyslexicFont = useCallback(() => {
        setSettings((prev) => {
            const next = !prev.dyslexicFont;
            announce(next ? "Font ramah disleksia diaktifkan" : "Font ramah disleksia dinonaktifkan");
            return { ...prev, dyslexicFont: next };
        });
    }, [announce]);

    const toggleTextSpacing = useCallback(() => {
        setSettings((prev) => {
            const next = !prev.textSpacing;
            announce(next ? "Spasi teks longgar diaktifkan" : "Spasi teks standar diaktifkan");
            return { ...prev, textSpacing: next };
        });
    }, [announce]);

    const toggleUnderlineLinks = useCallback(() => {
        setSettings((prev) => {
            const next = !prev.underlineLinks;
            announce(next ? "Garis bawah tautan diaktifkan" : "Garis bawah tautan dinonaktifkan");
            return { ...prev, underlineLinks: next };
        });
    }, [announce]);

    const toggleReduceMotion = useCallback(() => {
        setSettings((prev) => {
            const next = !prev.reduceMotion;
            announce(next ? "Hentikan animasi diaktifkan" : "Animasi diaktifkan kembali");
            return { ...prev, reduceMotion: next };
        });
    }, [announce]);

    const toggleBigCursor = useCallback(() => {
        setSettings((prev) => {
            const next = !prev.bigCursor;
            announce(next ? "Kursor besar diaktifkan" : "Kursor standar diaktifkan");
            return { ...prev, bigCursor: next };
        });
    }, [announce]);

    const resetAll = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
        announce("Pengaturan aksesibilitas dikembalikan ke standar");
    }, [announce]);

    // Text-to-Speech using Web Speech API (ID-ID)
    const speakText = useCallback((customText?: string) => {
        if (!("speechSynthesis" in window)) {
            announce("Fitur suara tidak didukung oleh peramban ini.", "assertive");
            return;
        }

        window.speechSynthesis.cancel();

        let textToRead = customText;
        if (!textToRead) {
            // Find main content or header text
            const mainEl = document.getElementById("main-content") || document.querySelector("main") || document.body;
            textToRead = mainEl?.innerText?.slice(0, 3000) || "Halaman SIGMA Ecosystem";
        }

        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = "id-ID";
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Try to pick an Indonesian voice if available
        const voices = window.speechSynthesis.getVoices();
        const idVoice = voices.find((v) => v.lang.startsWith("id") || v.lang.includes("ID"));
        if (idVoice) utterance.voice = idVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
        announce("Mulai membacakan isi halaman");
    }, [announce]);

    const stopSpeaking = useCallback(() => {
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
        announce("Pembacaan suara dihentikan");
    }, [announce]);

    return (
        <AccessibilityContext.Provider
            value={{
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
                announcement,
                announce,
                announcePriority,
            }}
        >
            {children}
        </AccessibilityContext.Provider>
    );
}

export function useAccessibility() {
    const context = useContext(AccessibilityContext);
    if (!context) {
        throw new Error("useAccessibility must be used within an AccessibilityProvider");
    }
    return context;
}
