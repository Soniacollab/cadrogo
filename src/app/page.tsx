"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { AnalysisDashboard } from "@/components/analysis-dashboard";
import { CompanyProfilePanel } from "@/components/company-profile-panel";
import { PdfUploader } from "@/components/pdf-uploader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { trackEvent } from "@/lib/analytics";
import { readCompanyProfile } from "@/lib/company-profile";
import { buildDemoAnalysis, DEMO_ESN_PROFILE } from "@/lib/demo-analysis";
import type {
  AnalysisAppState,
  AnalyzeApiError,
  AnalyzeApiSuccess,
  CompanyProfile,
  TenderAnalysisResult,
} from "@/types/analysis";

const ANALYSIS_STEPS = [
  "Extraction du cahier des charges",
  "Repérage des exigences et clauses",
  "Identification des risques et pénalités",
  "Évaluation Go / No-Go",
  "Simulation Win-Engine & comparables",
] as const;

const ACCESS_CODE_KEY = "cadrogo_access_code";

export default function HomePage() {
  const [appState, setAppState] = useState<AnalysisAppState>("idle");
  const [analysis, setAnalysis] = useState<TenderAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [accessCode, setAccessCode] = useState("");
  const [isDemo, setIsDemo] = useState(false);
  const [profile, setProfile] = useState<CompanyProfile>(() =>
    typeof window === "undefined" ? readCompanyProfile() : readCompanyProfile()
  );

  useEffect(() => {
    setProfile(readCompanyProfile());
    const saved = window.sessionStorage.getItem(ACCESS_CODE_KEY);
    if (saved) setAccessCode(saved);
    trackEvent("app_home_view");
  }, []);

  useEffect(() => {
    if (appState !== "analyzing") return;
    setStepIndex(0);
    const timer = window.setInterval(() => {
      setStepIndex((c) => (c < ANALYSIS_STEPS.length - 1 ? c + 1 : c));
    }, 2200);
    return () => window.clearInterval(timer);
  }, [appState]);

  const progressValue = useMemo(() => {
    if (appState !== "analyzing") return 0;
    return Math.min(95, ((stepIndex + 1) / ANALYSIS_STEPS.length) * 100);
  }, [appState, stepIndex]);

  const handleAnalyze = async (file: File) => {
    setAppState("analyzing");
    setErrorMessage(null);
    setIsDemo(false);
    setAnalysis(null);
    trackEvent("analyze_started", {
      fileName: file.name,
      size: file.size,
      tjm: profile.tjmEur,
    });

    try {
      const code = accessCode.trim();
      if (code) {
        window.sessionStorage.setItem(ACCESS_CODE_KEY, code);
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("profile", JSON.stringify(profile));
      if (code) formData.append("accessCode", code);
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        headers: code ? { "x-access-code": code } : undefined,
      });
      const payload = (await response.json()) as
        | AnalyzeApiSuccess
        | AnalyzeApiError;

      if (!response.ok || !("data" in payload)) {
        const err = payload as AnalyzeApiError;
        throw new Error(
          err.details ? `${err.error} — ${err.details}` : err.error || "Échec"
        );
      }
      setAnalysis(payload.data);
      setAppState("result");
      trackEvent("analyze_succeeded", {
        score: payload.data.goNoGoScore,
        risks: payload.data.riskFactors.length,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue pendant le traitement."
      );
      setAppState("error");
      trackEvent("analyze_failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  };

  const resetView = () => {
    setAppState("idle");
    setAnalysis(null);
    setIsDemo(false);
    setErrorMessage(null);
    setStepIndex(0);
    trackEvent("analyze_reset");
  };

  const handleTryDemo = () => {
    setErrorMessage(null);
    setIsDemo(true);
    setAnalysis(buildDemoAnalysis());
    setAppState("result");
    trackEvent("demo_example_opened", { title: "CHU Nantes" });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <main className="w-full">
      <div className="mx-auto w-full max-w-6xl px-5 py-5 sm:px-6 sm:py-6">
        {(appState === "idle" || appState === "error") && (
          <section className="animate-fade-in space-y-6 pb-10">
            <div className="max-w-2xl space-y-3">
              <p className="text-sm font-medium text-accent">
                Go/No-Go personnalisé pour votre ESN
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Est-ce que votre entreprise IT doit répondre à cet AO&nbsp;?
              </h1>
              <p className="text-sm leading-relaxed text-muted sm:text-base">
                Cadrogo ne résume pas le DCE pour tout le monde. Il croise les
                exigences avec votre profil (certifs, références, capacité) et
                dit pourquoi c&apos;est GO, À VÉRIFIER ou NO-GO.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button type="button" onClick={handleTryDemo}>
                  Essayer un exemple
                </Button>
                <p className="text-xs text-muted">
                  AO type CHU Nantes · sans PDF ni clé API
                </p>
              </div>
            </div>

            <CompanyProfilePanel onChange={setProfile} />

            <div className="max-w-md space-y-1.5">
              <label
                htmlFor="access-code"
                className="text-sm font-medium text-foreground"
              >
                Code d&apos;accès beta
              </label>
              <input
                id="access-code"
                type="password"
                autoComplete="off"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Fourni en DM LinkedIn"
                className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none ring-accent/30 focus:ring-2"
              />
              <p className="text-xs text-muted">
                Mémorisé pour cette session. Sans code valide, l&apos;audit est
                refusé côté serveur.
              </p>
            </div>

            {appState === "error" && (
              <div className="rounded-md bg-danger/10 px-3 py-2.5 text-sm text-danger">
                <p className="font-medium">
                  Le document n&apos;a pas pu être traité
                </p>
                <p className="mt-1 opacity-90">{errorMessage}</p>
              </div>
            )}

            <PdfUploader onAnalyze={handleAnalyze} isAnalyzing={false} />
            <p className="text-sm text-muted">
              Pas de DCE sous la main&nbsp;?{" "}
              <button
                type="button"
                onClick={handleTryDemo}
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Essayer un exemple
              </button>
            </p>
          </section>
        )}

        {appState === "analyzing" && (
          <section className="animate-fade-in rounded-2xl border border-line bg-surface p-6 shadow-panel">
            <div className="mb-3 flex items-center gap-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              <div>
                <p className="text-sm font-medium">Audit du dossier en cours</p>
                <p className="text-xs text-muted">
                  Extraction, gap-check profil, prior marchés publics…
                </p>
              </div>
            </div>
            <Progress value={progressValue} className="mb-3" />
            <ul className="space-y-1">
              {ANALYSIS_STEPS.map((step, index) => (
                <li
                  key={step}
                  className={`text-sm ${
                    index === stepIndex
                      ? "font-medium"
                      : index < stepIndex
                        ? "text-muted"
                        : "opacity-30"
                  }`}
                >
                  {step}
                </li>
              ))}
            </ul>
          </section>
        )}

        {appState === "result" && analysis && (
          <section className="animate-fade-in scroll-mt-16 space-y-3 pb-10">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  Synthèse du dossier
                </h1>
                <p className="mt-0.5 text-sm text-muted">
                  Go/No-Go personnalisé pour votre ESN · win/loss à tracer
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={resetView}>
                <RotateCcw className="h-3.5 w-3.5" />
                {isDemo ? "Retour à l'accueil" : "Analyser un autre PDF"}
              </Button>
            </div>
            <AnalysisDashboard
              data={analysis}
              profile={isDemo ? DEMO_ESN_PROFILE : profile}
              isDemo={isDemo}
            />
          </section>
        )}
      </div>
    </main>
  );
}
