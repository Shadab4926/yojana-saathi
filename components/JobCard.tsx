"use client";

import { useState } from "react";
import {
  Volume2,
  Square,
  ExternalLink,
  FileText,
  Users,
  IndianRupee,
  CalendarClock,
  AlertTriangle
} from "lucide-react";
import { JobResult } from "@/lib/types";
import { daysLeft } from "@/lib/dates";

interface JobCardProps {
  job: JobResult;
  language: string;
}

export default function JobCard({ job, language }: JobCardProps) {
  const [speaking, setSpeaking] = useState(false);
  const remaining = daysLeft(job.applicationEndDate);

  const speak = () => {
    if (!("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const title = job.postNameNative || job.postNameEnglish;
    const text = `${title}, ${job.organization}. Kul rikt sthaan: ${job.totalVacancies}. Patrata: ${job.eligibility}. Aakhri tareekh: ${job.applicationEndDate}.`;
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
          {job.postNameNative && (
            <h3 className="font-native text-xl text-indigo">{job.postNameNative}</h3>
          )}
          <p className="text-sm font-medium text-muted">{job.postNameEnglish}</p>
          {job.organization && (
            <p className="mt-0.5 text-xs text-muted">{job.organization}</p>
          )}
        </div>
        {remaining !== null && (
          <span
            className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              remaining < 0
                ? "bg-muted/20 text-muted"
                : remaining <= 5
                ? "bg-red-100 text-red-700"
                : "bg-marigold/15 text-marigold-dark"
            }`}
          >
            <CalendarClock size={12} />
            {remaining < 0 ? "Closed" : `${remaining} day${remaining === 1 ? "" : "s"} left`}
          </span>
        )}
      </header>

      <div className="grid gap-3 text-sm">
        <div className="flex flex-wrap gap-4">
          {job.totalVacancies && (
            <span className="flex items-center gap-1.5 text-ink">
              <Users size={14} className="text-marigold-dark" /> {job.totalVacancies} posts
            </span>
          )}
          {job.applicationFee && (
            <span className="flex items-center gap-1.5 text-ink">
              <IndianRupee size={14} className="text-marigold-dark" /> {job.applicationFee}
            </span>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-marigold-dark">Eligibility</p>
          <p className="text-ink">{job.eligibility || "See official notification for details."}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Applications open</p>
            <p className="text-ink">{job.applicationStartDate || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Last date</p>
            <p className="text-ink">{job.applicationEndDate || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Exam date</p>
            <p className="text-ink">{job.examDate || "—"}</p>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-1.5 rounded-md bg-marigold/10 px-2.5 py-2 text-[11px] text-indigo-dark">
        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
        Always confirm exact dates and fees on the official notification before applying.
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
        {job.sourceSnippetUrl && (
          <a
            href={job.sourceSnippetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-muted underline decoration-dotted hover:text-indigo"
          >
            Source: {job.sourceDomain || job.sourceSnippetUrl}
          </a>
        )}
        <div className="ml-auto flex gap-2">
          {job.notificationLink && (
            <a
              href={job.notificationLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full border border-indigo/30 px-3.5 py-1.5 text-xs font-semibold text-indigo transition hover:bg-indigo/5"
            >
              <FileText size={13} /> Notification
            </a>
          )}
          {job.applicationPortalLink && (
            <a
              href={job.applicationPortalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-indigo px-3.5 py-1.5 text-xs font-semibold text-paper transition hover:bg-indigo-light"
            >
              Apply Now <ExternalLink size={13} />
            </a>
          )}
        </div>
      </footer>
    </article>
  );
}
