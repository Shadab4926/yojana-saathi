import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  SchemeQuery,
  SchemeResult,
  JobQuery,
  JobResult,
  TavilySearchResult
} from "./types";

const EXTRACTION_INSTRUCTIONS = (q: SchemeQuery) => `
You are a government-scheme information extractor for Indian citizens.
You will be given raw search snippets from official Indian government websites
(myscheme.gov.in, pib.gov.in, state .gov.in portals).

The citizen's context:
- State: ${q.state}
- Occupation: ${q.occupation}
- Category: ${q.category || "general"}
- Gender: ${q.gender || "unspecified"}
- Income bracket: ${q.incomeBracket || "unspecified"}
- Age: ${q.age ?? "unspecified"}

From the snippets, extract ONLY schemes that are real and named in the source text.
Do NOT invent scheme names, amounts, or URLs that are not present or clearly implied
in the provided content. If a field is not present in the source, use an empty string
rather than guessing.

"officialLink" must be the scheme's OWN application or information portal
(e.g. its dedicated myscheme.gov.in page, or the sponsoring ministry's scheme
page) — NOT the URL of a press release or news article that merely mentions
it alongside other schemes. If several schemes appear in one press digest and
you cannot find each one's own distinct application link in the source text,
leave "officialLink" as an empty string for those schemes rather than reusing
the digest's URL for all of them.

Return ONLY a JSON array (no markdown fences, no prose) where each item has exactly:
{
  "nameNative": string,
  "nameEnglish": string,
  "benefits": string,
  "eligibility": string,
  "applicationProcess": string,
  "requiredDocuments": string[],
  "officialLink": string,
  "sourceSnippetUrl": string,
  "sourceDomain": string
}

Return at most 8 schemes, ranked by relevance to the citizen's context above.
If nothing relevant is found, return [].
`;

function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

const MAX_CONTENT_CHARS_PER_SOURCE = 4000;

function buildSourceBlock(results: TavilySearchResult[]): string {
  return results
    .map((r, i) => {
      const content =
        r.content.length > MAX_CONTENT_CHARS_PER_SOURCE
          ? r.content.slice(0, MAX_CONTENT_CHARS_PER_SOURCE) + "…"
          : r.content;
      return `[SOURCE ${i + 1}] url: ${r.url}\ntitle: ${r.title}\ncontent: ${content}`;
    })
    .join("\n\n");
}

async function extractWithGroq(
  q: SchemeQuery,
  results: TavilySearchResult[],
  apiKey: string
): Promise<SchemeResult[]> {
  const groq = new Groq({ apiKey });
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.1,
    max_tokens: 3000,
    messages: [
      { role: "system", content: EXTRACTION_INSTRUCTIONS(q) },
      { role: "user", content: buildSourceBlock(results) }
    ]
  });

  const raw = completion.choices[0]?.message?.content || "[]";
  const parsed = JSON.parse(stripFences(raw));
  return normalizeSchemes(parsed);
}

async function extractWithGemini(
  q: SchemeQuery,
  results: TavilySearchResult[],
  apiKey: string
): Promise<SchemeResult[]> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `${EXTRACTION_INSTRUCTIONS(q)}\n\n${buildSourceBlock(results)}`;
  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  const parsed = JSON.parse(stripFences(raw));
  return normalizeSchemes(parsed);
}

function normalizeSchemes(parsed: any): SchemeResult[] {
  if (!Array.isArray(parsed)) return [];
  const now = new Date().toISOString();
  return parsed
    .filter((s) => s && (s.nameEnglish || s.nameNative))
    .slice(0, 8)
    .map((s) => ({
      nameNative: s.nameNative || "",
      nameEnglish: s.nameEnglish || "",
      benefits: s.benefits || "",
      eligibility: s.eligibility || "",
      applicationProcess: s.applicationProcess || "",
      requiredDocuments: Array.isArray(s.requiredDocuments)
        ? s.requiredDocuments
        : [],
      // Deliberately NOT falling back to sourceSnippetUrl here — when several
      // schemes are pulled from one press digest, they'd all inherit the same
      // article link and look like duplicate "Apply" buttons pointing nowhere
      // useful. Better to show no direct link than a misleading one.
      officialLink: s.officialLink || "",
      sourceSnippetUrl: s.sourceSnippetUrl || "",
      sourceDomain: s.sourceDomain || safeDomain(s.sourceSnippetUrl),
      lastVerified: now
    }));
}

function safeDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/**
 * Extracts structured scheme data from raw search results.
 * Tries Groq first (fast, generous free tier). Falls back to Gemini
 * if Groq is unavailable, rate-limited, or returns malformed JSON.
 */
