---
phase: 03-translation-pipeline
plan: 07
subsystem: infra
tags: [sanity, groq, cli, tsx, portable-text, prisma, cost-estimate, dry-run]

# Dependency graph
requires:
  - phase: 03-translation-pipeline (plan 03-01)
    provides: scripts/lib/token-usage.ts resolveAdminUserId, and the preflight artifact proving an ADMIN resolves on both targets
  - phase: 03-translation-pipeline (plan 03-02)
    provides: translationCandidatesQuery and translationStaleQuery, plus the sourceUpdatedAt schema field
  - phase: 03-translation-pipeline (plan 03-03)
    provides: extractTranslatables and structuralFingerprint in scripts/lib/portable-text-walk.ts
provides:
  - scripts/translate-posts.ts, the pipeline CLI front half, runnable today and writing nothing
  - Dry-run-by-default flag surface: --slug, --all, --retranslate, --execute, --dry-run, --resume
  - Dataset-safe raw-perspective client with a header line printed before the first read
  - Post selection with D-08 staleness reporting and a --retranslate-only path into the working set
  - Per-post translatable enumeration (body items by kind plus code-enumerated document fields)
  - A printed cost estimate with every assumption stated inline
  - A run-state JSON artifact per dry run, carrying ids, labels, counts and fingerprint digests only
  - A server-validated mutation that proves write scope without persisting anything
affects: [03-08 batch passes, 03-09 post-run checks, 03-10 proof run]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dry run is the default and no flag turns it on; --dry-run with --execute is refused as a stated conflict (D-14)"
    - "The operator read-back is verified against the client's own resolved config, not just printed"
    - "Run-state artifacts carry a SHA-256 digest of the structural fingerprint rather than the fingerprint itself"
    - "A named seam marks where the paid passes attach, so plan 03-08 is an addition rather than a rewrite"

key-files:
  created:
    - scripts/translate-posts.ts
    - .planning/phases/03-translation-pipeline/artifacts/blog_posts_dev-2026-08-22T21-10-22.640Z.json
    - .planning/phases/03-translation-pipeline/artifacts/blog_posts-2026-08-22T21-10-29.925Z.json
  modified: []

key-decisions:
  - "The run-state artifact stores a SHA-256 digest of the structural fingerprint, not the fingerprint itself: equality is the only property plan 03-08 needs, and the raw value is hundreds of kilobytes of document structure landing in a version-controlled directory (T-03-04)"
  - "The header line is asserted against client.config().dataset before any read, so the read-back can never drift from the content lake actually being talked to"
  - "--execute exits 1 with a message naming plan 03-08, rather than falling through silently, so no one can mistake a seam for a completed run"
  - "The --all brake is evaluated on the resolved working set rather than on the raw candidate list, because the working set is what would actually be paid for"
  - "--retranslate promotes a non-stale sibling only when --slug is also present; doing it across the backlog would rewrite every Farsi draft, which is the outcome D-08 exists to prevent"

patterns-established:
  - "Pattern: flags echoed on a second header line as an operator read-back, so --slug, --all, --retranslate and --resume are visible before any work starts"
  - "Pattern: cost estimates print their own assumptions (chars per token, output multiplier, per-request overhead) and the intro-rate expiry date"
  - "Pattern: lazy dynamic import of the Prisma-backed module plus an explicit $disconnect, so a Sanity-only dry run does not depend on a reachable database"

requirements-completed: [PIPE-01]

