// Government recruitment notices are very often published as PDFs
// (scanned or generated), and Tavily's raw-content extraction is
// unreliable on those — it's built mainly for HTML pages. When a source
// URL looks like a PDF and Tavily gave us little/no usable text, we fetch
// and parse the PDF ourselves so the LLM actually has eligibility/date
// details to extract instead of an empty page.

const MAX_PDF_BYTES = 8 * 1024 * 1024; // 8MB — government notices are rarely bigger
const MAX_EXTRACTED_CHARS = 6000;

export function looksLikePdf(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.endsWith(".pdf") || lower.includes("loadpdf") || lower.includes(".pdf?");
}

export async function extractPdfText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      // Some gov.in servers reject requests with no User-Agent
      headers: { "User-Agent": "Mozilla/5.0 (compatible; YojanaSaathiBot/1.0)" }
    });
    if (!res.ok) return null;

    const contentLength = res.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_PDF_BYTES) return null;

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_PDF_BYTES) return null;

    // Lazy import — pdf-parse pulls in some Node-only internals that
    // shouldn't be bundled into anything client-side.
    const pdfParse = (await import("pdf-parse")).default;
    const buffer = Buffer.from(arrayBuffer);
    const parsed = await pdfParse(buffer);

    const text = parsed.text?.trim();
    if (!text || text.length < 50) return null;

    return text.length > MAX_EXTRACTED_CHARS
      ? text.slice(0, MAX_EXTRACTED_CHARS) + "…"
      : text;
  } catch (err) {
    console.error(`PDF extraction failed for ${url}:`, err);
    return null;
  }
}
