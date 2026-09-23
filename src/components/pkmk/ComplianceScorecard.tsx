"use client";
import { Users, CheckCircle, TrendingUp, ArrowUpRight, Target } from "lucide-react";

interface ComplianceScorecardProps {
    totalBalita: number;
    kohortInput: number;
    compliancePercentage: number;
    loading?: boolean;
}

export default function ComplianceScorecard({
    totalBalita,
    kohortInput,
    compliancePercentage,
    loading = false,
}: ComplianceScorecardProps) {
    if (loading) {
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                {[1, 2, 3].map((i) => (
                    <div key={i} style={{ background: '#f1f5f9', borderRadius: 16, height: 160, animation: 'pulse 2s infinite' }} />
                ))}
            </div>
        );
    }

    const getComplianceColor = () => {
        if (compliancePercentage >= 75) return { main: "#10b981", light: "#ecfdf5", text: "#065f46", gradient: "linear-gradient(135deg, #10b981, #059669)" };
        if (compliancePercentage >= 50) return { main: "#f59e0b", light: "#fffbeb", text: "#92400e", gradient: "linear-gradient(135deg, #f59e0b, #d97706)" };
        return { main: "#ef4444", light: "#fef2f2", text: "#991b1b", gradient: "linear-gradient(135deg, #ef4444, #dc2626)" };
    };

    const complianceColors = getComplianceColor();
    const targetPercentage = 85;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {/* Total Balita */}
            <div style={{
                background: 'white',
                borderRadius: 16,
                padding: 24,
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                position: 'relative',
                overflow: 'hidden',
            }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.05))', borderRadius: '50%' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                    }}>
                        <Users color="white" size={24} />
                    </div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#ecfdf5', color: '#059669', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                        <ArrowUpRight size={12} />
                        Aktif
                    </span>
                </div>
                <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 4 }}>Total Balita</p>
                <p style={{ fontSize: 36, fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.1 }}>{totalBalita.toLocaleString()}</p>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>Terdaftar dalam program PKMK</p>
            </div>

            {/* Kohort Terinput */}
            <div style={{
                background: 'white',
                borderRadius: 16,
                padding: 24,
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                position: 'relative',
                overflow: 'hidden',
            }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))', borderRadius: '50%' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    }}>
                        <CheckCircle color="white" size={24} />
                    </div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#f0fdf4', color: '#16a34a', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                        <CheckCircle size={12} />
                        Verified
                    </span>
                </div>
                <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 4 }}>Kohort Terinput</p>
                <p style={{ fontSize: 36, fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.1 }}>{kohortInput.toLocaleString()}</p>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>Data lengkap bulan ini</p>
            </div>

            {/* Tingkat Compliance */}
            <div style={{
                background: 'white',
                borderRadius: 16,
                padding: 24,
                border: `2px solid ${complianceColors.main}30`,
                boxShadow: `0 4px 12px ${complianceColors.main}15`,
                position: 'relative',
                overflow: 'hidden',
            }}>
                <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: `linear-gradient(135deg, ${complianceColors.main}15, ${complianceColors.main}05)`, borderRadius: '50%' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        background: complianceColors.gradient,
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 4px 12px ${complianceColors.main}40`,
                    }}>
                        <TrendingUp color="white" size={24} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: complianceColors.light, color: complianceColors.text, borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                        <Target size={12} />
                        Target {targetPercentage}%
                    </div>
                </div>
                <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 4 }}>Tingkat Compliance</p>
                <p style={{ fontSize: 40, fontWeight: 900, color: complianceColors.main, margin: 0, lineHeight: 1.1 }}>{compliancePercentage.toFixed(1)}%</p>

                {/* Enhanced Progress Bar */}
                <div style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Progress</span>
                        <span style={{ fontSize: 11, color: complianceColors.text, fontWeight: 600 }}>{kohortInput}/{totalBalita}</span>
                    </div>
                    <div style={{ position: 'relative', height: 12, background: '#f1f5f9', borderRadius: 8, overflow: 'hidden' }}>
                        {/* Target marker */}
                        <div style={{
                            position: 'absolute',
                            left: `${targetPercentage}%`,
                            top: 0,
                            bottom: 0,
                            width: 2,
                            background: '#6b7280',
                            zIndex: 2,
                        }} />
                        {/* Progress fill */}
                        <div style={{
                            height: '100%',
                            width: `${Math.min(compliancePercentage, 100)}%`,
                            background: complianceColors.gradient,
                            borderRadius: 8,
                            transition: 'width 0.5s ease',
                            position: 'relative',
                        }}>
                            <div style={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                bottom: 0,
                                width: 20,
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3))',
                            }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>0%</span>
                        <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>Target: {targetPercentage}%</span>
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>100%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
