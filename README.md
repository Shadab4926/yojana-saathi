# YojanaSaathi — योजना साथी

Voice-driven, live government welfare scheme finder for India. No mock data — every
result comes from a live Tavily search scoped to official `.gov.in` domains, parsed
into structured fields by Groq (primary) or Gemini (fallback).

## Zero-cost stack

| Layer | Tool | Free tier |
|---|---|---|
| STT | Browser `webkitSpeechRecognition` | Free, no key |
| TTS | Browser `speechSynthesis` | Free, no key |
| Live search | Tavily API | 1,000 searches/month |
| Extraction | Groq (`llama-3.3-70b-versatile`) → Gemini (`gemini-2.0-flash`) fallback | Free rate-limited tiers |
| Cache | Local filesystem (`data/cache/`) | Free — protects your Tavily quota |
| Hosting | Vercel Hobby or self-host on your own box | Free |

## Setup

```bash
npm install
cp .env.example .env.local
# fill in TAVILY_API_KEY, GROQ_API_KEY, GEMINI_API_KEY in .env.local
npm run dev
```

Open http://localhost:3000. Voice input requires Chrome or Edge (Web Speech API
isn't implemented in Firefox/Safari) — the app falls back to the text field
automatically if unsupported.

## How the pipeline works

1. You speak or type your situation (occupation/category) and pick your state.
2. `/api/search-schemes` first checks `data/cache/` for a result from the last
   7 days — schemes don't change hour to hour, so this avoids burning Tavily
   quota on repeat testing.
3. On a cache miss, it builds a query like:
   `(site:myscheme.gov.in OR site:pib.gov.in OR site:up.gov.in) latest welfare
   scheme farmer general in Uttar Pradesh 2026`
   and sends it to Tavily, scoped toward `gov.in` / `nic.in` domains.
4. Raw search snippets go to Groq (falls back to Gemini) with a strict prompt:
   extract only schemes actually present in the source text — no inventing
   names, amounts, or links.
5. Structured results are cached and returned to the UI as scheme cards, each
   with a source domain badge, an audio-summarize button (speechSynthesis),
   and a direct link to the official portal.

## Important limits to know about

- **Tavily free tier = 1,000 searches/month.** The 7-day cache is there specifically
  to stop dev/testing from eating that quota — don't remove it without adding a
  replacement rate limit.
- **Deploying to Vercel:** the filesystem cache in `lib/cache.ts` works great for
  self-hosting (your existing Docker/Windows box) but Vercel's serverless
  filesystem is ephemeral per-invocation. If you deploy there, swap `lib/cache.ts`
  for Vercel KV or Upstash Redis (both have free tiers) so the cache actually
  persists.
- **Indian-language TTS voice quality** depends on what voices are installed on
  the visitor's OS/browser — Hindi is generally solid, some regional languages
  (Kannada, Gujarati) may sound robotic or be missing entirely on some devices.
- **No official myscheme.gov.in API exists.** This build relies on Tavily's web
  search scoped to gov domains rather than scraping myscheme.gov.in directly —
  more resilient, though it means results are as good as what's publicly
  indexed and snippet-visible.
- Extraction is instructed not to invent scheme names/amounts/links not present
  in the source snippets, but always double-check a scheme's official link
  before telling someone to rely on it — LLM extraction from noisy snippets can
  still misread details.

## Project structure

```
app/
  page.tsx                    — main UI (letterhead header, voice center, results)
  api/search-schemes/route.ts — cache -> Tavily -> Groq/Gemini pipeline
  layout.tsx, globals.css
components/
  VoiceRecorder.tsx           — Web Speech STT with pulsing mic UI
  SchemeCard.tsx               — result card with speechSynthesis playback
lib/
  tavily.ts     — gov-scoped query builder + Tavily client
  extract.ts    — Groq/Gemini structured extraction
  cache.ts      — filesystem cache (7-day TTL)
  types.ts, reference.ts, speech.d.ts
```
