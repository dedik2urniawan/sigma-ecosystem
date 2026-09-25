"use client";

import React, { useState, useEffect } from "react";
import { PmtBalitaRecord, PmtBumilRecord } from "@/lib/pmtLokalHelper";
import { supabase } from "@/lib/supabase";
import {
    Scale,
    Info,
    Search,
    Download,
    AlertCircle,
    CheckCircle2,
    RefreshCw
} from "lucide-react";

interface PmtReconciliationTabProps {
    balitaRecords: PmtBalitaRecord[];
    bumilRecords: PmtBumilRecord[];
}

export default function PmtReconciliationTab({
    balitaRecords,
    bumilRecords
}: PmtReconciliationTabProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [adminData, setAdminData] = useState<Record<string, { gkPmt: number; uwPmt: number; tPmt: number }>>({});
    const [loadingAdmin, setLoadingAdmin] = useState(false);

    // Fetch administrative totals from data_balita_gizi
    useEffect(() => {
        async function fetchAdminSummary() {
            setLoadingAdmin(true);
            try {
                const { data, error } = await supabase
                    .from("data_balita_gizi")
                    .select("puskesmas, pmt_gizi_kurang, underweight_dapat_pmt, pmt_balita_t")
                    .eq("tahun", 2026)
                    .not("puskesmas", "ilike", "%dinkes%");

                if (!error && data) {
                    const map: Record<string, { gkPmt: number; uwPmt: number; tPmt: number }> = {};
                    for (const row of data) {
                        const pkm = row.puskesmas;
                        if (!map[pkm]) map[pkm] = { gkPmt: 0, uwPmt: 0, tPmt: 0 };
                        map[pkm].gkPmt += Number(row.pmt_gizi_kurang) || 0;
                        map[pkm].uwPmt += Number(row.underweight_dapat_pmt) || 0;
                        map[pkm].tPmt += Number(row.pmt_balita_t) || 0;
                    }
                    setAdminData(map);
                }
            } catch (err) {
                console.error("fetchAdminSummary error:", err);
            } finally {
                setLoadingAdmin(false);
            }
        }
        fetchAdminSummary();
    }, []);

    // Group individual episode records by Puskesmas
    const individualMap: Record<string, { gk: number; uw: number; t: number; bumil: number }> = {};
    for (const b of balitaRecords) {
        if (!individualMap[b.puskesmas]) individualMap[b.puskesmas] = { gk: 0, uw: 0, t: 0, bumil: 0 };
        if (b.indikasi === "gizi_kurang") individualMap[b.puskesmas].gk++;
        if (b.indikasi === "underweight") individualMap[b.puskesmas].uw++;
        if (b.indikasi === "balita_t") individualMap[b.puskesmas].t++;
    }
    for (const m of bumilRecords) {
        if (!individualMap[m.puskesmas]) individualMap[m.puskesmas] = { gk: 0, uw: 0, t: 0, bumil: 0 };
        individualMap[m.puskesmas].bumil++;
    }

    // Combine Puskesmas list
    const allPuskesmas = Array.from(new Set([...Object.keys(individualMap), ...Object.keys(adminData)])).sort();

    const comparisonRows = allPuskesmas.map(pkm => {
        const indiv = individualMap[pkm] || { gk: 0, uw: 0, t: 0, bumil: 0 };
        const admin = adminData[pkm] || { gkPmt: 0, uwPmt: 0, tPmt: 0 };
        const diffGk = indiv.gk - admin.gkPmt;
        const diffUw = indiv.uw - admin.uwPmt;
        const diffT = indiv.t - admin.tPmt;

        return {
            puskesmas: pkm,
            indivGk: indiv.gk,
            adminGk: admin.gkPmt,
            diffGk,
            indivUw: indiv.uw,
            adminUw: admin.uwPmt,
            diffUw,
            indivT: indiv.t,
            adminT: admin.tPmt,
            diffT,
            indivBumil: indiv.bumil
        };
    });

    const filteredRows = comparisonRows.filter(r =>
        r.puskesmas.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sum totals
    const totalIndivGk = comparisonRows.reduce((a, b) => a + b.indivGk, 0);
    const totalAdminGk = comparisonRows.reduce((a, b) => a + b.adminGk, 0);
    const totalIndivUw = comparisonRows.reduce((a, b) => a + b.indivUw, 0);
    const totalAdminUw = comparisonRows.reduce((a, b) => a + b.adminUw, 0);
    const totalIndivT = comparisonRows.reduce((a, b) => a + b.indivT, 0);
    const totalAdminT = comparisonRows.reduce((a, b) => a + b.adminT, 0);

    return (
        <div className="space-y-6">
            {/* ── 1. METHODOLOGY & EXPLANATION BANNER ── */}
            <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start gap-3">
                    <Scale className="w-5 h-5 text-purple-700 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-purple-950 space-y-2">
                        <div className="font-bold text-sm text-purple-900">
                            Prinsip Rekonsiliasi: Membedakan Rekap Administratif Desa vs Riwayat Episode Individu
                        </div>
                        <p className="text-purple-800 leading-relaxed">
                            SIGMA RCS secara ketat membedakan dua jenis data pelaporan yang berbeda sifat dan tujuannya:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            <div className="bg-white/80 p-3 rounded-xl border border-purple-100">
                                <div className="font-bold text-slate-800 mb-1">1. Rekap Administratif Wilayah</div>
                                <div className="text-[11px] text-slate-600">
                                    Agregat bulanan tingkat desa/Puskesmas (misal kolom [82] untuk GK, [85] untuk UW, [88] untuk Balita T). Mengukur cakupan logistik penyaluran bantuan PMT ke wilayah administratif.
                                </div>
                            </div>
                            <div className="bg-white/80 p-3 rounded-xl border border-purple-100">
                                <div className="font-bold text-slate-800 mb-1">2. Riwayat Episode Individu (PMT Lokal)</div>
                                <div className="text-[11px] text-slate-600">
                                    Data per-anak/ibu dengan NIK, baseline antropometri, dan pemantauan. Mengukur luaran program (pemulihan WHZ/WAZ) pada kohort yang teramati secara longitudinal.
                                </div>
                            </div>
                        </div>
                        <p className="text-[11px] text-purple-800 italic">
                            *Catatan: Selisih antara kedua angka tidak otomatis diartikan sebagai kesalahan entri, melainkan perbedaan cakupan sampling berkas, jendela verifikasi, dan revisi berkala.
                        </p>
                    </div>
                </div>
            </div>

            {/* ── 2. AGGREGATE COMPARISON SUMMARY ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-rose-700 mb-2">
                        Gizi Kurang (GK)
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Riwayat Individu:</span>
                        <strong className="text-slate-800 font-bold text-sm">{totalIndivGk} anak</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-slate-500">Rekap Administratif:</span>
                        <strong className="text-slate-800 font-bold text-sm">{totalAdminGk} anak</strong>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Selisih:</span>
                        <span className="font-bold text-purple-700">{totalIndivGk - totalAdminGk > 0 ? `+${totalIndivGk - totalAdminGk}` : totalIndivGk - totalAdminGk}</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-2">
                        Underweight (UW)
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Riwayat Individu:</span>
                        <strong className="text-slate-800 font-bold text-sm">{totalIndivUw} anak</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-slate-500">Rekap Administratif:</span>
                        <strong className="text-slate-800 font-bold text-sm">{totalAdminUw} anak</strong>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Selisih:</span>
                        <span className="font-bold text-purple-700">{totalIndivUw - totalAdminUw > 0 ? `+${totalIndivUw - totalAdminUw}` : totalIndivUw - totalAdminUw}</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 mb-2">
                        Balita T (Tidak Naik)
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Riwayat Individu:</span>
                        <strong className="text-slate-800 font-bold text-sm">{totalIndivT.toLocaleString()} anak</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-slate-500">Rekap Administratif:</span>
                        <strong className="text-slate-800 font-bold text-sm">{totalAdminT.toLocaleString()} anak</strong>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Selisih:</span>
                        <span className="font-bold text-purple-700">{totalIndivT - totalAdminT > 0 ? `+${totalIndivT - totalAdminT}` : totalIndivT - totalAdminT}</span>
                    </div>
                </div>
            </div>

            {/* ── 3. COMPARISON TABLE PER PUSKESMAS ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">
                            Matriks Rekonsiliasi per Puskesmas (Tahun 2026)
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Perbandingan episode individu e-PPGBM vs rekapitulasi data_balita_gizi
                        </p>
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Cari puskesmas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-56 bg-slate-50 border border-slate-200 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                            <tr>
                                <th className="py-3 px-4" rowSpan={2}>No</th>
                                <th className="py-3 px-4" rowSpan={2}>Puskesmas</th>
                                <th className="py-2 px-3 text-center border-b border-slate-200" colSpan={3}>Gizi Kurang (GK)</th>
                                <th className="py-2 px-3 text-center border-b border-slate-200" colSpan={3}>Underweight (UW)</th>
                                <th className="py-2 px-3 text-center border-b border-slate-200" colSpan={3}>Balita T</th>
                                <th className="py-3 px-4 text-center" rowSpan={2}>Bumil KEK</th>
                            </tr>
                            <tr>
                                <th className="py-2 px-2 text-center text-slate-500">Individu</th>
                                <th className="py-2 px-2 text-center text-slate-500">Admin</th>
                                <th className="py-2 px-2 text-center text-slate-500">Selisih</th>
                                <th className="py-2 px-2 text-center text-slate-500">Individu</th>
                                <th className="py-2 px-2 text-center text-slate-500">Admin</th>
                                <th className="py-2 px-2 text-center text-slate-500">Selisih</th>
                                <th className="py-2 px-2 text-center text-slate-500">Individu</th>
                                <th className="py-2 px-2 text-center text-slate-500">Admin</th>
                                <th className="py-2 px-2 text-center text-slate-500">Selisih</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredRows.map((r, idx) => (
                                <tr key={r.puskesmas} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="py-3 px-4 text-slate-400 font-normal">{idx + 1}</td>
                                    <td className="py-3 px-4 font-bold text-slate-800">{r.puskesmas}</td>
                                    
                                    {/* GK */}
                                    <td className="py-3 px-2 text-center font-semibold text-slate-800">{r.indivGk || "-"}</td>
                                    <td className="py-3 px-2 text-center text-slate-600">{r.adminGk || "-"}</td>
                                    <td className="py-3 px-2 text-center font-mono text-[11px]">
                                        {r.diffGk !== 0 ? (
                                            <span className={r.diffGk > 0 ? "text-purple-700 font-bold" : "text-amber-700 font-bold"}>
                                                {r.diffGk > 0 ? `+${r.diffGk}` : r.diffGk}
                                            </span>
                                        ) : (
                                            <span className="text-emerald-600 font-semibold">0</span>
                                        )}
                                    </td>

                                    {/* UW */}
                                    <td className="py-3 px-2 text-center font-semibold text-slate-800">{r.indivUw || "-"}</td>
                                    <td className="py-3 px-2 text-center text-slate-600">{r.adminUw || "-"}</td>
                                    <td className="py-3 px-2 text-center font-mono text-[11px]">
                                        {r.diffUw !== 0 ? (
                                            <span className={r.diffUw > 0 ? "text-purple-700 font-bold" : "text-amber-700 font-bold"}>
                                                {r.diffUw > 0 ? `+${r.diffUw}` : r.diffUw}
                                            </span>
                                        ) : (
                                            <span className="text-emerald-600 font-semibold">0</span>
                                        )}
                                    </td>

                                    {/* Balita T */}
                                    <td className="py-3 px-2 text-center font-semibold text-slate-800">{r.indivT || "-"}</td>
                                    <td className="py-3 px-2 text-center text-slate-600">{r.adminT || "-"}</td>
                                    <td className="py-3 px-2 text-center font-mono text-[11px]">
                                        {r.diffT !== 0 ? (
                                            <span className={r.diffT > 0 ? "text-purple-700 font-bold" : "text-amber-700 font-bold"}>
                                                {r.diffT > 0 ? `+${r.diffT}` : r.diffT}
                                            </span>
                                        ) : (
                                            <span className="text-emerald-600 font-semibold">0</span>
                                        )}
                                    </td>

                                    {/* Bumil */}
                                    <td className="py-3 px-4 text-center font-semibold text-slate-700">
                                        {r.indivBumil || "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
