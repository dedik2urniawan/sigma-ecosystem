"use client";

import React, { useState, useMemo } from "react";
import { CiafVillageSummary } from "@/lib/ciaf-data";
import * as XLSX from "xlsx";

interface CiafTriageTableProps {
    data: CiafVillageSummary[];
}

type SortKey = keyof CiafVillageSummary;

export default function CiafTriageTable({ data }: CiafTriageTableProps) {
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [sortCol, setSortCol] = useState<SortKey>("riskScore");
    const [sortAsc, setSortAsc] = useState(false); // Default desc risk
    const [search, setSearch] = useState("");

    const filteredData = useMemo(() => {
        let res = [...data];
        if (search) {
            const lowerString = search.toLowerCase();
            res = res.filter(
                (r) =>
                    r.namaDesa.toLowerCase().includes(lowerString) ||
                    r.namaPuskesmas.toLowerCase().includes(lowerString)
            );
        }
        res.sort((a, b) => {
            const valA = a[sortCol];
            const valB = b[sortCol];
            if (typeof valA === "string" && typeof valB === "string") {
                return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            if (typeof valA === "number" && typeof valB === "number") {
                return sortAsc ? valA - valB : valB - valA;
            }
            return 0;
        });
        return res;
    }, [data, search, sortCol, sortAsc]);

    const totalPages = rowsPerPage > 0 ? Math.ceil(filteredData.length / rowsPerPage) : 1;
    const paginatedData = useMemo(() => {
        if (rowsPerPage === 0) return filteredData;
        const start = (page - 1) * rowsPerPage;
        return filteredData.slice(start, start + rowsPerPage);
    }, [filteredData, page, rowsPerPage]);

    const handleSort = (col: SortKey) => {
        if (sortCol === col) {
            setSortAsc(!sortAsc);
        } else {
            setSortCol(col);
            setSortAsc(col === "namaDesa" || col === "namaPuskesmas" ? true : false); // Default asc for name, desc for nums
        }
    };

    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(
            filteredData.map((row) => ({
                "Desa/Kelurahan": row.namaDesa,
                "Puskesmas": row.namaPuskesmas,
                "Total Balita": row.totalBalita,
                "Total CIAF (Count)": row.totalCiaf,
                "Total CIAF (%)": row.ciafRate ? `${row.ciafRate.toFixed(2)}%` : "0%",
                "Multiple Failure (Group D) Count": row.groupD,
                "Multiple Failure (Group D) %": row.totalBalita ? ((row.groupD / row.totalBalita) * 100).toFixed(2) + "%" : "0%",
                "Stunting Only (Group F)": row.groupF,
                "Wasting Only (Group B)": row.groupB,
                "Underweight Only (Group Y)": row.groupY,
                "Risk Score": row.riskScore.toFixed(2),
                "Rekomendasi": row.recommendation,
            }))
        );
        XLSX.utils.book_append_sheet(wb, ws, "Triage CIAF");
        XLSX.writeFile(wb, `ciaf_triage_export_${new Date().toISOString().split("T")[0]}.xlsx`);
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <span className="material-icons-round text-xl text-indigo-600">medical_services</span>
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Triage & Rekomendasi Wilayah</h3>
                        <p className="text-xs text-slate-500">Prioritas intervensi berdasarkan tingkat keparahan (Group D & C)</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                        <input
                            type="text"
                            placeholder="Cari desa..."
                            className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-48 sm:w-64"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <button
                        onClick={handleExportExcel}
                        className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-all flex items-center gap-1.5"
                    >
                        <span className="material-icons-round text-sm">download</span> Excel
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono w-12">No</th>
                            <th onClick={() => handleSort("namaDesa")} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono cursor-pointer hover:text-indigo-600 w-40">
                                Wilayah {sortCol === "namaDesa" && (sortAsc ? "↑" : "↓")}
                            </th>
                            <th onClick={() => handleSort("totalBalita")} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono cursor-pointer hover:text-indigo-600">
                                Sasaran {sortCol === "totalBalita" && (sortAsc ? "↑" : "↓")}
                            </th>
                            <th onClick={() => handleSort("riskScore")} className="px-4 py-3 text-left text-[10px] font-bold text-red-600 uppercase tracking-widest font-mono cursor-pointer hover:text-red-800 bg-red-50/50">
                                Risk Score {sortCol === "riskScore" && (sortAsc ? "↑" : "↓")}
                            </th>
                            <th onClick={() => handleSort("groupD")} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono cursor-pointer hover:text-indigo-600">
                                Multiple (D) {sortCol === "groupD" && (sortAsc ? "↑" : "↓")}
                            </th>
                            <th onClick={() => handleSort("groupC")} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono cursor-pointer hover:text-indigo-600">
                                C (Waste+Under) {sortCol === "groupC" && (sortAsc ? "↑" : "↓")}
                            </th>
                            <th onClick={() => handleSort("groupF")} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono cursor-pointer hover:text-indigo-600">
                                Single (F) {sortCol === "groupF" && (sortAsc ? "↑" : "↓")}
                            </th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                                Rekomendasi Intervensi
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paginatedData.map((row, i) => {
                            const actualIdx = (page - 1) * rowsPerPage + i + 1;
                            return (
                                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-4 py-3 text-slate-400 font-mono text-xs text-center">{actualIdx}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-slate-700">{row.namaDesa}</div>
                                        <div className="text-[10px] text-slate-400">{row.namaPuskesmas}</div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-slate-600">{row.totalBalita}</td>
                                    <td className="px-4 py-3 font-mono font-bold text-red-600 bg-red-50/30">
                                        {row.riskScore.toFixed(1)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-700">{row.groupD}</span>
                                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                                                {row.totalBalita ? ((row.groupD / row.totalBalita) * 100).toFixed(1) : 0}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-700">{row.groupC}</span>
                                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                                                {row.totalBalita ? ((row.groupC / row.totalBalita) * 100).toFixed(1) : 0}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-slate-500">{row.groupF}</td>
                                    <td className="px-4 py-3">
                                        <div className={`
                                            inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border
                                            ${row.recommendationColor === 'red' ? 'bg-red-50 text-red-700 border-red-100' :
                                                row.recommendationColor === 'orange' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                    row.recommendationColor === 'yellow' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                                        'bg-emerald-50 text-emerald-700 border-emerald-100'}
                                        `}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${row.recommendationColor === 'red' ? 'bg-red-500' :
                                                    row.recommendationColor === 'orange' ? 'bg-orange-500' :
                                                        row.recommendationColor === 'yellow' ? 'bg-yellow-500' :
                                                            'bg-emerald-500'
                                                }`}></span>
                                            {row.recommendation}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {paginatedData.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-sm">
                        Tidak ada data ditemukan
                    </div>
                )}
            </div>

            {/* Pagination Controls - Simplified */}
            <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500">
                    Menampilkan {paginatedData.length} dari {filteredData.length} data
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 rounded-lg hover:bg-slate-50 disabled:opacity-30 border border-slate-200"
                    >
                        <span className="material-icons-round text-sm">chevron_left</span>
                    </button>
                    <span className="text-sm font-bold text-slate-600 px-2">Halaman {page}</span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-2 rounded-lg hover:bg-slate-50 disabled:opacity-30 border border-slate-200"
                    >
                        <span className="material-icons-round text-sm">chevron_right</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
