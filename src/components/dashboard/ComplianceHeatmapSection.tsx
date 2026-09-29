"use client";

import React, { useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import {
    CheckCircle2,
    XCircle,
    Search,
    MapPin,
    ArrowUpDown,
    Download,
    ChevronDown,
    ChevronUp,
    Calendar,
    Building2,
    ShieldAlert,
    X,
    Filter,
    Layers,
    Info,
    Check
} from "lucide-react";

export type IndicatorType = "balita" | "bumil" | "rematri";

export interface RefPuskesmasItem {
    id: string;
    name: string;
}

export interface RefDesaItem {
    id: string;
    name: string;
    puskesmas_id?: string;
    nama_puskesmas?: string;
}

export interface ComplianceHeatmapSectionProps {
    indicatorType: IndicatorType;
    year: number | string;
    refPuskesmas: RefPuskesmasItem[];
    refDesa: RefDesaItem[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    records: any[];
    isPuskesmasAdmin?: boolean;
    userPuskesmasName?: string;
    selectedPuskesmas?: string;
    onSelectPuskesmas?: (p: string) => void;
}

const MONTH_SHORT_NAMES: Record<number, string> = {
    1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "Mei", 6: "Jun",
    7: "Jul", 8: "Ags", 9: "Sep", 10: "Okt", 11: "Nov", 12: "Des"
};

const MONTH_FULL_NAMES: Record<number, string> = {
    1: "Januari", 2: "Februari", 3: "Maret", 4: "April", 5: "Mei", 6: "Juni",
    7: "Juli", 8: "Agustus", 9: "September", 10: "Oktober", 11: "November", 12: "Desember"
};

const THEME_CONFIG: Record<
    IndicatorType,
    {
        title: string;
        badge: string;
        description: string;
        accentColor: string;
        lightBg: string;
        borderLight: string;
        ringColor: string;
        badgeColor: string;
        iconName: string;
        tableTitle: string;
        tableSubtitle: string;
        pinColor: string;
    }
> = {
    balita: {
        title: "Heatmap Kepatuhan Pelaporan — Balita Gizi",
        badge: "Indikator Balita Gizi",
        description: "Matriks progres compliance rate pelaporan data balita per puskesmas bulan ke bulan (Januari – Desember).",
        accentColor: "emerald",
        lightBg: "bg-emerald-50",
        borderLight: "border-emerald-200",
        ringColor: "ring-emerald-500",
        badgeColor: "bg-emerald-100 text-emerald-800",
        iconName: "child_care",
        tableTitle: "Status Kepatuhan Pelaporan per Desa / Kelurahan",
        tableSubtitle: "Pantau progres entri indikator Balita Gizi seluruh desa di wilayah kerja puskesmas",
        pinColor: "text-emerald-600"
    },
    bumil: {
        title: "Heatmap Kepatuhan Pelaporan — Ibu Hamil",
        badge: "Indikator Ibu Hamil",
        description: "Matriks progres compliance rate pelaporan data ibu hamil per puskesmas bulan ke bulan (Januari – Desember).",
        accentColor: "purple",
        lightBg: "bg-purple-50",
        borderLight: "border-purple-200",
        ringColor: "ring-purple-500",
        badgeColor: "bg-purple-100 text-purple-800",
        iconName: "pregnant_woman",
        tableTitle: "Status Kepatuhan Pelaporan per Desa / Kelurahan",
        tableSubtitle: "Pantau progres entri indikator Ibu Hamil seluruh desa di wilayah kerja puskesmas",
        pinColor: "text-purple-600"
    },
    rematri: {
        title: "Heatmap Kepatuhan Pelaporan — Remaja Putri",
        badge: "Indikator Remaja Putri",
        description: "Matriks progres compliance rate pelaporan data remaja putri per puskesmas bulan ke bulan (Januari – Desember).",
        accentColor: "pink",
        lightBg: "bg-pink-50",
        borderLight: "border-pink-200",
        ringColor: "ring-pink-500",
        badgeColor: "bg-pink-100 text-pink-800",
        iconName: "face_3",
        tableTitle: "Kepatuhan Pelaporan per Desa / Kelurahan",
        tableSubtitle: "Persentase dan progres desa di wilayah kerja puskesmas yang telah memasukkan laporan indikator Remaja Putri",
        pinColor: "text-pink-600"
    }
};

const norm = (str?: string | null) => (str || "").toLowerCase().trim();

export default function ComplianceHeatmapSection({
    indicatorType,
    year,
    refPuskesmas,
    refDesa,
    records,
    isPuskesmasAdmin = false,
    userPuskesmasName,
    selectedPuskesmas,
    onSelectPuskesmas
}: ComplianceHeatmapSectionProps) {
    const config = THEME_CONFIG[indicatorType];
    const drilldownRef = useRef<HTMLDivElement | null>(null);

    // Collapsible & Filter states
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortBy, setSortBy] = useState<"avg_desc" | "avg_asc" | "name_asc" | "name_desc">("avg_desc");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "100" | "PARTIAL" | "ZERO">("ALL");

    // Drilldown selection
    const [selectedCell, setSelectedCell] = useState<{ puskesmas: string; month: number } | null>(null);
    const [desaSearchTerm, setDesaSearchTerm] = useState("");
    const [desaStatusFilter, setDesaStatusFilter] = useState<"ALL" | "COMPLETE" | "EMPTY">("ALL");

    // Enforce Puskesmas Admin locking
    const effectivePuskesmasLock = useMemo(() => {
        if (!isPuskesmasAdmin) return null;
        if (userPuskesmasName) return userPuskesmasName;
        if (selectedPuskesmas && selectedPuskesmas !== "ALL") return selectedPuskesmas;
        return null;
    }, [isPuskesmasAdmin, userPuskesmasName, selectedPuskesmas]);

    // Build Master Desa Map per Puskesmas
    const desaByPuskesmas = useMemo(() => {
        const map = new Map<string, RefDesaItem[]>();
        const pMapById = new Map<string, string>();

        refPuskesmas.forEach((p) => {
            const pKey = norm(p.name);
            pMapById.set(p.id, pKey);
            if (!map.has(pKey)) {
                map.set(pKey, []);
            }
        });

        refDesa.forEach((d) => {
            let pKey: string | undefined;
            if (d.puskesmas_id && pMapById.has(d.puskesmas_id)) {
                pKey = pMapById.get(d.puskesmas_id);
            } else if (d.nama_puskesmas) {
                pKey = norm(d.nama_puskesmas);
            }

            if (pKey) {
                if (!map.has(pKey)) map.set(pKey, []);
                map.get(pKey)!.push(d);
            }
        });

        // Fallback: If any puskesmas has 0 desa in refDesa, extract from records
        records.forEach((r) => {
            const pKey = norm(r.puskesmas);
            if (pKey && r.kelurahan) {
                if (!map.has(pKey)) map.set(pKey, []);
                const list = map.get(pKey)!;
                if (!list.some((d) => norm(d.name) === norm(r.kelurahan))) {
                    list.push({ id: `${pKey}-${norm(r.kelurahan)}`, name: r.kelurahan });
                }
            }
        });

        return map;
    }, [refPuskesmas, refDesa, records]);

    // Identify active months in kabupaten (months with at least 1 record across the dataset for this year)
    const activeMonthsInKabupaten = useMemo(() => {
        const set = new Set<number>();
        records.forEach((r) => {
            const rTahun = Number(r.tahun);
            const expectedTahun = Number(year);
            if (rTahun === expectedTahun || !rTahun) {
                const b = Number(r.bulan);
                if (b >= 1 && b <= 12) set.add(b);
            }
        });
        return set;
    }, [records, year]);

    // Build monthly compliance matrix per Puskesmas
    const puskesmasMatrix = useMemo(() => {
        // Prepare list of puskesmas to show
        let list = refPuskesmas.map((p) => p.name);
        if (list.length === 0) {
            // Fallback from records
            const set = new Set<string>();
            records.forEach((r) => {
                if (r.puskesmas) set.add(r.puskesmas);
            });
            list = Array.from(set);
        }

        // If locked to puskesmas admin
        if (effectivePuskesmasLock) {
            list = list.filter((p) => norm(p) === norm(effectivePuskesmasLock));
            if (list.length === 0 && effectivePuskesmasLock) {
                list = [effectivePuskesmasLock];
            }
        }

        return list.map((pName) => {
            const pKey = norm(pName);
            const desasList = desaByPuskesmas.get(pKey) || [];
            const totalDesa = desasList.length || 10; // fallback if master desa empty

            const monthlyData: Record<
                number,
                {
                    reportedCount: number;
                    totalDesa: number;
                    pct: number;
                    reportedDesas: Set<string>;
                }
            > = {};

            for (let m = 1; m <= 12; m++) {
                monthlyData[m] = {
                    reportedCount: 0,
                    totalDesa,
                    pct: 0,
                    reportedDesas: new Set<string>()
                };
            }

            // Fill from records
            records.forEach((r) => {
                const rPKey = norm(r.puskesmas);
                if (rPKey === pKey) {
                    const rTahun = Number(r.tahun);
                    const expectedTahun = Number(year);
                    if (rTahun === expectedTahun || !rTahun) {
                        const m = Number(r.bulan);
                        if (m >= 1 && m <= 12 && r.kelurahan) {
                            monthlyData[m].reportedDesas.add(norm(r.kelurahan));
                        }
                    }
                }
            });

            // Calculate percentage
            let totalPctSum = 0;
            let activeMonthCount = 0;

            for (let m = 1; m <= 12; m++) {
                const repCount = monthlyData[m].reportedDesas.size;
                monthlyData[m].reportedCount = repCount;
                const pct = totalDesa > 0 ? Math.min(100, Math.round((repCount / totalDesa) * 100)) : 0;
                monthlyData[m].pct = pct;

                if (activeMonthsInKabupaten.has(m)) {
                    totalPctSum += pct;
                    activeMonthCount++;
                }
            }

            const avgPct = activeMonthCount > 0 ? Math.round((totalPctSum / activeMonthCount) * 10) / 10 : 0;

            return {
                puskesmas: pName,
                totalDesa,
                months: monthlyData,
                avgPct
            };
        });
    }, [refPuskesmas, records, effectivePuskesmasLock, desaByPuskesmas, year, activeMonthsInKabupaten]);

    // KPI Aggregations
    const kpiStats = useMemo(() => {
        if (puskesmasMatrix.length === 0) {
            return { avgKabupaten: 0, fullComplianceCount: 0, lowComplianceCount: 0, latestActiveMonth: 1 };
        }

        const latestMonth = activeMonthsInKabupaten.size > 0 ? Math.max(...Array.from(activeMonthsInKabupaten)) : 1;

        let totalAvg = 0;
        let fullCount = 0;
        let lowCount = 0;

        puskesmasMatrix.forEach((p) => {
            totalAvg += p.avgPct;
            const currentMonthPct = p.months[latestMonth]?.pct || 0;
            if (currentMonthPct >= 100) fullCount++;
            else if (currentMonthPct < 80) lowCount++;
        });

        const avgKabupaten = Math.round((totalAvg / puskesmasMatrix.length) * 10) / 10;

        return {
            avgKabupaten,
            fullComplianceCount: fullCount,
            lowComplianceCount: lowCount,
            latestActiveMonth: latestMonth
        };
    }, [puskesmasMatrix, activeMonthsInKabupaten]);

    // Filter & Sort Puskesmas Rows
    const filteredRows = useMemo(() => {
        return puskesmasMatrix
            .filter((row) => {
                const matchesSearch = row.puskesmas.toLowerCase().includes(searchTerm.toLowerCase().trim());
                if (!matchesSearch) return false;

                if (statusFilter === "100") return row.avgPct >= 100;
                if (statusFilter === "PARTIAL") return row.avgPct > 0 && row.avgPct < 100;
                if (statusFilter === "ZERO") return row.avgPct === 0;
                return true;
            })
            .sort((a, b) => {
                if (sortBy === "avg_desc") return b.avgPct - a.avgPct || a.puskesmas.localeCompare(b.puskesmas);
                if (sortBy === "avg_asc") return a.avgPct - b.avgPct || a.puskesmas.localeCompare(b.puskesmas);
                if (sortBy === "name_asc") return a.puskesmas.localeCompare(b.puskesmas);
                if (sortBy === "name_desc") return b.puskesmas.localeCompare(a.puskesmas);
                return 0;
            });
    }, [puskesmasMatrix, searchTerm, statusFilter, sortBy]);

    // Cell Click Handler
    const handleCellClick = (puskesmas: string, month: number) => {
        if (effectivePuskesmasLock && norm(puskesmas) !== norm(effectivePuskesmasLock)) {
            return;
        }

        if (selectedCell?.puskesmas === puskesmas && selectedCell?.month === month) {
            setSelectedCell(null);
            return;
        }

        setSelectedCell({ puskesmas, month });
        if (onSelectPuskesmas) {
            onSelectPuskesmas(puskesmas);
        }

        // Smooth scroll to drilldown
        setTimeout(() => {
            drilldownRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 100);
    };

    // Calculate Desa Level records for the selected cell
    const drilldownDesaData = useMemo(() => {
        if (!selectedCell) return [];
        const { puskesmas, month } = selectedCell;
        const pKey = norm(puskesmas);

        // Get master villages for this puskesmas
        const masterDesas = desaByPuskesmas.get(pKey) || [];

        // Get records for this puskesmas, month, and year
        const relevantRecords = records.filter((r) => {
            const rPKey = norm(r.puskesmas);
            const rTahun = Number(r.tahun);
            const expectedTahun = Number(year);
            const rBulan = Number(r.bulan);
            return rPKey === pKey && (rTahun === expectedTahun || !rTahun) && rBulan === month;
        });

        // Map over each master desa
        return masterDesas.map((d) => {
            const dKey = norm(d.name);
            const foundRecord = relevantRecords.find((r) => norm(r.kelurahan) === dKey);
            const isReported = Boolean(foundRecord);

            // Extract indicator specific fields
            let sasaran = 0;
            let terdata = 0;

            if (indicatorType === "bumil") {
                sasaran = Number(foundRecord?.target_pregnant || foundRecord?.data_sasaran) || 0;
                terdata = Number(foundRecord?.pregnant_total || foundRecord?.jumlah_bumil) || 0;
            } else if (indicatorType === "rematri") {
                sasaran = Number(foundRecord?.target_rematri || foundRecord?.target_grade7 || foundRecord?.target_grade10) || 0;
                terdata = Number(foundRecord?.screened_grade7 || 0) + Number(foundRecord?.screened_grade10 || 0);
            } else {
                // Balita
                sasaran = Number(foundRecord?.jumlah_sasaran_balita) || 0;
                terdata = Number(foundRecord?.jumlah_balita_ditimbang || foundRecord?.jumlah_balita_usia_0_59_bulan_ditimbang || foundRecord?.jumlah_balita_bulan_ini) || 0;
            }

            return {
                desa: d.name,
                sasaran,
                terdata,
                isReported,
                status: isReported ? "COMPLETE" : "EMPTY",
                reportedMonth: isReported ? `Bulan ${month}` : "Belum Ada Data"
            };
        });
    }, [selectedCell, records, desaByPuskesmas, year, indicatorType]);

    // Filter drilldown desa
    const filteredDrilldownDesa = useMemo(() => {
        return drilldownDesaData.filter((d) => {
            const matchesSearch = d.desa.toLowerCase().includes(desaSearchTerm.toLowerCase().trim());
            const matchesStatus =
                desaStatusFilter === "ALL" ||
                (desaStatusFilter === "COMPLETE" && d.isReported) ||
                (desaStatusFilter === "EMPTY" && !d.isReported);
            return matchesSearch && matchesStatus;
        });
    }, [drilldownDesaData, desaSearchTerm, desaStatusFilter]);

    // Export to Excel
    const handleExportExcel = () => {
        const rows = puskesmasMatrix.map((row) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r: Record<string, any> = {
                Puskesmas: row.puskesmas,
                "Total Desa Master": row.totalDesa,
                "Rerata Kepatuhan (%)": `${row.avgPct}%`
            };
            for (let m = 1; m <= 12; m++) {
                const cell = row.months[m];
                r[MONTH_SHORT_NAMES[m]] = `${cell.pct}% (${cell.reportedCount}/${cell.totalDesa})`;
            }
            return r;
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Compliance Heatmap");
        XLSX.writeFile(wb, `Kepatuhan_Pelaporan_${indicatorType}_${year}.xlsx`);
    };

    // Helper for Cell background styling
    const getCellColor = (pct: number, month: number, isSelected: boolean) => {
        const isMonthActive = activeMonthsInKabupaten.has(month);

        if (pct === 100) {
            return {
                bg: "bg-emerald-600 text-white shadow-sm shadow-emerald-500/20",
                badgeText: "text-white font-extrabold",
                subText: "text-emerald-100",
                border: isSelected ? "ring-2 ring-emerald-500 ring-offset-2 border-emerald-700" : "border-emerald-600/40"
            };
        }
        if (pct >= 80) {
            return {
                bg: "bg-emerald-100 text-emerald-900 hover:bg-emerald-200",
                badgeText: "text-emerald-900 font-bold",
                subText: "text-emerald-700",
                border: isSelected ? "ring-2 ring-emerald-500 ring-offset-2 border-emerald-400" : "border-emerald-200"
            };
        }
        if (pct >= 50) {
            return {
                bg: "bg-amber-100 text-amber-950 hover:bg-amber-200",
                badgeText: "text-amber-950 font-bold",
                subText: "text-amber-800",
                border: isSelected ? "ring-2 ring-amber-500 ring-offset-2 border-amber-400" : "border-amber-200"
            };
        }
        if (pct > 0) {
            return {
                bg: "bg-rose-100 text-rose-950 hover:bg-rose-200",
                badgeText: "text-rose-950 font-bold",
                subText: "text-rose-800",
                border: isSelected ? "ring-2 ring-rose-500 ring-offset-2 border-rose-400" : "border-rose-200"
            };
        }

        // 0%
        if (isMonthActive) {
            return {
                bg: "bg-rose-50 text-rose-700 hover:bg-rose-100",
                badgeText: "text-rose-700 font-semibold",
                subText: "text-rose-400",
                border: isSelected ? "ring-2 ring-rose-400 ring-offset-2 border-rose-300" : "border-rose-100"
            };
        }

        // Future or inactive month
        return {
            bg: "bg-slate-50/80 text-slate-400 hover:bg-slate-100",
            badgeText: "text-slate-400 font-medium",
            subText: "text-slate-400",
            border: isSelected ? "ring-2 ring-slate-400 ring-offset-2 border-slate-300" : "border-slate-100"
        };
    };

    return (
        <div className="space-y-6 mt-6">
            {/* ─── Hero Container ──────────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header Strip */}
                <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3">
                            <div
                                className={`w-11 h-11 rounded-2xl ${config.lightBg} border ${config.borderLight} flex items-center justify-center shrink-0 shadow-sm`}
                            >
                                <span className={`material-icons-round text-xl ${config.pinColor}`}>
                                    {config.iconName}
                                </span>
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                                        {config.title}
                                    </h2>
                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${config.badgeColor} border ${config.borderLight}`}>
                                        Tahun {year}
                                    </span>
                                    {effectivePuskesmasLock && (
                                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                                            Mode Terkunci: {effectivePuskesmasLock}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {config.description} Klik pada kotak puskesmas dan bulan untuk melihat rincian desa.
                                </p>
                            </div>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                            <button
                                onClick={handleExportExcel}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
                                title="Unduh data heatmap kepatuhan ke format Excel"
                            >
                                <Download className="w-3.5 h-3.5 text-slate-500" />
                                <span>Export Excel</span>
                            </button>
                            <button
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                            >
                                <span>{isCollapsed ? "Buka Heatmap" : "Sembunyikan"}</span>
                                {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>

                    {/* KPI Quick Metrics */}
                    {!isCollapsed && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
                            <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                    Rata-rata Kepatuhan
                                </span>
                                <div className="flex items-baseline gap-1.5 mt-1">
                                    <span className="text-xl font-black text-slate-800">
                                        {kpiStats.avgKabupaten}%
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-medium">Kabupaten</span>
                                </div>
                            </div>

                            <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                    Puskesmas 100% Lapor
                                </span>
                                <div className="flex items-baseline gap-1.5 mt-1">
                                    <span className="text-xl font-black text-emerald-600">
                                        {kpiStats.fullComplianceCount}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-medium">
                                        / {puskesmasMatrix.length} Puskesmas
                                    </span>
                                </div>
                            </div>

                            <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                    Perlu Perhatian (&lt;80%)
                                </span>
                                <div className="flex items-baseline gap-1.5 mt-1">
                                    <span className="text-xl font-black text-amber-600">
                                        {kpiStats.lowComplianceCount}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-medium">Puskesmas</span>
                                </div>
                            </div>

                            <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-xs">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                    Bulan Terakhir Aktif
                                </span>
                                <div className="flex items-baseline gap-1.5 mt-1">
                                    <span className="text-xl font-black text-indigo-600">
                                        {MONTH_SHORT_NAMES[kpiStats.latestActiveMonth]}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-medium">
                                        ({MONTH_FULL_NAMES[kpiStats.latestActiveMonth]})
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {!isCollapsed && (
                    <>
                        {/* ─── Control Bar (Search, Filter, Legend) ─────────────────────────────────── */}
                        <div className="p-4 bg-slate-50/50 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2 flex-1">
                                {/* Search Puskesmas */}
                                {!effectivePuskesmasLock && (
                                    <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            placeholder="Cari Puskesmas..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 transition-all"
                                        />
                                    </div>
                                )}

                                {/* Status Filter */}
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as any)}
                                    className="text-xs rounded-xl border border-slate-200 py-1.5 px-3 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-slate-400/20"
                                >
                                    <option value="ALL">Semua Kepatuhan</option>
                                    <option value="100">100% Lengkap</option>
                                    <option value="PARTIAL">Sebagian (&lt;100%)</option>
                                    <option value="ZERO">Belum Lapor (0%)</option>
                                </select>

                                {/* Sort Dropdown */}
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="text-xs rounded-xl border border-slate-200 py-1.5 px-3 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-slate-400/20"
                                >
                                    <option value="avg_desc">Kepatuhan Tertinggi</option>
                                    <option value="avg_asc">Kepatuhan Terendah</option>
                                    <option value="name_asc">Nama Puskesmas (A–Z)</option>
                                    <option value="name_desc">Nama Puskesmas (Z–A)</option>
                                </select>
                            </div>

                            {/* Legend Tiers */}
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] self-start lg:self-center">
                                <span className="text-slate-400 font-medium mr-1 text-[10px] uppercase tracking-wider">
                                    Keterangan:
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold text-[10px]">
                                    100%
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                                    80-99%
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold text-[10px]">
                                    50-79%
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-semibold text-[10px]">
                                    &lt;50%
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-semibold text-[10px]">
                                    0% / Belum Ada
                                </span>
                            </div>
                        </div>

                        {/* ─── Heatmap Table Matrix ────────────────────────────────────────── */}
                        <div className="overflow-x-auto relative">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
                                        {/* Sticky Column for Puskesmas Name */}
                                        <th className="py-3 px-4 sticky left-0 z-20 bg-slate-100 min-w-[190px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                            Nama Puskesmas
                                        </th>
                                        {/* 12 Months */}
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                            <th key={m} className="py-2.5 px-2 text-center min-w-[72px]">
                                                <div className="font-bold text-slate-700">{MONTH_SHORT_NAMES[m]}</div>
                                                <div className="text-[10px] font-normal text-slate-400">Bl-{m}</div>
                                            </th>
                                        ))}
                                        {/* Average Column */}
                                        <th className="py-3 px-4 text-center min-w-[90px] bg-slate-100/90">
                                            Rerata
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={14} className="py-10 text-center text-slate-400">
                                                Tidak ada data puskesmas yang sesuai dengan filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRows.map((row) => {
                                            const isRowLocked =
                                                effectivePuskesmasLock && norm(row.puskesmas) !== norm(effectivePuskesmasLock);

                                            return (
                                                <tr
                                                    key={row.puskesmas}
                                                    className={`hover:bg-slate-50/80 transition-colors ${
                                                        isRowLocked ? "opacity-40 pointer-events-none" : ""
                                                    }`}
                                                >
                                                    {/* Puskesmas Title (Sticky Left) */}
                                                    <td className="py-2.5 px-4 font-bold text-slate-800 sticky left-0 z-10 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                        <div className="flex items-center justify-between gap-1">
                                                            <span className="truncate max-w-[150px]">{row.puskesmas}</span>
                                                            <span className="text-[10px] font-normal text-slate-400 shrink-0">
                                                                ({row.totalDesa} desa)
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* 12 Monthly Heatmap Cells */}
                                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                                                        const cell = row.months[m];
                                                        const isSelected =
                                                            selectedCell?.puskesmas === row.puskesmas && selectedCell?.month === m;
                                                        const colorStyle = getCellColor(cell.pct, m, isSelected);

                                                        return (
                                                            <td
                                                                key={m}
                                                                onClick={() => handleCellClick(row.puskesmas, m)}
                                                                className="py-1.5 px-1.5 text-center cursor-pointer select-none"
                                                                title={`Klik untuk melihat detail desa di ${row.puskesmas} (${MONTH_FULL_NAMES[m]} ${year})`}
                                                            >
                                                                <div
                                                                    className={`rounded-xl py-1.5 px-1 flex flex-col items-center justify-center transition-all duration-200 border ${colorStyle.bg} ${colorStyle.border} hover:scale-[1.05] hover:shadow-md`}
                                                                >
                                                                    <span className={`text-[11px] leading-tight ${colorStyle.badgeText}`}>
                                                                        {cell.pct}%
                                                                    </span>
                                                                    <span className={`text-[9px] font-semibold mt-0.5 tracking-tight ${colorStyle.subText}`}>
                                                                        {cell.reportedCount}/{cell.totalDesa}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        );
                                                    })}

                                                    {/* Average Column */}
                                                    <td className="py-2 px-3 text-center bg-slate-50/50">
                                                        <span
                                                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-extrabold ${
                                                                row.avgPct >= 100
                                                                    ? "bg-emerald-100 text-emerald-800"
                                                                    : row.avgPct >= 80
                                                                    ? "bg-emerald-50 text-emerald-700"
                                                                    : row.avgPct >= 50
                                                                    ? "bg-amber-100 text-amber-800"
                                                                    : "bg-rose-100 text-rose-800"
                                                            }`}
                                                        >
                                                            {row.avgPct}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* ─── Expandable Level Desa Drilldown Table ────────────────────────────────────── */}
            {selectedCell && (
                <div
                    ref={drilldownRef}
                    className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 ring-2 ring-slate-900/5"
                >
                    {/* Drilldown Header */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/40">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-slate-800 text-base">
                                    {config.tableTitle} — Puskesmas {selectedCell.puskesmas}
                                </h3>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${config.badgeColor}`}>
                                    Wilayah Puskesmas {selectedCell.puskesmas}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200">
                                    {MONTH_FULL_NAMES[selectedCell.month]} {year}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                {config.tableSubtitle} {selectedCell.puskesmas} pada periode{" "}
                                <span className="font-bold text-slate-700">
                                    {MONTH_FULL_NAMES[selectedCell.month]} {year}
                                </span>
                                .
                            </p>
                        </div>

                        {/* Right Tools & Close */}
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                            {/* Desa Search */}
                            <div className="relative flex-1 sm:w-56">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Cari Desa/Kelurahan..."
                                    value={desaSearchTerm}
                                    onChange={(e) => setDesaSearchTerm(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/20"
                                />
                            </div>

                            {/* Desa Status Filter */}
                            <select
                                value={desaStatusFilter}
                                onChange={(e) => setDesaStatusFilter(e.target.value as any)}
                                className="text-xs rounded-xl border border-slate-200 py-1.5 px-3 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-slate-400/20"
                            >
                                <option value="ALL">Semua Status</option>
                                <option value="COMPLETE">Lengkap</option>
                                <option value="EMPTY">Belum Lapor</option>
                            </select>

                            {/* Close Drilldown Button */}
                            <button
                                onClick={() => setSelectedCell(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                                title="Tutup Rincian Desa"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Month Quick Switcher Bar */}
                    <div className="px-4 py-2 bg-slate-100/60 border-b border-slate-200/60 flex items-center gap-1 overflow-x-auto text-xs">
                        <span className="text-[10px] uppercase font-bold text-slate-400 mr-2 shrink-0">
                            Pilih Bulan:
                        </span>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                            const isCurrent = selectedCell.month === m;
                            return (
                                <button
                                    key={m}
                                    onClick={() => setSelectedCell({ ...selectedCell, month: m })}
                                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] shrink-0 transition-all ${
                                        isCurrent
                                            ? "bg-slate-800 text-white shadow-xs"
                                            : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200/80"
                                    }`}
                                >
                                    {MONTH_SHORT_NAMES[m]}
                                </button>
                            );
                        })}
                    </div>

                    {/* Desa Table Matching SS4 & SS5 */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-600">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="py-3.5 px-4">Nama Desa / Kelurahan</th>
                                    {indicatorType === "bumil" && (
                                        <>
                                            <th className="py-3.5 px-4 text-center">Sasaran Bumil</th>
                                            <th className="py-3.5 px-4 text-center">Total Bumil Tercatat</th>
                                        </>
                                    )}
                                    {indicatorType === "rematri" && (
                                        <th className="py-3.5 px-4 text-center">Sasaran Rematri</th>
                                    )}
                                    {indicatorType === "balita" && (
                                        <>
                                            <th className="py-3.5 px-4 text-center">Sasaran Balita</th>
                                            <th className="py-3.5 px-4 text-center">Balita Terdata / Ditimbang</th>
                                        </>
                                    )}
                                    <th className="py-3.5 px-4 text-center">Periode Lapor Terdata</th>
                                    <th className="py-3.5 px-4 text-center">Status Kelengkapan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredDrilldownDesa.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={indicatorType === "rematri" ? 4 : 5}
                                            className="py-10 text-center text-slate-400 font-medium"
                                        >
                                            Tidak ada data desa yang cocok dengan pencarian atau filter status.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredDrilldownDesa.map((row) => (
                                        <tr key={row.desa} className="hover:bg-slate-50/60 transition-colors">
                                            {/* Desa Name */}
                                            <td className="py-3 px-4 font-bold text-slate-800">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className={`w-3.5 h-3.5 ${config.pinColor}`} />
                                                    <span>{row.desa}</span>
                                                </div>
                                            </td>

                                            {/* Indicator specific numeric columns */}
                                            {indicatorType === "bumil" && (
                                                <>
                                                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                                                        {row.sasaran > 0 ? row.sasaran.toLocaleString("id-ID") : "-"}
                                                    </td>
                                                    <td className="py-3 px-4 text-center font-mono text-slate-600">
                                                        {row.terdata > 0 ? row.terdata.toLocaleString("id-ID") : "-"}
                                                    </td>
                                                </>
                                            )}

                                            {indicatorType === "rematri" && (
                                                <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                                                    {row.sasaran > 0 ? row.sasaran.toLocaleString("id-ID") : "-"}
                                                </td>
                                            )}

                                            {indicatorType === "balita" && (
                                                <>
                                                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                                                        {row.sasaran > 0 ? row.sasaran.toLocaleString("id-ID") : "-"}
                                                    </td>
                                                    <td className="py-3 px-4 text-center font-mono text-slate-600">
                                                        {row.terdata > 0 ? row.terdata.toLocaleString("id-ID") : "-"}
                                                    </td>
                                                </>
                                            )}

                                            {/* Periode Lapor Terdata */}
                                            <td className="py-3 px-4 text-center">
                                                {row.isReported ? (
                                                    <span className="text-slate-700 font-medium">
                                                        {row.reportedMonth}
                                                    </span>
                                                ) : (
                                                    <span className="text-rose-500 font-semibold">Belum Ada Data</span>
                                                )}
                                            </td>

                                            {/* Status Kelengkapan Badge */}
                                            <td className="py-3 px-4 text-center">
                                                {row.isReported ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Lengkap
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                        <XCircle className="w-3 h-3 text-rose-600" /> Belum Lapor
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Drilldown Footer */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>
                            Menampilkan <b>{filteredDrilldownDesa.length}</b> desa di Puskesmas{" "}
                            <b>{selectedCell.puskesmas}</b>
                        </span>
                        <button
                            onClick={() => setSelectedCell(null)}
                            className="font-bold text-slate-600 hover:text-slate-900 underline text-[11px]"
                        >
                            Tutup Rincian
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
