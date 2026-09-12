"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import SigmaLogo from "@/components/SigmaLogo";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isAllowedRedirect } from "@/lib/sso-utils";

// ─── Interactive Deep Tech Canvas Background ────────────────────────────────
const TechCanvasBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let w = 0, h = 0, animId: number;

        interface Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            alpha: number;
            color: string;
        }
        const particles: Particle[] = [];
        const colors = ["#10b981", "#14b8a6", "#06b6d4", "#3b82f6"];

        const setSize = () => {
            w = canvas.width = canvas.offsetWidth;
            h = canvas.height = canvas.offsetHeight;
            particles.length = 0;
            const count = Math.min(45, Math.floor((w * h) / 16000));
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.35,
                    vy: (Math.random() - 0.5) * 0.35,
                    size: Math.random() * 2 + 1,
                    alpha: Math.random() * 0.4 + 0.15,
                    color: colors[Math.floor(Math.random() * colors.length)],
                });
            }
        };
        setSize();

        const draw = () => {
            ctx.clearRect(0, 0, w, h);

            // Draw particles
            particles.forEach((p) => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > w) p.vx *= -1;
                if (p.y < 0 || p.y > h) p.vy *= -1;

                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw connection laser filaments
            ctx.globalAlpha = 1;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 130) {
                        const alpha = (1 - dist / 130) * 0.15;
                        ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
                        ctx.lineWidth = 1;
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

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
        />
    );
};

// ─── Module Ecosystem Data ──────────────────────────────────────────────────
interface EcosystemModule {
    id: string;
    label: string;
    fullName: string;
    desc: string;
    icon: string;
    color: string;
    borderColor: string;
    glowColor: string;
    angle: number;
}

const ECOSYSTEM_MODULES: EcosystemModule[] = [
    {
        id: "rcs",
        label: "RCS",
        fullName: "SIGMA RCS",
        desc: "Surveilans Gizi Balita, Pemantauan Stunting & Pelayanan Puskesmas",
        icon: "monitor_heart",
        color: "from-emerald-400 to-teal-600",
        borderColor: "border-emerald-400/50",
        glowColor: "rgba(16, 185, 129, 0.4)",
        angle: 0,
    },
    {
        id: "mbg",
        label: "MBG",
        fullName: "SIGMA MBG",
        desc: "Supervisi & Evaluasi Distribusi Program Makan Bergizi Gratis",
        icon: "restaurant",
        color: "from-amber-400 to-orange-600",
        borderColor: "border-amber-400/50",
        glowColor: "rgba(245, 158, 11, 0.4)",
        angle: 60,
    },
    {
        id: "pkmk",
        label: "PKMK",
        fullName: "SIGMA PKMK",
        desc: "Monitoring Penilaian Kinerja Puskesmas & Integrasi Layanan Primer",
        icon: "medical_services",
        color: "from-violet-400 to-purple-600",
        borderColor: "border-violet-400/50",
        glowColor: "rgba(139, 92, 246, 0.4)",
        angle: 120,
    },
    {
        id: "api",
        label: "API",
        fullName: "API Gateway",
        desc: "Integrasi Interoperabilitas Data Kesehatan & Platform SatuData",
        icon: "hub",
        color: "from-indigo-400 to-blue-600",
        borderColor: "border-indigo-400/50",
        glowColor: "rgba(99, 102, 241, 0.4)",
        angle: 180,
    },
    {
        id: "ai",
        label: "AI",
        fullName: "SIGMA AI",
        desc: "Prediksi Risiko Stunting, Asisten Chatbot & Machine Learning Analitik",
        icon: "smart_toy",
        color: "from-fuchsia-400 to-pink-600",
        borderColor: "border-fuchsia-400/50",
        glowColor: "rgba(217, 70, 239, 0.4)",
        angle: 240,
    },
    {
        id: "calc",
        label: "CALC",
        fullName: "SIGMA Calculator",
        desc: "Kalkulator Standar Antropometri WHO, Formula FCT & Angka Kecukupan Gizi",
        icon: "calculate",
        color: "from-cyan-400 to-sky-600",
        borderColor: "border-cyan-400/50",
        glowColor: "rgba(6, 182, 212, 0.4)",
        angle: 300,
    },
];

// ─── Living Topology: Orbital Ecosystem ─────────────────────────────────────
interface LivingTopologyProps {
    activeModule: EcosystemModule | null;
    setActiveModule: (m: EcosystemModule | null) => void;
}

