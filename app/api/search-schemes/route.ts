import { NextRequest, NextResponse } from "next/server";
import { SchemeQuery, SearchSchemesResponse } from "@/lib/types";
import { buildGovQuery, searchGovSchemes } from "@/lib/tavily";
import { extractSchemes } from "@/lib/extract";
import { cacheKeyFor, readCache, writeCache, SCHEME_CACHE_TTL_MS } from "@/lib/cache";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: SchemeQuery;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.state || !body.occupation) {
    return NextResponse.json(
      { error: "state and occupation are required fields" },
      { status: 400 }
    );
  }

  const key = cacheKeyFor("schemes", body);
  const cached = readCache<SearchSchemesResponse>(key, SCHEME_CACHE_TTL_MS);
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

  const warnings: string[] = [];
  const govQuery = buildGovQuery(body);

  let searchResults;
  try {
    searchResults = await searchGovSchemes(govQuery, tavilyKey);
  } catch (err: any) {
    console.error("Tavily search error:", err);
    return NextResponse.json(
      { error: "Live search failed. Check your Tavily API key and quota.", detail: String(err.message || err) },
      { status: 502 }
    );
  }

  if (searchResults.length === 0) {
    warnings.push(
      "No official government sources were found for this exact query. Try broadening the category or occupation."
    );
  }

  const { schemes, usedProvider } = await extractSchemes(body, searchResults, {
    groqKey: process.env.GROQ_API_KEY,
    geminiKey: process.env.GEMINI_API_KEY
  });

  if (usedProvider === "none" && searchResults.length > 0) {
    warnings.push(
      "Search succeeded but scheme extraction failed. Check GROQ_API_KEY / GEMINI_API_KEY."
    );
  }

  const response: SearchSchemesResponse = {
    query: body,
    schemes,
    fromCache: false,
    searchedAt: new Date().toISOString(),
    warnings: warnings.length ? warnings : undefined
  };

  if (schemes.length > 0) {
    writeCache(key, response);
  }

  return NextResponse.json(response);
}
