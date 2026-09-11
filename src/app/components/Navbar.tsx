"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import SigmaLogo from "@/components/SigmaLogo";

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <nav
            className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled
                    ? "bg-white/90 backdrop-blur-md border-b border-slate-100/50"
                    : "bg-transparent"
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-20 items-center">
                    {/* Logo */}
                    <Link href="/" className="flex items-center group py-1" aria-label="SIGMA Ecosystem">
                        <SigmaLogo
                            variant="primary"
                            className="h-8 sm:h-9 md:h-10 w-auto object-contain transition-transform group-hover:scale-[1.02]"
                            priority
                        />
                    </Link>

                    {/* Desktop nav */}
                    <div className="hidden md:flex items-center gap-8">
                        <a
                            href="#applications"
                            className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                            Aplikasi
                        </a>
                        <a
                            href="#about"
                            className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                            Tentang
                        </a>
                        <a
                            href="https://pkmk-malangkab.app/login"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transform hover:-translate-y-0.5"
                        >
                            Login
                        </a>
                    </div>

                    {/* Mobile */}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                    >
                        <span className="material-icons-round">
                            {mobileOpen ? "close" : "menu"}
                        </span>
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="md:hidden bg-white border-t border-slate-100 shadow-xl">
                    <div className="px-4 py-4 flex flex-col gap-2">
                        <a
                            href="#applications"
                            onClick={() => setMobileOpen(false)}
                            className="px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 font-medium transition-colors"
                        >
                            Aplikasi
                        </a>
                        <a
                            href="#about"
                            onClick={() => setMobileOpen(false)}
                            className="px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 font-medium transition-colors"
                        >
                            Tentang
                        </a>
                        <a
                            href="https://pkmk-malangkab.app/login"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold text-center hover:bg-indigo-700 transition-colors mt-1"
                        >
                            Login Dashboard
                        </a>
                    </div>
                </div>
            )}
        </nav>
    );
}
