"use client";

import React, { useState } from "react";
import { DDDMPlanDocument } from "@/lib/dddm/dddmTypes";
import { X, CheckCircle, Download, FileText, Printer, ShieldCheck, AlertCircle } from "lucide-react";

interface PlanReviewExportModalProps {
  plan: DDDMPlanDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onApprovePlan: (reviewerName: string, notes: string) => void;
}

export default function PlanReviewExportModal({
  plan,
  isOpen,
  onClose,
  onApprovePlan,
}: PlanReviewExportModalProps) {
  const [reviewerName, setReviewerName] = useState("Tim Perencana Dinkes Kabupaten Malang");
  const [approvalNotes, setApprovalNotes] = useState("Disahkan sesuai hasil telaah prioritas USG dan bukti database SIGMA.");

  if (!isOpen || !plan) return null;

  const isApproved = plan.status === "APPROVED";

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(plan, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${plan.plan_id}_dddm_plan.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadMarkdown = () => {
    let md = `# ${plan.title}\n\n`;
    md += `**ID Rencana:** ${plan.plan_id}  \n`;
    md += `**Wilayah:** ${plan.scope.puskesmas_name}  \n`;
    md += `**Periode:** ${plan.scope.periode}  \n`;
    md += `**Status:** ${plan.status}  \n`;
    md += `**Waktu Pembuatan:** ${plan.created_at}  \n\n`;

    md += `## 1. Bukti Data Terstruktur (Evidence Matrix)\n\n`;
    plan.evidence_matrix.forEach((e) => {
      md += `- **[${e.evidence_id}] ${e.label}**: ${e.value}${e.unit === "percent" ? "%" : ""} (Target: ${e.target}${e.unit === "percent" ? "%" : ""}, Gap: ${e.gap_value}${e.unit === "percent" ? "pp" : ""}) - Status: ${e.data_status}\n`;
    });

    md += `\n## 2. Masalah Prioritas (USG Scoring)\n\n`;
    plan.problem_candidates.forEach((p, idx) => {
      md += `### #${idx + 1} ${p.title} (Skor USG: ${p.usg.total}/15)\n`;
      md += `${p.statement}\n\n`;
    });

    md += `\n## 3. Strategi Intervensi Terpilih\n\n`;
    const selectedStrat = plan.strategic_alternatives.find((s) => s.id === plan.selected_strategy_id);
    if (selectedStrat) {
      md += `**${selectedStrat.title}** (Skor MCDA: ${selectedStrat.mcda_score.total_score}/100)\n`;
      md += `${selectedStrat.mechanism_of_change}\n\n`;
      md += `**Estimasi Biaya:** ${selectedStrat.indicative_cost}\n\n`;
    }

    md += `\n## 4. Matriks Logframe (OOPP)\n\n`;
    plan.logframe.forEach((l) => {
      md += `### ${l.level}\n- **Pernyataan:** ${l.statement}\n- **Indikator:** ${l.indicators}\n- **Verifikasi:** ${l.means_of_verification}\n- **Asumsi:** ${l.assumptions}\n\n`;
    });

    md += `\n## 5. Plan of Action (PoA) / Rencana Operasional\n\n`;
    plan.poa.forEach((p) => {
      md += `- **[${p.id}] ${p.activity}** | Volume: ${p.target_volume} | Jadwal: ${p.schedule} | PIC: ${p.pic} | Pagu: Rp ${(p.estimated_cost || 0).toLocaleString("id-ID")}\n`;
    });

    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(md);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${plan.plan_id}_dddm_plan.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Telaah & Pengesahan Dokumen DDDM
              </h3>
              <p className="text-xs text-slate-500">ID Dokumen: {plan.plan_id}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* Status Box */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Status Dokumen</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    isApproved
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {plan.status.replace("_", " ")}
                </span>
                <span className="text-slate-500">
                  {isApproved ? "Telah diverifikasi penelaah resmi" : "Memerlukan pengesahan manusia"}
                </span>
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-500">
              <p>Wilayah: <strong>{plan.scope.puskesmas_name}</strong></p>
              <p>Periode: <strong>{plan.scope.periode}</strong></p>
            </div>
          </div>

          {/* Verification / Approval Form */}
          {!isApproved ? (
            <div className="border border-indigo-100 bg-indigo-50/40 rounded-2xl p-4 space-y-3">
              <h4 className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-indigo-600" />
                Formulir Pengesahan Perencanaan (Approval Checkpoint)
              </h4>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Nama Pejabat / Tim Penelaah:
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Catatan Pengesahan / Berita Acara Perencanaan:
                </label>
                <textarea
                  rows={2}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onApprovePlan(reviewerName, approvalNotes)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 shadow-sm shadow-teal-200 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Sahkan Perencanaan (Setujui Rencana)
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-900 text-xs">
              <p className="font-bold mb-0.5">Dokumen ini telah disahkan secara resmi pada sistem.</p>
              <p className="text-[11px] text-emerald-800">
                Disahkan oleh: <strong>{plan.approved_by}</strong>. Catatan: "{plan.approval_notes}"
              </p>
            </div>
          )}

          {/* Export Options */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Ekspor Dokumen Perencanaan
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={handleDownloadMarkdown}
                className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4 text-teal-600" />
                Download Markdown (.md)
              </button>

              <button
                onClick={handleDownloadJson}
                className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-indigo-600" />
                Download JSON (.json)
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-purple-600" />
                Cetak / Simpan PDF
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
