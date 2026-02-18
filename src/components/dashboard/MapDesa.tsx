"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapDesaProps {
    data: Record<string, number>;
    metric: string;
    selectedDesa?: string | null;
    selectedPuskesmas?: string | null;
}

const METRIC_LABELS: Record<string, string> = {
    stunting: "Prevalensi Stunting",
    wasting: "Prevalensi Wasting",
    underweight: "Prevalensi Underweight",
    obesitas: "Prevalensi Obesitas",
};

const DEFAULT_CENTER: [number, number] = [-8.1, 112.6];
const DEFAULT_ZOOM = 10;

function getColor(value: number, metric: string): string {
    if (metric === "stunting") {
        return value >= 20 ? "#991b1b" : value >= 15 ? "#dc2626" : value >= 10 ? "#f97316" : value >= 5 ? "#fbbf24" : "#86efac";
    }
    if (metric === "wasting") {
        return value >= 15 ? "#991b1b" : value >= 10 ? "#dc2626" : value >= 5 ? "#f97316" : value >= 3 ? "#fbbf24" : "#86efac";
    }
    if (metric === "underweight") {
        return value >= 20 ? "#991b1b" : value >= 15 ? "#dc2626" : value >= 10 ? "#f97316" : value >= 5 ? "#fbbf24" : "#86efac";
    }
    if (metric === "obesitas") {
        return value >= 10 ? "#991b1b" : value >= 5 ? "#dc2626" : value >= 3 ? "#f97316" : value >= 1 ? "#fbbf24" : "#86efac";
    }
    return "#e2e8f0";
}

// ─── Map Controller: zoom-to-desa or zoom-to-puskesmas ─────────────────
function MapZoomController({
    geojsonData,
    selectedDesa,
    selectedPuskesmas,
    normalizeString,
}: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geojsonData: any;
    selectedDesa: string | null;
    selectedPuskesmas: string | null;
    normalizeString: (s: string) => string;
}) {
    const map = useMap();

    useEffect(() => {
        if (!geojsonData) return;

        if (selectedDesa) {
            const n = normalizeString(selectedDesa);
            const features = geojsonData.features || [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const match = features.find((f: any) => {
                const name = f?.properties?.nama_desa;
                return name && normalizeString(name) === n;
            });
            if (match) {
                const geoLayer = L.geoJSON(match);
                const bounds = geoLayer.getBounds();
                if (bounds.isValid()) {
                    map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 15, duration: 0.8 });
                }
            }
        } else if (selectedPuskesmas) {
            const n = normalizeString(selectedPuskesmas);
            const features = geojsonData.features || [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const matching = features.filter((f: any) => {
                const name = f?.properties?.nama_puskesmas;
                return name && normalizeString(name) === n;
            });
            if (matching.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const geoLayer = L.geoJSON({ type: "FeatureCollection", features: matching } as any);
                const bounds = geoLayer.getBounds();
                if (bounds.isValid()) {
                    map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 13, duration: 0.8 });
                }
            }
        } else {
            map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 0.8 });
        }
    }, [selectedDesa, selectedPuskesmas, geojsonData, map, normalizeString]);

    return null;
}

