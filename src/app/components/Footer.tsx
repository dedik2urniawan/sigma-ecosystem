import React from "react";
import Image from "next/image";

export default function Footer() {
    return (
        <footer className="bg-slate-50/50 border-t border-slate-200 py-16">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="flex flex-col items-center justify-center text-center gap-6">
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 overflow-hidden">
                            <Image
                                src="/sigma_logo.png"
                                alt="SIGMA Logo"
                                width={40}
                                height={40}
                                className="object-cover"
                            />
                        </div>
                        <div className="text-left">
                            <h5 className="font-extrabold text-slate-900 text-lg leading-none">
                                SIGMA Ecosystem
                            </h5>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="flex flex-col text-sm text-slate-500 gap-1 font-medium">
                        <p>Sistem Informasi Gizi Kabupaten Malang</p>
                        <p>
                            untuk mendukung percepatan penurunan stunting di Kabupaten Malang.
                        </p>
                    </div>

                    {/* Bottom bar */}
                    <div className="border-t border-slate-200 w-full mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-400">
                        <div className="text-center md:text-left mb-6 md:mb-0 space-y-1">
                            <p className="font-bold text-slate-600">
                                Dinas Kesehatan Kabupaten Malang
                            </p>
                            <p className="uppercase tracking-widest text-[10px]">
                                PENGEMBANGAN OLEH TIM SIGMA GIZI
                            </p>
                            <p className="mt-1">
                                © {new Date().getFullYear()} • v1.0.0 • All rights reserved
                            </p>
                        </div>
                        <div>
                            Crafted with love by{" "}
                            <a
                                className="text-indigo-600 hover:text-indigo-700 font-bold transition-colors"
                                href="https://dedik2urniawan.github.io/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                DK
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
