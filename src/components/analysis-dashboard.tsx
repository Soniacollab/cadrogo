"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Calendar,
  Download,
  FileText,
  Landmark,
  ShieldAlert,
} from "lucide-react";
import { BidOutcomeForm } from "@/components/bid-outcome-form";
import { DecisionCharts } from "@/components/charts/decision-charts";
import { ComplianceMatrix } from "@/components/compliance-matrix";
import { DecisionScenariosPanel } from "@/components/decision-scenarios-panel";
import { WinEnginePanel } from "@/components/win-engine-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trackEvent } from "@/lib/analytics";
import { readCompanyProfile } from "@/lib/company-profile";
import { openDecisionNotePrint } from "@/lib/decision-note-export";
import {
  buildVerdictReasons,
  PROJECTED_VERDICT_LABELS,
  verdictFromScore,
  type ProjectedVerdict,
} from "@/lib/decision-scenarios";
import { exportAnalysisToExcel } from "@/lib/excel-export";
import { cn } from "@/lib/utils";
import type {
  CompanyProfile,
  RequirementCategory,
  RiskSeverity,
  TenderAnalysisResult,
  WinSimulationResult,
} from "@/types/analysis";

interface AnalysisDashboardProps {
  data: TenderAnalysisResult;
  profile?: CompanyProfile;
  isDemo?: boolean;
}

type RequirementFilter = "all" | "mandatory" | "optional" | RequirementCategory;

function verdictTone(verdict: ProjectedVerdict): "go" | "caution" | "nogo" {
  if (verdict === "go") return "go";
  if (verdict === "review") return "caution";
  return "nogo";
}

function severityLabel(severity: RiskSeverity): string {
  switch (severity) {
    case "CRITICAL":
      return "Critique";
    case "HIGH":
      return "Élevé";
    case "MEDIUM":
      return "Modéré";
    case "LOW":
    default:
      return "Faible";
  }
}

function severityBadgeVariant(
  severity: RiskSeverity
): "critical" | "danger" | "warning" | "secondary" {
  switch (severity) {
    case "CRITICAL":
      return "critical";
    case "HIGH":
      return "danger";
    case "MEDIUM":
      return "warning";
    default:
      return "secondary";
  }
}

const SEVERITY_ORDER: Record<RiskSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

function isFinancialPenalty(type: string, description: string): boolean {
  const hay = `${type} ${description}`.toLowerCase();
  return (
    type === "Pénalité de retard" ||
    hay.includes("pénalité") ||
    hay.includes("penalit") ||
    hay.includes("€") ||
    hay.includes("euro") ||
    hay.includes("amende") ||
    hay.includes("retenue")
  );
}

function isLegalClause(type: string): boolean {
  return type === "Clause juridique" || type === "Exigence éliminatoire";
}

