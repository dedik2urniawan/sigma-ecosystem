"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const ENDPOINTS = [
    {
        method: "GET", path: "/api/rcs/v1/pelayanan-kesehatan",
        label: "Indikator Pelayanan Kesehatan", status: "OPEN",
        badgeClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        dot: "bg-emerald-400",
        desc: "Data capaian layanan kesehatan balita per bulan dan per puskesmas",
    },
    {
        method: "GET", path: "/api/rcs/v1/balita-gizi",
        label: "Indikator Balita Gizi", status: "ON PROCESS",
        badgeClass: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        dot: "bg-amber-400",
        desc: "Data status gizi balita: stunting, wasting, underweight per puskesmas",
    },
    {
        method: "GET", path: "/api/rcs/v1/balita-kia",
        label: "Indikator Balita KIA", status: "ON DEVELOPMENT",
        badgeClass: "bg-slate-500/20 text-slate-400 border-slate-500/30",
        dot: "bg-slate-500",
        desc: "Kesehatan ibu dan anak pada periode neonatal dan balita",
    },
    {
        method: "GET", path: "/api/rcs/v1/ibu-hamil",
        label: "Indikator Ibu Hamil", status: "ON DEVELOPMENT",
        badgeClass: "bg-slate-500/20 text-slate-400 border-slate-500/30",
        dot: "bg-slate-500",
        desc: "Monitoring kesehatan dan status gizi ibu hamil",
    },
    {
        method: "GET", path: "/api/rcs/v1/remaja-putri",
        label: "Indikator Remaja Putri", status: "ON DEVELOPMENT",
        badgeClass: "bg-slate-500/20 text-slate-400 border-slate-500/30",
        dot: "bg-slate-500",
        desc: "Surveilans status gizi dan anemia remaja putri",
    },
];

const HOW_STEPS = [
    {
        num: "01",
        title: "Ajukan Akses",
        desc: "Kirim permohonan akses ke Dinas Kesehatan disertai MoU data sharing yang telah disetujui.",
        icon: "📋",
        color: "from-indigo-500 to-indigo-600",
    },
    {
        num: "02",
        title: "Dapatkan API Key",
        desc: "Setelah diverifikasi, Anda mendapat API Key unik. Jadikan rahasia dan jangan dibagikan.",
        icon: "🔑",
        color: "from-purple-500 to-purple-600",
    },
    {
        num: "03",
        title: "Fetch Data via GET",
        desc: "Sertakan API Key di header setiap request. Hanya metode GET yang tersedia — data aman.",
        icon: "⚡",
        color: "from-emerald-500 to-emerald-600",
    },
];

