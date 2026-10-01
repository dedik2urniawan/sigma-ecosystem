"use client";

import React, { useState } from "react";
import { EvidenceItem, DomainType } from "@/lib/dddm/dddmTypes";
import { 
  Baby, 
  HeartPulse, 
  GraduationCap, 
  UtensilsCrossed, 
  Stethoscope, 
  ClipboardCheck, 
  CheckCircle, 
  AlertCircle, 
  Info,
  Filter,
  Sparkles,
  Layers
} from "lucide-react";

interface EvidenceMatrixSectionProps {
  evidenceList: EvidenceItem[];
  isLoading: boolean;
}

export default function EvidenceMatrixSection({ evidenceList, isLoading }: EvidenceMatrixSectionProps) {
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("all");

  const countByDomain = (domain: string) => {
    if (domain === "all") return evidenceList.length;
    return evidenceList.filter(e => e.domain === domain).length;
  };

  const domainTabs = [
    { id: "all", label: `Semua Domain (${countByDomain("all")})`, icon: Filter },
    { id: "balita_gizi", label: `Balita Gizi (${countByDomain("balita_gizi")})`, icon: Baby },
    { id: "ibu_hamil", label: `Ibu Hamil (${countByDomain("ibu_hamil")})`, icon: HeartPulse },
    { id: "remaja_putri", label: `Remaja Putri (${countByDomain("remaja_putri")})`, icon: GraduationCap },
    { id: "mbg", label: `Program MBG (${countByDomain("mbg")})`, icon: UtensilsCrossed },
    { id: "pkmk", label: `Intervensi PKMK (${countByDomain("pkmk")})`, icon: Stethoscope },
    { id: "bimtek_gizi", label: `Bimtek Gizi (${countByDomain("bimtek_gizi")})`, icon: ClipboardCheck },
  ];

  // Derive sub-categories based on selected domain
  const availableSubCategories = React.useMemo<string[]>(() => {
    if (selectedDomain === "balita_gizi") {
      const cats = Array.from(new Set(evidenceList.filter(e => e.domain === "balita_gizi").map(e => e.category).filter((c): c is string => Boolean(c))));
      return ["all", ...cats];
    }
    if (selectedDomain === "ibu_hamil") {
      const cats = Array.from(new Set(evidenceList.filter(e => e.domain === "ibu_hamil").map(e => e.category).filter((c): c is string => Boolean(c))));
      return ["all", ...cats];
    }
    return [];
  }, [selectedDomain, evidenceList]);

  // Handle domain change
  const handleDomainChange = (domainId: string) => {
    setSelectedDomain(domainId);
    setSelectedSubCategory("all");
  };

  // Filter evidence items
  const filteredEvidence = evidenceList.filter(e => {
    if (selectedDomain !== "all" && e.domain !== selectedDomain) return false;
    if (selectedSubCategory !== "all" && e.category !== selectedSubCategory) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Domain Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {domainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedDomain === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleDomainChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-teal-600 text-white shadow-sm shadow-teal-200"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sub-Category Chips (for Balita Gizi & Ibu Hamil) */}
      {availableSubCategories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none bg-slate-50 p-2 rounded-2xl border border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-400" />
            Kelompok:
          </span>
          {availableSubCategories.map((cat) => {
            const isCatActive = selectedSubCategory === cat;
            const count = cat === "all"
              ? evidenceList.filter(e => e.domain === selectedDomain).length
              : evidenceList.filter(e => e.domain === selectedDomain && e.category === cat).length;
            const label = cat === "all" ? "Semua Kelompok" : cat;

            return (
              <button
                key={cat}
                onClick={() => setSelectedSubCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isCatActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100"
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : filteredEvidence.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
          <Info className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="font-semibold text-sm">Tidak ada data bukti yang cocok dengan filter ini.</p>
        </div>
      ) : (
        /* Evidence Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvidence.map((evd) => {
            const hasGap = evd.gap_value !== null && evd.gap_value > 0;
            const isGood = evd.gap_value === 0;

            let statusBadge = (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Valid
              </span>
            );
            if (evd.data_status === "PARTIAL") {
              statusBadge = (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-100 text-amber-700 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Parsial
                </span>
              );
            }

            return (
              <div
                key={evd.evidence_id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                        {evd.domain_label}
                      </span>
                      {evd.category && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {evd.category}
                        </span>
                      )}
                    </div>
                    {statusBadge}
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mb-1 leading-snug">
                    {evd.label}
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mb-3">
                    Sasaran: {evd.population} • {evd.geography}
                  </p>

                  {/* Main Value & Target Box */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Nilai Observasi</div>
                      <div className="text-xl font-black text-slate-900">
                        {evd.value !== null ? evd.value : "—"}
                        <span className="text-xs font-semibold text-slate-500 ml-1">
                          {evd.unit === "percent" ? "%" : evd.unit === "score" ? "/100" : ""}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        n={evd.numerator?.toLocaleString("id-ID") ?? "0"} / N={evd.denominator?.toLocaleString("id-ID") ?? "0"}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Target Disahkan</div>
                      <div className="text-sm font-bold text-slate-700">
                        {evd.target !== null ? `${evd.target}${evd.unit === "percent" ? "%" : ""}` : "—"}
                      </div>
                      <div className="mt-1">
                        {hasGap ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
                            Gap: +{evd.gap_value} {evd.unit === "percent" ? "pp" : ""}
                          </span>
                        ) : isGood ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                            Memenuhi Target
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Baseline</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Evidence ID and Note */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-mono font-medium">{evd.evidence_id}</span>
                  <span className="truncate max-w-[160px] text-right" title={evd.notes}>
                    {evd.notes || "Tervalidasi SIGMA"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
