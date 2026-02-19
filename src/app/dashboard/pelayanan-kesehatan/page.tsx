"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LabelList,
} from "recharts";
import * as XLSX from "xlsx";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import LevelDesaContent from "@/components/dashboard/LevelDesaContent";
import InsidenStuntingContent from "@/components/dashboard/InsidenStuntingContent";
import TrendAnalysisChart from "@/components/dashboard/TrendAnalysisChart";

// Dynamic import for Map (Leaflet doesn't work with SSR)
const MapComponent = dynamic(() => import("@/components/dashboard/MapPuskesmas"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[500px] bg-slate-100 rounded-2xl animate-pulse flex items-center justify-center">
            <span className="text-slate-400 text-sm">Memuat peta...</span>
        </div>
    ),
});

// ─── Types ──────────────────────────────────────────────────────────────────
interface BultimRow {
    id: string;
    tahun: number;
    bulan: number;
    puskesmas: string;
    data_sasaran: number;
    bb_sangat_kurang: number;
    bb_kurang: number;
    berat_badan_normal: number;
    risiko_lebih: number;
    bb_outlier: number;
    sangat_pendek: number;
    pendek: number;
    tb_normal: number;
    tinggi: number;
    tb_outlier: number;
    gizi_buruk: number;
    gizi_kurang: number;
    normal: number;
    risiko_gizi_lebih: number;
    gizi_lebih: number;
    obesitas: number;
    outlier: number;
    stunting: number;
    wasting: number;
    underweight: number;
    jumlah_timbang: number;
    jumlah_ukur: number;
    jumlah_timbang_ukur: number;
    uploaded_at: string;
}

// ─── Helper: format number with dot separator ───────────────────────────────
function formatNum(n: number): string {
    return n.toLocaleString("id-ID");
}

function formatPct(n: number): string {
    return n.toFixed(2).replace(".", ",") + "%";
}

const BULAN_LABELS: Record<number, string> = {
    1: "Januari",
    2: "Februari",
    3: "Maret",
    4: "April",
    5: "Mei",
    6: "Juni",
    7: "Juli",
    8: "Agustus",
    9: "September",
    10: "Oktober",
    11: "November",
    12: "Desember",
};

// ─── Prevalence color helper ────────────────────────────────────────────────
function getPrevalenceColor(value: number, type: string): string {
    if (type === "stunting") {
        if (value >= 20) return "text-red-600";
        if (value >= 10) return "text-amber-600";
        return "text-emerald-600";
    }
    if (type === "wasting") {
        if (value >= 10) return "text-red-600";
        if (value >= 5) return "text-amber-600";
        return "text-emerald-600";
    }
    if (type === "underweight") {
        if (value >= 20) return "text-red-600";
        if (value >= 10) return "text-amber-600";
        return "text-emerald-600";
    }
    if (type === "obesitas") {
        if (value >= 5) return "text-red-600";
        if (value >= 3) return "text-amber-600";
        return "text-emerald-600";
    }
    return "text-slate-700";
}

function getBarColor(value: number, metric: string): string {
    if (metric === "dataEntry") {
        if (value >= 80) return "#10b981";
        if (value >= 60) return "#f59e0b";
        return "#ef4444";
    }
    if (metric === "stunting") {
        if (value >= 20) return "#ef4444";
        if (value >= 10) return "#f59e0b";
        return "#10b981";
    }
    if (metric === "wasting") {
        if (value >= 10) return "#ef4444";
        if (value >= 5) return "#f59e0b";
        return "#10b981";
    }
    if (metric === "underweight") {
        if (value >= 20) return "#ef4444";
        if (value >= 10) return "#f59e0b";
        return "#10b981";
    }
    if (metric === "obesitas") {
        if (value >= 5) return "#ef4444";
        if (value >= 3) return "#f59e0b";
        return "#10b981";
    }
    return "#10b981";
}

