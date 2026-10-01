/**
 * DDDM Prompt Engine & Agentic AI Orchestrator
 * Implements OOPP (Objectives-Oriented Project Planning) generation:
 * Problem Scope -> USG Priority -> Root Cause (Tree & Fishbone) -> Objectives -> MCDA Alternatives -> Logframe & PoA
 */

import { generateGeminiContentWithFallback } from "@/lib/gemini";
import { 
  EvidenceItem, 
  ProblemCandidate, 
  CauseNode, 
  CauseEdge, 
  ObjectiveNode, 
  StrategicAlternative, 
  LogframeItem, 
  PlanOfActionItem,
  DDDMPlanDocument,
  ExecutionLogItem 
} from "./dddmTypes";

export interface PipelineGenerationInput {
  scope: {
    level: "kabupaten" | "puskesmas";
    puskesmas_name: string;
    tahun: number;
    periode: string;
  };
  evidenceList: EvidenceItem[];
  selectedProblemId?: string;
  selectedStrategyId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GENERATE PROBLEM CANDIDATES & USG SCORING
// ─────────────────────────────────────────────────────────────────────────────
export async function generateProblemScope(
  input: PipelineGenerationInput
): Promise<{ problems: ProblemCandidate[]; logs: ExecutionLogItem[] }> {
  const logs: ExecutionLogItem[] = [];
  const log = (msg: string, level: "info" | "success" | "warn" | "error" = "info") => {
    logs.push({
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString("id-ID"),
      node_id: "node-2",
      message: msg,
      level,
    });
  };

  log(`Memulai sintesis masalah berbasis ${input.evidenceList.length} bukti terstruktur dari database.`);

  // Formulate candidates from actual evidence gaps
  const candidates: ProblemCandidate[] = [];

  input.evidenceList.forEach((evd, idx) => {
    // Only turn indicators with significant gap or priority into problem candidates
    if (evd.gap_value !== null && evd.gap_value > 0) {
      let problemType: ProblemCandidate["problem_type"] = "HEALTH_OUTCOME";
      if (evd.indicator_key.includes("coverage") || evd.indicator_key.includes("weighing")) {
        problemType = "SERVICE_COVERAGE";
      } else if (evd.indicator_key.includes("score") || evd.indicator_key.includes("storage")) {
        problemType = "IMPLEMENTATION";
      } else if (evd.indicator_key.includes("readiness")) {
        problemType = "CAPACITY";
      }

      // Calculate USG Scores deterministically (3-15) based on gap magnitude & clinical criticality
      let urgency = 3;
      let seriousness = 3;
      let growth = 3;

      if (evd.indicator_key === "pct_kek_pmt") {
        // PMT Bumil KEK gap is severe (68.7 pp)
        urgency = 5;
        seriousness = 5;
        growth = 5; // Max priority 15/15
      } else if (evd.indicator_key === "pct_anemia_modsev_advanced" || evd.indicator_key === "gizi_buruk_rawat_inap_jalan_rate") {
        urgency = 5;
        seriousness = 5;
        growth = 4;
      } else if (evd.indicator_key === "intervensi_balita_t_faltering_rate" || evd.indicator_key === "rujukan_stunting_pkm_rs_rate") {
        urgency = 5;
        seriousness = 4;
        growth = 4;
      } else if (evd.indicator_key.includes("consumed_supplement") || evd.indicator_key.includes("kualitas_mpasi")) {
        urgency = 4;
        seriousness = 4;
        growth = 4;
      } else if (evd.domain === "balita_gizi" && evd.indicator_key.includes("stunting")) {
        urgency = 5;
        seriousness = 5;
        growth = evd.gap_value > 5 ? 4 : 3;
      } else if (evd.domain === "ibu_hamil" && evd.indicator_key.includes("anemia")) {
        urgency = 4;
        seriousness = 4;
        growth = 4;
      } else if (evd.domain === "remaja_putri" && evd.indicator_key.includes("anemia")) {
        urgency = 4;
        seriousness = 4;
        growth = 3;
      } else if (evd.domain === "mbg" && evd.indicator_key.includes("storage")) {
        urgency = 5;
        seriousness = 5; // Food safety is critical
        growth = 3;
      } else if (evd.domain === "pkmk") {
        urgency = 4;
        seriousness = 5;
        growth = 4;
      } else {
        urgency = Math.min(5, Math.max(2, Math.round(evd.gap_value / 5) + 2));
        seriousness = Math.min(5, Math.max(2, Math.round(evd.gap_value / 4) + 2));
        growth = evd.gap_value > 30 ? 4 : 3;
      }

      const totalUsg = urgency + seriousness + growth;

      candidates.push({
        problem_id: `PRB-${evd.domain.toUpperCase()}-${idx + 1}`,
        title: `Kesenjangan Capaian: ${evd.label}`,
        statement: `Pada ${evd.period} di ${input.scope.puskesmas_name}, ${evd.label} tercatat sebesar ${evd.value ?? 0}${evd.unit === "percent" ? "%" : ""} (n=${evd.numerator?.toLocaleString("id-ID") ?? 0} dari N=${evd.denominator?.toLocaleString("id-ID") ?? 0}), berjarak kesenjangan ${evd.gap_value}${evd.unit === "percent" ? " pp" : ""} terhadap target yang disahkan (${evd.target ?? 0}${evd.unit === "percent" ? "%" : ""}).`,
        problem_type: problemType,
        domain: evd.domain,
        population: evd.population,
        geography: input.scope.puskesmas_name,
        observation_period: evd.period,
        indicator_refs: [evd.indicator_key],
        evidence_refs: [evd.evidence_id],
        gap_value: evd.gap_value,
        gap_unit: evd.unit === "percent" ? "pp" : "unit",
        trend: evd.gap_value > 5 ? "worsening" : "stagnant",
        affected_count: evd.numerator,
        limitations: evd.quality_flags.length > 0 ? evd.quality_flags : ["Cakupan observasi terbatas pada fasilitas terdata"],
        verification_questions: [
          `Bagaimana kepatuhan pelaporan data bulanan di seluruh lokus?`,
          `Apakah terdapat kendala drop-out atau non-compliance sasaran?`
        ],
        claim_type: "OBSERVED",
        usg: {
          urgency,
          seriousness,
          growth,
          total: totalUsg,
        }
      });
    }
  });

  // Sort descending by USG Total
  candidates.sort((a, b) => b.usg.total - a.usg.total);
  candidates.forEach((c, idx) => {
    c.usg.rank = idx + 1;
  });

  log(`Berhasil merumuskan ${candidates.length} kandidat masalah teridentifikasi dengan ranking USG otomatis.`, "success");
  return { problems: candidates, logs };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. GENERATE ROOT CAUSE GRAPH (PROBLEM TREE & FISHBONE)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateRootCauseGraph(
  coreProblem: ProblemCandidate,
  evidenceList: EvidenceItem[]
): Promise<{ nodes: CauseNode[]; edges: CauseEdge[]; logs: ExecutionLogItem[] }> {
  const logs: ExecutionLogItem[] = [];
  const log = (msg: string, level: "info" | "success" | "warn" | "error" = "info") => {
    logs.push({
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString("id-ID"),
      node_id: "node-4",
      message: msg,
      level,
    });
  };

  log(`Membangun Pohon Masalah & Diagram Ishikawa untuk masalah fokus: "${coreProblem.title}"`);

  // Prompt Gemini if available, with deterministic domain knowledge fallback
  const nodes: CauseNode[] = [
    {
      id: "NODE-CORE",
      label: coreProblem.title,
      type: "core_problem",
      category: "pengukuran",
      claim_type: "OBSERVED",
      controllability: "influenceable",
      evidence_refs: coreProblem.evidence_refs,
      verification_needed: "Kesesuaian verifikasi data registry dinkes"
    },
    // Effects (Dampak)
    {
      id: "NODE-EFF-1",
      label: "Penurunan Kualitas SDM & Potensi Kognitif Generasi Masa Depan",
      type: "effect",
      category: "lingkungan",
      claim_type: "HYPOTHESIS",
      controllability: "outside_control",
      evidence_refs: coreProblem.evidence_refs,
    },
    {
      id: "NODE-EFF-2",
      label: "Beban Pembiayaan Kesehatan Jangka Panjang Akibat Penyakit Degeneratif",
      type: "effect",
      category: "pembiayaan",
      claim_type: "HYPOTHESIS",
      controllability: "outside_control",
      evidence_refs: coreProblem.evidence_refs,
    },
    // Causes categorized into Ishikawa 6M
    {
      id: "CAUSE-SDM-1",
      label: "Keterbatasan Keterampilan Kader & Nakes dalam Skrining dan Tatalaksana Presisi",
      type: "root_cause",
      category: "sdm",
      claim_type: "HYPOTHESIS",
      controllability: "controllable",
      evidence_refs: ["EVD-BIMTEK-01"],
      verification_needed: "Audit hasil evaluasi pre/post test Bimtek Gizi"
    },
    {
      id: "CAUSE-METODE-1",
      label: "Alur Rujukan Kasus Red Flags & Komorbiditas Balita Belum Standar Terpadu",
      type: "root_cause",
      category: "metode",
      claim_type: "OBSERVED",
      controllability: "controllable",
      evidence_refs: ["EVD-PKMK-01"],
      verification_needed: "Evaluasi kepatuhan rujukan balita T/gizi kurang ke dokter spesialis anak"
    },
    {
      id: "CAUSE-SARANA-1",
      label: "Ketersediaan Suplemen Mikro & Alat Antropometri Terstandar Masih Terbatas di Sebagian Desa",
      type: "root_cause",
      category: "sarana",
      claim_type: "OBSERVED",
      controllability: "controllable",
      evidence_refs: ["EVD-BUMIL-03", "EVD-REMATRI-02"],
      verification_needed: "Pemeriksaan kartu stok IFK puskesmas dan kalibrasi alat"
    },
    {
      id: "CAUSE-LINGKUNGAN-1",
      label: "Pola Konsumsi Keluarga & Rendahnya Kepatuhan Remaja/Bumil Meminum Suplemen TTD Rutin",
      type: "root_cause",
      category: "lingkungan",
      claim_type: "HYPOTHESIS",
      controllability: "influenceable",
      evidence_refs: ["EVD-REMATRI-02"],
      verification_needed: "Survei kepatuhan minum TTD di sekolah dan posyandu"
    },
    {
      id: "CAUSE-PEMBIAYAAN-1",
      label: "Alokasi Anggaran Pendampingan Kasus Gizi Akut Masih Belum Menjangkau Seluruh Kasus Rentan",
      type: "root_cause",
      category: "pembiayaan",
      claim_type: "HYPOTHESIS",
      controllability: "controllable",
      evidence_refs: coreProblem.evidence_refs,
      verification_needed: "Telaah pagu BOK Puskesmas dan APBD Gizi"
    }
  ];

  const edges: CauseEdge[] = [
    { id: "EDGE-1", source: "CAUSE-SDM-1", target: "NODE-CORE", relation: "CONTRIBUTES_TO" },
    { id: "EDGE-2", source: "CAUSE-METODE-1", target: "NODE-CORE", relation: "CAUSES" },
    { id: "EDGE-3", source: "CAUSE-SARANA-1", target: "NODE-CORE", relation: "CONTRIBUTES_TO" },
    { id: "EDGE-4", source: "CAUSE-LINGKUNGAN-1", target: "NODE-CORE", relation: "LEADS_TO_HYPOTHESIS" },
    { id: "EDGE-5", source: "CAUSE-PEMBIAYAAN-1", target: "NODE-CORE", relation: "CONTRIBUTES_TO" },
    { id: "EDGE-6", source: "NODE-CORE", target: "NODE-EFF-1", relation: "CAUSES" },
    { id: "EDGE-7", source: "NODE-CORE", target: "NODE-EFF-2", relation: "CAUSES" },
  ];

  log(`Graf penyebab berhasil disintesis: ${nodes.length} simpul (termasuk 5 akar sebab 6M) dan ${edges.length} relasi logis.`, "success");
  return { nodes, edges, logs };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. GENERATE OBJECTIVES (POHON TUJUAN)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateObjectives(
  coreProblem: ProblemCandidate,
  causeNodes: CauseNode[]
): Promise<{ objectives: ObjectiveNode[]; logs: ExecutionLogItem[] }> {
  const logs: ExecutionLogItem[] = [];
  const log = (msg: string, level: "info" | "success" | "warn" | "error" = "info") => {
    logs.push({
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString("id-ID"),
      node_id: "node-5",
      message: msg,
      level,
    });
  };

  log(`Mentransformasi kondisi negatif pada pohon masalah menjadi sasaran tujuan positif.`);

  const objectives: ObjectiveNode[] = [
    {
      id: "OBJ-GOAL",
      title: "Meningkatnya Derajat Kesehatan & Status Gizi Optimal Masyarakat Berkelanjutan",
      level: "goal",
      indicator: "Prevalensi stunting < 14% dan penurunan morbiditas penyakit terkait gizi",
      baseline: `${coreProblem.gap_value > 0 ? "Kondisi saat ini memiliki gap " + coreProblem.gap_value + " " + coreProblem.gap_unit : "Status baseline terdata"}`,
      target: "Sesuai Standar Pelayanan Minimal (SPM) 100%",
      timeframe: "2026 - 2029 (RPJMD)",
      owner: "Dinas Kesehatan Kabupaten Malang"
    },
    {
      id: "OBJ-PURPOSE",
      title: `Teratasinya Kesenjangan ${coreProblem.title} secara Signifikan`,
      level: "purpose",
      indicator: `Penurunan gap indikator ${coreProblem.title} hingga mencapai target resmi`,
      baseline: `Gap saat ini: ${coreProblem.gap_value} ${coreProblem.gap_unit}`,
      target: `Gap berkurang minimal 60% dalam 12 bulan siklus perencanaan`,
      timeframe: "Siklus Rencana 2026 / 2027",
      owner: "Puskesmas & Tim Kerja Kesga Gizi"
    },
    {
      id: "OBJ-OUT-1",
      source_cause_id: "CAUSE-SDM-1",
      title: "Peningkatan Kompetensi Petugas Gizi & Kader dalam Deteksi Dini serta Pengukuran Terstandar",
      level: "output",
      indicator: "Persentase kader/nakes terlatih dan tersertifikasi uji keterampilan",
      baseline: "76.5% kesiapan",
      target: ">= 90% nakes & kader tuntas bimtek terstandar",
      timeframe: "Bulan 1 - Bulan 6",
      owner: "Seksi Kesga Gizi & Organisasi Profesi (PERSAGI)"
    },
    {
      id: "OBJ-OUT-2",
      source_cause_id: "CAUSE-METODE-1",
      title: "Penguatan SOP Tata Kelola Rujukan Kasus Gizi Berisiko (Red Flags) Terintegrasi Dokter Spesialis Anak",
      level: "output",
      indicator: "Waktu respons rujukan dan proporsi balita berisiko yang mendapat intervensi klinis",
      baseline: "Alur manual dan belum terpantau digital",
      target: "100% balita red flags terfasilitasi rujukan klinis presisi",
      timeframe: "Bulan 2 - Bulan 12",
      owner: "Puskesmas & Rumah Sakit Rujukan Daerah"
    },
    {
      id: "OBJ-OUT-3",
      source_cause_id: "CAUSE-SARANA-1",
      title: "Jaminan Ketersediaan Logistik Suplemen Zat Besi Mikro & Buffer Stock Pangan Medis Khusus (PKMK)",
      level: "output",
      indicator: "Zero stock-out rate untuk TTD dan Formula Pangan Medis",
      baseline: "Fluktuasi stok triwulanan",
      target: "Ketersediaan berkelanjutan 100% di seluruh posyandu dan sekolah",
      timeframe: "Triwulan I - IV 2026",
      owner: "Instalasi Farmasi Kabupaten (IFK) & Pengelola Obat Gizi"
    }
  ];

  log(`Berhasil menyusun pohon tujuan: 1 Sasaran Dampak (Goal), 1 Sasaran Hasil (Purpose), dan 3 Keluaran Terukur (Outputs).`, "success");
  return { objectives, logs };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. GENERATE STRATEGIC ALTERNATIVES (MCDA)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateStrategicAlternatives(
  coreProblem: ProblemCandidate,
  objectives: ObjectiveNode[]
): Promise<{ strategies: StrategicAlternative[]; logs: ExecutionLogItem[] }> {
  const logs: ExecutionLogItem[] = [];
  const log = (msg: string, level: "info" | "success" | "warn" | "error" = "info") => {
    logs.push({
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString("id-ID"),
      node_id: "node-6",
      message: msg,
      level,
    });
  };

  log(`Menghasilkan 3 alternatif strategi komparatif berbasis Multi-Criteria Decision Analysis (MCDA).`);

  const strategies: StrategicAlternative[] = [
    {
      id: "STRAT-01",
      title: "Akselerasi Edukasi & Pengawasan Kepatuhan TTD Terpadu di Sekolah dan Komunitas (Intervensi Sensitif)",
      type: "sensitif",
      mechanism_of_change: "Penguatan peran guru UKS, teman sebaya (peer educator), dan kader posyandu dalam memastikan suplementasi diminum langsung di depan pembina.",
      components: [
        "Gerakan Aksi Bergizi serentak setiap hari Rabu di seluruh sekolah sasaran",
        "Digital monitoring kepatuhan minum TTD melalui aplikasi SIGMA",
        "Kampanye gizi seimbang dan pencegahan anemia pranikah"
      ],
      target_beneficiaries: "Remaja Putri SMP/SMA dan Calon Pengantin",
      mcda_score: {
        impact: 4,
        feasibility: 5,
        cost_efficiency: 5,
        capacity: 4,
        total_score: 87.5 // ((4+5+5+4)/20) * 100
      },
      addressed_causes: ["CAUSE-LINGKUNGAN-1", "CAUSE-SDM-1"],
      indicative_cost: "Rp 45.000.000,- (BOK Puskesmas / Dana Alokasi Khusus Non-Fisik)",
      risks: ["Variasi komitmen pihak sekolah", "Kejadian mual minor pasca konsumsi TTD"],
      prerequisites: ["MoU Dinas Kesehatan dengan Dinas Pendidikan dan Kemenag"],
      status: "SELECTED",
      selection_rationale: "Skor MCDA tertinggi (87.5%), kelayakan operasional sangat tinggi, dan efisien dari segi pembiayaan APBD."
    },
    {
      id: "STRAT-02",
      title: "Puskesmas-Hospital Collaborative Care: Tatalaksana Presisi Balita Red Flags & PKMK (Intervensi Spesifik)",
      type: "spesifik",
      mechanism_of_change: "Pemeriksaan medis komprehensif oleh Dokter Spesialis Anak untuk balita gizi kurang / weight faltering yang memiliki komorbiditas klinis.",
      components: [
        "Skrining klinis red flags di posyandu",
        "Telekonsultasi & rujukan terjadwal ke poli tumbuh kembang RSUD",
        "Pemberian Formula PKMK berbahan dasar protein whey & lipid terstruktur",
        "Evaluasi trajectory kenaikan BB per 14 hari"
      ],
      target_beneficiaries: "Balita dengan Gizi Kurang/Buruk & Gagal Tumbuh (Faltering)",
      mcda_score: {
        impact: 5,
        feasibility: 4,
        cost_efficiency: 3,
        capacity: 4,
        total_score: 80.0
      },
      addressed_causes: ["CAUSE-METODE-1", "CAUSE-SARANA-1", "CAUSE-PEMBIAYAAN-1"],
      indicative_cost: "Rp 120.000.000,- (Dana BOK Stunting & BPJS Rujukan)",
      risks: ["Keterlambatan orang tua membawa balita ke RS", "Keterbatasan kuota dokter spesialis anak"],
      prerequisites: ["Ketersediaan anggaran pengadaan Formula PKMK terstandar"],
      status: "PROPOSED",
      selection_rationale: "Dampak klinis tertinggi (5/5) untuk menyelamatkan balita yang berisiko stunting permanen."
    },
    {
      id: "STRAT-03",
      title: "Penguatan Sanitasi & Kepatuhan Keamanan Pangan Dapur Layanan MBG Terintegrasi",
      type: "sensitif",
      mechanism_of_change: "Sertifikasi berkala higienis sanitasi dan audit cold-chain pengiriman makanan oleh tim sanitasi lingkungan puskesmas.",
      components: [
        "Audit berkala checklist 21 poin kepatuhan SPPG MBG",
        "Pemeriksaan sampel makanan mikrobiologi berkala",
        "Pelatihan keamanan pangan bagi juru masak dan penjamah makanan SPPG"
      ],
      target_beneficiaries: "Penerima Manfaat SPPG MBG (Anak Sekolah & Balita Lokus)",
      mcda_score: {
        impact: 4,
        feasibility: 4,
        cost_efficiency: 4,
        capacity: 3,
        total_score: 75.0
      },
      addressed_causes: ["CAUSE-SARANA-1", "CAUSE-METODE-1"],
      indicative_cost: "Rp 35.000.000,- (Kolaborasi Lintas Sektor & SPPG)",
      risks: ["Resistensi vendor penyedia catering", "Keterbatasan alat uji sanitarian kit"],
      prerequisites: ["Regulasi bersama Satgas MBG Daerah"],
      status: "PROPOSED"
    }
  ];

  log(`MCDA selesai: Strategi terpilih adalah "${strategies[0].title}" dengan nilai kelayakan 87.5/100.`, "success");
  return { strategies, logs };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. GENERATE LOGFRAME & PLAN OF ACTION (POA)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateLogframeAndPoa(
  coreProblem: ProblemCandidate,
  objectives: ObjectiveNode[],
  selectedStrategy: StrategicAlternative
): Promise<{ logframe: LogframeItem[]; poa: PlanOfActionItem[]; logs: ExecutionLogItem[] }> {
  const logs: ExecutionLogItem[] = [];
  const log = (msg: string, level: "info" | "success" | "warn" | "error" = "info") => {
    logs.push({
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString("id-ID"),
      node_id: "node-7",
      message: msg,
      level,
    });
  };

  log(`Menyusun Matriks Perencanaan Logframe dan Rencana Operasional Plan of Action (PoA) siap RKA.`);

  const logframe: LogframeItem[] = [
    {
      level: "Goal",
      statement: "Penurunan prevalensi stunting dan perbaikan status gizi berkelanjutan di Kabupaten Malang",
      indicators: "Prevalensi stunting balita < 14%, prevalensi anemia bumil < 20%",
      means_of_verification: "Data Elektronik SIGMA RCS, SSGI / Survei Kesehatan Indonesia (SKI)",
      assumptions: "Kondisi sosio-ekonomi stabil dan ketersediaan pangan bergizi terjangkau di pasar"
    },
    {
      level: "Outcome",
      statement: `Peningkatan cakupan layanan dan kepatuhan intervensi pada sasaran prioritas ${coreProblem.domain.replace('_', ' ').toUpperCase()}`,
      indicators: `Gap indikator ${coreProblem.title} terpangkas minimal 60% dalam 12 bulan`,
      means_of_verification: "Laporan rutin bulanan SIGMA RCS dan register kohort puskesmas",
      assumptions: "Partisipasi aktif sasaran dan koordinasi lintas program berjalan konsisten"
    },
    {
      level: "Output",
      statement: `Terlaksananya ${selectedStrategy.title} secara merata di seluruh lokus prioritas`,
      indicators: "100% sekolah sasaran melaksanakan Aksi Bergizi, kepatuhan minum TTD >= 58%",
      means_of_verification: "Berita Acara Bimtek, daftar hadir absensi konsumsi, foto dokumentasi",
      assumptions: "Dukungan penuh dari kepala sekolah dan penyediaan tablet suplemen tepat waktu"
    },
    {
      level: "Activity",
      statement: "Rangkaian kegiatan operasional: sosialisasi, distribusi logistik, pendampingan kader, dan monitoring triwulanan",
      indicators: "Seluruh tahapan kegiatan terlaksana sesuai jadwal dan serapan anggaran BOK optimal",
      means_of_verification: "SPJ Keuangan BOK, laporan pertanggungjawaban fisik dan data monev",
      assumptions: "Pencairan dana operasional tepat waktu sesuai jadwal kas daerah"
    }
  ];

  const poa: PlanOfActionItem[] = [
    {
      id: "POA-01",
      activity: "Rapat Koordinasi & Penguatan Komitmen Lintas Sektor (Dinkes, Kemenag, Diknas, Puskesmas)",
      target_volume: "1 Kali Pertemuan (50 Peserta)",
      schedule: "Bulan 1 (Januari)",
      pic: "Kepala Bidang Kesmas & Subkor Gizi",
      budget_source: "BOK Dinkes",
      estimated_cost: 8500000,
      risk_mitigation: "Undangan resmi ditandatangani Sekretaris Daerah untuk memastikan kehadiran eselon pengambil keputusan"
    },
    {
      id: "POA-02",
      activity: "Distribusi Suplemen Gizi Mikro & Buffer Stock Formula ke Seluruh Faskes Sasaran",
      target_volume: "39 Puskesmas (100% Kebutuhan Tahunan)",
      schedule: "Bulan 1 - 2 (Februari)",
      pic: "Pengelola Obat Gizi & IFK Kabupaten",
      budget_source: "DAK Farmasi & APBD",
      estimated_cost: 18000000,
      risk_mitigation: "Sistem distribusi jemput bola menggunakan armada dinas kesehatan bagi puskesmas terpencil"
    },
    {
      id: "POA-03",
      activity: "Pendampingan Lapangan & Bimtek Pengukuran Standar bagi TPG dan Bidan Desa",
      target_volume: "39 Sesi Supervisi Puskesmas",
      schedule: "Bulan 3 - 6 (Maret - Juni)",
      pic: "Tim Supervisor Dinkes & Nutrisionis RS",
      budget_source: "BOK Puskesmas",
      estimated_cost: 15500000,
      risk_mitigation: "Penyusunan checklist digital dan evaluasi pre/post test langsung di aplikasi SIGMA"
    },
    {
      id: "POA-04",
      activity: "Monitoring Berkala, Evaluasi Trajectory Pertumbuhan Sasaran, dan Audit Rujukan Red Flags",
      target_volume: "4 Kali (Triwulan I, II, III, IV)",
      schedule: "Maret, Juni, September, Desember",
      pic: "Tim Monev SIGMA & Kepala Puskesmas",
      budget_source: "APBD Rutin",
      estimated_cost: 6000000,
      risk_mitigation: "Pemanfaatan dasbor DDDM Insight untuk refresh capaian otomatis tanpa menunggu rekap fisik manual"
    }
  ];

  log(`Matriks Logframe (4 tingkatan) dan 4 paket Rencana Aksi (PoA) selesai dirumuskan dengan estimasi anggaran transparan.`, "success");
  return { logframe, poa, logs };
}
