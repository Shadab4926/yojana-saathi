import { NextRequest, NextResponse } from "next/server";
import { JobQuery, SearchJobsResponse } from "@/lib/types";
import { buildJobQuery, searchGovJobs } from "@/lib/tavily";
import { extractJobs } from "@/lib/extract";
import { cacheKeyFor, readCache, writeCache, JOB_CACHE_TTL_MS } from "@/lib/cache";
import { isLikelyClosed } from "@/lib/dates";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: JobQuery;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.state || !body.qualification) {
    return NextResponse.json(
      { error: "state and qualification are required fields" },
      { status: 400 }
    );
  }

  const key = cacheKeyFor("jobs", body);
  const cached = readCache<SearchJobsResponse>(key, JOB_CACHE_TTL_MS);
  if (cached) {
    return NextResponse.json({ ...cached, fromCache: true });
  }

  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) {
    return NextResponse.json(
      { error: "Server misconfigured: TAVILY_API_KEY is missing. Add it to .env.local." },
      { status: 500 }
    );
  }

  const warnings: string[] = [
    "Always confirm exact dates and fees on the official notification before applying — extraction can occasionally misread noisy source pages."
  ];
  const govQuery = buildJobQuery(body);

  let searchResults;
  try {
    searchResults = await searchGovJobs(govQuery, tavilyKey);
  } catch (err: any) {
    console.error("Tavily job search error:", err);
    return NextResponse.json(
      { error: "Live search failed. Check your Tavily API key and quota.", detail: String(err.message || err) },
      { status: 502 }
    );
  }

  if (searchResults.length === 0) {
    warnings.push(
      "No official recruitment notices were found for this exact query. Try broadening the qualification or category."
    );
  }

  const { jobs: extractedJobs, usedProvider } = await extractJobs(body, searchResults, {
    groqKey: process.env.GROQ_API_KEY,
    geminiKey: process.env.GEMINI_API_KEY
  });

  // Open (or undated) listings first, closed ones pushed to the bottom —
  // the raw search otherwise ranks by text relevance, not by whether the
  // application window is still open, which is what actually matters here.
  const jobs = [...extractedJobs].sort((a, b) => {
    const aClosed = isLikelyClosed(a.applicationEndDate);
    const bClosed = isLikelyClosed(b.applicationEndDate);
    return Number(aClosed) - Number(bClosed);
  });

  if (usedProvider === "none" && searchResults.length > 0) {
    warnings.push(
      "Search succeeded but extraction failed. Check GROQ_API_KEY / GEMINI_API_KEY."
    );
  } else if (jobs.length > 0 && jobs.every((j) => isLikelyClosed(j.applicationEndDate))) {
    warnings.push(
      "All listings found have already closed. Try a different sector, or check back — new notices are posted regularly."
    );
  }

  const response: SearchJobsResponse = {
    query: body,
    jobs,
    fromCache: false,
    searchedAt: new Date().toISOString(),
    warnings
  };

  if (jobs.length > 0) {
    writeCache(key, response);
  }

  return NextResponse.json(response);
}
