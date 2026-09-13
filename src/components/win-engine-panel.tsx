"use client";

import { useEffect, useState } from "react";
import { Loader2, Target } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";
import { trackEvent } from "@/lib/analytics";
import type {
  CompanyProfile,
  TenderAnalysisResult,
  WinSimulationResult,
} from "@/types/analysis";
import { cn } from "@/lib/utils";

interface WinEnginePanelProps {
  analysis: TenderAnalysisResult;
  profile: CompanyProfile;
  onSimulation?: (sim: WinSimulationResult) => void;
}

export function WinEnginePanel({
  analysis,
  profile,
  onSimulation,
}: WinEnginePanelProps) {
  const { theme } = useTheme();
  const [simulation, setSimulation] = useState<WinSimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis, profile }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.data) {
        throw new Error(payload.details || payload.error || "Échec simulation");
      }
      setSimulation(payload.data);
      onSimulation?.(payload.data);
      trackEvent("win_engine_run", {
        verdict: payload.data.verdict,
        win: payload.data.recommendedWinProbability,
        price: payload.data.recommendedPrice,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur simulation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis.title, profile.tjmEur, profile.targetMarginPercent, profile.updatedAt]);

  const ink = theme === "dark" ? "#e8edf4" : "#152033";
  const grid = theme === "dark" ? "#343e4f" : "#c5ced9";
  const tip = {
    backgroundColor: theme === "dark" ? "#1c222d" : "#f4f6f8",
    border: `1px solid ${grid}`,
    borderRadius: 8,
    color: ink,
    fontSize: 12,
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-accent" />
            <CardTitle>Win-Engine calibré</CardTitle>
          </div>
          <CardDescription>
            Prix × marge × chances de gain, avec votre TJM ({profile.tjmEur} €) et
            marge cible ({profile.targetMarginPercent} %).
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void runSimulation()}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Recalculer
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {simulation && (
          <>
            <div
              className={cn(
                "rounded-xl border px-4 py-3",
                simulation.verdict === "bid" &&
                  "border-success/40 bg-success/10 text-success",
                simulation.verdict === "negotiate" &&
                  "border-warning/40 bg-warning/10 text-warning",
                simulation.verdict === "pass" &&
                  "border-danger/40 bg-danger/10 text-danger"
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    simulation.verdict === "bid"
                      ? "success"
                      : simulation.verdict === "negotiate"
                        ? "warning"
                        : "critical"
                  }
                >
                  {simulation.verdictLabel}
                </Badge>
                <span className="text-sm font-semibold text-foreground">
                  {simulation.recommendedPrice.toLocaleString("fr-FR")} € · win{" "}
                  {simulation.recommendedWinProbability} %
                </span>
              </div>
              <p className="mt-2 text-sm text-foreground/90">
                {simulation.explanation}
              </p>
              <p className="mt-1 text-xs text-muted">
                Coût interne ~{simulation.estimatedInternalCost.toLocaleString("fr-FR")} € ·
                seuil rentabilité {simulation.breakEvenPrice.toLocaleString("fr-FR")} €
              </p>
            </div>

            <div className="h-[260px]" key={theme}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={simulation.curve}>
                  <CartesianGrid stroke={grid} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="priceLabel"
                    tick={{ fill: ink, fontSize: 10, opacity: 0.75 }}
                  />
                  <YAxis
                    yAxisId="win"
                    domain={[0, 100]}
                    tick={{ fill: ink, fontSize: 10, opacity: 0.75 }}
                    unit="%"
                  />
                  <YAxis
                    yAxisId="margin"
                    orientation="right"
                    tick={{ fill: ink, fontSize: 10, opacity: 0.75 }}
                    unit="%"
                  />
                  <Tooltip contentStyle={tip} />
                  <Legend wrapperStyle={{ color: ink, fontSize: 11 }} />
                  <Line
                    yAxisId="win"
                    type="monotone"
                    dataKey="winProbability"
                    name="Chances de gain"
                    stroke="#1e6b55"
                    strokeWidth={2.25}
                    dot={{ r: 3 }}
                  />
                  <Line
                    yAxisId="margin"
                    type="monotone"
                    dataKey="marginPercent"
                    name="Marge %"
                    stroke="#1e3a5f"
                    strokeWidth={1.75}
                    strokeDasharray="4 4"
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
