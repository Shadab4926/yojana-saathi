"use client";

import { useState } from "react";
import { Volume2, Square, ExternalLink, FileCheck2, ShieldCheck } from "lucide-react";
import { SchemeResult } from "@/lib/types";

interface SchemeCardProps {
  scheme: SchemeResult;
  language: string;
}

export default function SchemeCard({ scheme, language }: SchemeCardProps) {
  const [speaking, setSpeaking] = useState(false);

  const speak = () => {
    if (!("speechSynthesis" in window)) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const title = scheme.nameNative || scheme.nameEnglish;
    const text = `${title}. ${scheme.benefits}. Patrata: ${scheme.eligibility}.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-line bg-white/70 p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          {scheme.nameNative && (
            <h3 className="font-native text-xl text-indigo">{scheme.nameNative}</h3>
          )}
          <p className="text-sm font-medium text-muted">{scheme.nameEnglish}</p>
        </div>
        <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-verified/10 px-2.5 py-1 text-[11px] font-medium text-verified">
          <ShieldCheck size={12} />
          {scheme.sourceDomain || "gov.in"}
        </span>
      </header>

      <div className="grid gap-3 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-marigold-dark">Benefits</p>
          <p className="text-ink">{scheme.benefits || "See official source for details."}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-marigold-dark">Eligibility</p>
          <p className="text-ink">{scheme.eligibility || "See official source for details."}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-marigold-dark">How to apply</p>
          <p className="text-ink">{scheme.applicationProcess || "See official source for details."}</p>
        </div>
        {scheme.requiredDocuments.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-marigold-dark">Documents needed</p>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {scheme.requiredDocuments.map((doc, i) => (
                <li
                  key={i}
                  className="flex items-center gap-1 rounded-md bg-indigo/5 px-2 py-1 text-xs text-indigo"
                >
                  <FileCheck2 size={12} /> {doc}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <button
          type="button"
          onClick={speak}
          className="flex items-center gap-1.5 rounded-full border border-indigo/20 px-3 py-1.5 text-xs font-medium text-indigo transition hover:bg-indigo/5"
        >
          {speaking ? <Square size={13} /> : <Volume2 size={13} />}
          {speaking ? "Stop" : "Audio Summarize"}
        </button>
        {scheme.sourceSnippetUrl && (
          <a
            href={scheme.sourceSnippetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-muted underline decoration-dotted hover:text-indigo"
          >
            Source: {scheme.sourceDomain || scheme.sourceSnippetUrl}
          </a>
        )}
        {scheme.officialLink ? (
          <a
            href={scheme.officialLink}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 rounded-full bg-indigo px-3.5 py-1.5 text-xs font-semibold text-paper transition hover:bg-indigo-light"
          >
            Apply via Official Portal
            <ExternalLink size={13} />
          </a>
        ) : (
          <a
            href={`https://www.myscheme.gov.in/search?q=${encodeURIComponent(
              scheme.nameEnglish || scheme.nameNative
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 rounded-full border border-marigold-dark/40 px-3.5 py-1.5 text-xs font-semibold text-marigold-dark transition hover:bg-marigold/10"
          >
            No direct link found — search myScheme.gov.in
            <ExternalLink size={13} />
          </a>
        )}
      </footer>
    </article>
  );
}
