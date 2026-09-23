"use client";
import { Ruler, Utensils, Pill, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface ComplianceData {
    monitored: number;
    percentage: number;
}

interface MonitoringComplianceScorecardProps {
    totalBalita: number;
    data: {
        antropometri: ComplianceData;
        konsumsi: ComplianceData;
        pemberian: ComplianceData;
    };
    loading?: boolean;
}

export default function MonitoringComplianceScorecard({
    totalBalita,
    data,
    loading = false,
}: MonitoringComplianceScorecardProps) {
    if (loading) {
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                {[1, 2, 3].map((i) => (
                    <div key={i} style={{ background: '#f1f5f9', borderRadius: 16, height: 180, animation: 'pulse 2s infinite' }} />
                ))}
            </div>
        );
    }

    const getStatusColor = (percentage: number) => {
        if (percentage >= 80) return { main: "#10b981", light: "#ecfdf5", text: "#065f46", status: "Baik", icon: ArrowUpRight };
        if (percentage >= 60) return { main: "#f59e0b", light: "#fffbeb", text: "#92400e", status: "Cukup", icon: TrendingUp };
        return { main: "#ef4444", light: "#fef2f2", text: "#991b1b", status: "Perlu Ditingkatkan", icon: ArrowDownRight };
    };

    const cards = [
        {
            title: "Antropometri",
            icon: Ruler,
            value: data?.antropometri?.monitored || 0,
            percentage: data?.antropometri?.percentage || 0,
            gradient: "linear-gradient(135deg, #3b82f6, #2563eb)",
            shadow: "rgba(59, 130, 246, 0.3)",
            light: "#eff6ff",
            accent: "#1d4ed8",
            badge: "Mingguan",
        },
        {
            title: "Konsumsi",
            icon: Utensils,
            value: data?.konsumsi?.monitored || 0,
            percentage: data?.konsumsi?.percentage || 0,
            gradient: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
            shadow: "rgba(139, 92, 246, 0.3)",
            light: "#f5f3ff",
            accent: "#6d28d9",
            badge: "Harian",
        },
        {
            title: "Pemberian",
            icon: Pill,
            value: data?.pemberian?.monitored || 0,
            percentage: data?.pemberian?.percentage || 0,
            gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
            shadow: "rgba(245, 158, 11, 0.3)",
            light: "#fffbeb",
            accent: "#b45309",
            badge: "Stock",
        },
    ];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {cards.map((card, index) => {
                const IconComponent = card.icon;
                const statusColors = getStatusColor(card.percentage);
                const StatusIcon = statusColors.icon;

                return (
                    <div key={index} style={{
                        background: 'white',
                        borderRadius: 16,
                        padding: 24,
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        {/* Decorative background */}
                        <div style={{
                            position: 'absolute',
                            top: -30,
                            right: -30,
                            width: 120,
                            height: 120,
                            background: `linear-gradient(135deg, ${card.accent}15, ${card.accent}05)`,
                            borderRadius: '50%',
                        }} />

                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <div style={{
                                width: 48,
                                height: 48,
                                background: card.gradient,
                                borderRadius: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: `0 4px 12px ${card.shadow}`,
                            }}>
                                <IconComponent color="white" size={24} />
                            </div>
                            <span style={{
                                padding: '4px 10px',
                                background: card.light,
                                color: card.accent,
                                borderRadius: 20,
                                fontSize: 11,
                                fontWeight: 700,
                            }}>
                                {card.badge}
                            </span>
                        </div>

                        {/* Title */}
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 12 }}>{card.title}</p>

                        {/* Main Stats */}
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 16 }}>
                            <span style={{ fontSize: 36, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{card.percentage.toFixed(1)}%</span>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 8px',
                                background: statusColors.light,
                                borderRadius: 6,
                                marginBottom: 4,
                            }}>
                                <StatusIcon size={12} color={statusColors.main} />
                                <span style={{ fontSize: 10, fontWeight: 600, color: statusColors.main }}>{statusColors.status}</span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ marginBottom: 12 }}>
                            <div style={{
                                height: 10,
                                background: '#f1f5f9',
                                borderRadius: 8,
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${Math.min(card.percentage, 100)}%`,
                                    background: card.gradient,
                                    borderRadius: 8,
                                    transition: 'width 0.5s ease',
                                    position: 'relative',
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: 15,
                                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4))',
                                    }} />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: '#64748b' }}>
                                <strong style={{ color: '#1f2937' }}>{card.value}</strong> / {totalBalita} balita
                            </span>
                            <span style={{
                                fontSize: 11,
                                color: statusColors.main,
                                fontWeight: 600,
                            }}>
                                {card.value > 0 ? `+${card.value} monitored` : 'Belum ada data'}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
