import {
  attachCitationsToRequirements,
  attachCitationsToRisks,
  type PdfPage,
} from "@/lib/citations";
import { applyCompanyGaps } from "@/lib/company-gaps";
import {
  buildFinancialExposureSummary,
  enrichRiskFinancials,
  parseBudgetValue,
} from "@/lib/financial-exposure";
import { computeWinPrior, findComparables } from "@/lib/win-model";
import type {
  CompanyProfile,
  ConformityAxis,
  ConformityRadarPoint,
  DecisionInsights,
  Milestone,
  PriceWinPoint,
  Requirement,
  RequirementCategory,
  RiskFactor,
  RiskSeverity,
  RiskType,
  ScoringWeight,
  SourceCitation,
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

const CONFORMITY_AXES: readonly ConformityAxis[] = [
  "Sécurité",
  "Capacité Technique",
  "Respect des Délais",
  "Rentabilité Financière",
  "Conformité Administrative",
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

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
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

function normalizeCitation(value: unknown): SourceCitation | undefined {
  if (!isRecord(value)) return undefined;
  const pageRaw = value.page;
  const page =
    typeof pageRaw === "number" && Number.isFinite(pageRaw)
      ? Math.max(1, Math.round(pageRaw))
      : null;
  const excerpt = asString(value.excerpt, "");
  if (!excerpt && page === null) return undefined;
  return { page, excerpt: excerpt.slice(0, 220) };
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
    citation: normalizeCitation(value.citation),
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
    citation: normalizeCitation(value.citation),
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

function buildFallbackRadar(score: number): ConformityRadarPoint[] {
  const offsets = [-4, 6, -8, 3, -2];
  return CONFORMITY_AXES.map((axis, index) => ({
    axis,
    score: clampScore(score + (offsets[index] ?? 0)),
  }));
}

function buildFallbackWeights(): ScoringWeight[] {
  return [
    { label: "Prix", weight: 40 },
    { label: "Technique", weight: 50 },
    { label: "RSE", weight: 10 },
  ];
}

function buildFallbackPriceCurve(score: number): PriceWinPoint[] {
  const base = Math.max(40_000, score * 1_200);
  const factors = [0.8, 0.9, 1.0, 1.1, 1.25];
  return factors.map((factor, index) => {
    const priceValue = Math.round(base * factor);
    const winProbability = clampScore(score + 18 - index * 10);
    return {
      priceLabel: `${priceValue.toLocaleString("fr-FR")} €`,
      priceValue,
      winProbability,
      estimatedScore: clampScore(winProbability * 0.9 + 5),
    };
  });
}

function normalizeDecisionInsights(
  raw: unknown,
  goNoGoScore: number
): DecisionInsights {
  const source = isRecord(raw) ? raw : {};

  const radarRaw = Array.isArray(source.conformityRadar)
    ? source.conformityRadar
    : [];
  const radarMap = new Map<string, number>();
  for (const item of radarRaw) {
    if (!isRecord(item)) {
      continue;
    }
    const axis = asString(item.axis);
    if ((CONFORMITY_AXES as readonly string[]).includes(axis)) {
      radarMap.set(axis, clampScore(asNumber(item.score, goNoGoScore)));
    }
  }
  const conformityRadar: ConformityRadarPoint[] =
    radarMap.size === CONFORMITY_AXES.length
      ? CONFORMITY_AXES.map((axis) => ({
          axis,
          score: radarMap.get(axis) ?? goNoGoScore,
        }))
      : buildFallbackRadar(goNoGoScore);

  let scoringWeights: ScoringWeight[] = Array.isArray(source.scoringWeights)
    ? source.scoringWeights
        .filter(isRecord)
        .map((item) => ({
          label: asString(item.label, "Critère"),
          weight: Math.max(0, asNumber(item.weight, 0)),
        }))
        .filter((item) => item.weight > 0)
    : [];

  if (scoringWeights.length === 0) {
    scoringWeights = buildFallbackWeights();
  } else {
    const total = scoringWeights.reduce((sum, item) => sum + item.weight, 0);
    if (total > 0 && Math.abs(total - 100) > 1) {
      scoringWeights = scoringWeights.map((item) => ({
        ...item,
        weight: Math.round((item.weight / total) * 100),
      }));
    }
  }

  let priceWinCurve: PriceWinPoint[] = Array.isArray(source.priceWinCurve)
    ? source.priceWinCurve
        .filter(isRecord)
        .map((item, index) => {
          const priceValue = asNumber(item.priceValue, 0);
          const winProbability = clampScore(
            asNumber(item.winProbability, goNoGoScore)
          );
          return {
            priceLabel: asString(
              item.priceLabel,
              priceValue > 0
                ? `${priceValue.toLocaleString("fr-FR")} €`
                : `Scénario ${index + 1}`
            ),
            priceValue,
            winProbability,
            estimatedScore: clampScore(
              asNumber(item.estimatedScore, winProbability)
            ),
          };
        })
        .filter((item) => item.priceLabel.length > 0)
    : [];

  if (priceWinCurve.length < 3) {
    priceWinCurve = buildFallbackPriceCurve(goNoGoScore);
  }

  const bestPoint = [...priceWinCurve].sort(
    (a, b) => b.winProbability - a.winProbability
  )[0];

  return {
    conformityRadar,
    scoringWeights,
    priceWinCurve,
    recommendedPriceLabel: asString(
      source.recommendedPriceLabel,
      bestPoint?.priceLabel ?? "Non précisé"
    ),
    recommendedWinProbability: clampScore(
      asNumber(
        source.recommendedWinProbability,
        bestPoint?.winProbability ?? goNoGoScore
      )
    ),
    winRecommendation: asString(
      source.winRecommendation,
      "Si vous positionnez votre offre autour de ce montant, vous conservez une marge correcte sans vous exclure sur le critère prix."
    ),
  };
}

export function parseAndNormalizeAnalysis(
  raw: unknown,
  options?: {
    pages?: PdfPage[];
    profile?: CompanyProfile | null;
  }
): TenderAnalysisResult {
  if (!isRecord(raw)) {
    throw new Error("La réponse IA n'est pas un objet JSON valide.");
  }

  let requirements = Array.isArray(raw.requirements)
    ? raw.requirements
        .map(normalizeRequirement)
        .filter((item): item is Requirement => item !== null)
    : [];

  let riskFactors = Array.isArray(raw.riskFactors)
    ? raw.riskFactors
        .map(normalizeRiskFactor)
        .filter((item): item is RiskFactor => item !== null)
    : [];

  const milestones = Array.isArray(raw.milestones)
    ? raw.milestones
        .map(normalizeMilestone)
        .filter((item): item is Milestone => item !== null)
    : [];

  const score = clampScore(asNumber(raw.goNoGoScore, 0));
  const estimatedBudget = asString(raw.estimatedBudget, "Non précisé");
  const estimatedBudgetValue = parseBudgetValue(estimatedBudget);

  if (options?.pages?.length) {
    requirements = attachCitationsToRequirements(requirements, options.pages);
    riskFactors = attachCitationsToRisks(riskFactors, options.pages);
  }

  riskFactors = riskFactors.map((risk) =>
    enrichRiskFinancials(risk, estimatedBudgetValue)
  );
  requirements = applyCompanyGaps(requirements, options?.profile);

  const financialExposure = buildFinancialExposureSummary(riskFactors);

  const base: TenderAnalysisResult = {
    title: asString(raw.title, "Appel d'offres sans titre"),
    clientName: asString(raw.clientName, "Client non identifié"),
    submissionDeadline: asString(raw.submissionDeadline, "Non précisée"),
    estimatedBudget,
    estimatedBudgetValue,
    goNoGoScore: score,
    goNoGoReason: asString(
      raw.goNoGoReason,
      "Les éléments du dossier ne suffisent pas pour motiver clairement ce score."
    ),
    summary: asString(raw.summary, "Résumé non disponible."),
    requirements,
    riskFactors,
    milestones,
    decisionInsights: normalizeDecisionInsights(raw.decisionInsights, score),
    financialExposure,
  };

  const comparables = findComparables(base, 5);
  const winPrior = computeWinPrior(base, options?.profile);

  return {
    ...base,
    comparables,
    winPrior,
  };
}
