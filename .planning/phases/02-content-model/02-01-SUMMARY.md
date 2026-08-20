---
phase: 02-content-model
plan: 01
subsystem: api
tags: [sanity, groq, nextjs, refactor, content-model]

# Dependency graph
requires:
  - phase: 01-route-groups
    provides: The `(en)` route group, so every public English post surface already sits under one parent and could be enumerated exhaustively.
provides:
  - "`src/sanity/lib/queries.ts`: the single shared module holding all nine public post GROQ queries."
  - "Three exported status-predicate constants (`STATUS_TOLERANT`, `STATUS_STRICT`, `STATUS_APPROVED`) that keep the four pre-existing status variants distinguishable."
  - "Seven repointed public call sites; the eighth D-01 surface is covered by vacuity."
  - "A recorded pre-extraction git SHA that lets plan 02-02 prove the relocation was textually faithful."
affects: [02-02 language filter, 02-03 schema fields, 02-04 migration, 04-fa-chrome]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Public post GROQ lives in one server-only module of untagged template literals; call sites import a named constant and keep their own generic and params object."
    - "Status predicates are named module-level constants interpolated into query text, so a check script can assert per query which variant is present."

key-files:
  created:
    - src/sanity/lib/queries.ts
    - .planning/phases/02-content-model/artifacts/pre-extraction-ref.txt
  modified:
    - src/app/(en)/blog/page.tsx
    - src/app/(en)/page.tsx
    - src/app/(en)/blog/[categorySlug]/[postSlug]/page.tsx
    - src/app/(en)/authors/[slug]/page.tsx
    - src/app/sitemap.ts
    - src/app/api/v1/posts/route.ts
    - src/app/(en)/review/page.tsx

key-decisions:
  - "Status predicates are exported, not module-private, so plan 02-02's check script can assert per query which of the four variants is present."
  - "`homePageQuery` and `blogIndexQuery` stay single compound constants; splitting them would turn one network round trip into three, which is a behaviour change."
  - "`postsByAuthorIdQuery` and `authorReviewPostsQuery` stay separate despite identical filters; their projections differ and merging would change a caller's output shape."
  - "`authorQuery` stays inline in the author page. It queries the author document type, and this module is for post queries only."
  - "The pre-existing package-lock.json working-tree modification was left untouched rather than reverted; the plan's byte-unchanged constraint was proven against the pre-plan blob hash instead."

patterns-established:
  - "Extraction-then-filter: relocate query text as a provable no-op first, add semantics in a separate plan, so a git-ref diff can prove the relocation was faithful."
  - "Named status constants over inline predicates, making accidental normalisation mechanically detectable via interpolation counts."

requirements-completed: [CONTENT-02]

coverage:
  - id: D1
    description: "All nine public post GROQ queries live in `src/sanity/lib/queries.ts` and every one of the seven repointed call sites imports from it with zero inline post GROQ remaining."
    requirement: "CONTENT-02"
    verification:
      - kind: other
        ref: "node -e '<7-file scan: no `_type == \"post\"` literal, `@/sanity/lib/queries` import present>'"
        status: pass
      - kind: other
        ref: "node -e '<queries.ts shape: 12 named exports, no EN_LANGUAGE, no language filter text>'"
        status: pass
    human_judgment: false
  - id: D2
    description: "All four pre-existing status-predicate variants survive character for character as three named constants plus an explicit no-predicate case, at interpolation counts 2/4/2."
    verification:
      - kind: other
        ref: "node -e '<interpolation count gate: TOLERANT=2, STRICT=4, APPROVED=2; sitemapQuery/postsByAuthorIdQuery/authorReviewPostsQuery/postMetadataBySlugQuery hold no ${STATUS_ substring>'"
        status: pass
      - kind: other
        ref: "node -e '<byte-fidelity: each of the 9 resolved queries is a substring of its own file at pre-extraction ref 293616f>'"
        status: pass
    human_judgment: false
  - id: D3
    description: "The extraction is behaviourally inert: the English site typechecks, builds and serves exactly as before."
    verification:
      - kind: other
        ref: "npx tsc --noEmit"
        status: pass
      - kind: e2e
        ref: "npx next build"
        status: pass
      - kind: e2e
        ref: "node scripts/checks/route-smoke.mjs --verify (against npx next start) => 28/28 ALL PASS"
        status: pass
    human_judgment: false
  - id: D4
    description: "A pre-extraction git SHA is recorded so plan 02-02 can prove the relocation was textually faithful."
    verification:
      - kind: other
        ref: "node -e '<ref is 40-char hex, git cat-file -e <sha>^{commit} exits 0, tree still contains `const query = `>'"
        status: pass
    human_judgment: false
  - id: D5
    description: "D-02 surfaces (dashboards, api/dashboard, cron) and the package manifests were not touched."
    verification:
      - kind: other
        ref: "git diff --name-only HEAD (no dashboard/api-dashboard/cron path) + git hash-object package.json package-lock.json unchanged vs pre-plan baseline"
        status: pass
    human_judgment: false

