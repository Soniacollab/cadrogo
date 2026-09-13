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

export type ConformityAxis =
  | "Sécurité"
  | "Capacité Technique"
  | "Respect des Délais"
  | "Rentabilité Financière"
  | "Conformité Administrative";

export type ExposureKind =
  | "daily"
  | "weekly"
  | "capped"
  | "unlimited"
  | "one_shot"
  | "none";

export type CompanyGapStatus = "ok" | "missing" | "unknown";

export interface SourceCitation {
  page: number | null;
  excerpt: string;
}

export interface Requirement {
  id: string;
  category: RequirementCategory;
  description: string;
  isMandatory: boolean;
  citation?: SourceCitation;
  companyGap?: CompanyGapStatus;
  gapReason?: string;
}

export interface RiskFactor {
  id: string;
  type: RiskType;
  description: string;
  severity: RiskSeverity;
  citation?: SourceCitation;
  financialExposureEur?: number | null;
  exposureKind?: ExposureKind;
  exposureLabel?: string;
}

export interface Milestone {
  id: string;
  phase: string;
  deadlineOrDuration: string;
}

export interface ConformityRadarPoint {
  axis: ConformityAxis;
  score: number;
}

export interface ScoringWeight {
  label: string;
  weight: number;
}

export interface PriceWinPoint {
  priceLabel: string;
  priceValue: number;
  winProbability: number;
  estimatedScore: number;
}

export interface DecisionInsights {
  conformityRadar: ConformityRadarPoint[];
  scoringWeights: ScoringWeight[];
  priceWinCurve: PriceWinPoint[];
  recommendedPriceLabel: string;
  recommendedWinProbability: number;
  winRecommendation: string;
}

export interface FinancialExposureSummary {
  maxExposureEur: number | null;
  hasUnlimitedExposure: boolean;
  penaltyCount: number;
  cappedPenaltyCount: number;
  summary: string;
}

export interface ComparableAward {
  id: string;
  buyerName: string;
  title: string;
  cpv: string;
  awardValueEur: number;
  estimatedValueEur: number | null;
  awardYear: number;
  winnerSizeBand: string;
  discountVsEstimatePercent: number | null;
  procedureType: string;
}

export interface WinPriorInsight {
  baseWinProbability: number;
  method: string;
  notes: string;
  sampleSize: number;
  medianDiscountPercent: number | null;
}

export interface TenderAnalysisResult {
  title: string;
  clientName: string;
  submissionDeadline: string;
  estimatedBudget: string;
  estimatedBudgetValue?: number | null;
  goNoGoScore: number;
  goNoGoReason: string;
  summary: string;
  requirements: Requirement[];
  riskFactors: RiskFactor[];
  milestones: Milestone[];
  decisionInsights: DecisionInsights;
  financialExposure: FinancialExposureSummary;
  comparables?: ComparableAward[];
  winPrior?: WinPriorInsight;
}

export interface CompanyProfile {
  companyName: string;
  tjmEur: number;
  targetMarginPercent: number;
  availableDays: number;
  annualRevenueEur: number;
  certifications: string[];
  hasSecNumCloudPartner: boolean;
  hasPublicReferences: boolean;
  region: string;
  updatedAt: string;
}

export interface WinSimulationPoint {
  priceLabel: string;
  priceValue: number;
  estimatedCost: number;
  marginPercent: number;
  winProbability: number;
  isProfitable: boolean;
  isRecommended: boolean;
}

export type WinVerdict = "bid" | "pass" | "negotiate";

export interface WinSimulationResult {
  curve: WinSimulationPoint[];
  recommendedPrice: number;
  recommendedWinProbability: number;
  verdict: WinVerdict;
  verdictLabel: string;
  explanation: string;
  estimatedInternalCost: number;
  breakEvenPrice: number;
}

export interface BidOutcomeRecord {
  id: string;
  title: string;
  clientName: string;
  outcome: "won" | "lost" | "passed" | "pending";
  bidPriceEur?: number;
  notes?: string;
  createdAt: string;
}

export type AnalysisAppState = "idle" | "analyzing" | "result" | "error";

export interface AnalyzeApiError {
  error: string;
  details?: string;
}

export interface AnalyzeApiSuccess {
  data: TenderAnalysisResult;
}

export interface SimulateApiRequest {
  analysis: TenderAnalysisResult;
  profile: CompanyProfile;
}

export interface SimulateApiSuccess {
  data: WinSimulationResult;
}
