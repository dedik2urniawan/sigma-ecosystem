"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

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
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 overflow-hidden">
                            <Image
                                src="/sigma_logo.png"
                                alt="SIGMA Logo"
                                width={40}
                                height={40}
                                className="object-cover"
                            />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="font-extrabold text-lg tracking-tight text-slate-900 leading-none">
                                SIGMA
                            </h1>
                            <p className="text-[9px] text-slate-500 font-bold tracking-widest uppercase mt-0.5">
                                ECOSYSTEM
                            </p>
                        </div>
                    </div>

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
