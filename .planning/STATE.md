---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 01
current_phase_name: route-groups
status: executing
stopped_at: ROADMAP.md and STATE.md created; Phase 1 ready to plan
last_updated: "2026-08-16T11:01:36.425Z"
last_activity: 2026-08-16
last_activity_desc: Phase 01 execution started
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 2
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-11)

**Core value:** Every published claim is correct and checkable; anything that puts unverified content under Saeid's byline is a failure regardless of reach.
**Current focus:** Phase 01 — route-groups

## Current Position

Phase: 01 (route-groups) — BLOCKED
Plan: 1 of 2 (plan 01-01, Task 1 of 3 — halted at the green-at-HEAD gate)
Status: Blocked on an unreachable dev database breaking `npx next build` (see Blockers). The earlier npm/pnpm conflict is resolved; `npx tsc --noEmit` is green.
Last activity: 2026-08-16 — Phase 01 halted at Task 1 Part C step 3; nothing under src/app moved

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Recent decisions affecting current work:

- Route groups with two root layouts, not a `[locale]` segment (design spec 2026-08-11)
- Two plain Sanity fields (`language`, `translationOf`) instead of the i18n plugin — no new dependency
- Claude Sonnet 5 via Batch API; translate → verify → human publish (drafts only)
- Jalali calendar with Persian digits via `Intl.DateTimeFormat('fa-IR')` (approved)
- Backlog run covers ALL ~30 posts (approved)
- Declined: `neuronomixer.ir` registration (Saeid, 2026-08-13)

### Pending Todos

None yet.

### Blockers/Concerns

- **RESOLVED 2026-08-16 (npm/pnpm conflict).** `node_modules/` had been a hybrid npm+pnpm tree, making `@tiptap/core` resolve to two identities and failing `tsc`. Saeid chose npm as authoritative. Remediation applied: `node_modules` wiped, `pnpm-lock.yaml` + `pnpm-workspace.yaml` deleted (backed up to the session scratchpad), tree reinstalled, `npx prisma generate` re-run. **`npx tsc --noEmit` now exits 0.** Note `npm ci` could NOT be used: `package-lock.json` is itself out of sync with `package.json` **at HEAD as well as in the working copy** — `@sanity/visual-editing@3.0.5` requires `@sanity/client@^7.8.2`, its dependency edge is unrecorded in the lock, and the nested lock entry pins `@sanity/client@6.29.1`, so npm resolves 7.26.2 from the registry and rejects the lock. Install was therefore done with `npm install --no-package-lock`, which left `package.json` and `package-lock.json` byte-identical (verified against the frozen fingerprint). **The lockfile is still broken and needs a real `npm install` to repair — deferred, since repairing it rewrites a tracked lockfile that plan 01-01 freezes.**
- **BLOCKING (2026-08-16, plan 01-01 Task 1; retried and still failing): `npx next build` fails on an unreachable DEV database.** Types and lint both pass; the build fails later, at "Collecting page data", on `/cv/[slug]`'s `generateStaticParams` calling `prisma.authorCV.findMany()`. Supabase pooler returns `(ENOTFOUND) tenant/user postgres.wbfrsrnusmoqjquvfbra not found` (code XX000 / P2039). That ref is the **dev** project from `.env.local` (eu-central-1); production in `.env` is a different ref on eu-north-1. DNS for the pooler host resolves fine, so the project itself is paused, deleted, or renamed. Pre-existing and unrelated to the route move — it was previously masked because the build aborted earlier at the type-check step, and no build has completed in this repo since Jul 22. Unlike `sitemap.ts` (whose build-time query is wrapped in try/catch), `/cv/[slug]`'s `generateStaticParams` has no fallback, so an unreachable dev DB is fatal to the build. **Phase 01 cannot proceed:** ROUTE-02 is proven by diffing `.next/app-path-routes-manifest.json`, which is never emitted without a successful build. Needs Saeid to resume/restore the dev Supabase project or supply a working dev `DATABASE_URL`. Do NOT point the build at production to work around this.
- NEVER `npm run build` locally — it runs `prisma migrate deploy` against the PRODUCTION DB (Prisma CLI reads `.env` = prod; Next.js reads `.env.local` = preview). Build gate is `npx next build`.
- Phase 2 hard ordering invariant: the `language == "en"` query filter must be live BEFORE the first Farsi document exists.
- Phase 3 first run must be a dry-run to a scratch dataset.
- Vercel previews sit behind SSO with no bypass secret — browser smoke rides Saeid's authenticated Chrome, not Playwright.
- `content/fa-glossary.json` needs Saeid's correction pass after the drafted first pass (Phase 3 input).

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Scope | Farsi translation of the 151 visual guides | Out of scope this milestone | 2026-08-11 |
| Scope | Farsi-native original content | Out of scope this milestone | 2026-08-11 |
| Scope | Serving readers inside Iran / second origin | Out of scope this milestone | 2026-08-11 |

## Session Continuity

Last session: 2026-08-13
Stopped at: ROADMAP.md and STATE.md created; Phase 1 ready to plan
Resume file: None
