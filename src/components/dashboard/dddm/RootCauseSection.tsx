"use client";

import React, { useState } from "react";
import { CauseNode, CauseEdge, ProblemCandidate } from "@/lib/dddm/dddmTypes";
import { GitFork, Network, CheckCircle2, HelpCircle, Layers, ArrowUp, ArrowDown, Info } from "lucide-react";

interface RootCauseSectionProps {
  coreProblem: ProblemCandidate | null;
  nodes: CauseNode[];
  edges: CauseEdge[];
}

export default function RootCauseSection({ coreProblem, nodes, edges }: RootCauseSectionProps) {
  const [viewMode, setViewMode] = useState<"tree" | "fishbone">("tree");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // Group nodes for Fishbone view
  const fishboneCategories: { [key in CauseNode["category"]]: string } = {
    sdm: "SDM & Kompetensi",
    metode: "Metode & Alur SOP",
    sarana: "Sarana & Logistik",
    pengukuran: "Pengukuran & Data",
    pembiayaan: "Pembiayaan & Pagu",
    lingkungan: "Partisipasi & Lingkungan",
  };

  const rootCauses = nodes.filter(n => n.type === "root_cause");
  const effects = nodes.filter(n => n.type === "effect");

  return (
    <div className="space-y-6">
      {/* View Switcher Top Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <span className="material-icons-round text-teal-600 text-lg">schema</span>
            Analisis Akar Penyebab Masalah (Root Cause Analysis)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Sesuai PRD DDDM, sediakan 2 mode telaah sebab: <strong>Problem Tree</strong> dan <strong>Ishikawa/Fishbone</strong>.
          </p>
        </div>

        {/* Mode Toggle Buttons */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewMode("tree")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === "tree"
                ? "bg-white text-teal-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            Problem Tree (DAG)
          </button>
          <button
            onClick={() => setViewMode("fishbone")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === "fishbone"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            Ishikawa Fishbone (6M)
          </button>
        </div>
      </div>

      {/* Main Diagram Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {viewMode === "tree" ? (
            /* ─────────────────────────────────────────────────────────── */
            /* MODE 1: PROBLEM TREE VIEW */
            /* ─────────────────────────────────────────────────────────── */
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
              {/* Level 1: Effects (Akibat/Dampak) */}
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">
                  <ArrowUp className="w-4 h-4 text-purple-500" />
                  Akibat / Dampak Lanjut (Effects)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {effects.map((eff) => (
                    <div
                      key={eff.id}
                      onClick={() => setSelectedNodeId(eff.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        selectedNodeId === eff.id
                          ? "border-purple-500 bg-purple-50/50 shadow-sm"
                          : "border-purple-100 bg-purple-50/20 hover:border-purple-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase text-purple-700">Dampak</span>
                        <span className="text-[9px] font-mono px-1 rounded bg-purple-100 text-purple-800 font-bold">
                          {eff.claim_type}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 leading-snug">{eff.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connecting Tree Line */}
              <div className="flex justify-center">
                <div className="w-0.5 h-6 bg-slate-300 relative">
                  <div className="absolute top-1/2 -left-1 w-2.5 h-0.5 bg-slate-400" />
                </div>
              </div>

              {/* Level 2: Core Problem (Masalah Inti) */}
              <div>
                <div className="flex items-center justify-center">
                  <div
                    onClick={() => setSelectedNodeId("NODE-CORE")}
                    className={`max-w-md w-full p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                      selectedNodeId === "NODE-CORE"
                        ? "border-teal-600 bg-teal-50 ring-2 ring-teal-200 shadow-md"
                        : "border-teal-400 bg-teal-50/70 hover:border-teal-600 shadow-xs"
                    }`}
                  >
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-teal-600 text-white mb-1.5 inline-block">
                      Masalah Inti (Core Problem)
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-sm leading-snug">
                      {coreProblem?.title || "Masalah Kesehatan Prioritas"}
                    </h4>
                    <p className="text-[11px] text-teal-800 mt-1 line-clamp-1">
                      Kesenjangan capaian: {coreProblem?.gap_value} {coreProblem?.gap_unit} terhadap target
                    </p>
                  </div>
                </div>
              </div>

              {/* Connecting Tree Line */}
              <div className="flex justify-center">
                <div className="w-0.5 h-6 bg-slate-300 relative">
                  <div className="absolute top-1/2 -left-1 w-2.5 h-0.5 bg-slate-400" />
                </div>
              </div>

              {/* Level 3: Root Causes (Akar Masalah) */}
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">
                  <ArrowDown className="w-4 h-4 text-rose-500" />
                  Akar Penyebab Utama (Root Causes)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {rootCauses.map((cause) => {
                    const isSelected = selectedNodeId === cause.id;
                    const isObserved = cause.claim_type === "OBSERVED";
                    return (
                      <div
                        key={cause.id}
                        onClick={() => setSelectedNodeId(cause.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "border-teal-600 bg-teal-50/50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-teal-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {fishboneCategories[cause.category]}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                              isObserved
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {cause.claim_type}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 leading-snug">{cause.label}</p>
                        <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                          <span>{cause.controllability}</span>
                          <span className="font-mono">{cause.evidence_refs.join(", ")}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────── */
            /* MODE 2: ISHIKAWA FISHBONE VIEW */
            /* ─────────────────────────────────────────────────────────── */
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
              {/* Fish Head Box */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    Kepala Ikan (Core Effect)
                  </span>
                  <h4 className="font-black text-slate-900 text-base mt-1">
                    {coreProblem?.title}
                  </h4>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <span>Model: <strong>Ishikawa 6M Kesehatan</strong></span>
                </div>
              </div>

              {/* Fishbone Ribs (Categories) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Object.keys(fishboneCategories) as CauseNode["category"][]).map((catKey) => {
                  const matchingCauses = rootCauses.filter(c => c.category === catKey);
                  return (
                    <div
                      key={catKey}
                      className="border border-slate-200/80 rounded-xl p-3.5 bg-slate-50/50"
                    >
                      <div className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>{fishboneCategories[catKey]}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                          {matchingCauses.length} sebab
                        </span>
                      </div>

                      {matchingCauses.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">Tidak ada faktor dominan di kategori ini.</p>
                      ) : (
                        <div className="space-y-2">
                          {matchingCauses.map((c) => (
                            <div
                              key={c.id}
                              onClick={() => setSelectedNodeId(c.id)}
                              className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                                selectedNodeId === c.id
                                  ? "bg-white border-indigo-500 shadow-xs"
                                  : "bg-white border-slate-200 hover:border-indigo-300"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-slate-800 leading-tight">{c.label}</span>
                              </div>
                              <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                                <span>{c.claim_type}</span>
                                <span>{c.evidence_refs.join(", ")}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Detail Drawer */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
              <Info className="w-4 h-4 text-teal-600" />
              Detail Simpul & Penelaahan Bukti
            </div>

            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                    ID: {selectedNode.id}
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-sm mt-1 leading-snug">
                    {selectedNode.label}
                  </h4>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tipe Simpul:</span>
                    <strong className="text-slate-800 capitalize">{selectedNode.type.replace('_', ' ')}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kategori 6M:</span>
                    <strong className="text-slate-800 uppercase">{selectedNode.category}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status Klaim:</span>
                    <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[10px] ${
                      selectedNode.claim_type === "OBSERVED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {selectedNode.claim_type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kendali Program:</span>
                    <strong className="text-slate-800 capitalize">{selectedNode.controllability}</strong>
                  </div>
                </div>

                {selectedNode.verification_needed && (
                  <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-xs">
                    <div className="font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                      Pertanyaan Verifikasi Lapangan:
                    </div>
                    <p className="text-amber-800 text-[11px] leading-relaxed">
                      {selectedNode.verification_needed}
                    </p>
                  </div>
                )}

                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Tautan Bukti Database:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.evidence_refs.map(r => (
                      <span key={r} className="font-mono text-xs font-bold px-2 py-1 rounded bg-teal-50 text-teal-800 border border-teal-200">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs">Klik salah satu simpul penyebab atau akibat untuk memeriksa bukti pendukung.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 italic">
            Simpul dengan label <strong>HYPOTHESIS</strong> memerlukan konfirmasi tim perencana sebelum diformulasikan ke dalam matriks kegiatan.
          </div>
        </div>
      </div>
    </div>
  );
}
