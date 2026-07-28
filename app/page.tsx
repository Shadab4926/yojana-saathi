"use client";

import { useState } from "react";
import { Wifi, WifiOff, Search, Landmark, GraduationCap, HandCoins } from "lucide-react";
import VoiceRecorder from "@/components/VoiceRecorder";
import SchemeCard from "@/components/SchemeCard";
import JobCard from "@/components/JobCard";
import {
  INDIAN_STATES,
  LANGUAGES,
  CATEGORIES,
  QUALIFICATIONS,
  JOB_CATEGORIES
} from "@/lib/reference";
import {
  SchemeQuery,
  SearchSchemesResponse,
  JobQuery,
  SearchJobsResponse
} from "@/lib/types";

type Tab = "schemes" | "jobs";
type Status = "idle" | "loading" | "error" | "done";

export default function Home() {
  const [tab, setTab] = useState<Tab>("schemes");
  const [language, setLanguage] = useState("hi-IN");
  const [state, setState] = useState(INDIAN_STATES[24]); // Uttar Pradesh default
  const [online, setOnline] = useState(true);

  // Shared voice/text capture — meaning depends on active tab (occupation
  // description for schemes, extra context for jobs).
  const [situationText, setSituationText] = useState("");
  const [transcript, setTranscript] = useState("");

  // Schemes tab state
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [schemeStatus, setSchemeStatus] = useState<Status>("idle");
  const [schemeResponse, setSchemeResponse] = useState<SearchSchemesResponse | null>(null);
  const [schemeError, setSchemeError] = useState<string | null>(null);

  // Jobs tab state
  const [qualification, setQualification] = useState(QUALIFICATIONS[0]);
  const [jobCategory, setJobCategory] = useState(JOB_CATEGORIES[0]);
  const [jobStatus, setJobStatus] = useState<Status>("idle");
  const [jobResponse, setJobResponse] = useState<SearchJobsResponse | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);

  const handleTranscript = (fullText: string) => {
    setTranscript(fullText);
    setSituationText(fullText);
  };

  const runSchemeSearch = async () => {
    const query: SchemeQuery = {
      state,
      occupation: situationText.trim(),
      category,
      language,
      rawTranscript: transcript || undefined
    };

    if (!query.occupation) {
      setSchemeError(
        "Speak or type your occupation / situation first — e.g. 'small farmer' or 'college student'."
      );
      setSchemeStatus("error");
      return;
    }

    setSchemeStatus("loading");
    setSchemeError(null);

    try {
      const res = await fetch("/api/search-schemes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query)
      });
      setOnline(true);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Search failed (${res.status})`);
      }

      const data: SearchSchemesResponse = await res.json();
      setSchemeResponse(data);
      setSchemeStatus("done");
    } catch (err: any) {
      setOnline(navigator.onLine);
      setSchemeError(err.message || "Something went wrong reaching the live search.");
      setSchemeStatus("error");
    }
  };

  const runJobSearch = async () => {
    const query: JobQuery = {
      state,
      qualification,
      category: jobCategory,
      language,
      rawTranscript: situationText || undefined
    };

    setJobStatus("loading");
    setJobError(null);

    try {
      const res = await fetch("/api/search-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query)
      });
      setOnline(true);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Search failed (${res.status})`);
      }

      const data: SearchJobsResponse = await res.json();
      setJobResponse(data);
      setJobStatus("done");
    } catch (err: any) {
      setOnline(navigator.onLine);
      setJobError(err.message || "Something went wrong reaching the live search.");
      setJobStatus("error");
    }
  };

  const runSearch = tab === "schemes" ? runSchemeSearch : runJobSearch;
  const status = tab === "schemes" ? schemeStatus : jobStatus;
  const errorMsg = tab === "schemes" ? schemeError : jobError;

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-24 pt-8">
      {/* Letterhead */}
      <header className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Landmark className="text-indigo" size={26} />
            <div>
              <h1 className="font-display text-2xl font-black leading-none text-indigo">
                YojanaSaathi
              </h1>
              <p className="font-native text-sm text-marigold-dark">योजना साथी</p>
            </div>
          </div>
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              online ? "bg-verified/10 text-verified" : "bg-red-100 text-red-700"
            }`}
          >
            {online ? <Wifi size={13} /> : <WifiOff size={13} />}
            {online ? "Live" : "Offline"}
          </span>
        </div>
        <div className="gazette-rule mt-4 rounded-full" />
      </header>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 rounded-full border border-line bg-white/60 p-1">
        <button
          type="button"
          onClick={() => setTab("schemes")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold transition ${
            tab === "schemes" ? "bg-indigo text-paper" : "text-indigo/70 hover:bg-indigo/5"
          }`}
        >
          <HandCoins size={15} /> योजनाएं &middot; Schemes
        </button>
        <button
          type="button"
          onClick={() => setTab("jobs")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold transition ${
            tab === "jobs" ? "bg-indigo text-paper" : "text-indigo/70 hover:bg-indigo/5"
          }`}
        >
          <GraduationCap size={15} /> सरकारी नौकरी &middot; Jobs
        </button>
      </div>

      {/* Selectors */}
      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Language
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-lg border border-line bg-white px-2.5 py-2 text-sm text-ink"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.native} ({l.label})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          State
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="rounded-lg border border-line bg-white px-2.5 py-2 text-sm text-ink"
          >
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        {tab === "schemes" ? (
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-line bg-white px-2.5 py-2 text-sm text-ink"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted">
              Qualification
              <select
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                className="rounded-lg border border-line bg-white px-2.5 py-2 text-sm text-ink"
              >
                {QUALIFICATIONS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted">
              Sector
              <select
                value={jobCategory}
                onChange={(e) => setJobCategory(e.target.value)}
                className="rounded-lg border border-line bg-white px-2.5 py-2 text-sm text-ink"
              >
                {JOB_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </section>

      {/* Voice Command Center */}
      <section className="mb-8 flex flex-col items-center rounded-2xl border border-line bg-white/50 py-8">
        <VoiceRecorder language={language} onTranscript={handleTranscript} />
        <div className="mt-5 w-full max-w-md px-4">
          <label className="mb-1 block text-xs font-medium text-muted">
            {tab === "schemes"
              ? "Your situation (spoken or typed)"
              : "Any extra detail (optional, spoken or typed)"}
          </label>
          <textarea
            value={situationText}
            onChange={(e) => setSituationText(e.target.value)}
            placeholder={
              tab === "schemes"
                ? "e.g. Main ek chhota kisan hoon, 2 acre zameen hai…"
                : "e.g. B.Tech pass hoon, government banking job dhundh raha hoon…"
            }
            rows={2}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
          />
        </div>
        <button
          type="button"
          onClick={runSearch}
          disabled={status === "loading"}
          className="mt-4 flex items-center gap-2 rounded-full bg-marigold px-6 py-2.5 text-sm font-semibold text-indigo-dark shadow-sm transition hover:bg-marigold-light disabled:opacity-60"
        >
          <Search size={16} />
          {status === "loading"
            ? "Searching live government databases…"
            : tab === "schemes"
            ? "Find My Schemes"
            : "Find Jobs & Exams"}
        </button>
      </section>

      {/* Results */}
      <section className="flex flex-col gap-4">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo/20 border-t-indigo" />
            Searching live government databases…
          </div>
        )}

        {status === "error" && errorMsg && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {tab === "schemes" && schemeStatus === "done" && schemeResponse && (
          <>
            {schemeResponse.fromCache && (
              <p className="text-xs text-muted">
                Showing a recent cached result (checked within the last 7 days) to save search quota.
              </p>
            )}
            {schemeResponse.warnings?.map((w, i) => (
              <div
                key={i}
                className="rounded-lg border border-marigold/30 bg-marigold/10 px-4 py-2.5 text-xs text-indigo-dark"
              >
                {w}
              </div>
            ))}
            {schemeResponse.schemes.length === 0 ? (
              <div className="rounded-xl border border-line bg-white/50 px-4 py-8 text-center text-sm text-muted">
                No matching schemes found from official sources for this query yet.
                Try a broader category or check back later.
              </div>
            ) : (
              schemeResponse.schemes.map((scheme, i) => (
                <SchemeCard key={i} scheme={scheme} language={language} />
              ))
            )}
          </>
        )}

        {tab === "jobs" && jobStatus === "done" && jobResponse && (
          <>
            {jobResponse.fromCache && (
              <p className="text-xs text-muted">
                Showing a recent cached result (checked within the last 18 hours) to save search quota.
              </p>
            )}
            {jobResponse.warnings?.map((w, i) => (
              <div
                key={i}
                className="rounded-lg border border-marigold/30 bg-marigold/10 px-4 py-2.5 text-xs text-indigo-dark"
              >
                {w}
              </div>
            ))}
            {jobResponse.jobs.length === 0 ? (
              <div className="rounded-xl border border-line bg-white/50 px-4 py-8 text-center text-sm text-muted">
                No matching recruitment notices found from official sources for this query yet.
                Try a broader sector or check back later.
              </div>
            ) : (
              jobResponse.jobs.map((job, i) => (
                <JobCard key={i} job={job} language={language} />
              ))
            )}
          </>
        )}
      </section>
    </main>
  );
}