export default function MapDesa({ data, metric, selectedDesa = null, selectedPuskesmas = null }: MapDesaProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [geojsonData, setGeojsonData] = useState<any>(null);
    const mapRef = useRef<L.Map | null>(null);
    const geoJsonRef = useRef<L.GeoJSON | null>(null);

    useEffect(() => {
        fetch("/desa_fix.geojson")
            .then((res) => res.json())
            .then((d) => setGeojsonData(d))
            .catch((err) => console.error("Failed to load GeoJSON:", err));

        // Cleanup map on unmount to prevent "Map container is being reused" error
        // React-Leaflet handles this automatically. Manual removal causes conflicts.
        return () => {
            // if (mapRef.current) {
            //     mapRef.current.remove();
            //     mapRef.current = null;
            // }
        };
    }, []);

    const normalizeString = useCallback((s: string) => s?.toUpperCase().replace(/[^A-Z0-9]/g, "") || "", []);

    const style = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (feature: any) => {
            const desaName = feature?.properties?.nama_desa;
            const puskName = feature?.properties?.nama_puskesmas;
            let value = 0;
            let isSelected = false;
            let isDimmed = false;

            if (desaName) {
                const normalized = normalizeString(desaName);
                for (const [key, val] of Object.entries(data)) {
                    if (normalizeString(key) === normalized) {
                        value = val;
                        break;
                    }
                }
                // Highlight selected desa
                if (selectedDesa && normalizeString(selectedDesa) === normalized) {
                    isSelected = true;
                }
                // Dim desa not in selected puskesmas
                if (selectedPuskesmas && !selectedDesa && puskName && normalizeString(puskName) !== normalizeString(selectedPuskesmas)) {
                    isDimmed = true;
                }
            }

            return {
                fillColor: getColor(value, metric),
                weight: isSelected ? 3 : 1,
                opacity: 1,
                color: isSelected ? "#10b981" : "#ffffff",
                fillOpacity: isDimmed ? 0.2 : isSelected ? 1 : (selectedDesa ? 0.4 : 0.8),
            };
        },
        [data, metric, selectedDesa, selectedPuskesmas, normalizeString]
    );

    const onEachFeature = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (feature: any, layer: L.Layer) => {
            const desaName = feature?.properties?.nama_desa || "Unknown";
            const puskName = feature?.properties?.nama_puskesmas || "";
            const normalized = normalizeString(desaName);
            let value = 0;

            for (const [key, val] of Object.entries(data)) {
                if (normalizeString(key) === normalized) {
                    value = val;
                    break;
                }
            }

            layer.bindTooltip(
                `<div style="font-family: 'Public Sans', sans-serif; padding: 4px 0;">
          <p style="font-weight: 800; font-size: 13px; color: #1e293b; margin: 0 0 2px 0;">${desaName}</p>
          <p style="font-size: 10px; color: #94a3b8; margin: 0 0 4px 0;">Puskesmas ${puskName}</p>
          <p style="font-size: 11px; color: #64748b; margin: 0;">
            ${METRIC_LABELS[metric]}: <strong style="color: ${getColor(value, metric)}; font-size: 13px;">${value.toFixed(2)}%</strong>
          </p>
        </div>`,
                {
                    sticky: true,
                    direction: "top",
                    offset: [0, -10],
                    className: "custom-tooltip-desa",
                }
            );

            (layer as L.Path).on({
                mouseover: (e) => {
                    const l = e.target;
                    l.setStyle({ weight: 3, color: "#10b981", fillOpacity: 0.95 });
                    l.bringToFront();
                },
                mouseout: (e) => {
                    if (geoJsonRef.current) {
                        geoJsonRef.current.resetStyle(e.target);
                    }
                },
            });
        },
        [data, metric, normalizeString]
    );

    if (!geojsonData) {
        return (
            <div className="w-full h-[500px] bg-slate-100 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3"></div>
                    <span className="text-sm text-slate-400">Memuat peta desa...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ height: "500px" }}>
                <MapContainer
                    center={DEFAULT_CENTER}
                    zoom={DEFAULT_ZOOM}
                    style={{ height: "100%", width: "100%", background: "#f1f5f9" }}
                    ref={mapRef}
                    zoomControl={false}
                    scrollWheelZoom={false}
                    dragging={false}
                    doubleClickZoom={false}
                    touchZoom={false}
                    boxZoom={false}
                    keyboard={false}
                    attributionControl={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />
                    <GeoJSON
                        key={`${metric}-${JSON.stringify(data).length}-${selectedDesa}-${selectedPuskesmas}`}
                        data={geojsonData}
                        style={style}
                        onEachFeature={onEachFeature}
                        ref={(ref) => {
                            if (ref) geoJsonRef.current = ref;
                        }}
                    />
                    <MapZoomController
                        geojsonData={geojsonData}
                        selectedDesa={selectedDesa}
                        selectedPuskesmas={selectedPuskesmas}
                        normalizeString={normalizeString}
                    />
                </MapContainer>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 p-4 z-[1000]">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 font-mono">
                    {METRIC_LABELS[metric]}
                </p>
                <div className="space-y-1">
                    {(metric === "stunting"
                        ? [
                            { color: "#991b1b", label: "≥ 20%" },
                            { color: "#dc2626", label: "15-20%" },
                            { color: "#f97316", label: "10-15%" },
                            { color: "#fbbf24", label: "5-10%" },
                            { color: "#86efac", label: "< 5%" },
                        ]
                        : metric === "wasting"
                            ? [
                                { color: "#991b1b", label: "≥ 15%" },
                                { color: "#dc2626", label: "10-15%" },
                                { color: "#f97316", label: "5-10%" },
                                { color: "#fbbf24", label: "3-5%" },
                                { color: "#86efac", label: "< 3%" },
                            ]
                            : metric === "underweight"
                                ? [
                                    { color: "#991b1b", label: "≥ 20%" },
                                    { color: "#dc2626", label: "15-20%" },
                                    { color: "#f97316", label: "10-15%" },
                                    { color: "#fbbf24", label: "5-10%" },
                                    { color: "#86efac", label: "< 5%" },
                                ]
                                : [
                                    { color: "#991b1b", label: "≥ 10%" },
                                    { color: "#dc2626", label: "5-10%" },
                                    { color: "#f97316", label: "3-5%" },
                                    { color: "#fbbf24", label: "1-3%" },
                                    { color: "#86efac", label: "< 1%" },
                                ]
                    ).map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                            <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: item.color }}></div>
                            <span className="text-[11px] text-slate-600">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx global>{`
        .custom-tooltip-desa {
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1) !important;
          padding: 8px 12px !important;
        }
        .custom-tooltip-desa::before {
          border-top-color: white !important;
        }
      `}</style>
        </div>
    );
}
