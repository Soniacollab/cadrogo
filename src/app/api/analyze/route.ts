import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { splitPdfTextIntoPages } from "@/lib/citations";
import { extractPdfText } from "@/lib/extract-pdf-text";
import {
  checkAccessCode,
  checkAnalyzeRateLimit,
  getClientIp,
} from "@/lib/rate-limit";
import { parseAndNormalizeAnalysis } from "@/lib/validate-analysis";
import type {
  AnalyzeApiError,
  AnalyzeApiSuccess,
  CompanyProfile,
} from "@/types/analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SYSTEM_PROMPT = `Tu es un expert juridique et commercial en Appels d'Offres B2B IT / numérique public français, spécialisé en aide à la décision Go/No-Go et simulation de gain. Analysez le texte du Cahier des Charges / Appel d'Offres fourni avec une précision chirurgicale. Renvoyez TOUJOURS un objet JSON valide correspondant strictement à l'interface TenderAnalysisResult.

Structure JSON attendue (clés exactes) :
{
  "title": string,
  "clientName": string,
  "submissionDeadline": string,
  "estimatedBudget": string,
  "goNoGoScore": number (0 à 100),
  "goNoGoReason": string,
  "summary": string,
  "requirements": [
    {
      "id": string,
      "category": "Technique" | "Administratif" | "Financier" | "Juridique",
      "description": string,
      "isMandatory": boolean,
      "citation": { "page": number | null, "excerpt": string }
    }
  ],
  "riskFactors": [
    {
      "id": string,
      "type": "Pénalité de retard" | "Clause juridique" | "Exigence éliminatoire" | "Autre",
      "description": string,
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "citation": { "page": number | null, "excerpt": string }
    }
  ],
  "milestones": [
    {
      "id": string,
      "phase": string,
      "deadlineOrDuration": string
    }
  ],
  "decisionInsights": {
    "conformityRadar": [
      { "axis": "Sécurité" | "Capacité Technique" | "Respect des Délais" | "Rentabilité Financière" | "Conformité Administrative", "score": number (0 à 100) }
    ],
    "scoringWeights": [
      { "label": string, "weight": number }
    ],
    "priceWinCurve": [
      { "priceLabel": string, "priceValue": number, "winProbability": number (0 à 100), "estimatedScore": number (0 à 100) }
    ],
    "recommendedPriceLabel": string,
    "recommendedWinProbability": number (0 à 100),
    "winRecommendation": string
  }
}