export function AnalysisDashboard({
  data,
  profile: profileProp,
  isDemo = false,
}: AnalysisDashboardProps) {
  const [requirementFilter, setRequirementFilter] =
    useState<RequirementFilter>("all");
  const [profile, setProfile] = useState<CompanyProfile>(
    profileProp ?? readCompanyProfile()
  );
  const [simulation, setSimulation] = useState<WinSimulationResult | null>(null);
  const projectedVerdict = verdictFromScore(data.goNoGoScore);
  const tone = verdictTone(projectedVerdict);
  const verdictReasons = useMemo(() => buildVerdictReasons(data, 3), [data]);

  useEffect(() => {
    if (profileProp) setProfile(profileProp);
  }, [profileProp]);

  useEffect(() => {
    trackEvent("analysis_viewed", {
      score: data.goNoGoScore,
      risks: data.riskFactors.length,
      exposure: data.financialExposure.maxExposureEur,
    });
  }, [data]);

  const filteredRequirements = useMemo(() => {
    return data.requirements.filter((requirement) => {
      if (requirementFilter === "all") return true;
      if (requirementFilter === "mandatory") return requirement.isMandatory;
      if (requirementFilter === "optional") return !requirement.isMandatory;
      return requirement.category === requirementFilter;
    });
  }, [data.requirements, requirementFilter]);

  const sortedRisks = useMemo(
    () =>
      [...data.riskFactors].sort(
        (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
      ),
    [data.riskFactors]
  );

  const riskStats = useMemo(() => {
    const critical = data.riskFactors.filter((r) => r.severity === "CRITICAL").length;
    const high = data.riskFactors.filter((r) => r.severity === "HIGH").length;
    const penalties = data.riskFactors.filter((r) =>
      isFinancialPenalty(r.type, r.description)
    ).length;
    return { critical, high, penalties, total: data.riskFactors.length };
  }, [data.riskFactors]);

  return (
    <div className="space-y-3 animate-fade-in">
      {isDemo && (
        <div className="rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-foreground">
          Exemple — ESN IT type (ISO 27001, sans HDS ni SecNumCloud) face à un
          AO CHU Nantes. Aucune clé API n&apos;a été utilisée.
        </div>
      )}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">IT · marchés publics</Badge>
            {isDemo && <Badge variant="outline">Exemple</Badge>}
          </div>
          <CardTitle className="text-lg sm:text-xl">{data.title}</CardTitle>
          <CardDescription className="max-w-2xl">{data.summary}</CardDescription>
          <div
            className={cn(
              "rounded-lg border-2 px-3 py-3 sm:px-4 sm:py-4",
              tone === "go" && "border-success/50 bg-success/10 text-success",
              tone === "caution" && "border-warning/50 bg-warning/10 text-warning",
              tone === "nogo" && "border-danger/50 bg-danger/10 text-danger"
            )}
          >
            <p className="text-2xs font-semibold uppercase tracking-wide opacity-80">
              Go/No-Go personnalisé pour votre ESN
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-3xl font-bold tracking-tight sm:text-4xl">
                {PROJECTED_VERDICT_LABELS[projectedVerdict]}
              </p>
              <p className="text-xl font-semibold tabular-nums sm:text-2xl">
                {data.goNoGoScore}
                <span className="text-sm font-normal opacity-60">/100</span>
              </p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              {data.goNoGoReason}
            </p>
            {verdictReasons.length > 0 && (
              <ol className="mt-3 space-y-1.5 text-sm text-foreground">
                {verdictReasons.map((reason, index) => (
                  <li key={reason} className="flex gap-2">
                    <span className="font-semibold tabular-nums opacity-70">
                      {index + 1}.
                    </span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div
            className={cn(
              "rounded-md border px-3 py-2.5 text-sm",
              data.financialExposure.hasUnlimitedExposure
                ? "border-danger/40 bg-danger/10 text-danger"
                : "border-warning/30 bg-warning/10 text-warning"
            )}
          >
            <p className="text-2xs font-medium uppercase tracking-wide opacity-70">
              Exposition €
            </p>
            <p className="mt-1 font-semibold">
              {data.financialExposure.hasUnlimitedExposure
                ? "Illimitée"
                : data.financialExposure.maxExposureEur != null
                  ? `~ ${data.financialExposure.maxExposureEur.toLocaleString("fr-FR")} €`
                  : "Non chiffrée"}
            </p>
            <p className="mt-1 text-xs opacity-90">
              {data.financialExposure.summary}
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          <MetaItem icon={<Landmark className="h-3 w-3" />} label="Maître d'ouvrage" value={data.clientName} />
          <MetaItem icon={<Calendar className="h-3 w-3" />} label="Date limite de remise" value={data.submissionDeadline} />
          <MetaItem icon={<ShieldAlert className="h-3 w-3" />} label="Budget annoncé" value={data.estimatedBudget} />
        </CardContent>
      </Card>

      {data.winPrior && (
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Prior marchés publics (BeauAMP IT)</CardTitle>
            <CardDescription>{data.winPrior.notes}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 text-sm">
            <Badge variant="default">
              Win prior {data.winPrior.baseWinProbability} %
            </Badge>
            <Badge variant="secondary">
              n={data.winPrior.sampleSize} comparables
            </Badge>
            {data.winPrior.medianDiscountPercent != null && (
              <Badge variant="warning">
                Décote médiane gagnants {data.winPrior.medianDiscountPercent} %
              </Badge>
            )}
            <span className="text-xs text-muted">{data.winPrior.method}</span>
          </CardContent>
        </Card>
      )}

      <WinEnginePanel
        analysis={data}
        profile={profile}
        onSimulation={setSimulation}
      />

      <DecisionCharts insights={data.decisionInsights} />

      {data.comparables && data.comparables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Marchés comparables</CardTitle>
            <CardDescription>
              Attributions IT proches (échantillon BeauAMP-like) pour ancrer le prix.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border border-line">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-surface-muted text-2xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Acheteur</th>
                    <th className="px-3 py-2 font-medium">Objet</th>
                    <th className="px-3 py-2 font-medium">Année</th>
                    <th className="px-3 py-2 font-medium">Attribué</th>
                    <th className="px-3 py-2 font-medium">vs est.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.comparables.map((c) => (
                    <tr key={c.id} className="border-t border-line">
                      <td className="px-3 py-2.5">{c.buyerName}</td>
                      <td className="px-3 py-2.5">{c.title}</td>
                      <td className="px-3 py-2.5">{c.awardYear}</td>
                      <td className="px-3 py-2.5">
                        {c.awardValueEur.toLocaleString("fr-FR")} €
                      </td>
                      <td className="px-3 py-2.5">
                        {c.discountVsEstimatePercent != null
                          ? `${c.discountVsEstimatePercent} %`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <ComplianceMatrix analysis={data} />
      <DecisionScenariosPanel analysis={data} />

      <Tabs defaultValue="risks">
        <TabsList>
          <TabsTrigger value="requirements">Ce qu&apos;il faut fournir</TabsTrigger>
          <TabsTrigger value="risks" className="gap-1.5">
            Points de vigilance
            {riskStats.critical + riskStats.high > 0 && (
              <span className="rounded bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">
                {riskStats.critical + riskStats.high}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="milestones">Calendrier</TabsTrigger>
        </TabsList>

        <TabsContent value="requirements">
          <Card>
            <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Exigences du marché</CardTitle>
                <CardDescription>
                  {filteredRequirements.length} point
                  {filteredRequirements.length > 1 ? "s" : ""} · gap-check vs profil
                </CardDescription>
              </div>
              <Select
                value={requirementFilter}
                onChange={(e) =>
                  setRequirementFilter(e.target.value as RequirementFilter)
                }
                className="sm:max-w-[200px]"
              >
                <option value="all">Tout afficher</option>
                <option value="mandatory">Obligatoires seulement</option>
                <option value="optional">Optionnelles seulement</option>
                <option value="Technique">Technique</option>
                <option value="Administratif">Administratif</option>
                <option value="Financier">Financier</option>
                <option value="Juridique">Juridique</option>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border border-line">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-surface-muted text-2xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">Catégorie</th>
                      <th className="px-3 py-2 font-medium">Description</th>
                      <th className="px-3 py-2 font-medium">Source</th>
                      <th className="px-3 py-2 font-medium">Statut</th>
                      <th className="px-3 py-2 font-medium">Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequirements.map((req) => (
                      <tr key={req.id} className="border-t border-line align-top">
                        <td className="px-3 py-2.5">
                          <Badge variant="outline">{req.category}</Badge>
                        </td>
                        <td className="px-3 py-2.5">{req.description}</td>
                        <td className="px-3 py-2.5 text-xs text-muted">
                          {req.citation?.page != null ? (
                            <button
                              type="button"
                              className="text-accent underline-offset-2 hover:underline"
                              onClick={() =>
                                trackEvent("citation_click", {
                                  type: "requirement",
                                  page: req.citation?.page,
                                })
                              }
                            >
                              p.{req.citation.page}
                            </button>
                          ) : (
                            "—"
                          )}
                          {req.citation?.excerpt ? (
                            <p className="mt-1 line-clamp-2 italic">
                              “{req.citation.excerpt}”
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={req.isMandatory ? "danger" : "secondary"}>
                            {req.isMandatory ? "Obligatoire" : "Optionnel"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge
                            variant={
                              req.companyGap === "missing"
                                ? "critical"
                                : req.companyGap === "ok"
                                  ? "success"
                                  : "secondary"
                            }
                          >
                            {req.companyGap === "missing"
                              ? "Manquant"
                              : req.companyGap === "ok"
                                ? "OK"
                                : "À vérifier"}
                          </Badge>
                          {req.gapReason ? (
                            <p className="mt-1 text-xs text-muted">{req.gapReason}</p>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                    {filteredRequirements.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-muted">
                          Aucune exigence pour ce filtre.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-danger/25 bg-danger/5 px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-danger" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">
                  {riskStats.total} point{riskStats.total > 1 ? "s" : ""} à surveiller
                </span>
                {riskStats.critical > 0 && (
                  <>
                    {" "}
                    ·{" "}
                    <span className="font-semibold text-danger">
                      {riskStats.critical} critique
                      {riskStats.critical > 1 ? "s" : ""}
                    </span>
                  </>
                )}
                {riskStats.high > 0 && (
                  <>
                    {" "}
                    ·{" "}
                    <span className="font-semibold text-danger">
                      {riskStats.high} élevé
                      {riskStats.high > 1 ? "s" : ""}
                    </span>
                  </>
                )}
                {riskStats.penalties > 0 && (
                  <>
                    {" "}
                    ·{" "}
                    <span className="font-semibold text-warning">
                      {riskStats.penalties} pénalité
                      {riskStats.penalties > 1 ? "s" : ""} / impact financier
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="grid gap-2.5 md:grid-cols-2">
              {sortedRisks.map((risk) => {
                const critical =
                  risk.severity === "CRITICAL" || risk.severity === "HIGH";
                const financial = isFinancialPenalty(risk.type, risk.description);
                const legal = isLegalClause(risk.type);

                return (
                  <Card
                    key={risk.id}
                    className={cn(
                      "overflow-hidden",
                      risk.severity === "CRITICAL" &&
                        "border-danger/60 bg-danger/[0.06] shadow-[inset_3px_0_0_0_var(--danger)]",
                      risk.severity === "HIGH" &&
                        "border-danger/40 bg-danger/[0.04] shadow-[inset_3px_0_0_0_var(--danger)]",
                      risk.severity === "MEDIUM" &&
                        "border-warning/45 bg-warning/[0.05] shadow-[inset_3px_0_0_0_var(--warning)]"
                    )}
                  >
                    <CardHeader className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          {(critical || financial) && (
                            <AlertTriangle
                              className={cn(
                                "h-4 w-4 shrink-0",
                                critical ? "text-danger" : "text-warning"
                              )}
                            />
                          )}
                          <CardTitle className="text-sm leading-snug">
                            {risk.type}
                          </CardTitle>
                        </div>
                        <Badge variant={severityBadgeVariant(risk.severity)}>
                          {severityLabel(risk.severity)}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {financial && (
                          <Badge variant="warning">Pénalité financière</Badge>
                        )}
                        {legal && !financial && (
                          <Badge variant="danger">Clause à risque</Badge>
                        )}
                        {risk.type === "Exigence éliminatoire" && (
                          <Badge variant="critical">Éliminatoire</Badge>
                        )}
                        {risk.exposureKind === "unlimited" && (
                          <Badge variant="critical">Illimité</Badge>
                        )}
                        {risk.exposureLabel && risk.exposureKind !== "none" && (
                          <Badge variant="warning">{risk.exposureLabel}</Badge>
                        )}
                      </div>

                      <CardDescription
                        className={cn(
                          "text-sm leading-relaxed",
                          critical && "text-foreground/90"
                        )}
                      >
                        {risk.description}
                      </CardDescription>

                      {risk.citation && (
                        <p className="text-xs text-muted">
                          {risk.citation.page != null ? (
                            <button
                              type="button"
                              className="font-medium text-accent underline-offset-2 hover:underline"
                              onClick={() =>
                                trackEvent("citation_click", {
                                  type: "risk",
                                  page: risk.citation?.page,
                                })
                              }
                            >
                              Source p.{risk.citation.page}
                            </button>
                          ) : (
                            "Source"
                          )}
                          {risk.citation.excerpt
                            ? ` — “${risk.citation.excerpt}”`
                            : ""}
                        </p>
                      )}
                    </CardHeader>
                  </Card>
                );
              })}
              {sortedRisks.length === 0 && (
                <Card className="md:col-span-2">
                  <CardContent className="py-6 text-center text-sm text-muted">
                    Aucun point de vigilance particulier n&apos;a été relevé dans
                    ce document.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="milestones">
          <Card>
            <CardHeader>
              <CardTitle>Calendrier du marché</CardTitle>
              <CardDescription>
                Étapes et délais mentionnés dans le dossier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 border-l border-line pl-4">
                {data.milestones.map((m, i) => (
                  <li key={m.id} className="relative">
                    <span className="absolute -left-[1.35rem] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-line bg-surface text-2xs text-muted">
                      {i + 1}
                    </span>
                    <p className="text-sm font-medium text-foreground">{m.phase}</p>
                    <p className="text-xs text-muted">{m.deadlineOrDuration}</p>
                  </li>
                ))}
                {data.milestones.length === 0 && (
                  <li className="text-sm text-muted">
                    Aucune date ou étape n&apos;a été trouvée dans le PDF.
                  </li>
                )}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <BidOutcomeForm analysis={data} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3 shadow-panel">
        <p className="text-sm text-muted">
          Exportez la note de décision DG (PDF via impression) ou le fichier Excel.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              openDecisionNotePrint(data, simulation);
              trackEvent("decision_note_export", { title: data.title });
            }}
          >
            <FileText className="h-3.5 w-3.5" />
            Note de décision DG
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              exportAnalysisToExcel(data);
              trackEvent("excel_export", { title: data.title });
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Excel
          </Button>
        </div>
      </div>
    </div>
  );
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-line bg-background px-3 py-2">
      <div className="mb-0.5 flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-muted">
        {icon}
        {label}
      </div>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}
