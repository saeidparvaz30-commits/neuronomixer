---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 1
current_phase_name: Route Groups
status: executing
stopped_at: ROADMAP.md and STATE.md created; Phase 1 ready to plan
last_updated: "2026-08-13T19:07:19.506Z"
last_activity: 2026-08-13
last_activity_desc: Roadmap created (phase structure approved by Saeid 2026-08-13); 9/9 Active requirements mapped
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
**Current focus:** Phase 1 — Route Groups

## Current Position

Phase: 1 of 5 (Route Groups)
Plan: 0 of 2 in current phase
Status: Ready to execute
Last activity: 2026-08-13 — Roadmap created (phase structure approved by Saeid 2026-08-13); 9/9 Active requirements mapped

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
