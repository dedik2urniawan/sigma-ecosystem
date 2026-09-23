"use client";
import { useState, useMemo } from "react";
import { Building2, MapPin, ChevronDown, ChevronUp, Filter, Search, Check, X, ArrowLeft } from "lucide-react";

interface LocationData {
    id: string;
    name: string;
    percentage: number;
    total: number;
    kohort: number;
    children?: LocationData[];
}

interface ComplianceDrilldownChartProps {
    data: LocationData[];
    level: "puskesmas" | "desa";
    loading?: boolean;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];

export default function ComplianceDrilldownChart({ data, level, loading = false }: ComplianceDrilldownChartProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
    const [filterOpen, setFilterOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [initialized, setInitialized] = useState(false);

    // Initialize selected locations
    if (!initialized && data && data.length > 0) {
        setSelectedLocations(data.slice(0, 8).map(d => d.id));
        setInitialized(true);
    }

    const filteredSearchData = useMemo(() => {
        if (!searchQuery) return data;
        return data.filter(loc => loc.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [data, searchQuery]);

    const displayData = useMemo(() => {
        return data.filter(d => selectedLocations.includes(d.id));
    }, [data, selectedLocations]);

    const toggleLocation = (id: string) => {
        if (selectedLocations.includes(id)) {
            setSelectedLocations(selectedLocations.filter(l => l !== id));
        } else {
            setSelectedLocations([...selectedLocations, id]);
        }
    };

    const selectAll = () => setSelectedLocations(data.map(d => d.id));
    const clearAll = () => setSelectedLocations([]);

    const getColor = (percentage: number) => {
        if (percentage >= 75) return { bar: "#10b981", bg: "#ecfdf5", text: "#065f46" };
        if (percentage >= 50) return { bar: "#f59e0b", bg: "#fffbeb", text: "#92400e" };
        return { bar: "#ef4444", bg: "#fef2f2", text: "#991b1b" };
    };

    const handleBarClick = (entry: LocationData) => {
        if (entry.children && entry.children.length > 0) {
            setExpandedId(expandedId === entry.id ? null : entry.id);
        }
    };

    if (loading) {
        return (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
                <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 48, height: 48, border: '3px solid #14b8a6', borderTop: '3px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
            </div>
        );
    }

    const hasData = data && data.length > 0;

    return (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 44,
                        height: 44,
                        background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
                    }}>
                        {level === "puskesmas" ? <Building2 color="white" size={22} /> : <MapPin color="white" size={22} />}
                    </div>
                    <div>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                            Compliance by {level === "puskesmas" ? "Puskesmas" : "Desa"}
                        </h3>
                        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                            {level === "puskesmas" ? "Klik untuk melihat breakdown per desa" : "Detail compliance per desa"}
                        </p>
                    </div>
                </div>

                {/* Filter Button */}
                {hasData && (
                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setFilterOpen(!filterOpen)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: filterOpen ? '#14b8a6' : 'white', color: filterOpen ? 'white' : '#374151', border: `2px solid ${filterOpen ? '#14b8a6' : '#e5e7eb'}`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: filterOpen ? '0 4px 12px rgba(20, 184, 166, 0.3)' : 'none' }}>
                            <Filter size={16} />
                            Filter Lokasi
                            <span style={{ background: filterOpen ? 'rgba(255,255,255,0.2)' : '#e5e7eb', color: filterOpen ? 'white' : '#374151', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{selectedLocations.length}/{data.length}</span>
                            {filterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {filterOpen && (
                            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 320, maxHeight: 480, background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                        <input type="text" placeholder="Cari lokasi..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px 12px 10px 40px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                                    </div>
                                </div>
                                <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
                                    <button onClick={selectAll} style={{ flex: 1, padding: '8px 12px', background: '#ecfdf5', color: '#047857', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Pilih Semua</button>
                                    <button onClick={clearAll} style={{ flex: 1, padding: '8px 12px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Hapus Semua</button>
                                </div>
                                <div style={{ flex: 1, maxHeight: 280, overflowY: 'auto', padding: 8 }}>
                                    {filteredSearchData.map((loc, idx) => {
                                        const isSelected = selectedLocations.includes(loc.id);
                                        const colors = getColor(loc.percentage);
                                        return (
                                            <button key={loc.id} onClick={() => toggleLocation(loc.id)}
                                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: isSelected ? '#ecfdf5' : 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' }}>
                                                <div style={{ width: 20, height: 20, borderRadius: 4, border: isSelected ? 'none' : '2px solid #d1d5db', background: isSelected ? COLORS[idx % COLORS.length] : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    {isSelected && <Check size={14} color="white" strokeWidth={3} />}
                                                </div>
                                                <span style={{ fontSize: 13, color: '#374151', fontWeight: isSelected ? 600 : 400, flex: 1 }}>{loc.name}</span>
                                                <span style={{ fontSize: 11, color: colors.text, fontWeight: 600 }}>{loc.percentage.toFixed(0)}%</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <div style={{ padding: 12, borderTop: '1px solid #f1f5f9', background: '#f9fafb' }}>
                                    <button onClick={() => setFilterOpen(false)} style={{ width: '100%', padding: '10px 16px', background: '#14b8a6', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Terapkan Filter</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Selected Chips */}
            {selectedLocations.length > 0 && selectedLocations.length <= 6 && (
                <div style={{ padding: '12px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: 8, background: '#f9fafb' }}>
                    {selectedLocations.slice(0, 6).map((id) => {
                        const loc = data.find(d => d.id === id);
                        if (!loc) return null;
                        const idx = data.findIndex(d => d.id === id);
                        return (
                            <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'white', border: `2px solid ${COLORS[idx % COLORS.length]}`, borderRadius: 20, fontSize: 11, fontWeight: 600, color: COLORS[idx % COLORS.length] }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[idx % COLORS.length] }} />
                                {loc.name.length > 12 ? loc.name.slice(0, 12) + '...' : loc.name}
                                <button onClick={() => toggleLocation(id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}><X size={12} color={COLORS[idx % COLORS.length]} /></button>
                            </span>
                        );
                    })}
                    {selectedLocations.length > 6 && <span style={{ padding: '6px 10px', background: '#e5e7eb', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#6b7280' }}>+{selectedLocations.length - 6}</span>}
                </div>
            )}

            {/* Progress Bars */}
            <div style={{ padding: 24 }}>
                {!hasData || displayData.length === 0 ? (
                    <div style={{ height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                        <Building2 size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                        <p style={{ fontSize: 16, fontWeight: 600 }}>Tidak Ada Data</p>
                        <p style={{ fontSize: 13, marginTop: 8 }}>Pilih lokasi untuk melihat compliance</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {displayData.map((location, idx) => {
                            const colors = getColor(location.percentage);
                            const isExpanded = expandedId === location.id;
                            const hasChildren = location.children && location.children.length > 0;

                            return (
                                <div key={location.id}>
                                    {/* Location Card */}
                                    <div
                                        onClick={() => handleBarClick(location)}
                                        style={{
                                            background: isExpanded ? colors.bg : '#f8fafc',
                                            borderRadius: 12,
                                            padding: 16,
                                            border: `2px solid ${isExpanded ? colors.bar : '#e5e7eb'}`,
                                            cursor: hasChildren ? 'pointer' : 'default',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 36, height: 36, background: colors.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${colors.bar}20` }}>
                                                    <Building2 size={18} color={colors.bar} />
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{location.name}</span>
                                                        {hasChildren && (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600 }}>
                                                                {location.children!.length} Desa
                                                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ fontSize: 20, fontWeight: 800, color: colors.text }}>{location.percentage.toFixed(1)}%</span>
                                                <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 8 }}>({location.kohort}/{location.total})</span>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div style={{ background: '#e5e7eb', borderRadius: 8, height: 24, overflow: 'hidden', position: 'relative' }}>
                                            <div style={{
                                                height: '100%',
                                                width: `${Math.max(location.percentage, 3)}%`,
                                                background: `linear-gradient(90deg, ${colors.bar}, ${colors.bar}cc)`,
                                                borderRadius: 8,
                                                transition: 'width 0.5s ease',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'flex-end',
                                                paddingRight: 8,
                                            }}>
                                                {location.percentage > 15 && (
                                                    <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>{location.percentage.toFixed(1)}%</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Children */}
                                    {isExpanded && hasChildren && (
                                        <div style={{ marginLeft: 24, marginTop: 8, paddingLeft: 16, borderLeft: `3px solid ${colors.bar}40` }}>
                                            {location.children!.map((child) => {
                                                const childColors = getColor(child.percentage);
                                                return (
                                                    <div key={child.id} style={{ background: 'white', borderRadius: 10, padding: 12, marginBottom: 8, border: '1px solid #e5e7eb' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <MapPin size={14} color="#0ea5e9" />
                                                                <span style={{ fontWeight: 600, color: '#374151', fontSize: 13 }}>{child.name}</span>
                                                            </div>
                                                            <div>
                                                                <span style={{ fontSize: 14, fontWeight: 700, color: childColors.text }}>{child.percentage.toFixed(1)}%</span>
                                                                <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>({child.kohort}/{child.total})</span>
                                                            </div>
                                                        </div>
                                                        <div style={{ background: '#f1f5f9', borderRadius: 6, height: 16, overflow: 'hidden' }}>
                                                            <div style={{
                                                                height: '100%',
                                                                width: `${Math.max(child.percentage, 2)}%`,
                                                                background: childColors.bar,
                                                                borderRadius: 6,
                                                                transition: 'width 0.5s ease',
                                                            }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Legend */}
            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: '#10b981' }} />
                    <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>Baik (≥75%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: '#f59e0b' }} />
                    <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>Sedang (50-74%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: '#ef4444' }} />
                    <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>Rendah (&lt;50%)</span>
                </div>
            </div>

            {filterOpen && <div onClick={() => setFilterOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'transparent', zIndex: 50 }} />}
        </div>
    );
}
