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
Status: Blocked on a pre-existing node_modules package-manager conflict (see Blockers)
Last activity: 2026-08-16 — Phase 01 execution halted at Task 1; no commits made, no files moved

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

- **BLOCKING (2026-08-16, plan 01-01 Task 1): the tree is RED at HEAD.** Both `npx tsc --noEmit` and `npx next build` fail with 2 pre-existing type errors in `src/app/dashboard/author/submit/SubmitPostForm.tsx` (TS2322 at :51, TS2769 at :160). Cause: `node_modules/` is a hybrid npm+pnpm tree. Every direct dependency in `package.json` is a pnpm symlink into `node_modules/.pnpm/`, but `@tiptap/core` is a **phantom (undeclared) dependency** imported at `SubmitPostForm.tsx:6`, so it resolves to a stale npm-era real directory at `@tiptap/core@3.22.3` (Apr 12) while `@tiptap/react` resolves through `.pnpm/` to `@tiptap/core@3.29.2`. Two type identities for the same package. Same split affects `prosemirror-model` (1.25.4 vs 1.25.11). Resolution requires a package-manager decision (which lockfile is authoritative: tracked `package-lock.json` vs untracked `pnpm-lock.yaml`) plus possibly declaring `@tiptap/core` in `package.json`. Both are Saeid-only calls: forbidden by plan 01-01 hard constraint 2 and by the executor's package-manager exclusion from auto-fix. **Phase 01 cannot proceed until this is resolved** — the ROUTE-02 proof requires a green build to emit `.next/app-path-routes-manifest.json`, which is not currently produced.
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
