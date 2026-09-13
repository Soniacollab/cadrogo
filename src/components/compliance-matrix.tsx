import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildComplianceRows,
  complianceSummary,
  type ComplianceStatus,
} from "@/lib/decision-scenarios";
import type { TenderAnalysisResult } from "@/types/analysis";

interface ComplianceMatrixProps {
  analysis: TenderAnalysisResult;
}

function statusLabel(status: ComplianceStatus): string {
  if (status === "ok") return "OK";
  if (status === "missing") return "Manquant";
  return "À vérifier";
}

function statusVariant(
  status: ComplianceStatus
): "success" | "critical" | "secondary" {
  if (status === "ok") return "success";
  if (status === "missing") return "critical";
  return "secondary";
}

export function ComplianceMatrix({ analysis }: ComplianceMatrixProps) {
  const rows = buildComplianceRows(analysis);
  const summary = complianceSummary(rows);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matrice de conformité</CardTitle>
        <CardDescription>
          {summary.total} exigence{summary.total > 1 ? "s" : ""}
          {summary.missing > 0
            ? ` · ${summary.missing} manquante${summary.missing > 1 ? "s" : ""}`
            : ""}
          {summary.unknown > 0
            ? ` · ${summary.unknown} à vérifier`
            : ""}
          {summary.mandatoryMissing > 0
            ? ` · ${summary.mandatoryMissing} obligatoire${summary.mandatoryMissing > 1 ? "s" : ""} non couverte${summary.mandatoryMissing > 1 ? "s" : ""}`
            : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-2xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Exigence</th>
                <th className="px-3 py-2 font-medium">Obligatoire</th>
                <th className="px-3 py-2 font-medium">Notre entreprise</th>
                <th className="px-3 py-2 font-medium">Détail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-line align-top">
                  <td className="px-3 py-2.5">{row.requirement}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant={row.isMandatory ? "danger" : "secondary"}>
                      {row.isMandatory ? "Oui" : "Non"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant={statusVariant(row.companyStatus)}>
                      {statusLabel(row.companyStatus)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted">
                    {row.detail}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted">
                    Aucune exigence extraite pour cette analyse.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
