"use client";
import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { AlertTriangle, TrendingDown, Activity, ChevronDown, ChevronUp } from "lucide-react";

interface RedFlagData {
    name: string;
    value: number;
    percentage: number;
    [key: string]: string | number;
}

interface RedFlagPieChartProps {
    data: RedFlagData[];
    totalWithRedFlag: number;
    loading?: boolean;
}

const COLORS = [
    { main: "#ef4444", light: "#fef2f2", text: "#991b1b" },   // Red
    { main: "#f59e0b", light: "#fffbeb", text: "#92400e" },   // Amber
    { main: "#10b981", light: "#ecfdf5", text: "#065f46" },   // Green
    { main: "#06b6d4", light: "#ecfeff", text: "#155e75" },   // Cyan
    { main: "#8b5cf6", light: "#f5f3ff", text: "#5b21b6" },   // Purple
    { main: "#ec4899", light: "#fdf2f8", text: "#9d174d" },   // Pink
    { main: "#f97316", light: "#fff7ed", text: "#9a3412" },   // Orange
];


export default function RedFlagPieChart({ data, totalWithRedFlag, loading = false }: RedFlagPieChartProps) {
    const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
    const [isExpanded, setIsExpanded] = useState(true);

    const onPieEnter = (_: any, index: number) => setActiveIndex(index);
    const onPieLeave = () => setActiveIndex(undefined);

    if (loading) {
        return (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
                <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 48, height: 48, border: '3px solid #ef4444', borderTop: '3px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
            </div>
        );
    }

    const hasData = data && data.length > 0;
    const sortedData = [...(data || [])].sort((a, b) => b.value - a.value);
    const topItem = sortedData[0];

    return (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 44,
                        height: 44,
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                    }}>
                        <AlertTriangle color="white" size={22} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>Distribusi Red Flag</h3>
                        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Persentase jenis red flag terdeteksi</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        background: '#fef2f2',
                        color: '#dc2626',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {isExpanded ? 'Sembunyikan' : 'Tampilkan'}
                </button>
            </div>

            {isExpanded && (
                <>
                    {/* Summary Cards */}
                    <div style={{ padding: '16px 24px', background: '#fafafa', borderBottom: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                        <div style={{ background: 'white', borderRadius: 10, padding: 16, border: '1px solid #fee2e2', boxShadow: '0 1px 3px rgba(239,68,68,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <AlertTriangle size={16} color="#ef4444" />
                                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Total Kasus</span>
                            </div>
                            <p style={{ fontSize: 28, fontWeight: 800, color: '#ef4444', margin: 0 }}>{totalWithRedFlag}</p>
                            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Balita dengan red flag</p>
                        </div>
                        <div style={{ background: 'white', borderRadius: 10, padding: 16, border: '1px solid #fef3c7', boxShadow: '0 1px 3px rgba(245,158,11,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <Activity size={16} color="#f59e0b" />
                                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Jenis Red Flag</span>
                            </div>
                            <p style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b', margin: 0 }}>{data?.length || 0}</p>
                            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Kategori terdeteksi</p>
                        </div>
                        <div style={{ background: 'white', borderRadius: 10, padding: 16, border: '1px solid #fee2e2', boxShadow: '0 1px 3px rgba(239,68,68,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <TrendingDown size={16} color="#ef4444" />
                                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Tertinggi</span>
                            </div>
                            <p style={{ fontSize: 20, fontWeight: 800, color: '#ef4444', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {topItem?.name || '-'}
                            </p>
                            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{topItem ? `${topItem.percentage}% (${topItem.value} kasus)` : '-'}</p>
                        </div>
                    </div>

                    {/* Chart & Legend */}
                    <div style={{ padding: 24 }}>
                        {!hasData ? (
                            <div style={{ height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                <AlertTriangle size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                                <p style={{ fontSize: 16, fontWeight: 600 }}>Tidak Ada Red Flag</p>
                                <p style={{ fontSize: 13, marginTop: 8 }}>Tidak ada red flag terdeteksi pada periode ini 🎉</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'center' }}>
                                {/* Pie Chart */}
                                <div style={{ height: 280 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={sortedData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={activeIndex !== undefined ? 105 : 100}
                                                paddingAngle={2}
                                                dataKey="value"
                                                onMouseEnter={onPieEnter}
                                                onMouseLeave={onPieLeave}
                                            >
                                                {sortedData.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={COLORS[index % COLORS.length].main}
                                                        stroke="white"
                                                        strokeWidth={2}
                                                        style={{
                                                            opacity: activeIndex === undefined || activeIndex === index ? 1 : 0.5,
                                                            transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                                                            transformOrigin: 'center',
                                                            transition: 'all 0.2s ease',
                                                        }}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value: any, name: any, props: any) => [
                                                    `${value} kasus (${props.payload?.percentage}%)`,
                                                    name,
                                                ] as any}
                                                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    {/* Center Label */}
                                    <div style={{ position: 'relative', marginTop: -170, textAlign: 'center', pointerEvents: 'none' }}>
                                        <p style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0 }}>{totalWithRedFlag}</p>
                                        <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Total Kasus</p>
                                    </div>
                                </div>

                                {/* Legend */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {sortedData.map((item, idx) => (
                                        <div
                                            key={item.name}
                                            onMouseEnter={() => setActiveIndex(idx)}
                                            onMouseLeave={() => setActiveIndex(undefined)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                padding: '12px 16px',
                                                background: activeIndex === idx ? COLORS[idx % COLORS.length].light : '#f9fafb',
                                                borderRadius: 10,
                                                border: `2px solid ${activeIndex === idx ? COLORS[idx % COLORS.length].main : 'transparent'}`,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            <div style={{
                                                width: 12,
                                                height: 12,
                                                borderRadius: '50%',
                                                background: COLORS[idx % COLORS.length].main,
                                                flexShrink: 0,
                                            }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {item.name}
                                                </p>
                                            </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: COLORS[idx % COLORS.length].main }}>{item.value}</span>
                                                <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>({item.percentage}%)</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {hasData && (
                        <div style={{ padding: '12px 24px', background: '#fef2f2', borderTop: '1px solid #fecaca' }}>
                            <p style={{ fontSize: 12, color: '#991b1b', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <AlertTriangle size={14} />
                                <strong>Perhatian:</strong> Total {totalWithRedFlag} balita terdeteksi memiliki minimal 1 red flag yang memerlukan penanganan
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
