"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AIAnalyticsData } from "@/app/actions/get-advanced-analytics";

interface MapScoringProps {
    scores: AIAnalyticsData["regionScoring"];
}

const DEFAULT_CENTER: [number, number] = [-8.1, 112.6];
const DEFAULT_ZOOM = 10;

function getColor(score: number): string {
    return score >= 80 ? "#991b1b" // Dark Red (Critical)
        : score >= 60 ? "#ef4444" // Red
            : score >= 40 ? "#f59e0b" // Orange
                : score >= 20 ? "#eab308" // Yellow
                    : "#10b981"; // Green (Good)
}

export default function MapScoring({ scores }: MapScoringProps) {
    const [geojsonData, setGeojsonData] = useState<any>(null);
    const mapRef = useRef<L.Map | null>(null);
    const geoJsonRef = useRef<L.GeoJSON | null>(null);

    useEffect(() => {
        fetch("/puskesmas_fix.geojson")
            .then((res) => res.json())
            .then((d) => setGeojsonData(d))
            .catch((err) => console.error("Failed to load map:", err));
    }, []);

    const normalizeString = useCallback((s: string) => s?.toUpperCase().trim().replace(/\s+/g, " "), []);

    const style = useCallback((feature: any) => {
        const name = feature?.properties?.nama_puskesmas;
        let score = 0;

        if (name) {
            const normalized = normalizeString(name);
            const found = scores.find(s => normalizeString(s.puskesmas) === normalized);
            if (found) score = found.riskScore;
        }

        return {
            fillColor: score > 0 ? getColor(score) : "#e2e8f0",
            weight: 1,
            opacity: 1,
            color: "#ffffff",
            fillOpacity: 0.8,
        };
    }, [scores, normalizeString]);

    const onEachFeature = useCallback((feature: any, layer: L.Layer) => {
        const name = feature?.properties?.nama_puskesmas || "Unknown";
        const normalized = normalizeString(name);
        const found = scores.find(s => normalizeString(s.puskesmas) === normalized);

        const scoreVal = found ? found.riskScore : 0;
        const reason = found ? found.reason : "Data belum dianalisa AI.";

        layer.bindTooltip(
            `<div style="font-family: 'Public Sans', sans-serif; padding: 4px 0; max-width: 220px; white-space: normal;">
      <p style="font-weight: 800; font-size: 13px; color: #1e293b; margin: 0 0 4px 0;">${name}</p>
      <p style="font-size: 11px; margin: 0 0 6px 0;">
        <span style="font-weight: bold; padding: 2px 6px; border-radius: 4px; background: ${getColor(scoreVal)}; color: white;">Skor: ${scoreVal}/100</span>
      </p>
      <p style="font-size: 11px; color: #64748b; margin: 0; line-height: 1.4;">${reason}</p>
    </div>`,
            { sticky: true, className: "custom-tooltip" }
        );

        (layer as L.Path).on({
            mouseover: (e) => {
                const l = e.target;
                l.setStyle({ weight: 3, color: "#10b981", fillOpacity: 0.95 });
                l.bringToFront();
            },
            mouseout: (e) => {
                if (geoJsonRef.current) geoJsonRef.current.resetStyle(e.target);
            },
        });
    }, [scores, normalizeString]);

    if (!geojsonData) return <div className="animate-pulse bg-slate-100 rounded-2xl h-[400px] w-full" />;

    return (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200" style={{ height: "400px" }}>
            <MapContainer
                center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM}
                style={{ height: "100%", width: "100%", background: "#f1f5f9" }}
                ref={mapRef} zoomControl={false} scrollWheelZoom={false}
                dragging={true} doubleClickZoom={true} touchZoom={true}
            >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                <GeoJSON data={geojsonData} style={style} onEachFeature={onEachFeature} ref={geoJsonRef as any} />
            </MapContainer>

            <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 p-4 z-[1000]">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 font-mono">
                    Prioritas (Risk Score)
                </p>
                <div className="space-y-1">
                    {[
                        { color: "#991b1b", label: "≥ 80 (Sangat Kritis)" },
                        { color: "#ef4444", label: "60 - 79 (Kritis)" },
                        { color: "#f59e0b", label: "40 - 59 (Waspada)" },
                        { color: "#eab308", label: "20 - 39 (Pantau)" },
                        { color: "#10b981", label: "< 20 (Aman)" },
                    ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                            <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: item.color }}></div>
                            <span className="text-[11px] text-slate-600">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx global>{`
                .custom-tooltip {
                    background: white !important;
                    border: 1px solid #e2e8f0 !important;
                    border-radius: 12px !important;
                    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1) !important;
                    padding: 8px 12px !important;
                }
                .custom-tooltip::before {
                    border-top-color: white !important;
                }
            `}</style>
        </div>
    );
}
