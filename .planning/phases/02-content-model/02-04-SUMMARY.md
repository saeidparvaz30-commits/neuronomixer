---
phase: 02-content-model
plan: 04
subsystem: sanity-migration
tags: [sanity, migration, content-model, language, dry-run]

# Dependency graph
requires:
  - phase: 02-content-model
    provides: "Plan 02-03's schema fields (language on postType) and the check script's reserved --post-migration branch; plan 02-02's EN_LANGUAGE predicate whose tolerant form the migration makes redundant for existing posts."
provides:
  - "`scripts/migrate-post-language.ts`: dry-run-by-default, dataset-explicit (no env fallback), additive set-if-missing stamp of `language: \"en\"`, single-transaction execute, post-run recount."
  - "`--post-migration` mode on `scripts/checks/language-filter.check.ts`: raw-perspective completeness count plus language distribution, independent of the migration's own output."
  - "Dev dataset `blog_posts_dev` fully stamped: 17/17, idempotence proven by a second --execute reporting nothing to do."
  - "Production dataset `blog_posts` fully stamped: 26/26, executed on Saeid's in-session go 2026-08-21, independently verified en=26 fa=0 none=0."
affects: [02-05 studio split, 03-translation-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Migration scripts read NEXT_PUBLIC_SANITY_DATASET with a non-null assertion and NO fallback, and print projectId + dataset + mode as the first line of every run (Pitfall 6 defence)."
    - "Dry run performs exactly one server-validated commit that persists nothing — this both validates the mutation shape and proves token write scope before any loop starts (closes research assumption A1)."
    - "Independent verification: the check script re-counts through its own raw-perspective client rather than trusting the migration's success line."

key-files:
  created:
    - scripts/migrate-post-language.ts
    - .planning/phases/02-content-model/artifacts/migration-dev.log
    - .planning/phases/02-content-model/artifacts/migration-prod.log
  modified:
    - scripts/checks/language-filter.check.ts

key-decisions:
  - "Task 3 checkpoint spanned two sessions: the 2026-08-20 session ran the production dry run and paused; the 2026-08-21 session re-ran the dry run fresh (per the plan's no-stale-approval rule), confirmed identical state (blog_posts, 26 docs, write scope OK), and Saeid answered execute-now in-session."
  - "Production execute used a single transaction commit of 26 set-if-missing patches; recount reported 0 remaining."

requirements-completed: [CONTENT-01]

coverage:
  - id: D1
    description: "Dev dataset blog_posts_dev stamped 17/17 with idempotence demonstrated (second --execute: 'Nothing to do')."
    requirement: "CONTENT-01"
    verification:
      - kind: integration
        evidence: "artifacts/migration-dev.log: EXECUTE stamped 17, remaining 0; idempotence re-run 'Nothing to do'."
  - id: D2
    description: "Production dataset blog_posts stamped 26/26 behind the D-09 gate."
    requirement: "CONTENT-01"
    verification:
      - kind: integration
        evidence: "artifacts/migration-prod.log: header 'projectId=pz9ppas8 dataset=blog_posts ... mode=EXECUTE', 'EXECUTE: stamped 26 post document(s)', 'Remaining without a language field in blog_posts: 0'."
      - kind: integration
        evidence: "language-filter.check.ts --post-migration (prod): 'language distribution en=26 fa=0 none=0', ALL PASS; --live parity identical on all 9 queries."
---

# Plan 02-04 Summary: language migration, both datasets stamped

## What ran

**Dev (2026-08-20 session):** dry run named `blog_posts_dev`, listed 17 unstamped posts, validated the mutation server-side writing nothing (proving the dev token's write scope, research A1). Execute stamped 17, recount 0. Second `--execute` printed `Nothing to do: every post in blog_posts_dev already carries a language field.` — idempotence proven. `--post-migration` reported zero unstamped, distribution en=17 fa=0 none=0. `--live` parity stayed identical, so the D-03 filter remains provably inert.

**Checkpoint (Task 3, D-09 gate):** paused end-of-day 2026-08-20 after presenting the production dry run. Resumed 2026-08-21: fresh production dry run re-presented in-session (header `projectId=pz9ppas8 dataset=blog_posts apiVersion=2025-10-07 mode=DRY RUN`, 26 documents, `DRY RUN: mutation validated server-side, nothing written` — production token write scope confirmed). **Saeid's answer, verbatim: "Execute now"** (chosen from execute-now/defer/report-only).

**Production execute (2026-08-21):** `npx tsx --env-file .env.vercel-prod scripts/migrate-post-language.ts --execute` → `EXECUTE: stamped 26 post document(s) with language "en" in blog_posts.` / `Remaining without a language field in blog_posts: 0`. Full output (dry run + execute) in `artifacts/migration-prod.log`.

**Independent verification (production):** `--post-migration` under a raw-perspective client: zero unstamped, distribution **en=26 fa=0 none=0**, ALL PASS. `--live`: all 9 query parity assertions identical (26/9/1/26/1/20/26/26/26 rows), slug uniqueness max 1 English match each — the tolerant-vs-strict refactor is inert on production data too.

## Outcome

Roadmap Phase 2 success criterion 3 is **fully met for both datasets**. English is now explicit in the data; the Studio language lists in plan 02-05 will be exact rather than tolerance-dependent, and the Phase 3 pipeline builds against a fully classified production dataset.

No `.env` file touched or staged; no file under `src/` modified; package manifests byte-unchanged; `npx tsc --noEmit` clean at plan close.

## Notes

- Research assumption A2 (`.env.vercel-prod` never diffed against live Vercel env) was surfaced at the checkpoint; the printed dataset header made the target visible and it matched the intended production dataset, so no independent `vercel env ls` pass was requested.
- Pre-existing working-tree drift (`.planning/config.json`, `package-lock.json`) left untouched per plan scope.
