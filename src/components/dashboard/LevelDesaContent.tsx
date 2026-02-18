"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/dashboard/layout";
import dynamic from "next/dynamic";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, Legend, LabelList,
} from "recharts";
import TrendAnalysisChart from "./TrendAnalysisChart";
import * as XLSX from "xlsx";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

const MapDesaComponent = dynamic(() => import("./MapDesa"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[500px] bg-slate-100 rounded-2xl animate-pulse flex items-center justify-center">
            <span className="text-slate-400 text-sm">Memuat peta...</span>
        </div>
    ),
});

// ─── Types ───────────────────────────────────────────────────────────────────
interface DesaRow {
    id: string; tahun: number; bulan: number; puskesmas: string; kelurahan: string;
    data_sasaran_l: number; data_sasaran_p: number;
    bb_sangat_kurang: number; bb_kurang: number; berat_badan_normal: number;
    risiko_lebih: number; bb_outlier: number;
    sangat_pendek: number; pendek: number; tb_normal: number; tinggi: number; tb_outlier: number;
    gizi_buruk: number; gizi_kurang: number; normal: number;
    risiko_gizi_lebih: number; gizi_lebih: number; obesitas: number;
    stunting: number; wasting: number; underweight: number;
    jumlah_timbang: number; jumlah_ukur: number; jumlah_timbang_ukur: number;
    uploaded_at: string;
}

function formatNum(n: number): string { return n.toLocaleString("id-ID"); }
function formatPct(n: number): string { return n.toFixed(2).replace(".", ",") + "%"; }

const BULAN_LABELS: Record<number, string> = {
    1: "Januari", 2: "Februari", 3: "Maret", 4: "April", 5: "Mei", 6: "Juni",
    7: "Juli", 8: "Agustus", 9: "September", 10: "Oktober", 11: "November", 12: "Desember",
};

function getBarColor(value: number, metric: string): string {
    if (metric === "dataEntry") return value >= 80 ? "#10b981" : value >= 60 ? "#f59e0b" : "#ef4444";
    if (metric === "stunting") return value >= 20 ? "#ef4444" : value >= 10 ? "#f59e0b" : "#10b981";
    if (metric === "wasting") return value >= 10 ? "#ef4444" : value >= 5 ? "#f59e0b" : "#10b981";
    if (metric === "underweight") return value >= 20 ? "#ef4444" : value >= 10 ? "#f59e0b" : "#10b981";
    if (metric === "obesitas") return value >= 5 ? "#ef4444" : value >= 3 ? "#f59e0b" : "#10b981";
    return "#10b981";
}

function getPrevalenceColor(value: number, type: string): string {
    if (type === "stunting") return value >= 20 ? "text-red-600" : value >= 10 ? "text-amber-600" : "text-emerald-600";
    if (type === "wasting") return value >= 10 ? "text-red-600" : value >= 5 ? "text-amber-600" : "text-emerald-600";
    if (type === "underweight") return value >= 20 ? "text-red-600" : value >= 10 ? "text-amber-600" : "text-emerald-600";
    if (type === "obesitas") return value >= 5 ? "text-red-600" : value >= 3 ? "text-amber-600" : "text-emerald-600";
    return "text-slate-700";
}

