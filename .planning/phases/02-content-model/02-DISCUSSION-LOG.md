# Phase 2: Content Model - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-20
**Phase:** 2-Content Model
**Areas discussed:** Filter reach, Filter semantics, Studio split UX, Migration gate

---

## Filter reach

Scout finding presented first: `_type == "post"` GROQ lives in ~22 files, not just the roadmap's "three blog page files" — homepage, authors, sitemap, /api/v1/posts (nnx-search feed), review page, dashboards, cron.

| Option | Description | Selected |
|--------|-------------|----------|
| All public surfaces | 3 blog pages + homepage + authors + sitemap + /api/v1/posts + review via the shared module now; dashboards/admin/cron deliberately unfiltered | ✓ |
| Blog pages only (roadmap-minimal) | Only the 3 blog pages now; mandatory Phase-5 pre-publish task extends the filter | |
| Blog now + defensive guard elsewhere | Shared module for blog; one-line `language != "fa"` in place elsewhere, unified later | |

**User's choice:** All public surfaces (recommended option).

---

## Filter semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Tolerant filter + stamp creation | `(!defined(language) \|\| language == "en")` AND creation paths stamp `language: "en"` | ✓ |
| Strict filter, stamp everywhere | Exactly `language == "en"`; any missed creation path silently vanishes | |
| Tolerant filter only | No creation-path changes; undefined permanently means English | |

**User's choice:** Tolerant filter + stamp creation (recommended option).
**Notes:** Driven by the fact that Studio `initialValue` does not apply to API writes from the dashboard author flow.

---

## Studio split UX

| Option | Description | Selected |
|--------|-------------|----------|
| Two top-level lists | "Posts — English" / "Posts — Farsi"; Farsi previews subtitle the English source title; translationOf filtered to English posts | ✓ |
| Farsi as review queue | Farsi list ordered drafts-first with translationNotes in preview | |
| Nested under one Posts group | Compact sidebar, one extra click | |

**User's choice:** Two top-level lists (recommended option).

---

## Migration gate

| Option | Description | Selected |
|--------|-------------|----------|
| Dry-run default + Saeid gate | Report by default; mutation only via `--execute` after explicit go | ✓ |
| Dry-run + dataset export + gate | Same plus a `sanity dataset export` backup first | |
| Just run it | Report + mutation in one pass, no gate | |

**User's choice:** Dry-run default + gate (recommended option). No dataset export required — `setIfMissing` is additive and idempotent.

---

## Claude's Discretion

- Query module file shape (defineQuery vs plain strings, export/param conventions), as long as the language filter is expressed exactly once.
- `/review?key=` treatment may flip to unfiltered if research shows it reviews submissions across languages.
- Exact `src/sanity/structure.ts` code layout.

## Deferred Ideas

- Dashboard-side language columns/filters (Phase 4/5 if needed).
- `package-lock.json` repair and `/cv/[slug]` build-query guard — pre-existing repo issues, outside this phase.
