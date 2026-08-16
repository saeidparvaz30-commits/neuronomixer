---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 01
current_phase_name: route-groups
status: executing
stopped_at: Plan 01-01 complete; next is plan 01-02 (the (fa) scaffold)
last_updated: "2026-08-16T20:24:00.000Z"
last_activity: 2026-08-16
last_activity_desc: Plan 01-01 complete: (en) route group move, 284 URLs unchanged
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 2
  completed_plans: 1
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-11)

**Core value:** Every published claim is correct and checkable; anything that puts unverified content under Saeid's byline is a failure regardless of reach.
**Current focus:** Phase 01 — route-groups

## Current Position

Phase: 01 (route-groups) - EXECUTING
Plan: 1 of 2 complete. Plan 01-01 landed; next is plan 01-02, the (fa) scaffold.
Status: Plan 01-01 complete. All 243 English route files live in `src/app/(en)/`, all 284 emitted URLs are byte-identical, route smoke 28/28, mobile gate 151 slugs.
Last activity: 2026-08-16 - move commit 411eebc, evidence commit 0e10bfc

Progress: [#####-----] 50%

## Performance Metrics

**Velocity:**

- Total plans completed: 1
- Average duration: ~1h30m active execution per plan
- Total execution time: ~1.5 hours active (~9h15m wall clock including three human checkpoints)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 route-groups | 1/2 | ~1h30m active | ~1h30m |

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
- npm is the authoritative package manager; `pnpm-lock.yaml` and `pnpm-workspace.yaml` deleted (Saeid, 2026-08-16)
- OQ-1 resolved: enable `experimental.globalNotFound` plus `src/app/global-not-found.tsx` to keep the branded 404 once the sole root layout moved into `(en)` (Saeid, 2026-08-16)
- Accepted that the global 404 no longer carries nav and footer, since `global-not-found.tsx` renders outside every layout (Saeid, 2026-08-16)

### Pending Todos

None yet.

### Blockers/Concerns

- **OPEN: `package-lock.json` is out of sync with `package.json`, so `npm ci` cannot run.** Predates this phase and is present at HEAD as well as in the working copy. `@sanity/visual-editing@3.0.5` requires `@sanity/client@^7.8.2`, its dependency edge is unrecorded in the lock, and the nested lock entry pins `@sanity/client@6.29.1`; npm resolves 7.26.2 from the registry and rejects the lock. Repair needs a real `npm install`, which rewrites the tracked lockfile, so it was deliberately deferred out of plan 01-01. Until it is fixed, `npm ci` is unavailable locally, in CI and on Vercel. Local `node_modules` currently comes from `npm install --no-package-lock`.
- **OPEN (low priority): `/cv/[slug]`'s `generateStaticParams` has no try/catch fallback**, so an unreachable database fails the entire build. `sitemap.ts` already guards its build-time query this way. Surfaced when the dev DB was paused on 2026-08-16.
- Note: `experimental.globalNotFound` is now enabled in `next.config.ts`. It is an experimental Next.js flag, so any Next.js upgrade should re-verify the branded 404 before deploy.
- Resolved during plan 01-01 and recorded in `01-01-SUMMARY.md`: the hybrid npm/pnpm `node_modules` conflict, the paused Supabase dev project, and the global 404 regression (OQ-1).
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

Last session: 2026-08-16
Stopped at: Plan 01-01 complete (move commit 411eebc); next is plan 01-02, the (fa) scaffold
Resume file: None