const LivingTopology: React.FC<LivingTopologyProps> = ({ activeModule, setActiveModule }) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const radius = 125;

    return (
        <div className="relative w-84 h-84 sm:w-96 sm:h-96 flex items-center justify-center shrink-0 select-none">
            <style jsx>{`
                @keyframes orbit-spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes orbit-counter {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(-360deg); }
                }
                @keyframes pulse-ring {
                    0% { transform: scale(0.85); opacity: 0.7; }
                    50% { transform: scale(1.18); opacity: 0.15; }
                    100% { transform: scale(1.4); opacity: 0; }
                }
                @keyframes dash-flow {
                    from { stroke-dashoffset: 24; }
                    to { stroke-dashoffset: 0; }
                }
                .orbit-track {
                    animation: orbit-spin 42s linear infinite;
                }
                .orbit-track.is-paused {
                    animation-play-state: paused;
                }
                .orbit-counter-rotate {
                    animation: orbit-counter 42s linear infinite;
                }
                .orbit-counter-rotate.is-paused {
                    animation-play-state: paused;
                }
                .pulse-wave-1 {
                    animation: pulse-ring 3.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
                }
                .pulse-wave-2 {
                    animation: pulse-ring 3.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite 1.2s;
                }
                .data-beam {
                    animation: dash-flow 1.5s linear infinite;
                }
            `}</style>

            {/* Concentric Glowing Wave Rings from Center */}
            <div className="absolute w-28 h-28 rounded-full border border-emerald-400/40 pulse-wave-1 pointer-events-none" />
            <div className="absolute w-28 h-28 rounded-full border border-cyan-400/30 pulse-wave-2 pointer-events-none" />

            {/* Orbit Boundary Rings */}
            <div className="absolute w-[240px] h-[240px] rounded-full border border-emerald-500/20 border-dashed" />
            <div className="absolute w-[260px] h-[260px] rounded-full border border-teal-500/15" />
            <div className="absolute w-[290px] h-[290px] rounded-full border border-cyan-500/10 border-dotted" />

            {/* SVG Data Packet Spokes Connecting Center to Orbit */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <circle cx="50%" cy="50%" r={radius} fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
                {mounted && ECOSYSTEM_MODULES.map((mod) => {
                    const angleRad = (mod.angle * Math.PI) / 180;
                    const cx = 192; // center x (half of w-96 = 384 / 2 = 192)
                    const cy = 192;
                    const x = cx + radius * Math.cos(angleRad);
                    const y = cy + radius * Math.sin(angleRad);
                    const isHovered = activeModule?.id === mod.id;

                    return (
                        <g key={`spoke-${mod.id}`}>
                            {/* Static Background Spoke Line */}
                            <line
                                x1={cx}
                                y1={cy}
                                x2={x}
                                y2={y}
                                stroke={isHovered ? "rgba(52, 211, 153, 0.6)" : "rgba(255, 255, 255, 0.12)"}
                                strokeWidth={isHovered ? "2" : "1"}
                            />
                            {/* Animated Streaming Data Beam */}
                            <line
                                x1={cx}
                                y1={cy}
                                x2={x}
                                y2={y}
                                stroke={isHovered ? "#34d399" : "rgba(16, 185, 129, 0.35)"}
                                strokeWidth={isHovered ? "2.5" : "1.5"}
                                strokeDasharray="5 9"
                                className="data-beam"
                            />
                        </g>
                    );
                })}
            </svg>

            {/* Center SIGMA Core Hub Node */}
            <div className="absolute z-20 flex flex-col items-center">
                <div className="relative group p-1">
                    {/* Glowing Aura around Center */}
                    <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 opacity-60 blur-md group-hover:opacity-90 transition-opacity" />

                    <div className="relative w-22 h-22 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-slate-900/90 border-2 border-emerald-400/80 backdrop-blur-xl flex items-center justify-center p-3 shadow-2xl shadow-emerald-500/25">
                        <div className="relative w-full h-full">
                            <SigmaLogo variant="mark" alt="SIGMA Core Hub" fill className="object-contain" priority />
                        </div>
                    </div>
                </div>
                <div className="mt-2 text-center pointer-events-none">
                    <span className="text-[10px] font-black text-emerald-300 font-mono tracking-widest uppercase bg-slate-900/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                        SIGMA HUB
                    </span>
                </div>
            </div>

            {/* Orbiting Interactive Module Nodes */}
            {mounted && (
                <div className={`absolute inset-0 flex items-center justify-center orbit-track ${activeModule ? "is-paused" : ""}`}>
                    {ECOSYSTEM_MODULES.map((mod) => {
                        const angleRad = (mod.angle * Math.PI) / 180;
                        const x = Math.round(radius * Math.cos(angleRad));
                        const y = Math.round(radius * Math.sin(angleRad));
                        const isSelected = activeModule?.id === mod.id;

                        return (
                            <div
                                key={mod.id}
                                className="absolute flex flex-col items-center gap-1 z-30 pointer-events-auto"
                                style={{
                                    transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
                                }}
                                onMouseEnter={() => setActiveModule(mod)}
                                onMouseLeave={() => setActiveModule(null)}
                                onClick={() => setActiveModule(isSelected ? null : mod)}
                            >
                                <div
                                    className={`orbit-counter-rotate flex flex-col items-center gap-1 transition-all duration-300 cursor-pointer ${
                                        activeModule ? "is-paused" : ""
                                    } ${isSelected ? "scale-125 -translate-y-1" : "hover:scale-115"}`}
                                >
                                    {/* Icon Squircle Node */}
                                    <div
                                        className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${mod.color} flex items-center justify-center border-2 ${
                                            isSelected ? "border-white ring-4 ring-emerald-400/40 shadow-xl" : "border-white/80 shadow-md"
                                        } transition-all duration-300`}
                                        style={{
                                            boxShadow: isSelected ? `0 0 20px ${mod.glowColor}` : undefined,
                                        }}
                                    >
                                        <span className="material-icons-round text-white text-xl drop-shadow-sm">
                                            {mod.icon}
                                        </span>
                                        {/* Status Ping Dot */}
                                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 flex items-center justify-center">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                        </span>
                                    </div>

                                    {/* Label Pill */}
                                    <span
                                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border font-mono tracking-wider transition-all duration-200 uppercase ${
                                            isSelected
                                                ? "bg-emerald-400 text-slate-950 border-emerald-300 shadow-md shadow-emerald-400/40"
                                                : "bg-slate-900/90 text-slate-200 border-white/20 hover:border-emerald-400/50"
                                        }`}
                                    >
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

// ─── SSO Login Content ───────────────────────────────────────────────────────
function SSOLoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get("redirect_to") || "";
    const isTimeout = searchParams.get("timeout") === "true";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const [isCapsLockOn, setIsCapsLockOn] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [mounted, setMounted] = useState(false);
    const [activeModule, setActiveModule] = useState<EcosystemModule | null>(null);

    useEffect(() => { setMounted(true); }, []);

    // Check existing session
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
                    setError("Email atau kata sandi salah. Pastikan kredensial kedinasan Anda tepat.");
                } else {
                    setError(authError.message);
                }
                setIsLoading(false);
                return;
            }

            if (data.user) {
                const destination = (redirectTo && isAllowedRedirect(redirectTo))
                    ? redirectTo
                    : "/sso/modules";

                window.location.href = destination;
            }
        } catch {
            setError("Terjadi kendala koneksi ke server SSO. Silakan periksa jaringan Anda.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
        setIsCapsLockOn(e.getModifierState("CapsLock"));
    };

    return (
        <div className="flex min-h-screen font-display selection:bg-emerald-500 selection:text-white bg-slate-950">
            {/* ═══════════════════════════════════════════════════════════════════
                LEFT PANEL: Dual-Tone Enterprise Deep Tech Banner
            ════════════════════════════════════════════════════════════════════ */}
            <div className="hidden lg:flex lg:w-[56%] relative overflow-hidden bg-[#041513] border-r border-emerald-900/30 flex-col justify-between p-10 xl:p-14 text-white">
                {/* Tech Canvas Particle Filament Background */}
                <TechCanvasBackground />

                {/* Subtle Radial Dot Grid Background Pattern */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                        backgroundImage: "radial-gradient(rgba(52, 211, 153, 0.25) 1px, transparent 1px)",
                        backgroundSize: "28px 28px",
                    }}
                />

                {/* Ambient Colored Glow Orbs */}
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-teal-500/10 rounded-full blur-[140px] pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-500/15 rounded-full blur-[120px] pointer-events-none" />

                {/* ─── Top Left: Brand Header ─── */}
                <div className="relative z-10 flex items-center justify-between">
                    <Link href="/" className="flex items-center group transition-transform hover:scale-[1.02]" aria-label="SIGMA Ecosystem">
                        <SigmaLogo variant="white" className="h-10 w-auto object-contain drop-shadow-md" priority />
                    </Link>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono font-bold tracking-wide backdrop-blur-md">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        KABUPATEN MALANG
                    </div>
                </div>

                {/* ─── Center: Living Hub Topology & Value Proposition ─── */}
                <div className="relative z-10 flex flex-col items-center justify-center my-auto py-4">
                    {/* Living Topology Hub */}
                    <LivingTopology activeModule={activeModule} setActiveModule={setActiveModule} />

                    {/* Interactive Active Module Detail or Default Helper */}
                    <div className="w-full max-w-lg mt-5 min-h-[58px] transition-all duration-300">
                        {activeModule ? (
                            <div className="p-3 rounded-2xl bg-slate-900/90 border border-emerald-400/40 backdrop-blur-md text-center shadow-lg shadow-emerald-500/10 animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <span className="material-icons-round text-sm text-emerald-400">{activeModule.icon}</span>
                                    <span className="text-xs font-bold text-white font-mono uppercase">{activeModule.fullName}</span>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed font-sans">{activeModule.desc}</p>
                            </div>
                        ) : (
                            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-xs text-center">
                                <p className="text-[11px] text-slate-400 font-mono flex items-center justify-center gap-1.5">
                                    <span className="material-icons-round text-sm text-emerald-400">touch_app</span>
                                    Arahkan kursor pada ikon modul untuk menelaah cakupan integrasi
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Value Proposition Headline */}
                    <div className="text-center max-w-lg mt-5">
                        <h1 className="text-2xl xl:text-3xl font-black text-white mb-2.5 tracking-tight leading-tight">
                            Satu Kredensial,{" "}
                            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                                Seluruh Layanan
                            </span>
                        </h1>
                        <p className="text-xs xl:text-sm text-slate-300/80 leading-relaxed mb-6">
                            Gerbang autentikasi tunggal terenkripsi untuk seluruh platform surveilans, evaluasi MBG, analitik AI, dan kalkulator gizi terpadu Dinas Kesehatan Kabupaten Malang.
                        </p>

                        {/* Live Telemetry & Trust Signal Strip */}
                        <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md text-left shadow-lg">
                            <div className="p-2">
                                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold font-mono">
                                    <span className="material-icons-round text-sm">local_hospital</span>
                                    39 PKM
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Terkoneksi Aktif</p>
                            </div>
                            <div className="p-2 border-x border-white/10">
                                <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold font-mono">
                                    <span className="material-icons-round text-sm">hub</span>
                                    390 Desa
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Surveilans Terpadu</p>
                            </div>
                            <div className="p-2">
                                <div className="flex items-center gap-1.5 text-teal-300 text-xs font-bold font-mono">
                                    <span className="material-icons-round text-sm">security</span>
                                    AES-256
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Enkripsi Berlapis</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Bottom Left: Security Footer ─── */}
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-slate-400/80 border-t border-white/10 pt-4 gap-2">
                    <span>© 2026 Dinas Kesehatan Kabupaten Malang</span>
                    <span className="font-mono text-[10px] text-emerald-400">SIGMA Ecosystem v2.1 • Enterprise SSO</span>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                RIGHT PANEL: Elevated Crisp Modern Login Card
            ════════════════════════════════════════════════════════════════════ */}
            <div className="w-full lg:w-[44%] flex items-center justify-center relative px-6 py-12 bg-slate-50">
                <div className={`w-full max-w-md relative z-10 transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>

                    {/* Mobile Only Header Logo */}
                    <div className="lg:hidden flex flex-col items-center justify-center mb-8">
                        <Link href="/" className="flex items-center mb-3" aria-label="SIGMA Ecosystem">
                            <SigmaLogo variant="primary" className="h-10 w-auto object-contain" priority />
                        </Link>
                        <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                            UNIFIED SSO GATEWAY
                        </span>
                    </div>

                    {/* ── Elevated Form Card ── */}
                    <div className="bg-white rounded-3xl p-8 sm:p-9 border border-slate-200/90 shadow-2xl shadow-slate-200/60 relative overflow-hidden">
                        {/* Top Gradient Accent Trim */}
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

                        {/* Form Title & Subtitle */}
                        <div className="mb-7">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] font-bold uppercase tracking-wider font-mono mb-3">
                                <span className="material-icons-round text-sm text-emerald-600">vpn_key</span>
                                SSO Login Page
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
                                Masuk ke Akun Anda
                            </h2>
                            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                                Gunakan akun email kedinasan SIGMA yang telah terdaftar secara resmi.
                            </p>
                        </div>

                        {/* Timeout Alert */}
                        {isTimeout && (
                            <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                                <span className="material-icons-round text-amber-600 text-lg shrink-0 mt-0.5">access_time</span>
                                <div>
                                    <p className="text-xs font-bold text-amber-900">Sesi Telah Berakhir</p>
                                    <p className="text-[11px] text-amber-700 mt-0.5">Silakan masuk kembali untuk melanjutkan pekerjaan surveilans Anda.</p>
                                </div>
                            </div>
                        )}

                        {/* Error Alert */}
                        {error && (
                            <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
                                <span className="material-icons-round text-red-600 text-lg shrink-0 mt-0.5">error_outline</span>
                                <p className="text-xs font-semibold text-red-800 flex-1 leading-relaxed">{error}</p>
                                <button type="button" onClick={() => setError("")} className="text-red-400 hover:text-red-700">
                                    <span className="material-icons-round text-base">close</span>
                                </button>
                            </div>
                        )}

                        {/* Login Form */}
                        <form onSubmit={handleLogin} className="space-y-4">
                            {/* Email Field */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono">
                                    Alamat Email
                                </label>
                                <div className="relative group">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                        <span className="material-icons-round text-slate-400 text-lg group-focus-within:text-emerald-600 transition-colors">
                                            mail
                                        </span>
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                        placeholder="nama@dinkes.go.id"
                                        required
                                        autoComplete="email"
                                        className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all text-sm font-medium"
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                                        Kata Sandi
                                    </label>
                                    <a
                                        href="https://wa.me/6281216354887?text=Halo%20Admin%20SIGMA%20Dinkes,%20saya%20butuh%20bantuan%20reset%20kata%20sandi%20akun%20SSO."
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                                    >
                                        Lupa Sandi?
                                    </a>
                                </div>
                                <div className="relative group">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                        <span className="material-icons-round text-slate-400 text-lg group-focus-within:text-emerald-600 transition-colors">
                                            lock
                                        </span>
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); setError(""); }}
                                        onKeyUp={handleKeyUp}
                                        onKeyDown={handleKeyUp}
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
                                        aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                                    >
                                        <span className="material-icons-round text-lg">
                                            {showPassword ? "visibility_off" : "visibility"}
                                        </span>
                                    </button>
                                </div>

                                {/* Caps Lock Active Warning */}
                                {isCapsLockOn && (
                                    <p className="mt-1.5 text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                                        <span className="material-icons-round text-xs">warning</span>
                                        Caps Lock sedang aktif
                                    </p>
                                )}
                            </div>

                            {/* Remember Device Checkbox */}
                            <div className="flex items-center pt-1">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 transition-colors cursor-pointer"
                                    />
                                    <span className="text-xs text-slate-600 font-medium">Ingat saya di perangkat dinas ini</span>
                                </label>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading || !email || !password}
                                className="w-full mt-2 py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 flex items-center justify-center gap-2.5 group cursor-pointer"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Memverifikasi Akun SSO...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-icons-round text-lg">login</span>
                                        <span>Masuk ke SIGMA</span>
                                        <span className="material-icons-round text-lg group-hover:translate-x-1.5 transition-transform">arrow_forward</span>
                                    </>
                                )}
                            </button>
                        </form>

                        {/* ── Official Support Card ── */}
                        <div className="mt-7 pt-5 border-t border-slate-100">
                            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100/90 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700">
                                    <span className="material-icons-round text-base">support_agent</span>
                                </div>
                                <div className="text-xs flex-1">
                                    <p className="font-bold text-slate-900 mb-0.5">Helpdesk & Registrasi Akun</p>
                                    <p className="text-slate-600 leading-relaxed text-[11px] mb-2.5">
                                        Staf baru atau butuh validasi hak akses wilayah? Hubungi Admin Dinkes via:
                                    </p>
                                    <a
                                        href="https://wa.me/6281216354887?text=Halo%20Admin%20SIGMA%20Dinkes,%20saya%20memerlukan%20bantuan%20akun%20SSO."
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs shadow-md shadow-[#25D366]/25 hover:shadow-lg hover:shadow-[#25D366]/35 transition-all hover:scale-[1.02] active:scale-[0.98] group"
                                        aria-label="Hubungi WhatsApp Admin Dinkes"
                                    >
                                        {/* Iconic WhatsApp Logo SVG */}
                                        <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0 shadow-xs">
                                            <svg className="w-3.5 h-3.5 fill-[#25D366]" viewBox="0 0 24 24">
                                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                                            </svg>
                                        </div>
                                        <span className="font-semibold tracking-wide">WhatsApp (+6281216354887)</span>
                                        <span className="material-icons-round text-sm group-hover:translate-x-0.5 transition-transform opacity-90">open_in_new</span>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Back to Home Link */}
                        <div className="mt-6 text-center">
                            <Link
                                href="/"
                                className="text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors inline-flex items-center gap-1.5 group"
                            >
                                <span className="material-icons-round text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span>
                                Kembali ke Beranda Ekosistem
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SSOLoginPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
            </div>
        }>
            <SSOLoginContent />
        </Suspense>
    );
}
