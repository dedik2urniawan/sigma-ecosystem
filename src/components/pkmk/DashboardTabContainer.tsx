"use client";

import React, { useState } from "react";
import { FileText, Calendar, MapPin, LayoutDashboard, Microscope, Sparkles } from "lucide-react";
import AnalyticsSection from "./AnalyticsSection";
import WelcomeModal from "./WelcomeModal";
import UserInfoBadge from "./UserInfoBadge";
import DashboardStats from "./DashboardStats";
import AnalysisGeoAI from "./AnalysisGeoAI";
import AnalyticalScientific from "./AnalyticalScientific";

export default function DashboardTabContainer() {
  const [activeTab, setActiveTab] = useState<'geo_ai' | 'kpi_pkmk' | 'scientific'>('kpi_pkmk');

  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="dashboard-container">
      <WelcomeModal />

      {/* Top Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            Dashboard SIGMA PKMK
            <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2.5 py-1 rounded-full">
              v2.0 System
            </span>
          </h1>
          <p className="page-subtitle">
            <UserInfoBadge fallbackText="Ringkasan data pemantauan, analisis Geo AI, dan riset intervensi gizi." />
          </p>
        </div>
        <div className="date-badge">
          <Calendar size={16} />
          <span>Update Terakhir: {today}</span>
        </div>
      </div>

      {/* Sub Tab Navigation Bar — Modern Roundbox Solid Aesthetic */}
      <div className="bg-slate-100/90 p-2 sm:p-2.5 rounded-2xl border border-slate-200/90 mb-8 grid grid-cols-1 md:grid-cols-3 gap-2.5 shadow-xs">
        {/* Sub Tab 1: Analysis Geo AI */}
        <button
          onClick={() => setActiveTab('geo_ai')}
          className={`flex items-center justify-between gap-3 py-3 px-4 rounded-xl font-extrabold text-xs md:text-sm transition-all duration-200 ${
            activeTab === 'geo_ai'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 border border-blue-600 scale-[1.01]'
              : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-blue-600 border border-slate-200/90 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2.5 truncate">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${activeTab === 'geo_ai' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>
              <MapPin className="w-4 h-4" />
            </div>
            <span className="truncate">Analysis Geo AI</span>
          </div>
          <span className={`text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full shrink-0 ${
            activeTab === 'geo_ai' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'
          }`}>
            Spatial
          </span>
        </button>

        {/* Sub Tab 2: Dashboard KPI PKMK */}
        <button
          onClick={() => setActiveTab('kpi_pkmk')}
          className={`flex items-center justify-between gap-3 py-3 px-4 rounded-xl font-extrabold text-xs md:text-sm transition-all duration-200 ${
            activeTab === 'kpi_pkmk'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-500/25 border border-teal-600 scale-[1.01]'
              : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-teal-600 border border-slate-200/90 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2.5 truncate">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${activeTab === 'kpi_pkmk' ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-600'}`}>
              <LayoutDashboard className="w-4 h-4" />
            </div>
            <span className="truncate">Dashboard KPI PKMK</span>
          </div>
          <span className={`text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full shrink-0 ${
            activeTab === 'kpi_pkmk' ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-700'
          }`}>
            Kohort Core
          </span>
        </button>

        {/* Sub Tab 3: Analytical Scientific PKMK */}
        <button
          onClick={() => setActiveTab('scientific')}
          className={`flex items-center justify-between gap-3 py-3 px-4 rounded-xl font-extrabold text-xs md:text-sm transition-all duration-200 ${
            activeTab === 'scientific'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 border border-indigo-600 scale-[1.01]'
              : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-indigo-600 border border-slate-200/90 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2.5 truncate">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${activeTab === 'scientific' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
              <Microscope className="w-4 h-4" />
            </div>
            <span className="truncate">Analytical Scientific PKMK</span>
          </div>
          <span className={`text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full shrink-0 ${
            activeTab === 'scientific' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'
          }`}>
            SDIDTK + TPG
          </span>
        </button>
      </div>

      {/* Sub Tab Content 1: Analysis Geo AI */}
      {activeTab === 'geo_ai' && <AnalysisGeoAI />}

      {/* Sub Tab Content 2: Dashboard KPI PKMK */}
      {activeTab === 'kpi_pkmk' && (
        <div className="space-y-8">
          {/* Statistics Grid */}
          <DashboardStats />

          {/* Analytics Section */}
          <AnalyticsSection />

          {/* Info Panel - Tentang Sistem PKMK */}
          <div className="info-panel">
            <div className="info-icon">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="info-title">Tentang Sistem PKMK</h3>
              <p className="info-text">
                Aplikasi Intervensi Stunting dan Monitoring Evaluasi menggunakan formula ONS (Oral Nutrition Supplement)
                atau PKMK (Pangan Olahan untuk Keperluan Medis Khusus) dengan pendampingan dan asistensi medis oleh
                Dokter Pediatrik Dinas Kesehatan Kabupaten Malang.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sub Tab Content 3: Analytical Scientific PKMK */}
      {activeTab === 'scientific' && <AnalyticalScientific />}

    </div>
  );
}
