import type {
  Milestone,
  Requirement,
  RequirementCategory,
  RiskFactor,
  RiskSeverity,
  RiskType,
  TenderAnalysisResult,
} from "@/types/analysis";

const REQUIREMENT_CATEGORIES: readonly RequirementCategory[] = [
  "Technique",
  "Administratif",
  "Financier",
  "Juridique",
] as const;

const RISK_TYPES: readonly RiskType[] = [
  "Pénalité de retard",
  "Clause juridique",
  "Exigence éliminatoire",
  "Autre",
] as const;

const RISK_SEVERITIES: readonly RiskSeverity[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeCategory(value: unknown): RequirementCategory {
  if (
    typeof value === "string" &&
    (REQUIREMENT_CATEGORIES as readonly string[]).includes(value)
  ) {
    return value as RequirementCategory;
  }
  return "Technique";
}

function normalizeRiskType(value: unknown): RiskType {
  if (
    typeof value === "string" &&
    (RISK_TYPES as readonly string[]).includes(value)
  ) {
    return value as RiskType;
  }
  return "Autre";
}

function normalizeSeverity(value: unknown): RiskSeverity {
  if (
    typeof value === "string" &&
    (RISK_SEVERITIES as readonly string[]).includes(value)
  ) {
    return value as RiskSeverity;
  }
  return "MEDIUM";
}

function normalizeRequirement(
  value: unknown,
  index: number
): Requirement | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    id: asString(value.id, `req-${index + 1}`),
    category: normalizeCategory(value.category),
    description: asString(value.description, "Exigence non précisée"),
    isMandatory: asBoolean(value.isMandatory, true),
  };
}

function normalizeRiskFactor(
  value: unknown,
  index: number
): RiskFactor | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    id: asString(value.id, `risk-${index + 1}`),
    type: normalizeRiskType(value.type),
    description: asString(value.description, "Risque non précisé"),
    severity: normalizeSeverity(value.severity),
  };
}

function normalizeMilestone(value: unknown, index: number): Milestone | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    id: asString(value.id, `ms-${index + 1}`),
    phase: asString(value.phase, `Phase ${index + 1}`),
    deadlineOrDuration: asString(value.deadlineOrDuration, "Non précisé"),
  };
}

export function parseAndNormalizeAnalysis(
  raw: unknown
): TenderAnalysisResult {
  if (!isRecord(raw)) {
    throw new Error("La réponse IA n'est pas un objet JSON valide.");
  }

  const requirements = Array.isArray(raw.requirements)
    ? raw.requirements
        .map(normalizeRequirement)
        .filter((item): item is Requirement => item !== null)
    : [];

  const riskFactors = Array.isArray(raw.riskFactors)
    ? raw.riskFactors
        .map(normalizeRiskFactor)
        .filter((item): item is RiskFactor => item !== null)
    : [];

  const milestones = Array.isArray(raw.milestones)
    ? raw.milestones
        .map(normalizeMilestone)
        .filter((item): item is Milestone => item !== null)
    : [];

  const score = Math.min(100, Math.max(0, Math.round(asNumber(raw.goNoGoScore, 0))));

  return {
    title: asString(raw.title, "Appel d'offres sans titre"),
    clientName: asString(raw.clientName, "Client non identifié"),
    submissionDeadline: asString(raw.submissionDeadline, "Non précisée"),
    estimatedBudget: asString(raw.estimatedBudget, "Non précisé"),
    goNoGoScore: score,
    goNoGoReason: asString(
      raw.goNoGoReason,
      "Analyse insuffisante pour motiver le score."
    ),
    summary: asString(raw.summary, "Résumé non disponible."),
    requirements,
    riskFactors,
    milestones,
  };
}
