---
phase: 02-content-model
plan: 02
subsystem: api
tags: [sanity, groq, content-model, language-filter, verification]

# Dependency graph
requires:
  - phase: 02-content-model
    provides: "Plan 02-01's `src/sanity/lib/queries.ts`, the three named status constants, and the recorded pre-extraction ref that this plan's fidelity assertion diffs against."
provides:
  - "`EN_LANGUAGE`: the single English-language predicate, interpolated at all 12 post-reading positions."
  - "`scripts/checks/language-filter.check.ts`: the phase's verification harness, offline plus `--live`, with a marked `--post-migration` extension point for plan 02-04."
  - "A mechanical guard against status-predicate normalisation and against GROQ interpolation of any runtime value."
  - "Proof on live data that the filter is inert and that every slug matches at most one English post."
affects: [02-03 schema fields, 02-04 migration, 02-05 studio split, 03-translation-pipeline, 04-fa-chrome]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One exported predicate constant interpolated into every query; the check script duplicates the literal once, deliberately, so it tests the value rather than importing it."
    - "Check scripts split into an offline section that needs no env and a flag-gated live section whose client is constructed inside the branch."
    - "Git-ref fidelity diffing: normalise whitespace and CRLF on both sides, remove the newly added clause, then assert the reconstruction is a substring of the origin file at a recorded SHA."

key-files:
  created:
    - scripts/checks/language-filter.check.ts
  modified:
    - src/sanity/lib/queries.ts

key-decisions:
  - "The check script duplicates the D-03 predicate literal once. A test that imports the value it is testing proves nothing about that value."
  - "The live client is created inside the `--live` branch, never at module top level, so the offline mode cannot fail on missing env."
  - "`NEXT_PUBLIC_SANITY_DATASET` gets no fallback string. A silent default is how a check ends up confidently validating the wrong dataset."
  - "The live strip rule is whitespace-tolerant rather than whitespace-normalising, so the query actually executed is byte-identical to what the app runs."
  - "Slug uniqueness is batched as one round trip: each post row carries the English match count for its own slug via `^.slug.current`."

requirements-completed: [CONTENT-02]

coverage:
  - id: D1
    description: "`EN_LANGUAGE` holds the tolerant D-03 predicate and is the only expression of the English-language filter anywhere under `src/`."
    requirement: "CONTENT-02"
    verification:
      - kind: unit
        ref: "scripts/checks/language-filter.check.ts#assertion A (fragment identity vs a duplicated literal)"
        status: pass
      - kind: unit
        ref: "scripts/checks/language-filter.check.ts#assertion H (sole carrier among 1184 src files)"
        status: pass
    human_judgment: false
  - id: D2
    description: "All 12 post-reading positions across the nine exported queries carry the predicate, including both nested `count()` positions on the homepage and all three single-document reads on the post page."
    requirement: "CONTENT-02"
    verification:
      - kind: unit
        ref: "scripts/checks/language-filter.check.ts#assertion B (per-query counts 1/4/1/1/1/1/1/1/1, total 12)"
        status: pass
      - kind: other
        ref: "node -e '<source gate: 12 EN_LANGUAGE interpolations, status 2/4/2 unchanged>'"
        status: pass
    human_judgment: false
  - id: D3
    description: "The filter is inert: every one of the nine queries returns a byte-identical result set with and without the language clause on the live dev dataset."
    requirement: "CONTENT-02"
    verification:
      - kind: integration
        ref: "npx tsx --env-file .env.local scripts/checks/language-filter.check.ts --live => 9/9 parity identical on blog_posts_dev"
        status: pass
    human_judgment: false
  - id: D4
    description: "No status predicate was normalised and plan 02-01's extraction is proven textually faithful to the pre-extraction ref."
    requirement: "CONTENT-02"
    verification:
      - kind: unit
        ref: "scripts/checks/language-filter.check.ts#assertion C (status-equality counts 2/8/1/1/0/2/0/0/0 plus per-query variant presence)"
        status: pass
      - kind: unit
        ref: "scripts/checks/language-filter.check.ts#assertion E (9/9 reconstructions are substrings of their origin files at 293616f)"
        status: pass
      - kind: other
        ref: "negative test: one character mutated inside STATUS_STRICT => exit 1"
        status: pass
    human_judgment: false
  - id: D5
    description: "Exactly one English post matches any given slug, which keeps the post page's trailing `[0]` deterministic once Farsi siblings reuse English slugs."
    requirement: "CONTENT-02"
    verification:
      - kind: integration
        ref: "scripts/checks/language-filter.check.ts#live assertion 3 => 17 distinct slugs, max 1 English match each, 0 with zero matches"
        status: pass
    human_judgment: false
  - id: D6
    description: "No runtime value is concatenated into GROQ and no client component imports the query module."
    requirement: "CONTENT-02"
    verification:
      - kind: unit
        ref: "scripts/checks/language-filter.check.ts#assertion D (20 interpolations, all four allowlisted names)"
        status: pass
      - kind: unit
        ref: "scripts/checks/language-filter.check.ts#assertion G (use-client walk over 1184 src files)"
        status: pass
    human_judgment: false
  - id: D7
    description: "The English site is unchanged: green typecheck, green build, 28/28 route smoke."
    verification:
      - kind: other
        ref: "npx tsc --noEmit"
        status: pass
      - kind: e2e
        ref: "npx next build"
        status: pass
      - kind: e2e
        ref: "node scripts/checks/route-smoke.mjs --verify against npx next start => 28/28 ALL PASS"
        status: pass
    human_judgment: false
  - id: D8
    description: "The deploy-level ordering invariant is handed off to Phase 3: the filter must be deployed to production AND the production build regenerated before the first Farsi document exists."
    verification: []
    human_judgment: true
    rationale: "Deploying and regenerating the production build is outside this phase and gated on Saeid. Nothing in the repo can assert it; a human must confirm the deploy happened before Phase 3 creates Farsi documents."

