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
  Filter
} from "lucide-react";

interface EvidenceMatrixSectionProps {
  evidenceList: EvidenceItem[];
  isLoading: boolean;
}

export default function EvidenceMatrixSection({ evidenceList, isLoading }: EvidenceMatrixSectionProps) {
  const [selectedDomain, setSelectedDomain] = useState<string>("all");

  const domainTabs = [
    { id: "all", label: "Semua Domain (6)", icon: Filter },
    { id: "balita_gizi", label: "Balita Gizi", icon: Baby },
    { id: "ibu_hamil", label: "Ibu Hamil", icon: HeartPulse },
    { id: "remaja_putri", label: "Remaja Putri", icon: GraduationCap },
    { id: "mbg", label: "Program MBG", icon: UtensilsCrossed },
    { id: "pkmk", label: "Intervensi PKMK", icon: Stethoscope },
    { id: "bimtek_gizi", label: "Bimtek Gizi", icon: ClipboardCheck },
  ];

  const filteredEvidence = selectedDomain === "all" 
    ? evidenceList 
    : evidenceList.filter(e => e.domain === selectedDomain);

  return (
    <div className="space-y-4">
      {/* Domain Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {domainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedDomain === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedDomain(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
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
          <p className="font-semibold text-sm">Tidak ada data bukti yang cocok dengan filter domain ini.</p>
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
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                      {evd.domain_label}
                    </span>
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
