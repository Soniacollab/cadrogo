import type {
  CompanyGapStatus,
  Requirement,
  TenderAnalysisResult,
} from "@/types/analysis";

export type ComplianceStatus = CompanyGapStatus;

export interface ComplianceRow {
  id: string;
  requirement: string;
  isMandatory: boolean;
  companyStatus: ComplianceStatus;
  detail: string;
}

export interface ComplianceSummary {
  total: number;
  ok: number;
  missing: number;
  unknown: number;
  mandatoryMissing: number;
}

export type ProjectedVerdict = "go" | "review" | "nogo";

export interface DecisionScenario {
  id: string;
  title: string;
  description: string;
  scoreDelta: number;
  projectedScore: number;
  projectedVerdict: ProjectedVerdict;
}

export const PROJECTED_VERDICT_LABELS: Record<ProjectedVerdict, string> = {
  go: "GO",
  review: "À VÉRIFIER",
  nogo: "NO-GO",
};

const GAP_RANK: Record<ComplianceStatus, number> = {
  missing: 2,
  unknown: 1,
  ok: 0,
};

interface ThemeSpec {
  id: string;
  match: (text: string) => boolean;
  title: string;
  description: string;
  missingDelta: number;
  unknownDelta: number;
}

const COMPLIANCE_THEMES: ThemeSpec[] = [
  {
    id: "hds",
    match: (text) => /\bhds\b/.test(text),
    title: "Obtenir HDS",
    description:
      "Un hébergeur de données de santé (ou un partenaire HDS) lèverait l'écart sur l'hébergement santé.",
    missingDelta: 18,
    unknownDelta: 8,
  },
  {
    id: "secnumcloud",
    match: (text) => /secnumcloud/.test(text),
    title: "Couvrir SecNumCloud",
    description:
      "Un partenaire ou une qualification SecNumCloud sécuriserait l'exigence d'hébergement qualifié.",
    missingDelta: 20,
    unknownDelta: 8,
  },
  {
    id: "iso27001",
    match: (text) => /iso\s*27001|iso27001/.test(text),
    title: "Obtenir ISO 27001",
    description:
      "La certification ISO 27001 (ou un partenaire certifié) comblerait le gap sécurité.",
    missingDelta: 12,
    unknownDelta: 6,
  },
  {
    id: "references",
    match: (text) => /r[ée]f[ée]rence|secteur public|collectivit/.test(text),
    title: "Apporter des références publiques",
    description:
      "Des références secteur public comparables renforceraient la crédibilité et le score.",
    missingDelta: 10,
    unknownDelta: 5,
  },
  {
    id: "rgaa",
    match: (text) => /rgaa|accessibilit/.test(text),
    title: "Couvrir le RGAA",
    description:
      "Une compétence accessibilité / RGAA déclarée réduirait le risque d'écart technique.",
    missingDelta: 8,
    unknownDelta: 4,
  },
];

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

export function verdictFromScore(score: number): ProjectedVerdict {
  if (score >= 75) return "go";
  if (score >= 50) return "review";
  return "nogo";
}

function gapOf(req: Requirement): ComplianceStatus {
  return req.companyGap ?? "unknown";
}

function worseGap(a: ComplianceStatus, b: ComplianceStatus): ComplianceStatus {
  return GAP_RANK[a] >= GAP_RANK[b] ? a : b;
}

function clip(text: string, max = 160): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function makeScenario(
  id: string,
  title: string,
  description: string,
  scoreDelta: number,
  currentScore: number
): DecisionScenario {
  const projectedScore = clampScore(currentScore + scoreDelta);
  return {
    id,
    title,
    description,
    scoreDelta,
    projectedScore,
    projectedVerdict: verdictFromScore(projectedScore),
  };
}

export function buildComplianceRows(
  analysis: TenderAnalysisResult
): ComplianceRow[] {
  return analysis.requirements.map((req) => ({
    id: req.id,
    requirement: req.description,
    isMandatory: req.isMandatory,
    companyStatus: gapOf(req),
    detail:
      req.gapReason ?? "Écart non renseigné — à vérifier manuellement.",
  }));
}

