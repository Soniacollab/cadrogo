import {
  buildFinancialExposureSummary,
  enrichRiskFinancials,
} from "@/lib/financial-exposure";
import { computeWinPrior, findComparables } from "@/lib/win-model";
import type { CompanyProfile, TenderAnalysisResult } from "@/types/analysis";

/** ESN IT type : ISO 27001 + refs publiques, sans HDS ni SecNumCloud. */
export const DEMO_ESN_PROFILE: CompanyProfile = {
  companyName: "Nova Digital (exemple)",
  tjmEur: 650,
  targetMarginPercent: 25,
  availableDays: 120,
  annualRevenueEur: 800_000,
  certifications: ["ISO 27001"],
  hasSecNumCloudPartner: false,
  hasPublicReferences: true,
  region: "Pays de la Loire",
  updatedAt: new Date(0).toISOString(),
};

/**
 * AO type CHU Nantes — gaps réalistes pour une ESN IT non équipée santé.
 * Score 56 = À VÉRIFIER ; HDS / SecNumCloud font basculer en GO.
 */
export function buildDemoAnalysis(): TenderAnalysisResult {
  const budget = 280_000;
  const risks = [
    enrichRiskFinancials({
      id: "demo-risk-hds",
      type: "Exigence éliminatoire",
      description:
        "Hébergement HDS obligatoire — offre irrecevable sans qualification ou partenaire.",
      severity: "CRITICAL",
      citation: {
        page: 18,
        excerpt: "L'hébergeur devra être certifié HDS pour les données de santé.",
      },
    }),
    enrichRiskFinancials(
      {
        id: "demo-risk-penalty",
        type: "Pénalité de retard",
        description:
          "Retard de livraison : 0,5 % du montant HT par semaine, plafonné à 5 %.",
        severity: "MEDIUM",
        citation: {
          page: 41,
          excerpt: "Pénalités de 0,5 % par semaine, plafonnées à 5 %.",
        },
      },
      budget
    ),
    enrichRiskFinancials({
      id: "demo-risk-onsite",
      type: "Clause juridique",
      description:
        "Présence sur site 2 jours / semaine à Nantes pendant le déploiement.",
      severity: "HIGH",
    }),
  ];

  const analysis: TenderAnalysisResult = {
    title: "Refonte du portail patient et téléservices",
    clientName: "CHU de Nantes",
    submissionDeadline: "8 octobre 2026",
    estimatedBudget: "280 000 € HT",
    estimatedBudgetValue: budget,
    goNoGoScore: 56,
    goNoGoReason:
      "Fit technique correct (Java / React) mais HDS et SecNumCloud manquants rendent la réponse risquée pour une ESN non équipée santé.",
    summary:
      "Marché de services informatiques : portail usager, hébergement de données de santé, accessibilité RGAA et infogérance 36 mois.",
    requirements: [
      {
        id: "demo-req-hds",
        category: "Technique",
        description: "Hébergement HDS obligatoire pour les données de santé.",
        isMandatory: true,
        companyGap: "missing",
        gapReason: "HDS exigé — non couvert dans le profil.",
        citation: {
          page: 18,
          excerpt: "L'hébergeur devra être certifié HDS.",
        },
      },
      {
        id: "demo-req-snc",
        category: "Technique",
        description: "Hébergement SecNumCloud obligatoire.",
        isMandatory: true,
        companyGap: "missing",
        gapReason: "SecNumCloud exigé — non déclaré dans le profil.",
        citation: {
          page: 19,
          excerpt: "L'infrastructure sera qualifiée SecNumCloud.",
        },
      },
      {
        id: "demo-req-iso",
        category: "Administratif",
        description: "Certification ISO 27001 en cours de validité.",
        isMandatory: true,
        companyGap: "ok",
        gapReason: "ISO 27001 présente.",
      },
      {
        id: "demo-req-refs",
        category: "Administratif",
        description:
          "3 références secteur public comparables (collectivité ou établissement de santé).",
        isMandatory: true,
        companyGap: "missing",
        gapReason: "Références santé / hôpital absentes du profil.",
      },
      {
        id: "demo-req-rgaa",
        category: "Technique",
        description: "Conformité RGAA du portail usager.",
        isMandatory: false,
        companyGap: "missing",
        gapReason: "RGAA / accessibilité non déclarée.",
      },
      {
        id: "demo-req-stack",
        category: "Technique",
        description: "Stack Java / Spring et React pour le portail.",
        isMandatory: true,
        companyGap: "ok",
        gapReason: "Couverture a priori OK au regard du profil.",
      },
    ],
    riskFactors: risks,
    milestones: [
      {
        id: "demo-ms-1",
        phase: "Remise des offres",
        deadlineOrDuration: "8 octobre 2026, 12h00",
      },
      {
        id: "demo-ms-2",
        phase: "MVP portail patient",
        deadlineOrDuration: "6 mois après notification",
      },
      {
        id: "demo-ms-3",
        phase: "Infogérance",
        deadlineOrDuration: "36 mois",
      },
    ],
    decisionInsights: {
      conformityRadar: [
        { axis: "Sécurité", score: 46 },
        { axis: "Capacité Technique", score: 82 },
        { axis: "Respect des Délais", score: 70 },
        { axis: "Rentabilité Financière", score: 68 },
        { axis: "Conformité Administrative", score: 52 },
      ],
      scoringWeights: [
        { label: "Technique", weight: 55 },
        { label: "Prix", weight: 30 },
        { label: "Références", weight: 15 },
      ],
      priceWinCurve: [
        {
          priceLabel: "250 000 €",
          priceValue: 250_000,
          winProbability: 58,
          estimatedScore: 62,
        },
        {
          priceLabel: "265 000 €",
          priceValue: 265_000,
          winProbability: 52,
          estimatedScore: 64,
        },
        {
          priceLabel: "280 000 €",
          priceValue: 280_000,
          winProbability: 44,
          estimatedScore: 66,
        },
      ],
      recommendedPriceLabel: "250 000 €",
      recommendedWinProbability: 58,
      winRecommendation:
        "Positionnement compétitif sous le budget, à condition de lever HDS / SecNumCloud.",
    },
    financialExposure: buildFinancialExposureSummary(risks),
  };

  analysis.comparables = findComparables(analysis, 5);
  analysis.winPrior = computeWinPrior(analysis, DEMO_ESN_PROFILE);
  return analysis;
}
