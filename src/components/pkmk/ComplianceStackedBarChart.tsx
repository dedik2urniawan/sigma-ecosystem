"use client";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Ruler, Utensils, Pill, ArrowLeft, Filter, ChevronDown, ChevronUp, Search, Check, X } from "lucide-react";

interface ComplianceStackedBarChartProps {
    title: string;
    data: any[];
    type: 'antropometri' | 'konsumsi' | 'pemberian';
    loading?: boolean;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];

const TYPE_CONFIG = {
    antropometri: {
        icon: Ruler,
        gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        shadow: 'rgba(59, 130, 246, 0.3)',
        light: '#eff6ff',
        accent: '#1d4ed8',
    },
    konsumsi: {
        icon: Utensils,
        gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        shadow: 'rgba(139, 92, 246, 0.3)',
        light: '#f5f3ff',
        accent: '#6d28d9',
    },
    pemberian: {
        icon: Pill,
        gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
        shadow: 'rgba(245, 158, 11, 0.3)',
        light: '#fffbeb',
        accent: '#b45309',
    },
};

export default function ComplianceStackedBarChart({ title, data, type, loading = false }: ComplianceStackedBarChartProps) {
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
    const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
    const [filterOpen, setFilterOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [initialized, setInitialized] = useState(false);

    const config = TYPE_CONFIG[type];
    const IconComponent = config.icon;

    // Initialize selected locations
    if (!initialized && data && data.length > 0) {
        setSelectedLocations(data.slice(0, 8).map((d: any) => d.id));
        setInitialized(true);
    }

    const filteredData = useMemo(() => {
        if (!searchQuery) return data;
        return data.filter((loc: any) => loc.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [data, searchQuery]);

    // Determine what to display based on drill-down state
    const displayData = useMemo(() => {
        if (selectedLocation) {
            const parent = data.find((d: any) => d.id === selectedLocation);
            if (parent && parent.children) {
                return parent.children.map((child: any) => ({
                    name: child.name,
                    monitored: child[type]?.monitored || 0,
                    notMonitored: (child.totalBalita || 0) - (child[type]?.monitored || 0),
                    percentage: child[type]?.percentage || 0,
                    total: child.totalBalita || 0,
                    id: child.id,
                    hasChildren: false,
                }));
            }
            return [];
        }
        return data.filter((d: any) => selectedLocations.includes(d.id)).map((loc: any) => ({
            name: loc.name,
            monitored: loc[type]?.monitored || 0,
            notMonitored: (loc.totalBalita || 0) - (loc[type]?.monitored || 0),
            percentage: loc[type]?.percentage || 0,
            total: loc.totalBalita || 0,
            hasChildren: loc.children && loc.children.length > 0,
            id: loc.id,
        }));
    }, [data, selectedLocation, selectedLocations, type]);

    const toggleLocation = (id: string) => {
        if (selectedLocations.includes(id)) {
            setSelectedLocations(selectedLocations.filter(l => l !== id));
        } else {
            setSelectedLocations([...selectedLocations, id]);
        }
    };

    const selectAll = () => setSelectedLocations(data.map((d: any) => d.id));
    const clearAll = () => setSelectedLocations([]);

    const handleBarClick = (barData: any) => {
        const item = barData?.payload || barData;
        if (item && item.hasChildren && !selectedLocation) {
            setSelectedLocation(item.id);
        }
    };

    const handleBack = () => setSelectedLocation(null);

    const canDrillDown = !selectedLocation && displayData.some((d: any) => d.hasChildren);
    const hasData = data && data.length > 0;
    const chartHeight = Math.max(350, displayData.length * 45);

    const getBarColor = (percentage: number) => {
        if (percentage >= 80) return "#10b981";
        if (percentage >= 60) return "#f59e0b";
        return "#ef4444";
    };

    if (loading) {
        return (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
                <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 48, height: 48, border: `3px solid ${config.accent}`, borderTop: '3px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
            </div>
        );
    }

    return (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, background: config.gradient, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${config.shadow}` }}>
                        <IconComponent color="white" size={22} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                                {selectedLocation ? `${title} - ${data.find((d: any) => d.id === selectedLocation)?.name || ''}` : title}
                            </h3>
                            {selectedLocation && (
                                <span style={{ padding: '2px 8px', background: config.light, color: config.accent, borderRadius: 12, fontSize: 10, fontWeight: 600 }}>
                                    Level Desa
                                </span>
                            )}
                        </div>
                        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                            {selectedLocation ? 'Detail monitoring per desa' : 'Detail per Puskesmas'}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {selectedLocation && (
                        <button onClick={handleBack}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            <ArrowLeft size={16} />
                            Kembali
                        </button>
                    )}

                    {hasData && !selectedLocation && (
                        <div style={{ position: 'relative' }}>
                            <button onClick={() => setFilterOpen(!filterOpen)}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: filterOpen ? config.accent : 'white', color: filterOpen ? 'white' : '#374151', border: `2px solid ${filterOpen ? config.accent : '#e5e7eb'}`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: filterOpen ? `0 4px 12px ${config.shadow}` : 'none' }}>
                                <Filter size={16} />
                                Filter
                                <span style={{ background: filterOpen ? 'rgba(255,255,255,0.2)' : '#e5e7eb', color: filterOpen ? 'white' : '#374151', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{selectedLocations.length}/{data.length}</span>
                                {filterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>

                            {filterOpen && (
                                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 300, maxHeight: 420, background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ position: 'relative' }}>
                                            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                            <input type="text" placeholder="Cari lokasi..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px 12px 10px 40px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                                        </div>
                                    </div>
                                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
                                        <button onClick={selectAll} style={{ flex: 1, padding: '8px 12px', background: config.light, color: config.accent, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Pilih Semua</button>
                                        <button onClick={clearAll} style={{ flex: 1, padding: '8px 12px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Hapus Semua</button>
                                    </div>
                                    <div style={{ flex: 1, maxHeight: 240, overflowY: 'auto', padding: 8 }}>
                                        {filteredData.map((loc: any, idx: number) => {
                                            const isSelected = selectedLocations.includes(loc.id);
                                            return (
                                                <button key={loc.id} onClick={() => toggleLocation(loc.id)}
                                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: isSelected ? config.light : 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' }}>
                                                    <div style={{ width: 20, height: 20, borderRadius: 4, border: isSelected ? 'none' : '2px solid #d1d5db', background: isSelected ? COLORS[idx % COLORS.length] : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        {isSelected && <Check size={14} color="white" strokeWidth={3} />}
                                                    </div>
                                                    <span style={{ fontSize: 13, color: '#374151', fontWeight: isSelected ? 600 : 400, flex: 1 }}>{loc.name}</span>
                                                    <span style={{ fontSize: 11, color: getBarColor(loc[type]?.percentage || 0), fontWeight: 600 }}>{(loc[type]?.percentage || 0).toFixed(0)}%</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div style={{ padding: 12, borderTop: '1px solid #f1f5f9', background: '#f9fafb' }}>
                                        <button onClick={() => setFilterOpen(false)} style={{ width: '100%', padding: '10px 16px', background: config.accent, color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Terapkan Filter</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Selected Chips */}
            {!selectedLocation && selectedLocations.length > 0 && selectedLocations.length <= 6 && (
                <div style={{ padding: '12px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: 8, background: '#f9fafb' }}>
                    {selectedLocations.slice(0, 6).map((id) => {
                        const loc = data.find((d: any) => d.id === id);
                        if (!loc) return null;
                        const idx = data.findIndex((d: any) => d.id === id);
                        return (
                            <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'white', border: `2px solid ${COLORS[idx % COLORS.length]}`, borderRadius: 20, fontSize: 11, fontWeight: 600, color: COLORS[idx % COLORS.length] }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[idx % COLORS.length] }} />
                                {loc.name.length > 10 ? loc.name.slice(0, 10) + '...' : loc.name}
                                <button onClick={() => toggleLocation(id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}><X size={12} color={COLORS[idx % COLORS.length]} /></button>
                            </span>
                        );
                    })}
                    {selectedLocations.length > 6 && <span style={{ padding: '6px 10px', background: '#e5e7eb', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#6b7280' }}>+{selectedLocations.length - 6}</span>}
                </div>
            )}

            {/* Chart */}
            <div style={{ padding: 24 }}>
                {!hasData || displayData.length === 0 ? (
                    <div style={{ height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                        <IconComponent size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                        <p style={{ fontSize: 16, fontWeight: 600 }}>Tidak Ada Data</p>
                        <p style={{ fontSize: 13, marginTop: 8 }}>Pilih lokasi untuk melihat data</p>
                    </div>
                ) : (
                    <>
                        <ResponsiveContainer width="100%" height={chartHeight}>
                            <BarChart layout="vertical" data={displayData} margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11, fontWeight: 500, fill: '#64748b' }} interval={0} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    formatter={(value: any, name: any, props: any) => {
                                        if (name === 'monitored') return [`${value} Balita (${props.payload.percentage.toFixed(1)}%)`, 'Sudah Monitor'];
                                        return [`${value} Balita`, 'Belum Monitor'];
                                    }}
                                />
                                <Legend verticalAlign="top" height={36} formatter={(value) => value === 'monitored' ? 'Sudah Monitor' : 'Belum Monitor'} iconType="rect" iconSize={10} wrapperStyle={{ fontSize: 12, fontWeight: 500 }} />
                                <Bar dataKey="monitored" stackId="a" barSize={28} radius={[0, 0, 0, 0]} onClick={handleBarClick} cursor={canDrillDown ? 'pointer' : 'default'}>
                                    {displayData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={getBarColor(entry.percentage)} />
                                    ))}
                                </Bar>
                                <Bar dataKey="notMonitored" stackId="a" fill="#e5e7eb" barSize={28} radius={[4, 4, 4, 4]} onClick={handleBarClick} cursor={canDrillDown ? 'pointer' : 'default'} />
                            </BarChart>
                        </ResponsiveContainer>

                        <div style={{ marginTop: 16, padding: 12, background: config.light, borderLeft: `4px solid ${config.accent}`, borderRadius: 4 }}>
                            <p style={{ fontSize: 11, color: config.accent, margin: 0 }}>
                                <strong>Interpretasi:</strong> ≥80% (Baik) | 60-79% (Cukup) | &lt;60% (Perlu Perhatian)
                                {canDrillDown && <span style={{ marginLeft: 8 }}>• Klik bar untuk lihat detail desa</span>}
                            </p>
                        </div>
                    </>
                )}
            </div>

            {filterOpen && <div onClick={() => setFilterOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'transparent', zIndex: 50 }} />}
        </div>
    );
}
