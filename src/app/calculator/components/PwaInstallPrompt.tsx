"use client";

import React, { useState, useEffect } from "react";

// The BeforeInstallPromptEvent interface for TypeScript
interface BeforeInstallPromptEvent extends Event {
    readonly platforms: Array<string>;
    readonly userChoice: Promise<{
        outcome: "accepted" | "dismissed";
        platform: string;
    }>;
    prompt(): Promise<void>;
}

export default function PwaInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isIos, setIsIos] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if already installed
        const checkStandalone = () => {
            return window.matchMedia('(display-mode: standalone)').matches ||
                   (window.navigator as any).standalone === true;
        };
        
        setIsStandalone(checkStandalone());

        // Listen for the beforeinstallprompt event (Chrome/Android)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        // Check if iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        
        // If it's iOS and not already installed, show manual instructions
        if (isIosDevice && !checkStandalone()) {
            setIsIos(true);
            setIsInstallable(true); 
        }

        window.addEventListener("appinstalled", () => {
            setIsInstallable(false);
            setDeferredPrompt(null);
            setIsStandalone(true);
        });

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        
        // Show the install prompt
        await deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        
        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setIsInstallable(false);
    };

    if (isStandalone || !isInstallable || isDismissed) return null;

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-emerald-100 p-4 animate-in slide-in-from-bottom-5 fade-in duration-300">
                <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100">
                        <img src="/sigma_logo.png" alt="SIGMA Logo" className="w-8 h-8 object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm">Install SIGMA Calculator</h4>
                        
                        {isIos ? (
                            <div className="mt-1">
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Akses cepat di iPhone/iPad Anda: Tekan ikon <span className="material-icons-round text-[14px] inline-block align-middle mx-0.5 text-blue-500">ios_share</span> <span className="font-bold text-slate-700">Share</span> di bawah, lalu pilih <span className="font-bold text-slate-700">Add to Home Screen</span> <span className="material-icons-round text-[14px] inline-block align-middle ml-0.5 text-slate-500">add_box</span>.
                                </p>
                                <button
                                    onClick={() => setIsDismissed(true)}
                                    className="mt-3 w-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-2 px-3 rounded-lg transition-colors"
                                >
                                    Mengerti
                                </button>
                            </div>
                        ) : (
                            <>
                                <p className="text-xs text-slate-500 mt-0.5">Akses lebih cepat & mudah dari layar utama perangkat Anda.</p>
                                <div className="flex items-center gap-2 mt-3">
                                    <button
                                        onClick={handleInstallClick}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors"
                                    >
                                        Install App
                                    </button>
                                    <button
                                        onClick={() => setIsDismissed(true)}
                                        className="px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        Nanti
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