coverage:
  - id: D1
    description: "CLI surface with dry run as the default, a dataset-explicit header printed before any read, a production banner on a mutating production run, and a refused --dry-run/--execute conflict"
    requirement: PIPE-01
    verification:
      - kind: integration
        ref: "npx tsx --env-file .env.local scripts/translate-posts.ts --slug does-not-exist (header line, exit 0 at task 1)"
        status: pass
      - kind: integration
        ref: "npx tsx --env-file .env.local scripts/translate-posts.ts --dry-run --execute (exit 1, message names both flags)"
        status: pass
      - kind: other
        ref: "grep counts: no ?? on the dataset (0), perspective raw (1), PRODUCTION_DATASET (1), production banner (1), main().catch (1)"
        status: pass
    human_judgment: false
  - id: D2
    description: "ADMIN user resolved before any spend, fatal under --execute and a warning in a dry run"
    requirement: PIPE-01
    verification:
      - kind: integration
        ref: "every dry run on both env targets prints the ADMIN-resolved line; resolveAdminUserId is called before the first fetch"
        status: pass
    human_judgment: false
  - id: D3
    description: "Post selection under the raw perspective, with the slug travelling as the $slug parameter"
    requirement: PIPE-01
    verification:
      - kind: integration
        ref: "npx tsx --env-file .env.local scripts/translate-posts.ts (11 candidates) and --env-file .env.vercel-prod (26 candidates)"
        status: pass
      - kind: other
        ref: "node -e no-hand-built-GROQ assertion over scripts/translate-posts.ts (exit 0)"
        status: pass
    human_judgment: false
  - id: D4
    description: "D-08 staleness reported and never touched without --retranslate; empty working set exits 0, --slug matching nothing exits 1 with the three reasons"
    requirement: PIPE-01
    verification:
      - kind: integration
        ref: "npx tsx --env-file .env.local scripts/translate-posts.ts --slug does-not-exist (exit 1, three reasons printed)"
        status: pass
      - kind: other
        ref: "stale-path code read; both datasets hold zero Farsi siblings today so the non-zero stale branch is unexercised against real data"
        status: unknown
    human_judgment: true
    rationale: "The stale and --retranslate branches cannot be exercised until a Farsi sibling exists. They are proven live in the plan 03-08 rehearsal, not here."
  - id: D5
    description: "Translatable enumeration, cost estimate, run-state artifact and the server-validated write-scope probe, all persisting nothing"
    requirement: PIPE-01
    verification:
      - kind: integration
        ref: "npx tsx --env-file .env.local scripts/translate-posts.ts --all and --env-file .env.vercel-prod ... --all (both exit 0, both print the validated-dry-run line)"
        status: pass
      - kind: integration
        ref: "raw-perspective count of language == fa after both runs: blog_posts_dev 0, blog_posts 0"
        status: pass
      - kind: other
        ref: "artifact leak assertion over both run-state JSONs (no key prefix, no Postgres URL scheme), exit 0"
        status: pass
    human_judgment: false
  - id: D6
    description: "Phase gates still green: tsc, eslint and the offline translation check"
    verification:
      - kind: other
        ref: "npx tsc --noEmit (0), npx eslint scripts/translate-posts.ts (0), npx tsx scripts/checks/translation.check.ts (ALL PASS)"
        status: pass
    human_judgment: false

# Metrics
duration: 15min
completed: 2026-08-22
status: complete
---

# Phase 3 Plan 07: Translation Pipeline CLI, Selection and Dry Run Summary

**`scripts/translate-posts.ts` selects, enumerates and prices the whole Farsi backlog under the raw perspective, proves its token carries write scope through one server-validated mutation, and persists nothing on either dataset.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-22T20:57Z
- **Completed:** 2026-08-22T21:11Z
- **Tasks:** 3
- **Files modified:** 1 created (plus 2 run-state artifacts produced by the verification runs)

## Accomplishments

- The pipeline CLI exists and is runnable today. Every safety property of the phase is now decided in code rather than left to plan 03-08: dry run is the default, the dataset comes from the env file with no fallback, and the client reads under `perspective: "raw"` so Farsi sibling drafts are visible.
- Selection is live on both datasets and matches the corpus census exactly: 11 candidates in `blog_posts_dev`, 26 in `blog_posts`, 0 stale siblings on either, because zero Farsi documents exist yet.
- The full backlog is priced before a single token is spent, with every assumption printed next to the number.
- The write-scope probe passed on both targets, so a token-scope failure cannot be discovered after a paid run.
- Both datasets still hold zero `language == "fa"` documents after a full `--all` dry run against each, verified by a raw-perspective count.

### Header line, quoted verbatim

Dev target (`--env-file .env.local`):

```
translate-posts: projectId=pz9ppas8 dataset=blog_posts_dev apiVersion=2025-10-07 mode=DRY RUN
```

Production target (`--env-file .env.vercel-prod`):

```
translate-posts: projectId=pz9ppas8 dataset=blog_posts apiVersion=2025-10-07 mode=DRY RUN
```

Neither run mutates, so the `!! TARGET IS THE PRODUCTION DATASET !!` line is correctly absent from both. It is emitted only when `execute && dataset === "blog_posts"`.

### Candidate and stale counts

| Dataset | Candidates (no Farsi sibling) | Stale siblings | Fresh siblings | Working set |
|---|---|---|---|---|
| `blog_posts_dev` | 11 | 0 | 0 | 11 |
| `blog_posts` | 26 | 0 | 0 | 26 |

Both match the RESEARCH corpus census (approved and English: 26 production, 11 dev), which is the expected result while zero Farsi documents exist.

### Largest post, per-kind item breakdown

Production, `explainable-ai-in-credit-risk-why-banks-cannot-afford-black-boxes`:

