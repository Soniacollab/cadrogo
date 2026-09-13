import type {
  ExposureKind,
  FinancialExposureSummary,
  RiskFactor,
} from "@/types/analysis";

function parseFrenchNumber(raw: string): number | null {
  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/\u00a0/g, "")
    .replace(/€/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function extractMoneyAmounts(text: string): number[] {
  const amounts: number[] = [];
  const re =
    /(\d{1,3}(?:[.\s]\d{3})*(?:,\d+)?|\d+(?:,\d+)?)\s*(?:€|euros?|EUR)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const value = parseFrenchNumber(match[1] ?? "");
    if (value !== null && value > 0) amounts.push(value);
  }
  const percentOf =
    /(\d+(?:[.,]\d+)?)\s*%[^.]{0,40}(?:montant|marché|lot|prix)/gi;
  while ((match = percentOf.exec(text)) !== null) {
    // Keep as marker only; real € needs budget context later.
    void match;
  }
  return amounts;
}

export function enrichRiskFinancials(
  risk: RiskFactor,
  budgetHint?: number | null
): RiskFactor {
  const text = `${risk.type} ${risk.description}`.toLowerCase();
  const amounts = extractMoneyAmounts(risk.description);
  const hasUnlimited =
    /sans plafond|illimit|responsabilité illimitée|non plafonn/.test(text);
  const isDaily = /\/\s*jour|par jour|\/\s*j\b|calendaire/.test(text);
  const isWeekly = /par semaine|\/\s*semaine/.test(text);
  const isCapped = /plafonn|plafond|limité[e]? à/.test(text);
  const isPenalty =
    risk.type === "Pénalité de retard" ||
    /pénalit|penalit|amende|avoir de|retenue/.test(text);

  let exposureKind: ExposureKind = "none";
  let financialExposureEur: number | null = null;
  let exposureLabel = "Impact financier non chiffré";

  if (hasUnlimited) {
    exposureKind = "unlimited";
    financialExposureEur = null;
    exposureLabel = "Exposition financière illimitée";
  } else if (isDaily && amounts.length > 0) {
    exposureKind = "daily";
    const daily = amounts[0]!;
    const assumedDays = 10;
    financialExposureEur = Math.round(daily * assumedDays);
    exposureLabel = `${daily.toLocaleString("fr-FR")} €/jour · ~${financialExposureEur.toLocaleString("fr-FR")} € sur ${assumedDays} j`;
  } else if (isWeekly && amounts.length > 0) {
    exposureKind = "weekly";
    const weekly = amounts[0]!;
    financialExposureEur = Math.round(weekly * 4);
    exposureLabel = `${weekly.toLocaleString("fr-FR")} €/semaine · ~${financialExposureEur.toLocaleString("fr-FR")} € / mois`;
  } else if (isCapped && amounts.length > 0) {
    exposureKind = "capped";
    financialExposureEur = Math.max(...amounts);
    exposureLabel = `Plafond estimé ${financialExposureEur.toLocaleString("fr-FR")} €`;
  } else if (amounts.length > 0 && isPenalty) {
    exposureKind = "one_shot";
    financialExposureEur = Math.max(...amounts);
    exposureLabel = `Impact estimé ${financialExposureEur.toLocaleString("fr-FR")} €`;
  } else if (isPenalty && budgetHint && /%/.test(text)) {
    const pctMatch = text.match(/(\d+(?:[.,]\d+)?)\s*%/);
    if (pctMatch) {
      const pct = Number(pctMatch[1]!.replace(",", "."));
      if (Number.isFinite(pct)) {
        exposureKind = isCapped ? "capped" : "one_shot";
        financialExposureEur = Math.round((budgetHint * pct) / 100);
        exposureLabel = `${pct} % du marché · ~${financialExposureEur.toLocaleString("fr-FR")} €`;
      }
    }
  }

  return {
    ...risk,
    financialExposureEur,
    exposureKind,
    exposureLabel,
  };
}

export function buildFinancialExposureSummary(
  risks: RiskFactor[]
): FinancialExposureSummary {
  const penaltyRisks = risks.filter(
    (r) =>
      r.exposureKind === "daily" ||
      r.exposureKind === "weekly" ||
      r.exposureKind === "capped" ||
      r.exposureKind === "one_shot" ||
      r.exposureKind === "unlimited" ||
      r.type === "Pénalité de retard"
  );

  const hasUnlimitedExposure = risks.some((r) => r.exposureKind === "unlimited");
  const cappedPenaltyCount = risks.filter((r) => r.exposureKind === "capped").length;
  const numeric = risks
    .map((r) => r.financialExposureEur)
    .filter((v): v is number => typeof v === "number" && v > 0);
  const maxExposureEur = numeric.length > 0 ? Math.max(...numeric) : null;

  let summary: string;
  if (hasUnlimitedExposure) {
    summary =
      "Au moins une clause d'exposition financière illimitée a été détectée — risque majeur pour une PME.";
  } else if (maxExposureEur !== null) {
    summary = `Exposition financière estimée jusqu'à ${maxExposureEur.toLocaleString("fr-FR")} € sur les pénalités / clauses chiffrées.`;
  } else if (penaltyRisks.length > 0) {
    summary =
      "Des pénalités sont présentes mais leur montant n'est pas toujours chiffrable dans le texte.";
  } else {
    summary = "Aucune pénalité financière significative n'a été quantifiée.";
  }

  return {
    maxExposureEur,
    hasUnlimitedExposure,
    penaltyCount: penaltyRisks.length,
    cappedPenaltyCount,
    summary,
  };
}

export function parseBudgetValue(budget: string): number | null {
  const amounts = extractMoneyAmounts(budget);
  if (amounts.length > 0) return Math.max(...amounts);
  const raw = budget.replace(/\s/g, "").replace(",", ".");
  const m = raw.match(/(\d+(?:\.\d+)?)\s*[mM]/);
  if (m) return Math.round(Number(m[1]) * 1_000_000);
  const k = raw.match(/(\d+(?:\.\d+)?)\s*[kK]/);
  if (k) return Math.round(Number(k[1]) * 1_000);
  return null;
}
