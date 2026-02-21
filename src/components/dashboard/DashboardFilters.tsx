import React from "react";

interface DashboardFiltersProps {
    filterTahun: number | null;
    setFilterTahun: (val: number | null) => void;
    filterBulan: number | null;
    setFilterBulan: (val: number | null) => void;
    filterPuskesmas: string;
    setFilterPuskesmas: (val: string) => void;
    availableYears: number[];
    availableMonths: number[];
    availablePuskesmas: string[];
    bulanLabels: Record<number, string>;
    filterDesa?: string;
    setFilterDesa?: (val: string) => void;
    availableDesa?: string[];
    lockedPuskesmas?: string | null;
    showDesaFilter?: boolean;
}

export default function DashboardFilters({
    filterTahun,
    setFilterTahun,
    filterBulan,
    setFilterBulan,
    filterPuskesmas,
    setFilterPuskesmas,
    availableYears,
    availableMonths,
    availablePuskesmas,
    bulanLabels,
    // New Props for Desa
    filterDesa,
    setFilterDesa,
    availableDesa,
    lockedPuskesmas,
    showDesaFilter = true,
}: DashboardFiltersProps) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4">
                <span className="material-icons-round text-emerald-600">filter_alt</span>
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Filter Data</h2>
            </div>
            <div className={`grid grid-cols-1 ${filterPuskesmas !== "all" ? "sm:grid-cols-4" : "sm:grid-cols-3"} gap-4`}>
                {/* Tahun */}
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                        Tahun
                    </label>
                    <select
                        value={filterTahun || ""}
                        onChange={(e) => {
                            const v = e.target.value ? Number(e.target.value) : null;
                            setFilterTahun(v);
                            setFilterBulan(null);
                        }}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                    >
                        <option value="">Semua Tahun</option>
                        {availableYears.map((y) => (
                            <option key={y} value={y}>
                                {y}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Bulan */}
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                        Bulan
                    </label>
                    <select
                        value={filterBulan || ""}
                        onChange={(e) => setFilterBulan(e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                    >
                        <option value="">Semua Bulan</option>
                        {availableMonths.map((m) => (
                            <option key={m} value={m}>
                                {bulanLabels[m]}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Puskesmas */}
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                        Puskesmas
                    </label>
                    {lockedPuskesmas ? (
                        <div className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 font-medium flex items-center gap-2 cursor-not-allowed">
                            <span className="material-icons-round text-base text-slate-400">lock</span>
                            {lockedPuskesmas}
                        </div>
                    ) : (
                        <select
                            value={filterPuskesmas}
                            onChange={(e) => setFilterPuskesmas(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                        >
                            <option value="all">Semua Puskesmas</option>
                            {availablePuskesmas.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Desa (Only if Puskesmas selected) */}
                {showDesaFilter && filterPuskesmas !== "all" && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                            Desa / Kelurahan
                        </label>
                        <select
                            value={filterDesa || "all"}
                            onChange={(e) => setFilterDesa && setFilterDesa(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                        >
                            <option value="all">Semua Desa</option>
                            {availableDesa?.map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
}