# Metrics
duration: 42 min
completed: 2026-08-20
status: complete
---

# Phase 2 Plan 1: Query Extraction Summary

**All nine public post GROQ queries relocated byte for byte into `src/sanity/lib/queries.ts` behind three named status constants, with the language filter deliberately withheld for plan 02-02.**

## Performance

- **Duration:** 42 min
- **Started:** 2026-08-20T19:52Z
- **Completed:** 2026-08-20T20:34Z
- **Tasks:** 3
- **Files modified:** 9 (2 created, 7 modified)

## Accomplishments

- Created `src/sanity/lib/queries.ts` with 12 named exports: 3 status-predicate constants and 9 post queries. No imports, no side effects, no default export, no `defineQuery`, no `groq` tag.
- Repointed all seven public English call sites that fetch posts. Zero inline post GROQ remains in any of them.
- Proved the relocation is textually faithful: each of the nine queries, with its status constant resolved back, is a byte-identical substring of its own source file at the pre-extraction ref. That is plan 02-02's fidelity gate, already green ahead of time.
- Proved the extraction is behaviourally inert: `npx tsc --noEmit` at 0, `npx next build` at 0, route smoke 28/28 `ALL PASS` against `npx next start`.

## Recorded outputs (required by the plan)

**Pre-extraction SHA:** `293616f230f2379a730af86ddc9d85f5ad1ef194`
Stored at `.planning/phases/02-content-model/artifacts/pre-extraction-ref.txt`. Its tree still contains the inline `const query = ` text, confirming it was captured before the first extraction edit.

**Final export list of `src/sanity/lib/queries.ts`** (12 named exports, in file order):

| # | Export | Kind | Status predicate | Consumer |
|---|--------|------|------------------|----------|
| 1 | `STATUS_TOLERANT` | status const | approved, or undefined, or due scheduled | blog index, author page |
| 2 | `STATUS_STRICT` | status const | approved, or due scheduled | homepage |
| 3 | `STATUS_APPROVED` | status const | approved only | post page |
| 4 | `blogIndexQuery` | query | `${STATUS_TOLERANT}` x1 | `(en)/blog/page.tsx` |
| 5 | `homePageQuery` | query | `${STATUS_STRICT}` x4 | `(en)/page.tsx` |
| 6 | `postBySlugQuery` | query | `${STATUS_APPROVED}` x1 | post page body |
| 7 | `postStaticParamsQuery` | query | `${STATUS_APPROVED}` x1 | post page `generateStaticParams` |
| 8 | `postMetadataBySlugQuery` | query | none (carried over) | post page `generateMetadata` |
| 9 | `postsByAuthorSlugQuery` | query | `${STATUS_TOLERANT}` x1 | `(en)/authors/[slug]/page.tsx` |
| 10 | `sitemapQuery` | query | none (carried over) | `src/app/sitemap.ts` |
| 11 | `postsByAuthorIdQuery` | query | none (carried over) | `api/v1/posts` GET |
| 12 | `authorReviewPostsQuery` | query | none (carried over) | `(en)/review/page.tsx` |

