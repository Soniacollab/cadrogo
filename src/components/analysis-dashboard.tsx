"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Calendar,
  Download,
  Landmark,
  ShieldAlert,
} from "lucide-react";
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
import { exportAnalysisToExcel } from "@/lib/excel-export";
import { cn } from "@/lib/utils";
import type {
  RequirementCategory,
  RiskSeverity,
  TenderAnalysisResult,
} from "@/types/analysis";

interface AnalysisDashboardProps {
  data: TenderAnalysisResult;
}

type RequirementFilter = "all" | "mandatory" | "optional" | RequirementCategory;

function scorePresentation(score: number): {
  label: string;
  description: string;
  tone: "go" | "caution" | "nogo";
} {
  if (score >= 75) {
    return {
      label: "Go",
      description: "Excellente opportunité",
      tone: "go",
    };
  }
  if (score >= 50) {
    return {
      label: "Prudence",
      description: "Exigences élevées",
      tone: "caution",
    };
  }
  return {
    label: "No-Go",
    description: "Risques majeurs ou critères éliminatoires",
    tone: "nogo",
  };
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
    case "LOW":
    default:
      return "secondary";
  }
}

export function AnalysisDashboard({ data }: AnalysisDashboardProps) {
  const [requirementFilter, setRequirementFilter] =
    useState<RequirementFilter>("all");
  const verdict = scorePresentation(data.goNoGoScore);

  const filteredRequirements = useMemo(() => {
    return data.requirements.filter((requirement) => {
      if (requirementFilter === "all") {
        return true;
      }
      if (requirementFilter === "mandatory") {
        return requirement.isMandatory;
      }
      if (requirementFilter === "optional") {
        return !requirement.isMandatory;
      }
      return requirement.category === requirementFilter;
    });
  }, [data.requirements, requirementFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="overflow-hidden border-slate-200/80">
        <div className="h-1.5 w-full bg-gradient-to-r from-slate-900 via-teal-600 to-cyan-400" />
        <CardHeader className="gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <Badge variant="secondary">Synthèse du marché</Badge>
            <CardTitle className="font-display text-2xl leading-tight sm:text-3xl">
              {data.title}
            </CardTitle>
            <CardDescription className="text-base text-slate-600">
              {data.summary}
            </CardDescription>
          </div>
          <div
            className={cn(
              "min-w-[220px] rounded-2xl border p-4 shadow-sm",
              verdict.tone === "go" &&
                "border-emerald-200 bg-emerald-50 text-emerald-900",
              verdict.tone === "caution" &&
                "border-amber-200 bg-amber-50 text-amber-900",
              verdict.tone === "nogo" &&
                "border-rose-200 bg-rose-50 text-rose-900"
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
              Score Go / No-Go
            </p>
            <p className="mt-1 font-display text-4xl font-bold tabular-nums">
              {data.goNoGoScore}
              <span className="text-lg font-semibold opacity-60">/100</span>
            </p>
            <p className="mt-2 text-sm font-semibold">
              {verdict.label} : {verdict.description}
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <MetaItem
            icon={<Landmark className="h-4 w-4" />}
            label="Client"
            value={data.clientName}
          />
          <MetaItem
            icon={<Calendar className="h-4 w-4" />}
            label="Date limite"
            value={data.submissionDeadline}
          />
          <MetaItem
            icon={<ShieldAlert className="h-4 w-4" />}
            label="Budget estimé"
            value={data.estimatedBudget}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Justification du score</CardTitle>
          <CardDescription>{data.goNoGoReason}</CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="requirements">
        <TabsList>
          <TabsTrigger value="requirements">Exigences</TabsTrigger>
          <TabsTrigger value="risks">Risques</TabsTrigger>
          <TabsTrigger value="milestones">Jalons</TabsTrigger>
        </TabsList>

        <TabsContent value="requirements">
          <Card>
            <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Exigences & conformité</CardTitle>
                <CardDescription>
                  {filteredRequirements.length} exigence
                  {filteredRequirements.length > 1 ? "s" : ""} affichée
                  {filteredRequirements.length > 1 ? "s" : ""}
                </CardDescription>
              </div>
              <Select
                value={requirementFilter}
                onChange={(event) =>
                  setRequirementFilter(event.target.value as RequirementFilter)
                }
                className="sm:max-w-xs"
                aria-label="Filtrer les exigences"
              >
                <option value="all">Toutes</option>
                <option value="mandatory">Obligatoires</option>
                <option value="optional">Optionnelles</option>
                <option value="Technique">Technique</option>
                <option value="Administratif">Administratif</option>
                <option value="Financier">Financier</option>
                <option value="Juridique">Juridique</option>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Catégorie</th>
                      <th className="px-4 py-3 font-semibold">Description</th>
                      <th className="px-4 py-3 font-semibold">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequirements.map((requirement) => (
                      <tr
                        key={requirement.id}
                        className="border-t border-slate-100 align-top"
                      >
                        <td className="px-4 py-3">
                          <Badge variant="outline">{requirement.category}</Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {requirement.description}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              requirement.isMandatory ? "danger" : "secondary"
                            }
                          >
                            {requirement.isMandatory
                              ? "Obligatoire"
                              : "Optionnel"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {filteredRequirements.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-8 text-center text-slate-500"
                        >
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
          <div className="grid gap-4 md:grid-cols-2">
            {data.riskFactors.map((risk) => {
              const isCritical =
                risk.severity === "CRITICAL" || risk.severity === "HIGH";
              return (
                <Card
                  key={risk.id}
                  className={cn(
                    isCritical && "border-rose-200 bg-rose-50/40"
                  )}
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {isCritical && (
                          <AlertTriangle className="h-4 w-4 text-rose-600" />
                        )}
                        <CardTitle className="text-base">{risk.type}</CardTitle>
                      </div>
                      <Badge variant={severityBadgeVariant(risk.severity)}>
                        {risk.severity}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm leading-relaxed text-slate-700">
                      {risk.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
            {data.riskFactors.length === 0 && (
              <Card className="md:col-span-2">
                <CardContent className="py-10 text-center text-slate-500">
                  Aucun risque identifié dans le document.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="milestones">
          <Card>
            <CardHeader>
              <CardTitle>Feuille de route du projet</CardTitle>
              <CardDescription>
                Jalons et délais extraits du cahier des charges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-0 border-l border-teal-200 pl-6">
                {data.milestones.map((milestone, index) => (
                  <li key={milestone.id} className="relative pb-8 last:pb-0">
                    <span className="absolute -left-[1.95rem] flex h-7 w-7 items-center justify-center rounded-full border-2 border-teal-500 bg-white text-xs font-bold text-teal-700">
                      {index + 1}
                    </span>
                    <p className="font-semibold text-slate-900">
                      {milestone.phase}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {milestone.deadlineOrDuration}
                    </p>
                  </li>
                ))}
                {data.milestones.length === 0 && (
                  <li className="text-sm text-slate-500">
                    Aucun jalon détecté dans le document.
                  </li>
                )}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">
          Exportez la synthèse, les exigences et la matrice de risques en Excel.
        </p>
        <Button
          variant="secondary"
          onClick={() => exportAnalysisToExcel(data)}
        >
          <Download className="h-4 w-4" />
          Exporter en Excel (.xlsx)
        </Button>
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
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
