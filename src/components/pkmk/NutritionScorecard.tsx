"use client";
import { Activity, TrendingDown, TrendingUp, AlertTriangle, Scale } from "lucide-react";

interface NutritionScorecardProps {
    avgBBU: number;
    avgTBU: number;
    avgBBTB: number;
    avgDeltaBB: number;
    redFlagPercentage: number;
    loading?: boolean;
}

export default function NutritionScorecard({
    avgBBU,
    avgTBU,
    avgBBTB,
    avgDeltaBB,
    redFlagPercentage,
    loading = false,
}: NutritionScorecardProps) {
    if (loading) {
        return (
            <>
                <style jsx>{`
                    .loading-container {
                        display: flex;
                        flex-direction: column;
                        gap: 20px;
                    }
                    .loading-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 16px;
                    }
                    @media (min-width: 640px) {
                        .loading-grid {
                            grid-template-columns: repeat(4, 1fr);
                        }
                    }
                    .loading-card {
                        background: #e5e7eb;
                        border-radius: 12px;
                        height: 120px;
                        animation: pulse 2s infinite;
                    }
                    .loading-banner {
                        background: #e5e7eb;
                        border-radius: 12px;
                        height: 100px;
                        animation: pulse 2s infinite;
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                `}</style>
                <div className="loading-container">
                    <div className="loading-grid">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="loading-card" />
                        ))}
                    </div>
                    <div className="loading-banner" />
                </div>
            </>
        );
    }

    // BB/U Classification (Berat Badan menurut Umur) - Permenkes RI
    const getBBUStatus = (score: number) => {
        if (score < -3) return { label: "BB Sangat Kurang", color: "#dc2626", bg: "rgba(220, 38, 38, 0.1)" };
        if (score < -2) return { label: "BB Kurang", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" };
        if (score <= 1) return { label: "BB Normal", color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)" };
        return { label: "Risiko BB Lebih", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" };
    };

    // TB/U Classification (Height-for-Age / Stunting)
    const getTBUStatus = (score: number) => {
        if (score < -3) return { label: "Sangat Pendek", color: "#dc2626", bg: "rgba(220, 38, 38, 0.1)" };
        if (score < -2) return { label: "Pendek", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" };
        if (score <= 3) return { label: "Normal", color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)" };
        return { label: "Tinggi", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" };
    };

    // BB/TB Classification (Weight-for-Height / Wasting)
    const getBBTBStatus = (score: number) => {
        if (score < -3) return { label: "Gizi Buruk", color: "#dc2626", bg: "rgba(220, 38, 38, 0.1)" };
        if (score < -2) return { label: "Gizi Kurang", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" };
        if (score <= 1) return { label: "Gizi Baik", color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)" };
        if (score <= 2) return { label: "Berisiko Gizi Lebih", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" };
        if (score <= 3) return { label: "Gizi Lebih", color: "#f97316", bg: "rgba(249, 115, 22, 0.1)" };
        return { label: "Obesitas", color: "#dc2626", bg: "rgba(220, 38, 38, 0.1)" };
    };

    const getDeltaStatus = (delta: number) => {
        if (delta >= 0) return { label: "Naik", color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)" };
        return { label: "Turun", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" };
    };

    const getRedFlagLevel = () => {
        if (redFlagPercentage > 20) return { color: "#dc2626", bg: "rgba(220, 38, 38, 0.05)", border: "#fecaca" };
        if (redFlagPercentage > 10) return { color: "#d97706", bg: "rgba(217, 119, 6, 0.05)", border: "#fde68a" };
        return { color: "#16a34a", bg: "rgba(22, 163, 74, 0.05)", border: "#bbf7d0" };
    };

    const bbuStatus = getBBUStatus(avgBBU);
    const tbuStatus = getTBUStatus(avgTBU);
    const bbtbStatus = getBBTBStatus(avgBBTB);
    const deltaStatus = getDeltaStatus(avgDeltaBB);
    const redFlagLevel = getRedFlagLevel();

    return (
        <>
            <style jsx>{`
                .nutrition-container {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .zscore-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 16px;
                }
                @media (min-width: 640px) {
                    .zscore-grid {
                        grid-template-columns: repeat(4, 1fr);
                    }
                }
                .zscore-card {
                    background: white;
                    padding: 16px;
                    border-radius: 12px;
                    border: 1px solid #f3f4f6;
                    text-align: center;
                }
                .zscore-label {
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: #638884;
                    margin-bottom: 8px;
                }
                .zscore-value {
                    font-size: 24px;
                    font-weight: 900;
                    color: #111817;
                }
                .zscore-badge {
                    display: inline-block;
                    margin-top: 8px;
                    font-size: 12px;
                    font-weight: 500;
                    padding: 4px 12px;
                    border-radius: 4px;
                }
                .redflag-banner {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 20px;
                    border-radius: 12px;
                    border: 2px solid;
                }
                @media (max-width: 640px) {
                    .redflag-banner {
                        flex-direction: column;
                        text-align: center;
                    }
                }
                .redflag-icon {
                    width: 56px;
                    height: 56px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .redflag-content {
                    flex: 1;
                }
                .redflag-stats {
                    display: flex;
                    align-items: baseline;
                    gap: 12px;
                }
                @media (max-width: 640px) {
                    .redflag-stats {
                        justify-content: center;
                    }
                }
                .redflag-value {
                    font-size: 30px;
                    font-weight: 900;
                }
                .redflag-label {
                    font-size: 16px;
                    font-weight: 700;
                    color: #374151;
                }
                .redflag-desc {
                    font-size: 14px;
                    margin-top: 4px;
                }
                .redflag-btn {
                    font-size: 12px;
                    font-weight: 700;
                    background: white;
                    padding: 8px 16px;
                    border-radius: 6px;
                    border: 1px solid;
                    cursor: pointer;
                    transition: background 0.2s;
                    margin-top: 8px;
                }
                .redflag-btn:hover {
                    background: #f9fafb;
                }
            `}</style>

            <div className="nutrition-container">
                {/* Z-Score Cards */}
                <div className="zscore-grid">
                    {/* BB/U */}
                    <div className="zscore-card">
                        <p className="zscore-label">Z-Score BB/U</p>
                        <p className="zscore-value">{avgBBU.toFixed(2)} SD</p>
                        <span
                            className="zscore-badge"
                            style={{ background: bbuStatus.bg, color: bbuStatus.color }}
                        >
                            {bbuStatus.label}
                        </span>
                    </div>

                    {/* TB/U */}
                    <div className="zscore-card">
                        <p className="zscore-label">Z-Score TB/U</p>
                        <p className="zscore-value">{avgTBU.toFixed(2)} SD</p>
                        <span
                            className="zscore-badge"
                            style={{ background: tbuStatus.bg, color: tbuStatus.color }}
                        >
                            {tbuStatus.label}
                        </span>
                    </div>

                    {/* BB/TB */}
                    <div className="zscore-card">
                        <p className="zscore-label">Z-Score BB/TB</p>
                        <p className="zscore-value">{avgBBTB.toFixed(2)} SD</p>
                        <span
                            className="zscore-badge"
                            style={{ background: bbtbStatus.bg, color: bbtbStatus.color }}
                        >
                            {bbtbStatus.label}
                        </span>
                    </div>

                    {/* Delta BB */}
                    <div className="zscore-card">
                        <p className="zscore-label">Delta BB</p>
                        <p className="zscore-value">
                            {avgDeltaBB >= 0 ? "+" : ""}{avgDeltaBB.toFixed(3)} kg
                        </p>
                        <span
                            className="zscore-badge"
                            style={{ background: deltaStatus.bg, color: deltaStatus.color }}
                        >
                            {deltaStatus.label}
                        </span>
                    </div>
                </div>

                {/* Red Flag Banner */}
                <div
                    className="redflag-banner"
                    style={{
                        background: redFlagLevel.bg,
                        borderColor: redFlagLevel.border
                    }}
                >
                    <div
                        className="redflag-icon"
                        style={{ background: redFlagLevel.color }}
                    >
                        <AlertTriangle size={28} color="white" />
                    </div>
                    <div className="redflag-content">
                        <div className="redflag-stats">
                            <span
                                className="redflag-value"
                                style={{ color: redFlagLevel.color }}
                            >
                                {redFlagPercentage.toFixed(1)}%
                            </span>
                            <span className="redflag-label">Red Flags Terdeteksi</span>
                        </div>
                        <p
                            className="redflag-desc"
                            style={{ color: redFlagLevel.color }}
                        >
                            {redFlagPercentage > 20
                                ? "⚠️ Tingkat red flag tinggi - perlu perhatian segera"
                                : redFlagPercentage > 10
                                    ? "⚠️ Tingkat red flag sedang - monitoring diperlukan"
                                    : "✓ Tingkat red flag rendah - kondisi terkendali"}
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
