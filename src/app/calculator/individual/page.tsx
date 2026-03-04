"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
    Scatter,
    ComposedChart,
} from "recharts";
import { fetchLmsReference, type LmsReference } from "../../../lib/supabase-pkmk";
import {
    calculateFullAssessment,
    generateGrowthCurve,
    generateGrowthCurveBBTB,
    type AssessmentInput,
    type FullAssessmentResult,
    type ZScoreResult,
    type SexCode,
    type MeasurementMethod,
} from "../../../lib/who-zscore";

// ============================================================
// HELPERS
// ============================================================
function formatDecimalMonths(birthDate: Date, measureDate: Date): string {
    const diffMs = measureDate.getTime() - birthDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const monthsDecimal = diffDays / 30.4375;
    return `${monthsDecimal.toFixed(1)} bulan`;
}

function formatAge(months: number): string {
    if (months < 1) return "< 1 bulan";
    if (months < 12) return `${months} bulan`;
    const y = Math.floor(months / 12);
    const m = months % 12;
    return m > 0 ? `${y} tahun ${m} bulan` : `${y} tahun`;
}

function zScoreColor(severity: string) {
    switch (severity) {
        case "severe": return { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "bg-red-100 text-red-800", dot: "bg-red-500" };
        case "moderate": return { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", badge: "bg-orange-100 text-orange-800", dot: "bg-orange-500" };
        case "normal": return { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" };
        case "risk": return { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-500" };
        case "overweight": return { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-800", dot: "bg-amber-500" };
        case "obese": return { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", badge: "bg-rose-100 text-rose-800", dot: "bg-rose-500" };
        default: return { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", badge: "bg-slate-100 text-slate-800", dot: "bg-slate-400" };
    }
}

// ============================================================
// FORM DATA TYPE
// ============================================================
interface FormData {
    namaLengkap: string;
    alamat: string;
    sex: SexCode | "";
    tanggalLahir: string;
    tanggalUkur: string;
    beratBadan: string;
    tinggiBadan: string;
    caraUkur: MeasurementMethod;
}

// ============================================================
// GROWTH CHART COMPONENT
// ============================================================
function GrowthChart({
    title,
    data,
    childPoint,
    xLabel,
    yLabel,
    xKey = "x",
}: {
    title: string;
    data: Array<{ x: number; sd3neg: number; sd2neg: number; sd0: number; sd2: number; sd3: number }>;
    childPoint: { x: number; y: number } | null;
    xLabel: string;
    yLabel: string;
    xKey?: string;
}) {
    // Merge child point into chart data
    const chartData = data.map((d) => ({
        ...d,
        childY: childPoint && d.x === childPoint.x ? childPoint.y : undefined,
    }));

    // Find closest x for child point display
    if (childPoint) {
        const closest = data.reduce((prev, curr) =>
            Math.abs(curr.x - childPoint.x) < Math.abs(prev.x - childPoint.x) ? curr : prev
        );
        const idx = chartData.findIndex((d) => d.x === closest.x);
        if (idx >= 0) chartData[idx].childY = childPoint.y;
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span className="material-icons-round text-base text-indigo-500">show_chart</span>
                {title}
            </h4>
            <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                        dataKey="x"
                        label={{ value: xLabel, position: "insideBottom", offset: -2, style: { fontSize: 10, fill: "#94a3b8" } }}
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                    />
                    <YAxis
                        label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 10, fill: "#94a3b8" } }}
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                    />
                    <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                        formatter={(value: any, name: any) => {
                            const labels: Record<string, string> = {
                                sd3neg: "SD -3", sd2neg: "SD -2", sd0: "Median",
                                sd2: "SD +2", sd3: "SD +3", childY: "Anak",
                            };
                            return [typeof value === "number" ? value.toFixed(1) : value, labels[name] || name];
                        }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} formatter={(value) => {
                        const labels: Record<string, string> = {
                            sd3neg: "SD -3", sd2neg: "SD -2", sd0: "Median",
                            sd2: "SD +2", sd3: "SD +3", childY: "Anak",
                        };
                        return labels[value] || value;
                    }} />
                    <Line type="monotone" dataKey="sd3neg" stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="sd2neg" stroke="#f97316" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="sd0" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="sd2" stroke="#f97316" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="sd3" stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                    {childPoint && (
                        <Scatter dataKey="childY" fill="#6366f1" shape="circle" name="childY" />
                    )}
                    {childPoint && (
                        <ReferenceLine
                            x={childPoint.x}
                            stroke="#6366f1"
                            strokeDasharray="3 3"
                            strokeOpacity={0.5}
                        />
                    )}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}

// ============================================================
// PROBABLE STUNTING VISUALIZER
// ============================================================
function ProbableStuntingCard({ result }: { result: FullAssessmentResult }) {
    const ps = result.probableStunting;
    const items = [
        { label: "Weight Age (WA)", value: ps.weightAge, icon: "monitor_weight", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
        { label: "Length Age (LA)", value: ps.lengthAge, icon: "height", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
        { label: "Chronological Age (CA)", value: ps.chronologicalAge, icon: "calendar_today", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100" },
    ];

    return (
        <div className={`rounded-2xl border-2 p-6 ${ps.isProbableStunting ? "border-amber-300 bg-amber-50/50" : "border-emerald-200 bg-emerald-50/30"}`}>
            <div className="flex items-start gap-4 mb-5">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${ps.isProbableStunting ? "bg-amber-100" : "bg-emerald-100"}`}>
                    <span className={`material-icons-round text-2xl ${ps.isProbableStunting ? "text-amber-600" : "text-emerald-600"}`}>
                        {ps.isProbableStunting ? "warning" : "check_circle"}
                    </span>
                </div>
                <div>
                    <div className={`text-xs font-bold uppercase tracking-wider font-mono mb-1 ${ps.isProbableStunting ? "text-amber-600" : "text-emerald-600"}`}>
                        Analisis Probable Stunting
                    </div>
                    <h4 className="text-lg font-extrabold text-slate-900">
                        {ps.isProbableStunting ? "🔴 Terindikasi Probable Stunting" : "✅ Tidak Terindikasi Probable Stunting"}
                    </h4>
                </div>
            </div>

            {/* Age timeline visualization */}
            <div className="grid grid-cols-3 gap-3 mb-5">
                {items.map((item, i) => (
                    <div key={i} className={`rounded-xl border ${item.border} ${item.bg} p-4 text-center`}>
                        <span className={`material-icons-round text-xl mb-1 block ${item.color}`}>{item.icon}</span>
                        <div className={`text-xl font-black font-mono ${item.color}`}>
                            {item.value !== null ? item.value : "—"}
                        </div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">bulan</div>
                        <div className="text-[10px] text-slate-500 mt-1 font-medium leading-tight">{item.label}</div>
                    </div>
                ))}
            </div>

            {/* Logic display */}
            <div className="bg-white rounded-xl border border-slate-100 p-4 font-mono text-xs">
                <div className="text-slate-400 text-[10px] mb-2 uppercase tracking-wider">Logika Diagnosa:</div>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-blue-600 font-bold">WA ({ps.weightAge ?? "—"})</span>
                    <span className={`font-black text-lg ${ps.weightAge !== null && ps.lengthAge !== null && ps.weightAge < ps.lengthAge ? "text-emerald-500" : "text-red-500"}`}>
                        {ps.weightAge !== null && ps.lengthAge !== null && ps.weightAge < ps.lengthAge ? "< ✓" : "≥ ✗"}
                    </span>
                    <span className="text-purple-600 font-bold">LA ({ps.lengthAge ?? "—"})</span>
                    <span className={`font-black text-lg ${ps.lengthAge !== null && ps.lengthAge < ps.chronologicalAge ? "text-emerald-500" : "text-red-500"}`}>
                        {ps.lengthAge !== null && ps.lengthAge < ps.chronologicalAge ? "< ✓" : "≥ ✗"}
                    </span>
                    <span className="text-slate-600 font-bold">CA ({ps.chronologicalAge})</span>
                </div>
            </div>

            {ps.isProbableStunting && (
                <div className="mt-4 text-xs text-amber-700 bg-amber-100 rounded-xl p-3 leading-relaxed">
                    <strong>Interpretasi Klinis:</strong> Berat badan anak setara anak yang lebih muda dari tinggi badannya, dan
                    tinggi badannya setara anak yang lebih muda dari usia kronologisnya. Kondisi ini mengindikasikan terjadi
                    hambatan pertumbuhan linier dengan komposisi tubuh yang relatif proporsional — pola khas pada{" "}
                    <strong>stunting adaptif</strong>.
                </div>
            )}
        </div>
    );
}

// ============================================================
// RESULTS PANEL
// ============================================================
function ResultsPanel({
    result,
    form,
    lms,
    onReset,
}: {
    result: FullAssessmentResult;
    form: FormData;
    lms: LmsReference;
    onReset: () => void;
}) {
    const resultRef = useRef<HTMLDivElement>(null);

    const indices = [
        { key: "bbu" as const, label: "BBU", fullLabel: "Berat Badan / Umur", icon: "monitor_weight", unit: `${form.beratBadan} kg / ${result.ageMonths} bln` },
        { key: "tbu" as const, label: "TBU", fullLabel: "Tinggi Badan / Umur", icon: "height", unit: `${result.correctedHeight.toFixed(1)} cm / ${result.ageMonths} bln` },
        { key: "bbtb" as const, label: "BBTB", fullLabel: "Berat Badan / Tinggi Badan", icon: "straighten", unit: `${form.beratBadan} kg / ${result.correctedHeight.toFixed(1)} cm` },
    ];

    const sex = form.sex as SexCode;
    const bbuCurve = generateGrowthCurve(lms.bbu, sex, "Month");
    const tbuCurve = generateGrowthCurve(lms.tbu, sex, "Month");
    const bbtbCurve = generateGrowthCurveBBTB(lms.bbtb, sex);

    const handleExportPDF = async () => {
        try {
            const { default: jsPDF } = await import("jspdf");
            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const W = pdf.internal.pageSize.getWidth();
            let y = 0;

            const addLine = (text: string, fontSize: number, bold = false, color: [number, number, number] = [30, 30, 30], indent = 14) => {
                pdf.setFontSize(fontSize);
                pdf.setFont("helvetica", bold ? "bold" : "normal");
                pdf.setTextColor(...color);
                const lines = pdf.splitTextToSize(text, W - indent * 2);
                lines.forEach((line: string) => {
                    if (y > 275) { pdf.addPage(); y = 14; }
                    pdf.text(line, indent, y);
                    y += fontSize * 0.45;
                });
            };

            const addSep = (thick = false) => {
                if (y > 275) { pdf.addPage(); y = 14; }
                pdf.setDrawColor(thick ? 99 : 220, thick ? 102 : 220, thick ? 241 : 220);
                pdf.setLineWidth(thick ? 0.5 : 0.2);
                pdf.line(14, y, W - 14, y);
                y += 5;
            };

            const sexLabel = form.sex === 1 ? "Laki-laki" : "Perempuan";

            // ---- HEADER ----
            y = 18;
            pdf.setFillColor(16, 185, 129);
            pdf.rect(0, 0, W, 12, "F");
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(255, 255, 255);
            pdf.text("SIGMA Calculator — Hasil Analisis Status Gizi WHO ZScore", 14, 8);
            pdf.text(`Tanggal: ${new Date().toLocaleDateString("id-ID")}`, W - 14, 8, { align: "right" });

            addLine("Penilaian Status Gizi Individu", 18, true, [15, 23, 42]);
            addLine("WHO Child Growth Standards 2006 — LMS Method", 8, false, [100, 116, 139]);
            y += 4;
            addSep(true);

            // ---- DATA INDIVIDU ----
            addLine("DATA INDIVIDU", 10, true, [99, 102, 241]);
            y += 2;
            const fields1: [string, string][] = [
                ["Nama", form.namaLengkap || "—"],
                ["Alamat", form.alamat || "—"],
                ["Jenis Kelamin", sexLabel],
                ["Tanggal Lahir", new Date(form.tanggalLahir).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })],
                ["Tanggal Pengukuran", new Date(form.tanggalUkur).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })],
                ["Usia", `${result.ageMonths} bulan`],
            ];
            fields1.forEach(([label, val]) => {
                if (y > 275) { pdf.addPage(); y = 14; }
                pdf.setFontSize(9.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(71, 85, 105);
                pdf.text(label, 14, y);
                pdf.setFont("helvetica", "normal"); pdf.setTextColor(30, 30, 30);
                pdf.text(val, 75, y);
                y += 5.5;
            });
            y += 3;
            addSep();

            // ---- ANTROPOMETRI ----
            addLine("DATA ANTROPOMETRI", 10, true, [99, 102, 241]);
            y += 2;
            const fields2: [string, string][] = [
                ["Berat Badan", `${form.beratBadan} kg`],
                ["Tinggi Badan (input)", `${form.tinggiBadan} cm`],
                ["Cara Pengukuran", form.caraUkur === "standing" ? "Berdiri" : "Terlentang"],
                ["Tinggi Badan (terkoreksi WHO)", `${result.correctedHeight.toFixed(1)} cm`],
            ];
            fields2.forEach(([label, val]) => {
                if (y > 275) { pdf.addPage(); y = 14; }
                pdf.setFontSize(9.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(71, 85, 105);
                pdf.text(label, 14, y);
                pdf.setFont("helvetica", "normal"); pdf.setTextColor(30, 30, 30);
                pdf.text(val, 75, y);
                y += 5.5;
            });
            y += 3;
            addSep();

            // ---- ZSCORE RESULTS ----
            addLine("HASIL ANALISIS ZSCORE", 10, true, [99, 102, 241]);
            y += 2;
            const zRows: [string, ZScoreResult][] = [
                ["BBU (Berat Badan / Umur)", result.bbu],
                ["TBU (Tinggi Badan / Umur)", result.tbu],
                ["BBTB (Berat Badan / Tinggi Badan)", result.bbtb],
            ];
            zRows.forEach(([label, r]) => {
                if (y > 272) { pdf.addPage(); y = 14; }
                const zStr = r.zscore !== null ? `${r.zscore > 0 ? "+" : ""}${r.zscore.toFixed(2)}` : "—";
                const flagStr = r.isRedFlag ? " ⚠ RED FLAG" : "";
                const sevColor: [number, number, number] =
                    r.severity === "severe" ? [220, 38, 38] :
                        r.severity === "moderate" ? [234, 88, 12] :
                            r.severity === "normal" ? [22, 163, 74] : [161, 98, 7];
                pdf.setFontSize(9.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(71, 85, 105);
                pdf.text(label, 14, y);
                pdf.setFont("helvetica", "bold"); pdf.setTextColor(...sevColor);
                pdf.text(`ZScore: ${zStr}  |  ${r.classification}${flagStr}`, 75, y);
                y += 7;
            });
            y += 2;
            addSep();

            // ---- PROBABLE STUNTING ----
            const isStunted = result.tbu.zscore !== null && result.tbu.zscore < -2;
            if (isStunted) {
                addLine("ANALISIS PROBABLE STUNTING", 10, true, [99, 102, 241]);
                y += 2;
                const ps = result.probableStunting;
                const psFields: [string, string][] = [
                    ["Weight Age (WA)", ps.weightAge !== null ? `${ps.weightAge} bulan` : "—"],
                    ["Length Age (LA)", ps.lengthAge !== null ? `${ps.lengthAge} bulan` : "—"],
                    ["Chronological Age (CA)", `${ps.chronologicalAge} bulan`],
                    ["Logika", `WA(${ps.weightAge ?? "—"}) ${ps.weightAge !== null && ps.lengthAge !== null && ps.weightAge < ps.lengthAge ? "<" : "≥"} LA(${ps.lengthAge ?? "—"}) ${ps.lengthAge !== null && ps.lengthAge < ps.chronologicalAge ? "<" : "≥"} CA(${ps.chronologicalAge})`],
                    ["Status", ps.isProbableStunting ? "TERINDIKASI Probable Stunting" : "Tidak Terindikasi Probable Stunting"],
                ];
                psFields.forEach(([label, val]) => {
                    if (y > 275) { pdf.addPage(); y = 14; }
                    const isStatus = label === "Status";
                    pdf.setFontSize(9.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(71, 85, 105);
                    pdf.text(label, 14, y);
                    pdf.setFont("helvetica", isStatus ? "bold" : "normal");
                    pdf.setTextColor(...(isStatus && ps.isProbableStunting ? [217, 119, 6] as [number, number, number] : isStatus ? [22, 163, 74] as [number, number, number] : [30, 30, 30] as [number, number, number]));
                    pdf.text(val, 75, y);
                    y += 5.5;
                });
                y += 3;
            }

            if (result.hasAnyRedFlag) {
                addSep();
                addLine("⚠ RED FLAG TERDETEKSI", 10, true, [220, 38, 38]);
                y += 1;
                result.redFlags.forEach((flag) => addLine(`• ${flag}`, 8.5, false, [153, 27, 27]));
                y += 2;
            }

            addSep(true);
            addLine("SIGMA Calculator | WHO Child Growth Standards 2006 | Data tidak disimpan ke database", 7, false, [148, 163, 184]);

            pdf.save(`SIGMA-Kalkulator-${form.namaLengkap || "Anak"}-${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (e) {
            console.error("PDF export error:", e);
        }
    };

    const handleExportExcel = async () => {
        try {
            const { utils, writeFile } = await import("xlsx");
            const data = [
                ["SIGMA Calculator - Hasil Analisis Status Gizi"],
                ["Tanggal Analisis", new Date().toLocaleDateString("id-ID")],
                [],
                ["DATA INDIVIDU"],
                ["Nama", form.namaLengkap || "-"],
                ["Alamat", form.alamat || "-"],
                ["Jenis Kelamin", form.sex === 1 ? "Laki-laki" : "Perempuan"],
                ["Tanggal Lahir", form.tanggalLahir],
                ["Tanggal Ukur", form.tanggalUkur],
                ["Usia (bulan)", result.ageMonths],
                ["Usia (format)", formatAge(result.ageMonths)],
                [],
                ["DATA ANTROPOMETRI"],
                ["Berat Badan (kg)", form.beratBadan],
                ["Tinggi Badan Input (cm)", form.tinggiBadan],
                ["Cara Pengukuran", form.caraUkur === "standing" ? "Berdiri" : "Terlentang"],
                ["Tinggi Badan Terkoreksi (cm)", result.correctedHeight.toFixed(2)],
                [],
                ["HASIL ANALISIS ZSCORE"],
                ["Indeks", "ZScore", "Klasifikasi", "Red Flag"],
                ["BBU (Berat/Umur)", result.bbu.zscore?.toFixed(2) ?? "-", result.bbu.classification, result.bbu.isRedFlag ? "YA" : "Tidak"],
                ["TBU (Tinggi/Umur)", result.tbu.zscore?.toFixed(2) ?? "-", result.tbu.classification, result.tbu.isRedFlag ? "YA" : "Tidak"],
                ["BBTB (Berat/Tinggi)", result.bbtb.zscore?.toFixed(2) ?? "-", result.bbtb.classification, result.bbtb.isRedFlag ? "YA" : "Tidak"],
                [],
                ...(result.tbu.zscore !== null && result.tbu.zscore < -2 ? [
                    ["ANALISIS PROBABLE STUNTING"],
                    ["Weight Age (bulan)", result.probableStunting.weightAge ?? "-"],
                    ["Length Age (bulan)", result.probableStunting.lengthAge ?? "-"],
                    ["Chronological Age (bulan)", result.probableStunting.chronologicalAge],
                    ["Status Probable Stunting", result.probableStunting.isProbableStunting ? "TERINDIKASI" : "TIDAK TERINDIKASI"],
                    [],
                ] : []),
                ["RED FLAG STATUS"],
                ["Ada Red Flag", result.hasAnyRedFlag ? "YA" : "TIDAK"],
                ...result.redFlags.map((f) => ["Detail", f]),
                [],
                ["SIGMA Calculator | WHO Child Growth Standards 2006 | sigma-ecosystem.vercel.app"],
            ];
            const ws = utils.aoa_to_sheet(data);
            ws["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 35 }, { wch: 12 }];
            const wb = utils.book_new();
            utils.book_append_sheet(wb, ws, "Hasil Analisis");
            writeFile(wb, `SIGMA-Kalkulator-${form.namaLengkap || "Anak"}-${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (e) {
            console.error("Excel export error:", e);
        }
    };

    return (
        <div className="space-y-6">
            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 justify-between items-center">
                <button
                    onClick={onReset}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm"
                >
                    <span className="material-icons-round text-sm">refresh</span>
                    Hitung Ulang
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200"
                    >
                        <span className="material-icons-round text-sm">table_view</span>
                        Export Excel
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors shadow-sm shadow-red-200"
                    >
                        <span className="material-icons-round text-sm">picture_as_pdf</span>
                        Export PDF
                    </button>
                </div>
            </div>

            <div ref={resultRef} className="space-y-6">
                {/* Identity summary */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white flex-shrink-0">
                            <span className="material-icons-round text-2xl">person</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-extrabold text-slate-900 text-lg">{form.namaLengkap || "—"}</h3>
                            <div className="flex flex-wrap gap-3 mt-1">
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <span className="material-icons-round text-xs">wc</span>
                                    {form.sex === 1 ? "Laki-laki" : "Perempuan"}
                                </span>
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <span className="material-icons-round text-xs">cake</span>
                                    {form.tanggalLahir ? new Date(form.tanggalLahir).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                                </span>
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                                    {formatAge(result.ageMonths)} · {result.ageMonths} bulan
                                </span>
                            </div>
                            {form.alamat && <p className="text-xs text-slate-400 mt-1">{form.alamat}</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                            <div className="text-xs text-slate-400 font-mono">{new Date(form.tanggalUkur).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</div>
                            <div className="text-xs font-bold text-slate-600 mt-0.5">{form.beratBadan} kg · {form.tinggiBadan} cm</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">TB koreksi: {result.correctedHeight.toFixed(1)} cm</div>
                        </div>
                    </div>
                </div>

                {/* RED FLAG ALERT */}
                {result.hasAnyRedFlag && (
                    <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5">
                        <div className="flex gap-3 items-start">
                            <span className="material-icons-round text-red-600 text-2xl flex-shrink-0 mt-0.5">report</span>
                            <div>
                                <h4 className="font-extrabold text-red-800 mb-2">⚠️ RED FLAG TERDETEKSI — Plausibilitas Data Perlu Diperiksa</h4>
                                <p className="text-red-700 text-sm mb-3">Nilai ZScore berikut berada di luar batas plausibilitas WHO. Kemungkinan terjadi kesalahan pengukuran atau input data. Lakukan verifikasi ulang sebelum interpretasi klinis.</p>
                                <ul className="space-y-1">
                                    {result.redFlags.map((flag, i) => (
                                        <li key={i} className="text-xs text-red-700 bg-red-100 rounded-lg px-3 py-1.5 font-mono">{flag}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Z-Score Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {indices.map(({ key, label, fullLabel, icon, unit }) => {
                        const r = result[key];
                        const c = zScoreColor(r.severity);
                        return (
                            <div key={key} className={`rounded-2xl border-2 ${c.border} ${c.bg} p-5`}>
                                <div className="flex items-center justify-between mb-3">
                                    <span className={`material-icons-round text-xl ${c.text}`}>{icon}</span>
                                    {r.isRedFlag && (
                                        <span className="text-[9px] font-bold bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            ⚠ Flag
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono mb-1">{label}</div>
                                <div className={`text-3xl font-black font-mono mb-1 ${c.text}`}>
                                    {r.zscore !== null ? (r.zscore > 0 ? "+" : "") + r.zscore.toFixed(2) : "—"}
                                </div>
                                <div className={`text-xs font-bold ${c.text} mb-2`}>{r.classification}</div>
                                <div className="text-[10px] text-slate-400 leading-tight">{fullLabel}</div>
                                <div className="text-[10px] text-slate-400 font-mono leading-tight">{unit}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Probable Stunting (Only if TBU < -2 SD / Stunted) */}
                {result.tbu.zscore !== null && result.tbu.zscore < -2 && (
                    <ProbableStuntingCard result={result} />
                )}

                {/* Growth Charts */}
                <div>
                    <h3 className="text-base font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="material-icons-round text-indigo-500">auto_graph</span>
                        Growth Charts WHO
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                        <GrowthChart
                            title="BBU — Berat Badan menurut Umur"
                            data={bbuCurve}
                            childPoint={result.bbu.zscore !== null ? { x: result.ageMonths, y: parseFloat(form.beratBadan) } : null}
                            xLabel="Usia (bulan)"
                            yLabel="BB (kg)"
                        />
                        <GrowthChart
                            title="TBU — Tinggi Badan menurut Umur"
                            data={tbuCurve}
                            childPoint={result.tbu.zscore !== null ? { x: result.ageMonths, y: result.correctedHeight } : null}
                            xLabel="Usia (bulan)"
                            yLabel="TB (cm)"
                        />
                        <GrowthChart
                            title="BBTB — Berat Badan menurut Tinggi Badan"
                            data={bbtbCurve}
                            childPoint={result.bbtb.zscore !== null ? { x: result.correctedHeight, y: parseFloat(form.beratBadan) } : null}
                            xLabel="Tinggi Badan (cm)"
                            yLabel="BB (kg)"
                        />
                    </div>
                </div>

                {/* Footer note */}
                <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 text-xs text-slate-400 text-center leading-relaxed">
                    Hasil analisis ini menggunakan <strong className="text-slate-600">WHO Child Growth Standards 2006</strong> (LMS Method) · SIGMA Calculator ·{" "}
                    <span className="font-mono">{new Date().toLocaleString("id-ID")}</span> ·{" "}
                    <span className="text-amber-600 font-medium">Data tidak disimpan ke database</span>
                </div>
                {/* Attribution footer */}
                <div className="border-t border-slate-100 pt-5 text-center text-xs text-slate-400">
                    Crafted with <span className="text-red-400">♥</span> by{" "}
                    <a href="https://dedik2urniawan.github.io/" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-500 hover:text-indigo-600 transition-colors">DK</a>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// MAIN INDIVIDUAL ASSESSMENT PAGE
// ============================================================
export default function IndividualCalculatorPage() {
    const [lms, setLms] = useState<LmsReference | null>(null);
    const [lmsLoading, setLmsLoading] = useState(true);
    const [lmsError, setLmsError] = useState<string | null>(null);

    const [step, setStep] = useState(1);
    const [form, setForm] = useState<FormData>({
        namaLengkap: "",
        alamat: "",
        sex: "",
        tanggalLahir: "",
        tanggalUkur: new Date().toISOString().slice(0, 10),
        beratBadan: "",
        tinggiBadan: "",
        caraUkur: "recumbent",
    });
    const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
    const [result, setResult] = useState<FullAssessmentResult | null>(null);
    const [calculating, setCalculating] = useState(false);

    // Load LMS reference data on mount
    useEffect(() => {
        fetchLmsReference()
            .then((data) => { setLms(data); setLmsLoading(false); })
            .catch((err) => { setLmsError(err.message); setLmsLoading(false); });
    }, []);

    const updateForm = (field: keyof FormData, value: string | number) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const validateStep1 = (): boolean => {
        const errs: typeof errors = {};
        if (!form.sex) errs.sex = "Jenis kelamin wajib dipilih";
        if (!form.tanggalLahir) errs.tanggalLahir = "Tanggal lahir wajib diisi";
        if (!form.tanggalUkur) errs.tanggalUkur = "Tanggal pengukuran wajib diisi";
        if (form.tanggalLahir && form.tanggalUkur && new Date(form.tanggalLahir) > new Date(form.tanggalUkur)) {
            errs.tanggalLahir = "Tanggal lahir tidak boleh lebih dari tanggal pengukuran";
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const validateStep2 = (): boolean => {
        const errs: typeof errors = {};
        if (!form.beratBadan || parseFloat(form.beratBadan) <= 0) errs.beratBadan = "Berat badan wajib diisi (> 0 kg)";
        if (!form.tinggiBadan || parseFloat(form.tinggiBadan) <= 0) errs.tinggiBadan = "Tinggi badan wajib diisi (> 0 cm)";
        if (form.beratBadan && (parseFloat(form.beratBadan) < 1 || parseFloat(form.beratBadan) > 50)) errs.beratBadan = "Berat badan tidak wajar (1-50 kg)";
        if (form.tinggiBadan && (parseFloat(form.tinggiBadan) < 40 || parseFloat(form.tinggiBadan) > 130)) errs.tinggiBadan = "Tinggi badan tidak wajar (40-130 cm)";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleNextStep = () => {
        if (step === 1 && validateStep1()) setStep(2);
    };

    const handleCalculate = async () => {
        if (!validateStep2() || !lms || !form.sex) return;
        setCalculating(true);
        // small delay for UX
        await new Promise((r) => setTimeout(r, 400));
        try {
            const input: AssessmentInput = {
                birthDate: new Date(form.tanggalLahir),
                measureDate: new Date(form.tanggalUkur),
                sex: form.sex as SexCode,
                weightKg: parseFloat(form.beratBadan),
                heightCm: parseFloat(form.tinggiBadan),
                measurementMethod: form.caraUkur,
            };
            const res = calculateFullAssessment(input, lms);
            setResult(res);
        } catch (e) {
            console.error("Calculation error:", e);
        } finally {
            setCalculating(false);
        }
    };

    const handleReset = () => {
        setResult(null);
        setStep(1);
        setForm({
            namaLengkap: "",
            alamat: "",
            sex: "",
            tanggalLahir: "",
            tanggalUkur: new Date().toISOString().slice(0, 10),
            beratBadan: "",
            tinggiBadan: "",
            caraUkur: "recumbent",
        });
        setErrors({});
    };

    // ---- RENDER ----
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-emerald-50/20 font-display">
            {/* NAV */}
            <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-3">
                            <Link href="/" className="relative w-9 h-9 shadow-md rounded-xl overflow-hidden bg-white flex items-center justify-center border border-slate-100 p-1">
                                <Image src="/sigma_logo.png" alt="SIGMA Logo" fill className="object-contain" />
                            </Link>
                            <div>
                                <div className="font-extrabold text-sm text-slate-900 leading-none">SIGMA Calculator</div>
                                <div className="text-[9px] text-indigo-500 font-bold tracking-[0.2em] uppercase font-mono">Individual Assessment</div>
                            </div>
                        </div>
                        <Link
                            href="/calculator"
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors py-2 px-3 rounded-lg hover:bg-indigo-50"
                        >
                            <span className="material-icons-round text-sm">arrow_back</span>
                            Kembali
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="pt-16 pb-12 max-w-4xl mx-auto px-4 sm:px-6">
                {/* LMS Loading Banner */}
                {lmsLoading && (
                    <div className="mt-8 flex items-center justify-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                        <div>
                            <div className="text-sm font-bold text-slate-700">Memuat tabel referensi WHO LMS...</div>
                            <div className="text-xs text-slate-400 font-mono mt-0.5">Menghubungi PKMK-App Database</div>
                        </div>
                    </div>
                )}
                {lmsError && (
                    <div className="mt-8 bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                        <span className="material-icons-round text-red-500 text-3xl mb-2 block">wifi_off</span>
                        <div className="font-bold text-red-700 mb-1">Gagal memuat tabel referensi LMS</div>
                        <div className="text-sm text-red-600 font-mono">{lmsError}</div>
                        <button
                            onClick={() => { setLmsLoading(true); setLmsError(null); fetchLmsReference().then(setLms).catch((e) => setLmsError(e.message)).finally(() => setLmsLoading(false)); }}
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700"
                        >
                            Coba Lagi
                        </button>
                    </div>
                )}

                {!lmsLoading && !lmsError && lms && !result && (
                    <div className="mt-8">
                        {/* Page header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold tracking-widest uppercase font-mono mb-4">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                WHO ZScore · LMS Method
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                                Penilaian Status Gizi Individu
                            </h1>
                            <p className="text-slate-500 text-sm max-w-xl mx-auto">
                                Isi formulir berikut untuk menghitung ZScore BBU, TBU, BBTB beserta Growth Chart dan analisis Probable Stunting.
                            </p>
                        </div>

                        {/* Step Indicator */}
                        <div className="flex items-center justify-center gap-4 mb-8">
                            {[
                                { n: 1, label: "Data Individu" },
                                { n: 2, label: "Antropometri" },
                            ].map(({ n, label }, i) => (
                                <React.Fragment key={n}>
                                    {i > 0 && (
                                        <div className={`h-0.5 w-16 rounded-full transition-colors ${step > 1 ? "bg-indigo-400" : "bg-slate-200"}`} />
                                    )}
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step === n ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" :
                                                step > n ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                                                }`}
                                        >
                                            {step > n ? <span className="material-icons-round text-sm">check</span> : n}
                                        </div>
                                        <span className={`text-xs font-bold ${step === n ? "text-indigo-600" : "text-slate-400"}`}>{label}</span>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>

                        {/* FORM CARD */}
                        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/80 border border-slate-100 overflow-hidden">
                            {/* Step 1 */}
                            {step === 1 && (
                                <div className="p-8">
                                    <h2 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-2">
                                        <span className="material-icons-round text-indigo-500">person</span>
                                        Step 1: Data Individu
                                    </h2>
                                    <div className="space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {/* Nama */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                                                    Nama Lengkap <span className="text-slate-400 font-normal">(Opsional)</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={form.namaLengkap}
                                                    onChange={(e) => updateForm("namaLengkap", e.target.value)}
                                                    placeholder="Masukkan nama lengkap"
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all bg-slate-50 placeholder:text-slate-400"
                                                />
                                            </div>
                                            {/* Alamat */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                                                    Alamat <span className="text-slate-400 font-normal">(Opsional)</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={form.alamat}
                                                    onChange={(e) => updateForm("alamat", e.target.value)}
                                                    placeholder="Desa / Kecamatan"
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all bg-slate-50 placeholder:text-slate-400"
                                                />
                                            </div>
                                        </div>

                                        {/* Jenis Kelamin */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                                                Jenis Kelamin <span className="text-red-500">*</span>
                                            </label>
                                            <div className="flex gap-4">
                                                {[{ value: 1, label: "Laki-laki", icon: "male" }, { value: 2, label: "Perempuan", icon: "female" }].map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => updateForm("sex", opt.value)}
                                                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all ${form.sex === opt.value
                                                            ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                                                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                                            }`}
                                                    >
                                                        <span className="material-icons-round">{opt.icon}</span>
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                            {errors.sex && <p className="text-red-500 text-xs mt-1.5">{errors.sex}</p>}
                                        </div>

                                        {/* Dates */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                                                    Tanggal Lahir <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="date"
                                                    value={form.tanggalLahir}
                                                    onChange={(e) => updateForm("tanggalLahir", e.target.value)}
                                                    max={new Date().toISOString().slice(0, 10)}
                                                    className={`w-full px-4 py-3 rounded-xl border text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all bg-slate-50 ${errors.tanggalLahir ? "border-red-300 bg-red-50" : "border-slate-200"}`}
                                                />
                                                {errors.tanggalLahir && <p className="text-red-500 text-xs mt-1.5">{errors.tanggalLahir}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                                                    Tanggal Pengukuran <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="date"
                                                    value={form.tanggalUkur}
                                                    onChange={(e) => updateForm("tanggalUkur", e.target.value)}
                                                    max={new Date().toISOString().slice(0, 10)}
                                                    className={`w-full px-4 py-3 rounded-xl border text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all bg-slate-50 ${errors.tanggalUkur ? "border-red-300 bg-red-50" : "border-slate-200"}`}
                                                />
                                                {errors.tanggalUkur && <p className="text-red-500 text-xs mt-1.5">{errors.tanggalUkur}</p>}
                                            </div>
                                        </div>

                                        {/* Age preview */}
                                        {form.tanggalLahir && form.tanggalUkur && new Date(form.tanggalLahir) <= new Date(form.tanggalUkur) && (
                                            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium">
                                                <span className="material-icons-round text-base">info</span>
                                                Usia terkalkulasi:{" "}
                                                <strong>
                                                    {formatAge(Math.floor((new Date(form.tanggalUkur).getTime() - new Date(form.tanggalLahir).getTime()) / (1000 * 60 * 60 * 24 * 30.4375)))}
                                                </strong>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end mt-8">
                                        <button
                                            onClick={handleNextStep}
                                            className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
                                        >
                                            Selanjutnya
                                            <span className="material-icons-round text-base">arrow_forward</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2 */}
                            {step === 2 && (
                                <div className="p-8">
                                    <h2 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-2">
                                        <span className="material-icons-round text-emerald-500">straighten</span>
                                        Step 2: Data Antropometri
                                    </h2>

                                    <div className="space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {/* Berat Badan */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                                                    Berat Badan <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        min="1"
                                                        max="50"
                                                        value={form.beratBadan}
                                                        onChange={(e) => updateForm("beratBadan", e.target.value)}
                                                        placeholder="0.0"
                                                        className={`w-full px-4 py-3 rounded-xl border text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition-all bg-slate-50 pr-16 ${errors.beratBadan ? "border-red-300 bg-red-50" : "border-slate-200"}`}
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">kg</span>
                                                </div>
                                                {errors.beratBadan && <p className="text-red-500 text-xs mt-1.5">{errors.beratBadan}</p>}
                                            </div>

                                            {/* Tinggi Badan */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                                                    Tinggi / Panjang Badan <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        min="40"
                                                        max="130"
                                                        value={form.tinggiBadan}
                                                        onChange={(e) => updateForm("tinggiBadan", e.target.value)}
                                                        placeholder="0.0"
                                                        className={`w-full px-4 py-3 rounded-xl border text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 transition-all bg-slate-50 pr-16 ${errors.tinggiBadan ? "border-red-300 bg-red-50" : "border-slate-200"}`}
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">cm</span>
                                                </div>
                                                {errors.tinggiBadan && <p className="text-red-500 text-xs mt-1.5">{errors.tinggiBadan}</p>}
                                            </div>
                                        </div>

                                        {/* Cara Ukur */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                                                Cara Pengukuran Tinggi/Panjang Badan
                                            </label>
                                            <div className="flex gap-4">
                                                {[
                                                    { value: "recumbent", label: "Terlentang (Panjang Badan)", sub: "Untuk usia < 24 bulan", icon: "airline_seat_flat" },
                                                    { value: "standing", label: "Berdiri (Tinggi Badan)", sub: "Untuk usia ≥ 24 bulan", icon: "accessibility_new" },
                                                ].map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => updateForm("caraUkur", opt.value)}
                                                        className={`flex-1 flex flex-col items-center gap-1 py-3 px-3 rounded-xl border-2 text-xs font-bold transition-all ${form.caraUkur === opt.value
                                                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                                            }`}
                                                    >
                                                        <span className="material-icons-round text-xl">{opt.icon}</span>
                                                        <span>{opt.label}</span>
                                                        <span className="font-normal text-slate-400 text-[10px]">{opt.sub}</span>
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Correction notice */}
                                            {form.tinggiBadan && form.tanggalLahir && form.tanggalUkur && (
                                                (() => {
                                                    const ageM = Math.floor((new Date(form.tanggalUkur).getTime() - new Date(form.tanggalLahir).getTime()) / (1000 * 60 * 60 * 24 * 30.4375));
                                                    const shouldBeLying = ageM < 24;
                                                    const isLying = form.caraUkur === "recumbent";
                                                    const needsCorrection = (shouldBeLying && !isLying) || (!shouldBeLying && isLying);
                                                    const correctionVal = shouldBeLying && !isLying ? "+0.7" : "-0.7";
                                                    if (!needsCorrection) return null;
                                                    return (
                                                        <div className="mt-3 flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                                                            <span className="material-icons-round text-sm flex-shrink-0">info</span>
                                                            <span>
                                                                <strong>Koreksi WHO akan diterapkan:</strong> Usia {ageM} bulan, seharusnya diukur {shouldBeLying ? "terlentang" : "berdiri"}. Tinggi badan akan dikoreksi <strong>{correctionVal} cm</strong> secara otomatis untuk akurasi ZScore.
                                                            </span>
                                                        </div>
                                                    );
                                                })()
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-between mt-8">
                                        <button
                                            onClick={() => setStep(1)}
                                            className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2"
                                        >
                                            <span className="material-icons-round text-base">arrow_back</span>
                                            Kembali
                                        </button>
                                        <button
                                            onClick={handleCalculate}
                                            disabled={calculating}
                                            className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {calculating ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                                    Menghitung...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-icons-round text-base">calculate</span>
                                                    Hitung Sekarang
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* WHO Reference note */}
                        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                            <span className="material-icons-round text-sm text-blue-400">lock</span>
                            Data tidak disimpan · Referensi WHO Child Growth Standards 2006
                        </div>
                    </div>
                )}

                {/* RESULTS */}
                {!lmsLoading && !lmsError && lms && result && (
                    <div className="mt-8">
                        <ResultsPanel result={result} form={form} lms={lms} onReset={handleReset} />
                    </div>
                )}
            </main>
        </div>
    );
}
