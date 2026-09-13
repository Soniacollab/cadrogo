"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { AnalysisDashboard } from "@/components/analysis-dashboard";
import { PdfUploader } from "@/components/pdf-uploader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type {
  AnalysisAppState,
  AnalyzeApiError,
  AnalyzeApiSuccess,
  TenderAnalysisResult,
} from "@/types/analysis";

const ANALYSIS_STEPS = [
  "Extraction du texte PDF…",
  "Identification des exigences critiques…",
  "Cartographie des risques juridiques…",
  "Calcul du score Go / No-Go…",
  "Structuration de la feuille de route…",
] as const;

export default function HomePage() {
  const [appState, setAppState] = useState<AnalysisAppState>("idle");
  const [analysis, setAnalysis] = useState<TenderAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (appState !== "analyzing") {
      return;
    }
    setStepIndex(0);
    const timer = window.setInterval(() => {
      setStepIndex((current) =>
        current < ANALYSIS_STEPS.length - 1 ? current + 1 : current
      );
    }, 2200);
    return () => window.clearInterval(timer);
  }, [appState]);

  const progressValue = useMemo(() => {
    if (appState !== "analyzing") {
      return 0;
    }
    return Math.min(95, ((stepIndex + 1) / ANALYSIS_STEPS.length) * 100);
  }, [appState, stepIndex]);

  const handleAnalyze = async (file: File) => {
    setAppState("analyzing");
    setErrorMessage(null);
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as
        | AnalyzeApiSuccess
        | AnalyzeApiError;

      if (!response.ok || !("data" in payload)) {
        const errorPayload = payload as AnalyzeApiError;
        throw new Error(
          errorPayload.details
            ? `${errorPayload.error} — ${errorPayload.details}`
            : errorPayload.error || "Échec de l'analyse"
        );
      }

      setAnalysis(payload.data);
      setAppState("result");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Une erreur inattendue est survenue.";
      setErrorMessage(message);
      setAppState("error");
    }
  };

  const resetView = () => {
    setAppState("idle");
    setAnalysis(null);
    setErrorMessage(null);
    setStepIndex(0);
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(13,148,136,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(15,23,42,0.08),_transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#f8fafc_0%,#eef6f5_45%,#f8fafc_100%)]" />
        <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 shadow-sm backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              Micro-SaaS B2B
            </div>
            <div>
              <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                TenderPulse
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Déposez un Appel d&apos;Offres PDF. Obtenez en moins de 2 minutes
                un score Go/No-Go, les exigences critiques, la matrice de risques
                et une feuille de route exportable.
              </p>
            </div>
          </div>
          {(appState === "result" || appState === "error") && (
            <Button variant="outline" onClick={resetView}>
              <RotateCcw className="h-4 w-4" />
              Analyser un autre document
            </Button>
          )}
        </header>

        {appState === "idle" && (
          <section className="mx-auto w-full max-w-2xl animate-fade-in">
            <PdfUploader onAnalyze={handleAnalyze} isAnalyzing={false} />
            <p className="mt-4 text-center text-xs text-slate-500">
              Vos documents sont analysés à la volée. Aucun stockage persistant
              n&apos;est effectué côté application.
            </p>
          </section>
        )}

        {appState === "analyzing" && (
          <section className="mx-auto w-full max-w-xl animate-fade-in">
            <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-8 shadow-sm backdrop-blur">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-teal-300">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
                <div>
                  <p className="font-display text-lg font-semibold text-slate-900">
                    Analyse en cours
                  </p>
                  <p className="text-sm text-slate-500">
                    Lecture chirurgicale du cahier des charges…
                  </p>
                </div>
              </div>
              <Progress value={progressValue} className="mb-5" />
              <ul className="space-y-2">
                {ANALYSIS_STEPS.map((step, index) => (
                  <li
                    key={step}
                    className={`text-sm transition-colors ${
                      index === stepIndex
                        ? "font-semibold text-teal-700"
                        : index < stepIndex
                          ? "text-slate-500"
                          : "text-slate-300"
                    }`}
                  >
                    {index < stepIndex ? "✓ " : index === stepIndex ? "→ " : "· "}
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {appState === "error" && (
          <section className="mx-auto w-full max-w-2xl animate-fade-in space-y-4">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
              <p className="font-semibold">Impossible de terminer l&apos;analyse</p>
              <p className="mt-1">{errorMessage}</p>
            </div>
            <PdfUploader onAnalyze={handleAnalyze} isAnalyzing={false} />
          </section>
        )}

        {appState === "result" && analysis && (
          <section>
            <AnalysisDashboard data={analysis} />
          </section>
        )}
      </div>
    </main>
  );
}
