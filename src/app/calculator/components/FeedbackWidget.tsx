"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

// ============================================================
// Feedback Modal Component
// ============================================================
function FeedbackModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors z-10"
                >
                    <span className="material-icons-round text-lg">close</span>
                </button>

                {/* Header Decoration */}
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 h-24 w-full relative">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.2)_0%,transparent_60%)]" />
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg border-4 border-white rotate-3">
                        <span className="material-icons-round text-3xl text-indigo-500 -rotate-3">campaign</span>
                    </div>
                </div>

                {/* Body */}
                <div className="pt-12 pb-8 px-6 text-center">
                    <h3 className="text-xl font-extrabold text-slate-900 mb-2">Terima Kasih! 🎉</h3>
                    <p className="text-sm text-slate-500 leading-relaxed mb-8">
                        Terima kasih atas kepercayaan Anda menggunakan <strong>SIGMA Calculator</strong>. 
                        Jika Anda memiliki masukan, kendala (troubleshooting), atau saran pengembangan aplikasi healthcare, 
                        jangan ragu untuk menghubungi kami secara langsung!
                    </p>

                    <div className="space-y-3">
                        {/* WhatsApp Button */}
                        <a
                            href="https://wa.me/6281216354887"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-4 w-full p-4 rounded-2xl border border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shadow-md shadow-green-200 group-hover:scale-105 transition-transform">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 3.825 0 6.938 3.112 6.938 6.937 0 3.825-3.113 6.938-6.938 6.938z" />
                                </svg>
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="font-bold text-slate-800 text-sm">WhatsApp</span>
                                <span className="text-xs font-medium text-emerald-600">0812 1635 4887</span>
                            </div>
                            <span className="material-icons-round text-emerald-400 ml-auto text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </a>

                        {/* Email Button */}
                        <a
                            href="mailto:dedik2urniawan@gmail.com"
                            className="flex items-center gap-4 w-full p-4 rounded-2xl border border-red-100 bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shadow-md shadow-red-200 group-hover:scale-105 transition-transform">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                                </svg>
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="font-bold text-slate-800 text-sm">Email</span>
                                <span className="text-xs font-medium text-rose-600">dedik2urniawan@gmail.com</span>
                            </div>
                            <span className="material-icons-round text-rose-400 ml-auto text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// Feedback Widget (FAB)
// ============================================================
export default function FeedbackWidget() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-900/20 hover:bg-slate-800 hover:scale-105 transition-all duration-300 border border-slate-700 group"
            >
                <span className="material-icons-round text-[18px] text-indigo-400 group-hover:animate-pulse">rate_review</span>
                <span className="font-bold text-sm tracking-wide">Feedback</span>
            </button>

            {/* Modal */}
            <FeedbackModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}
