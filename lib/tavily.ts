import { SchemeQuery, JobQuery, TavilySearchResult } from "./types";

const TAVILY_ENDPOINT = "https://api.tavily.com/search";

/**
 * Builds a search query scoped to official Indian government domains,
 * mirroring the "site:myscheme.gov.in OR site:pib.gov.in OR site:<state>.gov.in"
 * pattern requested in the product spec.
 */
export function buildGovQuery(q: SchemeQuery): string {
  const year = new Date().getFullYear();
  const stateSlug = q.state
    .toLowerCase()
    .replace(/\s+/g, "");

  const siteScope = [
    "site:myscheme.gov.in",
    "site:pib.gov.in",
    `site:${stateSlug}.gov.in`
  ].join(" OR ");

  const parts = [
    `(${siteScope})`,
    "latest welfare scheme",
    q.occupation,
    q.category,
    q.gender,
    q.incomeBracket ? `income ${q.incomeBracket}` : "",
    `in ${q.state}`,
    `${year}`
  ].filter(Boolean);

  return parts.join(" ");
}

/**
 * Builds a search query scoped to official Indian government recruitment
 * and exam-notification domains.
 */
export function buildJobQuery(q: JobQuery): string {
  const year = new Date().getFullYear();
  const stateSlug = q.state.toLowerCase().replace(/\s+/g, "");

  const siteScope = [
    "site:ssc.nic.in",
    "site:upsc.gov.in",
    "site:ibps.in",
    "site:rrbcdg.gov.in",
    "site:employmentnews.gov.in",
    "site:ncs.gov.in",
    `site:${stateSlug}.gov.in`
  ].join(" OR ");

  const parts = [
    `(${siteScope})`,
    "latest recruitment notification vacancy",
    q.qualification,
    q.category,
    `in ${q.state}`,
    `${year}`
  ].filter(Boolean);

  return parts.join(" ");
}

export async function searchGovJobs(
  query: string,
  apiKey: string
): Promise<TavilySearchResult[]> {
  return searchTavily(query, apiKey, [
    "ssc.nic.in",
    "upsc.gov.in",
    "ibps.in",
    "rrbcdg.gov.in",
    "employmentnews.gov.in",
    "ncs.gov.in",
    "gov.in",
    "nic.in"
  ]);
}

export async function searchGovSchemes(
  query: string,
  apiKey: string
): Promise<TavilySearchResult[]> {
  return searchTavily(query, apiKey, [
    "myscheme.gov.in",
    "pib.gov.in",
    "gov.in",
    "nic.in"
  ]);
}

async function searchTavily(
  query: string,
  apiKey: string,
  includeDomains: string[]
): Promise<TavilySearchResult[]> {
  const res = await fetch(TAVILY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "advanced",
      max_results: 8,
      include_answer: false,
      // "text" pulls the full cleaned page content, not just a short snippet —
      // short snippets were the reason eligibility/application-process fields
      // kept coming back as "See official source for details."
      include_raw_content: "text",
      // Nudge Tavily toward official sources; it still free-searches the open web
      include_domains: includeDomains
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Tavily search failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const results: TavilySearchResult[] = (data.results || []).map((r: any) => ({
    title: r.title,
    url: r.url,
    // Prefer the full raw page text when available; fall back to the short
    // snippet if Tavily couldn't extract full content for that page (some
    // gov.in pages block scraping / are PDF-rendered).
    content: r.raw_content && r.raw_content.length > 0 ? r.raw_content : r.content,
    score: r.score ?? 0
  }));

  return results;
}
