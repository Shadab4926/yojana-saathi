import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { SchemeQuery, JobQuery } from "./types";

// /tmp is the ONLY writable path in Vercel's serverless functions — the rest
// of the deployment bundle (including a project-local data/ folder) is
// read-only at runtime. Writing there throws EROFS and crashes the request.
// Self-hosting (Docker/your own box) can write anywhere, so /tmp still works
// fine there too.
const CACHE_DIR = path.join(os.tmpdir(), "yojanasaathi-cache");

export const SCHEME_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — schemes barely change
// Job/exam deadlines shift day to day — a 7-day TTL here would risk showing
// a stale "last date to apply" and actively causing someone to miss it.
export const JOB_CACHE_TTL_MS = 18 * 60 * 60 * 1000; // 18 hours

function ensureCacheDir(): boolean {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    return true;
  } catch (err) {
    console.error("Cache dir unavailable, continuing without cache:", err);
    return false;
  }
}

export function cacheKeyFor(
  namespace: "schemes" | "jobs",
  q: SchemeQuery | JobQuery
): string {
  const fields =
    namespace === "schemes"
      ? [
          (q as SchemeQuery).state,
          (q as SchemeQuery).occupation,
          (q as SchemeQuery).category || "",
          (q as SchemeQuery).gender || "",
          (q as SchemeQuery).incomeBracket || ""
        ]
      : [
          (q as JobQuery).state,
          (q as JobQuery).qualification,
          (q as JobQuery).category || ""
        ];

  const normalized = fields.map((f) => f.toLowerCase().trim()).join("|");
  const hash = crypto.createHash("sha1").update(normalized).digest("hex");
  return `${namespace}-${hash}`;
}

export function readCache<T extends { searchedAt: string }>(
  key: string,
  ttlMs: number
): T | null {
  try {
    if (!ensureCacheDir()) return null;
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed: T = JSON.parse(raw);
    const age = Date.now() - new Date(parsed.searchedAt).getTime();
    if (age > ttlMs) return null;
    return parsed;
  } catch (err) {
    console.error("Cache read failed, continuing without cache:", err);
    return null;
  }
}

export function writeCache<T>(key: string, response: T) {
  try {
    if (!ensureCacheDir()) return;
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    fs.writeFileSync(filePath, JSON.stringify(response, null, 2), "utf-8");
  } catch (err) {
    // Never let a cache-write failure take down a successful search result.
    console.error("Cache write failed, response still returned to user:", err);
  }
}

/**
 * NOTE on Vercel specifically: /tmp is per-instance and ephemeral — it does
 * NOT persist reliably across cold starts or between different serverless
 * instances, so on Vercel this cache mainly helps within a short burst of
 * repeat requests, not long-term quota protection. For real cross-request
 * persistence on Vercel, swap this for a free-tier KV store (Vercel KV or
 * Upstash Redis both have free tiers) using the same cacheKeyFor/read/write
 * function signatures. Self-hosting on your own Docker/Windows box doesn't
 * have this limitation — /tmp there behaves like a normal persistent folder
 * for as long as the container runs.
 */
