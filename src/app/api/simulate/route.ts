import { NextRequest, NextResponse } from "next/server";
import { simulateWinEngine } from "@/lib/win-engine";
import type {
  AnalyzeApiError,
  CompanyProfile,
  SimulateApiSuccess,
  TenderAnalysisResult,
} from "@/types/analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(
  status: number,
  error: string,
  details?: string
): NextResponse<AnalyzeApiError> {
  return NextResponse.json({ error, details }, { status });
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<SimulateApiSuccess | AnalyzeApiError>> {
  try {
    const body = (await request.json()) as {
      analysis?: TenderAnalysisResult;
      profile?: CompanyProfile;
    };

    if (!body.analysis || !body.profile) {
      return jsonError(
        400,
        "Payload invalide",
        "Envoyez { analysis, profile } pour recalculer le Win-Engine."
      );
    }

    if (
      !Number.isFinite(body.profile.tjmEur) ||
      body.profile.tjmEur <= 0 ||
      !Number.isFinite(body.profile.targetMarginPercent)
    ) {
      return jsonError(
        400,
        "Profil incomplet",
        "TJM et marge cible sont obligatoires."
      );
    }

    const data = simulateWinEngine(body.analysis, body.profile);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inattendue";
    return jsonError(500, "Erreur simulation", message);
  }
}
