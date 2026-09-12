"use client";

import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

interface SPPGData {
    id: string;
    lat: number;
    lng: number;
    puskesmas: string;
    desa: string;
    nama_yayasan: string;
    score_percentage: number;
}

// Generate Crisp, Professional Inline SVG Geo-Pins (Zero external image dependencies)
const createSPPGPin = (score: number) => {
    const numScore = Number(score) || 0;
    const isGood = numScore >= 80;
    const isMedium = numScore >= 60 && numScore < 80;

    const primaryColor = isGood ? "#10b981" : isMedium ? "#f59e0b" : "#ef4444";
    const darkShade = isGood ? "#047857" : isMedium ? "#b45309" : "#b91c1c";

    const svgHtml = `
        <div style="position: relative; width: 34px; height: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <!-- Ground Drop Shadow -->
            <div style="position: absolute; bottom: 0px; left: 50%; width: 14px; height: 5px; background: rgba(15, 23, 42, 0.35); border-radius: 50%; transform: translateX(-50%); filter: blur(1.5px);"></div>
            
            <!-- Pin Droplet SVG -->
            <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));">
                <defs>
                    <linearGradient id="pinGrad-${numScore}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="${primaryColor}"/>
                        <stop offset="100%" stop-color="${darkShade}"/>
                    </linearGradient>
                </defs>
                <!-- Pin Base Path -->
                <path d="M17 0C7.611 0 0 7.611 0 17C0 29.75 17 42 17 42C17 42 34 29.75 34 17C34 7.611 26.389 0 17 0Z" fill="url(#pinGrad-${numScore})"/>
                <!-- Inner White Badge -->
                <circle cx="17" cy="16" r="10.5" fill="#ffffff"/>
                <!-- Utensils / Nutrition Glyph -->
                <path d="M14 11V14.5C14 15.05 14.45 15.5 15 15.5V21H16V15.5C16.55 15.5 17 15.05 17 14.5V11H16.2V13.5H15.6V11H15.2V13.5H14.8V11H14ZM19 11C18.45 11 18 11.45 18 12V15.5C18 16.05 18.45 16.5 19 16.5V21H20V11H19Z" fill="${primaryColor}"/>
            </svg>

            <!-- Status Dot Ring -->
            <span style="position: absolute; top: 1px; right: 1px; width: 9px; height: 9px; background: #ffffff; border: 2.5px solid ${primaryColor}; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></span>
        </div>
    `;

    return L.divIcon({
        className: "sppg-pin-marker",
        html: svgHtml,
        iconSize: [34, 42],
        iconAnchor: [17, 42],
        popupAnchor: [0, -42],
    });
};

// Component to dynamically fit bounds safely without animating during unmount / fast-refresh
function MapAutoFit({ data }: { data: SPPGData[] }) {
    const map = useMap();

    useEffect(() => {
        if (!map || data.length === 0) return;

        const timer = setTimeout(() => {
            try {
                const container = map.getContainer();
                if (container && container.clientWidth > 0 && container.clientHeight > 0) {
                    map.invalidateSize();
                    const bounds = L.latLngBounds(data.map((d) => [d.lat, d.lng]));
                    if (bounds.isValid()) {
                        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: false });
                    }
                }
            } catch {
                // Ignore fast refresh race condition safely
            }
        }, 150);

        return () => clearTimeout(timer);
    }, [data, map]);

    return null;
}

export default function SupervisiMap({ data }: { data: SPPGData[] }) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    // Safe lifecycle cleanup on unmount for React 19 / Turbopack Fast Refresh
    useEffect(() => {
        setIsMounted(true);
        const container = containerRef.current;
        return () => {
            if (container) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                delete (container as any)._leaflet_id;
            }
            mapRef.current = null;
        };
    }, []);

    // Pusat default Kabupaten Malang
    const defaultCenter: [number, number] = [-8.1333, 112.5667];

    // Filter hanya titik yang memiliki koordinat valid numerik
    const validData = (data || []).filter(
        (d) => typeof d.lat === "number" && typeof d.lng === "number" && d.lat !== 0 && d.lng !== 0
    );

    // Hitung statistik ringkas untuk legend
    const countGood = validData.filter((d) => Number(d.score_percentage) >= 80).length;
    const countMedium = validData.filter(
        (d) => Number(d.score_percentage) >= 60 && Number(d.score_percentage) < 80
    ).length;
    const countPoor = validData.filter((d) => Number(d.score_percentage) < 60).length;

    if (!isMounted) {
        return (
            <div className="h-[420px] w-full rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-200">
                <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
                    <div className="w-8 h-8 border-3 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
                    <span className="font-medium">Memuat Peta Sebaran Supervisi...</span>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className="h-[420px] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm z-0 relative"
        >
            <MapContainer 
                center={defaultCenter} 
                zoom={10} 
                className="h-full w-full"
                ref={mapRef}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapAutoFit data={validData} />

                {validData.map((sppg, idx) => {
                    const score = Number(sppg.score_percentage) || 0;
                    const isGood = score >= 80;
                    const isMedium = score >= 60 && score < 80;
                    const badgeClass = isGood
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : isMedium
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-rose-50 text-rose-800 border-rose-200";

                    return (
                        <Marker
                            key={sppg.id || idx}
                            position={[sppg.lat, sppg.lng]}
                            icon={createSPPGPin(score)}
                        >
                            <Popup className="sppg-custom-popup">
                                <div className="p-1 min-w-[200px] text-slate-800">
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                            {sppg.puskesmas}
                                        </span>
                                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                                            {score.toFixed(1)}%
                                        </span>
                                    </div>

                                    <h4 className="font-extrabold text-sm text-slate-900 leading-tight mb-1">
                                        {sppg.nama_yayasan || "SPPG Tanpa Nama"}
                                    </h4>

                                    <div className="text-xs text-slate-500 space-y-0.5 mb-2.5">
                                        <p className="flex items-center gap-1">
                                            <span className="text-slate-400">Desa:</span>
                                            <span className="font-medium text-slate-700">{sppg.desa}</span>
                                        </p>
                                        <p className="text-[10px] font-mono text-slate-400">
                                            {sppg.lat.toFixed(5)}, {sppg.lng.toFixed(5)}
                                        </p>
                                    </div>

                                    {/* Progress Score Bar */}
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-1">
                                        <div
                                            className={`h-full rounded-full ${
                                                isGood ? "bg-emerald-500" : isMedium ? "bg-amber-500" : "bg-rose-500"
                                            }`}
                                            style={{ width: `${Math.min(Math.max(score, 5), 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium text-right">
                                        Status:{" "}
                                        <strong className={isGood ? "text-emerald-700" : isMedium ? "text-amber-700" : "text-rose-700"}>
                                            {isGood ? "Sangat Baik" : isMedium ? "Cukup" : "Prioritas"}
                                        </strong>
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* ── Interactive Floating Legend Card ── */}
            <div className="absolute bottom-4 left-4 z-[999] bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-200/90 shadow-lg text-xs flex flex-col gap-1.5 pointer-events-auto">
                <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wider font-mono">
                        Titik Supervisi SPPG ({validData.length})
                    </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-600 font-medium">
                    <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
                        Baik ({countGood})
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
                        Cukup ({countMedium})
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs" />
                        Prioritas ({countPoor})
                    </span>
                </div>
            </div>
        </div>
    );
}

