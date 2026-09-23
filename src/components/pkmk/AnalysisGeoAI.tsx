"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  MapPin, Filter, Layers, Navigation, Info, Search, ShieldAlert, 
  Sparkles, Building2, CheckCircle2, Flame, Droplets, Utensils, 
  Boxes, AlertTriangle, ArrowRight, BarChart3, TrendingUp, RefreshCw, Cpu,
  Copy, Check, FileText, ChevronDown, ChevronUp, Zap, ShieldCheck, CalendarClock,
  Target, Compass, X, AlertCircle
} from "lucide-react";
import { getAuthHeaders } from "@/lib/clientSession";

type BalitaPoint = {
  id: string;
  nik: string | null;
  nama_balita: string;
  desa_kel: string | null;
  kec: string | null;
  puskesmas_id?: string | null;
  latitude: number;
  longitude: number;
  isRealGps: boolean;
  status_stunting: string;
  severity: string;
  zs_tbu?: number | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  determinan?: {
    risk_score: number;
    risk_category: string;
    dominant_factor: string;
  } | null;
};

type PuskesmasLogistik = {
  id: string;
  nama: string;
  kode?: string;
  latitude: number;
  longitude: number;
  totalStok: number;
  minStok: number;
  stuntingCases: number;
  totalBalita: number;
  monthlyDemand: number;
  stockStatus: string;
  vulnerabilityScore: number;
};

type HotspotCluster = {
  name: string;
  center: { lat: number; lng: number };
  radius_m: number;
  stuntingCount: number;
  severeRatio: string;
  dominantCause: string;
  riskLevel: string;
};

