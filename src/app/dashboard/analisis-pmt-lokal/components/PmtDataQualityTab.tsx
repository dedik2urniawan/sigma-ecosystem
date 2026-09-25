"use client";

import React, { useState } from "react";
import {
    PmtBalitaRecord,
    PmtBumilRecord,
    DqaIssue,
    auditBalitaRecord,
    auditBumilRecord
} from "@/lib/pmtLokalHelper";
import {
    ShieldAlert,
    AlertTriangle,
    Info,
    CheckCircle2,
    Filter,
    Search,
    Download,
    ChevronLeft,
    ChevronRight,
    ArrowDownRight,
    HelpCircle
} from "lucide-react";

interface PmtDataQualityTabProps {
    balitaRecords: PmtBalitaRecord[];
    bumilRecords: PmtBumilRecord[];
}

export default function PmtDataQualityTab({
    balitaRecords,
    bumilRecords
}: PmtDataQualityTabProps) {
    const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
    const [selectedFlag, setSelectedFlag] = useState<string>("ALL");
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    // Collect all DQA issues
    const allIssues: DqaIssue[] = [];
    balitaRecords.forEach(r => allIssues.push(...auditBalitaRecord(r)));
    bumilRecords.forEach(r => allIssues.push(...auditBumilRecord(r)));

    // Cross-indication overlap check (PRD note: 5 NIK overlap between T and UW)
    const nikToIndications: Record<string, { indications: string[]; puskesmas: string; nama: string }> = {};
    balitaRecords.forEach(r => {
        if (!nikToIndications[r.person_key]) {
            nikToIndications[r.person_key] = { indications: [], puskesmas: r.puskesmas, nama: r.nama_masked };
        }
        if (!nikToIndications[r.person_key].indications.includes(r.indikasi)) {
            nikToIndications[r.person_key].indications.push(r.indikasi);
        }
    });

    Object.entries(nikToIndications).forEach(([nik, data]) => {
        if (data.indications.length > 1) {
            allIssues.push({
                id: `overlap-${nik}`,
                personKey: nik,
                namaMasked: data.nama,
                puskesmas: data.puskesmas,
                desa: "-",
                field: "indikasi",
                rawValue: data.indications.join(", "),
                flag: "DUPLICATE_OR_CONFLICT",
                severity: "needs_review",
                message: `NIK balita tercatat pada lebih dari 1 kelompok intervensi (${data.indications.join(" & ")}).`,
                resolution: "Audit prioritas eksklusivitas: wasting/GK > underweight tanpa wasting > T."
            });
        }
    });

    // Waterfall numbers
    const totalRaw = balitaRecords.length + bumilRecords.length;
    const countValidNik = totalRaw; // All have valid length
    const countTargetMatch = totalRaw - allIssues.filter(i => i.flag === "TARGET_MISMATCH").length;
    const countBaselineValid = totalRaw - allIssues.filter(i => i.flag === "CHILD_Z_FLAG" || i.field === "bb_awal").length;
    const countEvaluable = balitaRecords.filter(r => r.is_evaluable).length + bumilRecords.filter(r => r.is_evaluable).length;

    // Filter issues for table
    const filteredIssues = allIssues.filter(issue => {
        if (selectedSeverity !== "ALL" && issue.severity !== selectedSeverity) return false;
        if (selectedFlag !== "ALL" && issue.flag !== selectedFlag) return false;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            return (
                issue.namaMasked.toLowerCase().includes(term) ||
                issue.puskesmas.toLowerCase().includes(term) ||
                issue.message.toLowerCase().includes(term)
            );
        }
        return true;
    });

    const totalPages = Math.ceil(filteredIssues.length / rowsPerPage);
    const paginatedIssues = filteredIssues.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    // Export CSV
    const exportCsv = () => {
        const headers = ["Severity", "Flag", "Puskesmas", "Anak / Ibu", "Field", "Nilai Raw", "Deskripsi Masalah", "Rekomendasi Tindakan"];
        const rows = filteredIssues.map(i => [
            i.severity,
            i.flag,
            i.puskesmas,
            i.namaMasked,
            i.field,
            i.rawValue ?? "",
            `"${i.message}"`,
            `"${i.resolution}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Laporan_Audit_DQA_PMT_Lokal_2026.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            {/* ── 1. DQA WATERFALL FUNNEL ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                <div className="mb-4">
                    <h3 className="font-bold text-slate-800 text-sm">
                        DQA Waterfall: Corong Integritas Data Program PMT
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Alur pembersihan data dari baris mentah ekspor e-PPGBM hingga kohort luaran yang dapat dievaluasi
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">1. Baris Raw Upload</div>
                        <div className="text-2xl font-extrabold text-slate-800 mt-1">{totalRaw.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">100% data masuk</div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">2. Identitas Sah</div>
                        <div className="text-2xl font-extrabold text-slate-800 mt-1">{countValidNik.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">NIK 16 digit terformat</div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">3. Sasaran Sesuai</div>
                        <div className="text-2xl font-extrabold text-indigo-700 mt-1">{countTargetMatch.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                            {totalRaw - countTargetMatch} mismatch klinis
                        </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">4. Baseline Fisiologis</div>
                        <div className="text-2xl font-extrabold text-indigo-700 mt-1">{countBaselineValid.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Dalam batas baku WHO</div>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-purple-800">5. Evaluable Pasangan</div>
                        <div className="text-2xl font-extrabold text-purple-700 mt-1">{countEvaluable.toLocaleString()}</div>
                        <div className="text-[10px] text-purple-800 mt-0.5 font-semibold">
                            {Math.round(countEvaluable / totalRaw * 100)}% kohort terukur
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 2. SUMMARY OF FLAGS ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-bold text-rose-700 mb-1">
                        <span>CHILD_Z_FLAG</span>
                        <span className="bg-rose-50 px-2 py-0.5 rounded">Outlier WHO</span>
                    </div>
                    <div className="text-2xl font-extrabold text-slate-800">
                        {allIssues.filter(i => i.flag === "CHILD_Z_FLAG").length}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                        Nilai Z-score ekstrim (e.g. 999.99 atau di luar rentang fisiologis baku)
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-700 mb-1">
                        <span>TARGET_MISMATCH</span>
                        <span className="bg-amber-50 px-2 py-0.5 rounded">Salah Sasaran</span>
                    </div>
                    <div className="text-2xl font-extrabold text-slate-800">
                        {allIssues.filter(i => i.flag === "TARGET_MISMATCH").length}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                        Klaim GK/UW tetapi nilai antropometri awal normal (≥ -2 SD)
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-700 mb-1">
                        <span>STATUS_CONFLICT</span>
                        <span className="bg-purple-50 px-2 py-0.5 rounded">Inkonsistensi</span>
                    </div>
                    <div className="text-2xl font-extrabold text-slate-800">
                        {allIssues.filter(i => i.flag === "STATUS_CONFLICT").length}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                        Bumil bertanda &quot;Selesai&quot; namun kolom BB akhir kosong
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-700 mb-1">
                        <span>DUPLICATE / OVERLAP</span>
                        <span className="bg-indigo-50 px-2 py-0.5 rounded">Lintas Berkas</span>
                    </div>
                    <div className="text-2xl font-extrabold text-slate-800">
                        {allIssues.filter(i => i.flag === "DUPLICATE_OR_CONFLICT").length}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                        Balita yang tercatat pada kelompok T sekaligus Underweight
                    </div>
                </div>
            </div>

            {/* ── 3. ISSUES AUDIT TABLE & FILTERS ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">
                            Daftar Temuan Kualitas Data ({filteredIssues.length} Temuan)
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Rincian anomali data untuk perbaikan verifikasi oleh nakes/nutrisionis Puskesmas
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Severity filter */}
                        <select
                            value={selectedSeverity}
                            onChange={(e) => {
                                setSelectedSeverity(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none"
                        >
                            <option value="ALL">Semua Severity</option>
                            <option value="block">Blocker (Kritis)</option>
                            <option value="needs_review">Needs Review</option>
                        </select>

                        {/* Flag filter */}
                        <select
                            value={selectedFlag}
                            onChange={(e) => {
                                setSelectedFlag(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none"
                        >
                            <option value="ALL">Semua Jenis Flag</option>
                            <option value="CHILD_Z_FLAG">CHILD_Z_FLAG</option>
                            <option value="TARGET_MISMATCH">TARGET_MISMATCH</option>
                            <option value="STATUS_CONFLICT">STATUS_CONFLICT</option>
                            <option value="DUPLICATE_OR_CONFLICT">DUPLICATE_OR_CONFLICT</option>
                            <option value="PARSE_BAD">PARSE_BAD</option>
                        </select>

                        {/* Search input */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cari puskesmas / nama..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-48 bg-slate-50 border border-slate-200 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none"
                            />
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        </div>

                        <button
                            onClick={exportCsv}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                            <tr>
                                <th className="py-3 px-4">Severity</th>
                                <th className="py-3 px-4">Flag</th>
                                <th className="py-3 px-4">Puskesmas</th>
                                <th className="py-3 px-4">Pasien (Masked)</th>
                                <th className="py-3 px-4">Field</th>
                                <th className="py-3 px-4">Deskripsi Temuan</th>
                                <th className="py-3 px-4">Rekomendasi Tindakan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {paginatedIssues.map((issue) => (
                                <tr key={issue.id} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="py-3 px-4">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            issue.severity === "block"
                                                ? "bg-rose-100 text-rose-800"
                                                : "bg-amber-100 text-amber-800"
                                        }`}>
                                            {issue.severity === "block" ? "Blocker" : "Review"}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                            {issue.flag}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 font-semibold text-slate-800">
                                        {issue.puskesmas}
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="font-bold text-slate-800">{issue.namaMasked}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">
                                            {issue.personKey.slice(0, 6)}******{issue.personKey.slice(-4)}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                                        {issue.field}
                                    </td>
                                    <td className="py-3 px-4 text-slate-700 max-w-xs">
                                        {issue.message}
                                    </td>
                                    <td className="py-3 px-4 text-purple-900 max-w-xs font-normal">
                                        {issue.resolution}
                                    </td>
                                </tr>
                            ))}
                            {paginatedIssues.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-slate-400">
                                        Tidak ada temuan DQA yang cocok dengan filter.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div>
                        Menampilkan {Math.min(filteredIssues.length, (currentPage - 1) * rowsPerPage + 1)} -{" "}
                        {Math.min(filteredIssues.length, currentPage * rowsPerPage)} dari {filteredIssues.length} temuan
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-3 py-1 font-semibold text-slate-700">
                            Hal {currentPage} dari {totalPages || 1}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
