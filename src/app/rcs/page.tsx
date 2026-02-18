"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

// ─── Animated Data Grid Background ─────────────────────────────────────────
const DataGridBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = 0;
        let height = 0;
        let animId: number;

        // Nodes for network visualization
        interface Node {
            x: number;
            y: number;
            vx: number;
            vy: number;
            radius: number;
            pulse: number;
            pulseSpeed: number;
        }

        const nodes: Node[] = [];
        const NODE_COUNT = 40;

        const setSize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;

            // Reinitialize nodes
            nodes.length = 0;
            for (let i = 0; i < NODE_COUNT; i++) {
                nodes.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    radius: Math.random() * 2 + 1,
                    pulse: Math.random() * Math.PI * 2,
                    pulseSpeed: 0.01 + Math.random() * 0.02,
                });
            }
        };
        setSize();

        const draw = () => {
            ctx.clearRect(0, 0, width, height);

            // Grid lines
            ctx.strokeStyle = "rgba(16, 185, 129, 0.03)";
            ctx.lineWidth = 1;
            for (let x = 0; x <= width; x += 60) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
            for (let y = 0; y <= height; y += 60) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }

            // Update & draw nodes
            nodes.forEach((n) => {
                n.x += n.vx;
                n.y += n.vy;
                n.pulse += n.pulseSpeed;

                if (n.x < 0 || n.x > width) n.vx *= -1;
                if (n.y < 0 || n.y > height) n.vy *= -1;

                const alpha = 0.3 + Math.sin(n.pulse) * 0.2;
                ctx.fillStyle = `rgba(16, 185, 129, ${alpha})`;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw connections
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 200) {
                        ctx.strokeStyle = `rgba(16, 185, 129, ${0.06 * (1 - dist / 200)})`;
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
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
            className="absolute inset-0 z-0 pointer-events-none"
        />
    );
};

// ─── Animated Counter ───────────────────────────────────────────────────────
const AnimatedCounter = ({ end, duration = 2000, suffix = "" }: { end: number; duration?: number; suffix?: string }) => {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                let start = 0;
                const step = end / (duration / 16);
                const timer = setInterval(() => {
                    start += step;
                    if (start >= end) {
                        setCount(end);
                        clearInterval(timer);
                    } else {
                        setCount(Math.floor(start));
                    }
                }, 16);
                observer.disconnect();
            }
        });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [end, duration]);

    return <div ref={ref}>{count.toLocaleString()}{suffix}</div>;
};

// ─── Feature Card ───────────────────────────────────────────────────────────
interface FeatureCardProps {
    icon: string;
    title: string;
    desc: string;
    color: string;
}

