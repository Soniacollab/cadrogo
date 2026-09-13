import type {
  CompanyProfile,
  TenderAnalysisResult,
  WinSimulationPoint,
  WinSimulationResult,
  WinVerdict,
} from "@/types/analysis";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function estimateEffortDays(analysis: TenderAnalysisResult, profile: CompanyProfile): number {
  const reqCount = analysis.requirements.length;
  const mandatory = analysis.requirements.filter((r) => r.isMandatory).length;
  const fromBudget =
    analysis.estimatedBudgetValue && analysis.estimatedBudgetValue > 0
      ? analysis.estimatedBudgetValue / Math.max(profile.tjmEur, 1) / 1.35
      : 60;
  const complexityBoost = mandatory * 2 + reqCount * 0.5;
  return clamp(Math.round(fromBudget * 0.35 + complexityBoost), 15, Math.max(30, profile.availableDays));
}

function baseWinFromAnalysis(analysis: TenderAnalysisResult): number {
  const prior = analysis.winPrior?.baseWinProbability;
  if (typeof prior === "number") return prior;
  return clamp(analysis.goNoGoScore * 0.85, 5, 95);
}

function applyCompanyFit(
  base: number,
  analysis: TenderAnalysisResult,
  profile: CompanyProfile
): number {
  let score = base;
  const text = [
    analysis.summary,
    ...analysis.requirements.map((r) => r.description),
  ]
    .join(" ")
    .toLowerCase();

  if (/secnumcloud|hds|iso\s*27001/.test(text)) {
    if (profile.hasSecNumCloudPartner || profile.certifications.some((c) => /secnumcloud|hds|27001/i.test(c))) {
      score += 8;
    } else {
      score -= 18;
    }
  }

  if (/rgaa|accessibilit/.test(text)) {
    if (profile.certifications.some((c) => /rgaa|accessibilit/i.test(c))) score += 4;
    else score -= 4;
  }

  if (profile.hasPublicReferences) score += 5;
  else score -= 6;

  if (profile.annualRevenueEur < 300_000) score -= 10;
  else if (profile.annualRevenueEur >= 1_000_000) score += 4;

  const missingGaps = analysis.requirements.filter((r) => r.companyGap === "missing").length;
  score -= missingGaps * 6;

  if (analysis.financialExposure.hasUnlimitedExposure) score -= 15;
  if (
    analysis.financialExposure.maxExposureEur &&
    analysis.financialExposure.maxExposureEur > profile.annualRevenueEur * 0.15
  ) {
    score -= 10;
  }

  return clamp(score, 3, 97);
}

export function simulateWinEngine(
  analysis: TenderAnalysisResult,
  profile: CompanyProfile
): WinSimulationResult {
  const effortDays = estimateEffortDays(analysis, profile);
  const estimatedInternalCost = Math.round(effortDays * profile.tjmEur);
  const breakEvenPrice = Math.round(
    estimatedInternalCost / (1 - profile.targetMarginPercent / 100)
  );

  const budget =
    analysis.estimatedBudgetValue && analysis.estimatedBudgetValue > 0
      ? analysis.estimatedBudgetValue
      : Math.round(breakEvenPrice * 1.15);

  const fittedBase = applyCompanyFit(baseWinFromAnalysis(analysis), analysis, profile);
  const medianDiscount = analysis.winPrior?.medianDiscountPercent ?? -8;
  const marketSweet = budget * (1 + medianDiscount / 100);

  const factors = [0.78, 0.88, 0.95, 1.0, 1.08, 1.18];
  const curve: WinSimulationPoint[] = factors.map((factor) => {
    const priceValue = Math.round(budget * factor);
    const marginPercent =
      priceValue <= 0
        ? 0
        : Math.round(((priceValue - estimatedInternalCost) / priceValue) * 1000) / 10;
    const pricePressure = ((priceValue - marketSweet) / Math.max(marketSweet, 1)) * 100;
    const winProbability = clamp(
      Math.round(fittedBase - pricePressure * 1.15 - Math.max(0, marginPercent - 40) * 0.25),
      2,
      96
    );
    const isProfitable = marginPercent >= profile.targetMarginPercent;
    return {
      priceLabel: `${priceValue.toLocaleString("fr-FR")} €`,
      priceValue,
      estimatedCost: estimatedInternalCost,
      marginPercent,
      winProbability,
      isProfitable,
      isRecommended: false,
    };
  });

  const candidates = curve.filter((p) => p.isProfitable);
  const pool = candidates.length > 0 ? candidates : curve;
  const recommended =
    [...pool].sort(
      (a, b) =>
        b.winProbability * 0.7 +
        Math.min(b.marginPercent, 40) * 0.3 -
        (a.winProbability * 0.7 + Math.min(a.marginPercent, 40) * 0.3)
    )[0] ?? curve[0]!;

  const marked = curve.map((p) => ({
    ...p,
    isRecommended: p.priceValue === recommended.priceValue,
  }));

  let verdict: WinVerdict = "bid";
  let verdictLabel = "Répondre";
  if (
    !recommended.isProfitable ||
    recommended.winProbability < 28 ||
    analysis.financialExposure.hasUnlimitedExposure ||
    analysis.goNoGoScore < 40
  ) {
    verdict = "pass";
    verdictLabel = "Passer";
  } else if (recommended.winProbability < 45 || recommended.marginPercent < profile.targetMarginPercent + 3) {
    verdict = "negotiate";
    verdictLabel = "Négocier / lotir";
  }

  const explanation =
    verdict === "pass"
      ? `Au prix rentable (~${recommended.priceLabel}), la probabilité de gain estimée tombe à ${recommended.winProbability} % ou l'exposition financière reste trop élevée. Mieux vaut préserver la capacité commerciale.`
      : verdict === "negotiate"
        ? `Zone tendue : viser ${recommended.priceLabel} (marge ${recommended.marginPercent} %, win ~${recommended.winProbability} %). Envisagez un lot plus restreint ou une clarification des pénalités.`
        : `Positionnement recommandé à ${recommended.priceLabel} : marge ${recommended.marginPercent} % pour un coût interne estimé ${estimatedInternalCost.toLocaleString("fr-FR")} €, avec ~${recommended.winProbability} % de chances de gain.`;

  return {
    curve: marked,
    recommendedPrice: recommended.priceValue,
    recommendedWinProbability: recommended.winProbability,
    verdict,
    verdictLabel,
    explanation,
    estimatedInternalCost,
    breakEvenPrice,
  };
}
