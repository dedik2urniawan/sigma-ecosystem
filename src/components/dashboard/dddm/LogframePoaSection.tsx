"use client";

import React, { useState } from "react";
import { LogframeItem, PlanOfActionItem, StrategicAlternative } from "@/lib/dddm/dddmTypes";
import { Table, Calendar, DollarSign, ShieldAlert, CheckCircle2, ChevronRight, FileSpreadsheet } from "lucide-react";

interface LogframePoaSectionProps {
  logframe: LogframeItem[];
  poa: PlanOfActionItem[];
  selectedStrategy: StrategicAlternative | null;
}

export default function LogframePoaSection({
  logframe,
  poa,
  selectedStrategy,
}: LogframePoaSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState<"logframe" | "poa">("poa");

  const totalBudget = poa.reduce((acc, p) => acc + (p.estimated_cost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Bar Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div>
          <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded">
            Fase Operasional RKA / Renja
          </span>
          <h3 className="font-extrabold text-slate-900 text-base mt-1">
            Matriks Perencanaan & Rencana Kerja Operasional (PoA)
          </h3>
          <p className="text-xs text-slate-500">
            Strategi Terpilih: <strong>{selectedStrategy?.title || "Intervensi Gizi Presisi"}</strong>
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveSubTab("poa")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === "poa"
                ? "bg-white text-teal-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Plan of Action (PoA)
          </button>
          <button
            onClick={() => setActiveSubTab("logframe")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === "logframe"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            Matriks Logframe (OOPP)
          </button>
        </div>
      </div>

      {activeSubTab === "poa" ? (
        /* ─────────────────────────────────────────────────────────── */
        /* SUB-TAB 1: PLAN OF ACTION (POA) */
        /* ─────────────────────────────────────────────────────────── */
        <div className="space-y-4">
          {/* Summary Box */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                Rp
              </div>
              <div>
                <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
                  Total Estimasi Anggaran Rencana Aksi
                </span>
                <div className="text-xl font-black text-slate-900">
                  Rp {totalBudget.toLocaleString("id-ID")},-
                </div>
              </div>
            </div>

            <div className="text-right text-xs text-slate-600">
              <span className="block font-semibold">4 Paket Intervensi Operasional</span>
              <span className="text-slate-500">Sumber: BOK, APBD Gizi & DAK Non-Fisik</span>
            </div>
          </div>

          {/* Table PoA */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">No / ID</th>
                    <th className="py-3 px-4">Kegiatan Operasional</th>
                    <th className="py-3 px-4">Sasaran / Volume</th>
                    <th className="py-3 px-4">Jadwal</th>
                    <th className="py-3 px-4">PIC Pelaksana</th>
                    <th className="py-3 px-4">Anggaran & Sumber</th>
                    <th className="py-3 px-4">Mitigasi Risiko</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {poa.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                        {item.id}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 max-w-[220px]">
                        {item.activity}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {item.target_volume}
                      </td>
                      <td className="py-3.5 px-4 text-teal-700 font-semibold whitespace-nowrap">
                        {item.schedule}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {item.pic}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block whitespace-nowrap">
                          {item.estimated_cost !== null
                            ? `Rp ${item.estimated_cost.toLocaleString("id-ID")}`
                            : "—"}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{item.budget_source}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-[200px]">
                        {item.risk_mitigation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────── */
        /* SUB-TAB 2: LOGICAL FRAMEWORK (LOGFRAME) */
        /* ─────────────────────────────────────────────────────────── */
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 w-[140px]">Tingkatan Logika</th>
                  <th className="py-3 px-4">Naratif Intervensi</th>
                  <th className="py-3 px-4">Indikator Terverifikasi (OVI)</th>
                  <th className="py-3 px-4">Sumber Pembuktian</th>
                  <th className="py-3 px-4">Asumsi Penting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logframe.map((row, idx) => {
                  let badgeColor = "bg-purple-100 text-purple-800";
                  if (row.level === "Outcome") badgeColor = "bg-teal-100 text-teal-800";
                  if (row.level === "Output") badgeColor = "bg-indigo-100 text-indigo-800";
                  if (row.level === "Activity") badgeColor = "bg-slate-100 text-slate-800";

                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-4 align-top">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${badgeColor}`}>
                          {row.level}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-900 align-top max-w-[240px]">
                        {row.statement}
                      </td>
                      <td className="py-4 px-4 text-slate-600 align-top max-w-[220px]">
                        {row.indicators}
                      </td>
                      <td className="py-4 px-4 text-slate-600 align-top max-w-[200px]">
                        {row.means_of_verification}
                      </td>
                      <td className="py-4 px-4 text-slate-500 text-[11px] align-top max-w-[200px]">
                        {row.assumptions}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
