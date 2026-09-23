"use client";

import React from "react";

export default function SkipToContent() {
    const handleSkip = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        const main = document.getElementById("main-content") || document.querySelector("main");
        if (main) {
            main.setAttribute("tabindex", "-1");
            main.focus();
            main.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <a
            href="#main-content"
            onClick={handleSkip}
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-6 focus:py-3 focus:bg-[#0B6268] focus:text-white focus:font-bold focus:text-sm focus:rounded-xl focus:shadow-2xl focus:outline-none focus:ring-4 focus:ring-amber-400 transition-all"
        >
            Loncat ke Konten Utama (Skip to Main Content)
        </a>
    );
}
