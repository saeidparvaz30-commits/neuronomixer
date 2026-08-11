# Codebase Concerns

**Analysis Date:** 2026-08-11

**Context:** NeuroNomixer is a LIVE production site (www.neuronomixer.com) on Vercel. It has completed a 7-phase security/quality remediation program. This document does not re-report issues already resolved by that program (API keys hashed, indexes added, TLS mail, upload caps, auth/endpoint hardening, a11y pass, Living Sky logo). Everything below is either a currently-live operational hazard or a fresh finding from direct code inspection on 2026-08-11.

---

## Operational Hazards (Verified in Code)

### 1. `npm run build` runs Prisma migrations against the PRODUCTION database

**Verified in `package.json`:**
```json
"build": "prisma generate && prisma migrate deploy && next build"
```
`prisma migrate deploy` is chained directly into the standard build script. Prisma CLI commands (via `prisma.config.ts`) load configuration through `dotenv`'s `config({ path: ".env" })` — see `prisma.config.ts:6`. The repo's local `.env` resolves to the PRODUCTION Supabase database (`DIRECT_URL`), not preview/dev.

**Impact:** Running `npm run build` locally (or any command that shells out to `prisma migrate deploy`/`prisma generate` without first overriding env) applies migrations to PRODUCTION data. This is the single highest-severity local footgun in this codebase.

**Safe local gate:** Use `npx next build` directly — it skips `prisma generate`/`prisma migrate deploy` and only performs the Next.js production build/typecheck. Do not use `npm run build` as a local pre-push verification step.

**Fix approach (not yet applied):** Split `build` into a Vercel-only script (e.g. `build:deploy` used in `vercel.json`/project settings) and a local-safe `next build` alias so `npm run build` cannot accidentally run migrate in a dev shell. Alternatively gate `prisma migrate deploy` behind a `VERCEL=1` env check.

### 2. `.env` vs `.env.local` point at two genuinely different databases

**Verified:** `.env`, `.env.local`, and `.env.vercel-prod` all exist at the repo root (contents not read, per instructions — existence and precedence only).

- Next.js dev server (`next dev`) and any `node --env-file=.env.local` invocation load `.env.local`, which points at the PREVIEW Supabase database. Next.js's built-in env loading order gives `.env.local` precedence over `.env` for local development.
- The Prisma CLI, when invoked directly (`prisma migrate dev`, `prisma studio`, `prisma db push`, etc.), goes through `prisma.config.ts`, which explicitly loads only `.env` (`prisma.config.ts:6`) — `.env.local` is never read by the Prisma CLI in this project. That resolves to PRODUCTION.

**Impact:** `next dev` and `npm run dev` are safely scoped to preview data, but any bare `prisma ...` command on the same machine silently targets production. The two databases hold different content, so a developer who runs `prisma studio` expecting to see preview data will actually be editing production rows, or vice versa when reasoning about "what should be in the DB" while looking at the app in dev mode. This is easy to misread in both directions and has no guard rail (no interactive confirmation prompt, no `--preview-feature` flag) in this codebase today.

**Fix approach:** Add a wrapper script (`scripts/prisma-safe.sh` or an npm script) that prints which database `DIRECT_URL`/`DATABASE_URL` currently resolves to (host only, never the credential) before any `prisma migrate`/`db push`/`studio` command runs, and requires a `--yes-production` flag for anything besides `prisma generate`.

### 3. Vercel preview deployments are unreachable by headless automation

**Reported context (not independently verifiable from this repo's source):** Preview deployments sit behind Vercel SSO/Deployment Protection with no automation-bypass secret configured. Playwright, curl-based smoke checks, and other headless tools cannot authenticate to preview URLs. Verification of any PR/branch preview therefore requires a real authenticated browser session (a human, or `claude-in-chrome` riding the developer's own logged-in session) rather than CI-driven browser automation.

**Impact:** No automated visual/functional regression testing can run against preview URLs today. Any CI step that tries to `curl` or Playwright a `*.vercel.app` preview will get redirected to Vercel's SSO login and fail or hang.

**Fix approach:** Either configure a Vercel Deployment Protection bypass token (`VERCEL_AUTOMATION_BYPASS_SECRET`) for CI, or accept the current model (manual authenticated verification) and don't add automated preview-URL checks to CI until that's done.

### 4. Prisma migrations are hand-authored SQL, not CLI-generated

