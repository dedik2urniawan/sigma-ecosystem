"use client";

import React, { useState, useMemo } from "react";
import {
    RemajaPutriRawRecord,
    filterRemajaPutriRecords,
    formatNumber
} from "@/lib/remajaPutriHelper";
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

interface RemajaPutriDataQualityProps {
    allRecords: RemajaPutriRawRecord[];
    refPuskesmas: { id: string; name: string }[];
    refDesa: { id: string; name: string; puskesmas_id: string }[];
    year: string;
    mode: "bulanan" | "triwulan" | "tahun_ajaran";
    periodVal: number;
    selectedPuskesmas: string;
    setSelectedPuskesmas?: (p: string) => void;
    selectedKelurahan: string;
    setSelectedKelurahan?: (k: string) => void;
    isPuskesmasAdmin: boolean;
    availableDesaList?: { id: string; name: string }[];
}

export default function RemajaPutriDataQuality({
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
}: RemajaPutriDataQualityProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<"ALL" | "COMPLETE" | "PARTIAL" | "EMPTY">("ALL");

    const isDesaLevel = selectedPuskesmas !== "ALL";

    // Filter by year
    const yearRecords = useMemo(() => {
        return allRecords.filter((r) => String(r.tahun) === year);
    }, [allRecords, year]);

    // Current period filtered records
    const filteredRecords = useMemo(() => {
        return filterRemajaPutriRecords(yearRecords, mode, periodVal, year, "ALL", "ALL");
    }, [yearRecords, mode, periodVal, year]);

    // Run DQA checks on filtered records (scoped if Puskesmas selected)
    const dqaIssues = useMemo(() => {
        const issues: { type: "critical" | "warning"; message: string; count: number }[] = [];

        let ttdMismatch = 0;
        let screeningOverflow = 0;
        let anemiaMismatch = 0;
        let treatmentOverflow = 0;

        const recordsToAudit = isDesaLevel
            ? filteredRecords.filter((r) => r.puskesmas.toLowerCase().trim() === selectedPuskesmas.toLowerCase().trim())
            : filteredRecords;

        recordsToAudit.forEach((r) => {
            // 1. TTD Standard vs ge26 invariant
            if (r.ttd_received_standard !== r.ttd_received_ge26) {
                ttdMismatch++;
            }
            // 2. Screening > Target
            const t710 = (Number(r.target_grade7) || 0) + (Number(r.target_grade10) || 0);
            const s710 = (Number(r.screened_grade7) || 0) + (Number(r.screened_grade10) || 0);
            if (t710 > 0 && s710 > t710) {
                screeningOverflow++;
            }
            // 3. Anemia severity sum mismatch
            const k7Total = (Number(r.anemia_grade7_mild) || 0) + (Number(r.anemia_grade7_moderate) || 0) + (Number(r.anemia_grade7_severe) || 0);
            const k10Total = (Number(r.anemia_grade10_mild) || 0) + (Number(r.anemia_grade10_moderate) || 0) + (Number(r.anemia_grade10_severe) || 0);
            const sumAnemia = k7Total + k10Total;
            if (r.anemia_total_uploaded && r.anemia_total_uploaded > 0 && r.anemia_total_uploaded !== sumAnemia) {
                anemiaMismatch++;
            }
            // 4. Treatment > Anemia Total
            if (r.anemia_treated > sumAnemia && sumAnemia > 0) {
                treatmentOverflow++;
            }
        });

        if (screeningOverflow > 0) {
            issues.push({
                type: "warning",
                message: "Jumlah siswi diskrining melebihi sasaran terdaftar (Denom Overflow)",
                count: screeningOverflow
            });
        }
        if (treatmentOverflow > 0) {
            issues.push({
                type: "critical",
                message: "Jumlah siswi ditatalaksana melebihi total kasus anemia yang ditemukan",
                count: treatmentOverflow
            });
        }
        if (anemiaMismatch > 0) {
            issues.push({
                type: "warning",
                message: "Jumlah total anemia uploaded tidak sama persis dengan penjumlahan ringan + sedang + berat",
                count: anemiaMismatch
            });
        }
        if (ttdMismatch > 0) {
            issues.push({
                type: "warning",
                message: "Jumlah TTD sesuai standar berbeda dari rincian ≥26 tablet",
                count: ttdMismatch
            });
        }

        return issues;
    }, [filteredRecords, isDesaLevel, selectedPuskesmas]);

    // Master statistics
    const totalMasterDesa = refDesa.length > 0 ? refDesa.length : 390;
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
            const sasaran = Number(found?.target_rematri) || 0;
            const status: "COMPLETE" | "EMPTY" = hasData ? "COMPLETE" : "EMPTY";

            return {
                desa: desaName,
                puskesmas: selectedPuskesmas,
                reportedMonth,
                sasaran,
                status
            };
        });
    }, [isDesaLevel, desaInScope, puskesmasCurrentRecords, selectedPuskesmas]);

    // Contextual scorecards
    const totalDesaInView = isDesaLevel ? desaInScope.length : totalMasterDesa;
    const reportingDesaCount = isDesaLevel
        ? desaReportSummary.filter((d) => d.status === "COMPLETE").length
        : reportingDesaSet.size;
    const completenessRate = totalDesaInView > 0 ? Math.round((reportingDesaCount / totalDesaInView) * 1000) / 10 : 0;
    const missingDesaCount = Math.max(0, totalDesaInView - reportingDesaCount);

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
                pct,
                status
            };
        });

        return list.sort((a, b) => b.pct - a.pct || a.puskesmas.localeCompare(b.puskesmas));
    }, [filteredRecords, refPuskesmas, refDesa]);

    const filteredSummary = useMemo(() => {
        return puskesmasReportSummary.filter((p) => {
            const matchesSearch = p.puskesmas.toLowerCase().includes(searchTerm.toLowerCase().trim());
            const matchesStatus = filterStatus === "ALL" || p.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [puskesmasReportSummary, searchTerm, filterStatus]);

    const filteredDesa = useMemo(() => {
        return desaReportSummary.filter((d) => {
            const matchesSearch = d.desa.toLowerCase().includes(searchTerm.toLowerCase().trim());
            const matchesStatus = filterStatus === "ALL" || d.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [desaReportSummary, searchTerm, filterStatus]);

    return (
        <div className="space-y-6">
            {/* Header Description */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-pink-600" />
                    <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                        Kelengkapan Data Laporan & Data Quality Assessment (DQA) {isDesaLevel && `— Puskesmas ${selectedPuskesmas}`}
                    </h2>
                </div>
                <p className="text-xs text-slate-500">
                    Audit integritas data indikator Remaja Putri untuk mendeteksi desa/kelurahan yang belum melaporkan, kepatuhan batas Tahun Ajaran, serta inkonsistensi matematis data SIGIZI Kesga.
                </p>
            </div>

            {/* Completeness Scorecards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {isDesaLevel ? "Desa Terdata di Puskesmas" : "Kelengkapan Wilayah"}
                        </span>
                        <Building2 className="w-4 h-4 text-pink-500" />
                    </div>
                    <div className="text-3xl font-black text-slate-900 mt-2">
                        {completenessRate}%
                    </div>
                    <div className="text-xs text-slate-500 mt-1 font-mono">
                        {reportingDesaCount} dari {totalDesaInView} Desa/Kel
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {isDesaLevel ? "Status Puskesmas" : "Puskesmas Melapor"}
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-3xl font-black text-emerald-700 mt-2">
                        {isDesaLevel
                            ? (reportingDesaCount > 0 ? "Aktif Entri" : "Belum Entri")
                            : `${puskesmasReportSummary.filter((p) => p.reported > 0).length} / ${totalMasterPuskesmas}`}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        {isDesaLevel
                            ? `Wilayah kerja Puskesmas ${selectedPuskesmas}`
                            : "Puskesmas memiliki data pada periode ini"}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Belum Ada Laporan</span>
                        <XCircle className="w-4 h-4 text-rose-500" />
                    </div>
                    <div className="text-3xl font-black text-rose-600 mt-2">
                        {missingDesaCount}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Desa belum entry data</div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Temuan Audit DQA</span>
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-3xl font-black text-amber-600 mt-2">
                        {dqaIssues.reduce((acc, i) => acc + i.count, 0)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 font-medium">
                        {dqaIssues.length > 0 ? `${dqaIssues.length} jenis anomali terdeteksi` : "Data konsisten & valid"}
                    </div>
                </div>
            </div>

            {/* DQA Issues List */}
            {dqaIssues.length > 0 && (
                <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm space-y-3 bg-amber-50/20">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Daftar Peringatan Kualitas Data (Data Quality Anomalies)</span>
                    </div>
                    <div className="space-y-2">
                        {dqaIssues.map((issue, idx) => (
                            <div key={idx} className="flex items-start justify-between text-xs bg-white p-3 rounded-xl border border-amber-100 shadow-2xs">
                                <span className="text-slate-700">{issue.message}</span>
                                <span className="font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-mono">
                                    {issue.count} baris
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Completion Table (Puskesmas or Desa based on selection/RBAC) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800 text-sm">
                                {isDesaLevel
                                    ? `Kepatuhan Pelaporan per Desa / Kelurahan — Puskesmas ${selectedPuskesmas}`
                                    : "Kepatuhan Pelaporan per Puskesmas"}
                            </h3>
                            {isDesaLevel && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-pink-100 text-pink-700">
                                    Wilayah Puskesmas {selectedPuskesmas}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {isDesaLevel
                                ? `Persentase dan progres desa di wilayah kerja Puskesmas ${selectedPuskesmas} yang telah memasukkan laporan.`
                                : "Persentase desa di wilayah kerja yang telah memasukkan laporan indikator Remaja Putri."}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative min-w-[200px]">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder={isDesaLevel ? "Cari Desa/Kelurahan..." : "Cari Puskesmas..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                            />
                        </div>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="text-xs font-semibold rounded-xl border border-slate-200 py-1.5 px-3 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
                        >
                            <option value="ALL">Semua Status</option>
                            <option value="COMPLETE">Lengkap</option>
                            {!isDesaLevel && <option value="PARTIAL">Sebagian</option>}
                            <option value="EMPTY">Belum Lapor</option>
                        </select>

                        {isDesaLevel && !isPuskesmasAdmin && (
                            <button
                                onClick={() => setSelectedPuskesmas?.("ALL")}
                                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-pink-50 text-pink-700 hover:bg-pink-100 transition-colors flex items-center gap-1.5 shrink-0"
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
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Nama Desa / Kelurahan</th>
                                    <th className="py-3 px-3 text-center">Sasaran Rematri</th>
                                    <th className="py-3 px-3 text-center">Periode Lapor Terdata</th>
                                    <th className="py-3 px-3 text-center">Status Kelengkapan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredDesa.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-slate-400">
                                            Tidak ada data desa yang cocok dengan pencarian.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredDesa.map((row) => (
                                        <tr key={row.desa} className="hover:bg-pink-50/20 transition-colors">
                                            <td className="py-3 px-4 font-bold text-slate-800">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3.5 h-3.5 text-pink-600" />
                                                    <span>{row.desa}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                                                {row.sasaran > 0 ? formatNumber(row.sasaran) : "-"}
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                {row.status === "COMPLETE" ? (
                                                    <span className="text-slate-700 font-medium">{row.reportedMonth}</span>
                                                ) : (
                                                    <span className="text-rose-500 font-semibold">Belum Ada Data</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                {row.status === "COMPLETE" ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <CheckCircle2 className="w-3 h-3" /> Lengkap
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
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
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Nama Puskesmas</th>
                                    <th className="py-3 px-3 text-center">Desa Terdata</th>
                                    <th className="py-3 px-3 text-center">Total Desa Master</th>
                                    <th className="py-3 px-3 text-center">% Kelengkapan</th>
                                    <th className="py-3 px-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredSummary.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-400">
                                            Tidak ada data yang sesuai.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSummary.map((p) => (
                                        <tr
                                            key={p.puskesmas}
                                            onClick={() => setSelectedPuskesmas?.(p.puskesmas)}
                                            className="hover:bg-pink-50/20 transition-colors cursor-pointer"
                                            title="Klik untuk melihat rincian kepatuhan per desa"
                                        >
                                            <td className="py-3 px-4 font-bold text-slate-800">
                                                <div className="flex items-center gap-1.5">
                                                    <span>{p.puskesmas}</span>
                                                    <span className="text-[10px] text-pink-600 font-normal">↗</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                                                {p.reported}
                                            </td>
                                            <td className="py-3 px-3 text-center font-mono text-slate-500">
                                                {p.totalDesa}
                                            </td>
                                            <td className="py-3 px-3 text-center font-mono font-bold">
                                                <span className={p.pct >= 100 ? "text-emerald-700" : p.pct > 0 ? "text-amber-700" : "text-rose-700"}>
                                                    {p.pct}%
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                {p.status === "COMPLETE" && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        Lengkap
                                                    </span>
                                                )}
                                                {p.status === "PARTIAL" && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                        Sebagian
                                                    </span>
                                                )}
                                                {p.status === "EMPTY" && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                        Belum Ada
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
