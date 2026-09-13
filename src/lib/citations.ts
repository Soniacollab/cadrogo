import type { Requirement, RiskFactor, SourceCitation } from "@/types/analysis";

export interface PdfPage {
  page: number;
  text: string;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9€%\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreMatch(haystack: string, needle: string): number {
  const h = normalize(haystack);
  const n = normalize(needle);
  if (!n || n.length < 12) return 0;
  if (h.includes(n.slice(0, Math.min(80, n.length)))) return 1;
  const tokens = n.split(" ").filter((t) => t.length > 4).slice(0, 8);
  if (tokens.length === 0) return 0;
  const hits = tokens.filter((t) => h.includes(t)).length;
  return hits / tokens.length;
}

export function findCitation(
  pages: PdfPage[],
  description: string
): SourceCitation {
  if (pages.length === 0) {
    return { page: null, excerpt: description.slice(0, 140) };
  }

  let bestPage = pages[0]!;
  let bestScore = 0;
  for (const page of pages) {
    const score = scoreMatch(page.text, description);
    if (score > bestScore) {
      bestScore = score;
      bestPage = page;
    }
  }

  const excerptSource = bestPage.text.replace(/\s+/g, " ").trim();
  const excerpt =
    excerptSource.length > 180
      ? `${excerptSource.slice(0, 177)}…`
      : excerptSource || description.slice(0, 140);

  return {
    page: bestScore >= 0.35 ? bestPage.page : null,
    excerpt,
  };
}

export function attachCitationsToRequirements(
  items: Requirement[],
  pages: PdfPage[]
): Requirement[] {
  return items.map((item) => ({
    ...item,
    citation: item.citation ?? findCitation(pages, item.description),
  }));
}

export function attachCitationsToRisks(
  items: RiskFactor[],
  pages: PdfPage[]
): RiskFactor[] {
  return items.map((item) => ({
    ...item,
    citation: item.citation ?? findCitation(pages, item.description),
  }));
}

/** Split pdf-parse text into pages using form-feed when available. */
export function splitPdfTextIntoPages(fullText: string): PdfPage[] {
  const chunks = fullText.includes("\f")
    ? fullText.split("\f")
    : [fullText];
  return chunks
    .map((text, index) => ({ page: index + 1, text: text.trim() }))
    .filter((p) => p.text.length > 0);
}
