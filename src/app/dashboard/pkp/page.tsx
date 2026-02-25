"use client";

import React from "react";
import ComingSoon from "@/components/dashboard/ComingSoon";

export default function PKPPage() {
    return (
        <div className="space-y-6 min-w-0" style={{ overflowX: 'hidden' }}>
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-200/50">
                    <span className="material-icons-round text-white text-3xl">assessment</span>
                </div>
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">PKP</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Penilaian Kinerja Puskesmas</p>
                </div>
            </div>

            {/* Coming Soon */}
            <ComingSoon
                title="Penilaian Kinerja Puskesmas (PKP)"
                icon="assessment"
                description="Modul Penilaian Kinerja Puskesmas (PKP) meliputi monitoring indikator kinerja, evaluasi capaian program, dan pelaporan kinerja puskesmas secara digital."
                gradient="from-teal-500 to-cyan-600"
            />
        </div>
    );
}
