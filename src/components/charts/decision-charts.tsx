"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";
import type { DecisionInsights } from "@/types/analysis";

function useChartTokens() {
  const { theme } = useTheme();
  return useMemo(() => {
    if (typeof window === "undefined") {
      return {
        brand: theme === "light" ? "#1e3a5f" : "#6ea8d8",
        muted: theme === "light" ? "#5b6778" : "#9aa6b8",
        line: theme === "light" ? "#c5ced9" : "#343e4f",
        surface: theme === "light" ? "#f4f6f8" : "#1c222d",
        ink: theme === "light" ? "#152033" : "#e8edf4",
        accent: theme === "light" ? "#1e6b55" : "#3d9b7a",
        donut:
          theme === "light"
            ? ["#1e3a5f", "#1e6b55", "#5b6778", "#8b95a5", "#3d7ea6"]
            : ["#6ea8d8", "#3d9b7a", "#e8edf4", "#6b7789", "#9aa6b8"],
      };
    }
    const s = getComputedStyle(document.documentElement);
    const r = (n: string, f: string) => s.getPropertyValue(n).trim() || f;
    return {
      brand: r("--chart-1", "#6ea8d8"),
      muted: r("--muted", "#9aa6b8"),
      line: r("--chart-grid", "#343e4f"),
      surface: r("--chart-tooltip-bg", "#1c222d"),
      ink: r("--chart-tooltip-fg", "#e8edf4"),
      accent: r("--accent", "#3d9b7a"),
      donut: [
        r("--chart-1", "#6ea8d8"),
        r("--chart-2", "#3d9b7a"),
        r("--chart-3", "#e8edf4"),
        r("--chart-4", "#6b7789"),
        r("--chart-5", "#9aa6b8"),
      ],
    };
  }, [theme]);
}

export function DecisionCharts({ insights }: { insights: DecisionInsights }) {
  const { theme } = useTheme();
  const chart = useChartTokens();
  const radarData = insights.conformityRadar.map((p) => ({
    axis: p.axis.replace(" ", "\n"),
    fullAxis: p.axis,
    score: p.score,
  }));
  const weightData = insights.scoringWeights.map((i) => ({
    name: i.label,
    value: i.weight,
  }));
  const curveData = insights.priceWinCurve.map((p) => ({
    price: p.priceLabel,
    winProbability: p.winProbability,
    estimatedScore: p.estimatedScore,
  }));
  const tip = {
    backgroundColor: chart.surface,
    border: `1px solid ${chart.line}`,
    borderRadius: 8,
    color: chart.ink,
    fontSize: 12,
  };

  return (
    <section className="space-y-3" key={theme}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-2xs font-medium uppercase tracking-wide text-muted">
            Simulation financière
          </p>
          <h2 className="text-base font-semibold text-foreground">
            À quel prix répondre ?
          </h2>
        </div>
        <p className="text-sm text-muted">
          Fourchette recommandée{" "}
          <span className="font-medium text-foreground">
            {insights.recommendedPriceLabel}
          </span>{" "}
          · chances estimées{" "}
          <span className="font-medium text-accent">
            {insights.recommendedWinProbability}&nbsp;%
          </span>
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Adéquation au dossier</CardTitle>
            <CardDescription>
              Où vous êtes bien placés, et où le cahier des charges est exigeant
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="68%">
                <PolarGrid stroke={chart.line} />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: chart.ink, fontSize: 10, opacity: 0.75 }}
                />
                <PolarRadiusAxis
                  domain={[0, 100]}
                  tick={{ fill: chart.muted, fontSize: 9 }}
                  axisLine={false}
                />
                <Radar
                  dataKey="score"
                  stroke={chart.brand}
                  fill={chart.brand}
                  fillOpacity={0.22}
                  strokeWidth={1.75}
                />
                <Tooltip
                  contentStyle={tip}
                  formatter={(v) => [`${v}/100`, "Score"]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comment le marché sera noté</CardTitle>
            <CardDescription>
              Répartition des critères d&apos;attribution indiqués par
              l&apos;acheteur
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={weightData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="48%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={2}
                  stroke={chart.surface}
                >
                  {weightData.map((e, i) => (
                    <Cell
                      key={e.name}
                      fill={chart.donut[i % chart.donut.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tip}
                  formatter={(v) => [`${v}%`, "Poids"]}
                />
                <Legend
                  wrapperStyle={{ color: chart.ink, fontSize: 11, opacity: 0.85 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prix proposé et chances de succès</CardTitle>
          <CardDescription>{insights.winRecommendation}</CardDescription>
        </CardHeader>
        <CardContent className="h-[270px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={curveData}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke={chart.line} strokeDasharray="3 3" />
              <XAxis
                dataKey="price"
                tick={{ fill: chart.ink, fontSize: 10, opacity: 0.75 }}
                axisLine={{ stroke: chart.line }}
                tickLine={{ stroke: chart.line }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: chart.ink, fontSize: 10, opacity: 0.75 }}
                unit="%"
                axisLine={{ stroke: chart.line }}
                tickLine={{ stroke: chart.line }}
              />
              <Tooltip
                contentStyle={tip}
                formatter={(v, n) => [
                  `${v} %`,
                  n === "winProbability"
                    ? "Chances estimées"
                    : "Note estimée",
                ]}
              />
              <Legend
                wrapperStyle={{ color: chart.ink, fontSize: 11, opacity: 0.85 }}
                formatter={(v) =>
                  v === "winProbability" ? "Chances estimées" : "Note estimée"
                }
              />
              <Line
                type="monotone"
                dataKey="winProbability"
                stroke={chart.brand}
                strokeWidth={2.25}
                dot={{ r: 3, fill: chart.brand }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="estimatedScore"
                stroke={chart.accent}
                strokeWidth={1.75}
                strokeDasharray="4 4"
                dot={{ r: 2, fill: chart.accent }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </section>
  );
}
