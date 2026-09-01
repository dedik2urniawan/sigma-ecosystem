"use client";

/**
 * UnifiedSessionTimeout — Pengganti SessionTimeout.tsx dan ApiGatewaySessionTimeout.tsx.
 * Satu komponen untuk semua modul, dengan redirect ke /sso/login setelah timeout.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

const TIMEOUT_DURATION = 60 * 60 * 1000; // 1 jam
const WARNING_DURATION = 5 * 60 * 1000;  // 5 menit warning
const CHECK_INTERVAL = 1000;
const ACTIVITY_THROTTLE = 500;

export default function UnifiedSessionTimeout() {
    const router = useRouter();
    const pathname = usePathname();
    const [showWarning, setShowWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const lastActivityRef = useRef<number>(Date.now());
    const throttleRef = useRef<number>(Date.now());

    const handleLogout = useCallback(async () => {
        try {
            await supabase.auth.signOut();
            const redirectPath = encodeURIComponent(pathname);
            router.push(`/sso/login?timeout=true&redirect_to=${redirectPath}`);
        } catch {
            window.location.href = "/sso/login?timeout=true";
        }
    }, [router, pathname]);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = now - lastActivityRef.current;
            const remaining = TIMEOUT_DURATION - elapsed;

            if (remaining <= 0) {
                clearInterval(interval);
                handleLogout();
            } else if (remaining <= WARNING_DURATION) {
                if (!showWarning) setShowWarning(true);
                setTimeLeft(remaining);
            } else {
                if (showWarning) setShowWarning(false);
            }
        }, CHECK_INTERVAL);
        return () => clearInterval(interval);
    }, [showWarning, handleLogout]);

    useEffect(() => {
        const update = () => {
            const now = Date.now();
            if (now - throttleRef.current > ACTIVITY_THROTTLE) {
                lastActivityRef.current = now;
                throttleRef.current = now;
                setShowWarning(prev => prev ? false : prev);
            }
        };
        const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
        events.forEach(e => window.addEventListener(e, update));
        return () => events.forEach(e => window.removeEventListener(e, update));
    }, []);

    const formatTime = (ms: number) => {
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        return `${m}:${(s % 60).toString().padStart(2, "0")}`;
    };

    if (!showWarning) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                {/* Header */}
                <div className="bg-amber-500/10 border-b border-amber-500/20 p-6 flex flex-col items-center text-center">
                    <div className="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
                        <span className="material-icons-round text-3xl text-amber-400">access_time</span>
                    </div>
                    <h2 className="text-lg font-black text-white">Sesi Akan Berakhir</h2>
                    <p className="text-xs text-slate-400 mt-2">
                        Anda akan logout otomatis karena tidak ada aktivitas.
                    </p>
                </div>
                {/* Content */}
                <div className="p-6 text-center space-y-5">
                    <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-mono">Sisa Waktu</p>
                        <p className="text-5xl font-black font-mono text-white">{formatTime(timeLeft)}</p>
                    </div>
                    <div className="flex flex-col gap-2.5">
                        <button
                            onClick={() => { lastActivityRef.current = Date.now(); setShowWarning(false); }}
                            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all text-sm"
                        >
                            Saya Masih Disini
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full py-3 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 font-semibold rounded-xl transition-all text-sm"
                        >
                            Logout Sekarang
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