const FeatureCard = ({ icon, title, desc, color }: FeatureCardProps) => (
    <div className="group bg-white rounded-2xl p-8 border border-slate-100 hover:border-emerald-200 shadow-sm hover:shadow-xl transition-all duration-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/0 to-emerald-50/0 group-hover:from-emerald-50/50 group-hover:to-transparent transition-all duration-500"></div>
        <div className="relative z-10">
            <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500 shadow-lg`}>
                <span className="material-icons-round text-2xl text-white">{icon}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
        </div>
    </div>
);

// ─── Indicator Card Component ────────────────────────────────────────────────
interface IndicatorData {
    title: string;
    desc: string;
    icon: string;
    color: string;
    gradient: string;
    subIndicators: string[];
}

const IndicatorCard = ({ indicator, index }: { indicator: IndicatorData; index: number }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div
            className={`group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl hover:border-slate-200 transition-all duration-500 cursor-pointer ${isExpanded ? "shadow-lg border-slate-200" : ""}`}
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className={`h-1.5 w-full bg-gradient-to-r ${indicator.gradient}`}></div>
            <div className="p-6">
                <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${indicator.gradient} flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                        <span className="material-icons-round text-white text-xl">{indicator.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-tight">{indicator.title}</h3>
                            <span className={`material-icons-round text-slate-400 transition-transform duration-300 shrink-0 ${isExpanded ? "rotate-180" : ""}`}>expand_more</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{indicator.desc}</p>
                    </div>
                </div>

                {/* Sub-indicators */}
                <div className={`overflow-hidden transition-all duration-500 ${isExpanded ? "max-h-96 mt-4 opacity-100" : "max-h-0 opacity-0"}`}>
                    <div className="border-t border-slate-100 pt-4 space-y-2">
                        {indicator.subIndicators.map((sub, i) => (
                            <div key={i} className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                                <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${indicator.gradient} shrink-0`}></div>
                                <span className="text-sm text-slate-600">{sub}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tags count */}
                {!isExpanded && indicator.subIndicators.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-widest font-mono ${indicator.color}`}>
                            {indicator.subIndicators.length} Sub-Indikator
                        </span>
                        <span className="text-[10px] text-slate-300">•</span>
                        <span className="text-[10px] text-slate-400">Klik untuk detail</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function RCSLandingPage() {
    const [isScrolled, setIsScrolled] = useState(false);

    // ─── Live Dashboard Data from Supabase ─────────────────────────
    const [liveStats, setLiveStats] = useState<{
        stunting: string;
        wasting: string;
        overweight: string;
        obesitas: string;
        period: string;
        sparkBars: number[];
        loaded: boolean;
    }>({
        stunting: "...",
        wasting: "...",
        overweight: "...",
        obesitas: "...",
        period: "Loading",
        sparkBars: Array(20).fill(30),
        loaded: false,
    });

    useEffect(() => {
        async function fetchLiveData() {
            try {
                const res = await fetch("/api/live-stats");
                if (!res.ok) return;
                const data = await res.json();
                setLiveStats({
                    stunting: data.stunting || "N/A",
                    wasting: data.wasting || "N/A",
                    overweight: data.underweight || "N/A",
                    obesitas: data.obesitas || "N/A",
                    period: data.period || "N/A",
                    sparkBars: data.sparkBars || Array(20).fill(30),
                    loaded: true,
                });
            } catch (err) {
                console.error("Live stats fetch error:", err);
            }
        }
        fetchLiveData();
    }, []);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const features = [
        { icon: "monitor_heart", title: "Surveilans Real-Time", desc: "Monitoring data gizi langsung dari SIGIZI KESGA secara real-time ke dashboard analitik.", color: "bg-gradient-to-br from-emerald-500 to-emerald-700" },
        { icon: "analytics", title: "Analitik Prediktif", desc: "Machine learning untuk prediksi tren stunting, wasting, dan underweight per wilayah.", color: "bg-gradient-to-br from-blue-500 to-blue-700" },
        { icon: "map", title: "Pemetaan Geospasial", desc: "Visualisasi data RCS berbasis peta interaktif per kecamatan dan desa.", color: "bg-gradient-to-br from-indigo-500 to-indigo-700" },
        { icon: "compare_arrows", title: "Mirror SIGIZI KESGA", desc: "Integrasi data dari aplikasi nasional SIGIZI KESGA ke dashboard lokal.", color: "bg-gradient-to-br from-purple-500 to-purple-700" },
        { icon: "speed", title: "Early Warning System", desc: "Deteksi dini wilayah berisiko tinggi dengan notifikasi otomatis.", color: "bg-gradient-to-br from-amber-500 to-amber-700" },
        { icon: "group", title: "Multi-Stakeholder", desc: "Dashboard berbeda untuk Dinkes, Puskesmas, dan stakeholder terkait.", color: "bg-gradient-to-br from-rose-500 to-rose-700" },
    ];

    const metrics = [
        { value: 39, label: "Puskesmas", suffix: "", icon: "apartment" },
        { value: 390, label: "Desa/Kelurahan", suffix: "", icon: "location_on" },
        { value: 100, label: "Data Presisi", suffix: "%", icon: "verified" },
        { value: 24, label: "Monitoring", suffix: "/7", icon: "schedule" },
    ];

    const rcsIndicators: IndicatorData[] = [
        {
            title: "Indikator Balita Gizi",
            desc: "Pemantauan status gizi balita secara komprehensif",
            icon: "child_care",
            color: "text-emerald-600",
            gradient: "from-emerald-500 to-emerald-700",
            subIndicators: [
                "Pemantauan Pertumbuhan dan Perkembangan",
                "Masalah Gizi",
                "ASI Eksklusif dan MPASI",
                "Suplementasi Zat Gizi Mikro",
                "Tatalaksana Balita Bermasalah Gizi",
            ],
        },
        {
            title: "Indikator Balita KIA",
            desc: "Kesehatan ibu dan anak pada periode neonatal dan balita",
            icon: "favorite",
            color: "text-rose-600",
            gradient: "from-rose-500 to-rose-700",
            subIndicators: [
                "Bayi Baru Lahir",
                "Pemantauan Perkembangan",
                "Pelayanan Kesehatan",
            ],
        },
        {
            title: "Indikator Ibu Hamil",
            desc: "Monitoring kesehatan dan status gizi ibu hamil",
            icon: "pregnant_woman",
            color: "text-indigo-600",
            gradient: "from-indigo-500 to-indigo-700",
            subIndicators: [
                "Persentase Anemia Ibu Hamil",
                "Cakupan Ibu Hamil Mendapat dan Mengonsumsi Suplementasi Gizi",
                "Persentase Ibu Hamil Kurang Energi Kronik (KEK)",
                "Cakupan Ibu Hamil KEK Mendapat dan Mengonsumsi Makanan Tambahan",
                "Kohort Pemeriksaan ANC",
            ],
        },
        {
            title: "Indikator Remaja Putri",
            desc: "Surveilans status gizi dan anemia remaja putri",
            icon: "girl",
            color: "text-purple-600",
            gradient: "from-purple-500 to-purple-700",
            subIndicators: [
                "Persentase Remaja Putri Mendapatkan dan Mengonsumsi TTD",
                "Persentase Remaja Putri Skrining Anemia",
                "Persentase Remaja Putri Teridentifikasi Anemia",
                "Tatalaksana Rematri Anemia",
            ],
        },
        {
            title: "Indikator Pelayanan Kesehatan",
            desc: "Status gizi berdasarkan antropometri dan insiden kasus",
            icon: "local_hospital",
            color: "text-blue-600",
            gradient: "from-blue-500 to-blue-700",
            subIndicators: [
                "Stunting (Pendek + Sangat Pendek) — TB/U < -2 SD",
                "Wasting (Kurus + Sangat Kurus) — BB/TB < -2 SD",
                "Underweight (BB Kurang + BB Sangat Kurang) — BB/U < -2 SD",
                "Overweight (Risiko BB Lebih + BB Lebih + Obesitas) — BB/TB > +2 SD",
                "Persentase Insiden Kasus Stunting Baru",
            ],
        },
        {
            title: "Analisis Pertumbuhan (EPPGBM Analysis)",
            desc: "Electronic Pencatatan Pelaporan Gizi Berbasis Masyarakat",
            icon: "query_stats",
            color: "text-amber-600",
            gradient: "from-amber-500 to-amber-700",
            subIndicators: [
                "Informasi Data EPPGBM",
                "Distribusi Data EPPGBM",
                "Distribusi Z-Score Analysis",
                "Analisis Z-Score Flag",
                "Analisis Trend Pertumbuhan EPPGBM",
                "Daftar Balita Bermasalah",
                "Analisis Longitudinal Balita",
            ],
        },
        {
            title: "AI Analytics",
            desc: "Kecerdasan buatan untuk penguatan kebijakan berbasis data",
            icon: "auto_awesome",
            color: "text-cyan-600",
            gradient: "from-cyan-500 to-teal-700",
            subIndicators: [
                "Analisis Prediktif Tren Prevalensi Gizi",
                "Deteksi Anomali dan Early Warning System",
                "Rekomendasi Intervensi Berbasis Machine Learning",
                "Scoring Risiko Wilayah Prioritas",
                "Forecasting Kebutuhan Sumber Daya",
            ],
        },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-display selection:bg-emerald-100 selection:text-emerald-900">

            {/* ─── Navigation ──────────────────────────────────────────── */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? "bg-white/90 backdrop-blur-xl shadow-sm border-b border-slate-100/50" : "bg-transparent"}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white border border-slate-100 shadow-md p-1">
                                <Image src="/sigma_logo.png" alt="SIGMA Logo" fill className="object-contain" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-extrabold text-lg tracking-tight text-slate-900 leading-none">SIGMA</span>
                                <span className="text-[9px] text-emerald-600 font-bold tracking-[0.2em] uppercase font-mono">RCS Dashboard</span>
                            </div>
                        </Link>

                        <div className="hidden md:flex items-center gap-6">
                            <a href="#features" className="text-[11px] font-semibold text-slate-500 hover:text-emerald-600 transition-colors uppercase tracking-wide">Fitur</a>
                            <a href="#indicators" className="text-[11px] font-semibold text-slate-500 hover:text-emerald-600 transition-colors uppercase tracking-wide">Indikator</a>
                            <a href="#architecture" className="text-[11px] font-semibold text-slate-500 hover:text-emerald-600 transition-colors uppercase tracking-wide">Arsitektur</a>
                            <Link
                                href="/login"
                                className="px-6 py-2.5 rounded-full bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transform hover:-translate-y-0.5 uppercase tracking-wider flex items-center gap-2"
                            >
                                <span className="material-icons-round text-sm">login</span>
                                Akses Dashboard
                            </Link>
                        </div>

                        <button className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">
                            <span className="material-icons-round">menu</span>
                        </button>
                    </div>
                </div>
            </nav>

            <main className="flex-1 pt-20">

                {/* ─── Hero Section ────────────────────────────────────── */}
                <section className="relative w-full pt-16 pb-24 lg:pt-28 lg:pb-36 overflow-hidden">
                    <DataGridBackground />

                    {/* Gradient orbs */}
                    <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-emerald-100/50 rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-100/40 rounded-full blur-[120px]"></div>

                    <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8">
                        <div className="flex flex-col lg:flex-row items-center gap-16">

                            {/* Left: Text Content */}
                            <div className="lg:w-1/2 text-center lg:text-left">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 shadow-sm mb-8">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-700 uppercase font-mono">
                                        Responsive Comprehensive Surveillance
                                    </span>
                                </div>

                                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-slate-900 mb-2 tracking-tighter leading-[0.9]">
                                    SIGMA
                                </h1>
                                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6 tracking-tighter leading-[0.9]">
                                    <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
                                        RCS
                                    </span>
                                </h2>

                                <p className="text-lg text-slate-600 max-w-xl leading-relaxed mb-8">
                                    Dashboard analitik surveilans gizi komprehensif yang<br className="hidden lg:block" />
                                    <span className="font-semibold text-emerald-700"> me-mirror data dari SIGIZI KESGA</span> untuk monitoring
                                    stunting, wasting, dan underweight secara real-time di seluruh Kabupaten Malang.
                                </p>

                                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                    <Link
                                        href="/login"
                                        className="px-8 py-4 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-1 flex items-center justify-center gap-3 group"
                                    >
                                        <span className="material-icons-round text-lg">dashboard</span>
                                        Akses Dashboard
                                        <span className="material-icons-round text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                    </Link>
                                    <a
                                        href="#features"
                                        className="px-8 py-4 rounded-xl bg-white text-slate-700 font-bold text-xs uppercase tracking-widest border border-slate-200 hover:bg-slate-50 hover:border-emerald-200 transition-all shadow-sm hover:shadow-md hover:-translate-y-1 flex items-center justify-center gap-2"
                                    >
                                        Pelajari Fitur
                                        <span className="material-icons-round text-lg text-slate-400">expand_more</span>
                                    </a>
                                </div>
                            </div>

                            {/* Right: Stats Preview — LIVE DATA */}
                            <div className="lg:w-1/2 w-full max-w-md">
                                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-100 shadow-2xl shadow-emerald-100/20">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                                        <span className="text-[10px] font-mono text-slate-400 ml-auto uppercase tracking-wider flex items-center gap-1.5">
                                            {liveStats.loaded && (
                                                <span className="relative flex h-1.5 w-1.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                                </span>
                                            )}
                                            Live Dashboard Preview
                                        </span>
                                    </div>

                                    {/* Main stat */}
                                    <div className="mb-6">
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <span className="text-3xl font-black text-slate-900">
                                                {liveStats.stunting}<span className="text-lg">%</span>
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                                            Prevalensi Stunting • {liveStats.period}
                                        </p>
                                    </div>

                                    {/* Spark bars from real per-puskesmas data */}
                                    <div className="flex items-end gap-1 h-20 mb-6">
                                        {liveStats.sparkBars.map((h, i) => (
                                            <div
                                                key={i}
                                                className="flex-1 rounded-t-sm transition-all duration-700"
                                                style={{
                                                    height: `${h}%`,
                                                    background: h > 50
                                                        ? "linear-gradient(to top, #f59e0b, #ef4444)"
                                                        : "linear-gradient(to top, #10b981, #06b6d4)",
                                                    opacity: 0.6 + (i / liveStats.sparkBars.length) * 0.4,
                                                }}
                                            />
                                        ))}
                                    </div>

                                    {/* Mini stat row — LIVE */}
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: "Stunting", val: `${liveStats.stunting}%`, color: "text-emerald-600" },
                                            { label: "Wasting", val: `${liveStats.wasting}%`, color: "text-emerald-600" },
                                            { label: "Underweight", val: `${liveStats.overweight}%`, color: "text-amber-600" },
                                        ].map((s) => (
                                            <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                                                <p className={`text-lg font-black ${s.color}`}>{s.val}</p>
                                                <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">{s.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─── Key Metrics ────────────────────────────────────── */}
                <section className="py-6 bg-white border-y border-slate-100 relative z-10">
                    <div className="max-w-7xl mx-auto px-6 lg:px-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12">
                            {metrics.map((m, i) => (
                                <div key={i} className="flex items-center gap-4 py-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                                        <span className="material-icons-round text-emerald-600 text-xl">{m.icon}</span>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                                            <AnimatedCounter end={m.value} suffix={m.suffix} />
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">{m.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── Features Section ───────────────────────────────── */}
                <section id="features" className="py-24 bg-slate-50 relative">
                    <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]"></div>
                    <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
                        <div className="text-center mb-16">
                            <span className="text-emerald-600 font-bold tracking-[0.2em] text-xs uppercase mb-3 block font-mono">// Platform Features</span>
                            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                                Fitur Unggulan
                            </h2>
                            <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
                                Dashboard analitik terlengkap untuk surveilans gizi responsif di tingkat kabupaten.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {features.map((f, i) => (
                                <FeatureCard key={i} {...f} />
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── RCS Indicators (7 Indikator) ─────────────────────── */}
                <section id="indicators" className="py-24 bg-white border-t border-slate-100 relative">
                    <div className="max-w-7xl mx-auto px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <span className="text-emerald-600 font-bold tracking-[0.2em] text-xs uppercase mb-3 block font-mono">// 7 Indikator RCS</span>
                            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                                Indikator Surveilans RCS
                            </h2>
                            <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
                                Tujuh pilar indikator surveilans gizi komprehensif yang dimonitor dari data SIGIZI KESGA untuk percepatan penurunan stunting.
                            </p>
                        </div>

                        {/* Top row: 3 columns */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
                            {rcsIndicators.slice(0, 3).map((ind, i) => (
                                <IndicatorCard key={i} indicator={ind} index={i} />
                            ))}
                        </div>

                        {/* Middle row: 2 columns */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                            {rcsIndicators.slice(3, 5).map((ind, i) => (
                                <IndicatorCard key={i + 3} indicator={ind} index={i + 3} />
                            ))}
                        </div>

                        {/* Bottom row: 2 columns */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {rcsIndicators.slice(5, 7).map((ind, i) => (
                                <IndicatorCard key={i + 5} indicator={ind} index={i + 5} />
                            ))}
                        </div>
                    </div>
                </section>

                {/* ─── Architecture ───────────────────────────────────── */}
                <section id="architecture" className="py-24 bg-slate-50 border-t border-slate-100 relative">
                    <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]"></div>
                    <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
                        <div className="flex flex-col lg:flex-row gap-16 items-center">
                            <div className="lg:w-1/2">
                                <span className="text-emerald-600 font-bold tracking-[0.2em] text-xs uppercase mb-4 block font-mono">Data Flow Architecture</span>
                                <h2 className="text-4xl font-extrabold text-slate-900 mb-6 tracking-tight">
                                    Alur Data<br className="hidden lg:block" /> SIGIZI → SIGMA RCS
                                </h2>
                                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                                    Data dari aplikasi nasional SIGIZI KESGA di-mirror ke dashboard SIGMA RCS untuk analisis lokal yang lebih mendalam dan pengambilan keputusan berbasis data.
                                </p>

                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-1 group"
                                >
                                    <span className="material-icons-round">dashboard</span>
                                    Masuk ke Dashboard
                                    <span className="material-icons-round group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                </Link>
                            </div>

                            <div className="lg:w-1/2 w-full">
                                <div className="space-y-4">
                                    {[
                                        { step: "SIGIZI KESGA", desc: "Data Entry Nasional (Penimbangan, Status Gizi)", icon: "cloud_upload", borderColor: "bg-emerald-500", bgColor: "bg-emerald-50 text-emerald-600" },
                                        { step: "Data Mirroring", desc: "Sinkronisasi & Validasi Data Otomatis", icon: "sync", borderColor: "bg-blue-500", bgColor: "bg-blue-50 text-blue-600" },
                                        { step: "SIGMA RCS Engine", desc: "Analisis, Agregasi & AI Processing", icon: "memory", borderColor: "bg-indigo-500", bgColor: "bg-indigo-50 text-indigo-600" },
                                        { step: "Dashboard Analytics", desc: "Visualisasi, Peta, Tren & Early Warning", icon: "dashboard", borderColor: "bg-purple-500", bgColor: "bg-purple-50 text-purple-600" },
                                    ].map((s, i) => (
                                        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5 relative group overflow-hidden hover:border-emerald-100 transition-colors">
                                            <div className={`absolute left-0 top-0 w-1 h-full ${s.borderColor} group-hover:w-1.5 transition-all`}></div>
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${s.bgColor}`}>
                                                <span className="material-icons-round text-2xl">{s.icon}</span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm">{s.step}</h4>
                                                <p className="text-slate-500 text-xs font-mono uppercase tracking-wider">{s.desc}</p>
                                            </div>
                                            {i < 3 && (
                                                <div className="absolute -bottom-5 left-[2.3rem] w-0.5 h-5 bg-slate-200 z-0"></div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─── CTA Section ────────────────────────────────────── */}
                <section className="py-24 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 relative overflow-hidden">
                    <div className="absolute inset-0 bg-grid-pattern opacity-[0.05]"></div>
                    <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-white/5 rounded-full blur-[100px]"></div>

                    <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center relative z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-8">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-50"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                            </span>
                            <span className="text-[10px] font-bold tracking-[0.2em] text-white/90 uppercase font-mono">System Ready</span>
                        </div>

                        <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                            Mulai Pantau Data Gizi<br className="hidden md:block" /> Kabupaten Malang
                        </h2>
                        <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Akses dashboard SIGMA RCS untuk melihat data surveilans gizi terkini, analisis tren, dan early warning system per puskesmas.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href="/login"
                                className="px-10 py-5 rounded-xl bg-white text-emerald-700 font-bold text-xs uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-3 group"
                            >
                                <span className="material-icons-round text-xl">dashboard</span>
                                Akses Dashboard RCS
                                <span className="material-icons-round text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
                            </Link>
                            <Link
                                href="/"
                                className="px-10 py-5 rounded-xl bg-white/10 text-white font-bold text-xs uppercase tracking-widest border border-white/20 hover:bg-white/20 transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
                            >
                                <span className="material-icons-round text-lg">arrow_back</span>
                                Kembali ke Ecosystem
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            {/* ─── Footer ──────────────────────────────────────────── */}
            <footer className="bg-white border-t border-slate-200 py-12">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col items-center">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="relative w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-md overflow-hidden p-1">
                            <Image src="/sigma_logo.png" fill className="object-contain" alt="SIGMA Logo" />
                        </div>
                        <div>
                            <span className="font-extrabold text-lg text-slate-900">SIGMA</span>
                            <span className="text-emerald-600 font-bold text-sm ml-2">RCS</span>
                        </div>
                    </div>

                    <p className="text-slate-400 text-sm text-center max-w-md mb-8">
                        Responsive Comprehensive Surveillance — Dashboard analitik surveilans gizi untuk percepatan penurunan stunting Kabupaten Malang.
                    </p>

                    <div className="w-full h-px bg-slate-100 mb-6"></div>

                    <div className="w-full flex flex-col md:flex-row justify-between items-center text-xs text-slate-400">
                        <div className="flex gap-4 mb-3 md:mb-0">
                            <span>© 2026 Dinas Kesehatan Kabupaten Malang</span>
                            <span className="hidden md:inline">•</span>
                            <span>SIGMA Ecosystem v2.0</span>
                        </div>
                        <div>
                            Crafted with <span className="text-red-400">♥</span> by <a href="https://dedik2urniawan.github.io/" target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors">DK</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
