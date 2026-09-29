import { NextRequest, NextResponse } from "next/server";
import { fetchMultiDomainEvidence } from "@/lib/dddm/dddmEvidenceEngine";
import { 
  generateProblemScope, 
  generateRootCauseGraph, 
  generateObjectives, 
  generateStrategicAlternatives, 
  generateLogframeAndPoa 
} from "@/lib/dddm/dddmPromptEngine";
import { DDDMPlanDocument, ExecutionLogItem, EvidenceItem } from "@/lib/dddm/dddmTypes";

export const maxDuration = 60; // 60s for full multi-agent pipeline
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const allLogs: ExecutionLogItem[] = [];

  const addLog = (nodeId: string, message: string, level: "info" | "success" | "warn" | "error" = "info") => {
    allLogs.push({
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString("id-ID"),
      node_id: nodeId,
      message,
      level,
    });
  };

  try {
    const body = await req.json();
    const scope = body.scope || {
      level: "kabupaten",
      puskesmas_name: "Kabupaten Malang",
      tahun: 2026,
      periode: "Tahun 2026 (Aktual)",
    };

    addLog("node-1", `Menerima request eksekusi pipeline untuk wilayah: ${scope.puskesmas_name} (${scope.periode}).`);

    // 1. Fetch or reuse evidence
    let evidenceList: EvidenceItem[] = body.evidenceList;
    if (!evidenceList || evidenceList.length === 0) {
      addLog("node-1", `Mengambil data indikator riil time dari 6 domain database...`);
      evidenceList = await fetchMultiDomainEvidence({
        level: scope.level,
        puskesmas: scope.level === "puskesmas" ? scope.puskesmas_name : undefined,
        tahun: scope.tahun,
      });
      addLog("node-1", `Berhasil memuat ${evidenceList.length} metrik bukti terukur.`, "success");
    } else {
      addLog("node-1", `Menggunakan ${evidenceList.length} metrik bukti yang sudah tersimpan di sesi.`, "info");
    }

    // 2. Generate Problem Scope & USG Priority
    addLog("node-2", `Menjalankan Problem Formulation & Prioritization Agent...`);
    const { problems, logs: probLogs } = await generateProblemScope({
      scope,
      evidenceList,
    });
    allLogs.push(...probLogs);

    if (problems.length === 0) {
      throw new Error("Tidak ada masalah atau kesenjangan yang ditemukan dari data indikator.");
    }

    // Determine core problem (use user selection if valid, else rank 1)
    let selectedProblem = problems[0];
    if (body.selectedProblemId) {
      const match = problems.find(p => p.problem_id === body.selectedProblemId);
      if (match) selectedProblem = match;
    }
    addLog("node-3", `Masalah prioritas utama ditetapkan: "${selectedProblem.title}" (Skor USG: ${selectedProblem.usg.total}/15).`, "success");

    // 3. Generate Root Cause Graph (Problem Tree & Fishbone)
    addLog("node-4", `Menjalankan Root Cause Synthesis Agent (Analisis Pohon Masalah & Ishikawa 6M)...`);
    const { nodes: causeNodes, edges: causeEdges, logs: causeLogs } = await generateRootCauseGraph(
      selectedProblem,
      evidenceList
    );
    allLogs.push(...causeLogs);

    // 4. Generate Objectives Tree
    addLog("node-5", `Menjalankan Objective Hierarchy Agent (Transformasi Sasaran Program)...`);
    const { objectives, logs: objLogs } = await generateObjectives(selectedProblem, causeNodes);
    allLogs.push(...objLogs);

    // 5. Generate Strategic Alternatives (MCDA)
    addLog("node-6", `Menjalankan Strategic Alternative & MCDA Scoring Agent...`);
    const { strategies, logs: stratLogs } = await generateStrategicAlternatives(selectedProblem, objectives);
    allLogs.push(...stratLogs);

    let selectedStrategy = strategies[0];
    if (body.selectedStrategyId) {
      const matchStrat = strategies.find(s => s.id === body.selectedStrategyId);
      if (matchStrat) selectedStrategy = matchStrat;
    }
    addLog("node-6", `Strategi terpilih: "${selectedStrategy.title}".`, "success");

    // 6. Generate Logframe & Plan of Action (PoA)
    addLog("node-7", `Menjalankan Logframe Synthesizer & PoA Composer (Siap Usulan RKA)...`);
    const { logframe, poa, logs: poaLogs } = await generateLogframeAndPoa(selectedProblem, objectives, selectedStrategy);
    allLogs.push(...poaLogs);

    const totalDuration = Date.now() - startTime;
    addLog("node-7", `Pipeline OOPP selesai sepenuhnya dalam ${totalDuration} ms. Status: DRAF AI.`, "success");

    // Assemble final document
    const planDocument: DDDMPlanDocument = {
      plan_id: body.planId || `PLAN-${Date.now().toString(36).toUpperCase()}`,
      title: `Rencana Aksi Program Gizi & Kesehatan: ${selectedProblem.title} (${scope.puskesmas_name})`,
      scope,
      status: "DRAFT_AI",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      evidence_matrix: evidenceList,
      problem_candidates: problems,
      selected_core_problem_id: selectedProblem.problem_id,
      cause_graph: {
        nodes: causeNodes,
        edges: causeEdges,
      },
      objectives,
      strategic_alternatives: strategies,
      selected_strategy_id: selectedStrategy.id,
      logframe,
      poa,
      execution_logs: allLogs,
    };

    return NextResponse.json({
      success: true,
      data: planDocument,
      meta: {
        duration_ms: totalDuration,
        nodes_completed: 7,
      },
    });
  } catch (error: any) {
    console.error("API /api/dddm/pipeline error:", error);
    addLog("node-1", `Terjadi kesalahan saat eksekusi pipeline: ${error.message}`, "error");
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal mengeksekusi pipeline Agentic AI",
        logs: allLogs,
      },
      { status: 500 }
    );
  }
}
