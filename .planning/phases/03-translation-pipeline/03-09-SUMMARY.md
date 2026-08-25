---
phase: 03-translation-pipeline
plan: 09
subsystem: infra
tags: [sanity, portable-text, claude-code-cli, subscription-transport, token-usage, assertions, dev-rehearsal]

# Dependency graph
requires:
  - phase: 03-translation-pipeline (plan 03-08)
    provides: the whole model half of scripts/translate-posts.ts, the transport, the blocking gate, the verify pass and the draft write
  - phase: 03-translation-pipeline (plan 03-07)
    provides: selection, enumeration, the run-state artifact and the printed dataset header
  - phase: 03-translation-pipeline (plan 03-03)
    provides: extractTranslatables, applyTranslatables and structuralFingerprint
  - phase: 03-translation-pipeline (plan 03-02)
    provides: the sourceUpdatedAt field and the two pipeline selection queries
  - phase: 03-translation-pipeline (plan 03-06)
    provides: content/fa-glossary.json frozen at 98 approved entries
provides:
  - "scripts/checks/translation.check.ts --post-run: live, read-only assertions against Farsi drafts the pipeline actually wrote, with an optional --slug"
  - "The permanent D-12 data-layer tripwire: zero Farsi documents may carry the publish-cron status, asserted on any dataset the check is pointed at"
  - "Eleven Farsi draft documents in blog_posts_dev, the first that have ever existed in this project"
  - "A captured, verbatim run log with measured per-pass token totals at $0 marginal"
  - "A diagnosed, reproducible failure mode of the translate pass that 03-10 must close before the production run"
