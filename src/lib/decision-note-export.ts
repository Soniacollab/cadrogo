import type { TenderAnalysisResult, WinSimulationResult } from "@/types/analysis";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildDecisionNoteHtml(
  data: TenderAnalysisResult,
  simulation?: WinSimulationResult | null
): string {
  const criticalRisks = data.riskFactors.filter(
    (r) => r.severity === "CRITICAL" || r.severity === "HIGH"
  );
  const missing = data.requirements.filter((r) => r.companyGap === "missing");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Note de décision — ${esc(data.title)}</title>
  <style>
    body { font-family: "IBM Plex Sans", Helvetica, Arial, sans-serif; color: #152033; margin: 40px; line-height: 1.45; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 15px; margin-top: 28px; border-bottom: 1px solid #c5ced9; padding-bottom: 6px; }
    .meta { color: #5b6778; font-size: 13px; }
    .score { display: inline-block; padding: 10px 14px; border: 1px solid #c5ced9; border-radius: 8px; margin: 12px 0; }
    .score strong { font-size: 28px; }
    ul { padding-left: 18px; }
    li { margin-bottom: 6px; font-size: 13px; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .danger { background: #fee4e2; color: #b42318; }
    .ok { background: #dcfae6; color: #067647; }
    .warn { background: #fef0c7; color: #b54708; }
    footer { margin-top: 36px; font-size: 11px; color: #5b6778; }
    @media print { body { margin: 16mm; } }
  </style>
</head>
<body>
  <p class="meta">Cadrogo — Note de décision DG</p>
  <h1>${esc(data.title)}</h1>
  <p class="meta">${esc(data.clientName)} · Remise : ${esc(data.submissionDeadline)} · Budget : ${esc(data.estimatedBudget)}</p>

  <div class="score">
    <div>Score Go / No-Go</div>
    <strong>${data.goNoGoScore}</strong>/100
    <div class="meta">${esc(data.goNoGoReason)}</div>
  </div>

  <h2>Synthèse</h2>
  <p>${esc(data.summary)}</p>

  <h2>Exposition financière</h2>
  <p>${esc(data.financialExposure.summary)}</p>
  ${
    data.financialExposure.hasUnlimitedExposure
      ? `<p><span class="badge danger">Exposition illimitée</span></p>`
      : data.financialExposure.maxExposureEur != null
        ? `<p><span class="badge warn">Max ~ ${data.financialExposure.maxExposureEur.toLocaleString("fr-FR")} €</span></p>`
        : ""
  }

  ${
    simulation
      ? `<h2>Win-Engine (calibré entreprise)</h2>
         <p><strong>${esc(simulation.verdictLabel)}</strong> — prix cible ${simulation.recommendedPrice.toLocaleString("fr-FR")} € · win ${simulation.recommendedWinProbability}%</p>
         <p>${esc(simulation.explanation)}</p>
         <p class="meta">Coût interne estimé ${simulation.estimatedInternalCost.toLocaleString("fr-FR")} € · seuil rentabilité ${simulation.breakEvenPrice.toLocaleString("fr-FR")} €</p>`
      : ""
  }

  <h2>Points de vigilance majeurs (${criticalRisks.length})</h2>
  <ul>
    ${criticalRisks
      .map(
        (r) =>
          `<li><span class="badge danger">${esc(r.severity)}</span> <strong>${esc(r.type)}</strong> — ${esc(r.description)}${r.exposureLabel ? ` <em>(${esc(r.exposureLabel)})</em>` : ""}${r.citation?.page ? ` <span class="meta">p.${r.citation.page}</span>` : ""}</li>`
      )
      .join("") || "<li>Aucun risque critique/élevé.</li>"}
  </ul>

  <h2>Écarts vs profil entreprise (${missing.length})</h2>
  <ul>
    ${missing
      .map(
        (r) =>
          `<li><span class="badge danger">Manquant</span> ${esc(r.description)}${r.gapReason ? ` — ${esc(r.gapReason)}` : ""}</li>`
      )
      .join("") || "<li><span class=\"badge ok\">OK</span> Aucun écart bloquant détecté automatiquement.</li>"}
  </ul>

  ${
    data.comparables && data.comparables.length > 0
      ? `<h2>Marchés comparables</h2>
         <ul>${data.comparables
           .map(
             (c) =>
               `<li>${esc(c.buyerName)} — ${esc(c.title)} (${c.awardYear}) : ${c.awardValueEur.toLocaleString("fr-FR")} € ${c.discountVsEstimatePercent != null ? `(${c.discountVsEstimatePercent} % vs est.)` : ""}</li>`
           )
           .join("")}</ul>`
      : ""
  }

  <footer>
    Document généré le ${new Date().toLocaleString("fr-FR")} · Aide à la décision, ne remplace pas un conseil juridique.
    ${data.winPrior ? `Prior win : ${data.winPrior.baseWinProbability}% (${esc(data.winPrior.method)}).` : ""}
  </footer>
  <script>window.addEventListener("load", () => setTimeout(() => window.print(), 250));</script>
</body>
</html>`;
}

export function openDecisionNotePrint(
  data: TenderAnalysisResult,
  simulation?: WinSimulationResult | null
): void {
  const html = buildDecisionNoteHtml(data, simulation);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
