"use client";

import Link from "next/link";
import Image from "next/image";

export default function UnauthorizedPage() {
    return (
        <div className="flex min-h-screen bg-slate-950 items-center justify-center px-6 font-display">
            <div className="text-center max-w-md">
                {/* Icon */}
                <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-8">
                    <span className="material-icons-round text-red-400 text-4xl">lock</span>
                </div>

                {/* Status */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest font-mono">403 — Unauthorized</span>
                </div>

                <h1 className="text-3xl font-black text-white mb-4 tracking-tight">
                    Akses Ditolak
                </h1>
                <p className="text-slate-400 text-sm leading-relaxed mb-8">
                    Akun Anda tidak memiliki akses ke modul ini. Hubungi administrator untuk mendapatkan izin akses.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/sso/login"
                        className="px-6 py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-icons-round text-sm">login</span>
                        Ganti Akun
                    </Link>
                    <Link
                        href="/"
                        className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-icons-round text-sm">home</span>
                        Beranda
                    </Link>
                </div>

                {/* Support */}
                <div className="mt-8 p-4 rounded-xl bg-white/3 border border-white/8">
                    <p className="text-xs text-slate-500">
                        Butuh bantuan?{" "}
                        <a href="https://wa.me/6281216354887" target="_blank" rel="noopener noreferrer"
                            className="text-green-500 font-semibold hover:text-green-400">
                            Hubungi via WhatsApp
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
