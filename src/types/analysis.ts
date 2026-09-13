export type RequirementCategory =
  | "Technique"
  | "Administratif"
  | "Financier"
  | "Juridique";

export type RiskType =
  | "Pénalité de retard"
  | "Clause juridique"
  | "Exigence éliminatoire"
  | "Autre";

export type RiskSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface Requirement {
  id: string;
  category: RequirementCategory;
  description: string;
  isMandatory: boolean;
}

export interface RiskFactor {
  id: string;
  type: RiskType;
  description: string;
  severity: RiskSeverity;
}

export interface Milestone {
  id: string;
  phase: string;
  deadlineOrDuration: string;
}

export interface TenderAnalysisResult {
  title: string;
  clientName: string;
  submissionDeadline: string;
  estimatedBudget: string;
  goNoGoScore: number;
  goNoGoReason: string;
  summary: string;
  requirements: Requirement[];
  riskFactors: RiskFactor[];
  milestones: Milestone[];
}

export type AnalysisAppState = "idle" | "analyzing" | "result" | "error";

export interface AnalyzeApiError {
  error: string;
  details?: string;
}

export interface AnalyzeApiSuccess {
  data: TenderAnalysisResult;
}
