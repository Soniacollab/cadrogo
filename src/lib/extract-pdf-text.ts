import pdf from "pdf-parse";

function cleanText(text: string): string {
  return text.replace(/\u0000/g, " ").replace(/\s+/g, " ").trim();
}

async function extractWithPdfParse(buffer: Buffer): Promise<string> {
  const parsed = await pdf(buffer);
  return cleanText(parsed.text ?? "");
}

async function extractWithUnpdf(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const data = new Uint8Array(buffer);
  const proxy = await getDocumentProxy(data);
  const result = await extractText(proxy, { mergePages: true });
  const text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
  return cleanText(text ?? "");
}

/**
 * Try multiple PDF extractors — real DCE often have broken XRef tables
 * that crash pdf-parse with "bad XRef entry".
 */
export async function extractPdfText(buffer: Buffer): Promise<{
  text: string;
  engine: "pdf-parse" | "unpdf";
}> {
  const errors: string[] = [];

  try {
    const text = await extractWithPdfParse(buffer);
    if (text.length >= 40) {
      return { text, engine: "pdf-parse" };
    }
    errors.push("pdf-parse: texte trop court");
  } catch (error) {
    errors.push(
      `pdf-parse: ${error instanceof Error ? error.message : "échec"}`
    );
  }

  try {
    const text = await extractWithUnpdf(buffer);
    if (text.length >= 40) {
      return { text, engine: "unpdf" };
    }
    errors.push("unpdf: texte trop court");
  } catch (error) {
    errors.push(`unpdf: ${error instanceof Error ? error.message : "échec"}`);
  }

  throw new Error(
    `Impossible d'extraire le texte (${errors.join(" · ")}). Le PDF est peut-être scanné (image seule) ou corrompu. Essayez un export « texte » depuis Word/LibreOffice, ou un OCR.`
  );
}
