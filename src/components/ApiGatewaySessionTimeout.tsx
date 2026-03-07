"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ─── Configuration ────────────────────────────────────────────────────────────
// TEST MODE: 1 minute timeout, 20 second warning
const TIMEOUT_DURATION = 1 * 60 * 1000;       // 1 minute  (change to 60 * 60 * 1000 for 1 hour)
const WARNING_DURATION = 20 * 1000;            // 20 seconds (change to 5 * 60 * 1000 for 5 min warning)

// PRODUCTION MODE (uncomment below & comment above):
// const TIMEOUT_DURATION = 60 * 60 * 1000;
// const WARNING_DURATION = 5 * 60 * 1000;

const CHECK_INTERVAL = 1000;                 // Tick every 1 second
const ACTIVITY_THROTTLE = 500;                 // Throttle activity events
// ─────────────────────────────────────────────────────────────────────────────

export default function ApiGatewaySessionTimeout() {
    const router = useRouter();
    const [showWarning, setShowWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);

    const lastActivityRef = useRef<number>(Date.now());
    const throttleRef = useRef<number>(Date.now());

    const handleLogout = useCallback(async () => {
        try {
            await supabase.auth.signOut();
            router.push("/api-gateway/login?timeout=true");
        } catch {
            window.location.href = "/api-gateway/login?timeout=true";
        }
    }, [router]);

    // ─── Interval: check timeout every second ─────────────────────────────────
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

    // ─── Activity listeners ────────────────────────────────────────────────────
    useEffect(() => {
        const update = () => {
            const now = Date.now();
            if (now - throttleRef.current > ACTIVITY_THROTTLE) {
                lastActivityRef.current = now;
                throttleRef.current = now;
                setShowWarning(prev => (prev ? false : prev));
            }
        };
        const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
        events.forEach(e => window.addEventListener(e, update));
        return () => events.forEach(e => window.removeEventListener(e, update));
    }, []);

    // ─── Helpers ───────────────────────────────────────────────────────────────
    const formatTime = (ms: number) => {
        const s = Math.ceil(ms / 1000);
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    // Percentage of warning period remaining (for progress ring)
    const pct = Math.max(0, Math.min(1, timeLeft / WARNING_DURATION));
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - pct);

    // Color transitions: green → amber → red
    const ringColor = pct > 0.5 ? "#22d3ee" : pct > 0.25 ? "#f59e0b" : "#f87171";
    const glowClass = pct > 0.5 ? "shadow-cyan-500/30" : pct > 0.25 ? "shadow-amber-500/30" : "shadow-red-500/40";

    if (!showWarning) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
            style={{ backgroundColor: "rgba(2, 6, 23, 0.85)", backdropFilter: "blur(12px)" }}>

            {/* Card */}
            <div className={`relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl ${glowClass}
                border border-white/10 bg-gradient-to-b from-slate-800 to-slate-900`}
                style={{ boxShadow: `0 0 60px 10px ${ringColor}22` }}>

                {/* Top accent bar */}
                <div className="h-1 w-full" style={{
                    background: `linear-gradient(90deg, transparent, ${ringColor}, transparent)`,
                    opacity: 0.8
                }} />

                {/* Body */}
                <div className="p-8 flex flex-col items-center text-center gap-6">

                    {/* SVG Countdown Ring */}
                    <div className="relative flex items-center justify-center">
                        <svg width="128" height="128" className="-rotate-90">
                            {/* Track */}
                            <circle cx="64" cy="64" r={radius}
                                fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                            {/* Progress */}
                            <circle cx="64" cy="64" r={radius}
                                fill="none" stroke={ringColor} strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={dashOffset}
                                style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.5s ease" }}
                            />
                        </svg>

                        {/* Center: countdown */}
                        <div className="absolute flex flex-col items-center">
                            <span className="font-mono text-3xl font-bold text-white leading-none"
                                style={{ textShadow: `0 0 20px ${ringColor}` }}>
                                {formatTime(timeLeft)}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">sisa waktu</span>
                        </div>
                    </div>

                    {/* Lock icon + headline */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: `${ringColor}22`, border: `1px solid ${ringColor}44` }}>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke={ringColor} strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h2 className="text-white font-bold text-lg">Sesi Akan Berakhir</h2>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed max-w-[260px]">
                            Tidak ada aktivitas terdeteksi. Anda akan logout otomatis demi keamanan akun.
                        </p>
                    </div>

                    {/* SIGMA badge */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-slate-400 text-[11px] font-mono">SIGMA API Gateway · Secure Session</span>
                    </div>

                    {/* Actions */}
                    <div className="w-full flex flex-col gap-3">
                        <button
                            onClick={() => {
                                lastActivityRef.current = Date.now();
                                setShowWarning(false);
                            }}
                            className="w-full py-3 px-4 rounded-2xl font-bold text-sm text-slate-900 transition-all active:scale-95"
                            style={{
                                background: `linear-gradient(135deg, ${ringColor}, ${ringColor}cc)`,
                                boxShadow: `0 4px 24px 0 ${ringColor}44`
                            }}>
                            ✓ &nbsp; Saya Masih Aktif
                        </button>

                        <button
                            onClick={handleLogout}
                            className="w-full py-3 px-4 rounded-2xl font-semibold text-sm text-slate-400
                                bg-white/5 hover:bg-white/10 border border-white/10
                                transition-all active:scale-95">
                            Logout Sekarang
                        </button>
                    </div>
                </div>

                {/* Bottom accent */}
                <div className="px-8 pb-5 text-center">
                    <p className="text-slate-600 text-[10px]">
                        Session timeout: {Math.round(TIMEOUT_DURATION / 60000)} menit tidak aktif
                    </p>
                </div>
            </div>
        </div>
    );
}