**Status interpolation counts:** `${STATUS_TOLERANT}` 2, `${STATUS_STRICT}` 4, `${STATUS_APPROVED}` 2. Total 8. Three of the nine queries carry no status predicate by design, exactly as at the pre-extraction ref.

**Route smoke:** `node scripts/checks/route-smoke.mjs --verify` against `npx next start` reported `28/28 passed` and `route-smoke.mjs: ALL PASS`. Discovery found a real post href from the served `/blog` HTML and real guide URLs from `/sitemap.xml`, so an extraction that silently emptied either surface would have failed loudly.

**The language filter is deliberately absent.** No `EN_LANGUAGE` export, no `language ==` text anywhere in `queries.ts`. That is step (2) of the roadmap's strict internal order and it lands in plan 02-02, which will interpolate it at 12 sites in this one module.

## Task Commits

1. **Task 1: Record the pre-extraction ref and create the query module with the blog index and homepage queries** - `1349642` (refactor)
2. **Task 2: Extract the post page's three queries and the author page's post query** - `ecd6945` (refactor)
3. **Task 3: Extract the sitemap, api/v1/posts GET and review-page queries, then run the full regression gate** - `702b942` (refactor)

## Files Created/Modified

- `src/sanity/lib/queries.ts` (new) - The only home for public post GROQ. Server-only, 12 named exports.
- `.planning/phases/02-content-model/artifacts/pre-extraction-ref.txt` (new) - The 40-char SHA `293616f...` for 02-02's fidelity diff.
- `src/app/(en)/blog/page.tsx` - Imports `blogIndexQuery`; fetch stays untyped and stays inside `Promise.all` next to the Prisma `postView.groupBy`.
- `src/app/(en)/page.tsx` - Imports `homePageQuery`; still exactly one `client.fetch(`, `revalidate = 30` untouched.
- `src/app/(en)/blog/[categorySlug]/[postSlug]/page.tsx` - Imports the three post-page queries; both generics and both `{ slug: postSlug }` params preserved, `revalidate = 3600` untouched.
- `src/app/(en)/authors/[slug]/page.tsx` - Imports `postsByAuthorSlugQuery`; `authorQuery` deliberately stays inline, `revalidate = 60` untouched.
- `src/app/sitemap.ts` - Imports `sitemapQuery`; the typed `{ posts, authors }` generic and the Prisma try/catch graceful-degradation block preserved.
- `src/app/api/v1/posts/route.ts` - GET only. Imports `postsByAuthorIdQuery`, keeps the `SanityPostListItem[]` generic and both params. The POST handler was not opened; the `language: "en"` stamp is plan 02-03's work.
- `src/app/(en)/review/page.tsx` - Imports `authorReviewPostsQuery`; `dynamic = "force-dynamic"` and the API-key gate untouched.

## Decisions Made

- **Status constants are exported rather than module-private.** A deliberate deviation from the research snippet, recorded in the plan. It lets 02-02's check script assert per query which of the four variants is present, which is the mechanical guard against accidental normalisation.
- **`sitemapQuery` keeps its multi-line `*[ ... ]` formatting verbatim** rather than being tidied to the one-line form used elsewhere. Tidying would have broken the byte-fidelity property.
- **The missing status filter in `sitemapQuery` stays unfixed.** It is a real pre-existing SEO bug and an explicit non-goal; fixing it here would have made the relocation behaviour-changing. Already logged for a separate quick task.
- **`postMetadataBySlugQuery` keeps its no-status-predicate asymmetry with `postBySlugQuery`.** Carried over unchanged. This phase changes language semantics only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reworded the `queries.ts` header comment to remove a literal use-client string**

