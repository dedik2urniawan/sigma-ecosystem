"use client";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Heart, Filter, ChevronDown, ChevronUp, Search, X, Check } from "lucide-react";

interface HealthData {
    id: string;
    name: string;
    sehat: number;
    sakit: number;
    sehatPercentage: number;
    sakitPercentage: number;
    children?: HealthData[];
}

interface HealthStatusBarChartProps {
    data: HealthData[];
    loading?: boolean;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];

export default function HealthStatusBarChart({ data, loading = false }: HealthStatusBarChartProps) {
    const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
    const [filterOpen, setFilterOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [initialized, setInitialized] = useState(false);

    if (!initialized && data && data.length > 0) {
        setSelectedLocations(data.slice(0, 10).map(d => d.id));
        setInitialized(true);
    }

    const filteredData = useMemo(() => {
        if (!searchQuery) return data;
        return data.filter(loc => loc.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [data, searchQuery]);

    const displayData = useMemo(() => {
        return data.filter(d => selectedLocations.includes(d.id)).map(loc => ({
            name: loc.name,
            sehat: loc.sehatPercentage,
            sakit: loc.sakitPercentage,
            id: loc.id,
        }));
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

    if (loading) {
        return (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
                <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 48, height: 48, border: '3px solid #ec4899', borderTop: '3px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
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
                    <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #ec4899, #db2777)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)' }}>
                        <Heart color="white" size={22} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>Status Kesehatan Balita</h3>
                        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Distribusi status sehat vs sakit per lokasi</p>
                    </div>
                </div>

                {/* Filter Button */}
                {hasData && (
                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setFilterOpen(!filterOpen)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: filterOpen ? '#ec4899' : 'white', color: filterOpen ? 'white' : '#374151', border: `2px solid ${filterOpen ? '#ec4899' : '#e5e7eb'}`, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: filterOpen ? '0 4px 12px rgba(236, 72, 153, 0.3)' : 'none' }}>
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
                                    <button onClick={selectAll} style={{ flex: 1, padding: '8px 12px', background: '#fdf2f8', color: '#be185d', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Pilih Semua</button>
                                    <button onClick={clearAll} style={{ flex: 1, padding: '8px 12px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Hapus Semua</button>
                                </div>
                                <div style={{ flex: 1, maxHeight: 280, overflowY: 'auto', padding: 8 }}>
                                    {filteredData.map((loc, idx) => {
                                        const isSelected = selectedLocations.includes(loc.id);
                                        return (
                                            <button key={loc.id} onClick={() => toggleLocation(loc.id)}
                                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: isSelected ? '#fdf2f8' : 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left' }}>
                                                <div style={{ width: 20, height: 20, borderRadius: 4, border: isSelected ? 'none' : '2px solid #d1d5db', background: isSelected ? COLORS[idx % COLORS.length] : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    {isSelected && <Check size={14} color="white" strokeWidth={3} />}
                                                </div>
                                                <span style={{ fontSize: 13, color: '#374151', fontWeight: isSelected ? 600 : 400, flex: 1 }}>{loc.name}</span>
                                                <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>{loc.sehatPercentage.toFixed(0)}% Sehat</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <div style={{ padding: 12, borderTop: '1px solid #f1f5f9', background: '#f9fafb' }}>
                                    <button onClick={() => setFilterOpen(false)} style={{ width: '100%', padding: '10px 16px', background: '#ec4899', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Terapkan Filter</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Selected Chips */}
            {selectedLocations.length > 0 && selectedLocations.length <= 8 && (
                <div style={{ padding: '12px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: 8, background: '#f9fafb' }}>
                    {selectedLocations.slice(0, 8).map((id) => {
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
                </div>
            )}

            {/* Chart */}
            <div style={{ padding: 24 }}>
                {!hasData || displayData.length === 0 ? (
                    <div style={{ height: 350, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                        <Heart size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                        <p style={{ fontSize: 16, fontWeight: 600 }}>Tidak Ada Data</p>
                        <p style={{ fontSize: 13, marginTop: 8 }}>Pilih lokasi untuk melihat status kesehatan</p>
                    </div>
                ) : (
                    <>
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={displayData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '11px', fontWeight: 500 }} angle={-45} textAnchor="end" height={80} />
                                <YAxis stroke="#6b7280" style={{ fontSize: '12px', fontWeight: 500 }} domain={[0, 100]} label={{ value: 'Persentase (%)', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: 12 }} formatter={(value: any, name: any) => [typeof value === 'number' ? `${value.toFixed(1)}%` : value, name === 'sehat' ? 'Sehat' : 'Sakit'] as any} />
                                <Legend formatter={(value) => value === 'sehat' ? 'Sehat' : 'Sakit'} wrapperStyle={{ paddingTop: '10px' }} />
                                <Bar dataKey="sehat" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="sakit" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                        <div style={{ marginTop: 16, padding: 12, background: '#fdf2f8', borderLeft: '4px solid #ec4899', borderRadius: 4 }}>
                            <p style={{ fontSize: 11, color: '#9d174d', margin: 0 }}><strong>Interpretasi:</strong> Status kesehatan berdasarkan catatan monitoring konsumsi</p>
                        </div>
                    </>
                )}
            </div>

            {filterOpen && <div onClick={() => setFilterOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'transparent', zIndex: 50 }} />}
        </div>
    );
}
