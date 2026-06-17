"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet's default icon path issues with Next.js
const iconRetinaUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png";
const iconUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png";
const shadowUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png";

const DefaultIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface SPPGData {
    id: string;
    lat: number;
    lng: number;
    puskesmas: string;
    desa: string;
    nama_yayasan: string;
    score_percentage: number;
}

export default function SupervisiMap({ data }: { data: SPPGData[] }) {
    // Pusat koordinat Kabupaten Malang secara umum (atau sesuaikan)
    const center: [number, number] = [-8.1333, 112.5667]; 
    
    // Filter data yang memiliki koordinat valid
    const validData = data.filter(d => typeof d.lat === 'number' && typeof d.lng === 'number' && d.lat !== 0 && d.lng !== 0);

    return (
        <div className="h-[400px] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm z-0 relative">
            <MapContainer center={center} zoom={10} className="h-full w-full">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {validData.map((sppg, idx) => (
                    <Marker key={sppg.id || idx} position={[sppg.lat, sppg.lng]}>
                        <Popup>
                            <div className="text-xs">
                                <p className="font-bold text-amber-600 uppercase mb-1">{sppg.puskesmas}</p>
                                <p className="font-semibold text-slate-800">{sppg.nama_yayasan || sppg.desa}</p>
                                <p className="text-slate-500 mb-2">Desa: {sppg.desa}</p>
                                <div className="inline-block px-2 py-1 bg-amber-50 rounded border border-amber-200 text-amber-800 font-bold">
                                    Skor: {Number(sppg.score_percentage).toFixed(1)}%
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