// ─── ScoreCard ───────────────────────────────────────────────────────────────
function ScoreCard({ label, value, suffix, icon, color = "emerald", highlight = false }: {
    label: string; value: string; suffix?: string; icon: string; color?: string; highlight?: boolean;
}) {
    const colorMap: Record<string, { bg: string; text: string; icon: string; border: string }> = {
        emerald: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "text-emerald-500", border: "border-emerald-100" },
        blue: { bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-500", border: "border-blue-100" },
        amber: { bg: "bg-amber-50", text: "text-amber-700", icon: "text-amber-500", border: "border-amber-100" },
        red: { bg: "bg-red-50", text: "text-red-700", icon: "text-red-500", border: "border-red-100" },
        purple: { bg: "bg-purple-50", text: "text-purple-700", icon: "text-purple-500", border: "border-purple-100" },
        pink: { bg: "bg-pink-50", text: "text-pink-700", icon: "text-pink-500", border: "border-pink-100" },
        slate: { bg: "bg-slate-50", text: "text-slate-700", icon: "text-slate-500", border: "border-slate-100" },
    };
    const c = colorMap[color] || colorMap.emerald;
    return (
        <div className={`rounded-2xl border p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${highlight ? `${c.bg} ${c.border} shadow-md` : "bg-white border-slate-200 hover:border-slate-300"}`}>
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center`}>
                    <span className={`material-icons-round text-lg ${c.icon}`}>{icon}</span>
                </div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono leading-tight">{label}</p>
            </div>
            <p className={`text-2xl font-extrabold ${highlight ? c.text : "text-slate-900"} tracking-tight`}>
                {value}{suffix && <span className="text-sm font-bold text-slate-400 ml-1">{suffix}</span>}
            </p>
        </div>
    );
}

// Custom donut label
const RADIAN = Math.PI / 180;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700}>
            {`${(percent * 100).toFixed(1)}%`}
        </text>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function LevelDesaContent() {
    const { user } = useAuth();
    const isSuperadmin = user?.role === "superadmin" || user?.role === "stakeholder";

    const [data, setData] = useState<DesaRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterTahun, setFilterTahun] = useState<number | null>(null);
    const [filterBulan, setFilterBulan] = useState<number | null>(null);
    const [filterPuskesmas, setFilterPuskesmas] = useState<string>("all");
    const [filterDesa, setFilterDesa] = useState<string>("all");
    const [chartMetric, setChartMetric] = useState("dataEntry");
    const [mapMetric, setMapMetric] = useState("stunting");
    const [sortCol, setSortCol] = useState<string>("kelurahan");
    const [sortAsc, setSortAsc] = useState(true);
    const [exportingPDF, setExportingPDF] = useState(false);
    const [expandedPuskesmas, setExpandedPuskesmas] = useState<Set<string>>(new Set());
    const [tablePage, setTablePage] = useState(1);
    const [tableRowsPerPage, setTableRowsPerPage] = useState(10);
    const dashboardRef = useRef<HTMLDivElement>(null);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            let puskName = "";
            // Resolve Puskesmas Name if admin
            if (!isSuperadmin && user?.puskesmas_id) {
                console.log("Resolving Puskesmas Name for ID:", user.puskesmas_id);
                // 1. Try joining app_users -> ref_puskesmas (safest if RLS allows join)
                if (!puskName) {
                    console.log("Attempting resolution via app_users join...");
                    const { data: uData } = await supabase
                        .from("app_users")
                        .select("ref_puskesmas(nama)")
                        .eq("id", user.id)
                        .single();

                    // @ts-ignore
                    const joinedName = uData?.ref_puskesmas?.nama;
                    if (joinedName) puskName = joinedName;
                }

                // 2. Try direct ref_puskesmas table lookup
                if (!puskName) {
                    console.log("Attempting direct ref_puskesmas table lookup...");
                    const { data: pData } = await supabase
                        .from("ref_puskesmas").select("*").eq("id", user.puskesmas_id).single();
                    if (pData) {
                        // Table uses 'nama'
                        puskName = pData.nama || pData.nama_puskesmas || "";
                    }
                }

                // 3. (Removed uploaded_by check as Admins don't upload data)

                console.log("Final Resolved Puskesmas Name:", puskName);

                if (puskName) {
                    setFilterPuskesmas(puskName);
                } else {
                    console.error("CRITICAL: Failed to resolve Puskesmas Name from ID. Check RLS policies on 'puskesmas' table.");
                    // Security: If we can't resolve name, do NOT show all data.
                    setFilterPuskesmas("UNKNOWN_PUSKESMAS_" + user.id);
                }
            }

            // Build Query with Loop (to bypass 1000 row limit for Superadmin)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let allRows: any[] = [];
            let from = 0;
            const step = 1000; // Match Supabase default limit
            let more = true;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let loopError: any = null;

            while (more) {
                let query = supabase.from("data_bultim_desa").select("*");

                if (puskName) {
                    query = query.eq("puskesmas", puskName);
                }

                const { data: chunk, error } = await query
                    .order("tahun", { ascending: false })
                    .order("bulan", { ascending: false })
                    .range(from, from + step - 1);

                if (error) {
                    console.error("Error fetching chunk:", error);
                    loopError = error;
                    more = false;
                } else if (chunk && chunk.length > 0) {
                    allRows = [...allRows, ...chunk];
                    from += chunk.length; // Advance by actual amount received
                    // If we got less than requested, we are done
                    if (chunk.length < step) more = false;
                } else {
                    more = false;
                }
            }

            const rows = allRows;
            const error = loopError;

            if (error) { console.error("Error:", error); }
            else {
                // Check if we hit the limit
                console.log(`Fetched ${rows?.length} rows`);

                setData(rows || []);
                if (rows && rows.length > 0) {
                    const years = [...new Set(rows.map((r) => r.tahun))].sort((a, b) => b - a);
                    // Only set default filters if not already set
                    setFilterTahun((prev) => prev || years[0]);

                    const months = [...new Set(rows.filter((r) => r.tahun === years[0]).map((r) => r.bulan))].sort((a, b) => b - a);
                    if (months.length > 0) setFilterBulan((prev) => prev || months[0]);
                }
            }
            setLoading(false);
        };
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isSuperadmin]);

    // Available filter values
    const availableYears = useMemo(() => [...new Set(data.map((r) => r.tahun))].sort((a, b) => b - a), [data]);
    // Always show all months (1-12)
    const availableMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    const availablePuskesmas = useMemo(() => [...new Set(data.map((r) => r.puskesmas))].sort(), [data]);
    const availableDesa = useMemo(() => {
        let filtered = data;
        // Case-insensitive comparison for robust filtering
        if (filterPuskesmas !== "all") {
            filtered = filtered.filter((r) => r.puskesmas.trim().toLowerCase() === filterPuskesmas.trim().toLowerCase());
        }
        return [...new Set(filtered.map((r) => r.kelurahan))].sort();
    }, [data, filterPuskesmas]);

    // Filtered data
    const filteredData = useMemo(() => {
        let result = data;
        if (filterTahun) result = result.filter((r) => r.tahun === filterTahun);
        if (filterBulan) result = result.filter((r) => r.bulan === filterBulan);
        if (filterPuskesmas !== "all") {
            result = result.filter((r) => r.puskesmas.trim().toLowerCase() === filterPuskesmas.trim().toLowerCase());
        }
        if (filterDesa !== "all") result = result.filter((r) => r.kelurahan === filterDesa);
        return result;
    }, [data, filterTahun, filterBulan, filterPuskesmas, filterDesa]);

    // Trend data (same as filteredData but IGNORING month filter)
    const trendData = useMemo(() => {
        let result = data;
        if (filterTahun) result = result.filter((r) => r.tahun === filterTahun);
        if (filterPuskesmas !== "all") {
            result = result.filter((r) => r.puskesmas.trim().toLowerCase() === filterPuskesmas.trim().toLowerCase());
        }
        if (filterDesa !== "all") result = result.filter((r) => r.kelurahan === filterDesa);
        return result;
    }, [data, filterTahun, filterPuskesmas, filterDesa]);

    // Aggregated totals
    const totals = useMemo(() => {
        const t = { sasaran_l: 0, sasaran_p: 0, jumlah_timbang: 0, jumlah_ukur: 0, jumlah_timbang_ukur: 0, stunting: 0, wasting: 0, underweight: 0, obesitas: 0 };
        filteredData.forEach((r) => {
            t.sasaran_l += r.data_sasaran_l; t.sasaran_p += r.data_sasaran_p;
            t.jumlah_timbang += r.jumlah_timbang; t.jumlah_ukur += r.jumlah_ukur;
            t.jumlah_timbang_ukur += r.jumlah_timbang_ukur;
            t.stunting += r.stunting; t.wasting += r.wasting; t.underweight += r.underweight; t.obesitas += r.obesitas;
        });
        const totalSasaran = t.sasaran_l + t.sasaran_p;
        return {
            ...t, totalSasaran,
            pctDataEntry: totalSasaran > 0 ? (t.jumlah_timbang_ukur / totalSasaran) * 100 : 0,
            pctStunting: t.jumlah_timbang_ukur > 0 ? (t.stunting / t.jumlah_timbang_ukur) * 100 : 0,
            pctWasting: t.jumlah_timbang_ukur > 0 ? (t.wasting / t.jumlah_timbang_ukur) * 100 : 0,
            pctUnderweight: t.jumlah_timbang_ukur > 0 ? (t.underweight / t.jumlah_timbang_ukur) * 100 : 0,
            pctObesitas: t.jumlah_timbang_ukur > 0 ? (t.obesitas / t.jumlah_timbang_ukur) * 100 : 0,
        };
    }, [filteredData]);

    // Gender donut data
    const genderData = useMemo(() => [
        { name: "Laki-laki", value: totals.sasaran_l, fill: "#3b82f6" },
        { name: "Perempuan", value: totals.sasaran_p, fill: "#ec4899" },
    ], [totals]);

    // Chart data: collapsible puskesmas → desa
    const chartData = useMemo(() => {
        if (filterDesa !== "all") {
            // Direct desa view when specific desa is filtered
            return filteredData.map((r) => {
                const totalSasaran = r.data_sasaran_l + r.data_sasaran_p;
                const metricVal = chartMetric === "dataEntry" ? (totalSasaran > 0 ? (r.jumlah_timbang_ukur / totalSasaran) * 100 : 0)
                    : chartMetric === "stunting" ? (r.jumlah_timbang_ukur > 0 ? (r.stunting / r.jumlah_timbang_ukur) * 100 : 0)
                        : chartMetric === "wasting" ? (r.jumlah_timbang_ukur > 0 ? (r.wasting / r.jumlah_timbang_ukur) * 100 : 0)
                            : chartMetric === "underweight" ? (r.jumlah_timbang_ukur > 0 ? (r.underweight / r.jumlah_timbang_ukur) * 100 : 0)
                                : (r.jumlah_timbang_ukur > 0 ? (r.obesitas / r.jumlah_timbang_ukur) * 100 : 0);
                return { name: r.kelurahan, value: parseFloat(metricVal.toFixed(2)), type: "desa" as const };
            }).sort((a, b) => b.value - a.value);
        }

        // Group by puskesmas
        const puskMap = new Map<string, DesaRow[]>();
        filteredData.forEach((r) => {
            if (!puskMap.has(r.puskesmas)) puskMap.set(r.puskesmas, []);
            puskMap.get(r.puskesmas)!.push(r);
        });

        const items: { name: string; value: number; type: "puskesmas" | "desa"; parent?: string }[] = [];
        const sortedPusk = [...puskMap.entries()].sort((a, b) => {
            const agg = (rows: DesaRow[]) => {
                const ts = rows.reduce((s, r) => s + r.data_sasaran_l + r.data_sasaran_p, 0);
                const ttu = rows.reduce((s, r) => s + r.jumlah_timbang_ukur, 0);
                if (chartMetric === "dataEntry") return ts > 0 ? (ttu / ts) * 100 : 0;
                const val = rows.reduce((s, r) => s + (r[chartMetric as keyof DesaRow] as number), 0);
                return ttu > 0 ? ((val as number) / ttu) * 100 : 0;
            };
            return agg(b[1]) - agg(a[1]);
        });

        for (const [pusk, rows] of sortedPusk) {
            const ts = rows.reduce((s, r) => s + r.data_sasaran_l + r.data_sasaran_p, 0);
            const ttu = rows.reduce((s, r) => s + r.jumlah_timbang_ukur, 0);
            const metricVal = chartMetric === "dataEntry" ? (ts > 0 ? (ttu / ts) * 100 : 0)
                : (ttu > 0 ? (rows.reduce((s, r) => s + (r[chartMetric as keyof DesaRow] as number), 0) / ttu) * 100 : 0);
            items.push({ name: pusk, value: parseFloat(metricVal.toFixed(2)), type: "puskesmas" });

            if (expandedPuskesmas.has(pusk)) {
                // SANGAT PENTING: Sort Desa dari Tertinggi ke Terendah biar enak dibaca
                const desaItems = rows.map((r) => {
                    const rts = r.data_sasaran_l + r.data_sasaran_p;
                    const rv = chartMetric === "dataEntry" ? (rts > 0 ? (r.jumlah_timbang_ukur / rts) * 100 : 0)
                        : (r.jumlah_timbang_ukur > 0 ? ((r[chartMetric as keyof DesaRow] as number) / r.jumlah_timbang_ukur) * 100 : 0);
                    return { name: `  └ ${r.kelurahan}`, value: parseFloat(rv.toFixed(2)), type: "desa" as const, parent: pusk };
                });

                // Sort descending
                desaItems.sort((a, b) => b.value - a.value);
                items.push(...desaItems);
            }
        }
        return items;
    }, [filteredData, chartMetric, expandedPuskesmas, filterDesa]);

    // Map data
    const mapData = useMemo(() => {
        const desaMap: Record<string, { metric: number; ttu: number }> = {};
        filteredData.forEach((r) => {
            if (!desaMap[r.kelurahan]) desaMap[r.kelurahan] = { metric: 0, ttu: 0 };
            desaMap[r.kelurahan].metric += r[mapMetric as keyof DesaRow] as number;
            desaMap[r.kelurahan].ttu += r.jumlah_timbang_ukur;
        });
        const result: Record<string, number> = {};
        for (const [name, v] of Object.entries(desaMap)) {
            result[name] = v.ttu > 0 ? (v.metric / v.ttu) * 100 : 0;
        }
        return result;
    }, [filteredData, mapMetric]);

    // Sort handler
    const handleSort = useCallback((col: string) => {
        setSortCol((prev) => { if (prev === col) { setSortAsc((a) => !a); return col; } setSortAsc(true); return col; });
    }, []);

    // Table data
    const tableData = useMemo(() => {
        const rows = filteredData.map((r) => {
            const totalSasaran = r.data_sasaran_l + r.data_sasaran_p;
            return {
                ...r, totalSasaran,
                pctDataEntry: totalSasaran > 0 ? (r.jumlah_timbang_ukur / totalSasaran) * 100 : 0,
                pctStunting: r.jumlah_timbang_ukur > 0 ? (r.stunting / r.jumlah_timbang_ukur) * 100 : 0,
                pctWasting: r.jumlah_timbang_ukur > 0 ? (r.wasting / r.jumlah_timbang_ukur) * 100 : 0,
                pctUnderweight: r.jumlah_timbang_ukur > 0 ? (r.underweight / r.jumlah_timbang_ukur) * 100 : 0,
                pctObesitas: r.jumlah_timbang_ukur > 0 ? (r.obesitas / r.jumlah_timbang_ukur) * 100 : 0,
            };
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rows.sort((a, b) => { const av = (a as any)[sortCol]; const bv = (b as any)[sortCol]; if (typeof av === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av); return sortAsc ? av - bv : bv - av; });
        return rows;
    }, [filteredData, sortCol, sortAsc]);

    // Export Excel
    const handleExportExcel = useCallback(() => {
        const rows = tableData.map((r, i) => ({
            "No": i + 1, "Kelurahan": r.kelurahan, "Puskesmas": r.puskesmas,
            "Sasaran L": r.data_sasaran_l, "Sasaran P": r.data_sasaran_p, "Total Sasaran": r.totalSasaran,
            "Timbang & Ukur": r.jumlah_timbang_ukur, "% Data Entry": parseFloat(r.pctDataEntry.toFixed(2)),
            "Stunting": r.stunting, "% Stunting": parseFloat(r.pctStunting.toFixed(2)),
            "Wasting": r.wasting, "% Wasting": parseFloat(r.pctWasting.toFixed(2)),
            "Underweight": r.underweight, "% Underweight": parseFloat(r.pctUnderweight.toFixed(2)),
            "Obesitas": r.obesitas, "% Obesitas": parseFloat(r.pctObesitas.toFixed(2)),
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Level Desa");
        XLSX.writeFile(wb, `pelayanan_kesehatan_desa_${filterTahun || "all"}_${filterBulan || "all"}.xlsx`);
    }, [tableData, filterTahun, filterBulan]);

    // Export PDF
    const handleExportPDF = useCallback(async () => {
        if (!dashboardRef.current) return;
        setExportingPDF(true);
        try {
            const element = dashboardRef.current;
            const canvas = await toPng(element, {
                cacheBust: true, pixelRatio: 2,
                // skipFonts: true, // Enabled fonts to fix icon rendering
                filter: (node) => !(node instanceof HTMLElement && node.classList?.contains("no-print")),
            });
            const img = new Image(); img.src = canvas;
            await new Promise((resolve) => { img.onload = resolve; });
            const pdf = new jsPDF({ orientation: img.width > img.height ? "landscape" : "portrait", unit: "px", format: [img.width, img.height] });
            pdf.addImage(canvas, "PNG", 0, 0, img.width, img.height);
            pdf.save(`pelayanan_kesehatan_desa_${filterTahun || "all"}_${filterBulan || "all"}.pdf`);
        } catch (err) { console.error("PDF export error:", err); }
        finally { setExportingPDF(false); }
    }, [filterTahun, filterBulan]);

    const METRIC_OPTIONS = [
        { key: "dataEntry", label: "% Data Entry" }, { key: "stunting", label: "Stunting" },
        { key: "wasting", label: "Wasting" }, { key: "underweight", label: "Underweight" }, { key: "obesitas", label: "Obesitas" },
    ];

    const TABLE_COLS = [
        { key: "kelurahan", label: "Kelurahan" }, { key: "puskesmas", label: "Puskesmas" },
        { key: "data_sasaran_l", label: "Sasaran L" }, { key: "data_sasaran_p", label: "Sasaran P" },
        { key: "totalSasaran", label: "Total" }, { key: "jumlah_timbang_ukur", label: "T&U" },
        { key: "pctDataEntry", label: "% Entry" }, { key: "stunting", label: "Stunting" },
        { key: "pctStunting", label: "% Stunting" }, { key: "wasting", label: "Wasting" },
        { key: "pctWasting", label: "% Wasting" }, { key: "underweight", label: "UW" },
        { key: "pctUnderweight", label: "% UW" }, { key: "obesitas", label: "Obes" },
        { key: "pctObesitas", label: "% Obes" },
    ];

    // Pagination
    const totalPages = tableRowsPerPage > 0 ? Math.ceil(tableData.length / tableRowsPerPage) : 1;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm text-slate-400 font-mono">Memuat data level desa...</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={dashboardRef} className="space-y-6">
            {/* ─── Filters ─── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className={`grid gap-4 ${isSuperadmin ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 lg:grid-cols-3"}`}>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Tahun</label>
                        <select value={filterTahun || ""} onChange={(e) => { setFilterTahun(e.target.value ? Number(e.target.value) : null); setFilterBulan(null); setFilterDesa("all"); setTablePage(1); }}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all">
                            <option value="">Semua Tahun</option>
                            {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Bulan</label>
                        <select value={filterBulan || ""} onChange={(e) => { setFilterBulan(e.target.value ? Number(e.target.value) : null); setTablePage(1); }}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all">
                            <option value="">Semua Bulan</option>
                            {availableMonths.map((m) => <option key={m} value={m}>{BULAN_LABELS[m]}</option>)}
                        </select>
                    </div>
                    {isSuperadmin && (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Puskesmas</label>
                            <select value={filterPuskesmas} onChange={(e) => { setFilterPuskesmas(e.target.value); setFilterDesa("all"); setTablePage(1); }}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all">
                                <option value="all">Semua Puskesmas</option>
                                {availablePuskesmas.map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Desa/Kelurahan</label>
                        <select value={filterDesa} onChange={(e) => { setFilterDesa(e.target.value); setTablePage(1); }}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all">
                            <option value="all">Semua Desa</option>
                            {availableDesa.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {data.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <span className="material-icons-round text-6xl text-slate-300 mb-4 block">cloud_upload</span>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">Belum Ada Data Level Desa</h3>
                    <p className="text-sm text-slate-400 max-w-md mx-auto">
                        Data belum tersedia. Upload file data melalui menu <strong>Upload Data</strong> → Pelayanan Kesehatan (Level Desa).
                    </p>
                </div>
            ) : (
                <>
                    {/* ─── Score Cards Row 1 ─── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <ScoreCard label="Total Sasaran" value={formatNum(totals.totalSasaran)} suffix="Balita" icon="groups" color="blue" />
                        <ScoreCard label="Sasaran Laki-laki" value={formatNum(totals.sasaran_l)} suffix="Balita" icon="boy" color="blue" />
                        <ScoreCard label="Sasaran Perempuan" value={formatNum(totals.sasaran_p)} suffix="Balita" icon="girl" color="pink" />
                        <ScoreCard label="Timbang & Ukur" value={formatNum(totals.jumlah_timbang_ukur)} suffix="Balita" icon="assignment_turned_in" color="purple" />
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <ScoreCard label="% Data Entry" value={formatPct(totals.pctDataEntry)} icon="percent" color="blue" highlight />
                        <ScoreCard label="Stunting" value={formatNum(totals.stunting)} suffix={formatPct(totals.pctStunting)} icon="height" color="amber" />
                        <ScoreCard label="Wasting" value={formatNum(totals.wasting)} suffix={formatPct(totals.pctWasting)} icon="trending_down" color="amber" />
                        <ScoreCard label="Underweight" value={formatNum(totals.underweight)} suffix={formatPct(totals.pctUnderweight)} icon="scale" color="amber" />
                        <ScoreCard label="Obesitas" value={formatNum(totals.obesitas)} suffix={formatPct(totals.pctObesitas)} icon="trending_up" color="red" />
                    </div>

                    {/* ─── Gender Analysis ─── */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                                <span className="material-icons-round text-lg text-indigo-500">wc</span>
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Analisis Data Sasaran by Gender</h3>
                                <p className="text-xs text-slate-400">Distribusi data sasaran berdasarkan jenis kelamin</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Donut Chart */}
                            <div className="flex flex-col items-center">
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie data={genderData} cx="50%" cy="50%" innerRadius={70} outerRadius={110}
                                            dataKey="value" labelLine={false} label={renderCustomLabel} strokeWidth={3} stroke="#fff">
                                            {genderData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                        </Pie>
                                        <Tooltip formatter={(value) => formatNum(Number(value))} />
                                        <Legend verticalAlign="bottom" iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                                <p className="text-center text-2xl font-extrabold text-slate-900 -mt-2">
                                    {formatNum(totals.totalSasaran)} <span className="text-sm font-bold text-slate-400">Total</span>
                                </p>
                            </div>
                            {/* Summary */}
                            <div className="flex flex-col justify-center space-y-4">
                                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                                    <div className="flex items-center gap-3">
                                        <span className="material-icons-round text-blue-500">boy</span>
                                        <div className="flex-1">
                                            <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Laki-laki</p>
                                            <p className="text-xl font-extrabold text-blue-800">{formatNum(totals.sasaran_l)}</p>
                                        </div>
                                        <span className="text-lg font-extrabold text-blue-600">
                                            {totals.totalSasaran > 0 ? ((totals.sasaran_l / totals.totalSasaran) * 100).toFixed(1) : "0"}%
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-pink-50 border border-pink-100">
                                    <div className="flex items-center gap-3">
                                        <span className="material-icons-round text-pink-500">girl</span>
                                        <div className="flex-1">
                                            <p className="text-xs text-pink-600 font-bold uppercase tracking-wider">Perempuan</p>
                                            <p className="text-xl font-extrabold text-pink-800">{formatNum(totals.sasaran_p)}</p>
                                        </div>
                                        <span className="text-lg font-extrabold text-pink-600">
                                            {totals.totalSasaran > 0 ? ((totals.sasaran_p / totals.totalSasaran) * 100).toFixed(1) : "0"}%
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rasio L:P</span>
                                        <span className="text-lg font-extrabold text-slate-800">
                                            {totals.sasaran_p > 0 ? (totals.sasaran_l / totals.sasaran_p).toFixed(2) : "N/A"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── Trend Analysis ─── */}
                    <TrendAnalysisChart data={trendData} year={filterTahun} />

                    {/* ─── Interactive Map ─── */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                                    <span className="material-icons-round text-lg text-emerald-500">map</span>
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Peta Interaktif Prevalensi Gizi Level Desa</h3>
                                    <p className="text-xs text-slate-400">Klik area desa pada peta untuk melihat detail</p>
                                </div>
                            </div>
                            <select value={mapMetric} onChange={(e) => setMapMetric(e.target.value)}
                                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 no-print">
                                <option value="stunting">Prevalensi Stunting</option>
                                <option value="wasting">Prevalensi Wasting</option>
                                <option value="underweight">Prevalensi Underweight</option>
                                <option value="obesitas">Prevalensi Obesitas</option>
                            </select>
                        </div>
                        <MapDesaComponent
                            data={mapData}
                            metric={mapMetric}
                            selectedDesa={filterDesa !== "all" ? filterDesa : null}
                            selectedPuskesmas={filterPuskesmas !== "all" ? filterPuskesmas : null}
                        />
                    </div>

                    {/* ─── Bar Chart (collapsible) ─── */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                                    <span className="material-icons-round text-lg text-violet-500">bar_chart</span>
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Grafik Prevalensi per Wilayah</h3>
                                    <p className="text-xs text-slate-400">{filterDesa !== "all" ? "Level Desa" : "Klik bar puskesmas untuk expand ke desa"}</p>
                                </div>
                            </div>
                            <div className="flex gap-1 flex-wrap no-print">
                                {METRIC_OPTIONS.map((m) => (
                                    <button key={m.key} onClick={() => setChartMetric(m.key)}
                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wider transition-all ${chartMetric === m.key ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={Math.max(400, chartData.length * 32)}>
                            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} domain={[0, "auto"]}
                                    tickFormatter={(v) => `${v}%`} />
                                <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 11, fill: "#475569" }}
                                    tickFormatter={(v) => v.length > 20 ? v.slice(0, 20) + "…" : v} />
                                <Tooltip
                                    formatter={(value: any, name: any, props: any) => {
                                        const metricLabel = METRIC_OPTIONS.find((m) => m.key === chartMetric)?.label || "";
                                        return [`${Number(value).toFixed(2)}%`, metricLabel];
                                    }}
                                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                                />

                                <Bar dataKey="value" radius={[0, 6, 6, 0]} onClick={(entry) => {
                                    if (entry.type === "puskesmas") {
                                        setExpandedPuskesmas((prev) => {
                                            const next = new Set(prev);
                                            const name = String(entry.name || "");
                                            if (next.has(name)) next.delete(name); else next.add(name);
                                            return next;
                                        });
                                    }
                                }} cursor={filterDesa === "all" ? "pointer" : "default"}>
                                    {chartData.map((entry, i) => (
                                        <Cell key={i} fill={entry.type === "desa" ? getBarColor(entry.value, chartMetric) + "99" : getBarColor(entry.value, chartMetric)}
                                            stroke={entry.type === "puskesmas" ? "#1e293b" : "transparent"} strokeWidth={entry.type === "puskesmas" ? 1 : 0} />
                                    ))}
                                    <LabelList
                                        dataKey="value"
                                        position="right"
                                        fill="#64748b"
                                        fontSize={10}
                                        fontWeight="bold"
                                        formatter={(val: any) => (typeof val === "number" && val > 0) ? `${val.toFixed(1)}%` : ""}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* ─── Detail Table ─── */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                                    <span className="material-icons-round text-lg text-slate-500">table_chart</span>
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Detail Data per Kelurahan/Desa</h3>
                                    <p className="text-xs text-slate-400">{tableData.length} desa • Klik header untuk sort</p>
                                </div>
                            </div>
                            <div className="flex gap-2 no-print">
                                <button onClick={handleExportExcel} className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-all flex items-center gap-1.5">
                                    <span className="material-icons-round text-sm">download</span> Excel
                                </button>
                                <button onClick={handleExportPDF} disabled={exportingPDF} className="px-4 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-all flex items-center gap-1.5 disabled:opacity-50">
                                    <span className="material-icons-round text-sm">picture_as_pdf</span> {exportingPDF ? "..." : "PDF"}
                                </button>
                            </div>
                        </div>
                        <div className={`overflow-x-auto ${tableRowsPerPage === 0 ? "max-h-[600px] overflow-y-auto" : ""}`}>
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 z-20">
                                    <tr className="bg-slate-50">
                                        <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono w-12">No</th>
                                        {TABLE_COLS.map((col) => (
                                            <th key={col.key} onClick={() => { handleSort(col.key); setTablePage(1); }}
                                                className="px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono cursor-pointer hover:text-emerald-600 transition-colors whitespace-nowrap">
                                                {col.label} {sortCol === col.key && (sortAsc ? "↑" : "↓")}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const showAll = tableRowsPerPage === 0;
                                        const startIdx = showAll ? 0 : (tablePage - 1) * tableRowsPerPage;
                                        const paginated = showAll ? tableData : tableData.slice(startIdx, startIdx + tableRowsPerPage);
                                        return paginated.map((row, i) => {
                                            const gi = showAll ? i : startIdx + i;
                                            return (
                                                <tr key={row.id || gi} className={`${gi % 2 === 0 ? "bg-white" : "bg-slate-50/50"} hover:bg-emerald-50/30 transition-colors`}>
                                                    <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{gi + 1}</td>
                                                    <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{row.kelurahan}</td>
                                                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{row.puskesmas}</td>
                                                    <td className="px-3 py-2.5 text-blue-600 font-bold">{formatNum(row.data_sasaran_l)}</td>
                                                    <td className="px-3 py-2.5 text-pink-600 font-bold">{formatNum(row.data_sasaran_p)}</td>
                                                    <td className="px-3 py-2.5 font-bold">{formatNum(row.totalSasaran)}</td>
                                                    <td className="px-3 py-2.5">{formatNum(row.jumlah_timbang_ukur)}</td>
                                                    <td className={`px-3 py-2.5 font-bold ${getPrevalenceColor(row.pctDataEntry, "dataEntry")}`}>{formatPct(row.pctDataEntry)}</td>
                                                    <td className="px-3 py-2.5">{formatNum(row.stunting)}</td>
                                                    <td className={`px-3 py-2.5 font-bold ${getPrevalenceColor(row.pctStunting, "stunting")}`}>{formatPct(row.pctStunting)}</td>
                                                    <td className="px-3 py-2.5">{formatNum(row.wasting)}</td>
                                                    <td className={`px-3 py-2.5 font-bold ${getPrevalenceColor(row.pctWasting, "wasting")}`}>{formatPct(row.pctWasting)}</td>
                                                    <td className="px-3 py-2.5">{formatNum(row.underweight)}</td>
                                                    <td className={`px-3 py-2.5 font-bold ${getPrevalenceColor(row.pctUnderweight, "underweight")}`}>{formatPct(row.pctUnderweight)}</td>
                                                    <td className="px-3 py-2.5">{formatNum(row.obesitas)}</td>
                                                    <td className={`px-3 py-2.5 font-bold ${getPrevalenceColor(row.pctObesitas, "obesitas")}`}>{formatPct(row.pctObesitas)}</td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                <div className="flex items-center gap-2">
                                    <span>Tampilkan</span>
                                    <select value={tableRowsPerPage} onChange={(e) => { setTableRowsPerPage(Number(e.target.value)); setTablePage(1); }}
                                        className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-sm font-bold">
                                        <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={0}>All</option>
                                    </select>
                                </div>
                                <span>
                                    {tableRowsPerPage > 0
                                        ? `${(tablePage - 1) * tableRowsPerPage + 1}–${Math.min(tablePage * tableRowsPerPage, tableData.length)} dari ${tableData.length}`
                                        : `${tableData.length} desa`}
                                </span>
                            </div>
                            {tableRowsPerPage > 0 && (
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setTablePage(1)} disabled={tablePage === 1} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"><span className="material-icons-round text-sm">first_page</span></button>
                                    <button onClick={() => setTablePage((p) => Math.max(1, p - 1))} disabled={tablePage === 1} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"><span className="material-icons-round text-sm">chevron_left</span></button>
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let page: number;
                                        if (totalPages <= 5) page = i + 1;
                                        else if (tablePage <= 3) page = i + 1;
                                        else if (tablePage >= totalPages - 2) page = totalPages - 4 + i;
                                        else page = tablePage - 2 + i;
                                        return (
                                            <button key={page} onClick={() => setTablePage(page)}
                                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${page === tablePage ? "bg-emerald-600 text-white shadow" : "hover:bg-slate-100 text-slate-500"}`}>
                                                {page}
                                            </button>
                                        );
                                    })}
                                    <button onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))} disabled={tablePage === totalPages} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"><span className="material-icons-round text-sm">chevron_right</span></button>
                                    <button onClick={() => setTablePage(totalPages)} disabled={tablePage === totalPages} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"><span className="material-icons-round text-sm">last_page</span></button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