| Kind | Count |
|---|---|
| span | 183 |
| cell | 44 |
| alt | 3 |
| caption | 0 |
| **body total** | **230** |
| document fields | 2 (`title`, `metaDescription`) |
| translatable characters | 34,563 |
| estimated tokens | 42,564 in, 17,882 out |

Dev, `exploring-how-machine-learning-and-analytics-shape-the-future`: 65 body items (62 span, 0 cell, 3 alt, 0 caption), 3 fields (`title`, `metaDescription`, `mainImage.alt`), 15,264 characters.

The 44 table cells on the largest production post are the D-13 payoff in one number: a span-only walker would have shipped that post with an English table.

### Cost estimate, full backlog

Production, all 26 posts:

```
run total: 26 post(s), 2962 body item(s), 60 field item(s), 352999 translatable character(s)
estimated tokens: 561040 in, 192120 out, covering a translate pass and a verify pass
estimated cost: $1.52 at the batch rate $1.00 in / $5.00 out per MTok, which is the Sonnet 5 intro rate and expires after 2026-08-31
  the same run after 2026-08-31 costs about $2.28 at $1.50 / $7.50 per MTok
  assumptions: 4 characters per English token, Farsi output at 2x the source token count, 4000 overhead tokens per request, 600 output tokens per verify response. An estimate, not a quote.
```

Dev, all 11 posts: 866 body items, 30 field items, 97,858 characters, 185,876 in / 55,538 out, **$0.46** at the intro batch rate ($0.70 after 2026-08-31).

Both figures agree with RESEARCH's "the whole 26-post backlog is well under $5", with margin.

## Task Commits

Each task was committed atomically:

1. **Task 1: CLI surface, dataset-safe client, loud header, ADMIN resolution** - `e19cce3` (feat)
2. **Task 2: Post selection and D-08 staleness reporting** - `7e89652` (feat)
3. **Task 3: Translatable extraction, cost estimate, dry-run path and write-scope probe** - `7d9d9f3` (feat)

## Files Created/Modified

- `scripts/translate-posts.ts` - The pipeline CLI: flag surface, raw-perspective client, ADMIN resolution, selection with staleness reporting, translatable enumeration, cost estimate, run-state artifact, write-scope probe, and a named seam for plan 03-08.
- `.planning/phases/03-translation-pipeline/artifacts/blog_posts_dev-2026-08-22T21-10-22.640Z.json` - Dev dry-run state, 11 posts.
- `.planning/phases/03-translation-pipeline/artifacts/blog_posts-2026-08-22T21-10-29.925Z.json` - Production dry-run state, 26 posts.

## Decisions Made

- **The run-state artifact carries `sourceFingerprintSha256`, not the fingerprint.** The structural fingerprint is the entire body serialized with the translatable slots blanked, so for the production backlog it is hundreds of kilobytes of document structure written into a version-controlled planning directory. Plan 03-08 asks exactly one thing of it, equality, and a digest answers equality exactly. The full strings stay in memory where a mismatch can still be diffed. This also keeps T-03-04's "ids, labels, counts and fingerprints only" honest rather than nominal.
- **The header is verified, not just printed.** `client.config().dataset` is compared against the announced dataset before the first read, and a disagreement aborts. A read-back that can drift from the client it describes is a read-back that lies at the worst possible moment.
- **`--execute` exits 1 at the seam.** Falling through to a silent no-op would let an operator believe a paid run had happened. The message names plan 03-07 and plan 03-08 and states that nothing was written.
- **The `--all` brake is evaluated on the working set.** The plan phrased it as the candidate set; the working set is the strictly more correct target, because under `--retranslate` it can hold posts the candidate query never returned, and it is the set that would actually be paid for.
- **`--retranslate` promotes a non-stale sibling only alongside `--slug`.** A deliberate single-post retranslation is legitimate; the same behaviour across the backlog would rewrite every Farsi draft in the dataset.
- **The estimate over-states rather than under-states.** Farsi output is assumed at 2x the English source token count and every request carries 4,000 overhead tokens, so the printed figure reads as a ceiling. An estimate that flatters the run is worse than no estimate.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Fingerprint stored as a SHA-256 digest in the run-state artifact**

