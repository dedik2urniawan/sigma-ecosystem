"use client";

import { useState, useEffect } from "react";
import { Calendar, Filter, Download, Building2, Lock } from "lucide-react";

interface FilterSectionProps {
    onFilterChange: (year: number, month: number, puskesmasId?: string) => void;
    onExport?: () => void;
    selectedYear?: number;
    selectedMonth?: number;
    selectedPuskesmasId?: string;
    puskesmasList?: { id: string; nama: string }[];
    isPuskesmasAdmin?: boolean;
    userPuskesmasName?: string;
}

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

const MONTHS = [
    { value: 1, label: "Januari" },
    { value: 2, label: "Februari" },
    { value: 3, label: "Maret" },
    { value: 4, label: "April" },
    { value: 5, label: "Mei" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "Agustus" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "Desember" },
];

const YEARS = Array.from({ length: CURRENT_YEAR - 2019 }, (_, i) => 2020 + i);

export default function FilterSection({
    onFilterChange,
    onExport,
    selectedYear: initialYear,
    selectedMonth: initialMonth,
    selectedPuskesmasId: initialPuskesmasId = "ALL",
    puskesmasList = [],
    isPuskesmasAdmin = false,
    userPuskesmasName = ""
}: FilterSectionProps) {
    const [selectedYear, setSelectedYear] = useState(initialYear || CURRENT_YEAR);
    const [selectedMonth, setSelectedMonth] = useState(initialMonth || CURRENT_MONTH);
    const [selectedPuskesmas, setSelectedPuskesmas] = useState(initialPuskesmasId || "ALL");

    useEffect(() => {
        if (initialPuskesmasId) {
            setSelectedPuskesmas(initialPuskesmasId);
        }
    }, [initialPuskesmasId]);

    const handleApply = () => {
        onFilterChange(selectedYear, selectedMonth, selectedPuskesmas);
    };

    const activePkmLabel = isPuskesmasAdmin
        ? `Puskesmas ${userPuskesmasName || 'Anda'}`
        : selectedPuskesmas === "ALL"
            ? "Semua Puskesmas (Kabupaten Malang)"
            : `Puskesmas ${puskesmasList.find(p => p.id === selectedPuskesmas)?.nama || selectedPuskesmas}`;

    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                    <Filter className="text-white" size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Filter Analisis PKMK</h3>
                    <p className="text-sm text-gray-600">Pilih wilayah puskesmas, tahun, dan bulan untuk monitoring</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 items-end">
                {/* Wilayah Puskesmas Filter */}
                <div className="flex-1 min-w-[240px]">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Building2 size={14} className="inline mr-1 text-slate-500" />
                        Wilayah Puskesmas
                    </label>
                    {isPuskesmasAdmin ? (
                        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border-2 border-slate-200 bg-slate-50 text-slate-700 font-bold text-sm">
                            <Lock size={14} className="text-amber-500 shrink-0" />
                            <span className="truncate">Puskesmas {userPuskesmasName || "Anda"}</span>
                            <span className="ml-auto text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 shrink-0">
                                Terkunci
                            </span>
                        </div>
                    ) : (
                        <select
                            value={selectedPuskesmas}
                            onChange={(e) => setSelectedPuskesmas(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white font-medium"
                        >
                            <option value="ALL">Semua Puskesmas (Kabupaten Malang)</option>
                            {puskesmasList.map((p) => (
                                <option key={p.id} value={p.id}>{p.nama}</option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Tahun Filter */}
                <div className="w-full sm:w-36">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Calendar size={14} className="inline mr-1" />
                        Tahun
                    </label>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white font-medium"
                    >
                        {YEARS.map((year) => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>

                {/* Bulan Filter */}
                <div className="w-full sm:w-44">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Calendar size={14} className="inline mr-1" />
                        Bulan
                    </label>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white font-medium"
                    >
                        {MONTHS.map((month) => (
                            <option key={month.value} value={month.value}>{month.label}</option>
                        ))}
                    </select>
                </div>

                {/* Action Buttons */}
                <button
                    onClick={handleApply}
                    className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer"
                >
                    <Filter size={18} />
                    Terapkan
                </button>

                {onExport && (
                    <button
                        onClick={onExport}
                        className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer"
                    >
                        <Download size={18} />
                        Export PDF
                    </button>
                )}
            </div>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-blue-800">
                    <span className="font-semibold">Filter aktif:</span> {activePkmLabel} &bull; Periode: {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
                </p>
                <span className="text-xs text-blue-600 font-medium">(Data dihitung kumulatif sampai periode ini)</span>
            </div>
        </div>
    );
}
