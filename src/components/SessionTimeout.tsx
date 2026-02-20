"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Configuration (in milliseconds)
// TEST MODE: 10 Seconds Timeout, 5 Seconds Warning
// const TIMEOUT_DURATION = 10 * 1000;
// const WARNING_DURATION = 5 * 1000;

// NORMAL MODE: 1 Hour Timeout, 5 Minutes Warning
const TIMEOUT_DURATION = 60 * 60 * 1000;
const WARNING_DURATION = 5 * 60 * 1000;

const CHECK_INTERVAL = 1000;             // Check every second to be accurate
const ACTIVITY_THROTTLE = 500;           // Throttle activity updates

export default function SessionTimeout() {
    const router = useRouter();
    const [showWarning, setShowWarning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0); // For countdown in modal

    // Ref to store last activity time to avoid re-renders
    const lastActivityRef = useRef<number>(Date.now());
    const throttleRef = useRef<number>(Date.now());

    const handleLogout = useCallback(async () => {
        try {
            await supabase.auth.signOut();
            router.push("/login?timeout=true");
        } catch (error) {
            console.error("Logout error:", error);
            // Force redirect even if auth error
            window.location.href = "/login";
        }
    }, [router]);

    // Check for timeout
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const timeSinceLastActivity = now - lastActivityRef.current;
            const timeRemaining = TIMEOUT_DURATION - timeSinceLastActivity;

            // Trigger Warning
            if (timeRemaining <= WARNING_DURATION && timeRemaining > 0) {
                if (!showWarning) setShowWarning(true);
                setTimeLeft(timeRemaining);
            }
            // Trigger Logout
            else if (timeRemaining <= 0) {
                clearInterval(interval);
                handleLogout();
            }
            // In safe zone
            else {
                if (showWarning) setShowWarning(false);
            }

        }, CHECK_INTERVAL);

        return () => clearInterval(interval);
    }, [showWarning, handleLogout]);

    // Activity Listener
    useEffect(() => {
        const updateActivity = () => {
            const now = Date.now();
            // Throttle updates
            if (now - throttleRef.current > ACTIVITY_THROTTLE) {
                lastActivityRef.current = now;
                throttleRef.current = now;
                // If warning is shown, hide it immediately on activity
                setShowWarning(prev => {
                    if (prev) return false;
                    return prev;
                });
            }
        };

        // Events to listen for
        const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

        events.forEach(event => {
            window.addEventListener(event, updateActivity);
        });

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, updateActivity);
            });
        };
    }, []);

    // Format millisecond to MM:SS
    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    if (!showWarning) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animation-fade-in px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="bg-amber-50 p-6 flex flex-col items-center text-center border-b border-amber-100">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4 animate-bounce-slow">
                        <span className="material-icons-round text-3xl text-amber-600">access_time</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Sesi Akan Berakhir</h2>
                    <p className="text-sm text-slate-500 mt-2">
                        Demi keamanan, Anda akan logout otomatis karena tidak ada aktivitas.
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 text-center space-y-6">
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
                            Sisa Waktu
                        </p>
                        <p className="text-4xl font-mono font-bold text-slate-900">
                            {formatTime(timeLeft)}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => {
                                lastActivityRef.current = Date.now();
                                setShowWarning(false);
                            }}
                            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 active:scale-95"
                        >
                            Saya Masih Disini
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl transition-all"
                        >
                            Logout Sekarang
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
