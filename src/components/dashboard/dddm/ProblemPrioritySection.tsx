"use client";

import React, { useState } from "react";
import { ProblemCandidate } from "@/lib/dddm/dddmTypes";
import { AlertCircle, Sliders, CheckCircle, HelpCircle, Trophy, Edit3, ArrowRight } from "lucide-react";

interface ProblemPrioritySectionProps {
  problems: ProblemCandidate[];
  selectedProblemId: string;
  onSelectProblem: (problemId: string) => void;
  onUpdateUsgScore?: (problemId: string, usg: { urgency: number; seriousness: number; growth: number; overrideReason?: string }) => void;
}

export default function ProblemPrioritySection({
  problems,
  selectedProblemId,
  onSelectProblem,
  onUpdateUsgScore,
}: ProblemPrioritySectionProps) {
  const [editingProblemId, setEditingProblemId] = useState<string | null>(null);
  const [sliderU, setSliderU] = useState<number>(3);
  const [sliderS, setSliderS] = useState<number>(3);
  const [sliderG, setSliderG] = useState<number>(3);
  const [overrideReason, setOverrideReason] = useState<string>("");

  const handleStartEdit = (prob: ProblemCandidate) => {
    setEditingProblemId(prob.problem_id);
    setSliderU(prob.usg.urgency);
    setSliderS(prob.usg.seriousness);
    setSliderG(prob.usg.growth);
    setOverrideReason(prob.usg.override_reason || "");
  };

  const handleSaveEdit = (probId: string) => {
    if (onUpdateUsgScore) {
      onUpdateUsgScore(probId, {
        urgency: sliderU,
        seriousness: sliderS,
        growth: sliderG,
        overrideReason: overrideReason.trim() ? overrideReason : undefined,
      });
    }
    setEditingProblemId(null);
  };

  return (
    <div className="space-y-6">
      {/* Intro Box */}
      <div className="bg-gradient-to-r from-teal-50 to-indigo-50 border border-teal-200/60 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-teal-200">
          <Trophy className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm">
            Prioritisasi Masalah Program Kesehatan (Metode USG)
          </h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Sesuai PRD DDDM, perumusan masalah diambil langsung dari kesenjangan data aktual. Nilai <strong>Urgency (U)</strong>, <strong>Seriousness (S)</strong>, dan <strong>Growth (G)</strong> berkisar 1–5 (total 3–15). Masalah dengan skor tertinggi menjadi rekomendasi prioritas utama untuk dianalisis akar penyebabnya (Problem Tree / Fishbone).
          </p>
        </div>
      </div>

      {/* Problem Cards List */}
      <div className="space-y-4">
        {problems.map((prob, index) => {
          const isSelected = selectedProblemId === prob.problem_id;
          const isEditing = editingProblemId === prob.problem_id;
          const currentTotal = isEditing ? sliderU + sliderS + sliderG : prob.usg.override_total || prob.usg.total;

          let rankBadge = (
            <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-600 font-extrabold text-xs flex items-center justify-center">
              #{prob.usg.rank || index + 1}
            </span>
          );
          if (index === 0) {
            rankBadge = (
              <span className="w-7 h-7 rounded-xl bg-amber-400 text-amber-950 font-extrabold text-xs flex items-center justify-center shadow-xs">
                #1
              </span>
            );
          }

          return (
            <div
              key={prob.problem_id}
              className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                isSelected
                  ? "border-teal-500 ring-2 ring-teal-200 shadow-md"
                  : "border-slate-200/80 hover:border-slate-300 shadow-xs"
              }`}
            >
              <div className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    {rankBadge}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                          {prob.domain.replace('_', ' ')}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {prob.problem_type}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-teal-50 text-teal-700">
                          {prob.claim_type}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-base mt-1">
                        {prob.title}
                      </h4>
                    </div>
                  </div>

                  {/* USG Score Pill */}
                  <div className="flex items-center gap-2 self-start md:self-auto">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex items-center gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Skor USG</span>
                        <span className="font-black text-slate-900 text-sm">{currentTotal} / 15</span>
                      </div>
                      <div className="border-l border-slate-200 pl-2 text-[10px] text-slate-500 space-y-0.5">
                        <div>U: <strong className="text-slate-800">{isEditing ? sliderU : prob.usg.urgency}</strong></div>
                        <div>S: <strong className="text-slate-800">{isEditing ? sliderS : prob.usg.seriousness}</strong></div>
                        <div>G: <strong className="text-slate-800">{isEditing ? sliderG : prob.usg.growth}</strong></div>
                      </div>
                    </div>

                    <button
                      onClick={() => (isEditing ? handleSaveEdit(prob.problem_id) : handleStartEdit(prob))}
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                      title={isEditing ? "Simpan Nilai USG" : "Ubah / Override Bobot USG"}
                    >
                      <Sliders className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Problem Statement Box */}
                <p className="text-xs text-slate-700 bg-slate-50/80 p-3 rounded-xl border border-slate-100 leading-relaxed mb-4">
                  {prob.statement}
                </p>

                {/* Interactive Slider Box (if in editing mode) */}
                {isEditing && (
                  <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 mb-4 space-y-3">
                    <div className="text-xs font-bold text-indigo-900 flex items-center justify-between">
                      <span>Penyesuaian Skor USG (Human-in-the-Loop Consensus)</span>
                      <span className="font-mono text-indigo-700">Total: {sliderU + sliderS + sliderG}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="font-semibold text-slate-700">Urgency (Kendesakan)</label>
                          <span className="font-bold text-teal-700">{sliderU}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={sliderU}
                          onChange={(e) => setSliderU(parseInt(e.target.value))}
                          className="w-full accent-teal-600 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="font-semibold text-slate-700">Seriousness (Kegawatan)</label>
                          <span className="font-bold text-indigo-700">{sliderS}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={sliderS}
                          onChange={(e) => setSliderS(parseInt(e.target.value))}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="font-semibold text-slate-700">Growth (Perkembangan Masalah)</label>
                          <span className="font-bold text-purple-700">{sliderG}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={sliderG}
                          onChange={(e) => setSliderG(parseInt(e.target.value))}
                          className="w-full accent-purple-600 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="Catatan konsensus / justifikasi override scoring..."
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 rounded-lg border border-indigo-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditingProblemId(null)}
                        className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => handleSaveEdit(prob.problem_id)}
                        className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                      >
                        Simpan Skor
                      </button>
                    </div>
                  </div>
                )}

                {/* Evidence References & Limitations */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span>Bukti Pendukung:</span>
                    {prob.evidence_refs.map((ref) => (
                      <span key={ref} className="font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                        {ref}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    {isSelected ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200">
                        <CheckCircle className="w-4 h-4 text-teal-600" />
                        Masalah Fokus Terpilih
                      </span>
                    ) : (
                      <button
                        onClick={() => onSelectProblem(prob.problem_id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-teal-700 bg-slate-100 hover:bg-teal-50 px-3 py-1.5 rounded-xl border border-slate-200 transition-all cursor-pointer"
                      >
                        Pilih Masalah Ini
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