- **Found during:** Task 3
- **Issue:** The plan asks the artifact to carry "the source fingerprint". Carried literally, the production artifact would be roughly 700 KB of blanked document structure committed to `.planning/`, which sits awkwardly against threat T-03-04's stated contract of "ids, labels, counts and fingerprints only" and against the same task's instruction to include no body content beyond what the counts need.
- **Fix:** The artifact carries `sourceFingerprintSha256`, a 64-character digest of the same value, with a docblock stating why. Equality, the only property plan 03-08 needs, is preserved exactly.
- **Files modified:** `scripts/translate-posts.ts`
- **Verification:** Production artifact is 103 KB rather than roughly 700 KB; the leak assertion passes on both artifacts; `npx tsc --noEmit` and `npx eslint` both exit 0.
- **Committed in:** `7d9d9f3` (Task 3 commit)

**2. [Rule 2 - Missing Critical] Header line asserted against the client's resolved config**

- **Found during:** Task 1
- **Issue:** The plan requires the header to print before any read, which defends against a wrong-dataset run only if the printed value is the value the client actually uses. Nothing checked that.
- **Fix:** `run()` compares `client.config().dataset` against the announced `dataset` and throws before the first read if they disagree.
- **Files modified:** `scripts/translate-posts.ts`
- **Verification:** Runs against both env targets print matching values and proceed; the branch is a tripwire that cannot fire today.
- **Committed in:** `e19cce3` (Task 1 commit)

**3. [Rule 2 - Missing Critical] `--execute` fails loudly at the seam**

- **Found during:** Task 3
- **Issue:** The plan says to leave a marked seam and to implement no model call. It does not say what `--execute` should do in the meantime, and a silent return would print a dry-run-shaped success for a run the operator asked to be real.
- **Fix:** `--execute` prints a message naming plans 03-07 and 03-08, states that nothing was written, and exits 1.
- **Files modified:** `scripts/translate-posts.ts`
- **Verification:** Code path read; the dry-run acceptance runs are unaffected and still exit 0.
- **Committed in:** `7d9d9f3` (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (3 missing critical)
**Impact on plan:** All three tighten properties the plan already asked for, in the direction the threat model points. No scope creep and no new dependency.

## Issues Encountered

- **ISO timestamps are not legal Windows filenames.** `<dataset>-<ISO timestamp>.json` contains colons, which Windows rejects. The colons are replaced with dashes in the filename only; `createdAt` inside the JSON is the unmodified ISO string. Filenames still begin with the dataset name as the acceptance criterion requires.
- **The GROQ projection flattens `slug` to a string.** The draft shell therefore has to rebuild `{ _type: "slug", current }` rather than pass the projected value through. Caught by the write-scope probe's server-side validation, which is exactly the class of error that probe exists to surface before a paid run.
- **Every `metaDescription` in both datasets is at or near the 160-character warning bound**, and four production posts already exceed it in English. The informational note fires for all 11 dev and all 26 production posts. That is a real signal for the translate prompt in plan 03-08, which should ask for a Farsi rendering under 160 characters, and it is not a defect here.

## Known Stubs

- The `--execute` path is deliberately unimplemented and exits 1 naming plan 03-08. This is the plan's stated seam, not an accidental stub.
- `--resume <batch-id>` is parsed and echoed but not consumed. Plan 03-08 owns it, as the plan's artifact table states.

## User Setup Required

None for this plan. The standing phase blocker is unchanged and does not affect anything here: `ANTHROPIC_API_KEY` is absent from all three env files and gates plan 03-05. This plan makes no model call and runs end to end without it, as required.

## Next Phase Readiness

- Plan 03-08 attaches at the marked seam and inherits `units` (body items, field items with labels, source fingerprints, per-post estimates), `adminUserId`, `resumeArg` and `envFile` as they stand. Nothing above the seam needs rewriting.
- The write-scope probe passed on both `blog_posts_dev` and `blog_posts`, so the D-10 rehearsal and the D-11 proof run are not gated on a token question.
- The D-08 stale and `--retranslate` branches have no live coverage yet, because no Farsi sibling exists on either dataset. They must be exercised during the 03-08 rehearsal, once the first Farsi draft is written and its source is touched.
- Repeated dry runs accumulate one run-state artifact each. Two are committed here as evidence. Plan 03-09 or the phase wrap should decide whether older ones are pruned.

## Self-Check: PASSED

- `scripts/translate-posts.ts` - FOUND
- `.planning/phases/03-translation-pipeline/artifacts/blog_posts_dev-2026-08-22T21-10-22.640Z.json` - FOUND
- `.planning/phases/03-translation-pipeline/artifacts/blog_posts-2026-08-22T21-10-29.925Z.json` - FOUND
- Commit `e19cce3` - FOUND
- Commit `7e89652` - FOUND
- Commit `7d9d9f3` - FOUND

---
*Phase: 03-translation-pipeline*
*Completed: 2026-08-22*
