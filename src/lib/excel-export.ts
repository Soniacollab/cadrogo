import * as XLSX from "xlsx";
import type { TenderAnalysisResult } from "@/types/analysis";

export function exportAnalysisToExcel(data: TenderAnalysisResult): void {
  const workbook = XLSX.utils.book_new();

  const synthesisRows = [
    ["Champ", "Valeur"],
    ["Titre du marché", data.title],
    ["Client", data.clientName],
    ["Date limite de soumission", data.submissionDeadline],
    ["Budget estimé", data.estimatedBudget],
    ["Score Go / No-Go", data.goNoGoScore],
    ["Raison Go / No-Go", data.goNoGoReason],
    ["Résumé", data.summary],
  ];
  const synthesisSheet = XLSX.utils.aoa_to_sheet(synthesisRows);
  synthesisSheet["!cols"] = [{ wch: 28 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(workbook, synthesisSheet, "Synthèse Go-NoGo");

  const requirementsRows = [
    ["Catégorie", "Description", "Caractère Obligatoire"],
    ...data.requirements.map((requirement) => [
      requirement.category,
      requirement.description,
      requirement.isMandatory ? "Obligatoire" : "Optionnel",
    ]),
  ];
  const requirementsSheet = XLSX.utils.aoa_to_sheet(requirementsRows);
  requirementsSheet["!cols"] = [{ wch: 16 }, { wch: 90 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(
    workbook,
    requirementsSheet,
    "Exigences & Conformité"
  );

  const risksRows = [
    ["Type", "Description", "Niveau de sévérité"],
    ...data.riskFactors.map((risk) => [
      risk.type,
      risk.description,
      risk.severity,
    ]),
  ];
  const risksSheet = XLSX.utils.aoa_to_sheet(risksRows);
  risksSheet["!cols"] = [{ wch: 24 }, { wch: 90 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, risksSheet, "Risques & Pénalités");

  const safeTitle = data.title
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 40);
  const filename = `Cadrogo_${safeTitle || "analyse"}_${Date.now()}.xlsx`;

  XLSX.writeFile(workbook, filename);
}