Règles :
- Vertical IT public FR : RGAA, SecNumCloud, ISO 27001, SLA, pénalités d'indisponibilité, critères Prix/Technique.
- Extrais le maximum d'exigences, risques et jalons réellement présents dans le texte.
- Pour chaque exigence et risque, fournis citation.excerpt (courte citation fidèle) et citation.page si le texte indique des pages ; sinon page=null.
- Dans riskFactors.description, reprends les montants € / % / plafonds / "sans plafond" tels quels.
- goNoGoScore doit refléter la faisabilité globale pour une PME IT (0 = No-Go clair, 100 = Go idéal).
- decisionInsights.conformityRadar DOIT contenir exactement les 5 axes listés.
- decisionInsights.scoringWeights : pondération réelle si présente ; sinon estimation crédible ~100.
- decisionInsights.priceWinCurve : 4 à 6 scénarios autour du budget, win décroissante si prix monte.
- Les ids doivent être stables (req-1, risk-1, ms-1).
- Réponds uniquement avec le JSON, sans markdown.`;

const MAX_PDF_CHARS = 120_000;

function jsonError(
  status: number,
  error: string,
  details?: string
): NextResponse<AnalyzeApiError> {
  return NextResponse.json({ error, details }, { status });
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<AnalyzeApiSuccess | AnalyzeApiError>> {
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return jsonError(
        500,
        "Clé API absente",
        "Définissez OPENAI_API_KEY (clé OpenAI sk-… ou Groq gsk-…) dans .env.local."
      );
    }

    const isGroq = apiKey.startsWith("gsk_");
    const model =
      process.env.OPENAI_MODEL?.trim() ||
      (isGroq ? "llama-3.3-70b-versatile" : "gpt-4o-mini");
    const providerLabel = isGroq ? "Groq" : "OpenAI";

    const formData = await request.formData();
    const accessRaw = formData.get("accessCode");
    const accessCode =
      typeof accessRaw === "string"
        ? accessRaw
        : request.headers.get("x-access-code");
    const access = checkAccessCode(accessCode);
    if (!access.ok) {
      return jsonError(401, access.error, access.details);
    }

    const rate = checkAnalyzeRateLimit(getClientIp(request));
    if (!rate.ok) {
      return jsonError(429, rate.error, rate.details);
    }

    const file = formData.get("file");
    let profile: CompanyProfile | null = null;
    const profileRaw = formData.get("profile");
    if (typeof profileRaw === "string" && profileRaw.trim()) {
      try {
        profile = JSON.parse(profileRaw) as CompanyProfile;
      } catch {
        profile = null;
      }
    }

    if (!(file instanceof File)) {
      return jsonError(
        400,
        "Fichier manquant",
        "Envoyez un fichier PDF via le champ FormData « file »."
      );
    }

    const isPdfMime =
      file.type === "application/pdf" ||
      file.type === "application/x-pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdfMime) {
      return jsonError(
        400,
        "Format invalide",
        "Seuls les fichiers PDF sont acceptés."
      );
    }

    if (file.size === 0) {
      return jsonError(400, "Fichier vide", "Le PDF fourni ne contient aucune donnée.");
    }

    if (file.size > 25 * 1024 * 1024) {
      return jsonError(
        400,
        "Fichier trop volumineux",
        "La taille maximale autorisée est de 25 Mo."
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText: string;
    try {
      const extracted = await extractPdfText(buffer);
      extractedText = extracted.text;
    } catch (parseError) {
      const message =
        parseError instanceof Error ? parseError.message : "Erreur inconnue";
      return jsonError(400, "PDF illisible", message);
    }

    if (extractedText.length < 80) {
      return jsonError(
        400,
        "PDF sans texte exploitable",
        "Le document semble scanné ou vide. Fournissez un PDF textuel."
      );
    }

    const truncatedText =
      extractedText.length > MAX_PDF_CHARS
        ? `${extractedText.slice(0, MAX_PDF_CHARS)}\n\n[Texte tronqué pour limite de contexte]`
        : extractedText;
    const pages = splitPdfTextIntoPages(extractedText);

    const openai = new OpenAI({
      apiKey,
      ...(isGroq
        ? { baseURL: "https://api.groq.com/openai/v1" }
        : process.env.OPENAI_BASE_URL
          ? { baseURL: process.env.OPENAI_BASE_URL }
          : {}),
    });

    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await openai.chat.completions.create({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Analyse le Cahier des Charges / Appel d'Offres suivant et renvoie le JSON TenderAnalysisResult :\n\n${truncatedText}`,
          },
        ],
      });
    } catch (openaiError) {
      if (openaiError instanceof OpenAI.APIError) {
        if (openaiError.status === 429) {
          return jsonError(
            500,
            `Quota ${providerLabel} dépassé`,
            `Le quota ou le rate-limit de l'API ${providerLabel} a été atteint. Réessayez plus tard.`
          );
        }
        if (openaiError.status === 401 || openaiError.status === 403) {
          return jsonError(
            500,
            `Clé API ${providerLabel} invalide`,
            isGroq
              ? "Vérifiez votre clé Groq (gsk-…) dans OPENAI_API_KEY."
              : "Vérifiez votre clé OpenAI (sk-…) dans OPENAI_API_KEY."
          );
        }
        return jsonError(
          500,
          `Erreur ${providerLabel}`,
          openaiError.message || "Échec de l'appel au modèle."
        );
      }

      const message =
        openaiError instanceof Error ? openaiError.message : "Erreur inconnue";
      return jsonError(500, "Erreur lors de l'analyse IA", message);
    }

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return jsonError(
        500,
        "Réponse IA vide",
        "Le modèle n'a renvoyé aucun contenu JSON."
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(content) as unknown;
    } catch {
      return jsonError(
        500,
        "JSON IA invalide",
        "Le modèle a renvoyé un JSON non parsable."
      );
    }

    const data = parseAndNormalizeAnalysis(parsedJson, { pages, profile });
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inattendue";
    return jsonError(500, "Erreur serveur", message);
  }
}
