/**
 * DDDM Insight Types - SIGMA RCS Ecosystem
 * Data-Driven Decision Making & Objectives-Oriented Project Planning (OOPP)
 */

export type DomainType = 
  | "balita_gizi" 
  | "ibu_hamil" 
  | "remaja_putri" 
  | "mbg" 
  | "pkmk" 
  | "bimtek_gizi";

export interface EvidenceItem {
  evidence_id: string;
  domain: DomainType;
  domain_label: string;
  indicator_key: string;
  label: string;
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  unit: "percent" | "count" | "score";
  target: number | null;
  target_direction: "higher" | "lower";
  gap_value: number | null; // percentage points (pp) or count gap
  population: string;
  period: string;
  geography: string;
  data_status: "VALID" | "PARTIAL" | "NOT_SCHEDULED" | "SUPPRESSED";
  quality_flags: string[];
  category?: string;
  notes?: string;
}

export interface ProblemCandidate {
  problem_id: string;
  title: string;
  statement: string;
  problem_type: "HEALTH_OUTCOME" | "SERVICE_COVERAGE" | "IMPLEMENTATION" | "DATA_QUALITY" | "CAPACITY";
  domain: DomainType;
  population: string;
  geography: string;
  observation_period: string;
  indicator_refs: string[];
  evidence_refs: string[];
  gap_value: number;
  gap_unit: string;
  trend: "worsening" | "stagnant" | "improving" | "unknown";
  affected_count: number | null;
  limitations: string[];
  verification_questions: string[];
  claim_type: "OBSERVED" | "DERIVED" | "HYPOTHESIS";
  usg: {
    urgency: number; // 1-5
    seriousness: number; // 1-5
    growth: number; // 1-5
    total: number; // 3-15
    override_total?: number;
    override_reason?: string;
    rank?: number;
  };
}

export interface CauseNode {
  id: string;
  label: string;
  type: "root_cause" | "intermediate_cause" | "core_problem" | "effect";
  category: "sdm" | "metode" | "sarana" | "pengukuran" | "pembiayaan" | "lingkungan";
  claim_type: "OBSERVED" | "HYPOTHESIS";
  controllability: "controllable" | "influenceable" | "outside_control";
  evidence_refs: string[];
  verification_needed?: string;
}

export interface CauseEdge {
  id: string;
  source: string;
  target: string;
  relation: "CAUSES" | "CONTRIBUTES_TO" | "LEADS_TO_HYPOTHESIS";
}

export interface ObjectiveNode {
  id: string;
  source_cause_id?: string;
  title: string;
  level: "goal" | "purpose" | "output";
  indicator: string;
  baseline: string;
  target: string;
  timeframe: string;
  owner: string;
}

export interface StrategicAlternative {
  id: string;
  title: string;
  type: "spesifik" | "sensitif";
  mechanism_of_change: string;
  components: string[];
  target_beneficiaries: string;
  mcda_score: {
    impact: number; // 1-5
    feasibility: number; // 1-5
    cost_efficiency: number; // 1-5
    capacity: number; // 1-5
    total_score: number; // 0-100 normalized
  };
  addressed_causes: string[];
  indicative_cost: string;
  risks: string[];
  prerequisites: string[];
  status: "PROPOSED" | "SELECTED" | "REJECTED";
  selection_rationale?: string;
}

export interface LogframeItem {
  level: "Goal" | "Outcome" | "Output" | "Activity";
  statement: string;
  indicators: string;
  means_of_verification: string;
  assumptions: string;
}

export interface PlanOfActionItem {
  id: string;
  activity: string;
  target_volume: string;
  schedule: string;
  pic: string;
  budget_source: string;
  estimated_cost: number | null;
  risk_mitigation: string;
}

export interface LangflowAgentNode {
  id: string;
  node_number: number;
  title: string;
  agent_role: string;
  description: string;
  status: "idle" | "running" | "completed" | "error";
  latency_ms?: number;
  model_used?: string;
  summary_output?: string;
}

export interface ExecutionLogItem {
  id: string;
  timestamp: string;
  node_id: string;
  message: string;
  level: "info" | "warn" | "success" | "error";
}

export interface DDDMPlanDocument {
  plan_id: string;
  title: string;
  scope: {
    level: "kabupaten" | "puskesmas";
    puskesmas_name: string;
    tahun: number;
    periode: string;
  };
  status: "DRAFT_AI" | "IN_REVIEW" | "APPROVED";
  created_at: string;
  updated_at: string;
  approved_by?: string;
  approval_notes?: string;
  evidence_matrix: EvidenceItem[];
  problem_candidates: ProblemCandidate[];
  selected_core_problem_id: string;
  cause_graph: {
    nodes: CauseNode[];
    edges: CauseEdge[];
  };
  objectives: ObjectiveNode[];
  strategic_alternatives: StrategicAlternative[];
  selected_strategy_id: string;
  logframe: LogframeItem[];
  poa: PlanOfActionItem[];
  execution_logs: ExecutionLogItem[];
}
