"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/app/dashboard/layout";
import { supabase } from "@/lib/supabase";
import {
    PmtBalitaRecord,
    PmtBumilRecord,
    fetchPmtData,
    computePmtMetrics
} from "@/lib/pmtLokalHelper";
import PmtLokalFilterBar from "./components/PmtLokalFilterBar";
import PmtOverviewTab from "./components/PmtOverviewTab";
import PmtBalitaGkTab from "./components/PmtBalitaGkTab";
import PmtBalitaUwTab from "./components/PmtBalitaUwTab";
import PmtBalitaTTab from "./components/PmtBalitaTTab";
import PmtBumilKekTab from "./components/PmtBumilKekTab";
import PmtReconciliationTab from "./components/PmtReconciliationTab";
import PmtDataQualityTab from "./components/PmtDataQualityTab";
import {
    Soup,
    Activity,
    TrendingUp,
    HeartPulse,
    Scale,
    ShieldAlert,
    LayoutDashboard,
    AlertCircle
} from "lucide-react";

export default function AnalisisPMTLokalPage() {
    const { user } = useAuth();
    const effectiveRole = user?.role === "admin_puskesmas" ? "admin_puskesmas" : "superadmin";

    // Primary & subtab navigation state
    const [primaryTab, setPrimaryTab] = useState<"analisis" | "dqa">("analisis");
    const [subTab, setSubTab] = useState<"overview" | "gk" | "uw" | "t" | "bumil" | "reconciliation">("overview");

    // Global filter states
    const [selectedYear, setSelectedYear] = useState<string>("2026");
    const [selectedCohortMonth, setSelectedCohortMonth] = useState<string>("ALL");
    const [selectedPuskesmas, setSelectedPuskesmas] = useState<string>("ALL");
    const [selectedIndication, setSelectedIndication] = useState<string>("ALL");

    // Data states
    const [allBalita, setAllBalita] = useState<PmtBalitaRecord[]>([]);
    const [allBumil, setAllBumil] = useState<PmtBumilRecord[]>([]);
    const [puskesmasList, setPuskesmasList] = useState<{ id: string; name: string }[]>([]);
    const [isSampleData, setIsSampleData] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(true);

    // Lock Puskesmas filter if role is admin_puskesmas
    const isLockedRole = effectiveRole === "admin_puskesmas";

    // Load Puskesmas reference list
    useEffect(() => {
        async function loadPuskesmas() {
            try {
                const { data } = await supabase
                    .from("ref_puskesmas")
                    .select("id, nama")
                    .not("nama", "ilike", "%dinkes%")
                    .order("nama");

                if (data && data.length > 0) {
                    setPuskesmasList(data.map(d => ({ id: d.id.toString(), name: d.nama })));
                    
                    if (isLockedRole && user?.puskesmas_id) {
                        const userPkm = data.find(p => p.id.toString() === user.puskesmas_id?.toString());
                        if (userPkm) {
                            setSelectedPuskesmas(userPkm.nama);
                        }
                    }
                }
            } catch (err) {
                console.error("loadPuskesmas error:", err);
            }
        }
        loadPuskesmas();
    }, [isLockedRole, user]);

    // Fetch PMT data from Supabase / Seed
    const loadData = async () => {
        setLoading(true);
        try {
            const targetPkm = isLockedRole ? selectedPuskesmas : (selectedPuskesmas !== "ALL" ? selectedPuskesmas : undefined);
            const result = await fetchPmtData(targetPkm);
            setAllBalita(result.balitaRecords);
            setAllBumil(result.bumilRecords);
            setIsSampleData(result.isSampleData);
        } catch (err) {
            console.error("Error loading PMT data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedPuskesmas]);

    // Filter records dynamically based on active filters
    const filteredBalita = useMemo(() => {
        return allBalita.filter(r => {
            if (selectedPuskesmas !== "ALL" && !r.puskesmas.toLowerCase().includes(selectedPuskesmas.toLowerCase())) {
                return false;
            }
            if (selectedIndication !== "ALL" && selectedIndication !== "bumil_kek" && r.indikasi !== selectedIndication) {
                return false;
            }
            if (selectedIndication === "bumil_kek") {
                return false;
            }
            return true;
        });
    }, [allBalita, selectedPuskesmas, selectedIndication]);

    const filteredBumil = useMemo(() => {
        return allBumil.filter(r => {
            if (selectedPuskesmas !== "ALL" && !r.puskesmas.toLowerCase().includes(selectedPuskesmas.toLowerCase())) {
                return false;
            }
            if (selectedIndication !== "ALL" && selectedIndication !== "bumil_kek") {
                return false;
            }
            return true;
        });
    }, [allBumil, selectedPuskesmas, selectedIndication]);

    // Computed metrics overview
    const metricsOverview = useMemo(() => {
        return computePmtMetrics(filteredBalita, filteredBumil);
    }, [filteredBalita, filteredBumil]);

    const totalRowsCount = filteredBalita.length + filteredBumil.length;

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
            {/* ── HEADER ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                        <Soup className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-extrabold text-slate-800">
                                Analisis PMT Lokal
                            </h1>
                            <span className="text-[11px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200/60">
                                SIGMA RCS 2.0
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                            Pemantauan dan evaluasi efektivitas Pemberian Makanan Tambahan (PMT) Pangan Lokal bagi Balita Gizi Kurang, Berat Badan Kurang, Balita T, dan Ibu Hamil KEK berdasarkan kohort teramati.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-slate-600">
                        Kohort: <strong className="text-slate-800">Kabupaten Malang 2026</strong>
                    </div>
                </div>
            </div>

            {/* ── FILTER BAR ── */}
            <PmtLokalFilterBar
                primaryTab={primaryTab}
                setPrimaryTab={setPrimaryTab}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                selectedCohortMonth={selectedCohortMonth}
                setSelectedCohortMonth={setSelectedCohortMonth}
                selectedPuskesmas={selectedPuskesmas}
                setSelectedPuskesmas={setSelectedPuskesmas}
                selectedIndication={selectedIndication}
                setSelectedIndication={setSelectedIndication}
                puskesmasList={puskesmasList}
                isSampleData={isSampleData}
                isLockedRole={isLockedRole}
                onRefresh={loadData}
                loading={loading}
                totalRows={totalRowsCount}
            />

            {/* ── SUBTABS NAVIGATION (When in Analisis PMT Lokal mode) ── */}
            {primaryTab === "analisis" && (
                <div className="flex items-center space-x-1 overflow-x-auto pb-2 scrollbar-thin">
                    <button
                        onClick={() => setSubTab("overview")}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                            subTab === "overview"
                                ? "bg-purple-700 text-white shadow-md shadow-purple-700/20"
                                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80"
                        }`}
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Ringkasan Eksekutif</span>
                    </button>

                    <button
                        onClick={() => setSubTab("gk")}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                            subTab === "gk"
                                ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80"
                        }`}
                    >
                        <Activity className="w-4 h-4" />
                        <span>Balita Gizi Kurang ({metricsOverview.gkIntake})</span>
                    </button>

                    <button
                        onClick={() => setSubTab("uw")}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                            subTab === "uw"
                                ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80"
                        }`}
                    >
                        <TrendingUp className="w-4 h-4" />
                        <span>Balita BB Kurang ({metricsOverview.uwIntake})</span>
                    </button>

                    <button
                        onClick={() => setSubTab("t")}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                            subTab === "t"
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80"
                        }`}
                    >
                        <TrendingUp className="w-4 h-4" />
                        <span>Balita T ({metricsOverview.tIntake.toLocaleString()})</span>
                    </button>

                    <button
                        onClick={() => setSubTab("bumil")}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                            subTab === "bumil"
                                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80"
                        }`}
                    >
                        <HeartPulse className="w-4 h-4" />
                        <span>Ibu Hamil KEK ({metricsOverview.bumilIntake})</span>
                    </button>

                    <button
                        onClick={() => setSubTab("reconciliation")}
                        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                            subTab === "reconciliation"
                                ? "bg-slate-800 text-white shadow-md"
                                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80"
                        }`}
                    >
                        <Scale className="w-4 h-4" />
                        <span>Rekonsiliasi Administratif</span>
                    </button>
                </div>
            )}

            {/* ── TAB CONTENT RENDERING ── */}
            {primaryTab === "dqa" ? (
                <PmtDataQualityTab
                    balitaRecords={filteredBalita}
                    bumilRecords={filteredBumil}
                />
            ) : (
                <>
                    {subTab === "overview" && (
                        <PmtOverviewTab
                            metrics={metricsOverview}
                            balitaRecords={filteredBalita}
                            bumilRecords={filteredBumil}
                            onSelectSubtab={(tab) => setSubTab(tab as any)}
                        />
                    )}
                    {subTab === "gk" && (
                        <PmtBalitaGkTab records={filteredBalita} />
                    )}
                    {subTab === "uw" && (
                        <PmtBalitaUwTab records={filteredBalita} />
                    )}
                    {subTab === "t" && (
                        <PmtBalitaTTab records={filteredBalita} />
                    )}
                    {subTab === "bumil" && (
                        <PmtBumilKekTab records={filteredBumil} />
                    )}
                    {subTab === "reconciliation" && (
                        <PmtReconciliationTab
                            balitaRecords={filteredBalita}
                            bumilRecords={filteredBumil}
                        />
                    )}
                </>
            )}
        </div>
    );
}
