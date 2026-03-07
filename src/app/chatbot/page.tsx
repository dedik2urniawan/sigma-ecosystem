"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Tech Background Component - Holographic Globe & Data Rain
const TechBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = 0;
        let height = 0;

        const GLOBE_RADIUS = 340;
        const DOT_COUNT = 500;
        const DOT_SIZE = 1.6;
        const PERSPECTIVE = 1000;
        const ROTATION_SPEED = 0.0015;

        interface Point3D {
            x: number;
            y: number;
            z: number;
        }

        const globePoints: Point3D[] = [];

        for (let i = 0; i < DOT_COUNT; i++) {
            const phi = Math.acos(-1 + (2 * i) / DOT_COUNT);
            const theta = Math.sqrt(DOT_COUNT * Math.PI) * phi;

            globePoints.push({
                x: GLOBE_RADIUS * Math.cos(theta) * Math.sin(phi),
                y: GLOBE_RADIUS * Math.sin(theta) * Math.sin(phi),
                z: GLOBE_RADIUS * Math.cos(phi)
            });
        }

        const columns = Math.floor(window.innerWidth / 20);
        const drops: number[] = [];
        const chars = "10";

        for (let i = 0; i < columns; i++) {
            drops[i] = Math.random() * -100;
        }

        let rotationAngle = 0;

        const setSize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };
        setSize();

        const draw = () => {
            ctx.clearRect(0, 0, width, height);

            ctx.strokeStyle = "rgba(99, 102, 241, 0.025)";
            ctx.lineWidth = 1;
            const gridSize = 80;

            for (let x = 0; x <= width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }

            ctx.font = "12px monospace";
            for (let i = 0; i < drops.length; i++) {
                const text = chars.charAt(Math.floor(Math.random() * chars.length));

                ctx.fillStyle = Math.random() > 0.995 ? "rgba(99, 102, 241, 0.4)" : "rgba(148, 163, 184, 0.1)";
                ctx.fillText(text, i * 20, drops[i] * 20);

                if (drops[i] * 20 > height && Math.random() > 0.99) {
                    drops[i] = 0;
                }

                drops[i] += 0.25;
            }

            rotationAngle += ROTATION_SPEED;

            const isDesktop = width >= 1024;
            const cx = isDesktop ? width * 0.75 : width / 2;
            const cy = isDesktop ? height / 2.2 : height / 2.5;

            globePoints.forEach((point) => {
                const rotatedX = point.x * Math.cos(rotationAngle) - point.z * Math.sin(rotationAngle);
                const rotatedZ = point.x * Math.sin(rotationAngle) + point.z * Math.cos(rotationAngle);

                const tiltAngle = 0.2;
                const y_tilted = point.y * Math.cos(tiltAngle) - rotatedZ * Math.sin(tiltAngle);
                const z_tilted = point.y * Math.sin(tiltAngle) + rotatedZ * Math.cos(tiltAngle);

                const scale = PERSPECTIVE / (PERSPECTIVE + z_tilted);
                const x2d = (rotatedX * scale) + cx;
                const y2d = (y_tilted * scale) + cy;

                const alpha = Math.max(0, (scale - 0.4) * 1.5);
                const isFront = z_tilted < 0;

                if (isFront && alpha > 0.1) {
                    ctx.fillStyle = `rgba(147, 51, 234, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(x2d, y2d, DOT_SIZE * scale, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(0.2);
            ctx.beginPath();
            ctx.ellipse(0, 0, GLOBE_RADIUS * 1.5, GLOBE_RADIUS * 0.5, rotationAngle * 0.2, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(147, 51, 234, 0.08)";
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.beginPath();
            ctx.ellipse(0, 0, GLOBE_RADIUS * 1.6, GLOBE_RADIUS * 0.55, -rotationAngle * 0.1, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(99, 102, 241, 0.05)";
            ctx.stroke();
            ctx.restore();

            requestAnimationFrame(draw);
        };

        const animationFrame = requestAnimationFrame(draw);
        window.addEventListener("resize", setSize);

        return () => {
            cancelAnimationFrame(animationFrame);
            window.removeEventListener("resize", setSize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-0 opacity-100 pointer-events-none"
        />
    );
};

const CornerAccent = () => (
    <>
        <div className="absolute top-0 left-0 w-3 h-3 md:w-4 md:h-4 border-l-2 border-t-2 border-slate-200 rounded-tl-lg group-hover:border-purple-500 transition-colors duration-300"></div>
        <div className="absolute top-0 right-0 w-3 h-3 md:w-4 md:h-4 border-r-2 border-t-2 border-slate-200 rounded-tr-lg group-hover:border-purple-500 transition-colors duration-300"></div>
        <div className="absolute bottom-0 left-0 w-3 h-3 md:w-4 md:h-4 border-l-2 border-b-2 border-slate-200 rounded-bl-lg group-hover:border-purple-500 transition-colors duration-300"></div>
        <div className="absolute bottom-0 right-0 w-3 h-3 md:w-4 md:h-4 border-r-2 border-b-2 border-slate-200 rounded-br-lg group-hover:border-purple-500 transition-colors duration-300"></div>
    </>
);

export default function ChatbotLanding() {
    const router = useRouter();

    return (
        <div className="flex flex-col min-h-screen relative overflow-hidden bg-slate-50 text-slate-800 font-display selection:bg-purple-100 selection:text-purple-900">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100/50 shadow-sm transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <Link href="/" className="flex items-center gap-3">
                            <div className="relative w-11 h-11 shadow-lg shadow-purple-100 rounded-xl overflow-hidden bg-white flex items-center justify-center border border-slate-100 p-1 group cursor-pointer hover:shadow-purple-200 transition-shadow">
                                <Image
                                    src="/sigma_logo.png"
                                    alt="SIGMA Logo"
                                    fill
                                    className="object-contain group-hover:scale-105 transition-transform duration-500"
                                />
                            </div>
                            <div className="flex flex-col justify-center">
                                <h1 className="font-extrabold text-xl tracking-tight text-slate-900 leading-none">
                                    SIGMA
                                </h1>
                                <p className="text-[10px] text-purple-600 font-bold tracking-[0.2em] uppercase mt-0.5 font-mono">
                                    ADVISOR
                                </p>
                            </div>
                        </Link>
                        <div className="hidden md:flex items-center gap-8">
                            <Link href="/chatbot/login" className="px-6 py-2.5 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-purple-600 transition-all shadow-lg shadow-slate-200 hover:shadow-purple-200 transform hover:-translate-y-0.5 uppercase tracking-wider flex items-center gap-2">
                                <span className="material-icons-round text-sm">login</span>
                                Masuk Chatbot
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="flex-1 relative pt-20">
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-100/40 rounded-full blur-[120px] mix-blend-multiply animate-blob"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-100/40 rounded-full blur-[120px] mix-blend-multiply animate-blob animation-delay-2000"></div>
                </div>

                {/* Hero Section */}
                <section className="relative w-full pt-16 pb-24 lg:pt-32 lg:pb-36 overflow-hidden">
                    <TechBackground />

                    <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8 text-center flex flex-col items-center">
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/40 backdrop-blur-sm border border-slate-200/60 shadow-sm mb-8 animate-fade-in-up hover:bg-white/60 transition-colors cursor-default">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                            </span>
                            <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] text-slate-600 uppercase font-mono">
                                Powered by Gemini 1.5 Flash
                            </span>
                        </div>

                        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-slate-900 mb-6 tracking-tighter leading-none relative drop-shadow-sm select-none">
                            SIGMA<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500">
                                ADVISOR
                            </span>
                        </h1>

                        <p className="text-xl sm:text-2xl md:text-3xl font-light text-slate-400 tracking-[0.5em] uppercase mb-10 font-mono">
                            Chatbot AI
                        </p>

                        <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mb-12 font-medium">
                            Asisten gizi interaktif berbantuan AI. Temukan insight data, analisis tren stunting, dan rekomendasi langkah operasional dengan bertanya ke sistem <span className="font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 shadow-sm">SIGMA Ecosystem</span>.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
                            <Link
                                href="/chatbot/login"
                                className="flex-1 px-8 py-4 rounded-xl bg-purple-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-200 hover:shadow-purple-300 hover:-translate-y-1 flex items-center justify-center gap-2 group"
                            >
                                Mulai Percakapan
                                <span className="material-icons-round text-lg group-hover:translate-x-1 transition-transform">smart_toy</span>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Data Sources Section */}
                <section className="py-24 bg-white relative z-10 border-t border-slate-100/50">
                    <div className="max-w-7xl mx-auto px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-widest mb-6 border border-indigo-100 font-mono shadow-sm">
                                Retrieval-Augmented Generation
                            </div>
                            <h2 className="text-4xl font-extrabold text-slate-900 mb-6 tracking-tight">
                                Terhubung dengan Data Valid
                            </h2>
                            <p className="text-lg text-slate-500 max-w-3xl mx-auto leading-relaxed">
                                Jawaban SIGMA Advisor berasal secara terstruktur dari dua sumber data utama yang diverifikasi.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 flex flex-col h-full relative overflow-hidden transition-all hover:bg-white hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100 group">
                                <CornerAccent />
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-emerald-200">
                                    <span className="material-icons-round text-3xl">analytics</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-700 mb-3 group-hover:text-emerald-600 transition-colors">SIGMA RCS</h3>
                                <p className="text-slate-500 text-sm leading-relaxed mb-6 flex-grow transition-colors">
                                    Responsive Comprehensive Surveillance. AI mengambil pemahaman mengenai:
                                </p>
                                <ul className="space-y-3">
                                    {[
                                        "Indikator Pelayanan Kesehatan & Insiden Stunting",
                                        "Indikator Balita Gizi (Berat, Tinggi, Z-score)",
                                        "Aggregasi data dari 39 Puskesmas",
                                    ].map((list, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-slate-500">
                                            <span className="material-icons-round text-emerald-500 text-sm">check_circle</span>
                                            {list}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 flex flex-col h-full relative overflow-hidden transition-all hover:bg-white hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100 group">
                                <CornerAccent />
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-blue-200">
                                    <span className="material-icons-round text-3xl">medical_services</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-700 mb-3 group-hover:text-blue-600 transition-colors">SIGMA PKMK</h3>
                                <p className="text-slate-500 text-sm leading-relaxed mb-6 flex-grow transition-colors">
                                    Pemberian Makanan Tambahan Khusus. AI mengambil pemahaman mengenai:
                                </p>
                                <ul className="space-y-3">
                                    {[
                                        "Daftar Redflag Balita (Status Gizi Buruk)",
                                        "Data Kohort Pemantauan Antropometri",
                                        "Detail Riwayat PKMK (Dosis Konsumsi, Jenis Formulasi)",
                                    ].map((list, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-slate-500">
                                            <span className="material-icons-round text-blue-500 text-sm">check_circle</span>
                                            {list}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