export default function AnalysisGeoAI() {
  const [balitaList, setBalitaList] = useState<BalitaPoint[]>([]);
  const [puskesmasList, setPuskesmasList] = useState<PuskesmasLogistik[]>([]);
  const [hotspotClusters, setHotspotClusters] = useState<HotspotCluster[]>([]);
  const [determinanStats, setDeterminanStats] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("superadmin");
  const [puskesmasName, setPuskesmasName] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [selectedPoint, setSelectedPoint] = useState<BalitaPoint | null>(null);
  const [activeLayer, setActiveLayer] = useState<'INDIVIDU' | 'HOTSPOT' | 'DETERMINAN' | 'LOGISTIK'>('INDIVIDU');

  // AI Resume Analytics State
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAiPanel, setShowAiPanel] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchGeoData = async () => {
    setLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/pkmk/dashboard/geo-ai", {
        credentials: "include",
        headers: authHeaders,
      });
      if (!res.ok) return;
      const data = await res.json();
      setBalitaList(data.balitaPoints || []);
      setPuskesmasList(data.puskesmasLogistik || []);
      setHotspotClusters(data.hotspotClusters || []);
      setDeterminanStats(data.determinanStats || null);
      setSummary(data.summary || null);
      setUserRole(data.role || "superadmin");
      setPuskesmasName(data.puskesmasName || null);
    } catch (err) {
      console.error("Error loading geo data:", err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchGeoData();
  }, []);

  const generateAiResume = async () => {
    setAiLoading(true);
    setAiError(null);
    setShowAiPanel(true);
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/pkmk/ai/geo-advisor", {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary,
          hotspotClusters,
          determinanStats,
          puskesmasLogistik: puskesmasList,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memproses AI Geo Analytics");
      }

      setAiAnalysis(data.analysis);
    } catch (err: any) {
      console.error("AI Geo Analytics Error:", err);
      setAiError(err.message || "Gagal menghubungi layanan AI Geo Advisor");
    } finally {
      setAiLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!aiAnalysis) return;
    const textToCopy = `=== SIGMA GEO AI: PRESCRIPTIVE RESUME ===
Kabupaten Malang • Tanggal: ${new Date().toLocaleDateString('id-ID')}

RINGKASAN EKSEKUTIF:
${aiAnalysis.executiveSummary}

KLASTER PRIORITAS (GETIS-ORD GI*):
${(aiAnalysis.spatialHotspotInsights?.priorityClusters || []).map((c: any) => `• ${c.name} (${c.riskLevel}): ${c.stuntingCount} Kasus, Severely Stunted: ${c.severeRatio}. Faktor Dominan: ${c.dominantFactor}\n  Dampak Klinis: ${c.clinicalImpact}`).join('\n\n')}

INFERENSI DETERMINAN LAPANGAN (26 FAKTOR):
- Akar Masalah Utama: ${aiAnalysis.causalDeterminantsInsights?.primaryRootCause}
- Akar Masalah Sekunder: ${aiAnalysis.causalDeterminantsInsights?.secondaryRootCause}
- Rekomendasi Lapangan: ${aiAnalysis.causalDeterminantsInsights?.actionableCorrection}

LOGISTIK PKMK & RESILIENSI SUPPLY CHAIN:
- Tingkat Risiko Stockout: ${aiAnalysis.supplyChainLogisticsInsights?.stockoutRiskLevel}
- Puskesmas Rentan: ${aiAnalysis.supplyChainLogisticsInsights?.vulnerablePuskesmasCount} PKM
- Rencana Redistribusi: ${aiAnalysis.supplyChainLogisticsInsights?.redistributionPlan}

RENCANA AKSI PRESKRIPTIF:
${(aiAnalysis.prescriptiveActionPlan || []).map((p: any) => `[${p.timeframe}] ${p.action}\n Target: ${p.targetArea} | PIC: ${p.stakeholder}`).join('\n\n')}
`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const filteredPoints = useMemo(() => {
    return balitaList.filter((b) => {
      const matchSearch =
        !searchQuery ||
        b.nama_balita.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.desa_kel && b.desa_kel.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchStatus = true;
      if (filterStatus === "STUNTED") {
        matchStatus = b.status_stunting?.includes("Pendek") ?? false;
      } else if (filterStatus === "NORMAL") {
        matchStatus = b.status_stunting === "Normal";
      }

      return matchSearch && matchStatus;
    });
  }, [balitaList, searchQuery, filterStatus]);

  // Leaflet HTML Multi-Layer Engine
  const leafletHtml = useMemo(() => {
    const pointsData = filteredPoints.map((b) => ({
      id: b.id,
      nama_balita: b.nama_balita,
      nik: b.nik,
      desa_kel: b.desa_kel,
      latitude: b.latitude,
      longitude: b.longitude,
      status_stunting: b.status_stunting,
      severity: b.severity,
      zs_tbu: b.zs_tbu,
      isRealGps: b.isRealGps,
      determinan: b.determinan,
    }));

    const puskesmasData = puskesmasList;
    const clustersData = hotspotClusters;
    const selectedId = selectedPoint?.id || null;
    const centerLat = selectedPoint?.latitude || -8.1333;
    const centerLng = selectedPoint?.longitude || 112.5667;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="/leaflet/leaflet.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css" />
  <script src="/leaflet/leaflet.js"></script>
  <script>
    if (typeof L === 'undefined') {
      document.write('<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"><\\/script>');
    }
  </script>
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
    .badge-severe { background: #fee2e2; color: #991b1b; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 999px; }
    .badge-stunted { background: #ffe4e6; color: #be123c; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; }
    .badge-normal { background: #d1fae5; color: #047857; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; }
    .badge-danger { background: #ef4444; color: white; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; }
    .badge-warning { background: #f59e0b; color: white; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; }
    .badge-safe { background: #10b981; color: white; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; }
    .leaflet-popup-content-wrapper { border-radius: 14px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); }
    .leaflet-popup-content { margin: 12px 16px; line-height: 1.4; font-size: 12px; }
    .hotspot-pin {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      border-radius: 9999px;
      font-weight: 800;
      font-size: 11px;
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(0,0,0,0.35);
      border: 2px solid #ffffff;
      cursor: pointer;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    if (typeof L === 'undefined') {
      document.getElementById('map').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#475569;font-family:sans-serif;font-weight:bold;font-size:14px;">Memuat peta spasial Leaflet...</div>';
    } else {
      const map = L.map('map', { zoomControl: true }).setView([${centerLat}, ${centerLng}], ${selectedId ? 14 : 10});
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | SIGMA Geo AI',
        maxZoom: 18,
      }).addTo(map);

      const points = ${JSON.stringify(pointsData)};
      const puskesmas = ${JSON.stringify(puskesmasData)};
      const clusters = ${JSON.stringify(clustersData)};
      const activeLayer = "${activeLayer}";
      const selectedId = ${JSON.stringify(selectedId)};

      // Custom Canvas Marker Icons
      function createCircleMarker(lat, lng, color, radius, fillOpacity) {
        return L.circleMarker([lat, lng], {
          radius: radius || 6,
          fillColor: color,
          color: '#ffffff',
          weight: 1.5,
          opacity: 0.9,
          fillOpacity: fillOpacity || 0.85
        });
      }

      // 1. LAYER: HOTSPOT CLUSTERS (Getis-Ord Gi* Buffer Circles & Prominent Pins)
      clusters.forEach(c => {
        const isCritical = c.riskLevel === 'CRITICAL_HOTSPOT';
        const circleColor = isCritical ? '#dc2626' : '#f97316';

        if (activeLayer === 'HOTSPOT') {
          const buffer = L.circle([c.center.lat, c.center.lng], {
            radius: c.radius_m || 2800,
            fillColor: circleColor,
            fillOpacity: isCritical ? 0.3 : 0.22,
            color: circleColor,
            weight: isCritical ? 3 : 2,
            dashArray: isCritical ? '6, 6' : null
          }).addTo(map);

          const hotspotPopup = \`
            <div style="min-width: 220px;">
              <div style="font-weight: 900; font-size: 14px; color: \${circleColor}; margin-bottom: 4px;">🔥 \${c.name}</div>
              <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">Tingkat Risiko: <strong>\${c.riskLevel}</strong></div>
              <div style="border-top: 1px solid #e2e8f0; padding-top: 6px; font-size: 11px; line-height: 1.6;">
                <div>• Beban Kasus: <strong>\${c.stuntingCount} Balita</strong></div>
                <div>• Rasio Severely Stunted: <strong>\${c.severeRatio}</strong></div>
                <div>• Determinan Utama: <strong>\${c.dominantCause}</strong></div>
              </div>
            </div>
          \`;

          buffer.bindPopup(hotspotPopup);

          // Prominent center flame badge
          const hotspotIcon = L.divIcon({
            className: 'custom-hotspot-pin',
            html: \`<div class="hotspot-pin" style="background:\${circleColor}; transform: translate(-50%, -50%);">
              <span>🔥</span>
              <span>\${c.name}</span>
              <span style="background:rgba(0,0,0,0.25);padding:2px 7px;border-radius:99px;font-size:10px;">\${c.stuntingCount} kasus</span>
            </div>\`,
            iconSize: [0, 0],
            iconAnchor: [0, 0]
          });

          L.marker([c.center.lat, c.center.lng], { icon: hotspotIcon, zIndexOffset: 1000 }).addTo(map).bindPopup(hotspotPopup);
        } else if (activeLayer === 'INDIVIDU') {
          // Subtle hotspot boundary guide in Individu view
          L.circle([c.center.lat, c.center.lng], {
            radius: c.radius_m || 2800,
            fillColor: circleColor,
            fillOpacity: 0.08,
            color: circleColor,
            weight: 1.5,
            dashArray: '5, 5'
          }).addTo(map);
        }
      });

      // 2. LAYER: INDIVIDU BALITA PINS
      if (activeLayer === 'INDIVIDU' || activeLayer === 'HOTSPOT' || activeLayer === 'DETERMINAN') {
        points.forEach(p => {
          let pinColor = '#10b981'; // normal green
          let radius = 5.5;

          if (activeLayer === 'DETERMINAN') {
            const dom = p.determinan ? p.determinan.dominant_factor : '';
            if (dom.includes('Sanitasi') || dom.includes('WASH')) pinColor = '#3b82f6'; // Blue
            else if (dom.includes('Infeksi')) pinColor = '#eab308'; // Yellow
            else if (dom.includes('MP-ASI') || dom.includes('ASI')) pinColor = '#a855f7'; // Purple
            else if (dom.includes('BBLR')) pinColor = '#f43f5e'; // Rose
            else pinColor = '#64748b';
          } else {
            if (p.severity === 'SEVERELY_STUNTED') {
              pinColor = '#dc2626'; // Red
              radius = 7;
            } else if (p.status_stunting && p.status_stunting.includes('Pendek')) {
              pinColor = '#f97316'; // Orange
              radius = 6;
            }
          }

          const marker = createCircleMarker(p.latitude, p.longitude, pinColor, radius, 0.85);

          const badgeClass = p.severity === 'SEVERELY_STUNTED' ? 'badge-severe' : (p.status_stunting && p.status_stunting.includes('Pendek') ? 'badge-stunted' : 'badge-normal');
          const gpsBadge = p.isRealGps ? '<span style="color:#059669;font-weight:700;">📍 GPS Riil</span>' : '<span style="color:#2563eb;">🌐 Spasial Estimasi</span>';

          const popupContent = \`
            <div style="min-width: 180px;">
              <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 2px;">\${p.nama_balita}</div>
              <div style="font-size: 10px; color: #64748b; margin-bottom: 6px;">Desa: \${p.desa_kel || '-'} | \${gpsBadge}</div>
              <div style="margin-bottom: 6px;">
                <span class="\${badgeClass}">\${p.status_stunting}</span>
              </div>
              <div style="font-size: 11px; color: #334155; border-top: 1px solid #e2e8f0; padding-top: 4px;">
                <div>Z-Score TB/U: <strong>\${p.zs_tbu !== null && p.zs_tbu !== undefined ? Number(p.zs_tbu).toFixed(2) + ' SD' : '-'}</strong></div>
                <div>Determinan: <strong>\${p.determinan ? p.determinan.dominant_factor : 'WASH/Pola Asuh'}</strong></div>
              </div>
            </div>
          \`;

          marker.bindPopup(popupContent);
          marker.addTo(map);

          if (selectedId && p.id === selectedId) {
            marker.openPopup();
          }
        });
      }

      // 3. LAYER: PUSKESMAS & LOGISTIK PKMK
      if (activeLayer === 'LOGISTIK') {
        puskesmas.forEach(pkm => {
          const isDepleted = pkm.stockStatus === 'HABIS';
          const isLow = pkm.stockStatus === 'MENIPIS';
          const iconColor = isDepleted ? '#ef4444' : isLow ? '#f59e0b' : '#10b981';

          const pkmIcon = L.divIcon({
            className: 'custom-pkm-icon',
            html: \`<div style="background:\${iconColor};color:white;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;border:2px solid white;box-shadow:0 4px 8px rgba(0,0,0,0.3);">🏥</div>\`,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
          });

          const marker = L.marker([pkm.latitude, pkm.longitude], { icon: pkmIcon }).addTo(map);

          marker.bindPopup(\`
            <div style="min-width: 220px;">
              <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 2px;">\${pkm.nama}</div>
              <div style="margin-bottom: 6px;">
                <span class="\${isDepleted ? 'badge-danger' : isLow ? 'badge-warning' : 'badge-safe'}">
                  Stok PKMK: \${pkm.stockStatus}
                </span>
              </div>
              <div style="font-size: 11px; color: #334155; border-top: 1px solid #e2e8f0; padding-top: 6px;">
                <div>• Stok Tersedia: <strong>\${pkm.totalStok} box</strong></div>
                <div>• Demand Bulanan: <strong>\${pkm.monthlyDemand} box/bln</strong></div>
                <div>• Kasus Stunting: <strong>\${pkm.stuntingCases} balita</strong></div>
                <div>• Vulnerability Score: <strong>\${pkm.vulnerabilityScore}%</strong></div>
              </div>
            </div>
          \`);
        });
      }

      // Auto-fit view to bounds if no single child is focused
      if (!selectedId) {
        const boundsPoints = [];
        if (activeLayer === 'HOTSPOT' && clusters.length > 0) {
          clusters.forEach(c => boundsPoints.push([c.center.lat, c.center.lng]));
        } else if (activeLayer === 'LOGISTIK' && puskesmas.length > 0) {
          puskesmas.slice(0, 30).forEach(p => boundsPoints.push([p.latitude, p.longitude]));
        } else if (points.length > 0) {
          points.slice(0, 100).forEach(p => boundsPoints.push([p.latitude, p.longitude]));
        }
        if (boundsPoints.length > 0) {
          map.fitBounds(L.latLngBounds(boundsPoints), { padding: [35, 35], maxZoom: 12 });
        }
      }
    }
  </script>
</body>
</html>`;
  }, [filteredPoints, puskesmasList, hotspotClusters, selectedPoint, activeLayer]);

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-6 text-white shadow-xl border border-indigo-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-400" /> Prescriptive Geospatial AI Engine
              </span>
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-bold">
                SIGMA Geo Intelligence v3.0
              </span>
              {puskesmasName ? (
                <span className="bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 shadow-sm">
                  <Building2 className="w-3.5 h-3.5 text-emerald-300" /> Akses: Puskesmas {puskesmasName}
                </span>
              ) : (
                <span className="bg-indigo-400/20 text-indigo-200 border border-indigo-300/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" /> Cakupan: Seluruh Kabupaten Malang (Superadmin)
                </span>
              )}
            </div>

            <h2 className="text-2xl md:text-3xl font-black tracking-tight !text-white" style={{ color: '#ffffff' }}>
              Analysis Geo AI: Hotspot, Determinan &amp; Logistik PKMK
            </h2>
            <p className="text-sm max-w-3xl leading-relaxed !text-slate-200" style={{ color: '#e2e8f0' }}>
              Sistem analitik spasial preskriptif mengintegrasikan sebaran individu balita, deteksi klaster hotspot <em>Getis-Ord Gi*</em>, 
              inferensi kausal 26 variabel survey determinan, dan optimasi <em>supply-demand</em> rantai pasok formula PKMK di 39 Puskesmas.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={generateAiResume}
              disabled={aiLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-500/25 border border-indigo-400/40 transition"
            >
              <Sparkles className={`w-4 h-4 text-amber-300 ${aiLoading ? 'animate-spin' : ''}`} />
              <span>{aiLoading ? 'Menganalisis AI...' : 'Generate AI Summary'}</span>
            </button>

            <button
              onClick={fetchGeoData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync AI Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xl">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Hotspot Stunting</span>
            <span className="text-2xl font-black text-slate-800">{summary?.totalStunted || 628}</span>
            <span className="text-[11px] text-rose-600 font-semibold block mt-0.5">
              {summary?.totalSeverelyStunted || 174} Severely Stunted
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl">
            <Droplets className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Determinan Teridentifikasi</span>
            <span className="text-2xl font-black text-indigo-700">
              {determinanStats?.totalSurveys || 38} Survey
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              {determinanStats?.asiMpasiIssues || 29} MP-ASI • {determinanStats?.infeksiIssues || 13} Infeksi
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Logistik PKMK Rentan</span>
            <span className="text-2xl font-black text-amber-600">
              {puskesmasList.filter(p => p.stockStatus !== 'AMAN').length} PKM
            </span>
            <span className="text-[11px] text-amber-700 font-semibold block mt-0.5">Stok Menipis vs Kasus Aktif</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Akurasi GPS Balita</span>
            <span className="text-2xl font-black text-emerald-600">{summary?.coveragePct || 100}%</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Terpetakan Spasial Presisi</span>
          </div>
        </div>
      </div>

      {/* === 2.5 AI EXECUTIVE RESUME PANEL === */}
      {showAiPanel && (
        <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-3">
          {/* AI Header Bar */}
          <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 px-6 py-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-indigo-500 p-0.5 flex items-center justify-center">
                <div className="w-full h-full bg-indigo-950 rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
              </div>
              <div>
                <h3 className="font-extrabold text-sm md:text-base flex items-center gap-2 !text-white" style={{ color: '#ffffff' }}>
                  SIGMA Geo AI: Executive Prescriptive Analytics &amp; Policy Resume
                </h3>
                <p className="text-xs !text-indigo-200" style={{ color: '#c7d2fe' }}>
                  Model: SIGMA AI Engine v3.0 • RAG Standar Pediatric &amp; Logistik Dinkes Kabupaten Malang
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {aiAnalysis && (
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition border border-white/20"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-200" />}
                  <span>{copied ? 'Tersalin!' : 'Salin Resume'}</span>
                </button>
              )}
              <button
                onClick={() => setShowAiPanel(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* AI Body Content */}
          <div className="p-6 space-y-6">
            {aiLoading ? (
              <div className="py-12 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 animate-pulse">
                  <Cpu className="w-8 h-8 animate-spin" />
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-slate-800 text-sm">Menghubungkan ke SIGMA AI Engine...</div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Menganalisis 728 sebaran koordinat balita, inferensi kausal 26 determinan lapangan, dan optimasi rantai pasok PKMK di 39 Puskesmas.
                  </p>
                </div>
              </div>

            ) : aiError ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">Gagal Membuat Resume AI</div>
                  <div>{aiError}</div>
                  <button onClick={generateAiResume} className="font-bold underline mt-1 text-rose-700 block">
                    Coba Lagi
                  </button>
                </div>
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-6">
                
                {/* 1. Executive Summary Highlight Box */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-50 via-blue-50/50 to-slate-50 border border-indigo-200/80 shadow-sm">
                  <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-xs uppercase tracking-wider mb-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Ringkasan Eksekutif &amp; Situasi Strategis
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed text-justify font-medium">
                    {aiAnalysis.executiveSummary}
                  </p>
                </div>

                {/* 2. Three Pillars Analytical Deep-Dive Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Pillar 1: Spatial Hotspots */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold text-xs uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                          <Flame className="w-4 h-4 text-rose-600" /> 1. Hotspot Getis-Ord Gi*
                        </span>
                        <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded">
                          Klaster Prioritas
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {aiAnalysis.spatialHotspotInsights?.summary}
                      </p>

                      <div className="space-y-2 pt-1">
                        {(aiAnalysis.spatialHotspotInsights?.priorityClusters || []).map((c: any, i: number) => (
                          <div key={i} className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200 text-xs">
                            <div className="flex items-center justify-between font-bold text-rose-950">
                              <span>{c.name}</span>
                              <span className="text-[10px] bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded">
                                {c.stuntingCount} Kasus
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 mt-1">
                              <div>Rasio Severely Stunted: <strong>{c.severeRatio}</strong></div>
                              <div>Faktor: <span className="font-semibold text-rose-800">{c.dominantFactor}</span></div>
                              {c.clinicalImpact && (
                                <div className="text-[10px] text-slate-500 mt-1 italic">
                                  "{c.clinicalImpact}"
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Pillar 2: Causal Determinants */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold text-xs uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                          <Droplets className="w-4 h-4 text-indigo-600" /> 2. Inferensi Kausal
                        </span>
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">
                          26 Determinan
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {aiAnalysis.causalDeterminantsInsights?.summary}
                      </p>

                      <div className="space-y-2 pt-1">
                        <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase block">Akar Masalah Utama:</span>
                          <span className="font-bold text-indigo-950">{aiAnalysis.causalDeterminantsInsights?.primaryRootCause}</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Akar Masalah Sekunder:</span>
                          <span className="font-semibold text-slate-800">{aiAnalysis.causalDeterminantsInsights?.secondaryRootCause}</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase block">Rekomendasi Tindakan:</span>
                          <span>{aiAnalysis.causalDeterminantsInsights?.actionableCorrection}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pillar 3: Logistics & Supply Chain */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold text-xs uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                          <Boxes className="w-4 h-4 text-emerald-600" /> 3. Logistik PKMK
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          aiAnalysis.supplyChainLogisticsInsights?.stockoutRiskLevel === 'TINGGI' 
                            ? 'bg-rose-100 text-rose-800' 
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          Risiko: {aiAnalysis.supplyChainLogisticsInsights?.stockoutRiskLevel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {aiAnalysis.supplyChainLogisticsInsights?.summary}
                      </p>

                      <div className="space-y-2 pt-1">
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs">
                          <span className="text-[10px] font-bold text-amber-700 uppercase block">Puskesmas Rentan Stockout:</span>
                          <span className="font-black text-amber-900 text-base">
                            {aiAnalysis.supplyChainLogisticsInsights?.vulnerablePuskesmasCount} Puskesmas
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Rencana Redistribusi:</span>
                          <span className="font-medium leading-relaxed">{aiAnalysis.supplyChainLogisticsInsights?.redistributionPlan}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* 3. Prescriptive Policy Action Plan (Matrix) */}
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs uppercase tracking-wider">
                    <Target className="w-4 h-4 text-blue-600" />
                    Rencana Aksi Preskriptif Terukur (Prescriptive Policy Roadmap)
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(aiAnalysis.prescriptiveActionPlan || []).map((plan: any, i: number) => (
                      <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-700">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800">
                            {plan.timeframe}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 text-sm">{plan.action}</div>
                        <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-600">
                          <div>📍 Target: <strong>{plan.targetArea}</strong></div>
                          <div>👤 PIC: <strong>{plan.stakeholder}</strong></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 3. Layer Switcher Bar */}
      <div className="bg-slate-100/90 p-2 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-600 ml-2" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">AI Geo Layer:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveLayer('INDIVIDU')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
              activeLayer === 'INDIVIDU'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-200/60 border border-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>1. Individu Balita</span>
          </button>

          <button
            onClick={() => setActiveLayer('HOTSPOT')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
              activeLayer === 'HOTSPOT'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-200/60 border border-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>2. AI Hotspot Clusters</span>
          </button>

          <button
            onClick={() => setActiveLayer('DETERMINAN')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
              activeLayer === 'DETERMINAN'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-200/60 border border-slate-200'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>3. Spatial Determinan</span>
          </button>

          <button
            onClick={() => setActiveLayer('LOGISTIK')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
              activeLayer === 'LOGISTIK'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-200/60 border border-slate-200'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>4. Puskesmas &amp; Logistik PKMK</span>
          </button>
        </div>
      </div>

      {/* 4. Map & Sidebar Explorer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Filter & Interactive List */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 flex flex-col h-[650px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-600" /> Filter &amp; Daftar Target
            </h3>
            <span className="text-xs font-semibold text-slate-400">
              {filteredPoints.length} Ditemukan
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama balita atau desa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white transition"
            />
          </div>

          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg text-xs font-bold text-slate-600">
            <button
              onClick={() => setFilterStatus("ALL")}
              className={`py-1.5 rounded-md transition ${filterStatus === 'ALL' ? 'bg-white text-blue-600 shadow-sm' : 'hover:bg-slate-200'}`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterStatus("STUNTED")}
              className={`py-1.5 rounded-md transition ${filterStatus === 'STUNTED' ? 'bg-white text-rose-600 shadow-sm' : 'hover:bg-slate-200'}`}
            >
              Stunting
            </button>
            <button
              onClick={() => setFilterStatus("NORMAL")}
              className={`py-1.5 rounded-md transition ${filterStatus === 'NORMAL' ? 'bg-white text-emerald-600 shadow-sm' : 'hover:bg-slate-200'}`}
            >
              Normal
            </button>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Memuat data spasial...</div>
            ) : filteredPoints.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">Tidak ada data ditemukan</div>
            ) : (
              filteredPoints.map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedPoint(b)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                    selectedPoint?.id === b.id
                      ? 'bg-blue-50 border-blue-400 shadow-sm ring-1 ring-blue-400'
                      : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                    <span>{b.nama_balita}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                      b.severity === 'SEVERELY_STUNTED' ? 'bg-rose-200 text-rose-900 font-extrabold' :
                      b.status_stunting?.includes('Pendek')
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {b.severity === 'SEVERELY_STUNTED' ? 'Severely Stunted' : (b.status_stunting?.includes('Pendek') ? 'Stunting' : 'Normal')}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
                    <span>📍 {b.desa_kel || 'Kabupaten Malang'}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        b.isRealGps ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {b.isRealGps ? '📍 GPS Riil' : '🌐 Spasial Estimasi'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {b.latitude?.toFixed(4)}, {b.longitude?.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  {b.determinan && (
                    <div className="mt-2 pt-1.5 border-t border-slate-200/80 flex items-center justify-between text-[10px]">
                      <span className="text-indigo-600 font-bold">🧬 {b.determinan.dominant_factor}</span>
                      <span className="text-slate-400">Skor: {b.determinan.risk_score}/26</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Interactive Leaflet Multi-Layer Map View */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-[650px]">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Peta Spasial Multi-Layer (OpenStreetMap Leaflet Engine)
              </span>
            </div>
            {selectedPoint && (
              <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                Fokus: {selectedPoint.nama_balita} ({selectedPoint.desa_kel})
              </span>
            )}
          </div>

          <div className="flex-1 bg-slate-100 min-h-[500px] relative">
            <iframe
              key={`map-${activeLayer}-${filteredPoints.length}-${selectedPoint?.id || 'all'}`}
              title="OpenStreetMap Geo AI Multi-Layer View"
              srcDoc={leafletHtml}
              className="w-full h-full border-none"
            />

            {/* Selected Point Floating Card */}
            {selectedPoint && (
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-slate-200 max-w-lg animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">{selectedPoint.nama_balita}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Desa: {selectedPoint.desa_kel || '-'} • NIK: {selectedPoint.nik || '-'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPoint(null)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Status Pertumbuhan:</span>
                    <span className="font-bold text-slate-800">{selectedPoint.status_stunting}</span>
                    <span className="font-mono text-slate-400 text-[10px] block">
                      Z-Score TB/U: {selectedPoint.zs_tbu != null ? `${selectedPoint.zs_tbu.toFixed(2)} SD` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Determinan Utama:</span>
                    <span className="font-bold text-indigo-700">
                      {selectedPoint.determinan?.dominant_factor || 'WASH / Pola Asuh'}
                    </span>
                    <span className="font-mono text-slate-400 text-[10px] block">
                      {selectedPoint.latitude?.toFixed(4)}, {selectedPoint.longitude?.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 5. Three Scientific AI Analytics Insights Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Panel 1: AI Hotspot Clustering */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-rose-600" />
              1. AI Hotspot Clusters
            </h4>
            <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded">
              Getis-Ord Gi*
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Deteksi zona merah konsentrasi kasus <em>Severely Stunted</em> berdasarkan kerapatan spasial.
          </p>

          <div className="space-y-2">
            {hotspotClusters.map((c, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-rose-50/60 border border-rose-200 text-xs">
                <div className="flex items-center justify-between font-bold text-rose-950">
                  <span>{c.name}</span>
                  <span className="text-[10px] bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded">
                    {c.stuntingCount} Kasus
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 mt-1 flex items-center justify-between">
                  <span>Rasio Sangat Pendek: <strong>{c.severeRatio}</strong></span>
                  <span className="text-[10px] text-rose-700 font-semibold">{c.riskLevel.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 2: Spatial Causal Inference (Determinan 26 Faktor) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-indigo-600" />
              2. Spatial Causal Determinan
            </h4>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded">
              26 Faktor
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Akar masalah dominan stunting hasil inferensi survey determinan lapangan di Kabupaten Malang.
          </p>

          <div className="space-y-2">
            {determinanStats && determinanStats.totalSurveys > 0 ? (
              <>
                <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-indigo-950 block">Pola ASI &amp; MP-ASI</span>
                    <span className="text-[10px] text-slate-500">Keragaman pangan &amp; frekuensi rendah ({determinanStats.asiMpasiIssues} kasus)</span>
                  </div>
                  <span className="font-mono font-bold text-indigo-700 text-sm">{determinanStats.mpasiPct}%</span>
                </div>

                <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-indigo-950 block">Penyakit Infeksi Berulang</span>
                    <span className="text-[10px] text-slate-500">Diare &amp; ISPA 2 minggu terakhir ({determinanStats.infeksiIssues} kasus)</span>
                  </div>
                  <span className="font-mono font-bold text-indigo-700 text-sm">{determinanStats.infeksiPct}%</span>
                </div>

                <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-indigo-950 block">Sanitasi &amp; Air Minum (WASH)</span>
                    <span className="text-[10px] text-slate-500">Jamban tidak sehat &amp; air belum diolah ({determinanStats.washIssues} kasus)</span>
                  </div>
                  <span className="font-mono font-bold text-indigo-700 text-sm">{determinanStats.washPct}%</span>
                </div>

                <div className="mt-2 px-2.5 py-1.5 bg-indigo-900/5 rounded-lg text-[10px] text-slate-500 text-center">
                  Dari <strong>{determinanStats.totalSurveys}</strong> survey determinan lapangan yang dikumpulkan
                </div>
              </>
            ) : (
              <div className="p-4 text-center text-[11px] text-slate-400">
                <div className="font-semibold text-slate-600 mb-1">Survey Determinan Belum Ada</div>
                <div>Lakukan survey determinan via Menu <span className="font-bold text-indigo-600">Determinan Stunting</span> untuk mengaktifkan analisis ini.</div>
              </div>
            )}
          </div>
        </div>

        {/* Panel 3: Logistik PKMK Supply-Demand */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-emerald-600" />
              3. AI Logistik Optimization
            </h4>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded">
              39 Puskesmas
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Keseimbangan rantai pasok formula PKMK per <em>catchment area</em> untuk mencegah zero-stockout.
          </p>

          <div className="space-y-2">
            {puskesmasList.slice(0, 3).map((p, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>{p.nama}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    p.stockStatus === 'HABIS' ? 'bg-rose-100 text-rose-800' :
                    p.stockStatus === 'MENIPIS' ? 'bg-amber-100 text-amber-800' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {p.stockStatus}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>Stok: <strong>{p.totalStok} box</strong></span>
                  <span>Demand: <strong>{p.monthlyDemand} box/bln</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
