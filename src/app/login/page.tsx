"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ─── Animated Particles Background ──────────────────────────────────────────
const ParticlesBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = 0;
        let height = 0;
        let animId: number;

        interface Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            alpha: number;
        }

        const particles: Particle[] = [];

        const setSize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;

            particles.length = 0;
            for (let i = 0; i < 50; i++) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: (Math.random() - 0.5) * 0.4,
                    size: Math.random() * 2 + 0.5,
                    alpha: Math.random() * 0.3 + 0.1,
                });
            }
        };
        setSize();

        const draw = () => {
            ctx.clearRect(0, 0, width, height);

            particles.forEach((p) => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;

                ctx.fillStyle = `rgba(16, 185, 129, ${p.alpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        ctx.strokeStyle = `rgba(16, 185, 129, ${0.04 * (1 - dist / 150)})`;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            animId = requestAnimationFrame(draw);
        };

        animId = requestAnimationFrame(draw);
        window.addEventListener("resize", setSize);
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener("resize", setSize);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
};

// ─── Login Page ─────────────────────────────────────────────────────────────
export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                if (authError.message.includes("Invalid login")) {
                    setError("Email atau password salah. Silakan coba lagi.");
                } else {
                    setError(authError.message);
                }
                setIsLoading(false);
                return;
            }

            if (data.user) {
                // Auth succeeded — redirect immediately via hard navigation
                // Role/profile lookup happens in the dashboard layout
                window.location.href = "/dashboard";
                return;
            }
        } catch {
            setError("Terjadi kesalahan. Silakan coba lagi.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50 font-display selection:bg-emerald-100 selection:text-emerald-900">

            {/* ─── Left Panel: Branding ──────────────────────────── */}
            <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
                <ParticlesBackground />

                {/* Decorative gradient orbs */}
                <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[100px]"></div>

                <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
                    {/* Top: Logo */}
                    <Link href="/" className="flex items-center gap-3 group w-fit">
                        <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-white/10 backdrop-blur-sm border border-white/10 p-1 group-hover:bg-white/20 transition-colors">
                            <Image src="/sigma_logo.png" alt="SIGMA Logo" fill className="object-contain" />
                        </div>
                        <div>
                            <span className="font-extrabold text-xl text-white tracking-tight">SIGMA</span>
                            <span className="text-emerald-400 font-bold text-xs ml-2 tracking-widest uppercase font-mono">RCS</span>
                        </div>
                    </Link>

                    {/* Center: Headline */}
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                            </span>
                            <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-400 uppercase font-mono">
                                Secured Access Portal
                            </span>
                        </div>

                        <h1 className="text-4xl xl:text-5xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                            Dashboard Surveilans<br />
                            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                                Gizi Komprehensif
                            </span>
                        </h1>

                        <p className="text-lg text-slate-400 leading-relaxed mb-10">
                            Akses data real-time dari 39 puskesmas dan 390 desa untuk monitoring stunting, wasting, dan indikator kesehatan gizi di Kabupaten Malang.
                        </p>

                        {/* Feature pills */}
                        <div className="flex flex-wrap gap-3">
                            {[
                                { icon: "shield", label: "RLS Protected" },
                                { icon: "speed", label: "Real-Time" },
                                { icon: "analytics", label: "7 Indikator" },
                            ].map((f) => (
                                <div key={f.label} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                    <span className="material-icons-round text-emerald-400 text-sm">{f.icon}</span>
                                    <span className="text-xs font-bold text-white/70 uppercase tracking-wider">{f.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom: Footer */}
                    <div className="text-xs text-slate-500">
                        © 2026 Dinas Kesehatan Kabupaten Malang • SIGMA Ecosystem v2.0
                        <br />
                        Crafted with <span className="text-red-400">♥</span> by <a href="https://dedik2urniawan.github.io/" target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-400 hover:text-emerald-300 transition-colors">DK</a>
                    </div>
                </div>
            </div>

            {/* ─── Right Panel: Login Form ──────────────────────── */}
            <div className="w-full lg:w-[45%] flex items-center justify-center relative px-6 py-12">
                {/* Subtle background pattern */}
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]"></div>

                <div className={`w-full max-w-md relative z-10 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>

                    {/* Mobile: Logo */}
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white border border-slate-100 shadow-lg p-1">
                            <Image src="/sigma_logo.png" alt="SIGMA Logo" fill className="object-contain" />
                        </div>
                        <div>
                            <span className="font-extrabold text-2xl text-slate-900 tracking-tight">SIGMA</span>
                            <span className="text-emerald-600 font-bold text-sm ml-2">RCS</span>
                        </div>
                    </div>

                    {/* Welcome text */}
                    <div className="mb-10">
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                            Selamat Datang
                        </h2>
                        <p className="text-slate-500 text-sm">
                            Masuk ke dashboard SIGMA RCS untuk mengakses data surveilans gizi.
                        </p>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 animate-in">
                            <span className="material-icons-round text-red-500 text-lg shrink-0 mt-0.5">error</span>
                            <div>
                                <p className="text-sm font-semibold text-red-800">{error}</p>
                            </div>
                            <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600 shrink-0">
                                <span className="material-icons-round text-lg">close</span>
                            </button>
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Email Field */}
                        <div>
                            <label htmlFor="email" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 font-mono">
                                Email
                            </label>
                            <div className="relative group">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <span className="material-icons-round text-slate-400 text-lg group-focus-within:text-emerald-500 transition-colors">mail</span>
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                    placeholder="email@dinkes.go.id"
                                    required
                                    autoComplete="email"
                                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all text-sm shadow-sm"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 font-mono">
                                Password
                            </label>
                            <div className="relative group">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <span className="material-icons-round text-slate-400 text-lg group-focus-within:text-emerald-500 transition-colors">lock</span>
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                    className="w-full pl-12 pr-12 py-4 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all text-sm shadow-sm"
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
                            className="w-full py-4 px-6 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5 flex items-center justify-center gap-3 group"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Memverifikasi...
                                </>
                            ) : (
                                <>
                                    <span className="material-icons-round text-lg">login</span>
                                    Masuk ke Dashboard
                                    <span className="material-icons-round text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-8">
                        <div className="flex-1 h-px bg-slate-200"></div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono">Informasi</span>
                        <div className="flex-1 h-px bg-slate-200"></div>
                    </div>

                    {/* Info Cards */}
                    <div className="space-y-3">
                        <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-start gap-3">
                            <span className="material-icons-round text-emerald-600 text-lg shrink-0 mt-0.5">info</span>
                            <div>
                                <p className="text-xs font-semibold text-emerald-800 mb-0.5">Akun Puskesmas</p>
                                <p className="text-[11px] text-emerald-600/80">Gunakan email puskesmas yang telah terdaftar di sistem SIGMA.</p>
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                            <svg className="w-5 h-5 shrink-0 mt-0.5 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                            <div>
                                <p className="text-xs font-semibold text-slate-700 mb-0.5">Butuh Bantuan?</p>
                                <p className="text-[11px] text-slate-500">
                                    Hubungi via WhatsApp —{" "}
                                    <a href="https://wa.me/6281216354887" target="_blank" rel="noopener noreferrer" className="font-semibold text-green-600 hover:text-green-700 hover:underline transition-colors">
                                        +6281216354887
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Back link */}
                    <div className="mt-8 text-center">
                        <Link href="/rcs" className="text-sm text-slate-400 hover:text-emerald-600 transition-colors inline-flex items-center gap-1 group">
                            <span className="material-icons-round text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span>
                            Kembali ke halaman RCS
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
