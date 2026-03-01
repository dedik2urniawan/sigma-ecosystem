"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RcTip, Legend,
    ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    ReferenceLine, Cell
} from "recharts";
import * as xlsx from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { fetchFctReferenceData, TkpiIngredient, AkgReference } from "../../../lib/supabase-fct";
import {
    FctIngredientInput, calculateFctRows, aggregateMenus,
    getTotalAsupan, computeGap, narrateGap, AKG_COLS_KEYS
} from "../../../lib/fct-calculator";

// ─── Nutrient color config ─────────────────────────────────────────
const NUTRI_LABELS: Record<string, { label: string; unit: string; color: string }> = {
    energi: { label: "Energi", unit: "kal", color: "#f59e0b" },
    protein: { label: "Protein", unit: "g", color: "#6366f1" },
    lemak: { label: "Lemak", unit: "g", color: "#f97316" },
    kh: { label: "Karbohidrat", unit: "g", color: "#14b8a6" },
    air: { label: "Air", unit: "g", color: "#38bdf8" },
    vit_c: { label: "Vitamin C", unit: "mg", color: "#a3e635" },
    kalsium: { label: "Kalsium", unit: "mg", color: "#e879f9" },
    besi: { label: "Zat Besi", unit: "mg", color: "#fb7185" },
    seng: { label: "Seng", unit: "mg", color: "#34d399" },
};
const METODE_OPTS = ["segar", "direbus", "tumis", "digoreng", "panggang"];

// ─── Small utility ─────────────────────────────────────────────────
function pctColor(pct: number | null) {
    if (pct === null) return "text-slate-400";
    if (pct < 70) return "text-red-600";
    if (pct < 90) return "text-orange-500";
    if (pct <= 120) return "text-emerald-600";
    return "text-blue-600";
}
function pctBarColor(pct: number | null) {
    if (pct === null) return "#cbd5e1";
    if (pct < 70) return "#ef4444";
    if (pct < 90) return "#f97316";
    if (pct <= 120) return "#10b981";
    return "#3b82f6";
}