- **Found during:** Task 1
- **Issue:** The header comment originally read `Never import this module from a "use client" component`. The acceptance criterion "contains no `"use client"` directive" is checked by string containment, so the comment produced a false FAIL and would have tripped any equivalent check script written for plan 02-02.
- **Fix:** Reworded to `Never import this module from a client component`. Same guidance, no literal directive string.
- **Files modified:** `src/sanity/lib/queries.ts`
- **Verification:** Re-ran the criterion. `queries.ts` now contains no use-client string at all.
- **Committed in:** `1349642` (part of the Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** Cosmetic, confined to a comment. No scope creep, no behavioural surface touched.

## Issues Encountered

**Pre-existing `package-lock.json` working-tree modification, out of scope.**

The plan's Task 1 and Task 3 acceptance criteria require `git status --porcelain package.json package-lock.json` to print nothing. At plan start the working tree already carried an uncommitted `package-lock.json` change (`@sanity/client` 7.23.0 to 7.24.0, `@sanity/eventsource` 5.0.2 to 5.0.4, 7 insertions / 7 deletions), left behind by earlier work and unrelated to this phase. It is adjacent to the OPEN `npm ci` blocker already recorded in STATE.md.

Reverting it would have discarded an uncommitted user change that this plan has no mandate to touch, so per the scope boundary it was left alone. The criterion's actual intent, hard constraint 2 and threat `T-02-SC` ("this plan installs nothing and does not change the manifests"), was proven a stronger way instead: both manifest blob hashes were recorded before the first edit and re-checked after the last one.

- `package.json`: `eec21ab56725456a997f7c0692ddc7e950fe33bd` at start and at end, identical.
- `package-lock.json`: `57c2a533cd3a8a59290c4cdee00c82466035e729` at start and at end, identical.

No package-manager install command of any kind was run during this plan, and `npm run build` was never invoked. The build gate used was `npx next build` exclusively.

**Handoff note for plan 02-02's check script: normalise line endings before diffing.** This repo checks out with CRLF on Windows (`git add` reports "LF will be replaced by CRLF"), so `git show <ref>:<path>` returns LF while the working copy holds CRLF. This plan's own byte-fidelity check normalised both sides with `.replace(/\r\n/g, "\n")` before comparing and passed 9/9. A naive diff without that step will produce nine spurious failures.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 02-02 is unblocked and has an unusually clean starting position:

- One module, `src/sanity/lib/queries.ts`, is the only place the `EN_LANGUAGE` predicate has to be expressed. All 12 interpolation sites are inside it.
- The pre-extraction ref `293616f` is recorded and resolvable, and this plan already pre-verified 9/9 byte fidelity against it, so 02-02's git-fidelity gate should be green on first run.
- The four status variants are named and countable (2/4/2), so 02-02 can assert per query which variant it is filtering alongside.
- The English baseline is proven green (build 0, smoke 28/28), so any smoke regression in 02-02 is attributable to the language filter alone.

Carried-forward concerns, none blocking:

- The `sitemapQuery` missing status filter (pre-existing SEO bug) remains unfixed and needs a separate quick task.
- The `package-lock.json` / `npm ci` blocker in STATE.md is unchanged and still needs repair before deploy.
- Phase hard ordering invariant still stands: the `language == "en"` filter must be live before the first Farsi document exists.

## Self-Check: PASSED

- `src/sanity/lib/queries.ts` exists on disk. Confirmed.
- `.planning/phases/02-content-model/artifacts/pre-extraction-ref.txt` exists on disk and resolves via `git cat-file -e`. Confirmed.
- All seven modified call-site files exist and import from `@/sanity/lib/queries`. Confirmed.
- Commits `1349642`, `ecd6945` and `702b942` exist in `git log`. Confirmed.
- All acceptance criteria across the three tasks re-run and passing, with the single documented exception of the pre-existing `package-lock.json` working-tree modification, proven byte-unchanged by this plan via blob hash.
- Plan-level verification 1 through 6 re-run: tsc 0, `npx next build` 0, route smoke 28/28 `ALL PASS`, 7/7 call sites clean, 12 named exports with zero language-filter text, no dashboard / api-dashboard / cron file in the diff.

---
*Phase: 02-content-model*
*Completed: 2026-08-20*
