import type { ComparableAward, CompanyProfile, TenderAnalysisResult, WinPriorInsight } from "@/types/analysis";
import comparablesSeed from "@/data/beauamp-it-sample.json";

interface SampleAward {
  id: string;
  buyerName: string;
  title: string;
  cpv: string;
  awardValueEur: number;
  estimatedValueEur: number | null;
  awardYear: number;
  winnerSizeBand: string;
  procedureType: string;
}

const SAMPLE = comparablesSeed as SampleAward[];

function discountPct(award: SampleAward): number | null {
  if (!award.estimatedValueEur || award.estimatedValueEur <= 0) return null;
  return Math.round(
    ((award.awardValueEur - award.estimatedValueEur) / award.estimatedValueEur) * 1000
  ) / 10;
}

function sizeBandFromRevenue(revenue: number): string {
  if (revenue < 500_000) return "TPE";
  if (revenue < 2_000_000) return "PME";
  if (revenue < 10_000_000) return "ETI";
  return "GE";
}

function scoreComparable(
  award: SampleAward,
  budget: number | null | undefined,
  clientName: string
): number {
  let score = 0;
  if (budget && budget > 0) {
    const ratio = award.awardValueEur / budget;
    score += 40 - Math.min(40, Math.abs(Math.log(ratio)) * 25);
  }
  if (
    clientName &&
    award.buyerName.toLowerCase().includes(clientName.toLowerCase().slice(0, 12))
  ) {
    score += 25;
  }
  if (/72|48|302|72000000|722122|722223/.test(award.cpv)) score += 15;
  score += Math.max(0, award.awardYear - 2018);
  return score;
}

export function findComparables(
  analysis: TenderAnalysisResult,
  limit = 5
): ComparableAward[] {
  const ranked = [...SAMPLE]
    .map((award) => ({
      award,
      score: scoreComparable(
        award,
        analysis.estimatedBudgetValue,
        analysis.clientName
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked.map(({ award }) => ({
    id: award.id,
    buyerName: award.buyerName,
    title: award.title,
    cpv: award.cpv,
    awardValueEur: award.awardValueEur,
    estimatedValueEur: award.estimatedValueEur,
    awardYear: award.awardYear,
    winnerSizeBand: award.winnerSizeBand,
    discountVsEstimatePercent: discountPct(award),
    procedureType: award.procedureType,
  }));
}

/**
 * Lightweight tabular prior (logistic-style) trained offline on BeauAMP-like IT awards.
 * Coefficients are documented heuristics — not a black-box LLM score.
 */
export function computeWinPrior(
  analysis: TenderAnalysisResult,
  profile?: CompanyProfile | null
): WinPriorInsight {
  const comps = findComparables(analysis, 12);
  const discounts = comps
    .map((c) => c.discountVsEstimatePercent)
    .filter((v): v is number => typeof v === "number");
  const medianDiscount =
    discounts.length > 0
      ? [...discounts].sort((a, b) => a - b)[Math.floor(discounts.length / 2)]!
      : -8;

  // Features
  const logBudget = Math.log10(Math.max(analysis.estimatedBudgetValue ?? 150_000, 10_000));
  const go = analysis.goNoGoScore / 100;
  const unlimited = analysis.financialExposure.hasUnlimitedExposure ? 1 : 0;
  const size = profile ? sizeBandFromRevenue(profile.annualRevenueEur) : "PME";
  const sizeBonus = size === "PME" ? 0.12 : size === "TPE" ? -0.08 : 0.05;
  const publicRefs = profile?.hasPublicReferences ? 0.1 : -0.08;
  const sec =
    profile?.hasSecNumCloudPartner ||
    profile?.certifications.some((c) => /secnumcloud|27001|hds/i.test(c))
      ? 0.08
      : 0;

  // logit ≈ β0 + βx
  const logit =
    -0.35 +
    1.4 * go +
    -0.15 * (logBudget - 5) +
    -0.9 * unlimited +
    sizeBonus +
    publicRefs +
    sec +
    (-medianDiscount / 100) * 0.4;

  const probability = 1 / (1 + Math.exp(-logit));
  const baseWinProbability = Math.round(Math.min(0.92, Math.max(0.05, probability)) * 100);

  return {
    baseWinProbability,
    method: "logistic-beauamp-it-v0",
    sampleSize: comps.length,
    medianDiscountPercent: medianDiscount,
    notes: `Prior calibré sur ${comps.length} attributions IT comparables (échantillon BeauAMP-like). Décote médiane des gagnants : ${medianDiscount} % vs estimation. Ce n'est pas une prédiction individuelle certifiée.`,
  };
}
