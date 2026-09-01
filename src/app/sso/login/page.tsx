"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getDefaultLandingByRole, isAllowedRedirect, type SigmaRole } from "@/lib/sso-utils";

// ─── Interactive Light Background ───────────────────────────────────────────
const LightBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let w = 0, h = 0, animId: number;

        interface Particle { x: number; y: number; vx: number; vy: number; size: number; alpha: number; }
        const particles: Particle[] = [];

        const setSize = () => {
            w = canvas.width = canvas.offsetWidth;
            h = canvas.height = canvas.offsetHeight;
            particles.length = 0;
            for (let i = 0; i < 40; i++) {
                particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.25,
                    vy: (Math.random() - 0.5) * 0.25,
                    size: Math.random() * 2 + 1,
                    alpha: Math.random() * 0.25 + 0.1,
                });
            }
        };
        setSize();

        const draw = () => {
            ctx.clearRect(0, 0, w, h);
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0 || p.x > w) p.vx *= -1;
                if (p.y < 0 || p.y > h) p.vy *= -1;
                ctx.fillStyle = `rgba(16, 185, 129, ${p.alpha})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
            });

            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 140) {
                        ctx.strokeStyle = `rgba(16, 185, 129, ${0.08 * (1 - d / 140)})`;
                        ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y); ctx.stroke();
                    }
                }
            }
            animId = requestAnimationFrame(draw);
        };

        animId = requestAnimationFrame(draw);
        window.addEventListener("resize", setSize);
        return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", setSize); };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

// ─── Light Module Orbit Animation ───────────────────────────────────────────
const moduleOrbitItems = [
    { label: "RCS", icon: "monitor_heart", color: "from-emerald-500 to-teal-700", angle: 0 },
    { label: "MBG", icon: "restaurant", color: "from-amber-500 to-orange-600", angle: 60 },
    { label: "PKMK", icon: "medical_services", color: "from-violet-500 to-purple-700", angle: 120 },
    { label: "API", icon: "hub", color: "from-indigo-500 to-purple-700", angle: 180 },
    { label: "AI", icon: "smart_toy", color: "from-purple-500 to-indigo-600", angle: 240 },
    { label: "Calc", icon: "calculate", color: "from-blue-500 to-cyan-600", angle: 300 },
];

const ModuleOrbitLight = () => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const radius = 115;

    return (
        <div className="relative w-80 h-80 flex items-center justify-center shrink-0">
            <style jsx>{`
                @keyframes orbit-spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes orbit-counter {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(-360deg); }
                }
                .orbit-track {
                    animation: orbit-spin 38s linear infinite;
                }
                .orbit-counter-rotate {
                    animation: orbit-counter 38s linear infinite;
                }
            `}</style>

            {/* Center SIGMA Logo */}
            <div className="absolute z-20 w-24 h-24 rounded-3xl bg-white border border-emerald-200/90 flex items-center justify-center shadow-xl shadow-emerald-200/60 p-3">
                <div className="relative w-full h-full">
                    <Image src="/sigma_logo.png" alt="SIGMA" fill className="object-contain" priority />
                </div>
            </div>

            {/* Light Orbit Rings */}
            <div className="absolute w-60 h-60 rounded-full border border-emerald-200/60" />
            <div className="absolute w-72 h-72 rounded-full border border-emerald-100/80" />

            {/* Orbiting Modules */}
            {mounted && (
                <div className="absolute inset-0 flex items-center justify-center orbit-track pointer-events-none">
                    {moduleOrbitItems.map((mod) => {
                        const angleRad = (mod.angle * Math.PI) / 180;
                        const x = Math.round(radius * Math.cos(angleRad));
                        const y = Math.round(radius * Math.sin(angleRad));
                        return (
                            <div
                                key={mod.label}
                                className="absolute flex flex-col items-center gap-1 z-10"
                                style={{
                                    transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
                                }}
                            >
                                <div className="orbit-counter-rotate flex flex-col items-center gap-1">
                                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${mod.color} flex items-center justify-center shadow-md shadow-slate-300/60 border border-white`}>
                                        <span className="material-icons-round text-white text-lg">{mod.icon}</span>
                                    </div>
                                    <span className="text-[10px] font-extrabold text-slate-700 bg-white/90 px-2 py-0.5 rounded-md border border-slate-200/80 shadow-xs font-mono tracking-wider uppercase">
                                        {mod.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ─── SSO Login Content (Light Theme) ─────────────────────────────────────────
function SSOLoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get("redirect_to") || "";
    const isTimeout = searchParams.get("timeout") === "true";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    // Check if user is already logged in
    useEffect(() => {
        const checkSession = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                if (redirectTo && isAllowedRedirect(redirectTo)) {
                    window.location.href = redirectTo;
                } else {
                    window.location.href = "/sso/modules";
                }
            }
        };
        checkSession();
    }, [redirectTo]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

            if (authError) {
                if (authError.message.includes("Invalid login")) {
                    setError("Email atau password salah. Pastikan kredensial Anda benar.");
                } else {
                    setError(authError.message);
                }
                setIsLoading(false);
                return;
            }

            if (data.user) {
                // Smart redirect: Prioritaskan redirect_to, default selalu ke Hub 5 Modul (/sso/modules)
                const destination = (redirectTo && isAllowedRedirect(redirectTo))
                    ? redirectTo
                    : "/sso/modules";

                window.location.href = destination;
            }
        } catch {
            setError("Terjadi kendala koneksi. Silakan coba lagi.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50 font-display text-slate-800 selection:bg-emerald-100 selection:text-emerald-900">
            {/* ─── Left Panel: Branding (Light Modern) ───────────────── */}
            <div className="hidden lg:flex lg:w-[56%] relative overflow-hidden bg-gradient-to-br from-emerald-50/70 via-teal-50/30 to-slate-50 border-r border-slate-200/80">
                <LightBackground />

                {/* Light gradient glow circles */}
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-200/30 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-200/30 rounded-full blur-[100px]" />

                <div className="relative z-10 flex flex-col justify-between h-full p-12 xl:p-16 w-full">
                    {/* Top Logo */}
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="relative w-11 h-11 rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm p-1.5 group-hover:border-emerald-300 transition-colors">
                                <Image src="/sigma_logo.png" alt="SIGMA" fill className="object-contain" priority />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-2xl tracking-tight text-slate-900">SIGMA</span>
                                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 rounded-md uppercase font-mono tracking-wider">
                                        Ecosystem
                                    </span>
                                </div>
                                <p className="text-xs font-medium text-slate-500">
                                    Dinas Kesehatan Kabupaten Malang
                                </p>
                            </div>
                        </Link>
                    </div>

                    {/* Center Content */}
                    <div className="flex flex-col items-center justify-center my-auto py-8">
                        {/* Orbit Module Visual */}
                        <ModuleOrbitLight />

                        <div className="mt-8 text-center max-w-md">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-bold font-mono uppercase tracking-wider mb-4 shadow-xs">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                                </span>
                                Unified SSO Authentication
                            </div>

                            <h1 className="text-3xl xl:text-4xl font-black text-slate-900 mb-3 tracking-tight">
                                Satu Kredensial,{" "}
                                <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                                    Seluruh Layanan
                                </span>
                            </h1>

                            <p className="text-sm text-slate-600 leading-relaxed mb-6">
                                Akses surveilans gizi SIGMA RCS, evaluasi MBG, Chatbot AI, API Gateway, dan kalkulator gizi dalam satu portal terpadu.
                            </p>

                            {/* Feature Badges */}
                            <div className="flex flex-wrap justify-center gap-2">
                                {["5 Modul Terintegrasi", "Aman & Terenkripsi", "Sinkronisasi Real-Time", "Hak Akses Wilayah"].map(item => (
                                    <span key={item} className="text-[11px] font-bold text-slate-700 bg-white border border-slate-200/90 shadow-2xs px-3 py-1 rounded-full font-mono">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Footer */}
                    <div className="text-xs text-slate-500">
                        © 2026 Dinas Kesehatan Kabupaten Malang · SIGMA Ecosystem v2.1
                    </div>
                </div>
            </div>

            {/* ─── Right Panel: Login Form (Light Modern) ─────────────── */}
            <div className="w-full lg:w-[44%] flex items-center justify-center relative px-6 py-12 bg-white">
                <div className={`w-full max-w-md relative z-10 transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>

                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
                        <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm p-1.5">
                            <Image src="/sigma_logo.png" alt="SIGMA" fill className="object-contain" priority />
                        </div>
                        <div>
                            <span className="font-black text-2xl text-slate-900 tracking-tight">SIGMA</span>
                            <span className="text-emerald-700 font-bold text-xs ml-2 uppercase font-mono">Ecosystem</span>
                        </div>
                    </div>

                    {/* Header Card */}
                    <div className="mb-8">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold uppercase tracking-wider font-mono mb-3">
                            <span className="material-icons-round text-sm text-emerald-600">lock</span>
                            Portal Masuk Terpusat
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
                            Masuk ke Akun Anda
                        </h2>
                        <p className="text-slate-500 text-sm">
                            Gunakan akun email kedinasan SIGMA yang telah terdaftar.
                        </p>
                    </div>

                    {/* Timeout Alert */}
                    {isTimeout && (
                        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                            <span className="material-icons-round text-amber-600 text-lg shrink-0 mt-0.5">access_time</span>
                            <div>
                                <p className="text-xs font-bold text-amber-900">Sesi Telah Berakhir</p>
                                <p className="text-xs text-amber-700 mt-0.5">Silakan masuk kembali untuk melanjutkan pekerjaan Anda.</p>
                            </div>
                        </div>
                    )}

                    {/* Error Alert */}
                    {error && (
                        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
                            <span className="material-icons-round text-red-600 text-lg shrink-0 mt-0.5">error</span>
                            <p className="text-xs font-semibold text-red-800 flex-1">{error}</p>
                            <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
                                <span className="material-icons-round text-base">close</span>
                            </button>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Email Input */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono">
                                Alamat Email
                            </label>
                            <div className="relative group">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <span className="material-icons-round text-slate-400 text-lg group-focus-within:text-emerald-600 transition-colors">mail</span>
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => { setEmail(e.target.value); setError(""); }}
                                    placeholder="nama@dinkes.go.id"
                                    required
                                    autoComplete="email"
                                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium"
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono">
                                Kata Sandi
                            </label>
                            <div className="relative group">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <span className="material-icons-round text-slate-400 text-lg group-focus-within:text-emerald-600 transition-colors">lock</span>
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setError(""); }}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                    className="w-full pl-11 pr-11 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 transition-colors"
                                    tabIndex={-1}
                                >
                                    <span className="material-icons-round text-lg">
                                        {showPassword ? "visibility_off" : "visibility"}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading || !email || !password}
                            className="w-full mt-2 py-4 px-6 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-emerald-200 hover:shadow-lg hover:shadow-emerald-300 flex items-center justify-center gap-2.5 group"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Memverifikasi Akun...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-icons-round text-lg">login</span>
                                    <span>Masuk ke SIGMA</span>
                                    <span className="material-icons-round text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Support Card */}
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-start gap-3">
                            <span className="material-icons-round text-emerald-600 text-xl shrink-0 mt-0.5">help_outline</span>
                            <div className="text-xs">
                                <p className="font-bold text-slate-900 mb-0.5">Bantuan & Registrasi Akun</p>
                                <p className="text-slate-600 leading-relaxed">
                                    Belum memiliki akun atau lupa kata sandi? Hubungi tim admin Dinkes via{" "}
                                    <a
                                        href="https://wa.me/6281216354887"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-bold text-emerald-700 hover:underline"
                                    >
                                        WhatsApp (+6281216354887)
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Back Link */}
                    <div className="mt-6 text-center">
                        <Link href="/" className="text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors inline-flex items-center gap-1.5 group">
                            <span className="material-icons-round text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span>
                            Kembali ke Halaman Utama
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SSOLoginPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="w-8 h-8 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
            </div>
        }>
            <SSOLoginContent />
        </Suspense>
    );
}
