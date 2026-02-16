"use client";

import React from "react";

interface ComingSoonModalProps {
    isOpen: boolean;
    onClose: () => void;
    appName: string;
}

export default function ComingSoonModal({
    isOpen,
    onClose,
    appName,
}: ComingSoonModalProps) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
                    style={{ position: "absolute" }}
                >
                    <span className="material-icons-round text-slate-400 text-xl">close</span>
                </button>

                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center">
                        <span className="material-icons-round text-4xl text-slate-400">
                            construction
                        </span>
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-extrabold text-center text-slate-900 mb-2 tracking-tight">
                    {appName}
                </h3>
                <div className="flex justify-center mb-6">
                    <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-full uppercase tracking-widest border border-amber-100">
                        Under Development
                    </span>
                </div>

                {/* Message */}
                <div className="rounded-2xl p-6 mb-6 bg-slate-50 border border-slate-100">
                    <p className="text-slate-600 text-sm leading-relaxed text-center">
                        Modul <span className="text-slate-900 font-bold">{appName}</span>{" "}
                        sedang dalam tahap pengembangan aktif oleh Tim SIGMA. Kami
                        berkomitmen untuk menghadirkan solusi yang terintegrasi dan
                        berkualitas tinggi.
                    </p>
                </div>

                {/* Notification */}
                <div className="flex items-start gap-3 rounded-xl p-4 mb-6 bg-indigo-50/50 border border-indigo-100">
                    <span className="material-icons-round text-indigo-500 text-xl flex-shrink-0 mt-0.5">
                        notifications_active
                    </span>
                    <p className="text-slate-500 text-xs leading-relaxed">
                        Informasi ketersediaan modul akan disampaikan melalui kanal
                        komunikasi resmi Dinas Kesehatan Kabupaten Malang.
                    </p>
                </div>

                {/* Action */}
                <button
                    onClick={onClose}
                    className="w-full py-3.5 px-6 rounded-full bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 cursor-pointer"
                >
                    Mengerti, Terima Kasih
                </button>
            </div>
        </div>
    );
}
