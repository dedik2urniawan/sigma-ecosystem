"use client";
import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/lib/clientSession";
import { useAuth } from "@/app/dashboard/layout";
import FilterSection from "./FilterSection";
import ComplianceScorecard from "./ComplianceScorecard";
import ComplianceDrilldownChart from "./ComplianceDrilldownChart";
import NutritionScorecard from "./NutritionScorecard";
import NutritionCohortChart from "./NutritionCohortChart";
import ZScoreLineChart from "./ZScoreLineChart";
import DeltaBBChart from "./DeltaBBChart";
import RedFlagPieChart from "./RedFlagPieChart";
import KepatuhanBarChart from "./KepatuhanBarChart";
import HealthStatusBarChart from "./HealthStatusBarChart";
import DosageBarChart from "./DosageBarChart";
import MonitoringComplianceScorecard from "./MonitoringComplianceScorecard";
import ComplianceStackedBarChart from "./ComplianceStackedBarChart";
import { BarChart3, Heart, TrendingUp, CheckCircle2, Download, Filter, FileText, Activity, AlertTriangle, PieChart, Building2, Lock } from "lucide-react";
import { exportAnalyticsToPDF } from "@/lib/exportAnalytics";

export default function AnalyticsSection() {
    const { user } = useAuth();
    const isPuskesmasAdmin = user?.role === "admin_puskesmas";

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedWeek, setSelectedWeek] = useState<string>("all");
    const [selectedPuskesmas, setSelectedPuskesmas] = useState<string>("ALL");
    const [puskesmasList, setPuskesmasList] = useState<{ id: string; nama: string }[]>([]);
    const [userPuskesmasName, setUserPuskesmasName] = useState<string>("");

    const [complianceData, setComplianceData] = useState<any>(null);
    const [complianceLoading, setComplianceLoading] = useState(true);

    const [nutritionData, setNutritionData] = useState<any>(null);
    const [nutritionLoading, setNutritionLoading] = useState(true);

    const [redFlagData, setRedFlagData] = useState<any>(null);
    const [redFlagLoading, setRedFlagLoading] = useState(true);

    const [kepatuhanData, setKepatuhanData] = useState<any>(null);
    const [kepatuhanLoading, setKepatuhanLoading] = useState(true);

    const [dosageData, setDosageData] = useState<any>(null);
    const [dosageLoading, setDosageLoading] = useState(true);

    const [monitoringComplianceData, setMonitoringComplianceData] = useState<any>(null);
    const [monitoringComplianceLoading, setMonitoringComplianceLoading] = useState(true);

    const [cohortData, setCohortData] = useState<any[]>([]);
    const [cohortLoading, setCohortLoading] = useState(true);

    // Sync admin_puskesmas puskesmas_id
    useEffect(() => {
        if (isPuskesmasAdmin && user?.puskesmas_id) {
            setSelectedPuskesmas(user.puskesmas_id);
        }
    }, [isPuskesmasAdmin, user?.puskesmas_id]);

    // Fetch master Puskesmas
    useEffect(() => {
        fetch("/api/mbg/refs")
            .then((res) => res.json())
            .then((resData) => {
                if (resData.success && resData.data?.puskesmas) {
                    const pList = resData.data.puskesmas.map((p: any) => ({ id: p.id, nama: p.nama }));
                    setPuskesmasList(pList);
                    if (user?.puskesmas_id) {
                        const found = pList.find((p: any) => p.id === user.puskesmas_id);
                        if (found) setUserPuskesmasName(found.nama);
                    }
                }
            })
            .catch(() => {});
    }, [user?.puskesmas_id]);

    const getPkmQuery = useCallback(() => {
        if (isPuskesmasAdmin && user?.puskesmas_id) {
            return `&puskesmas_id=${user.puskesmas_id}`;
        }
        if (selectedPuskesmas && selectedPuskesmas !== "ALL") {
            return `&puskesmas_id=${selectedPuskesmas}`;
        }
        return "";
    }, [isPuskesmasAdmin, user?.puskesmas_id, selectedPuskesmas]);

    const fetchComplianceData = async () => {
        setComplianceLoading(true);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`/api/pkmk/analytics/compliance?year=${selectedYear}&month=${selectedMonth}${getPkmQuery()}`, { headers });
            if (response.ok) {
                const data = await response.json();
                setComplianceData(data);
            }
        } catch (error) {
            console.error("Error fetching compliance data:", error);
        } finally {
            setComplianceLoading(false);
        }
    };

    const fetchNutritionData = async () => {
        setNutritionLoading(true);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`/api/pkmk/analytics/nutrition?year=${selectedYear}&month=${selectedMonth}${getPkmQuery()}`, { headers });
            if (response.ok) {
                const data = await response.json();
                setNutritionData(data);
            }
        } catch (error) {
            console.error("Error fetching nutrition data:", error);
        } finally {
            setNutritionLoading(false);
        }
    };

    const fetchRedFlagData = async () => {
        setRedFlagLoading(true);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`/api/pkmk/analytics/redflag?year=${selectedYear}&month=${selectedMonth}${getPkmQuery()}`, { headers });
            if (response.ok) {
                const data = await response.json();
                setRedFlagData(data);
            }
        } catch (error) {
            console.error("Error fetching red flag data:", error);
        } finally {
            setRedFlagLoading(false);
        }
    };

    const fetchKepatuhanData = async () => {
        setKepatuhanLoading(true);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`/api/pkmk/analytics/kepatuhan?year=${selectedYear}&month=${selectedMonth}${getPkmQuery()}`, { headers });
            if (response.ok) {
                const data = await response.json();
                setKepatuhanData(data);
            }
        } catch (error) {
            console.error("Error fetching kepatuhan data:", error);
        } finally {
            setKepatuhanLoading(false);
        }
    };

    const fetchDosageData = async () => {
        setDosageLoading(true);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch(`/api/pkmk/analytics/dosage?year=${selectedYear}&month=${selectedMonth}${getPkmQuery()}`, { headers });
            if (response.ok) {
                const data = await response.json();
                setDosageData(data);
            }
        } catch (error) {
            console.error("Error fetching dosage data:", error);
        } finally {
            setDosageLoading(false);
        }
    };

    const fetchMonitoringComplianceData = useCallback(async () => {
        setMonitoringComplianceLoading(true);
        try {
            const weekQuery = selectedWeek !== "all" ? `&week=${selectedWeek}` : "";
            const headers = await getAuthHeaders();
            const response = await fetch(`/api/pkmk/analytics/monitoring-compliance?year=${selectedYear}&month=${selectedMonth}${weekQuery}${getPkmQuery()}`, { headers });
            if (response.ok) {
                const data = await response.json();
                setMonitoringComplianceData(data);
            }
        } catch (error) {
            console.error("Error fetching monitoring compliance data:", error);
        } finally {
            setMonitoringComplianceLoading(false);
        }
    }, [selectedYear, selectedMonth, selectedWeek, getPkmQuery]);

    const fetchCohortData = useCallback(async () => {
        setCohortLoading(true);
        try {
            const headers = await getAuthHeaders();
            const pQuery = getPkmQuery();
            const url = `/api/pkmk/analytics/nutrition-cohort${pQuery ? '?' + pQuery.substring(1) : ''}`;
            const response = await fetch(url, { headers });
            if (response.ok) {
                const data = await response.json();
                setCohortData(data.months || []);
            }
        } catch (error) {
            console.error("Error fetching cohort data:", error);
        } finally {
            setCohortLoading(false);
        }
    }, [getPkmQuery]);

    useEffect(() => {
        fetchComplianceData();
        fetchNutritionData();
        fetchRedFlagData();
        fetchCohortData();
        fetchKepatuhanData();
        fetchDosageData();
    }, [selectedYear, selectedMonth, selectedPuskesmas, getPkmQuery]);

    useEffect(() => {
        fetchMonitoringComplianceData();
    }, [selectedYear, selectedMonth, selectedWeek, fetchMonitoringComplianceData]);

    const handleFilterChange = (year: number, month: number, puskesmasId?: string) => {
        setSelectedYear(year);
        setSelectedMonth(month);
        if (puskesmasId) setSelectedPuskesmas(puskesmasId);
    };

    const handleExport = () => {
        exportAnalyticsToPDF(
            complianceData,
            nutritionData,
            selectedYear,
            selectedMonth,
            kepatuhanData,
            dosageData,
            redFlagData,
            monitoringComplianceData
        );
    };

    const MONTHS = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    return (
        <>
            <style jsx>{`
                .analytics-container {
                    display: flex;
                    flex-direction: column;
                    gap: 32px;
                    padding-bottom: 40px;
                }
                .analytics-header {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid #e5e7eb;
                }
                @media (min-width: 768px) {
                    .analytics-header {
                        flex-direction: row;
                        align-items: flex-end;
                        justify-content: space-between;
                    }
                }
                .analytics-title {
                    font-size: 32px;
                    font-weight: 900;
                    color: #111817;
                    letter-spacing: -0.033em;
                    line-height: 1.1;
                }
                .analytics-subtitle {
                    color: #638884;
                    font-size: 16px;
                    max-width: 600px;
                    margin-top: 8px;
                }
                .filter-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    align-items: flex-end;
                }
                .filter-select {
                    appearance: none;
                    background: white;
                    border: 1px solid #d1d5db;
                    color: #111817;
                    border-radius: 8px;
                    padding: 10px 32px 10px 16px;
                    font-weight: 500;
                    font-size: 14px;
                    cursor: pointer;
                    min-width: 140px;
                }
                .filter-select:focus {
                    outline: none;
                    border-color: #14b8a6;
                    box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.2);
                }
                .btn-primary {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: #14b8a6;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 10px 20px;
                    font-weight: 700;
                    font-size: 14px;
                    cursor: pointer;
                    box-shadow: 0 4px 6px rgba(20, 184, 166, 0.3);
                    transition: all 0.2s;
                }
                .btn-primary:hover {
                    background: #0d9488;
                }
                .btn-secondary {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: white;
                    color: #111817;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    padding: 10px 20px;
                    font-weight: 700;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-secondary:hover {
                    background: #f9fafb;
                }
                .section {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .section-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .section-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 8px;
                    background: rgba(20, 184, 166, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #14b8a6;
                }
                .section-icon.blue {
                    background: rgba(59, 130, 246, 0.1);
                    color: #3b82f6;
                }
                .section-icon.pink {
                    background: rgba(236, 72, 153, 0.1);
                    color: #ec4899;
                }
                .section-icon.green {
                    background: rgba(34, 197, 94, 0.1);
                    color: #22c55e;
                }
                .section-title {
                    font-size: 20px;
                    font-weight: 700;
                    color: #111817;
                }
                .week-filter {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-left: auto;
                }
                .week-filter-label {
                    font-size: 14px;
                    font-weight: 500;
                    color: #374151;
                }
                .chart-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 24px;
                }
                @media (min-width: 1024px) {
                    .chart-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                .chart-grid-3 {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 24px;
                }
                @media (min-width: 1024px) {
                    .chart-grid-3 {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }
            `}</style>

            <div id="analytics-dashboard" className="analytics-container">
                {/* Header & Filters */}
                <div className="analytics-header">
                    <div>
                        <h1 className="analytics-title">Dashboard Analytics</h1>
                        <p className="analytics-subtitle">
                            Overview kinerja program PKMK dan status gizi balita di Kabupaten Malang
                        </p>
                    </div>
                    <div className="filter-row">
                        {isPuskesmasAdmin ? (
                            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700">
                                <Lock size={14} className="text-amber-500" />
                                <span>Puskesmas {userPuskesmasName || 'Anda'}</span>
                            </div>
                        ) : (
                            <select
                                className="filter-select max-w-[210px] truncate"
                                value={selectedPuskesmas}
                                onChange={(e) => setSelectedPuskesmas(e.target.value)}
                            >
                                <option value="ALL">Semua Puskesmas (Kab. Malang)</option>
                                {puskesmasList.map((p) => (
                                    <option key={p.id} value={p.id}>{p.nama}</option>
                                ))}
                            </select>
                        )}
                        <select
                            className="filter-select"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                        >
                            {Array.from({ length: new Date().getFullYear() - 2019 }, (_, i) => 2020 + i).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <select
                            className="filter-select"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        >
                            {MONTHS.map((m, i) => (
                                <option key={i} value={i + 1}>{m}</option>
                            ))}
                        </select>
                        <button className="btn-primary" onClick={() => handleFilterChange(selectedYear, selectedMonth, selectedPuskesmas)}>
                            <Filter size={18} />
                            Terapkan
                        </button>
                        <button className="btn-secondary" onClick={handleExport}>
                            <FileText size={18} />
                            Export PDF
                        </button>
                    </div>
                </div>

                {/* Section 1: Analisis Compliance Kohort */}
                <section className="section">
                    <div className="section-header">
                        <div className="section-icon">
                            <BarChart3 size={20} />
                        </div>
                        <h2 className="section-title">Analisis Compliance Kohort</h2>
                    </div>

                    <ComplianceScorecard
                        totalBalita={complianceData?.totalBalita || 0}
                        kohortInput={complianceData?.kohortInput || 0}
                        compliancePercentage={complianceData?.compliancePercentage || 0}
                        loading={complianceLoading}
                    />

                    <ComplianceDrilldownChart
                        data={complianceData?.groupedData || []}
                        level={complianceData?.level || "puskesmas"}
                        loading={complianceLoading}
                    />
                </section>

                {/* Section 2: Monitoring Compliance */}
                <section className="section">
                    <div className="section-header">
                        <div className="section-icon blue">
                            <CheckCircle2 size={20} />
                        </div>
                        <h2 className="section-title">Monitoring Compliance</h2>

                        <div className="week-filter">
                            <span className="week-filter-label">Filter Minggu:</span>
                            <select
                                className="filter-select"
                                value={selectedWeek}
                                onChange={(e) => setSelectedWeek(e.target.value)}
                                style={{ minWidth: '160px' }}
                            >
                                <option value="all">Semua Minggu</option>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((week) => (
                                    <option key={week} value={week}>Minggu ke-{week}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <MonitoringComplianceScorecard
                        totalBalita={monitoringComplianceData?.totalBalita || 0}
                        data={monitoringComplianceData?.overall || {}}
                        loading={monitoringComplianceLoading}
                    />

                    <div className="chart-grid-3">
                        <ComplianceStackedBarChart
                            title="Antropometri"
                            data={monitoringComplianceData?.byLocation || []}
                            type="antropometri"
                            loading={monitoringComplianceLoading}
                        />
                        <ComplianceStackedBarChart
                            title="Konsumsi"
                            data={monitoringComplianceData?.byLocation || []}
                            type="konsumsi"
                            loading={monitoringComplianceLoading}
                        />
                        <ComplianceStackedBarChart
                            title="Pemberian"
                            data={monitoringComplianceData?.byLocation || []}
                            type="pemberian"
                            loading={monitoringComplianceLoading}
                        />
                    </div>
                </section>

                {/* Section 3: Analisis Status Gizi */}
                <section className="section">
                    <div className="section-header">
                        <div className="section-icon pink">
                            <Heart size={20} />
                        </div>
                        <h2 className="section-title">Analisis Status Gizi</h2>
                    </div>

                    <NutritionScorecard
                        avgBBU={nutritionData?.avgBBU || 0}
                        avgTBU={nutritionData?.avgTBU || 0}
                        avgBBTB={nutritionData?.avgBBTB || 0}
                        avgDeltaBB={nutritionData?.avgDeltaBB || 0}
                        redFlagPercentage={nutritionData?.redFlagPercentage || 0}
                        loading={nutritionLoading}
                    />

                    <NutritionCohortChart
                        data={cohortData}
                        loading={cohortLoading}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <ZScoreLineChart
                            title="Z-Score BB/U"
                            subtitle="Berat Badan menurut Umur"
                            data={nutritionData?.chartDataBBU || []}
                            locations={nutritionData?.locations || []}
                            loading={nutritionLoading}
                        />
                        <ZScoreLineChart
                            title="Z-Score TB/U"
                            subtitle="Tinggi Badan menurut Umur"
                            data={nutritionData?.chartDataTBU || []}
                            locations={nutritionData?.locations || []}
                            loading={nutritionLoading}
                        />
                        <ZScoreLineChart
                            title="Z-Score BB/TB"
                            subtitle="Berat Badan menurut Tinggi Badan"
                            data={nutritionData?.chartDataBBTB || []}
                            locations={nutritionData?.locations || []}
                            loading={nutritionLoading}
                        />
                    </div>

                    <DeltaBBChart
                        data={nutritionData?.chartDataDeltaBB || []}
                        locations={nutritionData?.locations || []}
                        expectedBaseline={nutritionData?.expectedBaseline || 0.25}
                        loading={nutritionLoading}
                    />

                    <RedFlagPieChart
                        data={redFlagData?.redFlagDistribution || []}
                        totalWithRedFlag={redFlagData?.totalWithRedFlag || 0}
                        loading={redFlagLoading}
                    />
                </section>

                {/* Section 4: Analisis Kepatuhan */}
                <section className="section">
                    <div className="section-header">
                        <div className="section-icon green">
                            <TrendingUp size={20} />
                        </div>
                        <h2 className="section-title">Analisis Kepatuhan & Tren</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <KepatuhanBarChart
                            data={kepatuhanData?.kepatuhanByLocation || []}
                            loading={kepatuhanLoading}
                        />
                        <HealthStatusBarChart
                            data={kepatuhanData?.healthByLocation || []}
                            loading={kepatuhanLoading}
                        />
                        <DosageBarChart
                            data={dosageData?.dosageByLocation || []}
                            loading={dosageLoading}
                        />
                    </div>
                </section>
            </div>
        </>
    );
}
