import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import pdf from "pdf-parse";
import { parseAndNormalizeAnalysis } from "@/lib/validate-analysis";
import type { AnalyzeApiError, AnalyzeApiSuccess } from "@/types/analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SYSTEM_PROMPT = `Tu es un expert juridique et commercial en Appels d'Offres B2B. Analysez le texte du Cahier des Charges / Appel d'Offres fourni avec une précision chirurgicale. Renvoyez TOUJOURS un objet JSON valide correspondant strictement à l'interface TenderAnalysisResult.

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
      "isMandatory": boolean
    }
  ],
  "riskFactors": [
    {
      "id": string,
      "type": "Pénalité de retard" | "Clause juridique" | "Exigence éliminatoire" | "Autre",
      "description": string,
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "milestones": [
    {
      "id": string,
      "phase": string,
      "deadlineOrDuration": string
    }
  ]
}

Règles :
- Extrais le maximum d'exigences, risques et jalons réellement présents dans le texte.
- goNoGoScore doit refléter la faisabilité globale (0 = No-Go clair, 100 = Go idéal).
- Si une information est absente, indique "Non précisé" / "Non précisée" sans inventer de faits critiques.
- Les ids doivent être stables et uniques (ex: req-1, risk-1, ms-1).
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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
      return jsonError(
        500,
        "Clé API OpenAI absente",
        "Définissez la variable d'environnement OPENAI_API_KEY pour activer l'analyse."
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

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
      const parsed = await pdf(buffer);
      extractedText = (parsed.text ?? "").replace(/\u0000/g, " ").trim();
    } catch (parseError) {
      const message =
        parseError instanceof Error ? parseError.message : "Erreur inconnue";
      return jsonError(
        400,
        "PDF illisible",
        `Impossible d'extraire le texte du document : ${message}`
      );
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

    const openai = new OpenAI({ apiKey });

    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
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
            "Quota OpenAI dépassé",
            "Le quota ou le rate-limit de l'API OpenAI a été atteint. Réessayez plus tard."
          );
        }
        if (openaiError.status === 401 || openaiError.status === 403) {
          return jsonError(
            500,
            "Clé API OpenAI invalide",
            "Vérifiez la validité de OPENAI_API_KEY."
          );
        }
        return jsonError(
          500,
          "Erreur OpenAI",
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

    const data = parseAndNormalizeAnalysis(parsedJson);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inattendue";
    return jsonError(500, "Erreur serveur", message);
  }
}
