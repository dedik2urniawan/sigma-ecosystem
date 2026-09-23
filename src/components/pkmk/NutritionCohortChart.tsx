"use client";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell, ComposedChart, Area } from "recharts";
import { ChevronDown, ChevronUp, TrendingUp, Filter, Activity, Scale } from "lucide-react";

interface MonthData {
    month: string;
    monthKey: string;
    avg_bbu: number | null;
    avg_tbu: number | null;
    avg_bbtb: number | null;
    avg_delta_bb: number | null;
    total_entries: number;
}

interface NutritionCohortChartProps {
    data: MonthData[];
    loading?: boolean;
}

const INDEX_COLORS = {
    bbu: "#3b82f6",  // Blue
    tbu: "#10b981",  // Green
    bbtb: "#f59e0b", // Orange
};

export default function NutritionCohortChart({ data, loading = false }: NutritionCohortChartProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedIndices, setSelectedIndices] = useState<string[]>(["bbu", "tbu", "bbtb"]);

    const toggleIndex = (index: string) => {
        if (selectedIndices.includes(index)) {
            if (selectedIndices.length > 1) {
                setSelectedIndices(selectedIndices.filter(i => i !== index));
            }
        } else {
            setSelectedIndices([...selectedIndices, index]);
        }
    };

    const selectAll = () => {
        setSelectedIndices(["bbu", "tbu", "bbtb"]);
    };

    // Transform data for chart
    const chartData = data.map(item => ({
        month: item.month,
        "Z-Score BB/U": item.avg_bbu,
        "Z-Score TB/U": item.avg_tbu,
        "Z-Score BB/TB": item.avg_bbtb,
        entries: item.total_entries,
    }));

    // Delta BB chart data
    const deltaData = data.map(item => ({
        month: item.month,
        "Delta BB": item.avg_delta_bb,
        positive: item.avg_delta_bb !== null && item.avg_delta_bb >= 0,
    }));

    if (loading) {
        return (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24, marginTop: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, background: '#e5e7eb', borderRadius: 8, animation: 'pulse 2s infinite' }} />
                    <div style={{ flex: 1, height: 24, background: '#e5e7eb', borderRadius: 4, animation: 'pulse 2s infinite' }} />
                </div>
            </div>
        );
    }

    const hasData = data && data.length > 0;

    return (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', marginTop: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {/* Toggle Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 24px',
                    background: isExpanded ? 'linear-gradient(135deg, #f0f9ff, #e0f2fe)' : '#f9fafb',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 40,
                        height: 40,
                        background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(14, 165, 233, 0.3)',
                    }}>
                        <TrendingUp color="white" size={20} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                            📊 Grafik Cohort Status Gizi
                        </h3>
                        <p style={{ fontSize: 12, color: '#64748b', margin: 0, marginTop: 2 }}>
                            Trend rata-rata Z-Score dan Delta BB per bulan
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{isExpanded ? 'Tutup' : 'Lihat Grafik'}</span>
                    {isExpanded ? <ChevronUp size={20} color="#64748b" /> : <ChevronDown size={20} color="#64748b" />}
                </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div style={{ padding: 24, borderTop: '1px solid #e5e7eb' }}>
                    {!hasData ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                            <TrendingUp size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                            <p style={{ fontSize: 16, fontWeight: 600 }}>Belum Ada Data</p>
                            <p style={{ fontSize: 14, marginTop: 8 }}>Data monitoring akan muncul di sini setelah ada entry</p>
                        </div>
                    ) : (
                        <>
                            {/* Filter Buttons */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Filter size={16} color="#64748b" />
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Filter Indeks:</span>
                                </div>
                                <button
                                    onClick={selectAll}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: 20,
                                        border: selectedIndices.length === 3 ? '2px solid #3b82f6' : '1px solid #d1d5db',
                                        background: selectedIndices.length === 3 ? '#eff6ff' : 'white',
                                        color: selectedIndices.length === 3 ? '#1d4ed8' : '#6b7280',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    Semua
                                </button>
                                {[
                                    { key: 'bbu', label: 'BB/U', color: INDEX_COLORS.bbu },
                                    { key: 'tbu', label: 'TB/U', color: INDEX_COLORS.tbu },
                                    { key: 'bbtb', label: 'BB/TB', color: INDEX_COLORS.bbtb },
                                ].map(idx => (
                                    <button
                                        key={idx.key}
                                        onClick={() => toggleIndex(idx.key)}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: 20,
                                            border: selectedIndices.includes(idx.key) ? `2px solid ${idx.color}` : '1px solid #d1d5db',
                                            background: selectedIndices.includes(idx.key) ? `${idx.color}15` : 'white',
                                            color: selectedIndices.includes(idx.key) ? idx.color : '#6b7280',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                        }}
                                    >
                                        <div style={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: '50%',
                                            background: idx.color,
                                        }} />
                                        {idx.label}
                                    </button>
                                ))}
                            </div>

                            {/* Z-Score WHO Chart */}
                            <div style={{ background: '#fafafa', borderRadius: 12, padding: 20, marginBottom: 24 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                    <Activity size={18} color="#6366f1" />
                                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: 0 }}>
                                        Trend Z-Score Rata-rata (WHO Chart Style)
                                    </h4>
                                </div>
                                <ResponsiveContainer width="100%" height={320}>
                                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                                        <defs>
                                            <linearGradient id="zoneNormal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.1} />
                                                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                                            </linearGradient>
                                            <linearGradient id="zoneWarning" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.1} />
                                                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
                                            </linearGradient>
                                            <linearGradient id="zoneDanger" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                                                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: 11, fontWeight: 500 }} />
                                        <YAxis domain={[-4, 2]} stroke="#6b7280" style={{ fontSize: 11 }} tickCount={7} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }}
                                            formatter={(value: any) => (value !== null && typeof value === 'number' ? `${value.toFixed(2)} SD` : 'N/A') as any}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: 16, fontSize: 12 }} iconType="line" />

                                        {/* Reference zones */}
                                        <ReferenceLine y={0} stroke="#22c55e" strokeWidth={1} strokeDasharray="5 5" />
                                        <ReferenceLine y={-2} stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" label={{ value: '-2 SD', position: 'right', fontSize: 10, fill: '#f59e0b' }} />
                                        <ReferenceLine y={-3} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" label={{ value: '-3 SD', position: 'right', fontSize: 10, fill: '#ef4444' }} />

                                        {selectedIndices.includes('bbu') && (
                                            <Line type="monotone" dataKey="Z-Score BB/U" stroke={INDEX_COLORS.bbu} strokeWidth={3} dot={{ fill: INDEX_COLORS.bbu, r: 5 }} activeDot={{ r: 7 }} connectNulls />
                                        )}
                                        {selectedIndices.includes('tbu') && (
                                            <Line type="monotone" dataKey="Z-Score TB/U" stroke={INDEX_COLORS.tbu} strokeWidth={3} dot={{ fill: INDEX_COLORS.tbu, r: 5 }} activeDot={{ r: 7 }} connectNulls />
                                        )}
                                        {selectedIndices.includes('bbtb') && (
                                            <Line type="monotone" dataKey="Z-Score BB/TB" stroke={INDEX_COLORS.bbtb} strokeWidth={3} dot={{ fill: INDEX_COLORS.bbtb, r: 5 }} activeDot={{ r: 7 }} connectNulls />
                                        )}
                                    </ComposedChart>
                                </ResponsiveContainer>
                                <div style={{ marginTop: 12, padding: 12, background: '#f1f5f9', borderRadius: 8 }}>
                                    <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>
                                        <strong>Interpretasi WHO:</strong> &gt; -1 SD = Normal | -2 s/d -1 SD = Kurang | &lt; -2 SD = Buruk/Pendek/Kurus | &lt; -3 SD = Sangat Buruk
                                    </p>
                                </div>
                            </div>

                            {/* Delta BB Chart */}
                            <div style={{ background: '#fafafa', borderRadius: 12, padding: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                    <Scale size={18} color="#8b5cf6" />
                                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: 0 }}>
                                        Trend Delta BB Rata-rata
                                    </h4>
                                </div>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={deltaData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: 11, fontWeight: 500 }} />
                                        <YAxis stroke="#6b7280" style={{ fontSize: 11 }} tickFormatter={(v) => `${v} kg`} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }}
                                            formatter={(value: any) => (value !== null && typeof value === 'number' ? `${value.toFixed(3)} kg` : 'N/A') as any}
                                        />
                                        <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} />
                                        <Bar dataKey="Delta BB" radius={[4, 4, 0, 0]}>
                                            {deltaData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.positive ? '#22c55e' : '#ef4444'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                                <div style={{ marginTop: 12, padding: 12, background: '#f1f5f9', borderRadius: 8 }}>
                                    <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>
                                        <strong>Interpretasi:</strong> <span style={{ color: '#22c55e' }}>■ Positif</span> = Berat badan naik | <span style={{ color: '#ef4444' }}>■ Negatif</span> = Berat badan turun
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
