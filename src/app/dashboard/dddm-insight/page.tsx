"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/dashboard/layout";
import { 
  EvidenceItem, 
  ProblemCandidate, 
  DDDMPlanDocument, 
  LangflowAgentNode, 
  ExecutionLogItem 
} from "@/lib/dddm/dddmTypes";
import LangflowPipelineCanvas from "@/components/dashboard/dddm/LangflowPipelineCanvas";
import EvidenceMatrixSection from "@/components/dashboard/dddm/EvidenceMatrixSection";
import ProblemPrioritySection from "@/components/dashboard/dddm/ProblemPrioritySection";
import RootCauseSection from "@/components/dashboard/dddm/RootCauseSection";
import ObjectivesStrategySection from "@/components/dashboard/dddm/ObjectivesStrategySection";
import LogframePoaSection from "@/components/dashboard/dddm/LogframePoaSection";
import PlanReviewExportModal from "@/components/dashboard/dddm/PlanReviewExportModal";
import { 
  Sparkles, 
  MapPin, 
  Calendar, 
  RefreshCw, 
  Layers, 
  AlertTriangle, 
  Compass, 
  FileText, 
  Target, 
  Clock, 
  CheckCircle2 
} from "lucide-react";

export const PUSKESMAS_OPTIONS = [
  "Kabupaten Malang (Seluruh)",
  "Ampelgading", "Bantur", "Bululawang", "Dampit", "Dau", "Donomulyo",
  "Gedangan", "Gondanglegi", "Jabung", "Kalipare", "Karangploso", "Kasembon",
  "Kepanjen", "Kromengan", "Lawang", "Ngajum", "Ngantang", "Pagak",
  "Pagelaran", "Pakis", "Pakisaji", "Poncokusumo", "Pujon", "Singosari",
  "Sumbermanjing Wetan", "Sumberpucung", "Tajinan", "Tirtoyudo", "Tumpang",
  "Turen", "Wagir", "Wajak", "Wonosari"
];

const INITIAL_NODES: LangflowAgentNode[] = [
  {
    id: "node-1",
    node_number: 1,
    title: "Evidence & DQA Ingestion",
    agent_role: "Data Retriever & Parity Engine",
    description: "Mengambil data real-time 6 domain dari Supabase dan menghitung metrik rasio.",
    status: "idle",
  },
  {
    id: "node-2",
    node_number: 2,
    title: "Problem Scope Formulation",
    agent_role: "Problem Statement Synthesizer",
    description: "Merumuskan pernyataan masalah spesifik berbasis bukti kesenjangan.",
    status: "idle",
  },
  {
    id: "node-3",
    node_number: 3,
    title: "USG Priority Engine",
    agent_role: "Multi-Criteria Prioritization",
    description: "Menghitung skor Urgency, Seriousness, Growth (3-15) secara matematis.",
    status: "idle",
  },
  {
    id: "node-4",
    node_number: 4,
    title: "Root Cause (Tree & Fishbone)",
    agent_role: "Causal DAG & Ishikawa Synthesizer",
    description: "Memetakan akar penyebab 6M dan membedakan label OBSERVED vs HYPOTHESIS.",
    status: "idle",
  },
  {
    id: "node-5",
    node_number: 5,
    title: "Objectives Hierarchy",
    agent_role: "Means-Ends Transform Agent",
    description: "Mentransformasikan kondisi negatif ke pohon tujuan (Goal, Purpose, Outputs).",
    status: "idle",
  },
  {
    id: "node-6",
    node_number: 6,
    title: "Strategic Alternatives",
    agent_role: "MCDA Strategy Evaluator",
    description: "Menyusun opsi intervensi spesifik/sensitif dengan scoring kelayakan multi-kriteria.",
    status: "idle",
  },
  {
    id: "node-7",
    node_number: 7,
    title: "Logframe & PoA Composer",
    agent_role: "RKA-Ready Operational Planner",
    description: "Menyusun matriks logframe dan rencana kerja operasional PoA siap pagu anggaran.",
    status: "idle",
  },
];