affects: [03-10 production proof run, Phase 4 Farsi presentation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A live check that is safe to point at production because every statement in it is a fetch"
    - "Anti-vacuity guards on content, not only on structure: a perfect copy has a perfect fingerprint"
    - "An assertion that tolerates a state the system supports on purpose, and fails only on a state that is impossible"
    - "Whole documents are fetched rather than projected when an assertion is about a key being absent"

key-files:
  created:
    - .planning/phases/03-translation-pipeline/artifacts/translate-dev.log
    - .planning/phases/03-translation-pipeline/artifacts/blog_posts_dev-2026-08-25T15-37-36.581Z.json
    - .planning/phases/03-translation-pipeline/artifacts/blog_posts_dev-2026-08-25T15-37-49.284Z.json
    - .planning/phases/03-translation-pipeline/artifacts/blog_posts_dev-2026-08-25T15-50-09.849Z.json
    - .planning/phases/03-translation-pipeline/artifacts/blog_posts_dev-2026-08-25T16-59-49.944Z.json
    - .planning/phases/03-translation-pipeline/artifacts/blog_posts_dev-2026-08-25T17-30-31.419Z.json
    - .planning/phases/03-translation-pipeline/artifacts/blog_posts_dev-2026-08-25T17-59-44.632Z.json
    - .planning/phases/03-translation-pipeline/artifacts/gate-mismatch-what-neuronomixer-stands-for-ai-data-and-the-future-of-syste-2026-08-25T16-54-20.735Z.json
    - .planning/phases/03-translation-pipeline/artifacts/gate-mismatch-why-explainable-ai-matters-more-than-you-think-2026-08-25T17-09-32.145Z.json
    - .planning/phases/03-translation-pipeline/artifacts/gate-mismatch-why-explainable-ai-matters-more-than-you-think-2026-08-25T17-21-12.258Z.json
  modified:
    - scripts/checks/translation.check.ts
    - .gitignore

key-decisions:
  - "The sourceUpdatedAt anchor is asserted as `equal to or older than` the source _updatedAt, never `equal to`. A stale sibling is a state D-08 supports on purpose, so an equality assertion would make the check unusable as a routine gate the first time Saeid edited an English post, and the D-12 tripwire it carries is meant to live in this check permanently. An anchor that LEADS its source is still a failure, because such a sibling could never be reported stale again"
  - "The check names the literal publish-cron status value, which scripts/translate-posts.ts is forbidden to contain. A writer must not know the value; a tripwire has to"
  - "Whole Sanity documents are fetched rather than projected, because three assertions are about keys being ABSENT and a projection cannot tell an absent key from one it did not ask for"
  - "The ordered markDefs href list is asserted separately from the fingerprint, deliberately duplicating it, so that a broken link fails with a message about links rather than about a byte offset"
  - "A dataset with zero Farsi documents exits non-zero with a no-sibling message rather than passing. A check that passes vacuously on an empty dataset is worse than no check, and it is what makes the production guard meaningful"
  - "scripts/translate-posts.ts was NOT changed in response to the gate blocks. The plan says a blocked post is the gate doing its job and must be diagnosed rather than worked around, and the fix belongs to 03-10 where the production run is designed"

patterns-established:
  - "Pattern: two anti-vacuity guards per translated document, one on how many strings changed and one on how many carry the target script"
  - "Pattern: a SKIPPED row that names its reason, printed rather than silently passed, when a check cannot reach a dependency"
  - "Pattern: a live check whose every statement is a fetch, so it can be pointed at production as a routine gate"

requirements-completed: [PIPE-01, PIPE-02]

coverage:
  - id: D1
    description: "The --post-run mode: per-sibling assertions for draft id, language, translationOf, status, slug reuse, the staleness anchor, the structural fingerprint, the ordered markDefs hrefs, absent curation keys and the D-06 notes shape"
    requirement: PIPE-02
    verification:
      - kind: integration
        ref: "npx tsx --env-file .env.local scripts/checks/translation.check.ts --post-run: exit 0, 238 assertions over 11 siblings, ALL PASS"
        status: pass
      - kind: integration
        ref: "the same command before any Farsi document existed: exit 1 with the no-sibling message, recorded verbatim below"
        status: pass
    human_judgment: false
  - id: D2
    description: "The two anti-vacuity guards (T-03-30): at least 80 percent of translatable strings differ from the source and at least 80 percent carry Arabic script"
    requirement: PIPE-02
    verification:
      - kind: integration
        ref: "measured per post across 11 siblings: changed 85.2 to 100 percent, Arabic script 85.2 to 100 percent, printed on every line of the run log"
        status: pass
    human_judgment: false
  - id: D3
    description: "The D-12 tripwire (T-03-03): zero documents carry the Farsi language and the publish-cron status, asserted dataset-wide regardless of --slug and permanently rather than for this run"
    requirement: PIPE-02
    verification:
      - kind: integration
        ref: "count asserted at 0 on blog_posts_dev with 11 Farsi documents present, and at 0 on blog_posts"
        status: pass
    human_judgment: false
  - id: D4
    description: "The dev rehearsal (D-10): the first run was a dry run, the first run that wrote anything targeted blog_posts_dev, and 11 Farsi drafts now exist there"
    requirement: PIPE-01
    verification:
      - kind: integration
        ref: "translate-dev.log, first line under ## Dry run carries dataset=blog_posts_dev and mode=DRY RUN; 11 drafts created across four writing commands; production Farsi count re-asserted at 0"
        status: pass
    human_judgment: false
  - id: D5
    description: "Spend recording (SC-5, T-03-08): TokenUsage rows exist under both activities with CLI-reported counts at cost 0"
    requirement: PIPE-01
    verification:
      - kind: integration
        ref: "post-run spend line: translate-post 6 row(s) 536467 in / 242944 out, translate-verify 4 row(s) 187521 in / 25725 out in the last 24h"
        status: pass
    human_judgment: true
    rationale: "The assertion passes, but the rows are incomplete: the backlog sweep booked zero rows for 22 of its model calls because spend is written once at the end of a run and that run aborted before reaching it. The per-post usage survives in the run-state artifacts. Recorded as a defect for 03-10 rather than as a pass without qualification."
  - id: D6
    description: "D-08 idempotence, staleness reporting and hand-edit protection (T-03-12) demonstrated rather than claimed"
    requirement: PIPE-02
    verification:
      - kind: integration
        ref: "second default run: 11 candidates to 0, zero model calls, zero tokens; a touched source produces a stale report naming all four values and is not retranslated; a marker written over a Farsi draft title survives a default run and was restored"
        status: pass
    human_judgment: false

# Metrics
duration: 2h40m
completed: 2026-08-25
status: complete
---

# Phase 3 Plan 09: Dev Rehearsal and Post-Run Assertions Summary

**The pipeline wrote its first eleven Farsi drafts, all of them into the dev dataset behind a dry run, and every claim the phase makes about them is now a named assertion with a real failure message rather than a success line, including the two that a structurally perfect English passthrough would fail.**

## Performance

- **Duration:** ~2h40m wall clock, nearly all of it model time
- **Started:** 2026-08-25T15:32Z
- **Completed:** 2026-08-25T18:12Z
- **Tasks:** 3 of 3
- **Files modified:** 2 (`scripts/checks/translation.check.ts`, `.gitignore`), 10 evidence artifacts created

## Accomplishments

- Replaced the reserved `--post-run` stub with a real, read-only live check: 238 assertions over 11 siblings, each with a message stating expected versus actual and a remedy.
- Ran the pipeline against real data for the first time, on `blog_posts_dev`, dry run first. Eleven Farsi drafts exist where none ever had.
- Exercised the sibling count subquery with Farsi documents actually present, which no earlier plan could do. A second default run finds zero candidates against the first run's eleven and makes no model call.
- Caught a real content-loss defect in model output with the D-05 tier 1 gate, three times, and diagnosed it to a single reproducible cause rather than retrying past it.
- Proved the production dataset is untouched, with a read-only command that exits non-zero rather than passing vacuously.

## Task Commits

1. **Task 1: Implement the `--post-run` mode of translation.check.ts** - `3d6fc75` (feat)
2. **Task 2: The dev rehearsal run (D-10)** - `829550e` (feat)
3. **Task 3: Prove D-08 idempotence and the retranslate path** - `eeafeb9` (feat)

## Required evidence

### The dry-run header line, verbatim

The first line under `## Dry run` in `.planning/phases/03-translation-pipeline/artifacts/translate-dev.log`, and the evidence for roadmap success criterion 4:

```
translate-posts: projectId=pz9ppas8 dataset=blog_posts_dev apiVersion=2025-10-07 mode=DRY RUN
```

### The exact message `--post-run` produced before any sibling existed

Run against `.env.local` at the end of Task 1, before Task 2 wrote anything. Exit code 1.

```
--post-run: dataset blog_posts_dev carries 0 Farsi document(s), so there is no sibling to assert against and every per-document assertion would be vacuous. Expected at least one document with language "fa". Remedy: run the pipeline against this dataset first, or pass the env file of a dataset that has been translated.
```

The same message, with `blog_posts` substituted, is what the production guard still produces today. That is the correct result: it is a failure, not a pass, and it will stay a failure until plan 03-10 runs.

### The chosen single post and its item-kind breakdown

`foundational-tools-for-data-related-careers`, picked because it is the only dev candidate carrying table cells, so D-13 was exercised on the very first run that wrote anything.

```
foundational-tools-for-data-related-careers  body 81 (span 42, cell 39, alt 0, caption 0)  fields 3 (title, metaDescription, mainImage.alt)  chars 10682
```

84 strings in one payload, 39 of them table cells, which are bare strings invisible to any walker that only looks at spans. Its `--post-run` line afterwards:

```
foundational-tools-for-data-related-careers: sibling=drafts.c8f2b68b-2366-47a3-843c-3c89fc6d810b items=81 (span 42, cell 39, alt 0, caption 0) changed=85.2% arabic-script=85.2% hrefs=2 notes="Verify pass clean (2026-08-25)"
```

### Per-pass token totals, as reported by the CLI

| Run | translate calls | translate in | translate out | verify calls | verify in | verify out |
|---|---|---|---|---|---|---|
| Single post execute | 2 | 76,904 | 49,529 | 1 | 47,840 | 5,526 |
| Backlog sweep | 15 | 949,992 | 372,958 | 7 | 372,287 | 30,353 |
| Backlog sweep, resume | 3 | 309,293 | 99,329 | 2 | 90,162 | 11,894 |
| Blocked post, second attempt | 2 | 78,046 | 77,413 | 1 | 49,519 | 8,305 |
| **Total** | **22** | **1,414,235** | **599,229** | **11** | **559,808** | **56,078** |

1,974,043 input tokens and 655,307 output tokens across both passes. Subscription-funded, $0 marginal (D-16). Input counts are uncached plus cache-creation plus cache-read, per the 03-08 decision.

### Dataset state

| Measure | Before | After |
|---|---|---|
| Farsi documents in `blog_posts_dev` | 0 | 11 |
| Farsi documents in `blog_posts` | 0 | 0 |
| Approved English dev candidates with no sibling | 11 | 0 |
| Farsi documents carrying the publish-cron status, either dataset | 0 | 0 |

Eleven drafts across four writing commands: 1 + 7 + 2 + 1. The count matches what the runs reported creating, and the `--post-run` check separately asserts that every `translationOf` reference resolves and that no two Farsi documents claim the same source.

## Decisions Made

1. **The staleness anchor may lag its source but never lead it.** See the deviations section: this is the one substantive change made after Task 1.
2. **The check names the publish-cron status value, which the writer must not.** `scripts/translate-posts.ts` is grep-asserted to be free of that literal so a writer cannot stamp it even by accident. The tripwire is the opposite case: it exists to watch for that exact value, so it has to say it. Documented at the constant.
3. **Whole documents, not projections.** Three assertions are about keys being absent (`featured`, `heroOrder`). A GROQ projection returns what it was asked for, so it cannot distinguish a key that is absent from one that was never requested. Fetching the document unprojected makes `Object.hasOwn` meaningful.
4. **The href list is asserted twice on purpose.** The structural fingerprint already covers every `markDefs` href. "Every link still works" is a named roadmap success criterion, and a criterion deserves a failure message that says a link changed rather than that a fingerprint moved at byte 8061.
5. **Zero Farsi documents is a failure, not a pass.** A check that reports ALL PASS on an empty dataset teaches its reader to trust a green line that means nothing. It is also exactly what makes the production guard informative today.
6. **The transport was not changed to accommodate the gate blocks.** Diagnosed, recorded, and handed to 03-10.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The `sourceUpdatedAt` assertion could not survive a live dataset**

- **Found during:** Task 3, immediately after the staleness step
- **Issue:** Task 1 implemented the plan's wording literally: `sourceUpdatedAt` equals the source `_updatedAt`. Task 3 then deliberately made one sibling stale, exactly as the plan instructs, and the check failed on it. The two instructions in the same plan contradict each other, and the assertion is the wrong one: a stale sibling is a state D-08 supports on purpose, reports, and refuses to touch without `--retranslate`. An equality assertion means the check starts failing the first time Saeid edits any English post, which would retire the permanent D-12 tripwire it carries along with it.
- **Fix:** `sourceUpdatedAt` must be present and non-empty, and must be equal to or older than the source's `_updatedAt`. An anchor that leads its source still fails, because such a sibling could never be reported stale again. Lagging anchors are printed as `STALE` on the post's line and listed in their own summary block, so staleness is visible rather than silently tolerated.
- **Files modified:** `scripts/checks/translation.check.ts`
- **Verification:** `--post-run` exit 0 with 238 assertions and the one stale sibling reported; `npx tsc --noEmit` and `npx eslint` both exit 0
- **Committed in:** `eeafeb9`

**2. [Rule 3 - Blocking] The plan's method of touching a source does nothing**

- **Found during:** Task 3
- **Issue:** The plan suggested bumping `_updatedAt` by "patching a field to its own current value". Sanity treats a same-value `set` as a no-op and creates no revision. Tried first and captured: `_updatedAt` came back unchanged at `2026-08-20T20:22:31Z`, so there was no stale sibling to report and the whole staleness step would have proved nothing.
- **Fix:** A set-and-restore pair on `title`: set it to itself plus one trailing space, then set it straight back. Two revisions, final content byte identical to the starting content, `_updatedAt` moved to `2026-08-25T17:59:30Z`. Both the failed attempt and the working one are recorded verbatim in the log.
- **Files modified:** none (a scratch script, not committed)
- **Verification:** the touch script re-fetches and reports `title byte identical to before: true` and `_updatedAt moved: true`
- **Committed in:** `eeafeb9` (the capture and the note in the log)

### Departures from the letter of the plan

**3. The backlog sweep was run twice, and the two runs briefly overlapped**

The sweep was launched as a background command. The harness reported it stopped after about 66 minutes and the resume run was started on that basis. It had not stopped; it ran on for another 12 minutes, and for part of that time two writing commands were live against `blog_posts_dev`. This was an execution error on my part, not a defect in the pipeline, and it is written up in full in the log under "Overlapping runs" rather than tidied away.

What it cost: the sweep's own post-run count assertion tripped (`the Farsi document count is 9 but 8 was expected`), which is the assertion working exactly as designed, and the sweep exited before booking its spend rows.

What it did not cost: nothing was corrupted or duplicated. Verified rather than assumed, by the `--post-run` assertions that every `translationOf` resolves and that no two Farsi documents share a source, over all eleven.

**4. Three gate blocks and one hard failure, none worked around**

The plan says a blocked post is more informative than a clean run, and that is how it went. `learning-excel-for-free-in-2025` came back fenced on both attempts and was reported failed with no draft. `what-neuronomixer-stands-for-...` and `why-explainable-ai-matters-more-than-you-think` were blocked by the structural gate, the latter twice. All four were resolved by a later run rather than by changing the code, and every one is diagnosed in the log.

**5. `scripts/translate-posts.ts` was left untouched despite a diagnosed defect**

The empty-string defect below is a real bug with a clear fix, and the fix is a change to the paid model path in the middle of a rehearsal that is supposed to measure that path as built. It is also outside this plan's `files_modified`. Recorded for 03-10 instead.

---

**Total deviations:** 2 auto-fixed (1 x Rule 1, 1 x Rule 3) and 3 documented departures.
**Impact on plan:** Both auto-fixes were forced by the plan's own instructions contradicting themselves or not working. Neither widened scope. The staleness one matters beyond this plan: without it, `--post-run` could not be the permanent home the threat model wants for the D-12 tripwire.

## Issues Encountered

### The gate caught real content loss, three times, from one cause

Three gate blocks on two posts. Both fingerprints were diffed at the reported offset and the cause is identical every time: **the model returned an empty string for a slot, and an empty leaf stops being a translatable slot.**

The lost slot in both posts is the bare English definite article `"The "` immediately before an inline link:

- `why-explainable-ai-matters-more-than-you-think`, block k51: `["The ", "EU AI Act", ", which enters its enforcement phase in August 2026, ..."]`
- `what-neuronomixer-stands-for-ai-data-and-the-future-of-systems`, block k114: `["The ", "European Commission defines Industry 5.0", " through three pillars: ..."]`

Persian has no definite article, so an empty response is a defensible translation of that fragment in isolation. It is still content loss at the document level, and the count check cannot see it: the model returned exactly the number of strings demanded, one of them empty. `walkSlots` skips a span whose `text` is empty, so the emptied slot is never blanked in the translated fingerprint while it is blanked in the source's. The two differ and the gate refuses the write.

This is the first time in the phase the gate has blocked real model output rather than a deliberately corrupted body, and it is the strongest evidence yet that D-05 tier 1 was worth building.

The defect is per-call, not per-post: both posts blocked and then passed on a later attempt with nothing changed.

### The fence rate did not fall after 03-08's hardening

Measured across 15 per-post translate attempts:

- 6 first responses arrived fenced (40.0 percent).
- 1 further first response was malformed JSON.
- 7 of 15 first attempts failed to parse (46.7 percent), each costing a retry.
- 1 post was fenced on both attempts and lost for that run.
- 22 translate calls for 15 post attempts: 47 percent more calls than a clean run.

No fence stripping was added. A fenced response is still a broken contract.

### Spend is booked once, at the end of a run

The backlog sweep made 22 model calls and booked zero `TokenUsage` rows, because `recordTokenUsage` runs after the post-run count assertion and that assertion threw. The per-post usage survives in the run-state artifact, so nothing is unknowable, but it is not on the books. On a 26-post production run this is the difference between a complete spend record and none.

### Sanity same-value patches are no-ops

Recorded because it will come up again: `client.patch(id).set({ field: currentValue })` creates no revision and does not move `_updatedAt`.

## Known Stubs

None. The `--post-run` mode has no placeholder branches; the only non-asserting path is the `DATABASE_URL`-absent case, which prints an explicitly labelled SKIPPED row naming its reason rather than passing silently, exactly as the plan specifies.

## What plan 03-10 inherits

1. **Reject an empty translated string in code, before reassembly.** `readStrings` already checks the count; it should also reject an empty string in a slot whose source string was non-empty, and the translate instruction should state that no slot may come back empty. That converts a cryptic byte-offset gate block into a named error and makes it recoverable through the existing single retry. On this rehearsal's numbers roughly one production post in six blocks on it otherwise.
2. **Book spend per post, or on the failure path.** Any run that trips the count assertion or is interrupted currently loses its entire Postgres spend record.
3. **The fence rate is unchanged at 40 percent of first attempts.** 26 posts at these rates means roughly a dozen wasted calls and one or two posts needing a second run. The sequential per-post design should be reviewed against the subscription window before the production run.
4. **Never run two writing commands against one dataset at once**, and confirm a long-running background write is actually finished rather than trusting a harness notification.
5. **The production guard is live.** `npx tsx --env-file .env.vercel-prod scripts/checks/translation.check.ts --post-run` currently exits 1 with the no-sibling message. After 03-10 it must exit 0 with ALL PASS, and it is the same command in both cases.
6. **T-03-05 in the phase threat register still understates the CLI transport.** 03-08 closed the hole by denying every built-in tool on every call; the register entry still reads as a count-gate problem. This plan did not touch the register, so it remains open for phase close.
7. **One dev sibling is deliberately left stale** (`inside-the-data-ecosystem`), because the retranslation dry-run plan was correct and the plan says not to execute it. `--post-run` reports it and passes.

## User Setup Required

None. Everything ran on Saeid's existing Claude Code subscription. No API key exists anywhere in this pipeline by design (D-16).

## Verification Evidence

| Gate | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | exit 0 |
| Lint | `npx eslint scripts/checks/translation.check.ts` | exit 0 |
| Offline suite | `npx tsx scripts/checks/translation.check.ts` | `translation.check.ts: ALL PASS` |
| Dev post-run | `npx tsx --env-file .env.local scripts/checks/translation.check.ts --post-run` | exit 0, 238 assertions over 11 siblings, ALL PASS |
| Dev post-run, one slug | `... --post-run --slug foundational-tools-for-data-related-careers` | exit 0, 27 assertions, ALL PASS |
| Production guard | `npx tsx --env-file .env.vercel-prod scripts/checks/translation.check.ts --post-run` | exit 1, 0 Farsi documents, no-sibling message |
| Idempotence | `npx tsx --env-file .env.local scripts/translate-posts.ts --all` | exit 0, 0 candidates, 11 fresh siblings, no model call |
| Log leak scan | `grep -c` for the key prefix and both Postgres URL schemes over `translate-dev.log` | 0, 0, 0 |
| Log header | first line under `## Dry run` | carries ` dataset=blog_posts_dev ` and ` mode=DRY RUN` |
| Production banner | `## Single post execute` section | 0 occurrences of `TARGET IS THE PRODUCTION DATASET` |

## Self-Check: PASSED

All claimed files exist on disk and all three task commits resolve in `git log`:

- FOUND `scripts/checks/translation.check.ts`
- FOUND `.planning/phases/03-translation-pipeline/artifacts/translate-dev.log`
- FOUND all six `blog_posts_dev-2026-08-25T*.json` run-state artifacts named above
- FOUND all three `gate-mismatch-*` artifacts named above
- FOUND commit `3d6fc75`, FOUND commit `829550e`, FOUND commit `eeafeb9`