// ─── Score Card Component ───────────────────────────────────────────────────
function ScoreCard({
    label,
    value,
    suffix,
    icon,
    color = "emerald",
    highlight = false,
}: {
    label: string;
    value: string;
    suffix?: string;
    icon: string;
    color?: string;
    highlight?: boolean;
}) {
    const colorMap: Record<string, { bg: string; text: string; icon: string; border: string }> = {
        emerald: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "text-emerald-500", border: "border-emerald-100" },
        blue: { bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-500", border: "border-blue-100" },
        amber: { bg: "bg-amber-50", text: "text-amber-700", icon: "text-amber-500", border: "border-amber-100" },
        red: { bg: "bg-red-50", text: "text-red-700", icon: "text-red-500", border: "border-red-100" },
        purple: { bg: "bg-purple-50", text: "text-purple-700", icon: "text-purple-500", border: "border-purple-100" },
        slate: { bg: "bg-slate-50", text: "text-slate-700", icon: "text-slate-500", border: "border-slate-100" },
    };

    const c = colorMap[color] || colorMap.emerald;

    return (
        <div
            className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${highlight
                ? `${c.bg} ${c.border} shadow-md`
                : "bg-white border-slate-200 hover:border-slate-300"
                }`}
        >
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center`}>
                    <span className={`material-icons-round text-lg ${c.icon}`}>{icon}</span>
                </div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono leading-tight">
                    {label}
                </p>
            </div>
            <p className={`text-2xl font-extrabold ${highlight ? c.text : "text-slate-900"} tracking-tight`}>
                {value}
                {suffix && (
                    <span className="text-sm font-bold text-slate-400 ml-1">{suffix}</span>
                )}
            </p>
        </div>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function PelayananKesehatanPage() {
    const [data, setData] = useState<BultimRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterTahun, setFilterTahun] = useState<number | null>(null);
    const [filterBulan, setFilterBulan] = useState<number | null>(null);
    const [filterPuskesmas, setFilterPuskesmas] = useState<string>("all");
    const [chartMetric, setChartMetric] = useState("dataEntry");
    const [mapMetric, setMapMetric] = useState("stunting");
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [sortCol, setSortCol] = useState<string>("puskesmas");
    const [sortAsc, setSortAsc] = useState(true);
    const [exportingPDF, setExportingPDF] = useState(false);
    const dashboardRef = useRef<HTMLDivElement>(null);

    // AI Advisor Integration
    const AiAdvisorPanel = dynamic(() => import("@/components/dashboard/ai/AiAdvisorPanel"), { ssr: false });

    // ─── Tab Navigation ──────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<"puskesmas" | "desa" | "insiden">("puskesmas");

    // ─── Table Pagination ────────────────────────────────────────────────
    const [tablePage, setTablePage] = useState(1);
    const [tableRowsPerPage, setTableRowsPerPage] = useState(10);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: rows, error } = await supabase
                .from("data_bultim")
                .select("*")
                .order("tahun", { ascending: false })
                .order("bulan", { ascending: false });

            if (error) {
                console.error("Error fetching data:", error);
            } else {
                setData(rows || []);

                // Get last updated from uploaded_at
                if (rows && rows.length > 0) {
                    const latest = rows.reduce((a, b) =>
                        new Date(a.uploaded_at) > new Date(b.uploaded_at) ? a : b
                    );
                    setLastUpdated(latest.uploaded_at);
                }

                // Default filters to the most recent period
                if (rows && rows.length > 0) {
                    const years = [...new Set(rows.map((r) => r.tahun))].sort((a, b) => b - a);
                    const latestYear = years[0];
                    setFilterTahun(latestYear);

                    const monthsInYear = [...new Set(rows.filter((r) => r.tahun === latestYear).map((r) => r.bulan))].sort((a, b) => b - a);
                    if (monthsInYear.length > 0) {
                        setFilterBulan(monthsInYear[0]);
                    }
                }
            }
            setLoading(false);
        };

        fetchData();
    }, []);

    // Available filter values
    const availableYears = useMemo(() => {
        return [...new Set(data.map((r) => r.tahun))].sort((a, b) => b - a);
    }, [data]);

    const availableMonths = useMemo(() => {
        const filtered = filterTahun ? data.filter((r) => r.tahun === filterTahun) : data;
        return [...new Set(filtered.map((r) => r.bulan))].sort((a, b) => a - b);
    }, [data, filterTahun]);

    const availablePuskesmas = useMemo(() => {
        return [...new Set(data.map((r) => r.puskesmas))].sort();
    }, [data]);

    // Filtered data
    const filteredData = useMemo(() => {
        let result = data;
        if (filterTahun) result = result.filter((r) => r.tahun === filterTahun);
        if (filterBulan) result = result.filter((r) => r.bulan === filterBulan);
        if (filterPuskesmas !== "all") result = result.filter((r) => r.puskesmas === filterPuskesmas);
        return result;
    }, [data, filterTahun, filterBulan, filterPuskesmas]);

    // Trend Data (Ignore Month Filter)
    const trendData = useMemo(() => {
        let result = data;
        if (filterTahun) result = result.filter((r) => r.tahun === filterTahun);
        if (filterPuskesmas !== "all") result = result.filter((r) => r.puskesmas === filterPuskesmas);
        return result;
    }, [data, filterTahun, filterPuskesmas]);

    // Aggregated totals for score cards
    const totals = useMemo(() => {
        const t = {
            data_sasaran: 0,
            jumlah_timbang: 0,
            jumlah_ukur: 0,
            jumlah_timbang_ukur: 0,
            stunting: 0,
            wasting: 0,
            underweight: 0,
            obesitas: 0,
        };

        filteredData.forEach((r) => {
            t.data_sasaran += r.data_sasaran;
            t.jumlah_timbang += r.jumlah_timbang;
            t.jumlah_ukur += r.jumlah_ukur;
            t.jumlah_timbang_ukur += r.jumlah_timbang_ukur;
            t.stunting += r.stunting;
            t.wasting += r.wasting;
            t.underweight += r.underweight;
            t.obesitas += r.obesitas;
        });

        return {
            ...t,
            pctDataEntry: t.data_sasaran > 0 ? (t.jumlah_timbang_ukur / t.data_sasaran) * 100 : 0,
            pctStunting: t.jumlah_timbang_ukur > 0 ? (t.stunting / t.jumlah_timbang_ukur) * 100 : 0,
            pctWasting: t.jumlah_timbang_ukur > 0 ? (t.wasting / t.jumlah_timbang_ukur) * 100 : 0,
            pctUnderweight: t.jumlah_timbang_ukur > 0 ? (t.underweight / t.jumlah_timbang_ukur) * 100 : 0,
            pctObesitas: t.jumlah_timbang_ukur > 0 ? (t.obesitas / t.jumlah_timbang_ukur) * 100 : 0,
        };
    }, [filteredData]);

    // Chart data: per puskesmas
    const chartData = useMemo(() => {
        const pkmMap = new Map<string, { data_sasaran: number; jumlah_timbang_ukur: number; stunting: number; wasting: number; underweight: number; obesitas: number }>();

        // If a single puskesmas is selected, still show it
        const chartFiltered = filterPuskesmas === "all" ? filteredData : filteredData;

        chartFiltered.forEach((r) => {
            const existing = pkmMap.get(r.puskesmas) || { data_sasaran: 0, jumlah_timbang_ukur: 0, stunting: 0, wasting: 0, underweight: 0, obesitas: 0 };
            existing.data_sasaran += r.data_sasaran;
            existing.jumlah_timbang_ukur += r.jumlah_timbang_ukur;
            existing.stunting += r.stunting;
            existing.wasting += r.wasting;
            existing.underweight += r.underweight;
            existing.obesitas += r.obesitas;
            pkmMap.set(r.puskesmas, existing);
        });

        const result = Array.from(pkmMap.entries()).map(([name, v]) => {
            const dataEntry = v.data_sasaran > 0 ? (v.jumlah_timbang_ukur / v.data_sasaran) * 100 : 0;
            const stunting = v.jumlah_timbang_ukur > 0 ? (v.stunting / v.jumlah_timbang_ukur) * 100 : 0;
            const wasting = v.jumlah_timbang_ukur > 0 ? (v.wasting / v.jumlah_timbang_ukur) * 100 : 0;
            const underweight = v.jumlah_timbang_ukur > 0 ? (v.underweight / v.jumlah_timbang_ukur) * 100 : 0;
            const obesitas = v.jumlah_timbang_ukur > 0 ? (v.obesitas / v.jumlah_timbang_ukur) * 100 : 0;

            return { name, dataEntry, stunting, wasting, underweight, obesitas };
        });

        // Sort descending by chosen metric
        result.sort((a, b) => {
            const key = chartMetric as keyof typeof a;
            return (b[key] as number) - (a[key] as number);
        });

        return result;
    }, [filteredData, chartMetric, filterPuskesmas]);

    // Map data: per puskesmas
    const mapData = useMemo(() => {
        const pkmMap = new Map<string, { jumlah_timbang_ukur: number; stunting: number; wasting: number; underweight: number; obesitas: number }>();

        // For map, always show all puskesmas (ignore puskesmas filter)
        let mapFiltered = data;
        if (filterTahun) mapFiltered = mapFiltered.filter((r) => r.tahun === filterTahun);
        if (filterBulan) mapFiltered = mapFiltered.filter((r) => r.bulan === filterBulan);

        mapFiltered.forEach((r) => {
            const existing = pkmMap.get(r.puskesmas) || { jumlah_timbang_ukur: 0, stunting: 0, wasting: 0, underweight: 0, obesitas: 0 };
            existing.jumlah_timbang_ukur += r.jumlah_timbang_ukur;
            existing.stunting += r.stunting;
            existing.wasting += r.wasting;
            existing.underweight += r.underweight;
            existing.obesitas += r.obesitas;
            pkmMap.set(r.puskesmas, existing);
        });

        const result: Record<string, number> = {};
        pkmMap.forEach((v, name) => {
            if (mapMetric === "stunting") {
                result[name] = v.jumlah_timbang_ukur > 0 ? (v.stunting / v.jumlah_timbang_ukur) * 100 : 0;
            } else if (mapMetric === "wasting") {
                result[name] = v.jumlah_timbang_ukur > 0 ? (v.wasting / v.jumlah_timbang_ukur) * 100 : 0;
            } else if (mapMetric === "underweight") {
                result[name] = v.jumlah_timbang_ukur > 0 ? (v.underweight / v.jumlah_timbang_ukur) * 100 : 0;
            } else if (mapMetric === "obesitas") {
                result[name] = v.jumlah_timbang_ukur > 0 ? (v.obesitas / v.jumlah_timbang_ukur) * 100 : 0;
            }
        });

        return result;
    }, [data, filterTahun, filterBulan, mapMetric]);

    // Table data with sorting
    const tableData = useMemo(() => {
        const pkmMap = new Map<string, { data_sasaran: number; jumlah_timbang: number; jumlah_ukur: number; jumlah_timbang_ukur: number; stunting: number; wasting: number; underweight: number; obesitas: number }>();

        filteredData.forEach((r) => {
            const existing = pkmMap.get(r.puskesmas) || { data_sasaran: 0, jumlah_timbang: 0, jumlah_ukur: 0, jumlah_timbang_ukur: 0, stunting: 0, wasting: 0, underweight: 0, obesitas: 0 };
            existing.data_sasaran += r.data_sasaran;
            existing.jumlah_timbang += r.jumlah_timbang;
            existing.jumlah_ukur += r.jumlah_ukur;
            existing.jumlah_timbang_ukur += r.jumlah_timbang_ukur;
            existing.stunting += r.stunting;
            existing.wasting += r.wasting;
            existing.underweight += r.underweight;
            existing.obesitas += r.obesitas;
            pkmMap.set(r.puskesmas, existing);
        });

        const rows = Array.from(pkmMap.entries()).map(([name, v]) => ({
            puskesmas: name,
            data_sasaran: v.data_sasaran,
            jumlah_timbang: v.jumlah_timbang,
            jumlah_ukur: v.jumlah_ukur,
            jumlah_timbang_ukur: v.jumlah_timbang_ukur,
            pctDataEntry: v.data_sasaran > 0 ? (v.jumlah_timbang_ukur / v.data_sasaran) * 100 : 0,
            stunting: v.stunting,
            pctStunting: v.jumlah_timbang_ukur > 0 ? (v.stunting / v.jumlah_timbang_ukur) * 100 : 0,
            wasting: v.wasting,
            pctWasting: v.jumlah_timbang_ukur > 0 ? (v.wasting / v.jumlah_timbang_ukur) * 100 : 0,
            underweight: v.underweight,
            pctUnderweight: v.jumlah_timbang_ukur > 0 ? (v.underweight / v.jumlah_timbang_ukur) * 100 : 0,
            obesitas: v.obesitas,
            pctObesitas: v.jumlah_timbang_ukur > 0 ? (v.obesitas / v.jumlah_timbang_ukur) * 100 : 0,
        }));

        // Sort
        rows.sort((a, b) => {
            const aVal = a[sortCol as keyof typeof a];
            const bVal = b[sortCol as keyof typeof b];
            if (typeof aVal === "string" && typeof bVal === "string") {
                return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
        });

        return rows;
    }, [filteredData, sortCol, sortAsc]);

    const handleSort = (col: string) => {
        if (sortCol === col) {
            setSortAsc(!sortAsc);
        } else {
            setSortCol(col);
            setSortAsc(true);
        }
    };

    const chartMetricLabels: Record<string, string> = {
        dataEntry: "% Data Entry Penimbangan",
        stunting: "Prevalensi Stunting",
        wasting: "Prevalensi Wasting",
        underweight: "Prevalensi Underweight",
        obesitas: "Prevalensi Obesitas",
    };

    // ─── Export: Excel (table data only) ──────────────────────────────────
    const handleExportExcel = useCallback(() => {
        const periodLabel = filterBulan && filterTahun
            ? `${BULAN_LABELS[filterBulan]}_${filterTahun}`
            : filterTahun ? `${filterTahun}` : "all";
        const fileName = `Data_Pelayanan_Kesehatan_${periodLabel}.xlsx`;

        const exportRows = tableData.map((r, i) => ({
            No: i + 1,
            Puskesmas: r.puskesmas,
            "Data Sasaran": r.data_sasaran,
            "Timbang & Ukur": r.jumlah_timbang_ukur,
            "% Data Entry": Number(r.pctDataEntry.toFixed(2)),
            Stunting: r.stunting,
            "% Stunting": Number(r.pctStunting.toFixed(2)),
            Wasting: r.wasting,
            "% Wasting": Number(r.pctWasting.toFixed(2)),
            Underweight: r.underweight,
            "% Underweight": Number(r.pctUnderweight.toFixed(2)),
            Obesitas: r.obesitas,
            "% Obesitas": Number(r.pctObesitas.toFixed(2)),
        }));

        const ws = XLSX.utils.json_to_sheet(exportRows);
        ws["!cols"] = [
            { wch: 4 }, { wch: 24 }, { wch: 12 }, { wch: 14 },
            { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
            { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 },
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data Pelayanan Kesehatan");
        XLSX.writeFile(wb, fileName);
    }, [tableData, filterBulan, filterTahun]);

    // ─── Export: PDF (full dashboard capture) ──────────────────────────────
    const handleExportPDF = useCallback(async () => {
        if (!dashboardRef.current) return;
        setExportingPDF(true);

        try {
            const element = dashboardRef.current;

            // Use html-to-image which supports modern CSS (lab, oklab, oklch)
            const dataUrl = await toPng(element, {
                quality: 0.95,
                pixelRatio: 2,
                backgroundColor: "#ffffff",
                skipAutoScale: true,
                // skipFonts: true, // Enabled fonts to fix icon rendering (text overlapping)
                filter: (node: HTMLElement) => {
                    // Skip Leaflet tile attribution to avoid CORS issues
                    return !node.classList?.contains("leaflet-control-attribution");
                },
            });

            // Create a temp image to get dimensions
            const img = new window.Image();
            img.src = dataUrl;
            await new Promise((resolve) => { img.onload = resolve; });

            const imgWidth = 297; // A4 landscape width (mm)
            const imgHeight = (img.height * imgWidth) / img.width;
            const pageHeight = 210; // A4 landscape height (mm)

            const pdf = new jsPDF("landscape", "mm", "a4");
            let heightLeft = imgHeight;
            let position = 0;

            // First page
            pdf.addImage(dataUrl, "PNG", 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // Additional pages
            while (heightLeft > 0) {
                position -= pageHeight;
                pdf.addPage();
                pdf.addImage(dataUrl, "PNG", 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const periodLabel = filterBulan && filterTahun
                ? `${BULAN_LABELS[filterBulan]}_${filterTahun}`
                : filterTahun ? `${filterTahun}` : "all";
            pdf.save(`Dashboard_Pelayanan_Kesehatan_${periodLabel}.pdf`);
        } catch (err) {
            console.error("PDF export error:", err);
        } finally {
            setExportingPDF(false);
        }
    }, [filterBulan, filterTahun]);

    // Prepare AI Context
    const aiContext = useMemo(() => {
        // Identify top issues (simple logic: highest stunting/wasting)
        const issues = filteredData
            .map(r => ({
                puskesmas: r.puskesmas,
                stunting: r.stunting > 0 && r.jumlah_timbang_ukur > 0 ? (r.stunting / r.jumlah_timbang_ukur) * 100 : 0,
                wasting: r.wasting > 0 && r.jumlah_timbang_ukur > 0 ? (r.wasting / r.jumlah_timbang_ukur) * 100 : 0,
            }))
            .sort((a, b) => b.stunting - a.stunting)
            .slice(0, 5)
            .map(r => ({
                puskesmas: r.puskesmas,
                issue: `Stunting ${(r.stunting).toFixed(1)}%`,
                value: r.stunting
            }));

        return {
            filterTahun,
            filterBulan,
            filterPuskesmas,
            totals: {
                ...totals,
                // Ensure plain numbers are passed, not React nodes
                data_sasaran: totals.data_sasaran,
                jumlah_timbang_ukur: totals.jumlah_timbang_ukur,
                stunting: totals.stunting,
                wasting: totals.wasting,
                underweight: totals.underweight,
                obesitas: totals.obesitas,
                pctDataEntry: totals.pctDataEntry,
                pctStunting: totals.pctStunting,
                pctWasting: totals.pctWasting,
                pctUnderweight: totals.pctUnderweight,
                pctObesitas: totals.pctObesitas,
            },
            topIssues: issues
        };
    }, [filteredData, totals, filterTahun, filterBulan, filterPuskesmas]);

    if (loading) {
        return (
            <div className="space-y-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-40 bg-white rounded-2xl animate-pulse border border-slate-200"></div>
                ))}
            </div>
        );
    }







    return (
        <div className="space-y-8" ref={dashboardRef} id="dashboard-content">
            <AiAdvisorPanel data={aiContext} />

            {/* ─── Header ──────────────────────────────────────────── */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-200">
                        <span className="material-icons-round text-white text-xl">local_hospital</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                            Indikator Pelayanan Kesehatan
                        </h1>
                        <p className="text-xs text-slate-400 font-mono uppercase tracking-widest">
                            Analisis Pertumbuhan • SIGIZI KESGA
                        </p>
                    </div>
                </div>

                {/* Description */}
                <div className="mt-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100">
                    <div className="flex items-start gap-3">
                        <span className="material-icons-round text-emerald-600 text-xl mt-0.5 shrink-0">info</span>
                        <div className="text-sm text-slate-600 leading-relaxed">
                            <p>
                                Dashboard ini menyajikan visualisasi <strong>semi real-time</strong> dari capaian analisis pertumbuhan yang bersumber dari aplikasi <strong>SIGIZI KESGA</strong>.
                                Data yang ditampilkan merepresentasikan hasil pengukuran antropometri balita di seluruh wilayah kerja puskesmas Kabupaten Malang,
                                meliputi indikator <em>stunting</em> (pendek), <em>wasting</em> (kurus), <em>underweight</em> (berat badan kurang), dan <em>obesitas</em>.
                                Analisis ini menggunakan pendekatan <strong>prevalence-based surveillance</strong> untuk mendukung pengambilan keputusan berbasis bukti (<em>evidence-based decision making</em>)
                                dalam program penanggulangan masalah gizi di tingkat kabupaten.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Last Updated */}
                {lastUpdated && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                        <span className="material-icons-round text-sm">schedule</span>
                        <span>
                            Data terakhir diperbarui:{" "}
                            <span className="font-semibold text-slate-600">
                                {new Date(lastUpdated).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                })}{" "}
                                pukul{" "}
                                {new Date(lastUpdated).toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </span>
                        </span>
                    </div>
                )}
            </div>

            {/* ─── Pill Tabs ──────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm">
                <div className="flex gap-1">
                    <button
                        onClick={() => setActiveTab("puskesmas")}
                        className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === "puskesmas"
                            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                            }`}
                    >
                        <span className="material-icons-round text-lg">domain</span>
                        Level Puskesmas
                    </button>
                    <button
                        onClick={() => setActiveTab("desa")}
                        className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === "desa"
                            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                            }`}
                    >
                        <span className="material-icons-round text-lg">holiday_village</span>
                        Level Kelurahan / Desa
                    </button>
                    <button
                        onClick={() => setActiveTab("insiden")}
                        className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === "insiden"
                            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                            }`}
                    >
                        <span className="material-icons-round text-lg">analytics</span>
                        Analisis Insiden Stunting
                    </button>
                </div>
            </div>

            {/* ─── Tab Content ────────────────────────────────────── */}
            {activeTab === "desa" ? (
                <LevelDesaContent />
            ) : activeTab === "insiden" ? (
                <InsidenStuntingContent />
            ) : (
                <>

                    {/* ─── Filters ─────────────────────────────────────────── */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-icons-round text-emerald-600">filter_alt</span>
                            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Filter Data</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                                            {BULAN_LABELS[m]}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Puskesmas */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                                    Puskesmas
                                </label>
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
                            </div>
                        </div>
                    </div>

                    {/* ─── Score Cards ─────────────────────────────────────── */}
                    {data.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                            <span className="material-icons-round text-6xl text-slate-300 mb-4 block">cloud_upload</span>
                            <h3 className="text-lg font-bold text-slate-700 mb-2">Belum Ada Data</h3>
                            <p className="text-sm text-slate-400 max-w-md mx-auto">
                                Data belum tersedia. Silakan upload file data bulanan melalui menu <strong>Upload Data</strong> untuk mulai melihat analisis.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <ScoreCard label="Total Sasaran" value={formatNum(totals.data_sasaran)} suffix="Balita" icon="groups" color="blue" />
                                <ScoreCard label="Balita Di Timbang" value={formatNum(totals.jumlah_timbang)} suffix="Balita" icon="monitor_weight" color="emerald" />
                                <ScoreCard label="Balita Di Ukur" value={formatNum(totals.jumlah_ukur)} suffix="Balita" icon="straighten" color="emerald" />
                                <ScoreCard label="Timbang & Ukur" value={formatNum(totals.jumlah_timbang_ukur)} suffix="Balita" icon="assignment_turned_in" color="purple" />
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                <ScoreCard label="% Data Entry" value={formatPct(totals.pctDataEntry)} icon="percent" color="blue" highlight />
                                <ScoreCard label="Kasus Stunting" value={formatNum(totals.stunting)} suffix="Balita" icon="height" color="amber" />
                                <ScoreCard label="Kasus Wasting" value={formatNum(totals.wasting)} suffix="Balita" icon="trending_down" color="amber" />
                                <ScoreCard label="Kasus Underweight" value={formatNum(totals.underweight)} suffix="Balita" icon="scale" color="amber" />
                                <ScoreCard label="Kasus Obesitas" value={formatNum(totals.obesitas)} suffix="Balita" icon="trending_up" color="red" />
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <ScoreCard label="Prevalensi Stunting" value={formatPct(totals.pctStunting)} icon="height" color={totals.pctStunting >= 20 ? "red" : totals.pctStunting >= 10 ? "amber" : "emerald"} highlight />
                                <ScoreCard label="Prevalensi Wasting" value={formatPct(totals.pctWasting)} icon="trending_down" color={totals.pctWasting >= 10 ? "red" : totals.pctWasting >= 5 ? "amber" : "emerald"} highlight />
                                <ScoreCard label="Prevalensi Underweight" value={formatPct(totals.pctUnderweight)} icon="scale" color={totals.pctUnderweight >= 20 ? "red" : totals.pctUnderweight >= 10 ? "amber" : "emerald"} highlight />
                                <ScoreCard label="Prevalensi Obesitas" value={formatPct(totals.pctObesitas)} icon="trending_up" color={totals.pctObesitas >= 5 ? "red" : totals.pctObesitas >= 3 ? "amber" : "emerald"} highlight />
                            </div>



                            {/* ─── Trend Analysis ───────────────────────────────── */}
                            <TrendAnalysisChart data={trendData} year={filterTahun} />

                            {/* ─── Interactive Map ───────────────────────────────── */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-3">
                                        <span className="material-icons-round text-emerald-600 text-xl">map</span>
                                        <div>
                                            <h2 className="text-base font-bold text-slate-900">Peta Interaktif Prevalensi Gizi</h2>
                                            <p className="text-xs text-slate-400">
                                                Peta Prevalensi Gizi per Puskesmas
                                                {filterPuskesmas !== "all" ? ` — ${filterPuskesmas}` : " (Semua Puskesmas)"}
                                            </p>
                                        </div>
                                    </div>
                                    <select
                                        value={mapMetric}
                                        onChange={(e) => setMapMetric(e.target.value)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                                    >
                                        <option value="stunting">Prevalensi Stunting</option>
                                        <option value="wasting">Prevalensi Wasting</option>
                                        <option value="underweight">Prevalensi Underweight</option>
                                        <option value="obesitas">Prevalensi Obesitas</option>
                                    </select>
                                </div>
                                <MapComponent data={mapData} metric={mapMetric} selectedPuskesmas={filterPuskesmas === "all" ? null : filterPuskesmas} />
                            </div>

                            {/* ─── Charts ───────────────────────────────────────── */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-3">
                                        <span className="material-icons-round text-emerald-600 text-xl">bar_chart</span>
                                        <div>
                                            <h2 className="text-base font-bold text-slate-900">Grafik Prevalensi dan Data Entry</h2>
                                            <p className="text-xs text-slate-400">Data per puskesmas diurutkan dari tertinggi ke terendah</p>
                                        </div>
                                    </div>
                                    <select
                                        value={chartMetric}
                                        onChange={(e) => setChartMetric(e.target.value)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                                    >
                                        {Object.entries(chartMetricLabels).map(([key, label]) => (
                                            <option key={key} value={key}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="h-[520px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 130 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis
                                                dataKey="name"
                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                tick={({ x, y, payload }: { x: any; y: any; payload: { value: string } }) => {
                                                    const name = payload.value;
                                                    // Abbreviate long names
                                                    const abbreviated = name.length > 12
                                                        ? name.split(" ").map((w: string) => w.length > 4 ? w.slice(0, 4) + "." : w).join(" ")
                                                        : name;
                                                    return (
                                                        <g transform={`translate(${x},${y})`}>
                                                            <text
                                                                x={0}
                                                                y={0}
                                                                dy={8}
                                                                textAnchor="end"
                                                                fill="#64748b"
                                                                fontSize={9}
                                                                fontFamily="monospace"
                                                                transform="rotate(-60)"
                                                            >
                                                                {abbreviated}
                                                            </text>
                                                        </g>
                                                    );
                                                }}
                                                interval={0}
                                                height={130}
                                            />
                                            <YAxis
                                                tick={{ fontSize: 11, fill: "#64748b" }}
                                                tickFormatter={(v) => `${v.toFixed(0)}%`}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: "12px",
                                                    border: "1px solid #e2e8f0",
                                                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                                    fontSize: "12px",
                                                }}
                                                formatter={(value: any) => [`${Number(value).toFixed(2)}%`, chartMetricLabels[chartMetric]]}
                                                labelFormatter={(label) => `Puskesmas: ${label}`}
                                                labelStyle={{ fontWeight: "bold", marginBottom: 4 }}
                                            />
                                            <Bar dataKey={chartMetric} radius={[4, 4, 0, 0]} maxBarSize={32}>
                                                <LabelList
                                                    dataKey={chartMetric}
                                                    position="top"
                                                    fill="#64748b"
                                                    fontSize={10}
                                                    fontWeight="bold"
                                                    formatter={(val: any) => (typeof val === "number" && val > 0) ? `${val.toFixed(1)}%` : ""}
                                                />
                                                {chartData.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={getBarColor(entry[chartMetric as keyof typeof entry] as number, chartMetric)}
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* ─── Data Table ───────────────────────────────────── */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-100">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <span className="material-icons-round text-emerald-600 text-xl">table_chart</span>
                                            <div>
                                                <h2 className="text-base font-bold text-slate-900">Detail Data per Puskesmas</h2>
                                                <p className="text-xs text-slate-400">
                                                    Tabulasi lengkap • {tableData.length} puskesmas
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleExportExcel}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all"
                                            >
                                                <span className="material-icons-round text-sm">table_view</span>
                                                Excel
                                            </button>
                                            <button
                                                onClick={handleExportPDF}
                                                disabled={exportingPDF}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-all disabled:opacity-50"
                                            >
                                                <span className="material-icons-round text-sm">{exportingPDF ? "hourglass_empty" : "picture_as_pdf"}</span>
                                                {exportingPDF ? "Generating..." : "PDF"}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Scrollable table container with sticky header */}
                                <div className={`overflow-x-auto ${tableRowsPerPage === 0 ? "max-h-[600px] overflow-y-auto" : ""}`}>
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 z-20">
                                            <tr className="bg-slate-50 border-b border-slate-200">
                                                <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono sticky left-0 bg-slate-50 z-30">
                                                    No
                                                </th>
                                                {[
                                                    { key: "puskesmas", label: "Puskesmas" },
                                                    { key: "data_sasaran", label: "Sasaran" },
                                                    { key: "jumlah_timbang_ukur", label: "Timbang & Ukur" },
                                                    { key: "pctDataEntry", label: "% Data Entry" },
                                                    { key: "stunting", label: "Stunting" },
                                                    { key: "pctStunting", label: "% Stunting" },
                                                    { key: "wasting", label: "Wasting" },
                                                    { key: "pctWasting", label: "% Wasting" },
                                                    { key: "underweight", label: "Underweight" },
                                                    { key: "pctUnderweight", label: "% Underweight" },
                                                    { key: "obesitas", label: "Obesitas" },
                                                    { key: "pctObesitas", label: "% Obesitas" },
                                                ].map((col) => (
                                                    <th
                                                        key={col.key}
                                                        onClick={() => { handleSort(col.key); setTablePage(1); }}
                                                        className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono cursor-pointer hover:text-emerald-600 transition-colors whitespace-nowrap select-none bg-slate-50"
                                                    >
                                                        <span className="inline-flex items-center gap-1">
                                                            {col.label}
                                                            {sortCol === col.key && (
                                                                <span className="material-icons-round text-xs text-emerald-600">
                                                                    {sortAsc ? "arrow_upward" : "arrow_downward"}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const showAll = tableRowsPerPage === 0;
                                                const startIdx = showAll ? 0 : (tablePage - 1) * tableRowsPerPage;
                                                const paginatedRows = showAll ? tableData : tableData.slice(startIdx, startIdx + tableRowsPerPage);
                                                return paginatedRows.map((row, i) => {
                                                    const globalIdx = showAll ? i : startIdx + i;
                                                    return (
                                                        <tr
                                                            key={row.puskesmas}
                                                            className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${globalIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                                                        >
                                                            <td className="px-4 py-3 text-xs text-slate-500 font-mono sticky left-0 bg-inherit z-10">
                                                                {globalIdx + 1}
                                                            </td>
                                                            <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                                                                {row.puskesmas}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-700 font-mono">
                                                                {formatNum(row.data_sasaran)}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-700 font-mono">
                                                                {formatNum(row.jumlah_timbang_ukur)}
                                                            </td>
                                                            <td className={`px-4 py-3 font-bold font-mono ${row.pctDataEntry >= 80 ? "text-emerald-600" : row.pctDataEntry >= 60 ? "text-amber-600" : "text-red-600"}`}>
                                                                {formatPct(row.pctDataEntry)}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-700 font-mono">
                                                                {formatNum(row.stunting)}
                                                            </td>
                                                            <td className={`px-4 py-3 font-bold font-mono ${getPrevalenceColor(row.pctStunting, "stunting")}`}>
                                                                {formatPct(row.pctStunting)}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-700 font-mono">
                                                                {formatNum(row.wasting)}
                                                            </td>
                                                            <td className={`px-4 py-3 font-bold font-mono ${getPrevalenceColor(row.pctWasting, "wasting")}`}>
                                                                {formatPct(row.pctWasting)}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-700 font-mono">
                                                                {formatNum(row.underweight)}
                                                            </td>
                                                            <td className={`px-4 py-3 font-bold font-mono ${getPrevalenceColor(row.pctUnderweight, "underweight")}`}>
                                                                {formatPct(row.pctUnderweight)}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-700 font-mono">
                                                                {formatNum(row.obesitas)}
                                                            </td>
                                                            <td className={`px-4 py-3 font-bold font-mono ${getPrevalenceColor(row.pctObesitas, "obesitas")}`}>
                                                                {formatPct(row.pctObesitas)}
                                                            </td>
                                                        </tr>
                                                    );
                                                });
                                            })()}
                                        </tbody>

                                        {/* Table Footer — Totals */}
                                        <tfoot>
                                            <tr className="bg-emerald-50 border-t-2 border-emerald-200 font-bold">
                                                <td className="px-4 py-3 sticky left-0 bg-emerald-50 z-10"></td>
                                                <td className="px-4 py-3 text-emerald-800 uppercase text-xs tracking-wider">
                                                    Total
                                                </td>
                                                <td className="px-4 py-3 text-emerald-800 font-mono">
                                                    {formatNum(totals.data_sasaran)}
                                                </td>
                                                <td className="px-4 py-3 text-emerald-800 font-mono">
                                                    {formatNum(totals.jumlah_timbang_ukur)}
                                                </td>
                                                <td className="px-4 py-3 text-emerald-800 font-mono">
                                                    {formatPct(totals.pctDataEntry)}
                                                </td>
                                                <td className="px-4 py-3 text-emerald-800 font-mono">
                                                    {formatNum(totals.stunting)}
                                                </td>
                                                <td className="px-4 py-3 text-emerald-800 font-mono">
                                                    {formatPct(totals.pctStunting)}
                                                </td>
                                                <td className="px-4 py-3 text-emerald-800 font-mono">
                                                    {formatNum(totals.wasting)}
                                                </td>
                                                <td className="px-4 py-3 text-emerald-800 font-mono">
                                                    {formatPct(totals.pctWasting)}
                                                </td>
                                                <td className="px-4 py-3 text-emerald-800 font-mono">
                                                    {formatNum(totals.underweight)}
                                                </td>
                                                <td className="px-4 py-3 text-emerald-800 font-mono">
                                                    {formatPct(totals.pctUnderweight)}
                                                </td>
                                                <td className="px-4 py-3 text-emerald-800 font-mono">
                                                    {formatNum(totals.obesitas)}
                                                </td>
                                                <td className="px-4 py-3 text-emerald-800 font-mono">
                                                    {formatPct(totals.pctObesitas)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* ─── Pagination Controls ─────────────────────────── */}
                                <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-500">Tampilkan</span>
                                        <select
                                            value={tableRowsPerPage}
                                            onChange={(e) => { setTableRowsPerPage(Number(e.target.value)); setTablePage(1); }}
                                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                                        >
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                            <option value={39}>39</option>
                                            <option value={0}>All</option>
                                        </select>
                                        <span className="text-xs text-slate-500">
                                            {tableRowsPerPage === 0
                                                ? `Semua ${tableData.length} puskesmas`
                                                : `${Math.min((tablePage - 1) * tableRowsPerPage + 1, tableData.length)}–${Math.min(tablePage * tableRowsPerPage, tableData.length)} dari ${tableData.length} puskesmas`
                                            }
                                        </span>
                                    </div>

                                    {tableRowsPerPage > 0 && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setTablePage(1)}
                                                disabled={tablePage === 1}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all"
                                                title="Halaman pertama"
                                            >
                                                <span className="material-icons-round text-sm">first_page</span>
                                            </button>
                                            <button
                                                onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                                                disabled={tablePage === 1}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all"
                                                title="Sebelumnya"
                                            >
                                                <span className="material-icons-round text-sm">chevron_left</span>
                                            </button>

                                            {(() => {
                                                const totalPages = Math.ceil(tableData.length / tableRowsPerPage);
                                                const pages: (number | string)[] = [];
                                                for (let p = 1; p <= totalPages; p++) {
                                                    if (p === 1 || p === totalPages || Math.abs(p - tablePage) <= 1) {
                                                        pages.push(p);
                                                    } else if (pages[pages.length - 1] !== "...") {
                                                        pages.push("...");
                                                    }
                                                }
                                                return pages.map((p, idx) =>
                                                    p === "..." ? (
                                                        <span key={`ellipsis-${idx}`} className="px-1 text-xs text-slate-400">…</span>
                                                    ) : (
                                                        <button
                                                            key={p}
                                                            onClick={() => setTablePage(p as number)}
                                                            className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition-all ${tablePage === p
                                                                ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                                                                : "text-slate-600 hover:bg-slate-100"
                                                                }`}
                                                        >
                                                            {p}
                                                        </button>
                                                    )
                                                );
                                            })()}

                                            <button
                                                onClick={() => setTablePage((p) => Math.min(Math.ceil(tableData.length / tableRowsPerPage), p + 1))}
                                                disabled={tablePage >= Math.ceil(tableData.length / tableRowsPerPage)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all"
                                                title="Selanjutnya"
                                            >
                                                <span className="material-icons-round text-sm">chevron_right</span>
                                            </button>
                                            <button
                                                onClick={() => setTablePage(Math.ceil(tableData.length / tableRowsPerPage))}
                                                disabled={tablePage >= Math.ceil(tableData.length / tableRowsPerPage)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-all"
                                                title="Halaman terakhir"
                                            >
                                                <span className="material-icons-round text-sm">last_page</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                </>
            )
            }
        </div >
    );
}
