---
phase: 03-translation-pipeline
plan: 02
subsystem: content-model
tags: [sanity, groq, schema, staleness, tripwire, pipe-01]

# Dependency graph
requires:
  - phase: 02-content-model
    provides: "`EN_LANGUAGE` / `STATUS_APPROVED` as exported fragments, the `language`/`translationOf`/`translationNotes` fields, and the three closed tripwires (field count, interpolation allowlist, language-text carrier list) that this plan had to satisfy rather than bypass."
provides:
  - "`sourceUpdatedAt` on `postType`: the recorded English source revision a Farsi translation was made from, which is what makes D-08 staleness exact."
  - "`translationCandidatesQuery`: approved English posts with no Farsi sibling, taking `$slug`. The pipeline's work list."
  - "`translationStaleQuery`: the same filter inverted, projecting `sibling{_id, sourceUpdatedAt}`. The D-08 reporting surface."
  - "Offline assertion section `L` and live section `Live 4` in `language-filter.check.ts`, pinning both queries against drift and proving them against both datasets."
affects: [03-03, 03-04, 03-05, 03-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Script-side GROQ lives in `queries.ts` beside the public reads but is fenced off from them: it is excluded from the nine-query `QUERIES` array and pinned by its own assertion section, so the public read contract's expected counts stay meaningful."
    - "One client per perspective, never a flipped perspective on a shared client. The live section now builds three: default-published for parity, raw for pipeline selection, raw for post-migration counts."
    - "A live count assertion is written against a control query that restates the same filter minus the one clause under test, so any difference is attributable to that clause and nothing else."

key-files:
  created: []
  modified:
    - src/sanity/schemaTypes/postType.ts
    - src/sanity/lib/queries.ts
    - scripts/checks/language-filter.check.ts

key-decisions:
  - "Staleness is RESEARCH option A: store the source's `_updatedAt` on the Farsi document at translation time. Comparing the two documents' `_updatedAt` values needs no schema field but is exactly backwards, because Saeid reviewing and editing a Farsi draft bumps that draft's timestamp and makes a stale translation look permanently fresh."
  - "One new field, not two. `sourceUpdatedAt` alone; the draft's own `_createdAt` already answers when it was translated, so no `translatedAt` companion was added and the tripwire moved 17 to 18 rather than 17 to 19."
  - "The two pipeline queries are deliberately NOT added to the check script's `QUERIES` array. That array is documented as the nine exported PUBLIC post queries and drives assertions B and C, whose per-query expected counts ARE the CONTENT-02 public read contract. Adding a script-side read would dilute that contract into a general inventory of everything exported from the module."
  - "`Live 4` builds its own raw-perspective client rather than flipping the existing one. The parity assertions must keep seeing what the app sees (published), while the sibling count must see drafts or it is 0 by construction and proves nothing."

metrics:
  duration: ~15m
  completed: 2026-08-22
status: complete
---

# Phase 3 Plan 02: Sanity Surfaces for the Pipeline Summary

Added the 18th `postType` field and the pipeline's two selection queries, so a later CLI can ask "which approved English posts need translating" and "which siblings are stale" without inventing a second home for the language filter, and pinned both against the Phase 2 tripwires rather than around them.

## What was built

Three tasks, three commits, all autonomous, no checkpoints.

**Task 1 (`393a284`) added `sourceUpdatedAt` to `postType.ts` and moved `EXPECTED_FIELD_COUNT` from 17 to 18** in the same commit, which is what Pitfall 7 demands. The field is `datetime`, `readOnly: true`, and `hidden: ({ document }) => document?.language !== "fa"`, so it never appears on an English post's form. The `hidden` predicate is a TypeScript comparison, not GROQ: it contains the text `language !==`, not `language ==`, so it adds nothing to assertion H's carrier scan either way.

**Task 2 (`1bb12be`) added `translationCandidatesQuery` and `translationStaleQuery` to `src/sanity/lib/queries.ts`**, under a section comment that states they are script-side reads and names why they live in this module. Both interpolate `EN_LANGUAGE` and `STATUS_APPROVED` and retype neither. The sibling test is a `count()` subquery, so selection never fetches a body just to discard it client-side.

**Task 3 (`f6acaf8`) added offline section `L` and live section `Live 4` to `language-filter.check.ts`**, then proved both queries against `blog_posts_dev` and `blog_posts` read-only.

## Live counts, both datasets

Verbatim from the two runs, on the final tree:

| Dataset | env file | approved-english | candidates | stale | `$slug` path |
|---|---|---|---|---|---|
| `blog_posts_dev` | `.env.local` | 11 | **11** | **0** | `the-modern-data-career-map` narrowed 11 rows to 1 |
| `blog_posts` | `.env.vercel-prod` | 26 | **26** | **0** | `the-modern-data-career-map` narrowed 26 rows to 1 |

Both header lines verbatim:

```
  pipeline selection: dataset=blog_posts_dev (raw perspective) approved-english=11 candidates=11 stale=0
  pipeline selection: dataset=blog_posts (raw perspective) approved-english=26 candidates=26 stale=0
```

The prod figure of 26 matches RESEARCH's live probe of 2026-08-22 exactly. Both runs exit 0 and terminate with `language-filter.check.ts: ALL PASS`. Neither run writes anything: every statement in `Live 4` is a `fetch`.

`candidates == approved-english` and `stale == 0` are the correct expectations *today* precisely because zero Farsi documents exist in either dataset, which is the same fact that makes them a weak proof of the sibling subquery. See "What is still unproven" below.

## Why the two queries are not in the `QUERIES` array

The check script's `QUERIES` array is documented in its own source as "the nine exported post queries, in declaration order", and two assertions consume it:

- **Assertion B** asserts a per-query count of the English predicate and a total of exactly 12 across the nine.
- **Assertion C** asserts a per-query count of `status ==` clauses plus which of the four status variants each query carries, including that four of them carry none.

Those expected counts are not bookkeeping. They *are* CONTENT-02's public read contract written down: this is the set of queries a visitor's page render can reach, and this is exactly which posts each one may return. A script-side read that a browser can never trigger belongs to a different surface, and folding it in would have turned a contract into an inventory of everything the module happens to export. Assertion E would also have failed outright, since it reconstructs each query and requires it to be textually faithful to a pre-extraction git ref where these two queries did not exist.

Section `L` gives them the equivalent rigour on their own terms: one `EN_LANGUAGE`, one `STATUS_APPROVED` and neither of the other two status variants, a `$slug` reference, the `path("drafts.**")` exclusion, and the sibling-test polarity.

## The sibling-test polarity assertion

The two queries differ in exactly one character sequence, `) == 0` versus `) > 0`, which makes it the clause most likely to survive a copy-paste unchanged and be wrong in silence. Section `L` asserts presence of the correct comparison **and absence of the other** on each query, with a message that names the consequence: an inverted candidates query hands the pipeline every already-translated post, and an inverted stale query reports every untranslated post as stale.

## Deviations from Plan

### 1. [Rule 2 - Missing critical functionality] Section `L` asserts the absence of the opposite sibling comparison, not only the presence of the correct one

- **Found during:** Task 3
- **Issue:** The plan asked that `translationCandidatesQuery` contain `) == 0` and `translationStaleQuery` contain `) > 0`, naming copy-paste breakage as the risk. Presence-only assertions do not catch that risk: a query that had *both* comparisons, or a stale query that gained an `== 0` clause somewhere else, would pass.
- **Fix:** Each assertion is `includes(correct) && !includes(other)`. Also added one assertion that `translationStaleQuery` projects `sourceUpdatedAt`, since a stale report that omits the recorded source revision cannot compute staleness at all and would fail silently as an empty column rather than an error.
- **Files modified:** `scripts/checks/language-filter.check.ts`
- **Commit:** `f6acaf8`

### 2. [Clarification, no behaviour change] The plan's phrase "the zero-count branch ... has not yet been exercised"

The plan's Task 3 asked for a comment saying "the zero-count branch of the sibling subquery has not yet been exercised against real Farsi data". Read literally that is inverted: with zero Farsi documents, the sibling count is 0 for every post, so the zero branch is the *only* one exercised and the non-zero branch is the untested one. The committed comment states the accurate version, which serves the same intent: today every sibling count is 0, so `translationCandidatesQuery` returns everything and `translationStaleQuery` returns nothing; the non-zero branch is proven in plan 03-09's dev rehearsal against drafts the pipeline itself wrote. No Farsi document was fabricated: the check stays read-only.

## What is still unproven

`Live 4` proves the filter clauses, the raw perspective, the `$slug` parameter path and the candidates/stale polarity **against a dataset with no Farsi documents**. That means:

- The `count(...) > 0` branch has never returned a row. `translationStaleQuery` has been proven to execute and to return 0, not to correctly identify a stale sibling.
- `translationOf._ref in [^._id, "drafts." + ^._id]` has never actually matched. Both reference-target forms are untested against a real Farsi draft.
- `sourceUpdatedAt` has never been written or read back.

All three are proven in plan 03-09's dev rehearsal, which is the first point at which a Farsi draft exists. This is recorded as a comment in the check source, next to the assertions, rather than only here.

## Verification

Every plan-level verification command, re-run on the final tree:

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx tsx scripts/checks/language-filter.check.ts` | `ALL PASS`, 18 schema fields, 2 pipeline queries pinned |
| `npx tsx --env-file .env.local scripts/checks/language-filter.check.ts --live` | exit 0, `ALL PASS`, candidates 11 / stale 0 |
| `npx tsx --env-file .env.vercel-prod scripts/checks/language-filter.check.ts --live` | exit 0, `ALL PASS`, candidates 26 / stale 0 |
| `npx eslint src/sanity/schemaTypes/postType.ts src/sanity/lib/queries.ts scripts/checks/language-filter.check.ts` | exit 0, no output |
| `grep -rl "language ==" src --include=*.ts --include=*.tsx` | exactly 3: `queries.ts`, `postType.ts`, `structure.ts` |

Per-task acceptance greps:

- Task 1: `name: "sourceUpdatedAt"` count **1**, `EXPECTED_FIELD_COUNT = 18` count **1**, `EXPECTED_FIELD_COUNT = 17` count **0**, `sourceUpdatedAt` in the check script count **1**, `name: "translatedAt"` count **0**.
- Task 2: `export const translationCandidatesQuery` count **1**, `export const translationStaleQuery` count **1**, `$slug` count **6**, interpolation scan over `queries.ts` returned an empty bad-list (every `${...}` is one of the four allowlisted fragment names).
- Task 3: `L. Pipeline selection queries` count **1**, `Live 4. Pipeline selection behaviour` count **1**, `translationCandidatesQuery` in the check script count **11**.

Phase 2 regression: every pre-existing assertion (A through K) still passes on both datasets, including the interpolation allowlist (D), the closed three-file carrier list (H) and the parity of all nine public queries with and without the language clause.

`npm run build` was never invoked. The build gate was not run at all this plan: the plan's verification list omits it deliberately, since nothing here touches a route, a component or a build-time query, and `npx tsc --noEmit` covers the schema and query modules.

## Known Stubs

None. Both queries execute against live data and the schema field is fully defined. The unwritten piece is the pipeline that will *populate* `sourceUpdatedAt`, which is plan 03-05's declared scope, not a stub left behind here.

## Threat Flags

None new. The four threats this plan owned are all disposed as registered:

- **T-03-09 (Tampering, slug filter): mitigated.** The slug is a GROQ `$param`. Assertion D's closed four-name interpolation allowlist enforces it mechanically over the whole file, and section `L` asserts `$slug` presence per query on top.
- **T-03-16 (Tampering, field-count tripwire): mitigated.** Moved 17 to 18 in the same commit as the field, with a ten-line comment recording which plan moved it and why. Never deleted, never loosened.
- **T-03-17 (Information Disclosure, raw client): accepted as registered.** `Live 4` prints a dataset name, three integers and one slug. No token, no env value, no document body.
- **T-03-18 (Tampering, predicate spread): mitigated.** The carrier list is still exactly three files. No new file under `src/` carries the language text.

## Self-Check: PASSED

Files claimed modified, all confirmed present and changed on disk:

- `src/sanity/schemaTypes/postType.ts` FOUND
- `src/sanity/lib/queries.ts` FOUND
- `scripts/checks/language-filter.check.ts` FOUND

Commits claimed, all confirmed in `git log`:

- `393a284` FOUND (`feat(03-02): add sourceUpdatedAt to postType and move the field tripwire to 18`)
- `1bb12be` FOUND (`feat(03-02): add the pipeline selection and staleness queries to queries.ts`)
- `f6acaf8` FOUND (`test(03-02): pin the pipeline queries offline and prove them live`)

Working tree clean after each commit; no file deletions in any of the three.