export default function DDDMInsightPage() {
  const { user } = useAuth();

  // Filters
  const [selectedPuskesmas, setSelectedPuskesmas] = useState<string>("Kabupaten Malang (Seluruh)");
  const [selectedTahun, setSelectedTahun] = useState<number>(2026);

  // Data & Pipeline State
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [plan, setPlan] = useState<DDDMPlanDocument | null>(null);
  const [agentNodes, setAgentNodes] = useState<LangflowAgentNode[]>(INITIAL_NODES);
  const [activeNodeId, setActiveNodeId] = useState<string | null>("node-1");
  const [isRunningPipeline, setIsRunningPipeline] = useState<boolean>(false);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLogItem[]>([]);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState<boolean>(true);

  // Tab Navigation
  type MainTab = "evidence" | "problem" | "root_cause" | "objectives" | "poa";
  const [activeTab, setActiveTab] = useState<MainTab>("evidence");

  // Modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);

  // Fetch real-time evidence on load or filter change
  const loadEvidence = useCallback(async () => {
    setIsLoadingEvidence(true);
    try {
      const isKab = selectedPuskesmas.includes("Kabupaten");
      const url = `/api/dddm/evidence?level=${isKab ? "kabupaten" : "puskesmas"}&puskesmas=${encodeURIComponent(selectedPuskesmas)}&tahun=${selectedTahun}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setEvidenceList(json.data);

        // Update Node 1 to completed
        setAgentNodes((prev) =>
          prev.map((n) =>
            n.id === "node-1" ? { ...n, status: "completed", summary_output: `${json.data.length} metrik termuat` } : n
          )
        );
      }
    } catch (err) {
      console.error("Failed to load evidence:", err);
    } finally {
      setIsLoadingEvidence(false);
    }
  }, [selectedPuskesmas, selectedTahun]);

  useEffect(() => {
    loadEvidence();
  }, [loadEvidence]);

  // Run Full Pipeline
  const handleRunFullPipeline = async () => {
    setIsRunningPipeline(true);

    // Set nodes to running
    setAgentNodes((prev) =>
      prev.map((n, idx) => (idx > 0 ? { ...n, status: "running" } : n))
    );

    try {
      const isKab = selectedPuskesmas.includes("Kabupaten");
      const payload = {
        scope: {
          level: isKab ? "kabupaten" : "puskesmas",
          puskesmas_name: selectedPuskesmas,
          tahun: selectedTahun,
          periode: `Tahun ${selectedTahun} (Aktual)`,
        },
        evidenceList,
        selectedProblemId: plan?.selected_core_problem_id,
        selectedStrategyId: plan?.selected_strategy_id,
      };

      const res = await fetch("/api/dddm/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setPlan(json.data);
        setExecutionLogs(json.data.execution_logs || []);

        // Mark all nodes as completed
        setAgentNodes((prev) =>
          prev.map((n) => ({ ...n, status: "completed" }))
        );

        // Switch to problem priority tab to show results
        setActiveTab("problem");
      } else {
        alert("Terjadi kendala dalam orkestrasi pipeline: " + (json.error || "Gagal"));
      }
    } catch (err: any) {
      console.error("Pipeline run error:", err);
      alert("Error eksekusi pipeline: " + err.message);
    } finally {
      setIsRunningPipeline(false);
    }
  };

  // Reset pipeline state
  const handleResetPipeline = () => {
    setPlan(null);
    setAgentNodes(INITIAL_NODES);
    setExecutionLogs([]);
    loadEvidence();
    setActiveTab("evidence");
  };

  // Handle problem selection
  const handleSelectProblem = (probId: string) => {
    if (!plan) return;
    setPlan({
      ...plan,
      selected_core_problem_id: probId,
    });
  };

  // Handle strategy selection
  const handleSelectStrategy = (stratId: string) => {
    if (!plan) return;
    setPlan({
      ...plan,
      selected_strategy_id: stratId,
    });
  };

  // Handle USG score adjustment
  const handleUpdateUsgScore = (
    probId: string,
    usgUpdate: { urgency: number; seriousness: number; growth: number; overrideReason?: string }
  ) => {
    if (!plan) return;
    const updatedCandidates = plan.problem_candidates.map((p) => {
      if (p.problem_id === probId) {
        const total = usgUpdate.urgency + usgUpdate.seriousness + usgUpdate.growth;
        return {
          ...p,
          usg: {
            ...p.usg,
            urgency: usgUpdate.urgency,
            seriousness: usgUpdate.seriousness,
            growth: usgUpdate.growth,
            total,
            override_total: total,
            override_reason: usgUpdate.overrideReason,
          },
        };
      }
      return p;
    });

    // Re-sort
    updatedCandidates.sort((a, b) => (b.usg.override_total || b.usg.total) - (a.usg.override_total || a.usg.total));
    updatedCandidates.forEach((c, idx) => {
      c.usg.rank = idx + 1;
    });

    setPlan({
      ...plan,
      problem_candidates: updatedCandidates,
    });
  };

  // Handle plan approval
  const handleApprovePlan = (reviewerName: string, notes: string) => {
    if (!plan) return;
    setPlan({
      ...plan,
      status: "APPROVED",
      approved_by: reviewerName,
      approval_notes: notes,
      updated_at: new Date().toISOString(),
    });
  };

  // Selected core problem
  const selectedCoreProblem = plan?.problem_candidates.find(
    (p) => p.problem_id === plan.selected_core_problem_id
  ) || (plan?.problem_candidates[0] || null);

  // Selected strategy
  const selectedStrategy = plan?.strategic_alternatives.find(
    (s) => s.id === plan.selected_strategy_id
  ) || (plan?.strategic_alternatives[0] || null);

  return (
    <div className="space-y-6 pb-16">
      {/* ─────────────────────────────────────────────────────────── */}
      {/* PAGE HEADER */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-teal-200/50">
            <span className="material-icons-round text-3xl">insights</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                DDDM Insight
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-teal-100 text-teal-800">
                Agentic AI OOPP
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Portal perumusan perencanaan program kesehatan presisi berbasis bukti multi-domain (6 dataset) dengan pendekatan <strong>Objectives-Oriented Project Planning (OOPP)</strong> dan orkestrasi <strong>Langflow</strong>.
            </p>
          </div>
        </div>

        {/* Global Scope & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Puskesmas Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <MapPin className="w-4 h-4 text-slate-400" />
            <select
              value={selectedPuskesmas}
              onChange={(e) => setSelectedPuskesmas(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {PUSKESMAS_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedTahun}
              onChange={(e) => setSelectedTahun(parseInt(e.target.value))}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value={2026}>Tahun 2026</option>
              <option value={2025}>Tahun 2025</option>
            </select>
          </div>

          {/* Refresh Evidence */}
          <button
            onClick={loadEvidence}
            disabled={isLoadingEvidence}
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all cursor-pointer"
            title="Refresh Data Bukti dari Database"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingEvidence ? "animate-spin text-teal-600" : ""}`} />
          </button>

          {/* Review & Export Plan Button */}
          {plan && (
            <button
              onClick={() => setIsReviewModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-teal-400" />
              Telaah & Ekspor Rencana
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* 1. LANGFLOW-STYLE VISUAL AGENT PIPELINE CANVAS */}
      {/* ─────────────────────────────────────────────────────────── */}
      <LangflowPipelineCanvas
        nodes={agentNodes}
        activeNodeId={activeNodeId}
        isRunning={isRunningPipeline}
        logs={executionLogs}
        onRunFullPipeline={handleRunFullPipeline}
        onResetPipeline={handleResetPipeline}
        onSelectNode={(nodeId) => setActiveNodeId(nodeId)}
      />

      {/* ─────────────────────────────────────────────────────────── */}
      {/* WORKSPACE NAVIGATION TABS */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto scrollbar-none">
        {[
          { id: "evidence" as MainTab, label: "1. Matriks Bukti 6 Domain", icon: Layers, count: evidenceList.length },
          { id: "problem" as MainTab, label: "2. Prioritas Masalah (USG)", icon: Target, ready: !!plan },
          { id: "root_cause" as MainTab, label: "3. Analisis Sebab (Tree & Fishbone)", icon: Compass, ready: !!plan },
          { id: "objectives" as MainTab, label: "4. Sasaran & Alternatif (MCDA)", icon: Sparkles, ready: !!plan },
          { id: "poa" as MainTab, label: "5. Logframe & PoA Operasional", icon: FileText, ready: !!plan },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isReady = tab.ready !== false;

          return (
            <button
              key={tab.id}
              onClick={() => isReady && setActiveTab(tab.id)}
              disabled={!isReady}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : isReady
                  ? "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-100 opacity-60"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-extrabold">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* MAIN TAB CONTENT */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div>
        {activeTab === "evidence" && (
          <EvidenceMatrixSection
            evidenceList={evidenceList}
            isLoading={isLoadingEvidence}
          />
        )}

        {activeTab === "problem" && plan && (
          <ProblemPrioritySection
            problems={plan.problem_candidates}
            selectedProblemId={plan.selected_core_problem_id}
            onSelectProblem={handleSelectProblem}
            onUpdateUsgScore={handleUpdateUsgScore}
          />
        )}

        {activeTab === "root_cause" && plan && (
          <RootCauseSection
            coreProblem={selectedCoreProblem}
            nodes={plan.cause_graph.nodes}
            edges={plan.cause_graph.edges}
          />
        )}

        {activeTab === "objectives" && plan && (
          <ObjectivesStrategySection
            objectives={plan.objectives}
            strategies={plan.strategic_alternatives}
            selectedStrategyId={plan.selected_strategy_id}
            onSelectStrategy={handleSelectStrategy}
          />
        )}

        {activeTab === "poa" && plan && (
          <LogframePoaSection
            logframe={plan.logframe}
            poa={plan.poa}
            selectedStrategy={selectedStrategy}
          />
        )}

        {/* Empty state when plan not yet run */}
        {activeTab !== "evidence" && !plan && (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">
              Pipeline Perencanaan Belum Dijalankan
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Klik tombol <strong>"Jalankan Pipeline Penuh"</strong> pada kanvas orkestrator di atas untuk mengaktifkan agen OOPP dan menghasilkan rumusan masalah, diagram sebab-akibat, alternatif strategi, serta matriks PoA.
            </p>
            <button
              onClick={handleRunFullPipeline}
              disabled={isRunningPipeline}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 text-white font-bold text-xs shadow-sm hover:from-teal-700 hover:to-indigo-700 transition-all cursor-pointer"
            >
              Jalankan Pipeline Sekarang
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* REVIEW & EXPORT MODAL */}
      {/* ─────────────────────────────────────────────────────────── */}
      <PlanReviewExportModal
        plan={plan}
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onApprovePlan={handleApprovePlan}
      />
    </div>
  );
}
