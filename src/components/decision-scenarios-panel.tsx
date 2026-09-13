import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildDecisionScenarios,
  PROJECTED_VERDICT_LABELS,
  verdictFromScore,
  type ProjectedVerdict,
} from "@/lib/decision-scenarios";
import { cn } from "@/lib/utils";
import type { TenderAnalysisResult } from "@/types/analysis";

interface DecisionScenariosPanelProps {
  analysis: TenderAnalysisResult;
}

function verdictVariant(
  verdict: ProjectedVerdict
): "success" | "warning" | "danger" {
  if (verdict === "go") return "success";
  if (verdict === "review") return "warning";
  return "danger";
}

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

export function DecisionScenariosPanel({
  analysis,
}: DecisionScenariosPanelProps) {
  const scenarios = buildDecisionScenarios(analysis);
  const currentVerdict = verdictFromScore(analysis.goNoGoScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Qu&apos;est-ce qui ferait changer la décision ?</CardTitle>
        <CardDescription>
          Leviers concrets (HDS, SecNumCloud, ISO 27001, références, RGAA,
          mitigation de risque) et verdict projeté si le levier est actionné.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {scenarios.length === 0 && (
          <p className="rounded-md border border-line bg-background px-3 py-4 text-sm text-muted">
            Aucun levier identifié à ce stade : les écarts de conformité et les
            risques majeurs n&apos;appellent pas de scénario de bascule.
          </p>
        )}
        {scenarios.map((scenario) => {
          const flips = currentVerdict !== scenario.projectedVerdict;
          return (
            <div
              key={scenario.id}
              className={cn(
                "rounded-md border px-3 py-2.5",
                flips ? "border-accent/35 bg-accent/5" : "border-line bg-background"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {scenario.title}
                  </p>
                  <p className="text-xs leading-relaxed text-muted">
                    {scenario.description}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="default">
                    {formatDelta(scenario.scoreDelta)} pts
                  </Badge>
                  <Badge variant={verdictVariant(scenario.projectedVerdict)}>
                    {PROJECTED_VERDICT_LABELS[scenario.projectedVerdict]}
                  </Badge>
                  {flips && <Badge variant="outline">Bascule</Badge>}
                </div>
              </div>
              <p className="mt-2 text-xs text-muted">
                Score projeté{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {scenario.projectedScore}
                </span>
                /100
                {flips
                  ? ` · ${PROJECTED_VERDICT_LABELS[currentVerdict]} → ${PROJECTED_VERDICT_LABELS[scenario.projectedVerdict]}`
                  : ` · verdict inchangé (${PROJECTED_VERDICT_LABELS[currentVerdict]})`}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