// ─── EDIT MODAL ────────────────────────────────────────────────────
function EditModal({
    row, menus, tkpiList, onSave, onClose
}: {
    row: FctIngredientInput;
    menus: string[];
    tkpiList: TkpiIngredient[];
    onSave: (updated: FctIngredientInput) => void;
    onClose: () => void;
}) {
    const [selMenu, setSelMenu] = useState(row.menuName);
    const [bahanId, setBahanId] = useState(row.bahanId);
    const [berat, setBerat] = useState(row.beratInput);
    const [unit, setUnit] = useState<"g" | "kg">(row.unit);
    const [metode, setMetode] = useState(row.metode);
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        const kw = search.toLowerCase();
        return kw ? tkpiList.filter(t => t.nama_bahan_mentah.toLowerCase().includes(kw)) : tkpiList;
    }, [tkpiList, search]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="material-icons-round">edit</span>
                        <h2 className="font-bold text-base">Edit Bahan</h2>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition">
                        <span className="material-icons-round text-sm">close</span>
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    {/* Menu Target */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Menu Tujuan</label>
                        <select value={selMenu} onChange={e => setSelMenu(e.target.value)} className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500">
                            {menus.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    {/* Bahan */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Ganti Bahan TKPI</label>
                        <input type="text" placeholder="Cari bahan..." value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full text-sm bg-white border border-slate-200 rounded-xl px-4 py-2 mb-1 focus:outline-none focus:border-indigo-500" />
                        <select value={bahanId} onChange={e => setBahanId(Number(e.target.value))} size={4}
                            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500">
                            {filtered.map(t => <option key={t.id} value={t.id}>{t.nama_bahan_mentah}</option>)}
                        </select>
                    </div>
                    {/* Berat + Metode */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">Berat</label>
                            <div className="flex gap-2">
                                <input type="number" min="0" step="10" value={berat} onChange={e => setBerat(Number(e.target.value))}
                                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500" />
                                <select value={unit} onChange={e => setUnit(e.target.value as "g" | "kg")}
                                    className="w-20 text-sm bg-slate-50 border border-slate-200 rounded-xl px-2 focus:outline-none focus:border-indigo-500">
                                    <option value="g">g</option>
                                    <option value="kg">kg</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">Metode Masak</label>
                            <select value={metode} onChange={e => setMetode(e.target.value)}
                                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500">
                                {METODE_OPTS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Batal</button>
                        <button onClick={() => onSave({ ...row, menuName: selMenu, bahanId, beratInput: berat, unit, metode })}
                            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-200">
                            Simpan Perubahan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────
export default function FctCalculatorPage() {
    const [tkpiList, setTkpiList] = useState<TkpiIngredient[]>([]);
    const [yieldFactors, setYieldFactors] = useState<any[]>([]);
    const [retentionFactors, setRetentionFactors] = useState<any[]>([]);
    const [akgRefs, setAkgRefs] = useState<AkgReference[]>([]);
    const [loadingDb, setLoadingDb] = useState(true);

    const [menus, setMenus] = useState<string[]>([]);
    const [rows, setRows] = useState<FctIngredientInput[]>([]);

    // Form Add Ingredient
    const [newMenuName, setNewMenuName] = useState("");
    const [selMenu, setSelMenu] = useState("");
    const [selBahanId, setSelBahanId] = useState<number | "">("");
    const [beratInput, setBeratInput] = useState(100);
    const [unit, setUnit] = useState<"g" | "kg">("g");
    const [metode, setMetode] = useState("segar");
    const [searchTerm, setSearchTerm] = useState("");

    // Edit Modal
    const [editingRow, setEditingRow] = useState<FctIngredientInput | null>(null);

    // AKG
    const [akgMode, setAkgMode] = useState<"menu" | "manual">("menu");
    const [manualAsupan, setManualAsupan] = useState<Record<string, number>>({ energi: 2000, protein: 65, lemak_total: 70, omega3: 1.2, omega6: 12, karbohidrat: 300, serat: 28, air: 1800 });
    const [targetGroup, setTargetGroup] = useState("");
    const [radarGroups, setRadarGroups] = useState<string[]>([]);

    // Active menu tab for detail
    const [activeMenuTab, setActiveMenuTab] = useState<string>("");

    // Computed
    const calculatedRows = useMemo(() => {
        if (!tkpiList.length) return [];
        try { return calculateFctRows(rows, tkpiList, yieldFactors, retentionFactors); }
        catch { return []; }
    }, [rows, tkpiList, yieldFactors, retentionFactors]);

    const aggregatedMenus = useMemo(() => aggregateMenus(calculatedRows), [calculatedRows]);

    const finalAsupan = useMemo(() => {
        if (akgMode === "manual") return manualAsupan;
        return getTotalAsupan(aggregatedMenus, null);
    }, [akgMode, manualAsupan, aggregatedMenus]);

    const gapData = useMemo(() => {
        const ref = akgRefs.find(r => r.kelompok === targetGroup);
        if (!ref) return [];
        return computeGap(finalAsupan, ref);
    }, [finalAsupan, akgRefs, targetGroup]);

    const aiNarration = useMemo(() => narrateGap(gapData, targetGroup), [gapData, targetGroup]);

    const filteredTkpi = useMemo(() => {
        if (!searchTerm) return tkpiList;
        const kw = searchTerm.toLowerCase();
        return tkpiList.filter(t => t.nama_bahan_mentah.toLowerCase().includes(kw));
    }, [tkpiList, searchTerm]);

    useEffect(() => {
        fetchFctReferenceData().then(data => {
            setTkpiList(data.tkpi);
            setYieldFactors(data.yieldFactors);
            setRetentionFactors(data.retentionFactors);
            setAkgRefs(data.akgRefs);
            if (data.tkpi.length > 0) setSelBahanId(data.tkpi[0].id);
            if (data.akgRefs.length > 0) {
                setTargetGroup(data.akgRefs[1]?.kelompok || data.akgRefs[0].kelompok);
                setRadarGroups(data.akgRefs.slice(0, 3).map(r => r.kelompok));
            }
            setLoadingDb(false);
        });
    }, []);

    const handleAddMenu = () => {
        const name = newMenuName.trim();
        if (name && !menus.includes(name)) {
            setMenus(p => [...p, name]);
            if (!selMenu) setSelMenu(name);
            if (!activeMenuTab) setActiveMenuTab(name);
            setNewMenuName("");
        }
    };

    const handleRemoveMenu = (name: string) => {
        setMenus(p => p.filter(m => m !== name));
        setRows(p => p.filter(r => r.menuName !== name));
        if (selMenu === name) setSelMenu("");
        if (activeMenuTab === name) setActiveMenuTab(menus.find(m => m !== name) || "");
    };

    const handleAddIngredient = () => {
        if (!selMenu) { alert("Pilih Menu terlebih dahulu."); return; }
        if (!selBahanId) { alert("Pilih Bahan TKPI."); return; }
        const newItem: FctIngredientInput = {
            id: Date.now().toString() + Math.random().toString(36).substring(7),
            menuName: selMenu, bahanId: Number(selBahanId),
            beratInput: Number(beratInput), unit, metode
        };
        setRows(p => [...p, newItem]);
    };

    const handleSaveEdit = (updated: FctIngredientInput) => {
        setRows(p => p.map(r => r.id === updated.id ? updated : r));
        setEditingRow(null);
    };

    const handleExportExcel = useCallback(() => {
        const wb = xlsx.utils.book_new();
        const inputData = rows.map(r => ({
            "Menu": r.menuName,
            "Bahan": tkpiList.find(t => t.id === r.bahanId)?.nama_bahan_mentah || r.bahanId,
            "Berat": r.beratInput, "Unit": r.unit, "Metode": r.metode
        }));
        xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(inputData), "Input");
        const bahanData = calculatedRows.map(r => {
            const obj: any = { Menu: r.menuName, Bahan: r.bahanNama, Metode: r.metode, "Berat In (g)": r.beratInputG, "BDD (%)": r.bddPct, "Berat Akhir (g)": r.beratAkhirG };
            Object.entries(r.nutrien).forEach(([k, v]) => obj[k] = v);
            return obj;
        });
        xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(bahanData), "Per Bahan");
        const menuData = aggregatedMenus.map(m => { const o: any = { Menu: m.menuName }; Object.entries(m.nutrien).forEach(([k, v]) => o[k] = v); return o; });
        xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(menuData), "Per Menu");
        const akgSheet = gapData.map(g => ({ Nutrien: g.nutrien, Asupan: g.asupan, "Target AKG": g.target, "Pencapaian (%)": g.pencapaianPct?.toFixed(1), Gap: g.gap?.toFixed(2) }));
        xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(akgSheet), "Analisis AKG");
        xlsx.writeFile(wb, "Hasil_FCT_TKPI.xlsx");
    }, [rows, calculatedRows, aggregatedMenus, gapData, tkpiList]);

    const handleExportPdf = useCallback(() => {
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" }) as any;
        const W = doc.internal.pageSize.getWidth();
        const now = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

        // ── Cover ──────────────────────────────────────────────────
        doc.setFillColor(234, 88, 12); // orange-600
        doc.rect(0, 0, W, 45, "F");
        doc.setFillColor(220, 38, 38); // rose strip
        doc.rect(0, 38, W, 7, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.text("Laporan Analisis FCT & AKG", 14, 20);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("FCT Calculator SIGMA — Berbasis TKPI 2017 & AKG Kemenkes 2019", 14, 30);
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(8);
        doc.text(`Digenerate: ${now}   |   Kelompok Sasaran: ${targetGroup || "-"}   |   Total Menu: ${aggregatedMenus.length}   |   Total Bahan: ${rows.length}`, 14, 55);

        // ── Section helper ─────────────────────────────────────────
        const section = (title: string, y: number, icon?: string) => {
            doc.setFillColor(241, 245, 249); // slate-100
            doc.roundedRect(10, y, W - 20, 8, 2, 2, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(30, 41, 59);
            doc.text((icon ? icon + "  " : "") + title, 14, y + 5.5);
            return y + 12;
        };

        let y = 62;

        // 1 — Metodologi
        y = section("Metodologi Perhitungan", y, "\u25A6");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const methText = [
            "Nilai gizi dihitung menggunakan rumus: Nilai Gizi = (Berat Input \u00F7 100) \u00D7 (BDD/100) \u00D7 Yield Factor \u00D7 Retention Factor \u00D7 Kadar Nutrisi per 100g",
            "BDD (Bagian Dapat Dimakan): proporsi bahan yang layak konsumsi dari TKPI 2017.",
            "Yield Factor: rasio perubahan berat setelah pemasakan (direbus \u22480.87, digoreng \u22480.80, segar=1.0).",
            "Retention Factor: proporsi nutrisi yang bertahan setelah proses panas.",
        ];
        methText.forEach(line => {
            const split = doc.splitTextToSize(line, W - 28);
            doc.text(split, 14, y);
            y += split.length * 4.5;
        });
        y += 4;

        // 2 — Per Bahan
        y = section("Detail Komposisi Bahan Makanan", y, "\u25B6");
        autoTable(doc, {
            startY: y,
            margin: { left: 10, right: 10 },
            styles: { fontSize: 7, cellPadding: 2, lineColor: [226, 232, 240], lineWidth: 0.2 },
            headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: "bold", fontSize: 7 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            head: [["Menu", "Bahan Mentah", "Metode", "Berat In (g)", "BDD(%)", "Berat Akhir", "Energi", "Protein", "Lemak", "KH"]],
            body: calculatedRows.map(r => [
                r.menuName, r.bahanNama, r.metode,
                r.beratInputG, r.bddPct?.toFixed(0) ?? "-", r.beratAkhirG.toFixed(1) + "g",
                (r.nutrien.energi || 0).toFixed(0) + " kal",
                (r.nutrien.protein || 0).toFixed(1) + "g",
                (r.nutrien.lemak || 0).toFixed(1) + "g",
                (r.nutrien.kh || 0).toFixed(1) + "g",
            ]),
        });
        y = (doc as any).lastAutoTable.finalY + 8;

        // 3 — Per Menu
        y = section("Rekap Nutrisi Per Menu", y, "\u25B6");
        autoTable(doc, {
            startY: y,
            margin: { left: 10, right: 10 },
            styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: [226, 232, 240], lineWidth: 0.2 },
            headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: "bold" },
            alternateRowStyles: { fillColor: [255, 251, 235] },
            head: [["Menu", "Energi (kal)", "Protein (g)", "Lemak (g)", "KH (g)", "Air (g)", "Vit.C (mg)", "Kalsium (mg)", "Besi (mg)", "Seng (mg)"]],
            body: [
                ...aggregatedMenus.map(m => [
                    m.menuName,
                    (m.nutrien.energi || 0).toFixed(0), (m.nutrien.protein || 0).toFixed(1),
                    (m.nutrien.lemak || 0).toFixed(1), (m.nutrien.kh || 0).toFixed(1),
                    (m.nutrien.air || 0).toFixed(1), (m.nutrien.vit_c || 0).toFixed(1),
                    (m.nutrien.kalsium || 0).toFixed(1), (m.nutrien.besi || 0).toFixed(1),
                    (m.nutrien.seng || 0).toFixed(1),
                ]),
                // ALL total row
                (() => {
                    const tot: Record<string, number> = {};
                    aggregatedMenus.forEach(m => Object.entries(m.nutrien).forEach(([k, v]) => { tot[k] = (tot[k] || 0) + v; }));
                    return ["TOTAL SEMUA MENU",
                        (tot.energi || 0).toFixed(0), (tot.protein || 0).toFixed(1),
                        (tot.lemak || 0).toFixed(1), (tot.kh || 0).toFixed(1),
                        (tot.air || 0).toFixed(1), (tot.vit_c || 0).toFixed(1),
                        (tot.kalsium || 0).toFixed(1), (tot.besi || 0).toFixed(1),
                        (tot.seng || 0).toFixed(1),
                    ];
                })(),
            ],
            didParseCell: (data: any) => {
                if (data.row.index === aggregatedMenus.length && data.section === "body") {
                    data.cell.styles.fontStyle = "bold";
                    data.cell.styles.fillColor = [30, 41, 59];
                    data.cell.styles.textColor = [255, 255, 255];
                }
            },
        });
        y = (doc as any).lastAutoTable.finalY + 8;

        // 4 — AKG Gap
        if (gapData.length > 0) {
            y = section(`Analisis Pemenuhan AKG — ${targetGroup}`, y, "\u25B6");
            autoTable(doc, {
                startY: y,
                margin: { left: 10, right: 10 },
                styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: [226, 232, 240], lineWidth: 0.2 },
                headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: "bold" },
                head: [["Nutrien", "Asupan", "Target AKG", "% Pemenuhan", "Gap", "Status"]],
                body: gapData.filter(g => g.pencapaianPct !== null).map(g => [
                    g.nutrien,
                    g.asupan.toFixed(1),
                    g.target?.toFixed(1) ?? "-",
                    (g.pencapaianPct as number).toFixed(1) + "%",
                    (g.gap ?? 0) > 0 ? "+" + (g.gap as number).toFixed(2) : (g.gap as number)?.toFixed(2),
                    (g.pencapaianPct as number) < 70 ? "Defisit" :
                        (g.pencapaianPct as number) < 90 ? "Kurang" :
                            (g.pencapaianPct as number) <= 120 ? "Memadai" : "Surplus",
                ]),
                didParseCell: (data: any) => {
                    if (data.section === "body" && data.column.index === 5) {
                        const v = data.cell.raw as string;
                        if (v === "Defisit") { data.cell.styles.textColor = [220, 38, 38]; data.cell.styles.fontStyle = "bold"; }
                        else if (v === "Kurang") { data.cell.styles.textColor = [234, 88, 12]; data.cell.styles.fontStyle = "bold"; }
                        else if (v === "Memadai") { data.cell.styles.textColor = [5, 150, 105]; data.cell.styles.fontStyle = "bold"; }
                        else if (v === "Surplus") { data.cell.styles.textColor = [37, 99, 235]; data.cell.styles.fontStyle = "bold"; }
                    }
                },
            });
            y = (doc as any).lastAutoTable.finalY + 8;
        }

        // 5 — SIGMA Advisor Narration
        y = section("SIGMA Advisor — Analisis & Rekomendasi", y, "\u2605");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        const narLines = aiNarration.replace(/\*\*/g, "").split("\n").filter(Boolean);
        narLines.forEach(line => {
            if (y > 270) { doc.addPage(); y = 20; }
            const split = doc.splitTextToSize(line, W - 28);
            if (line.startsWith("Ringkasan") || line.startsWith("Rekomendasi")) {
                doc.setFont("helvetica", "bold");
                doc.setTextColor(79, 70, 229);
            } else {
                doc.setFont("helvetica", "normal");
                doc.setTextColor(51, 65, 85);
            }
            doc.text(split, 14, y);
            y += split.length * 4.8;
        });

        // ── Footer on all pages ─────────────────────────────────────
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text("SIGMA FCT Calculator | TKPI 2017 | AKG Kemenkes 2019", 14, 292);
            doc.text(`Hal ${i} / ${totalPages}`, W - 20, 292, { align: "right" });
        }

        doc.save(`Laporan_FCT_${targetGroup.replace(/[^a-zA-Z0-9]/g, "_")}_${now.replace(/ /g, "_")}.pdf`);
    }, [calculatedRows, aggregatedMenus, gapData, aiNarration, targetGroup, rows.length]);

    if (loadingDb) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-xl shadow-rose-200 animate-pulse">
                <span className="material-icons-round text-white text-2xl">restaurant_menu</span>
            </div>
            <p className="text-slate-500 font-semibold text-sm">Memuat Database TKPI & AKG...</p>
            <div className="flex gap-1.5">
                {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
        </div>
    );

    const activeMenuCalc = aggregatedMenus.find(m => m.menuName === activeMenuTab);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-50 pb-20">
            {/* ── Header ─────────────────────────── */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/calculator" className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition">
                            <span className="material-icons-round text-sm">arrow_back</span>
                        </Link>
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-md shadow-orange-200">
                            <span className="material-icons-round text-white text-lg">restaurant_menu</span>
                        </div>
                        <div>
                            <h1 className="font-extrabold text-slate-800 text-sm leading-tight">FCT & AKG Calculator</h1>
                            <p className="text-[10px] text-slate-400 font-medium tracking-wide">TKPI 2017 · {tkpiList.length} Bahan Pangan</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleExportPdf} disabled={rows.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-rose-200">
                            <span className="material-icons-round text-sm">picture_as_pdf</span>
                            <span className="hidden sm:inline">Export PDF</span>
                        </button>
                        <button onClick={handleExportExcel} disabled={rows.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-200">
                            <span className="material-icons-round text-sm">download</span>
                            <span className="hidden sm:inline">Export Excel</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">

                {/* ── Methodology Description ────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left: About card */}
                    <div className="lg:col-span-1 bg-gradient-to-br from-orange-500 to-rose-600 rounded-2xl p-5 text-white shadow-lg shadow-orange-200/50 relative overflow-hidden">
                        <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="material-icons-round text-xl">restaurant_menu</span>
                                <h2 className="font-extrabold text-base">FCT Calculator</h2>
                            </div>
                            <p className="text-orange-100 text-xs leading-relaxed">
                                Kalkulator komposisi pangan berbasis <strong>TKPI 2017</strong> (Tabel Komposisi Pangan Indonesia). Menghitung nilai gizi bahan makanan secara akurat dengan mempertimbangkan proses pengolahan.
                            </p>
                            <div className="flex gap-2 mt-4 flex-wrap">
                                <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">{tkpiList.length} Bahan</span>
                                <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">{yieldFactors.length} Yield Methods</span>
                                <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">AKG 2019</span>
                            </div>
                        </div>
                    </div>
                    {/* Right: Pipeline */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Alur Perhitungan Nutrisi</p>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {[
                                { icon: "scale", label: "Berat Input", sub: "gram / kg", color: "bg-slate-100 text-slate-600" },
                                { icon: "arrow_forward", label: "", sub: "", color: "" },
                                { icon: "content_cut", label: "BDD (%)", sub: "Edible Portion", color: "bg-amber-50 text-amber-700" },
                                { icon: "arrow_forward", label: "", sub: "", color: "" },
                                { icon: "local_fire_department", label: "Yield Faktor", sub: "Susut Masak", color: "bg-orange-50 text-orange-700" },
                                { icon: "arrow_forward", label: "", sub: "", color: "" },
                                { icon: "opacity", label: "Retensi Gizi", sub: "Degradasi Panas", color: "bg-rose-50 text-rose-700" },
                                { icon: "arrow_forward", label: "", sub: "", color: "" },
                                { icon: "pie_chart", label: "Nilai Gizi Akhir", sub: "Per Porsi", color: "bg-indigo-50 text-indigo-700" },
                            ].map((s, i) => s.icon === "arrow_forward"
                                ? <span key={i} className="material-icons-round text-slate-300 text-xl shrink-0">arrow_forward</span>
                                : <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl shrink-0 ${s.color}`}>
                                    <span className="material-icons-round text-base">{s.icon}</span>
                                    <div><p className="text-xs font-bold leading-tight">{s.label}</p><p className="text-[10px] opacity-70">{s.sub}</p></div>
                                </div>
                            )}
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-3 text-[11px]">
                            <div className="bg-amber-50 rounded-lg p-2.5">
                                <p className="font-bold text-amber-700">BDD (Bagian Dapat Dimakan)</p>
                                <p className="text-amber-600 mt-0.5">% bagian bahan yang dapat dikonsumsi. Misal: Ayam BDD 58% = hanya 58g dari 100g yang dihitung.</p>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-2.5">
                                <p className="font-bold text-orange-700">Yield Factor</p>
                                <p className="text-orange-600 mt-0.5">Rasio perubahan berat setelah pemasakan. Direbus ≈ 0.87, Digoreng ≈ 0.80, Segar = 1.0.</p>
                            </div>
                            <div className="bg-rose-50 rounded-lg p-2.5">
                                <p className="font-bold text-rose-700">Retensi Gizi</p>
                                <p className="text-rose-600 mt-0.5">% nutrisi yang bertahan setelah proses panas. Vitamin C sangat sensitif panas (retensi ~50%).</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Two-column layout ──────────────*/}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                    {/* LEFT: Input Panel */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Step 1: Menu */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center">1</div>
                                <h2 className="font-bold text-slate-800 text-sm">Buat Menu / Resep</h2>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="flex gap-2">
                                    <input type="text" placeholder="Nama Menu (mis: Capcay, Ayam Goreng)"
                                        className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        value={newMenuName} onChange={e => setNewMenuName(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && handleAddMenu()} />
                                    <button onClick={handleAddMenu} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-200">+</button>
                                </div>
                                {menus.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {menus.map(m => (
                                            <button key={m} onClick={() => { setSelMenu(m); setActiveMenuTab(m); }}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${selMenu === m ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200" : "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100"}`}>
                                                <span className="material-icons-round text-[13px]">restaurant</span>
                                                {m}
                                                <span onClick={e => { e.stopPropagation(); handleRemoveMenu(m); }}
                                                    className="material-icons-round text-[13px] opacity-60 hover:opacity-100 ml-0.5">close</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Step 2: Bahan */}
                        <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${menus.length > 0 ? "border-emerald-200 ring-1 ring-emerald-500/20" : "border-slate-100 opacity-50 pointer-events-none"}`}>
                            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center justify-center">2</div>
                                <h2 className="font-bold text-slate-800 text-sm">Masukkan Bahan TKPI</h2>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Menu Tujuan</label>
                                    <select value={selMenu} onChange={e => setSelMenu(e.target.value)}
                                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500">
                                        <option value="" disabled>-- Pilih Menu --</option>
                                        {menus.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1 relative">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cari Bahan TKPI</label>
                                    <div className="relative">
                                        <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                                        <input type="text" placeholder="Ketik nama bahan (mis: Ayam, Beras)..."
                                            className="w-full text-sm bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                        {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            <span className="material-icons-round text-base">close</span></button>}
                                    </div>
                                    {/* Custom list */}
                                    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
                                        <div className="max-h-[180px] overflow-y-auto divide-y divide-slate-50">
                                            {filteredTkpi.slice(0, 100).map(t => (
                                                <button key={t.id} type="button"
                                                    onClick={() => setSelBahanId(t.id)}
                                                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${selBahanId === t.id
                                                        ? "bg-emerald-600 text-white font-bold"
                                                        : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                                                        }`}>
                                                    <span className="line-clamp-1">{t.nama_bahan_mentah}</span>
                                                </button>
                                            ))}
                                            {filteredTkpi.length === 0 && <p className="px-3 py-4 text-xs text-slate-400 text-center">Bahan tidak ditemukan</p>}
                                        </div>
                                        {selBahanId && (
                                            <div className="border-t border-slate-100 bg-emerald-50 px-3 py-2 flex items-center gap-2">
                                                <span className="material-icons-round text-emerald-600 text-base">check_circle</span>
                                                <span className="text-xs font-bold text-emerald-800 truncate">{tkpiList.find(t => t.id === selBahanId)?.nama_bahan_mentah}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Berat</label>
                                        <div className="flex gap-1.5">
                                            <input type="number" min="0" step="10" value={beratInput} onChange={e => setBeratInput(Number(e.target.value))}
                                                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500" />
                                            <select value={unit} onChange={e => setUnit(e.target.value as "g" | "kg")}
                                                className="w-16 text-sm bg-slate-50 border border-slate-200 rounded-xl px-1.5 focus:outline-none focus:border-emerald-500">
                                                <option value="g">g</option>
                                                <option value="kg">kg</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metode Masak</label>
                                        <select value={metode} onChange={e => setMetode(e.target.value)}
                                            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500">
                                            {METODE_OPTS.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <button onClick={handleAddIngredient}
                                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-bold hover:from-emerald-600 hover:to-teal-700 transition shadow-md shadow-emerald-200 flex items-center justify-center gap-2">
                                    <span className="material-icons-round text-base">add_circle</span>
                                    Tambahkan ke Menu
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Ingredient Table + Menu Detail */}
                    <div className="lg:col-span-3 space-y-5">

                        {/* Ingredient List Table */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-6 h-6 rounded-lg bg-amber-500 text-white text-xs font-black flex items-center justify-center">3</div>
                                    <h2 className="font-bold text-slate-800 text-sm">Daftar Bahan & Nutrisi</h2>
                                </div>
                                <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2.5 py-1 rounded-lg">{rows.length} item</span>
                            </div>
                            {rows.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-14 text-slate-300">
                                    <span className="material-icons-round text-5xl mb-3">no_meals</span>
                                    <p className="text-sm font-medium text-slate-400">Belum ada bahan yang dimasukkan</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                                    <table className="w-full text-xs whitespace-nowrap">
                                        <thead className="bg-slate-50 sticky top-0 border-b border-slate-100">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-bold text-slate-500">Aksi</th>
                                                <th className="px-4 py-3 text-left font-bold text-slate-500">Menu</th>
                                                <th className="px-4 py-3 text-left font-bold text-slate-500">Bahan Mentah</th>
                                                <th className="px-4 py-3 text-left font-bold text-slate-500">Metode</th>
                                                <th className="px-4 py-3 text-left font-bold text-slate-500">Berat In</th>
                                                <th className="px-4 py-3 text-left font-bold text-amber-600">Berat Akhir</th>
                                                <th className="px-4 py-3 text-left font-bold text-indigo-600">Energi</th>
                                                <th className="px-4 py-3 text-left font-bold text-indigo-600">Protein</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {calculatedRows.map(r => (
                                                <tr key={r.id} className="hover:bg-slate-50/80 group transition-colors">
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex gap-1">
                                                            <button onClick={() => { const src = rows.find(x => x.id === r.id); if (src) setEditingRow(src); }}
                                                                className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition"
                                                                title="Edit">
                                                                <span className="material-icons-round text-[14px]">edit</span>
                                                            </button>
                                                            <button onClick={() => setRows(p => p.filter(x => x.id !== r.id))}
                                                                className="w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition"
                                                                title="Hapus">
                                                                <span className="material-icons-round text-[14px]">delete</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5 font-semibold text-slate-700">{r.menuName}</td>
                                                    <td className="px-4 py-2.5 text-slate-600 max-w-[160px] truncate">{r.bahanNama}</td>
                                                    <td className="px-4 py-2.5">
                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-bold text-[10px] uppercase tracking-widest">{r.metode}</span>
                                                    </td>
                                                    <td className="px-4 py-2.5 font-mono text-slate-500">{r.beratInputG}g</td>
                                                    <td className="px-4 py-2.5 font-mono font-bold text-amber-600">{r.beratAkhirG.toFixed(1)}g</td>
                                                    <td className="px-4 py-2.5 font-mono font-bold text-indigo-600">{(r.nutrien.energi || 0).toFixed(0)}</td>
                                                    <td className="px-4 py-2.5 font-mono font-bold text-violet-600">{(r.nutrien.protein || 0).toFixed(1)}g</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Menu Nutrient Detail Tabs — dengan tab ALL */}
                        {aggregatedMenus.length > 0 && (() => {
                            // Hitung ALL summary
                            const allNutrien: Record<string, number> = {};
                            aggregatedMenus.forEach(m => Object.entries(m.nutrien).forEach(([k, v]) => { allNutrien[k] = (allNutrien[k] || 0) + v; }));
                            const displayNutrien = activeMenuTab === "__ALL__" ? allNutrien : (aggregatedMenus.find(m => m.menuName === activeMenuTab)?.nutrien || {});
                            return (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                                        <h2 className="font-bold text-slate-800 text-sm">Rekap Nutrisi Per Menu</h2>
                                        <div className="flex gap-1 flex-wrap">
                                            {/* ALL tab */}
                                            <button onClick={() => setActiveMenuTab("__ALL__")}
                                                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeMenuTab === "__ALL__" ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                    }`}>
                                                <span className="material-icons-round text-[12px]">layers</span>
                                                Semua Menu
                                            </button>
                                            {aggregatedMenus.map(m => (
                                                <button key={m.menuName} onClick={() => setActiveMenuTab(m.menuName)}
                                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeMenuTab === m.menuName ? "bg-orange-500 text-white shadow-md shadow-orange-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                                                    {m.menuName}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {activeMenuTab === "__ALL__" && (
                                        <div className="px-5 py-2.5 bg-indigo-50 border-b border-indigo-100">
                                            <p className="text-xs text-indigo-700 font-semibold">📊 Akumulasi nutrisi dari <strong>{aggregatedMenus.length} menu</strong> yang tersimpan.</p>
                                        </div>
                                    )}
                                    <div className="p-5">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {Object.entries(NUTRI_LABELS).map(([k, { label, unit: u, color }]) => {
                                                const val = displayNutrien[k] || 0;
                                                return (
                                                    <div key={k} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100 hover:border-slate-200 transition">
                                                        <div className="w-2 self-stretch rounded-full shrink-0" style={{ backgroundColor: color }} />
                                                        <div>
                                                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
                                                            <p className="font-mono font-extrabold text-slate-800 text-sm">{val.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">{u}</span></p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* ── AKG Analysis Section ─────────── */}
                {rows.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-lg bg-rose-600 text-white text-xs font-black flex items-center justify-center">4</div>
                                <h2 className="font-bold text-slate-800">Analisis Pemenuhan AKG</h2>
                            </div>
                            <div className="flex flex-wrap gap-3 items-center">
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="font-bold text-slate-500">Mode:</span>
                                    <select value={akgMode} onChange={e => setAkgMode(e.target.value as "menu" | "manual")}
                                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-rose-500 font-medium">
                                        <option value="menu">Dari Menu Input</option>
                                        <option value="manual">Manual</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="font-bold text-slate-500">Target:</span>
                                    <select value={targetGroup} onChange={e => setTargetGroup(e.target.value)}
                                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-rose-500 font-medium">
                                        {akgRefs.map(a => <option key={a.id} value={a.kelompok}>{a.kelompok}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="p-5 space-y-6">
                            {/* Gap Progress Bars */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {gapData.map(g => g.pencapaianPct !== null && (
                                    <div key={g.nutrien} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-slate-600 capitalize">{g.nutrien.replace("_", " ")}</span>
                                            <span className={`text-xs font-extrabold ${pctColor(g.pencapaianPct)}`}>{g.pencapaianPct.toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, g.pencapaianPct)}%`, backgroundColor: pctBarColor(g.pencapaianPct) }} />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
                                            <span>{g.asupan.toFixed(1)}</span>
                                            <span>/ {g.target?.toFixed(0)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Bar Chart */}
                                <div className="border border-slate-100 rounded-2xl p-4 h-72">
                                    <h3 className="text-xs font-bold text-slate-500 mb-3">% Pemenuhan AKG — {targetGroup}</h3>
                                    <ResponsiveContainer width="100%" height="90%">
                                        <BarChart data={gapData.filter(g => g.pencapaianPct !== null)} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="nutrien" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                                            <YAxis domain={[0, 140]} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                                            <RcTip formatter={(v: any) => [`${Number(v).toFixed(1)}%`, "Pemenuhan"]} />
                                            <ReferenceLine y={100} stroke="#1e293b" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "AKG", fontSize: 9, fill: "#64748b", position: "right" }} />
                                            <ReferenceLine y={90} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} />
                                            <Bar dataKey="pencapaianPct" radius={[4, 4, 0, 0]} name="%">
                                                {gapData.map((g, i) => <Cell key={i} fill={pctBarColor(g.pencapaianPct)} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Radar Chart */}
                                <div className="border border-slate-100 rounded-2xl p-4 h-72">
                                    <h3 className="text-xs font-bold text-slate-500 mb-3">Komparasi Multi-Kelompok</h3>
                                    <ResponsiveContainer width="100%" height="90%">
                                        <RadarChart outerRadius="65%" data={AKG_COLS_KEYS.map(k => {
                                            const row: any = { nutrien: k };
                                            radarGroups.forEach(rg => {
                                                const ref = akgRefs.find(r => r.kelompok === rg);
                                                if (ref) { const tgt = ref[k]; const val = finalAsupan[k] || 0; row[rg] = tgt ? (val / tgt) * 100 : 0; }
                                            });
                                            return row;
                                        })}>
                                            <PolarGrid stroke="#e2e8f0" />
                                            <PolarAngleAxis dataKey="nutrien" tick={{ fill: "#64748b", fontSize: 9 }} />
                                            <PolarRadiusAxis domain={[0, 150]} tick={{ fontSize: 8 }} />
                                            <RcTip formatter={(v: any) => [`${Number(v).toFixed(1)}%`]} />
                                            <Legend wrapperStyle={{ fontSize: 9 }} />
                                            {radarGroups.map((rg, i) => (
                                                <Radar key={rg} name={rg} dataKey={rg}
                                                    stroke={["#ec4899", "#8b5cf6", "#14b8a6"][i % 3]}
                                                    fill={["#ec4899", "#8b5cf6", "#14b8a6"][i % 3]} fillOpacity={0.15} />
                                            ))}
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* SIGMA Advisor Panel */}
                            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-violet-950 px-5 py-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-900/50">
                                            <span className="material-icons-round text-white text-base">tips_and_updates</span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">SIGMA Advisor</p>
                                            <h3 className="font-extrabold text-white text-sm leading-tight">Analisis & Rekomendasi Gizi</h3>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-[10px] text-slate-300 font-mono">{targetGroup}</span>
                                    </div>
                                </div>

                                {/* Status cards grid */}
                                <div className="bg-slate-900 px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[
                                        { label: "Defisit", color: "border-red-500 bg-red-500/10", textColor: "text-red-400", icon: "trending_down", count: gapData.filter(g => g.pencapaianPct !== null && g.pencapaianPct < 90).length },
                                        { label: "Memadai", color: "border-emerald-500 bg-emerald-500/10", textColor: "text-emerald-400", icon: "check_circle", count: gapData.filter(g => g.pencapaianPct !== null && g.pencapaianPct >= 90 && g.pencapaianPct <= 120).length },
                                        { label: "Surplus", color: "border-blue-400 bg-blue-500/10", textColor: "text-blue-400", icon: "trending_up", count: gapData.filter(g => g.pencapaianPct !== null && g.pencapaianPct > 120).length },
                                        { label: "Total Nutrien", color: "border-slate-500 bg-slate-500/10", textColor: "text-slate-300", icon: "science", count: gapData.filter(g => g.pencapaianPct !== null).length },
                                    ].map(c => (
                                        <div key={c.label} className={`border rounded-xl p-3 ${c.color}`}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`material-icons-round text-base ${c.textColor}`}>{c.icon}</span>
                                                <span className={`text-xs font-bold ${c.textColor}`}>{c.label}</span>
                                            </div>
                                            <p className={`text-2xl font-black ${c.textColor}`}>{c.count}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Narrative */}
                                <div className="bg-slate-950 px-5 py-4">
                                    <div className="space-y-2">
                                        {aiNarration.split("\n").filter(Boolean).map((line, i) => {
                                            const isBullet = line.startsWith("•");
                                            const isHeader = line.startsWith("**") && !isBullet;
                                            const isRec = line.startsWith("**Rekomendasi");
                                            const cleanLine = line.replace(/\*\*/g, "");
                                            if (isHeader && !isRec) return (
                                                <p key={i} className="text-[11px] font-bold text-indigo-300 tracking-wide uppercase pt-1">{cleanLine}</p>
                                            );
                                            if (isRec) return (
                                                <div key={i} className="mt-3 p-3 bg-violet-900/30 border border-violet-700/40 rounded-xl">
                                                    <p className="text-xs text-violet-200 leading-relaxed">{cleanLine}</p>
                                                </div>
                                            );
                                            if (isBullet) {
                                                const status = line.includes("Defisit") ? "text-red-400" : line.includes("Surplus") ? "text-blue-400" : "text-emerald-400";
                                                return (
                                                    <div key={i} className="flex gap-2 text-xs">
                                                        <span className={`material-icons-round text-sm mt-0.5 shrink-0 ${status}`}>
                                                            {line.includes("Defisit") ? "arrow_downward" : line.includes("Surplus") ? "arrow_upward" : "check"}
                                                        </span>
                                                        <p className="text-slate-300 leading-relaxed">{cleanLine.replace("• ", "")}</p>
                                                    </div>
                                                );
                                            }
                                            return <p key={i} className="text-xs text-slate-400 leading-relaxed">{cleanLine}</p>;
                                        })}
                                    </div>
                                </div>

                                {/* Footer legend */}
                                <div className="bg-slate-900 border-t border-white/5 px-5 py-3 flex flex-wrap gap-4">
                                    {[["bg-red-500", "Defisit <70%"], ["bg-orange-400", "Kurang 70–90%"], ["bg-emerald-400", "Memadai 90–120%"], ["bg-blue-400", "Surplus >120%"]].map(([c, l]) => (
                                        <div key={l} className="flex items-center gap-1.5">
                                            <div className={`w-2.5 h-2.5 rounded-full ${c} shrink-0`} />
                                            <span className="text-[10px] text-slate-400 font-medium">{l}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ── Edit Modal ─────────────────────── */}
            {editingRow && (
                <EditModal
                    row={editingRow}
                    menus={menus}
                    tkpiList={tkpiList}
                    onSave={handleSaveEdit}
                    onClose={() => setEditingRow(null)}
                />
            )}
        </div>
    );
}
