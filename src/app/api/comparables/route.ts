import { NextRequest, NextResponse } from "next/server";
import { findComparables } from "@/lib/win-model";
import type { AnalyzeApiError, TenderAnalysisResult } from "@/types/analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { analysis?: TenderAnalysisResult };
    if (!body.analysis) {
      return NextResponse.json(
        {
          error: "Payload invalide",
          details: "Envoyez { analysis }.",
        } satisfies AnalyzeApiError,
        { status: 400 }
      );
    }
    const comparables = findComparables(body.analysis, 5);
    return NextResponse.json({ data: comparables }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inattendue";
    return NextResponse.json(
      { error: "Erreur comparables", details: message } satisfies AnalyzeApiError,
      { status: 500 }
    );
  }
}