# Metrics
duration: 9 min
completed: 2026-08-20
status: complete
---

# Phase 2 Plan 2: Language Filter Summary

**The English-language predicate is now expressed exactly once as `EN_LANGUAGE` and interpolated at all 12 post-reading positions, proven inert on live data and proven textually faithful to the pre-extraction ref by a new offline-plus-live check harness.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-08-20T21:58Z
- **Completed:** 2026-08-20T22:07Z
- **Tasks:** 3
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- Added `EN_LANGUAGE` to `src/sanity/lib/queries.ts` as the module's headline concern, above the three status constants, and interpolated it at all 12 post-reading positions under one uniform placement rule: type clause, then language clause, then the rest.
- Created `scripts/checks/language-filter.check.ts` with eight offline assertions and three live ones. It needs no new dependency, no `dotenv`, and no env at all in offline mode.
- Proved the filter is inert: all nine queries return byte-identical result sets with and without the language clause on `blog_posts_dev`.
- Proved plan 02-01's extraction was textually faithful: 9/9 reconstructed queries are substrings of their origin files at the recorded pre-extraction ref.
- Proved the slug-uniqueness invariant that protects the post page's single-document read: 17 distinct slugs, each matching at most one English post.
- Held the English site steady: `npx tsc --noEmit` 0, `npx next build` 0, route smoke 28/28 `ALL PASS`. `npm run build` was never invoked.

## Recorded outputs (required by the plan)

### The exact `EN_LANGUAGE` value

```
(!defined(language) || language == "en")
```

Tolerant per decision D-03: a post with no `language` field is English. Farsi is always explicit. The Farsi counterpart is deliberately not defined yet; Phase 4 adds it as a sibling one-liner.

### Per-constant interpolation counts

| Constant | `EN_LANGUAGE` | `status ==` | Status variant |
|---|---|---|---|
| `blogIndexQuery` | 1 | 2 | tolerant |
| `homePageQuery` | 4 | 8 | strict |
| `postBySlugQuery` | 1 | 1 | approved |
| `postStaticParamsQuery` | 1 | 1 | approved |
| `postMetadataBySlugQuery` | 1 | 0 | none |
| `postsByAuthorSlugQuery` | 1 | 2 | tolerant |
| `sitemapQuery` | 1 | 0 | none |
| `postsByAuthorIdQuery` | 1 | 0 | none |
| `authorReviewPostsQuery` | 1 | 0 | none |
| **Total** | **12** | **14** | |

Status interpolation counts are unchanged from plan 02-01 at `${STATUS_TOLERANT}` 2, `${STATUS_STRICT}` 4, `${STATUS_APPROVED}` 2.

`homePageQuery`'s four positions are `heroPosts`, `latestPosts`, and the two nested inside `count(*[... references(^._id)])` used as both the category filter and the projected `postCount`. Those two were counted explicitly, since research flags them as the easiest to miss.

### Live run: dataset and per-query row counts

Header line, printed before any assertion:

```
live: projectId=pz9ppas8 dataset=blog_posts_dev apiVersion=2025-10-07 posts=17
```