export function buildVerdictReasons(
  analysis: TenderAnalysisResult,
  max = 3
): string[] {
  const reasons: string[] = [];
  const seen = new Set<string>();

  const push = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || reasons.length >= max) return;
    const key = trimmed.toLowerCase().replace(/\s+/g, " ").slice(0, 56);
    if (seen.has(key)) return;
    seen.add(key);
    reasons.push(trimmed);
  };

  for (const req of analysis.requirements) {
    if (req.isMandatory && gapOf(req) === "missing") {
      push(req.gapReason || req.description);
    }
  }

  const rankedRisks = [...analysis.riskFactors].sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return order[a.severity] - order[b.severity];
  });
  for (const risk of rankedRisks) {
    if (risk.severity === "CRITICAL" || risk.severity === "HIGH") {
      push(risk.description);
    }
  }

  return reasons;
}

export function complianceSummary(rows: ComplianceRow[]): ComplianceSummary {
  return {
    total: rows.length,
    ok: rows.filter((row) => row.companyStatus === "ok").length,
    missing: rows.filter((row) => row.companyStatus === "missing").length,
    unknown: rows.filter((row) => row.companyStatus === "unknown").length,
    mandatoryMissing: rows.filter(
      (row) => row.isMandatory && row.companyStatus === "missing"
    ).length,
  };
}

function buildThemeScenarios(
  analysis: TenderAnalysisResult
): DecisionScenario[] {
  const scenarios: DecisionScenario[] = [];

  for (const theme of COMPLIANCE_THEMES) {
    const matches = analysis.requirements.filter((req) =>
      theme.match(req.description.toLowerCase())
    );
    if (matches.length === 0) continue;

    const worst = matches.reduce<ComplianceStatus>(
      (acc, req) => worseGap(acc, gapOf(req)),
      "ok"
    );
    if (worst === "ok") continue;

    const delta =
      worst === "missing" ? theme.missingDelta : theme.unknownDelta;
    const mandatoryHit = matches.some((req) => req.isMandatory);
    const boosted = mandatoryHit && worst === "missing" ? delta + 2 : delta;

    scenarios.push(
      makeScenario(
        theme.id,
        theme.title,
        theme.description,
        boosted,
        analysis.goNoGoScore
      )
    );
  }

  return scenarios;
}

function buildRiskMitigationScenario(
  analysis: TenderAnalysisResult
): DecisionScenario | null {
  const ranked = [...analysis.riskFactors].sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return order[a.severity] - order[b.severity];
  });
  const top = ranked[0];
  const unlimited = analysis.financialExposure.hasUnlimitedExposure;
  const severe =
    top && (top.severity === "CRITICAL" || top.severity === "HIGH");

  if (!unlimited && !severe) return null;

  if (unlimited) {
    return makeScenario(
      "risk-mitigation",
      "Plafonner l'exposition financière",
      `Obtenir un plafond de responsabilité à la place d'une exposition illimitée (${clip(analysis.financialExposure.summary)}).`,
      16,
      analysis.goNoGoScore
    );
  }

  const delta = top.severity === "CRITICAL" ? 14 : 10;
  return makeScenario(
    "risk-mitigation",
    "Mitiger le risque principal",
    `Traiter « ${top.type} » : ${clip(top.description)}`,
    delta,
    analysis.goNoGoScore
  );
}

export function buildDecisionScenarios(
  analysis: TenderAnalysisResult
): DecisionScenario[] {
  const scenarios = buildThemeScenarios(analysis);
  const riskScenario = buildRiskMitigationScenario(analysis);
  if (riskScenario) scenarios.push(riskScenario);

  return scenarios.sort((a, b) => b.scoreDelta - a.scoreDelta || a.title.localeCompare(b.title, "fr"));
}