const JOB_EXTRACTION_INSTRUCTIONS = (q: JobQuery) => `
You are a government recruitment/exam notification extractor for Indian citizens.
You will be given raw search snippets from official Indian government recruitment
and exam websites (ssc.nic.in, upsc.gov.in, ibps.in, rrbcdg.gov.in,
employmentnews.gov.in, ncs.gov.in, state .gov.in portals).

The citizen's context:
- State: ${q.state}
- Qualification: ${q.qualification}
- Category: ${q.category || "any"}

From the snippets, extract ONLY real recruitment notices / exams named in the
source text. Do NOT invent post names, vacancy counts, dates, or URLs not
present or clearly implied in the provided content. If a field is not present
in the source, use an empty string rather than guessing — this is especially
important for dates and fees, since a wrong date could cause someone to miss
a real deadline.

"notificationLink" should be the official PDF or notice page for this specific
recruitment. "applicationPortalLink" should be the actual online application
portal if named separately from the notification. Leave either empty if not
found in the source rather than reusing an unrelated URL.

Return ONLY a JSON array (no markdown fences, no prose) where each item has exactly:
{
  "postNameNative": string,
  "postNameEnglish": string,
  "organization": string,
  "totalVacancies": string,
  "eligibility": string,
  "applicationStartDate": string,
  "applicationEndDate": string,
  "examDate": string,
  "applicationFee": string,
  "notificationLink": string,
  "applicationPortalLink": string,
  "sourceSnippetUrl": string,
  "sourceDomain": string
}

Return at most 8 postings, ranked by relevance to the citizen's context above.
If nothing relevant is found, return [].
`;

async function extractJobsWithGroq(
  q: JobQuery,
  results: TavilySearchResult[],
  apiKey: string
): Promise<JobResult[]> {
  const groq = new Groq({ apiKey });
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.1,
    max_tokens: 3000,
    messages: [
      { role: "system", content: JOB_EXTRACTION_INSTRUCTIONS(q) },
      { role: "user", content: buildSourceBlock(results) }
    ]
  });

  const raw = completion.choices[0]?.message?.content || "[]";
  const parsed = JSON.parse(stripFences(raw));
  return normalizeJobs(parsed);
}

async function extractJobsWithGemini(
  q: JobQuery,
  results: TavilySearchResult[],
  apiKey: string
): Promise<JobResult[]> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `${JOB_EXTRACTION_INSTRUCTIONS(q)}\n\n${buildSourceBlock(results)}`;
  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  const parsed = JSON.parse(stripFences(raw));
  return normalizeJobs(parsed);
}

function normalizeJobs(parsed: any): JobResult[] {
  if (!Array.isArray(parsed)) return [];
  const now = new Date().toISOString();
  return parsed
    .filter((j) => j && (j.postNameEnglish || j.postNameNative))
    .slice(0, 8)
    .map((j) => ({
      postNameNative: j.postNameNative || "",
      postNameEnglish: j.postNameEnglish || "",
      organization: j.organization || "",
      totalVacancies: j.totalVacancies || "",
      eligibility: j.eligibility || "",
      applicationStartDate: j.applicationStartDate || "",
      applicationEndDate: j.applicationEndDate || "",
      examDate: j.examDate || "",
      applicationFee: j.applicationFee || "",
      notificationLink: j.notificationLink || "",
      applicationPortalLink: j.applicationPortalLink || "",
      sourceSnippetUrl: j.sourceSnippetUrl || "",
      sourceDomain: j.sourceDomain || safeDomain(j.sourceSnippetUrl),
      lastVerified: now
    }));
}

export async function extractJobs(
  query: JobQuery,
  results: TavilySearchResult[],
  keys: { groqKey?: string; geminiKey?: string }
): Promise<{ jobs: JobResult[]; usedProvider: "groq" | "gemini" | "none" }> {
  if (results.length === 0) {
    return { jobs: [], usedProvider: "none" };
  }

  if (keys.groqKey) {
    try {
      const jobs = await extractJobsWithGroq(query, results, keys.groqKey);
      return { jobs, usedProvider: "groq" };
    } catch (err) {
      console.error("Groq job extraction failed, falling back to Gemini:", err);
    }
  }

  if (keys.geminiKey) {
    try {
      const jobs = await extractJobsWithGemini(query, results, keys.geminiKey);
      return { jobs, usedProvider: "gemini" };
    } catch (err) {
      console.error("Gemini job extraction also failed:", err);
    }
  }

  return { jobs: [], usedProvider: "none" };
}

export async function extractSchemes(
  query: SchemeQuery,
  results: TavilySearchResult[],
  keys: { groqKey?: string; geminiKey?: string }
): Promise<{ schemes: SchemeResult[]; usedProvider: "groq" | "gemini" | "none" }> {
  if (results.length === 0) {
    return { schemes: [], usedProvider: "none" };
  }

  if (keys.groqKey) {
    try {
      const schemes = await extractWithGroq(query, results, keys.groqKey);
      return { schemes, usedProvider: "groq" };
    } catch (err) {
      console.error("Groq extraction failed, falling back to Gemini:", err);
    }
  }

  if (keys.geminiKey) {
    try {
      const schemes = await extractWithGemini(query, results, keys.geminiKey);
      return { schemes, usedProvider: "gemini" };
    } catch (err) {
      console.error("Gemini extraction also failed:", err);
    }
  }

  return { schemes: [], usedProvider: "none" };
}
