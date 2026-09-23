"use client";

import React, { useState, useMemo } from "react";
import {
    IbuHamilRawRecord,
    filterCumulativeData,
    runDqaAudit,
    VillageFreshness,
    FreshnessCategory
} from "@/lib/ibuHamilHelper";
import {
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Info,
    Calendar,
    Search,
    ShieldAlert,
    Building2,
    Clock,
    MapPin,
    ArrowLeft
} from "lucide-react";

interface IbuHamilDataQualityProps {
    allRecords: IbuHamilRawRecord[];
    refPuskesmas: { id: string; name: string }[];
    refDesa: { id: string; name: string; puskesmas_id: string }[];
    year: string;
    mode: "bulanan" | "triwulan";
    periodVal: number;
    selectedPuskesmas: string;
    setSelectedPuskesmas?: (p: string) => void;
    selectedKelurahan: string;
    setSelectedKelurahan?: (k: string) => void;
    isPuskesmasAdmin: boolean;
    availableDesaList?: { id: string; name: string }[];
}

export default function IbuHamilDataQuality({
    allRecords,
    refPuskesmas,
    refDesa,
    year,
    mode,
    periodVal,
    selectedPuskesmas,
    setSelectedPuskesmas,
    selectedKelurahan,
    setSelectedKelurahan,
    isPuskesmasAdmin,
    availableDesaList = []
}: IbuHamilDataQualityProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<"ALL" | "COMPLETE" | "PARTIAL" | "EMPTY">("ALL");

    const isDesaLevel = selectedPuskesmas !== "ALL";

    // Filter by year
    const yearRecords = useMemo(() => {
        return allRecords.filter((r) => String(r.tahun) === year);
    }, [allRecords, year]);

    // Process snapshot & freshness
    const { filteredRecords, freshnessMap } = useMemo(() => {
        return filterCumulativeData(yearRecords, mode, periodVal);
    }, [yearRecords, mode, periodVal]);

    // Audit checks
    const dqaIssues = useMemo(() => {
        const recordsToAudit = isDesaLevel
            ? filteredRecords.filter((r) => r.puskesmas.toLowerCase().trim() === selectedPuskesmas.toLowerCase().trim())
            : filteredRecords;
        return runDqaAudit(recordsToAudit);
    }, [filteredRecords, isDesaLevel, selectedPuskesmas]);

    // Master statistics
    const totalMasterDesa = refDesa.length > 0 ? refDesa.length : 390; // Default estimasi desa Kab. Malang
    const totalMasterPuskesmas = refPuskesmas.length > 0 ? refPuskesmas.length : 39;

    // Reporting desa count across Kabupaten
    const reportingDesaSet = useMemo(() => {
        const set = new Set<string>();
        filteredRecords.forEach((r) => {
            set.add(`${r.puskesmas.toLowerCase().trim()}:::${r.kelurahan.toLowerCase().trim()}`);
        });
        return set;
    }, [filteredRecords]);

    // Desa in scope if selectedPuskesmas !== "ALL"
    const desaInScope = useMemo(() => {
        if (!isDesaLevel) return [];
        const pObj = refPuskesmas.find((p) => p.name.toLowerCase().trim() === selectedPuskesmas.toLowerCase().trim());
        if (pObj) {
            const list = refDesa.filter((d) => d.puskesmas_id === pObj.id);
            if (list.length > 0) return list.map((d) => d.name);
        }
        // Fallback from raw records of this puskesmas
        const desaSet = new Set<string>();
        allRecords
            .filter((r) => r.puskesmas.toLowerCase().trim() === selectedPuskesmas.toLowerCase().trim())
            .forEach((r) => {
                if (r.kelurahan) desaSet.add(r.kelurahan);
            });
        return Array.from(desaSet).sort();
    }, [isDesaLevel, selectedPuskesmas, refPuskesmas, refDesa, allRecords]);

    // Records for currently selected Puskesmas
    const puskesmasCurrentRecords = useMemo(() => {
        if (!isDesaLevel) return [];
        return filteredRecords.filter(
            (r) => r.puskesmas.toLowerCase().trim() === selectedPuskesmas.toLowerCase().trim()
        );
    }, [filteredRecords, isDesaLevel, selectedPuskesmas]);

    // Desa report summary for selected Puskesmas
    const desaReportSummary = useMemo(() => {
        if (!isDesaLevel) return [];

        return desaInScope.map((desaName) => {
            const found = puskesmasCurrentRecords.find(
                (r) => r.kelurahan.toLowerCase().trim() === desaName.toLowerCase().trim()
            );
            const hasData = Boolean(found);
            const reportedMonth = found?.bulan ? `Bulan ${found.bulan}` : hasData ? "Ada Laporan" : "Belum Lapor";
            const sasaran = Number(found?.target_pregnant || found?.data_sasaran) || 0;
            const totalBumil = Number(found?.pregnant_total || found?.jumlah_bumil) || 0;
            const status: "COMPLETE" | "EMPTY" = hasData ? "COMPLETE" : "EMPTY";

            const freshnessKey = `${selectedPuskesmas.toLowerCase().trim()}:::${desaName.toLowerCase().trim()}`;
            const freshnessCat = freshnessMap.get(freshnessKey)?.category;

            return {
                desa: desaName,
                puskesmas: selectedPuskesmas,
                reportedMonth,
                sasaran,
                totalBumil,
                status,
                freshness: freshnessCat
            };
        });
    }, [isDesaLevel, desaInScope, puskesmasCurrentRecords, selectedPuskesmas, freshnessMap]);

    // Contextual scorecard numbers
    const totalDesaInView = isDesaLevel ? desaInScope.length : totalMasterDesa;
    const reportingDesaCount = isDesaLevel
        ? desaReportSummary.filter((d) => d.status === "COMPLETE").length
        : reportingDesaSet.size;
    const completenessRate = totalDesaInView > 0 ? Math.round((reportingDesaCount / totalDesaInView) * 1000) / 10 : 0;
    const missingDesaCount = Math.max(0, totalDesaInView - reportingDesaCount);

    // Freshness breakdown for Triwulan
    const freshnessCounts = useMemo(() => {
        let fresh = 0;
        let cf1 = 0;
        let cf2 = 0;
        let stale = 0;

        freshnessMap.forEach((f) => {
            if (isDesaLevel && f.puskesmas.toLowerCase().trim() !== selectedPuskesmas.toLowerCase().trim()) return;
            if (f.category === "FRESH") fresh++;
            else if (f.category === "CF_1") cf1++;
            else if (f.category === "CF_2") cf2++;
            else if (f.category === "STALE") stale++;
        });

        return { fresh, cf1, cf2, stale };
    }, [freshnessMap, isDesaLevel, selectedPuskesmas]);

    // Puskesmas summary calculation (when ALL)
    const puskesmasReportSummary = useMemo(() => {
        const pMap = new Map<string, { reported: number; totalDesa: number }>();

        if (refPuskesmas.length > 0) {
            refPuskesmas.forEach((p) => {
                const desaInP = refDesa.filter((d) => d.puskesmas_id === p.id).length || 10;
                pMap.set(p.name.toUpperCase().trim(), { reported: 0, totalDesa: desaInP });
            });
        }

        filteredRecords.forEach((r) => {
            const pKey = r.puskesmas.toUpperCase().trim();
            if (!pMap.has(pKey)) {
                pMap.set(pKey, { reported: 0, totalDesa: 10 });
            }
            pMap.get(pKey)!.reported++;
        });

        const list = Array.from(pMap.entries()).map(([name, stat]) => {
            const pct = stat.totalDesa > 0 ? Math.round((stat.reported / stat.totalDesa) * 100) : 0;
            let status: "COMPLETE" | "PARTIAL" | "EMPTY" = "EMPTY";
            if (stat.reported >= stat.totalDesa && stat.totalDesa > 0) status = "COMPLETE";
            else if (stat.reported > 0) status = "PARTIAL";

            return {
                puskesmas: name,
                reported: stat.reported,
                totalDesa: stat.totalDesa,
                percentage: Math.min(pct, 100),
                status
            };
        });

        return list.sort((a, b) => b.percentage - a.percentage || a.puskesmas.localeCompare(b.puskesmas));
    }, [refPuskesmas, refDesa, filteredRecords]);

    const filteredPuskesmas = useMemo(() => {
        return puskesmasReportSummary.filter((p) => {
            const matchSearch = p.puskesmas.toLowerCase().includes(searchTerm.toLowerCase());
            const matchStatus = filterStatus === "ALL" || p.status === filterStatus;
            return matchSearch && matchStatus;
        });
    }, [puskesmasReportSummary, searchTerm, filterStatus]);

    const filteredDesa = useMemo(() => {
        return desaReportSummary.filter((d) => {
            const matchSearch = d.desa.toLowerCase().includes(searchTerm.toLowerCase());
            const matchStatus = filterStatus === "ALL" || d.status === filterStatus;
            return matchSearch && matchStatus;
        });
    }, [desaReportSummary, searchTerm, filterStatus]);

    const periodLabel = mode === "bulanan"
        ? ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][periodVal - 1]
        : `Triwulan ${["I", "II", "III", "IV"][periodVal - 1]}`;

    return (
        <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {isDesaLevel ? "Desa Terdata di Puskesmas" : "Total Desa Terdata"}
                        </div>
                        <div className="text-2xl font-black text-slate-800 mt-0.5">
                            {reportingDesaCount} <span className="text-xs font-normal text-slate-400">/ {totalDesaInView} desa</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        completenessRate >= 90 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    }`}>
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tingkat Kelengkapan</div>
                        <div className="text-2xl font-black text-slate-800 mt-0.5">
                            {completenessRate}%
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                        <XCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Desa Belum Masuk</div>
                        <div className="text-2xl font-black text-slate-800 mt-0.5">
                            {missingDesaCount}
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Periode Aktif</div>
                        <div className="text-lg font-bold text-slate-800 mt-0.5">
                            {periodLabel} {year}
                        </div>
                    </div>
                </div>
            </div>

            {/* Triwulan Freshness Breakdown (If in Triwulan Mode) */}
            {mode === "triwulan" && (
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm border border-slate-700">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                        <div>
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <Clock className="w-5 h-5 text-purple-400" />
                                Analisis Kebaruan Data Triwulan (Data Freshness Matrix) {isDesaLevel && `— Puskesmas ${selectedPuskesmas}`}
                            </h3>
                            <p className="text-xs text-slate-300 mt-0.5">
                                Pada mode Triwulanan, data kumulatif menggunakan snapshot terbaru tiap desa sampai cutoff {periodLabel}.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                            <div className="text-xs text-emerald-300 font-medium flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                                Fresh (Bulan Cutoff)
                            </div>
                            <div className="text-2xl font-extrabold mt-1 text-white">{freshnessCounts.fresh}</div>
                            <div className="text-[11px] text-slate-400">Record bulan cutoff TW</div>
                        </div>

                        <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                            <div className="text-xs text-blue-300 font-medium flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                                Carry Forward -1
                            </div>
                            <div className="text-2xl font-extrabold mt-1 text-white">{freshnessCounts.cf1}</div>
                            <div className="text-[11px] text-slate-400">Update 1 bulan sebelum cutoff</div>
                        </div>

                        <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                            <div className="text-xs text-amber-300 font-medium flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                                Carry Forward -2
                            </div>
                            <div className="text-2xl font-extrabold mt-1 text-white">{freshnessCounts.cf2}</div>
                            <div className="text-[11px] text-slate-400">Update 2 bulan sebelum cutoff</div>
                        </div>

                        <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                            <div className="text-xs text-rose-300 font-medium flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-400 inline-block"></span>
                                Stale / Belum Lapor
                            </div>
                            <div className="text-2xl font-extrabold mt-1 text-white">{freshnessCounts.stale}</div>
                            <div className="text-[11px] text-slate-400">Tidak ada entri di TW ini</div>
                        </div>
                    </div>
                </div>
            )}

            {/* DQA Rule Check Alert Box */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-purple-600" />
                    <h3 className="font-bold text-slate-800 text-sm">
                        Hasil Data Quality Assessment (DQA) Validasi {year} {isDesaLevel && `— Puskesmas ${selectedPuskesmas}`}
                    </h3>
                </div>

                {dqaIssues.length === 0 ? (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                            <div className="text-xs font-bold text-emerald-800">Kualitas Data Valid</div>
                            <div className="text-xs text-emerald-600 mt-0.5">
                                Tidak ditemukan anomali penjumlahan atau diskrepansi antara numerator dan denominator pada dataset periode ini.
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {dqaIssues.map((issue, idx) => (
                            <div
                                key={idx}
                                className={`p-4 rounded-xl border flex items-start gap-3 ${
                                    issue.severity === "CRITICAL"
                                        ? "bg-rose-50 border-rose-200 text-rose-800"
                                        : "bg-amber-50 border-amber-200 text-amber-800"
                                }`}
                            >
                                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                                <div className="text-xs">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full bg-white/60">
                                            {issue.severity}
                                        </span>
                                        <span className="font-bold">{issue.title}</span>
                                        <span className="text-[10px] opacity-75">({issue.affectedCount} desa terdampak)</span>
                                    </div>
                                    <p className="text-slate-600 text-[11px]">{issue.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Completion Table (Puskesmas or Desa based on selection/RBAC) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800">
                                {isDesaLevel
                                    ? `Status Kepatuhan Pelaporan per Desa / Kelurahan — Puskesmas ${selectedPuskesmas}`
                                    : "Status Kepatuhan Pelaporan per Puskesmas"}
                            </h3>
                            {isDesaLevel && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700">
                                    Wilayah Puskesmas {selectedPuskesmas}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400">
                            {isDesaLevel
                                ? `Pantau progres entri indikator ibu hamil seluruh desa di wilayah Puskesmas ${selectedPuskesmas}`
                                : "Pantau progres entri indikator ibu hamil seluruh wilayah Puskesmas"}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder={isDesaLevel ? "Cari Desa/Kelurahan..." : "Cari Puskesmas..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                            />
                        </div>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="text-xs rounded-xl border border-slate-200 py-1.5 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        >
                            <option value="ALL">Semua Status</option>
                            <option value="COMPLETE">Lengkap</option>
                            {!isDesaLevel && <option value="PARTIAL">Sebagian</option>}
                            <option value="EMPTY">Belum Lapor</option>
                        </select>

                        {isDesaLevel && !isPuskesmasAdmin && (
                            <button
                                onClick={() => setSelectedPuskesmas?.("ALL")}
                                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors flex items-center gap-1.5 shrink-0"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Semua Puskesmas
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {isDesaLevel ? (
                        /* ─── DESA LEVEL TABLE (For admin_puskesmas or Superadmin drilled down) ─── */
                        <table className="w-full text-left text-xs text-slate-600">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Nama Desa / Kelurahan</th>
                                    <th className="py-3 px-4 text-center">Sasaran Bumil</th>
                                    <th className="py-3 px-4 text-center">Total Bumil Tercatat</th>
                                    <th className="py-3 px-4 text-center">Periode Lapor Terdata</th>
                                    <th className="py-3 px-4 text-center">Status Kelengkapan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredDesa.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-400">
                                            Tidak ada data desa yang cocok dengan pencarian.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredDesa.map((row) => (
                                        <tr key={row.desa} className="hover:bg-purple-50/30 transition-colors">
                                            <td className="py-3 px-4 font-bold text-slate-800">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3.5 h-3.5 text-purple-600" />
                                                    <span>{row.desa}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                                                {row.sasaran > 0 ? row.sasaran.toLocaleString("id-ID") : "-"}
                                            </td>
                                            <td className="py-3 px-4 text-center font-mono text-slate-600">
                                                {row.totalBumil > 0 ? row.totalBumil.toLocaleString("id-ID") : "-"}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {row.status === "COMPLETE" ? (
                                                    <span className="text-slate-700 font-medium">
                                                        {row.reportedMonth} {row.freshness && row.freshness !== "FRESH" && (
                                                            <span className="text-[10px] text-amber-600 font-semibold ml-1">
                                                                ({row.freshness === "CF_1" ? "Cutoff -1" : "Cutoff -2"})
                                                            </span>
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="text-rose-500 font-semibold">Belum Ada Data</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {row.status === "COMPLETE" ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <CheckCircle2 className="w-3 h-3" /> Lengkap
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                        <XCircle className="w-3 h-3" /> Belum Lapor
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    ) : (
                        /* ─── PUSKESMAS LEVEL TABLE (For Superadmin without filter) ─── */
                        <table className="w-full text-left text-xs text-slate-600">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Nama Puskesmas</th>
                                    <th className="py-3 px-4 text-center">Desa Terlapor</th>
                                    <th className="py-3 px-4 text-center">Target Desa</th>
                                    <th className="py-3 px-4">Progres Kelengkapan</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredPuskesmas.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-400">
                                            Tidak ada data Puskesmas yang sesuai dengan filter.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPuskesmas.map((row) => (
                                        <tr
                                            key={row.puskesmas}
                                            onClick={() => setSelectedPuskesmas?.(row.puskesmas)}
                                            className="hover:bg-purple-50/30 transition-colors cursor-pointer"
                                            title="Klik untuk melihat rincian kepatuhan per desa"
                                        >
                                            <td className="py-3 px-4 font-bold text-slate-800">
                                                <div className="flex items-center gap-1.5">
                                                    <span>{row.puskesmas}</span>
                                                    <span className="text-[10px] text-purple-600 font-normal">↗</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-center font-semibold text-slate-700">
                                                {row.reported}
                                            </td>
                                            <td className="py-3 px-4 text-center text-slate-500">
                                                {row.totalDesa}
                                            </td>
                                            <td className="py-3 px-4 w-48">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${
                                                                row.percentage >= 100
                                                                    ? "bg-emerald-500"
                                                                    : row.percentage > 50
                                                                    ? "bg-purple-500"
                                                                    : "bg-amber-500"
                                                            }`}
                                                            style={{ width: `${row.percentage}%` }}
                                                        />
                                                    </div>
                                                    <span className="font-bold text-slate-700 w-10 text-right">
                                                        {row.percentage}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {row.status === "COMPLETE" ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <CheckCircle2 className="w-3 h-3" /> Lengkap
                                                    </span>
                                                ) : row.status === "PARTIAL" ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                        <Clock className="w-3 h-3" /> Sebagian
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                        <XCircle className="w-3 h-3" /> Belum Lapor
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