| Query | Parity | Rows |
|---|---|---|
| `blogIndexQuery` | identical | 15 |
| `homePageQuery` | identical | 9 |
| `postBySlugQuery` | identical | 1 |
| `postStaticParamsQuery` | identical | 11 |
| `postMetadataBySlugQuery` | identical | 1 |
| `postsByAuthorSlugQuery` | identical | 15 |
| `sitemapQuery` | identical | 17 |
| `postsByAuthorIdQuery` | identical | 17 |
| `authorReviewPostsQuery` | identical | 17 |

Fragment behaviour test against the real GROQ engine on a literal array: kept `["en","none"]`, dropped `"fa"`. Exactly D-03.

Slug uniqueness: 17 distinct slugs, at most 1 English match each, 0 slugs with zero English matches.

### The two demonstrated check-script failures

**Assertion A, `EN_LANGUAGE` mutated from `"en"` to `"eng"`.** Exit code 1.

```
AssertionError [ERR_ASSERTION]: EN_LANGUAGE drifted from the D-03 predicate.
  expected: (!defined(language) || language == "en")
  actual:   (!defined(language) || language == "eng")
```

**Assertion E, one character mutated inside `STATUS_STRICT` (`"scheduled"` to `"scheduleD"`).** Exit code 1. Note the count guard in assertion C does not fire here, because the `status ==` count is unchanged and the presence check uses the mutated constant itself. The git-ref diff is what catches it, which is exactly why both guards are kept.

```
AssertionError [ERR_ASSERTION]: homePageQuery is no longer textually faithful to
src/app/(en)/page.tsx at 293616f230f2379a730af86ddc9d85f5ad1ef194.
  reconstructed: { "heroPosts": *[_type == "post" && (status == "approved" || (status == "scheduleD" && publishedAt <= now())) && defined(heroOrder)] | order(heroOrder asc) { ... }
```

Both mutations were reverted immediately and the working tree was confirmed clean before committing.

## HANDOFF TO PHASE 3: the deploy-level ordering invariant

**The precondition for Phase 3 is "filter deployed to production AND the production build regenerated", not "filter merged".**

This plan satisfies the ordering invariant at the code level. It does not satisfy it at the deploy level, and cannot: deploying is outside this phase and gated on Saeid.

Statically generated and ISR output keeps serving pre-filter HTML until the production build is regenerated. The affected surfaces and their revalidate windows:

| Surface | Staleness window |
|---|---|
| `/blog/[categorySlug]/[postSlug]` | `revalidate = 3600` |
| `/authors/[slug]` | `revalidate = 60` |
| `/` | `revalidate = 30` |
| `sitemap.xml` and `generateStaticParams` | build-time artifacts, no revalidate at all |

Before the first Farsi document exists in the production dataset, confirm both: the filter is deployed, and the production build has been regenerated.

Margin is comfortable, so this is a gate to confirm rather than a risk to fear. Phase 3 lands Farsi documents as drafts, and the Sanity client already runs on a published perspective, so drafts cannot reach a public read regardless. Threat `T-02-08` is dispositioned `accept` on exactly that basis.

## Task Commits

1. **Task 1: Add EN_LANGUAGE and interpolate it into all 12 post-reading positions** - `1a6a271` (feat)
2. **Task 2: Author the check script with its offline assertions and the git fidelity diff** - `cbeb297` (test)
3. **Task 3: Add the live parity and slug-uniqueness assertions, then run the full regression gate** - `7128c1f` (test)

## Files Created/Modified

- `scripts/checks/language-filter.check.ts` (new) - The phase's verification harness. Offline: fragment identity, per-query interpolation counts, status-predicate preservation, interpolation allowlist, git fidelity, no inline call-site GROQ, server-only boundary, single-source grep. `--live`: fragment behaviour, result-set parity, slug uniqueness. `--post-migration`: reserved, marked extension point for plan 02-04.
- `src/sanity/lib/queries.ts` - One new export (`EN_LANGUAGE`) plus 12 interpolations. No status predicate, projection, ordering clause, slice or parameter altered.

Nothing under `src/app/` was touched, verified by `git status --porcelain -- src/app` printing nothing during Task 1. The D-02 surfaces (`src/app/(en)/dashboard/**`, `src/app/api/dashboard/**`, `src/app/api/cron/publish-scheduled/route.ts`) remain deliberately unfiltered, and that omission is a decision, not an oversight.

## Decisions Made

