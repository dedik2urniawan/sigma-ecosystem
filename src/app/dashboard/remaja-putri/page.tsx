"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/dashboard/layout";
import { RemajaPutriRawRecord } from "@/lib/remajaPutriHelper";
import RemajaPutriDataQuality from "./components/RemajaPutriDataQuality";
import RemajaPutriOverview from "./components/RemajaPutriOverview";
import RemajaPutriDomainView from "./components/RemajaPutriDomainView";
import RemajaPutriFilterBar from "./components/RemajaPutriFilterBar";
import {
    Activity,
    FileCheck2,
    BarChart3,
    HeartPulse,
    Pill,
    Stethoscope,
    Award,
    Clock,
    RefreshCw
} from "lucide-react";

export default function RemajaPutriPage() {
    const { user } = useAuth();
    const effectiveRole = user?.role === "admin_puskesmas" ? "admin_puskesmas" : "superadmin";
    const isPuskesmasAdmin = effectiveRole === "admin_puskesmas";

    const [mainTab, setMainTab] = useState<"kualitas" | "indikator">("indikator");
    const [indikatorSubTab, setIndikatorSubTab] = useState<
        "ringkasan" | "ttd" | "skrining" | "anemia" | "tatalaksana"
    >("ringkasan");

    // Filter states
    const [mode, setMode] = useState<"bulanan" | "triwulan" | "tahun_ajaran">("bulanan");
    const [year, setYear] = useState<string>("2026");
    const [periodVal, setPeriodVal] = useState<number>(8); // Default to August
    const [selectedPuskesmas, setSelectedPuskesmas] = useState<string>("ALL");
    const [selectedKelurahan, setSelectedKelurahan] = useState<string>("ALL");

    // Reference options
    const [refPuskesmas, setRefPuskesmas] = useState<{ id: string; name: string }[]>([]);
    const [refDesa, setRefDesa] = useState<{ id: string; name: string; puskesmas_id: string }[]>([]);

    // Raw records & loading
    const [allRecords, setAllRecords] = useState<RemajaPutriRawRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    // Fetch master wilayah (Puskesmas & Desa) with RBAC filtering
    useEffect(() => {
        async function fetchWilayah() {
            try {
                let pQuery = supabase.from("ref_puskesmas").select("id, nama").order("nama");
                if (effectiveRole === "admin_puskesmas" && user?.puskesmas_id) {
                    pQuery = pQuery.eq("id", user.puskesmas_id);
                }

                const [pRes, dRes] = await Promise.all([
                    pQuery,
                    supabase.from("ref_desa").select("id, desa_kel, puskesmas_id").order("desa_kel")
                ]);

                if (pRes.data) {
                    const pList = pRes.data
                        .filter((p: any) => !p.nama.toLowerCase().includes("dinkes"))
                        .map((p: any) => ({ id: String(p.id), name: p.nama }));
                    setRefPuskesmas(pList);
                    if (effectiveRole === "admin_puskesmas" && pList.length > 0) {
                        setSelectedPuskesmas(pList[0].name);
                    }
                }

                if (dRes.data) {
                    setRefDesa(
                        dRes.data.map((d: any) => ({
                            id: String(d.id),
                            name: d.desa_kel,
                            puskesmas_id: String(d.puskesmas_id)
                        }))
                    );
                }
            } catch (err) {
                console.error("Error fetching wilayah master:", err);
            }
        }

        fetchWilayah();
    }, [effectiveRole, user]);

    // Fetch data_remaja_putri from Supabase with batch pagination
    const fetchData = async () => {
        setLoading(true);
        try {
            let allData: any[] = [];
            let from = 0;
            const step = 1000;
            let latestUpload: string | null = null;

            while (true) {
                const { data, error } = await supabase
                    .from("data_remaja_putri")
                    .select("*")
                    .order("uploaded_at", { ascending: false })
                    .range(from, from + step - 1);

                if (error) {
                    // If table doesn't exist yet, handle gracefully
                    console.warn("Notice fetching data_remaja_putri:", error.message);
                    break;
                }
                if (!data || data.length === 0) break;
                if (!latestUpload && data.length > 0 && data[0].uploaded_at) {
                    latestUpload = data[0].uploaded_at;
                }
                allData = allData.concat(data);
                if (data.length < step) break;
                from += step;
            }

            setAllRecords(allData as RemajaPutriRawRecord[]);
            if (latestUpload) {
                setLastUpdated(latestUpload);
            }

            // Auto-detect max month in data
            if (allData.length > 0) {
                const maxMonth = Math.max(...allData.map((r: any) => Number(r.bulan) || 0));
                if (maxMonth > 0 && maxMonth <= 12) {
                    setPeriodVal(maxMonth);
                }
            }
        } catch (err) {
            console.error("Error fetching data_remaja_putri:", err);
            setAllRecords([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Derived user Puskesmas name for RBAC badge/label
    const userPuskesmasName = useMemo(() => {
        if (!isPuskesmasAdmin || !user?.puskesmas_id) return undefined;
        const found = refPuskesmas.find((p) => String(p.id) === String(user.puskesmas_id));
        return found?.name;
    }, [isPuskesmasAdmin, user?.puskesmas_id, refPuskesmas]);

    // Dependent Kelurahan list based on selected Puskesmas
    const availableDesaList = useMemo(() => {
        if (selectedPuskesmas === "ALL") return [];
        const pObj = refPuskesmas.find((p) => p.name.toLowerCase().trim() === selectedPuskesmas.toLowerCase().trim());
        if (pObj) {
            const list = refDesa.filter((d) => d.puskesmas_id === pObj.id);
            if (list.length > 0) return list;
        }
        // Fallback from raw records
        const desaSet = new Set<string>();
        allRecords
            .filter((r) => r.puskesmas.toLowerCase().trim() === selectedPuskesmas.toLowerCase().trim())
            .forEach((r) => {
                if (r.kelurahan) desaSet.add(r.kelurahan);
            });
        return Array.from(desaSet).sort().map((d) => ({ id: d, name: d, puskesmas_id: "" }));
    }, [selectedPuskesmas, refPuskesmas, refDesa, allRecords]);

    return (
        <div className="space-y-6 pb-12">
            {/* Header Module */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-700 flex items-center justify-center shadow-lg shadow-pink-200 text-white">
                        <span className="material-icons-round text-2xl">girl</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                                Indikator Remaja Putri
                            </h1>
                            <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200">
                                SIGIZI 2026
                            </span>
                        </div>
                        <p className="text-sm text-slate-500">
                            Monitoring suplementasi tablet tambah darah (TTD), skrining anemia kelas 7 & 10, derajat keparahan Hb, dan tatalaksana anemia siswi.
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                            <Clock className="w-3.5 h-3.5" />
                            {lastUpdated ? (
                                <span>
                                    Data terakhir diperbarui:{" "}
                                    <span className="font-semibold text-slate-600">
                                        {new Date(lastUpdated).toLocaleDateString("id-ID", {
                                            day: "numeric",
                                            month: "long",
                                            year: "numeric"
                                        })}{" "}
                                        pukul{" "}
                                        {new Date(lastUpdated).toLocaleTimeString("id-ID", {
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        })}
                                    </span>
                                </span>
                            ) : (
                                <span>Belum ada data diupload</span>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-pink-600 bg-white border border-slate-200 rounded-xl shadow-2xs hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    <span>Muat Ulang</span>
                </button>
            </div>

            {/* Primary Main Tabs */}
            <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-1">
                    <button
                        onClick={() => setMainTab("kualitas")}
                        className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${
                            mainTab === "kualitas"
                                ? "bg-pink-600 text-white shadow-lg shadow-pink-200"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        }`}
                    >
                        <FileCheck2 className="w-4 h-4" />
                        Kelengkapan Data Laporan & DQA
                    </button>
                    <button
                        onClick={() => setMainTab("indikator")}
                        className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${
                            mainTab === "indikator"
                                ? "bg-pink-600 text-white shadow-lg shadow-pink-200"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        }`}
                    >
                        <BarChart3 className="w-4 h-4" />
                        Analisis Indikator Remaja Putri
                    </button>
                </div>
            </div>

            {/* Global Unified Sticky Filter Bar across all tabs (SS2 & SS4) */}
            <RemajaPutriFilterBar
                mode={mode}
                setMode={setMode}
                periodVal={periodVal}
                setPeriodVal={setPeriodVal}
                year={year}
                setYear={setYear}
                selectedPuskesmas={selectedPuskesmas}
                setSelectedPuskesmas={setSelectedPuskesmas}
                selectedKelurahan={selectedKelurahan}
                setSelectedKelurahan={setSelectedKelurahan}
                refPuskesmas={refPuskesmas}
                availableDesaList={availableDesaList}
                isPuskesmasAdmin={isPuskesmasAdmin}
                userPuskesmasName={userPuskesmasName}
            />

            {/* Main Content Area */}
            {mainTab === "kualitas" ? (
                <RemajaPutriDataQuality
                    allRecords={allRecords}
                    refPuskesmas={refPuskesmas}
                    refDesa={refDesa}
                    year={year}
                    mode={mode}
                    periodVal={periodVal}
                    selectedPuskesmas={selectedPuskesmas}
                    setSelectedPuskesmas={setSelectedPuskesmas}
                    selectedKelurahan={selectedKelurahan}
                    setSelectedKelurahan={setSelectedKelurahan}
                    isPuskesmasAdmin={isPuskesmasAdmin}
                    availableDesaList={availableDesaList}
                />
            ) : (
                <div className="space-y-6">
                    {/* Sub Tabs for Indikator Sub-Domains */}
                    <div className="flex bg-slate-50 p-1.5 rounded-2xl flex-wrap gap-1 border border-slate-200/80">
                        {[
                            { id: "ringkasan", label: "Ringkasan Program 2026", icon: Activity },
                            { id: "ttd", label: "Tablet Tambah Darah (TTD)", icon: Pill },
                            { id: "skrining", label: "Skrining Anemia (Kelas 7 & 10)", icon: Stethoscope },
                            { id: "anemia", label: "Prevalensi & Severity Profile", icon: HeartPulse },
                            { id: "tatalaksana", label: "Tatalaksana Anemia", icon: Award }
                        ].map((t) => {
                            const IconComponent = t.icon;
                            const isActive = indikatorSubTab === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setIndikatorSubTab(t.id as any)}
                                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                                        isActive
                                            ? "bg-pink-600 text-white shadow-md shadow-pink-200"
                                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                                    }`}
                                >
                                    <IconComponent className="w-4 h-4" />
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Sub-tab Views */}
                    {indikatorSubTab === "ringkasan" ? (
                        <RemajaPutriOverview
                            allRecords={allRecords}
                            refPuskesmas={refPuskesmas}
                            refDesa={refDesa}
                            year={year}
                            setYear={setYear}
                            mode={mode}
                            setMode={setMode}
                            periodVal={periodVal}
                            setPeriodVal={setPeriodVal}
                            selectedPuskesmas={selectedPuskesmas}
                            setSelectedPuskesmas={setSelectedPuskesmas}
                            selectedKelurahan={selectedKelurahan}
                            setSelectedKelurahan={setSelectedKelurahan}
                        />
                    ) : (
                        <RemajaPutriDomainView
                            domain={indikatorSubTab as any}
                            allRecords={allRecords}
                            year={year}
                            mode={mode}
                            periodVal={periodVal}
                            selectedPuskesmas={selectedPuskesmas}
                            setSelectedPuskesmas={setSelectedPuskesmas}
                            selectedKelurahan={selectedKelurahan}
                            setSelectedKelurahan={setSelectedKelurahan}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