// Animated typing cursor for code block
function CodeDemo() {
    const lines = [
        { text: "GET /api/rcs/v1/pelayanan-kesehatan?tahun=2024", color: "text-emerald-300" },
        { text: "Host: sigma-ecosystem.vercel.app", color: "text-slate-400" },
        { text: "X-API-Key: sigma_live_*************************", color: "text-yellow-300" },
        { text: "", color: "" },
        { text: '{ "success": true,', color: "text-slate-300" },
        { text: '  "data": [ ... 1,250 records ],', color: "text-indigo-300" },
        { text: '  "meta": { "source": "SIGMA RCS", ... }', color: "text-purple-300" },
        { text: "}", color: "text-slate-300" },
    ];
    const [visibleLines, setVisibleLines] = useState(0);
    useEffect(() => {
        if (visibleLines < lines.length) {
            const t = setTimeout(() => setVisibleLines(v => v + 1), 300);
            return () => clearTimeout(t);
        }
    }, [visibleLines]);
    return (
        <div className="bg-black/50 rounded-2xl p-6 font-mono text-xs border border-white/10 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
                <span className="text-slate-500 text-[10px] ml-2 font-sans">HTTP Request → Response</span>
            </div>
            <div className="space-y-1.5">
                {lines.slice(0, visibleLines).map((l, i) => (
                    <p key={i} className={`${l.color} transition-opacity duration-300`}>{l.text || "\u00A0"}</p>
                ))}
                {visibleLines < lines.length && <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse" />}
            </div>
        </div>
    );
}

export default function ApiGatewayLanding() {
    return (
        <div className="min-h-screen bg-[#060b18] text-white">
            {/* BG */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.04)_1px,transparent_1px)] bg-[size:40px_40px]" />
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]" />
            </div>

            {/* Nav */}
            <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#060b18]/90 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <a href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <span className="text-white text-sm font-black">Σ</span>
                            </div>
                            <span className="text-white font-black text-sm">SIGMA</span>
                        </a>
                        <span className="text-slate-700">/</span>
                        <span className="text-indigo-400 text-sm font-bold">API Gateway</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <a href="#endpoints" className="text-slate-400 hover:text-white text-xs font-medium transition-colors hidden sm:block">Endpoints</a>
                        <a href="#cara-kerja" className="text-slate-400 hover:text-white text-xs font-medium transition-colors hidden sm:block">Cara Kerja</a>
                        <Link href="/api-gateway/portal"
                            className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/20">
                            Portal Login →
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="relative z-10">
                {/* HERO */}
                <section className="pt-24 pb-20 px-6">
                    <div className="max-w-5xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-8 uppercase tracking-widest">
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
                            SIGMA Ecosystem — Data Sharing API
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tight">
                            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">SIGMA</span>
                            <br />
                            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">API Gateway</span>
                        </h1>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-4 leading-relaxed">
                            Portal data sharing <span className="text-white font-semibold">standar, aman, dan cepat</span> antara SIGMA Ecosystem
                            dengan mitra pihak ketiga — Diskominfo, peneliti, dan sistem integrasi daerah.
                        </p>
                        <p className="text-sm text-slate-500 mb-10">
                            Read-only access · REST API · API Key Auth · Rate limiting · Audit trail
                        </p>
                        <div className="flex flex-wrap gap-4 justify-center">
                            <Link href="/api-gateway/portal"
                                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all shadow-xl shadow-indigo-500/20 hover:-translate-y-0.5">
                                Masuk ke Portal →
                            </Link>
                            <a href="#endpoints"
                                className="px-8 py-4 bg-white/5 text-slate-300 font-bold text-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all hover:-translate-y-0.5">
                                Lihat Endpoints ↓
                            </a>
                        </div>
                    </div>
                </section>

                {/* Data Source Diagram */}
                <section className="py-16 px-6">
                    <div className="max-w-5xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-8 items-center">
                            <div>
                                <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest block mb-3">Data Architecture</span>
                                <h2 className="text-3xl font-black mb-4 text-white">Dua Sumber Data <br />Satu Gateway</h2>
                                <p className="text-slate-400 mb-6 leading-relaxed">
                                    SIGMA API Gateway mengagregasi data dari dua database utama:
                                    <strong className="text-white"> SIGMA RCS</strong> (surveilans gizi komprehensif) dan
                                    <strong className="text-white"> SIGMA PKMK</strong> (monitoring intervensi) — disajikan melalui satu endpoint yang konsisten.
                                </p>
                                <div className="space-y-3">
                                    {[
                                        { label: "SIGMA RCS", desc: "5 Indikator Utama + AI Analytics", color: "indigo", ready: true },
                                        { label: "SIGMA PKMK", desc: "Monitoring Intervensi Balita", color: "purple", ready: false },
                                    ].map(src => (
                                        <div key={src.label} className={`flex items-center gap-4 p-4 rounded-xl border ${src.ready ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-white/3 border-white/10'}`}>
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${src.ready ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-500/20 text-slate-500'}`}>
                                                Σ
                                            </div>
                                            <div>
                                                <p className="text-white font-bold text-sm">{src.label}</p>
                                                <p className="text-slate-400 text-xs">{src.desc}</p>
                                            </div>
                                            <span className={`ml-auto text-[10px] font-bold px-2 py-1 rounded-full border ${src.ready ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                                                {src.ready ? "AKTIF" : "COMING SOON"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <CodeDemo />
                        </div>
                    </div>
                </section>

                {/* Read-Only Banner */}
                <section className="py-6 px-6">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex flex-wrap items-center gap-6 justify-center bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
                            <span className="text-2xl">🔒</span>
                            <div>
                                <p className="text-amber-400 font-bold text-sm">Read-Only API — Hanya metode GET</p>
                                <p className="text-slate-400 text-xs mt-1">Pihak ketiga hanya dapat membaca data. POST, PUT, DELETE tidak diizinkan untuk menjaga integritas data SIGMA.</p>
                            </div>
                            <div className="flex gap-2 ml-auto">
                                {["GET ✅", "POST ❌", "PUT ❌", "DELETE ❌"].map(m => (
                                    <span key={m} className={`text-[11px] font-bold px-3 py-1 rounded-lg border font-mono ${m.includes("✅") ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/10 text-red-400/60 border-red-500/20 line-through"}`}>
                                        {m.replace(" ✅", "").replace(" ❌", "")} {m.includes("✅") ? "✅" : "❌"}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Endpoints */}
                <section id="endpoints" className="py-16 px-6">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-12">
                            <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest block mb-3">Available Endpoints</span>
                            <h2 className="text-3xl font-black text-white mb-3">SIGMA RCS Endpoints</h2>
                            <p className="text-slate-400 text-sm">5 indikator utama kesehatan — dibuka secara bertahap</p>
                        </div>
                        <div className="space-y-3">
                            {ENDPOINTS.map((ep, i) => (
                                <div key={i} className="flex flex-wrap md:flex-nowrap items-center gap-4 p-5 bg-white/3 border border-white/5 rounded-2xl hover:border-white/10 hover:bg-white/5 transition-all group">
                                    <div className="flex items-center gap-3 min-w-[120px]">
                                        <span className={`w-2 h-2 rounded-full ${ep.dot} ${ep.status === 'OPEN' ? 'animate-pulse' : ''}`} />
                                        <span className="text-indigo-400 font-mono text-xs bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">{ep.method}</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white font-semibold text-sm">{ep.label}</p>
                                        <p className="text-slate-500 font-mono text-xs mt-0.5">{ep.path}</p>
                                        <p className="text-slate-400 text-xs mt-1">{ep.desc}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full border shrink-0 ${ep.badgeClass}`}>
                                        {ep.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* How it works */}
                <section id="cara-kerja" className="py-16 px-6 bg-white/2 border-t border-white/5">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-12">
                            <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest block mb-3">How It Works</span>
                            <h2 className="text-3xl font-black text-white">Cara Menggunakan API</h2>
                        </div>
                        <div className="grid md:grid-cols-3 gap-6">
                            {HOW_STEPS.map((step) => (
                                <div key={step.num} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden hover:border-white/20 transition-all">
                                    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${step.color} opacity-5 rounded-bl-full`} />
                                    <span className="text-4xl mb-4 block">{step.icon}</span>
                                    <div className="text-xs font-bold text-slate-500 font-mono mb-2">{step.num}</div>
                                    <h3 className="text-white font-bold text-lg mb-3">{step.title}</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section className="py-16 px-6">
                    <div className="max-w-5xl mx-auto">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { icon: "🔐", label: "API Key Auth", desc: "Setiap mitra mendapat token unik" },
                                { icon: "⚡", label: "Fast Response", desc: "< 200ms average latency" },
                                { icon: "📊", label: "Rate Limiting", desc: "1000 req/hari per key" },
                                { icon: "📋", label: "Audit Trail", desc: "Setiap request dicatat" },
                            ].map(f => (
                                <div key={f.label} className="bg-white/3 border border-white/5 rounded-2xl p-5 text-center hover:bg-white/5 transition-all">
                                    <div className="text-2xl mb-3">{f.icon}</div>
                                    <p className="text-white font-bold text-sm mb-1">{f.label}</p>
                                    <p className="text-slate-500 text-xs">{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-20 px-6">
                    <div className="max-w-2xl mx-auto text-center">
                        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-3xl p-10">
                            <h2 className="text-3xl font-black text-white mb-4">Mulai Integrasi Sekarang</h2>
                            <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                                Sudah memiliki akun mitra? Masuk ke portal untuk mendapatkan API Key dan mulai mengakses data SIGMA RCS.
                            </p>
                            <Link href="/api-gateway/portal"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all shadow-xl shadow-indigo-500/30 hover:-translate-y-0.5 text-sm">
                                Masuk ke Portal API Gateway →
                            </Link>

                            <div className="mt-10 mx-auto max-w-sm">
                                <a href="https://wa.me/6281216354887" target="_blank" rel="noopener noreferrer"
                                    className="group flex flex-row items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 transition-all">
                                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
                                        <svg viewBox="0 0 24 24" className="w-10 h-10 fill-[#25D366] group-hover:scale-110 transition-transform">
                                            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.533 1.09 3.555l-.46 1.879 1.954-.482c.981.603 2.115.922 3.284.922h.001c3.18 0 5.767-2.587 5.768-5.766s-2.587-5.768-5.769-5.768v.001A5.76 5.76 0 0 0 12.031 6.173z M12.031 2.052A10.038 10.038 0 0 1 22.062 12.083A10.038 10.038 0 0 1 12.031 22.114a10.032 10.032 0 0 1-5.118-1.396L2.348 21.903l1.196-4.577a10.026 10.026 0 0 1-1.512-5.242A10.037 10.037 0 0 1 12.031 2.053v-.001z M17.062 14.654c-.276-.138-1.631-.806-1.884-.897-.253-.092-.437-.138-.621.138-.184.276-.713.897-.874 1.081-.161.184-.322.207-.598.069-.276-.138-1.164-.429-2.217-1.368-.819-.731-1.371-1.636-1.533-1.912-.161-.276-.017-.425.121-.563.125-.125.276-.322.414-.483.138-.161.184-.276.276-.46.092-.184.046-.345-.023-.483-.069-.138-.621-1.496-.851-2.048-.222-.533-.448-.46-.621-.468l-.529-.008c-.184 0-.483.069-.736.345-.253.276-.966.944-.966 2.3 0 1.357.989 2.668 1.127 2.852.138.184 1.944 2.967 4.715 4.162.66.285 1.176.455 1.579.582.66.21 1.26.18 1.737.109.533-.079 1.631-.667 1.861-1.311.23-.644.23-1.196.161-1.311-.069-.115-.253-.184-.529-.322z" />
                                        </svg>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-white font-bold text-[15px] mb-0.5">Butuh Bantuan?</p>
                                        <p className="text-slate-400 text-[13px] m-0">Hubungi via WhatsApp — <span className="text-[#25D366] font-bold">+6281216354887</span></p>
                                    </div>
                                </a>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 py-8 px-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-[10px] font-black">Σ</span>
                    </div>
                    <span className="text-slate-400 text-xs">SIGMA API Gateway — Dinas Kesehatan Kabupaten Malang</span>
                </div>
                <p className="text-slate-600 text-[10px]">v1.0 · Read-Only Data API · 2026</p>
            </footer>
        </div>
    );
}
