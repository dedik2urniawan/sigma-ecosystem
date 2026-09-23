"use client";
import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { Scale, Info, Filter, ChevronDown, ChevronUp, Search, X, Check } from "lucide-react";

interface WeekData {
    week: string;
    [key: string]: number | string;
}

interface LocationLine {
    id: string;
    name: string;
    color: string;
}

interface DeltaBBChartProps {
    data: WeekData[];
    locations: LocationLine[];
    expectedBaseline: number;
    loading?: boolean;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];

export default function DeltaBBChart({
    data,
    locations,
    expectedBaseline,
    loading = false,
}: DeltaBBChartProps) {
    const [selectedLines, setSelectedLines] = useState<string[]>([]);
    const [filterOpen, setFilterOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (locations && locations.length > 0 && data && data.length > 0) {
            const locationsWithData = locations.filter(loc => {
                return data.some(row => row[loc.name] !== null && row[loc.name] !== undefined);
            });
            setSelectedLines(locationsWithData.slice(0, 5).map(loc => loc.name));
        }
    }, [locations, data]);

    const filteredLocations = useMemo(() => {
        if (!searchQuery) return locations;
        return locations.filter(loc =>
            loc.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [locations, searchQuery]);

    const toggleLine = (lineName: string) => {
        if (selectedLines.includes(lineName)) {
            setSelectedLines(selectedLines.filter((name) => name !== lineName));
        } else {
            setSelectedLines([...selectedLines, lineName]);
        }
    };

    const selectAll = () => {
        const locationsWithData = locations.filter(loc => {
            return data.some(row => row[loc.name] !== null && row[loc.name] !== undefined);
        });
        setSelectedLines(locationsWithData.map(loc => loc.name));
    };

    const clearAll = () => {
        setSelectedLines([]);
    };

    if (loading) {
        return (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
                <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 48, height: 48, border: '3px solid #3b82f6', borderTop: '3px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
            </div>
        );
    }

    const hasData = data && data.length > 0;
    const hasLocations = locations && locations.length > 0;

    return (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 44,
                        height: 44,
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                    }}>
                        <Scale color="white" size={22} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>Perubahan Berat Badan (ΔBB)</h3>
                        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Tracking kenaikan BB per minggu vs target minimal (5gr/kg BB)</p>
                    </div>
                </div>

                {/* Filter Button */}
                {hasLocations && (
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setFilterOpen(!filterOpen)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '10px 16px',
                                background: filterOpen ? '#3b82f6' : 'white',
                                color: filterOpen ? 'white' : '#374151',
                                border: `2px solid ${filterOpen ? '#3b82f6' : '#e5e7eb'}`,
                                borderRadius: 10,
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: filterOpen ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                            }}
                        >
                            <Filter size={16} />
                            Filter Lokasi
                            <span style={{
                                background: filterOpen ? 'rgba(255,255,255,0.2)' : '#e5e7eb',
                                color: filterOpen ? 'white' : '#374151',
                                padding: '2px 8px',
                                borderRadius: 20,
                                fontSize: 11,
                                fontWeight: 700,
                            }}>
                                {selectedLines.length}/{locations.length}
                            </span>
                            {filterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {/* Filter Dropdown */}
                        {filterOpen && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 8px)',
                                right: 0,
                                width: 320,
                                maxHeight: 480,
                                background: 'white',
                                borderRadius: 12,
                                border: '1px solid #e5e7eb',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                                zIndex: 100,
                                display: 'flex',
                                flexDirection: 'column',
                            }}>
                                <div style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                        <input
                                            type="text"
                                            placeholder="Cari lokasi..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            style={{ width: '100%', padding: '10px 12px 10px 40px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
                                    <button onClick={selectAll} style={{ flex: 1, padding: '8px 12px', background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Pilih Semua</button>
                                    <button onClick={clearAll} style={{ flex: 1, padding: '8px 12px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Hapus Semua</button>
                                </div>
                                <div style={{ flex: 1, maxHeight: 280, overflowY: 'auto', padding: 8 }}>
                                    {filteredLocations.map((loc, idx) => {
                                        const isSelected = selectedLines.includes(loc.name);
                                        const hasDataForLoc = data.some(row => row[loc.name] !== null && row[loc.name] !== undefined);
                                        return (
                                            <button key={loc.id} onClick={() => toggleLine(loc.name)} disabled={!hasDataForLoc}
                                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: isSelected ? '#f0f9ff' : 'transparent', border: 'none', borderRadius: 8, cursor: hasDataForLoc ? 'pointer' : 'not-allowed', opacity: hasDataForLoc ? 1 : 0.4, transition: 'all 0.15s', textAlign: 'left' }}>
                                                <div style={{ width: 20, height: 20, borderRadius: 4, border: isSelected ? 'none' : '2px solid #d1d5db', background: isSelected ? COLORS[idx % COLORS.length] : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    {isSelected && <Check size={14} color="white" strokeWidth={3} />}
                                                </div>
                                                <span style={{ fontSize: 13, color: '#374151', fontWeight: isSelected ? 600 : 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.name}</span>
                                                {!hasDataForLoc && <span style={{ fontSize: 10, color: '#9ca3af', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>No Data</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div style={{ padding: 12, borderTop: '1px solid #f1f5f9', background: '#f9fafb' }}>
                                    <button onClick={() => setFilterOpen(false)} style={{ width: '100%', padding: '10px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Terapkan Filter</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Selected Chips */}
            {selectedLines.length > 0 && (
                <div style={{ padding: '12px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: 8, background: '#f9fafb' }}>
                    {selectedLines.slice(0, 8).map((name, idx) => {
                        const locIdx = locations.findIndex(l => l.name === name);
                        return (
                            <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'white', border: `2px solid ${COLORS[locIdx % COLORS.length]}`, borderRadius: 20, fontSize: 11, fontWeight: 600, color: COLORS[locIdx % COLORS.length] }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[locIdx % COLORS.length] }} />
                                {name.length > 15 ? name.slice(0, 15) + '...' : name}
                                <button onClick={() => toggleLine(name)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}><X size={12} color={COLORS[locIdx % COLORS.length]} /></button>
                            </span>
                        );
                    })}
                    {selectedLines.length > 8 && <span style={{ padding: '6px 10px', background: '#e5e7eb', borderRadius: 20, fontSize: 11, fontWeight: 600, color: '#6b7280' }}>+{selectedLines.length - 8} lainnya</span>}
                </div>
            )}

            {/* Chart */}
            <div style={{ padding: 24 }}>
                {(!hasData || !hasLocations) ? (
                    <div style={{ height: 350, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                        <Scale size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                        <p style={{ fontSize: 16, fontWeight: 600 }}>Tidak Ada Data</p>
                        <p style={{ fontSize: 13, marginTop: 8 }}>Belum ada data monitoring untuk bulan yang dipilih</p>
                    </div>
                ) : (
                    <>
                        <div style={{ marginBottom: 16, padding: 12, background: '#eff6ff', borderLeft: '4px solid #3b82f6', borderRadius: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Info size={16} color="#2563eb" />
                                <span style={{ fontSize: 13, color: '#1e40af' }}><strong>Target:</strong> Kenaikan BB minimal <strong>5 gram per kg berat badan</strong> per minggu.</span>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={350}>
                            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px', fontWeight: 500 }} />
                                <YAxis stroke="#6b7280" style={{ fontSize: '12px', fontWeight: 500 }} />
                                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: 12 }} />
                                <ReferenceLine y={expectedBaseline} stroke="#9ca3af" strokeDasharray="8 4" strokeWidth={2} label={{ value: `Target: ${(expectedBaseline * 1000).toFixed(0)}gr`, position: 'right', fontSize: 11 }} />
                                {locations.map((location, idx) => (
                                    selectedLines.includes(location.name) && (
                                        <Line key={location.id} type="monotone" dataKey={location.name} stroke={COLORS[idx % COLORS.length]} strokeWidth={2.5} dot={{ fill: COLORS[idx % COLORS.length], r: 4 }} activeDot={{ r: 6 }} connectNulls />
                                    )
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                        <div style={{ marginTop: 16, padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                            <p style={{ fontSize: 11, color: '#475569', margin: 0 }}><strong>Interpretasi:</strong> Di atas target = Sangat Baik | Mendekati = Baik | Di bawah = Perlu Perhatian</p>
                        </div>
                    </>
                )}
            </div>

            {filterOpen && <div onClick={() => setFilterOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'transparent', zIndex: 50 }} />}
        </div>
    );
}
