"use client";

import React from "react";
import { ObjectiveNode, StrategicAlternative } from "@/lib/dddm/dddmTypes";
import { Target, Compass, Award, CheckCircle2, DollarSign, AlertCircle, ArrowRight } from "lucide-react";

interface ObjectivesStrategySectionProps {
  objectives: ObjectiveNode[];
  strategies: StrategicAlternative[];
  selectedStrategyId: string;
  onSelectStrategy: (strategyId: string) => void;
}

export default function ObjectivesStrategySection({
  objectives,
  strategies,
  selectedStrategyId,
  onSelectStrategy,
}: ObjectivesStrategySectionProps) {
  const goalObj = objectives.find(o => o.level === "goal");
  const purposeObj = objectives.find(o => o.level === "purpose");
  const outputObjs = objectives.filter(o => o.level === "output");

  return (
    <div className="space-y-8">
      {/* ─────────────────────────────────────────────────────────── */}
      {/* 1. OBJECTIVES HIERARCHY */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">
              Pohon Tujuan (Objectives Hierarchy)
            </h3>
            <p className="text-xs text-slate-500">
              Transformasi hubungan sebab-akibat menjadi hubungan sarana-tujuan (Means-Ends Relationship).
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          {/* Goal Level */}
          {goalObj && (
            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-purple-600 text-white">
                  Tujuan Jangka Panjang (Goal / Impact)
                </span>
                <span className="text-[10px] font-semibold text-purple-700">{goalObj.timeframe}</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm leading-snug">{goalObj.title}</h4>
              <p className="text-xs text-slate-600 mt-1">
                <strong>Indikator Kunci:</strong> {goalObj.indicator} • <strong>Target:</strong> {goalObj.target}
              </p>
            </div>
          )}

          {/* Purpose Level */}
          {purposeObj && (
            <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-4 ml-0 md:ml-6">
              <div className="flex items-center justify-between mb-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-teal-600 text-white">
                  Tujuan Program (Purpose / Outcome)
                </span>
                <span className="text-[10px] font-semibold text-teal-700">{purposeObj.timeframe}</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm leading-snug">{purposeObj.title}</h4>
              <p className="text-xs text-slate-600 mt-1">
                <strong>Indikator Kunci:</strong> {purposeObj.indicator} • <strong>Target:</strong> {purposeObj.target}
              </p>
            </div>
          )}

          {/* Outputs Level */}
          <div className="ml-0 md:ml-12 space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Keluaran Terukur (Outputs / Means)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {outputObjs.map((out) => (
                <div key={out.id} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">{out.id}</span>
                    <h5 className="font-bold text-slate-800 text-xs mt-1 leading-snug">{out.title}</h5>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] text-slate-500">
                    <p><strong>Target:</strong> {out.target}</p>
                    <p className="text-slate-400 mt-0.5">{out.owner}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 2. STRATEGIC ALTERNATIVES (MCDA) */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">
              Analisis Alternatif & Pemilihan Strategi (MCDA)
            </h3>
            <p className="text-xs text-slate-500">
              Evaluasi komparatif multi-kriteria (Dampak, Kelayakan, Biaya, Kapasitas) untuk penetapan intervensi.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {strategies.map((strat) => {
            const isSelected = selectedStrategyId === strat.id;
            const isSpesifik = strat.type === "spesifik";

            return (
              <div
                key={strat.id}
                className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between ${
                  isSelected
                    ? "border-teal-500 ring-2 ring-teal-200 shadow-md"
                    : "border-slate-200/80 hover:border-slate-300 shadow-xs"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                        isSpesifik
                          ? "bg-rose-100 text-rose-800"
                          : "bg-indigo-100 text-indigo-800"
                      }`}
                    >
                      Intervensi {strat.type}
                    </span>
                    <span className="text-xs font-black font-mono px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800">
                      Skor: {strat.mcda_score.total_score}/100
                    </span>
                  </div>

                  <h4 className="font-extrabold text-slate-900 text-sm leading-snug mb-2">
                    {strat.title}
                  </h4>

                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                    {strat.mechanism_of_change}
                  </p>

                  {/* MCDA Radar/Bars */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs space-y-1.5 mb-4">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">Dampak Efektivitas:</span>
                      <strong className="text-teal-700">{strat.mcda_score.impact} / 5</strong>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">Kelayakan Operasional:</span>
                      <strong className="text-indigo-700">{strat.mcda_score.feasibility} / 5</strong>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">Efisiensi Anggaran:</span>
                      <strong className="text-amber-700">{strat.mcda_score.cost_efficiency} / 5</strong>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">Kesiapan Kapasitas SDM:</span>
                      <strong className="text-purple-700">{strat.mcda_score.capacity} / 5</strong>
                    </div>
                  </div>

                  {/* Components bullets */}
                  <div className="space-y-1.5 mb-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Komponen Kegiatan:
                    </span>
                    {strat.components.map((comp, i) => (
                      <div key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                        <span className="text-teal-500 font-bold">•</span>
                        <span>{comp}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <div className="text-[11px] text-slate-500 mb-3 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    <span>Estimasi Biaya: <strong>{strat.indicative_cost}</strong></span>
                  </div>

                  {isSelected ? (
                    <div className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-sm shadow-teal-200">
                      <CheckCircle2 className="w-4 h-4" />
                      Strategi Terpilih (Prioritas RKA)
                    </div>
                  ) : (
                    <button
                      onClick={() => onSelectStrategy(strat.id)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 font-bold text-xs border border-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      Pilih Strategi Ini
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
