"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";

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

    // Globe parameters
    const GLOBE_RADIUS = 340; // Increased size to be more prominent
    const DOT_COUNT = 500; // Denser
    const DOT_SIZE = 1.6;
    const PERSPECTIVE = 1000; // Flatter perspective
    const ROTATION_SPEED = 0.0015; // Very slow, majestic rotation

    interface Point3D {
      x: number;
      y: number;
      z: number;
    }

    const globePoints: Point3D[] = [];

    // Initialize Globe Points (Fibonacci Sphere for even distribution)
    for (let i = 0; i < DOT_COUNT; i++) {
      const phi = Math.acos(-1 + (2 * i) / DOT_COUNT);
      const theta = Math.sqrt(DOT_COUNT * Math.PI) * phi;

      globePoints.push({
        x: GLOBE_RADIUS * Math.cos(theta) * Math.sin(phi),
        y: GLOBE_RADIUS * Math.sin(theta) * Math.sin(phi),
        z: GLOBE_RADIUS * Math.cos(phi)
      });
    }

    // Rain Parameters
    const columns = Math.floor(window.innerWidth / 20);
    const drops: number[] = [];
    const chars = "10";

    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100;
    }

    let rotationAngle = 0;

    // Resize Handler
    const setSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    setSize();

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // --- 1. Draw Slow Grid Background ---
      ctx.strokeStyle = "rgba(99, 102, 241, 0.025)"; // Even more subtle
      ctx.lineWidth = 1;
      const gridSize = 80;

      // Perspective Grid (Mock)
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // --- 2. Draw Slow Binary Rain (Background Layer) ---
      ctx.font = "12px monospace";
      for (let i = 0; i < drops.length; i++) {
        // Slower speed: only update 50% of frames or reduce increment
        // Here we keep increment small
        const text = chars.charAt(Math.floor(Math.random() * chars.length));

        ctx.fillStyle = Math.random() > 0.995 ? "rgba(99, 102, 241, 0.4)" : "rgba(148, 163, 184, 0.1)";
        ctx.fillText(text, i * 20, drops[i] * 20);

        if (drops[i] * 20 > height && Math.random() > 0.99) {
          drops[i] = 0;
        }

        drops[i] += 0.25; // Slower rain
      }

      // --- 3. Draw Rotating Globe (Right Aligned on Desktop) ---
      rotationAngle += ROTATION_SPEED;

      const isDesktop = width >= 1024;
      const cx = isDesktop ? width * 0.75 : width / 2; // Offset to right on desktop
      const cy = isDesktop ? height / 2.2 : height / 2.5; // Slightly adjusted vertical center

      globePoints.forEach((point) => {
        // Rotation Y
        const rotatedX = point.x * Math.cos(rotationAngle) - point.z * Math.sin(rotationAngle);
        const rotatedZ = point.x * Math.sin(rotationAngle) + point.z * Math.cos(rotationAngle);

        // Tilt the globe slightly on X axis for better 3D effect
        const tiltAngle = 0.2;
        const y_tilted = point.y * Math.cos(tiltAngle) - rotatedZ * Math.sin(tiltAngle);
        const z_tilted = point.y * Math.sin(tiltAngle) + rotatedZ * Math.cos(tiltAngle);

        // 3D Projection
        const scale = PERSPECTIVE / (PERSPECTIVE + z_tilted);
        const x2d = (rotatedX * scale) + cx;
        const y2d = (y_tilted * scale) + cy;

        // Draw Point
        const alpha = Math.max(0, (scale - 0.4) * 1.5); // Fade out back points
        const isFront = z_tilted < 0; // Negative Z is closer

        // Only draw lines if point is somewhat in front (optimization & aesthetics)
        if (isFront && alpha > 0.1) {
          // Use gradient color based on position
          ctx.fillStyle = `rgba(99, 102, 241, ${alpha})`;
          ctx.beginPath();
          ctx.arc(x2d, y2d, DOT_SIZE * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Add "Saturn Ring" effect - Tilted matching the globe
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(0.2); // Matching tilt
      ctx.beginPath();
      // Draw ellipse for ring
      ctx.ellipse(0, 0, GLOBE_RADIUS * 1.5, GLOBE_RADIUS * 0.5, rotationAngle * 0.2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(99, 102, 241, 0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Second ring, slightly offset
      ctx.beginPath();
      ctx.ellipse(0, 0, GLOBE_RADIUS * 1.6, GLOBE_RADIUS * 0.55, -rotationAngle * 0.1, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(147, 51, 234, 0.05)"; // Purple tint
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

// HUD Corner Accent Component
const CornerAccent = () => (
  <>
    <div className="absolute top-0 left-0 w-3 h-3 md:w-4 md:h-4 border-l-2 border-t-2 border-slate-200 rounded-tl-lg group-hover:border-indigo-500 transition-colors duration-300"></div>
    <div className="absolute top-0 right-0 w-3 h-3 md:w-4 md:h-4 border-r-2 border-t-2 border-slate-200 rounded-tr-lg group-hover:border-indigo-500 transition-colors duration-300"></div>
    <div className="absolute bottom-0 left-0 w-3 h-3 md:w-4 md:h-4 border-l-2 border-b-2 border-slate-200 rounded-bl-lg group-hover:border-indigo-500 transition-colors duration-300"></div>
    <div className="absolute bottom-0 right-0 w-3 h-3 md:w-4 md:h-4 border-r-2 border-b-2 border-slate-200 rounded-br-lg group-hover:border-indigo-500 transition-colors duration-300"></div>
  </>
);

// Development Status Modal
interface DevelopmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

const DevelopmentModal = ({ isOpen, onClose, title }: DevelopmentModalProps) => {
  const [email, setEmail] = useState("");

  if (!isOpen) return null;

  const handleSubscribe = () => {
    window.location.href = `mailto:dedik2urniawan@gmail.com?subject=Subscribe%20Early%20Access%20-%20${title}&body=Saya%20tertarik%20untuk%20mendapatkan%20update%20ketika%20modul%20${title}%20dirilis.%0A%0AEmail:%20${email}`;
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto font-display" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:w-full sm:max-w-lg border border-slate-200">
          {/* Top Accent Line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-400 via-emerald-500 to-blue-400 animate-pulse"></div>

          <div className="px-6 py-8 relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]"></div>

            <div className="flex flex-col items-center relative z-10">
              {/* Icon with Ring */}
              <div className="relative mb-6 group">
                <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100 to-emerald-100 rounded-full blur-lg opacity-70 group-hover:opacity-100 transition duration-1000"></div>
                <div className="relative mx-auto flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-white border border-slate-100 shadow-lg">
                  <span className="material-icons-round text-emerald-500 text-4xl animate-pulse-slow">handyman</span>
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 ring-4 ring-white shadow-sm border border-white">
                  <span className="material-icons-round text-white text-sm">sync</span>
                </span>
              </div>

              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 mb-6 shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="text-xs font-bold text-blue-700 tracking-wide uppercase font-mono">Under Development</span>
              </div>

              <h3 className="text-2xl font-bold leading-6 text-slate-800 mb-3 text-center tracking-tight">
                {title || "Modul Dalam Pengembangan"}
              </h3>

              <p className="text-sm text-slate-600 leading-relaxed text-center max-w-sm mx-auto mb-8">
                Modul ini sedang dalam tahap optimalisasi fitur untuk memastikan integrasi data yang presisi. Dapatkan notifikasi saat rilis resmi.
              </p>

              {/* Progress Bar */}
              <div className="w-full max-w-sm mx-auto bg-slate-50 p-4 rounded-xl border border-slate-100 mb-8 shadow-inner">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">System Integration</span>
                  <span className="text-[10px] font-bold text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">75%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden border border-slate-200">
                  <div className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full w-[75%] relative overflow-hidden shadow-sm">
                    <div className="absolute inset-0 bg-white/30 w-full h-full animate-[shimmer_2s_infinite] -skew-x-12"></div>
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-medium font-mono uppercase">
                  <span>Initiated</span>
                  <span>Optimization</span>
                  <span>Release</span>
                </div>
              </div>

              {/* Subscribe Form */}
              <div className="w-full max-w-sm">
                <label className="block text-xs font-bold text-slate-500 mb-2 text-left uppercase tracking-wide font-mono" htmlFor="email">
                  Early Access Notification
                </label>
                <div className="flex shadow-sm rounded-lg group focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                  <div className="relative flex-grow focus-within:z-10">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="material-icons-round text-slate-400 text-sm">mail</span>
                    </div>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      className="block w-full rounded-none rounded-l-lg border-0 py-3 pl-10 text-slate-800 bg-white ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm sm:leading-6 transition-all"
                      placeholder="email@dinkes.go.id"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSubscribe}
                    className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-lg px-5 py-2 text-sm font-bold text-white ring-1 ring-inset ring-emerald-600 hover:bg-emerald-700 bg-emerald-600 shadow-sm transition-all duration-200 focus:z-10 tracking-wide"
                  >
                    SUBSCRIBE
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-slate-50 px-4 py-4 sm:px-6 flex justify-center border-t border-slate-100">
            <button
              type="button"
              className="inline-flex w-full justify-center rounded-lg bg-white border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 sm:w-auto transition-all uppercase tracking-wider"
              onClick={onClose}
            >
              Kembali ke Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeModalTitle, setActiveModalTitle] = useState("");

  const handleOpenModal = (title: string) => {
    setActiveModalTitle(title);
    setModalOpen(true);
  };

  // Explicit App Data with static classes to ensure Tailwind picks them up
  const activeApps = [
    {
      id: "rcs",
      title: "SIGMA RCS",
      desc: "Responsive Comprehensive Surveillance System (RCS) Analytical Dashboard Mirroring from SIGIZI KESGA Apps",
      icon: "monitor_heart",
      status: "High Priority",
      cta: "Launch App",
      link: "/rcs",
      classes: {
        badge: "bg-emerald-50 text-emerald-600 border-emerald-100",
        dot: "bg-emerald-500",
        iconBg: "bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-200",
        button: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
      }
    },
    {
      id: "calc",
      title: "SIGMA Calculator",
      desc: "Advanced nutritional value calculator & dietary planning tools.",
      icon: "calculate",
      status: "Priority",
      cta: "Open Tool",
      link: "/calculator",
      classes: {
        badge: "bg-blue-50 text-blue-600 border-blue-100",
        dot: "bg-blue-500",
        iconBg: "bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-200",
        button: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200"
      }
    },
    {
      id: "pkmk",
      title: "SIGMA PKMK",
      desc: "Dashboard Analisis Intervensi Pemberian Formulasi PKMK bagi anak stunting.",
      icon: "medical_services",
      status: "Active",
      cta: "Access Dashboard",
      link: "https://pkmk-malangkab.app/landing-page.html", // Updated Link
      classes: {
        badge: "bg-indigo-50 text-indigo-600 border-indigo-100",
        dot: "bg-indigo-500",
        iconBg: "bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-indigo-200",
        button: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
      }
    }
  ];

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-slate-50 text-slate-800 font-display selection:bg-indigo-100 selection:text-indigo-900">

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100/50 shadow-sm transition-all duration-300 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 shadow-lg shadow-indigo-100 rounded-xl overflow-hidden bg-white flex items-center justify-center border border-slate-100 p-1 group cursor-pointer hover:shadow-indigo-200 transition-shadow">
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
                <p className="text-[10px] text-indigo-600 font-bold tracking-[0.2em] uppercase mt-0.5 font-mono">
                  ECOSYSTEM
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#applications" className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-wide text-[11px]">Aplikasi</a>
              <a href="#about" className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-wide text-[11px]">Tentang</a>
              <a
                href="https://pkmk-malangkab.app/login"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2.5 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200 hover:shadow-indigo-200 transform hover:-translate-y-0.5 uppercase tracking-wider flex items-center gap-2"
              >
                <span className="material-icons-round text-sm">login</span>
                login System
              </a>
            </div>
            <button className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">
              <span className="material-icons-round">menu</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 relative pt-20">

        {/* Helper Gradients */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-100/40 rounded-full blur-[120px] mix-blend-multiply animate-blob"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-100/40 rounded-full blur-[120px] mix-blend-multiply animate-blob animation-delay-2000"></div>
        </div>

        {/* Hero Section */}
        <section className="relative w-full pt-16 pb-24 lg:pt-32 lg:pb-36 overflow-hidden">
          <TechBackground />

          <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8 text-center flex flex-col items-center">

            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/40 backdrop-blur-sm border border-slate-200/60 shadow-sm mb-8 animate-fade-in-up hover:bg-white/60 transition-colors cursor-default">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] text-slate-600 uppercase font-mono">
                Sistem Informasi Gizi Integrasi AI
              </span>
            </div>

            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-slate-900 mb-6 tracking-tighter leading-none relative drop-shadow-sm select-none">
              SIGMA
              <span className="absolute overflow-hidden inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent opacity-10 animate-pulse-slow blur-sm">
                SIGMA
              </span>
            </h1>

            <p className="text-xl sm:text-2xl md:text-3xl font-light text-slate-400 tracking-[0.5em] uppercase mb-10 font-mono">
              Ecosystem
            </p>

            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed mb-12 font-medium">
              Platform terintegrasi untuk surveilans gizi komprehensif,
              monitoring intervensi PKMK, dan analisis data kesehatan berbasis <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 shadow-sm">Artificial Intelligence</span>.
            </p>

            <div className="grid grid-cols-3 gap-4 md:gap-8 mb-16 w-full max-w-3xl">
              {[
                { val: "6", label: "Modul Aplikasi", icon: "widgets" },
                { val: "39", label: "Puskesmas", icon: "apartment" },
                { val: "AI", label: "Powered Analytics", icon: "auto_awesome", color: "text-indigo-600" }
              ].map((stat, i) => (
                <div key={i} className="bg-white/60 backdrop-blur-md rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 flex flex-col items-center hover:-translate-y-1 transition-transform duration-300 relative group overflow-hidden">
                  <CornerAccent /> {/* Tech Corner Accent */}
                  <span className={`text-4xl md:text-5xl font-black mb-1 font-mono tracking-tighter ${stat.color || "text-slate-900"}`}>{stat.val}</span>
                  <span className="text-[9px] md:text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-1 font-mono">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
              <a
                href="#applications"
                className="flex-1 px-8 py-4 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-1 flex items-center justify-center gap-2 group"
              >
                Jelajahi Aplikasi
                <span className="material-icons-round text-lg group-hover:translate-y-1 transition-transform">keyboard_arrow_down</span>
              </a>
              <a
                href="https://pkmk-malangkab.app/login"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-8 py-4 rounded-xl bg-white text-slate-700 font-bold text-xs uppercase tracking-widest border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm hover:shadow-md hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                Dashboard Area
                <span className="material-icons-round text-lg text-slate-400">login</span>
              </a>
            </div>

          </div>
        </section>

        {/* Applications Section */}
        <section id="applications" className="py-24 bg-white relative z-10 border-t border-slate-100/50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-20">
              <span className="text-indigo-600 font-bold tracking-[0.2em] text-xs uppercase mb-3 block font-mono">
                // Integrated Platform
              </span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                Ekosistem Aplikasi
              </h2>
              <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
                Teknologi terpadu untuk percepatan penurunan stunting di Kabupaten Malang.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Active Applications - Explicit Map */}
              {activeApps.map((app) => (
                <div key={app.id} className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-[0_8px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_24px_60px_rgba(0,0,0,0.08)] transition-all duration-500 group flex flex-col h-full relative overflow-hidden hover:border-indigo-100">
                  <CornerAccent />
                  <div className="absolute top-0 right-0 p-8 z-20">
                    <span className={`text-[10px] uppercase font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 tracking-wider border font-mono ${app.classes.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${app.classes.dot}`}></span>
                      {app.status}
                    </span>
                  </div>

                  <div className={`w-16 h-16 rounded-2xl text-white flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform duration-500 ${app.classes.iconBg}`}>
                    <span className="material-icons-round text-3xl">{app.icon}</span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors">{app.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-8 flex-grow font-medium">
                    {app.desc}
                  </p>

                  <div className="mt-auto">
                    <a href={app.link} className={`w-full py-4 px-6 rounded-xl text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${app.classes.button}`}>
                      {app.cta}
                      <span className="material-icons-round text-base">arrow_forward</span>
                    </a>
                  </div>
                </div>
              ))}

              {/* Dev/Future Applications */}
              {[
                { title: "API Gateway", desc: "Centralized API management for integrations.", icon: "hub", color: "indigo", status: "Dev", cta: "Access API" },
                { title: "Chatbot AI", desc: "AI-powered nutrition assistant for instant queries.", icon: "smart_toy", color: "amber", status: "Beta Soon", cta: "Try Beta" },
                { title: "Mobile App", desc: "Field reporting PWA for Posyandu cadres.", icon: "smartphone", color: "purple", status: "Roadmap", cta: "Download" }
              ].map((app, i) => (
                <div key={i} className="bg-slate-50/50 rounded-[2rem] p-8 border border-dashed border-slate-200 flex flex-col h-full relative overflow-hidden transition-all hover:bg-white hover:border-slate-300 hover:shadow-lg group">
                  <CornerAccent />
                  <div className="absolute top-0 right-0 p-8">
                    <span className={`bg-white text-slate-500 text-[10px] uppercase font-bold px-3 py-1.5 rounded-full border border-slate-100 tracking-wider font-mono`}>
                      {app.status}
                    </span>
                  </div>
                  {/* Explicit border-slate-200 to ensure visibility */}
                  <div className={`w-16 h-16 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mb-6 group-hover:text-slate-600 transition-colors`}>
                    <span className="material-icons-round text-3xl">{app.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-500 mb-3 group-hover:text-slate-800 transition-colors">{app.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-8 flex-grow group-hover:text-slate-500 transition-colors">{app.desc}</p>
                  <div className="mt-auto">
                    <button
                      onClick={() => handleOpenModal(app.title)}
                      className="w-full py-4 px-6 rounded-xl bg-white border border-slate-200 text-slate-500 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
                    >
                      <span className="material-icons-round text-sm">construction</span>
                      {app.cta}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features - Grid */}
        <section className="relative w-full py-24 bg-white overflow-hidden border-t border-slate-100/50" id="about">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-widest mb-6 border border-indigo-100 font-mono">
                Why Choose SIGMA?
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                Penguatan Kebijakan Berbasis Data
              </h2>
              <p className="text-lg text-slate-500 max-w-3xl mx-auto leading-relaxed">
                SIGMA dirancang untuk meningkatkan efisiensi, ketepatan, dan presisi dalam upaya penurunan stunting.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: "Data Terpusat", icon: "database", color: "blue", desc: "Single source of truth data gizi terintegrasi.",
                  classes: { bg: "bg-blue-50 text-blue-600 border-blue-100" }
                },
                {
                  title: "AI Insights", icon: "psychology", color: "purple", desc: "Machine learning untuk prediksi stunting.",
                  classes: { bg: "bg-purple-50 text-purple-600 border-purple-100" }
                },
                {
                  title: "Real-Time", icon: "bolt", color: "amber", desc: "Pemantauan langsung dari lapangan.",
                  classes: { bg: "bg-amber-50 text-amber-600 border-amber-100" }
                },
                {
                  title: "Keamanan", icon: "verified_user", color: "emerald", desc: "Enkripsi standar industri kesehatan.",
                  classes: { bg: "bg-emerald-50 text-emerald-600 border-emerald-100" }
                }
              ].map((feat, i) => (
                <div key={i} className={`bg-white p-8 rounded-[2rem] border border-slate-100 hover:border-indigo-100 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] transition-all duration-300 group`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${feat.classes.bg}`}>
                    <span className="material-icons-round text-2xl">{feat.icon}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{feat.title}</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Architecture - Enhanced */}
        <section className="py-24 bg-slate-50/80 border-t border-slate-100 relative">
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]"></div>
          <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
            <div className="flex flex-col lg:flex-row gap-20 items-center">
              <div className="lg:w-1/2">
                <span className="text-indigo-600 font-bold tracking-[0.2em] text-xs uppercase mb-4 block font-mono">System Architecture</span>
                <h2 className="text-4xl font-extrabold text-slate-900 mb-6">Interoperabilitas <br className="hidden lg:block" /> Terpadu</h2>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  Arsitektur modular yang menghubungkan input lapangan dengan analisis strategis tingkat kabupaten.
                </p>

                <div className="flex flex-wrap gap-2">
                  {['Modern Stack', 'Cloud Native', 'Secure API', 'Scalable DB'].map(tag => (
                    <span key={tag} className="px-3 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">{tag}</span>
                  ))}
                </div>
              </div>

              <div className="lg:w-1/2 w-full">
                <div className="space-y-4">
                  {[
                    { step: "Input Layer", desc: "Aplikasi Lapangan & Upload Excel", color: "blue", icon: "upload_file", bg: "bg-blue-50 text-blue-600", border: "bg-blue-500" },
                    { step: "Processing Core", desc: "Validasi & Normalisasi Data", color: "indigo", icon: "memory", bg: "bg-indigo-50 text-indigo-600", border: "bg-indigo-500" },
                    { step: "Intelligence Layer", desc: "AI Analysis & Visualization", color: "purple", icon: "analytics", bg: "bg-purple-50 text-purple-600", border: "bg-purple-500" }
                  ].map((s, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-6 relative group overflow-hidden hover:border-indigo-100 transition-colors">
                      <div className={`absolute left-0 top-0 w-1 h-full ${s.border} group-hover:w-1.5 transition-all`}></div>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
                        <span className="material-icons-round text-2xl">{s.icon}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{s.step}</h4>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider font-mono">{s.desc}</p>
                      </div>

                      {i < 2 && (
                        <div className="absolute -bottom-6 left-[2.9rem] w-0.5 h-6 bg-slate-200 z-0"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col items-center">

          <div className="flex items-center gap-3 mb-8">
            <div className="relative w-11 h-11 rounded-xl bg-white border border-slate-100 shadow-lg flex items-center justify-center overflow-hidden p-1">
              <Image
                src="/sigma_logo.png"
                fill
                className="object-contain"
                alt="SIGMA Logo"
              />
            </div>
            <span className="font-extrabold text-xl text-slate-900">SIGMA</span>
          </div>

          <p className="text-slate-500 text-sm text-center max-w-md mb-12">
            Sistem Informasi Gizi Kabupaten Malang untuk percepatan penurunan stunting berbasis teknologi & data presisi.
          </p>

          <div className="w-full h-px bg-slate-100 mb-8"></div>

          <div className="w-full flex flex-col md:flex-row justify-between items-center text-xs text-slate-400 font-medium">
            <div className="flex flex-col md:flex-row gap-4 mb-4 md:mb-0 text-center md:text-left">
              <span>© 2026 Dinas Kesehatan Kabupaten Malang</span>
              <span className="hidden md:inline">•</span>
              <span>v2.0.0 (Beta)</span>
            </div>
            <div>
              Crafted with <span className="text-red-400">♥</span> by <a href="#" className="font-bold text-indigo-500">DK</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Development Status Modal */}
      <DevelopmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={activeModalTitle}
      />
    </div>
  );
}