**Verified:** `prisma/migrations/` contains dated migration directories with SQL files (e.g. `prisma/migrations/20260404203919_add_guide_completion`, `prisma/migrations/20260412130820_add_visual_guide_models`, `prisma/migrations/20260713100000_add_pgvector_content_embedding`). The `pgvector` migration in particular (raw `CREATE EXTENSION`/vector column SQL) is not something `prisma migrate dev` can generate from `schema.prisma` alone, confirming migrations here are hand-written and applied via the deploy pipeline (`prisma migrate deploy`, invoked only through the build script per concern #1).

**Impact:** There is no local, disposable "generate + review diff" loop for schema changes the way a fully CLI-driven Prisma workflow would give you. Every schema change requires hand-writing correct SQL, and testing it safely requires deliberately running `prisma migrate deploy` against the PREVIEW database only (never local `.env`-backed `prisma migrate dev` against production, per concern #1/#2). There is no repo tooling (found) to force this command to target preview.

**Fix approach:** Document (or script) a `DATABASE_URL=<preview> DIRECT_URL=<preview> npx prisma migrate deploy` pattern that developers can run explicitly against preview before merging, since the default config path routes to production.

---

## Fragile Areas

### In-memory, per-instance rate limiting

**File:** `src/lib/rateLimit.ts`

The rate limiter is a plain `Map` in module scope with a `setInterval` sweep, explicitly documented in its own header comment as "best-effort on serverless; good enough for V1... For production, swap the store for an Upstash/Redis-backed solution." It is used to throttle sensitive endpoints including:
- `src/app/api/auth/setup-admin/route.ts` (5 attempts / 15 min per IP — brute-force protection on the one-time admin bootstrap secret)
- `src/app/api/cv/extract/route.ts` (5 extractions / hour per user — caps Anthropic API cost exposure)
- likely other auth and AI-cost-sensitive routes (not exhaustively enumerated here)

**Why fragile:** Vercel serverless/Fluid Compute functions do not guarantee a single warm instance per route. Under concurrent traffic (or after cold starts spin up multiple instances), each instance has its own independent `Map`, so the effective rate limit is `limit × (number of concurrent instances)`, not the stated limit. This is a real bypass vector for both the admin-setup brute-force guard and the AI-cost throttle, not just a performance nit — an attacker distributing requests across enough concurrent connections can multiply their effective quota.

**Safe modification:** Any change to rate-limited routes should not assume the limiter is authoritative. Do not remove other layers (e.g. `crypto.timingSafeEqual` secret comparison in `setup-admin`) in reliance on the rate limiter alone.

**Fix approach:** Replace with an Upstash Redis or Vercel KV-backed limiter (the comment already names Upstash as the intended replacement) for any endpoint where the limit is a real security or cost control, not just UX throttling.

### `Math.random()`-seeded synthetic datasets inside client components rendered on the server

**Files (non-exhaustive, representative sample):**
- `src/components/VisualGuides/RandomForests/RandomForestsClient.tsx` (data-point generator functions at lines ~73-130 call `Math.random()` directly; invoked from `useMemo` during render, not gated behind a `useEffect`/mount check)
- `src/components/VisualGuides/SVM/SVMClient.tsx` (synthetic point generation with `Math.random()` at lines 69-94, same pattern)
- 34 files total under `src/components/VisualGuides/` match `Math.random()` / `new Date()` / `typeof window` patterns (grep on 2026-08-11); most are `"use client"` components.

**Why this matters:** Next.js Client Components (`"use client"`) still render once on the server to produce initial HTML, then hydrate on the client. If a component calls `Math.random()` (or reads `Date.now()`/`window`) directly during the render path — e.g. as a default value passed to `useState`, or inside a `useMemo` with an empty/stable dependency array that runs on first render — the server-rendered markup and the client's first hydration pass can compute different values, producing a React hydration mismatch warning or visibly "flashing" content on load.

**What was verified:** In `RandomForestsClient.tsx`, the point-generating functions (`generateMoons`-style helpers) are plain functions called from inside `useMemo` hooks keyed on component state (`datasetKey`, etc.), not wrapped in a client-only mount guard. This is the exact shape that risks a hydration mismatch on first paint whenever the memoized value is computed during the initial render rather than lazily after mount.

**What was not verified:** Whether React/Next actually logs a hydration warning in production for these specific components — that would require rendering each of the ~34 flagged files and diffing SSR vs. client output, which was out of scope for a static read. This is a pattern-level risk finding, not a confirmed production bug.

**Fix approach for any guide exhibiting a real mismatch:** Move randomized dataset generation into a `useEffect` that runs post-mount and seeds state only client-side (accepting a brief empty/loading state on first paint), or seed with a deterministic PRNG (fixed seed) so SSR and client output match exactly.

### ~797 near-identical guide component trees invite drift

**Verified:** `src/components/VisualGuides/` contains 639 `.tsx` files across ~155 per-topic subdirectories (e.g. `AttentionMechanism/`, `BiasVariance/`, `KVCache/`), each following the same rough shape: a `<Topic>Client.tsx` orchestrator plus several sub-panel components. `src/components/VisualGuides/VISUAL_GUIDES_SPEC.md` exists as a shared spec/contract for the pattern, which mitigates but does not eliminate drift risk.

**Why fragile:** With ~155 independently-authored guide implementations following a shared convention by discipline rather than by shared abstraction (no common base component enforcing the contract at compile time), a fix to a systemic issue — e.g. the hydration pattern above, an accessibility pattern, or a completion-tracking bug — has to be manually propagated file-by-file rather than fixed once in a shared layer. `GuideCompletion` (`src/components/VisualGuides/GuideCompletion` referenced from `RandomForestsClient.tsx:7`) and `useGuideMotion` (`src/lib/guideMotion`) are shared, which is good, but the per-guide interactive logic (data generation, chart rendering, state machines) is duplicated per topic by design.

**Safe modification:** When fixing a bug found in one guide, grep for the same pattern across `src/components/VisualGuides/` before assuming the fix is isolated — do not assume single-file scope for what looks like a component-local bug.

**Test coverage:** No guide-level test files were found under `src/components/VisualGuides/` during this pass (not exhaustively confirmed) — regression protection for these ~800 files relies on manual QA and the shared spec doc, not automated tests.

---

## Security Considerations

### Admin bootstrap endpoint depends on the rate limiter being effective

**File:** `src/app/api/auth/setup-admin/route.ts`

The endpoint correctly uses `crypto.timingSafeEqual` for constant-time secret comparison (line 24) and blocks if any admin already exists (lines 30-38) — both good, already-hardened patterns. However, its brute-force defense against `ADMIN_SETUP_SECRET` guessing is the in-memory rate limiter described above (`checkRateLimit('setup-admin:${ip}', 5, 15 * 60 * 1000)`), which is bypassable across concurrent serverless instances. The secret itself is presumably long/random (not verified — value not read per instructions), which is the primary defense; the rate limit is defense-in-depth only.

### CV extraction endpoint sends user-uploaded document content to Anthropic

**File:** `src/app/api/cv/extract/route.ts`

Verified: properly gated behind `auth()` + role check (`AUTHOR`/`ADMIN` only, line 76), per-user rate-limited (5/hour, line 81), file size capped at 10 MB/file and 30 files total (lines 10-11, 100-102), and text truncated before being sent to the model (8000 chars/file, 20000 total, lines 174/210). Files are explicitly not persisted (line 252 comment, and no `prisma`/blob write for raw file bytes found in this route). This route looks well-hardened; flagged here only as the codebase's primary point where third-party (arbitrary user-uploaded) content is forwarded to an external LLM API, worth keeping in mind for any future prompt-injection-style abuse via crafted CV content — no sanitization of extracted text before it's placed in the Claude prompt was found beyond truncation.

---

## Performance / Scale Notes

### Large static images not obviously optimized

**Verified via `public/pictures/`:**
- `Logo.png` — 5.6 MB
- `contact-bg.jpg` — 2.5 MB
- `saeid-sheikhi.jpg` — 1.7 MB
- `norway-landscape.jpg` — 1.2 MB

**Impact:** These are large for web assets (a 5.6 MB PNG logo in particular is unusual — likely an unoptimized source export rather than a web-ready asset). If any of these are served directly (not exclusively through `next/image` with automatic optimization/resizing), they add meaningful load weight, especially `Logo.png` if it appears in a header/nav rendered on every page. Not verified whether these specific files are actually referenced in rendered pages vs. unused leftovers — worth auditing usage before deciding whether to compress or remove.

**Fix approach:** Re-export `Logo.png` at appropriate dimensions/compression (or convert to SVG/WebP), and confirm all `public/pictures/*` usages route through `next/image`.

---

## Test Coverage Gaps

**Guide components:** No test files found under `src/components/VisualGuides/` for the ~640 interactive guide component files (see "Fragile Areas" above). Given the shared-pattern-but-duplicated-implementation structure, regressions in one guide's interactive logic (e.g. a broken slider, a stat computed incorrectly) would not be caught by any automated suite — only manual QA or user reports.

**Migration testing:** Given concerns #1/#2/#4 above, there is no verified safe local path to test a new hand-authored migration against a non-production database without explicit manual env overrides — this is a process gap, not strictly a code gap, but it directly affects how safely schema changes can be developed and reviewed.

---

*Concerns audit: 2026-08-11*
