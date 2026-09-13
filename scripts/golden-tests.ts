/**
 * Golden tests for Win-Engine + financial exposure + win prior.
 * Run: npx tsx scripts/golden-tests.ts
 */
import assert from "node:assert/strict";
import {
  buildFinancialExposureSummary,
  enrichRiskFinancials,
  parseBudgetValue,
} from "../src/lib/financial-exposure";
import { simulateWinEngine } from "../src/lib/win-engine";
import { computeWinPrior, findComparables } from "../src/lib/win-model";
import type {
  CompanyProfile,
  RiskFactor,
  TenderAnalysisResult,
} from "../src/types/analysis";

const goProfile: CompanyProfile = {
  companyName: "Nova Digital",
  tjmEur: 650,
  targetMarginPercent: 25,
  availableDays: 140,
  annualRevenueEur: 900_000,
  certifications: ["ISO 27001", "RGAA / accessibilité"],
  hasSecNumCloudPartner: true,
  hasPublicReferences: true,
  region: "Pays de la Loire",
  updatedAt: new Date().toISOString(),
};

function baseAnalysis(
  overrides: Partial<TenderAnalysisResult> = {}
): TenderAnalysisResult {
  const risks: RiskFactor[] = [
    enrichRiskFinancials({
      id: "risk-1",
      type: "Pénalité de retard",
      description: "Retard MVP : 0,5 % du montant par semaine, plafonné à 5 %.",
      severity: "MEDIUM",
    }, 280_000),
  ];

  const analysis: TenderAnalysisResult = {
    title: "Portail usager Nantes",
    clientName: "Ville de Nantes",
    submissionDeadline: "12 septembre 2026",
    estimatedBudget: "280 000 € HT",
    estimatedBudgetValue: 280_000,
    goNoGoScore: 80,
    goNoGoReason: "Dossier jouable pour une PME IT équipée.",
    summary: "Refonte portail, SecNumCloud, RGAA.",
    requirements: [
      {
        id: "req-1",
        category: "Technique",
        description: "Hébergement SecNumCloud obligatoire.",
        isMandatory: true,
        companyGap: "ok",
      },
    ],
    riskFactors: risks,
    milestones: [],
    decisionInsights: {
      conformityRadar: [
        { axis: "Sécurité", score: 78 },
        { axis: "Capacité Technique", score: 82 },
        { axis: "Respect des Délais", score: 74 },
        { axis: "Rentabilité Financière", score: 70 },
        { axis: "Conformité Administrative", score: 80 },
      ],
      scoringWeights: [
        { label: "Technique", weight: 60 },
        { label: "Prix", weight: 40 },
      ],
      priceWinCurve: [
        {
          priceLabel: "250 000 €",
          priceValue: 250_000,
          winProbability: 70,
          estimatedScore: 72,
        },
      ],
      recommendedPriceLabel: "250 000 €",
      recommendedWinProbability: 70,
      winRecommendation: "Positionnement compétitif.",
    },
    financialExposure: buildFinancialExposureSummary(risks),
    ...overrides,
  };

  analysis.comparables = findComparables(analysis, 5);
  analysis.winPrior = computeWinPrior(analysis, goProfile);
  return analysis;
}

function testBudgetParse() {
  assert.equal(parseBudgetValue("280 000 € HT"), 280000);
  assert.equal(parseBudgetValue("1,85 M€ HT"), 1850000);
}

function testFinancialCapped() {
  const risk = enrichRiskFinancials(
    {
      id: "r1",
      type: "Pénalité de retard",
      description: "0,5 % par semaine, plafonné à 5 %.",
      severity: "MEDIUM",
    },
    280_000
  );
  assert.ok(risk.financialExposureEur !== null && risk.financialExposureEur! > 0);
  assert.notEqual(risk.exposureKind, "unlimited");
}

function testFinancialUnlimited() {
  const risk = enrichRiskFinancials({
    id: "r2",
    type: "Clause juridique",
    description: "Responsabilité illimitée sur dommages environnementaux.",
    severity: "CRITICAL",
  });
  assert.equal(risk.exposureKind, "unlimited");
}

function testGoSimulation() {
  const analysis = baseAnalysis();
  const sim = simulateWinEngine(analysis, goProfile);
  assert.ok(sim.curve.length >= 4);
  assert.ok(sim.recommendedPrice > 0);
  assert.ok(["bid", "negotiate", "pass"].includes(sim.verdict));
  assert.ok(sim.recommendedWinProbability >= 1);
  // Healthy IT AO with SecNumCloud covered should not force pass
  assert.notEqual(sim.verdict, "pass");
}

function testNoGoSimulation() {
  const risks: RiskFactor[] = [
    enrichRiskFinancials({
      id: "r1",
      type: "Pénalité de retard",
      description: "25 000 € HT / jour calendaire, sans plafond.",
      severity: "CRITICAL",
    }),
    enrichRiskFinancials({
      id: "r2",
      type: "Exigence éliminatoire",
      description: "Caution bancaire 10 % — éliminatoire.",
      severity: "CRITICAL",
    }),
  ];
  const analysis = baseAnalysis({
    title: "Seveso industriel",
    clientName: "Atlantique Énergie",
    estimatedBudget: "1,85 M€ HT",
    estimatedBudgetValue: 1_850_000,
    goNoGoScore: 22,
    riskFactors: risks,
    financialExposure: buildFinancialExposureSummary(risks),
    requirements: [
      {
        id: "req-1",
        category: "Administratif",
        description: "CA annuel ≥ 8 M€.",
        isMandatory: true,
        companyGap: "missing",
      },
    ],
  });
  analysis.winPrior = computeWinPrior(analysis, goProfile);
  const sim = simulateWinEngine(analysis, goProfile);
  assert.equal(sim.verdict, "pass");
  assert.equal(analysis.financialExposure.hasUnlimitedExposure, true);
}

function testComparables() {
  const analysis = baseAnalysis();
  const comps = findComparables(analysis, 5);
  assert.ok(comps.length > 0);
  assert.ok(comps.some((c) => /Nantes/i.test(c.buyerName)));
}

function main() {
  testBudgetParse();
  testFinancialCapped();
  testFinancialUnlimited();
  testGoSimulation();
  testNoGoSimulation();
  testComparables();
  console.log("OK — golden tests passed");
}

main();