- **The check script duplicates the D-03 literal exactly once, on purpose.** Assertion A compares the imported `EN_LANGUAGE` against a literal written in the script. A test that imports the value it is testing proves nothing about that value.
- **The live Sanity client is constructed inside the `--live` branch.** Offline mode therefore cannot fail on missing env, which is what makes it usable as a per-commit gate.
- **`NEXT_PUBLIC_SANITY_DATASET` has no fallback string,** unlike `scripts/link-sanity-author.ts` which defaults to `production`. Research Pitfall 6 is a wrong-dataset operation printing a confident success message; a default would reintroduce exactly that hazard in a verification script.
- **The live strip rule is whitespace-tolerant (`fragment \s*&&\s*`) rather than whitespace-normalising.** The offline fidelity assertion normalises both sides because it compares text. The live assertion executes the query, so the filtered variant must stay byte-identical to what the app runs; only the stripped comparison variant is rewritten. `sitemapQuery`'s multi-line formatting is what forces the tolerance.
- **Slug uniqueness is one round trip.** Each post row carries the English match count for its own slug via `count(*[... slug.current == ^.slug.current && EN_LANGUAGE])`, then distinct slugs are folded client-side. The same `^` pattern `homePageQuery` already uses.
- **Assertion H is written to be extended, not rewritten.** `ALLOWED_LANGUAGE_TEXT_FILES` is a one-element array with a comment naming plan 02-05, which adds `src/sanity/structure.ts` as the second permitted carrier.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0.
**Impact on plan:** None. All three tasks landed as specified, every acceptance criterion was executed, and both required negative tests were demonstrated and reverted.

## Issues Encountered

**Pre-existing `package-lock.json` working-tree modification, out of scope (carried over from plan 02-01).**

Task 3's acceptance criteria require `git status --porcelain package.json package-lock.json` to print nothing. The working tree still carries the same uncommitted `package-lock.json` change plan 02-01 documented, unrelated to this phase and adjacent to the OPEN `npm ci` blocker in STATE.md. The execution brief for this plan explicitly instructed that this drift is not ours to touch.

The criterion's actual intent, hard constraint 2 and threat `T-02-SC` ("this plan installs nothing and does not change the manifests"), was proven the same stronger way plan 02-01 used: blob hashes recorded before the build gate and re-checked after the last commit.

- `package.json`: `eec21ab56725456a997f7c0692ddc7e950fe33bd`, identical to 02-01's recorded value.
- `package-lock.json`: `57c2a533cd3a8a59290c4cdee00c82466035e729`, identical to 02-01's recorded value.

Both hashes match plan 02-01's recorded baseline exactly, which proves the drift is the known pre-existing one and that this plan neither added to it nor altered it. No package-manager install command was run. `npm run build` was never invoked; the build gate was `npx next build` exclusively.

**Carried forward, not blocking:**

- The `sitemapQuery` missing status filter remains a real pre-existing SEO bug, still out of scope, still needing a separate quick task. This plan added the language clause to that query and changed nothing else about it.
- The `package-lock.json` / `npm ci` blocker in STATE.md is unchanged and still needs repair before deploy.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 02-03 (schema fields) is unblocked. The phase's strict internal order is now at step (2) complete:

- The language filter exists, is expressed once, and is proven inert. Adding the `language` field to `postType` in 02-03 cannot change any public read, because the filter already tolerates a missing field.
- The check harness exists and is the natural home for 02-03's schema assertions and 02-04's post-migration assertion. The `--post-migration` branch is already reserved with a comment naming plan 02-04.
- Assertion H is pre-shaped for plan 02-05's second permitted carrier.
- The English baseline is green (tsc 0, build 0, smoke 28/28), so any regression in 02-03 through 02-05 is attributable to that plan alone.

The one obligation that leaves this phase is the deploy-level ordering invariant recorded above, which is Saeid's to discharge before Phase 3 creates the first Farsi document.

## Self-Check: PASSED

- `scripts/checks/language-filter.check.ts` exists on disk. Confirmed.
- `src/sanity/lib/queries.ts` exists on disk and exports `EN_LANGUAGE`. Confirmed.
- Commits `1a6a271`, `cbeb297` and `7128c1f` exist in `git log`. Confirmed.
- `git diff --name-only 71e39f6..HEAD` lists exactly two files: `scripts/checks/language-filter.check.ts` and `src/sanity/lib/queries.ts`. Confirmed.
- All acceptance criteria across the three tasks executed and passing, with the single documented exception of the pre-existing `package-lock.json` working-tree modification, proven byte-unchanged by this plan via blob hash.
- Plan-level verification 1 through 7 re-run: tsc 0, offline check `ALL PASS` with no env file, live check `ALL PASS` naming `blog_posts_dev`, `npx next build` 0, route smoke 28/28 `ALL PASS`, `queries.ts` the sole carrier of the language-equality text under `src/`, diff exactly two files.

---
*Phase: 02-content-model*
*Completed: 2026-08-20*
