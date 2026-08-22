---
phase: 03-translation-pipeline
plan: 01
subsystem: infra
tags: [npm, lockfile, prisma, token-usage, preflight, env, scripts]

# Dependency graph
requires:
  - phase: 02-content-model
    provides: The `language`/`translationOf` schema fields and the live `EN_LANGUAGE` read filter, which is what makes a translation pipeline safe to build at all.
provides:
  - "A green `npm ci`: the lockfile is back in sync with `package.json`, so CI and Vercel can install again and the D-11 push-and-deploy gate is unblocked."
  - "`scripts/lib/token-usage.ts`: the first CLI-side `TokenUsage` writer, exporting `resolveAdminUserId()`, `recordTokenUsage()` and `TokenUsageRow`."
  - "`scripts/checks/env-preflight.check.ts`: a repeatable, secret-safe probe of key material and database parity for any env file."
  - "`artifacts/preflight.md`: live answers to RESEARCH assumptions A2, A3 and A4, plus the phase's one open blocker."
affects: [03-02, 03-03, 03-04, 03-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "`scripts/lib/` is now a real directory: pure helpers shared by CLI scripts, importing `src/` by relative path (the scripts tree does not use the `@/` alias)."
    - "CLI spend recording is awaited and never swallowed; the route handlers' fire-and-forget shape is deliberately not copied, because a CLI exits before a background rejection can be logged."
    - "A check script's rows carry three states (PASS / FAIL / BLOCKER) so a gap owned by a later plan stays visible without permanently reddening a check of this plan's plumbing."

key-files:
  created:
    - scripts/lib/token-usage.ts
    - scripts/checks/env-preflight.check.ts
    - .planning/phases/03-translation-pipeline/artifacts/preflight.md
  modified:
    - package-lock.json

key-decisions:
  - "STATE.md's `@sanity/visual-editing` diagnosis of the `npm ci` failure is superseded: the root manifest was never out of sync, the failure was four transitive version mismatches, and the repair is `npm install --package-lock-only`."
  - "`env-preflight.check.ts` distinguishes FAIL (this phase's plumbing is broken) from BLOCKER (a later plan is gated on a human action). A two-state check would either hide a real break or stay red for a reason no code change can fix."
  - "`recordTokenUsage` is awaited with no error swallowing, and `resolveAdminUserId` throws rather than returning null, so a missing ADMIN aborts a run before money is spent instead of losing the spend record after."
  - "The TDD RED gate for task 2 ran from the scratchpad rather than as a committed test file, because this repo has no test framework by design and the plan declared exactly one file for that task."

metrics:
  duration: ~10m
  completed: 2026-08-22
status: complete
---

# Phase 3 Plan 01: Wave 0 Preconditions Summary

Repaired `package-lock.json` so `npm ci` is green again for the first time in this milestone, and replaced the three open RESEARCH environment assumptions with live probe results, one of which turned up a real blocker.

## What was built

Three tasks, three commits, all autonomous.

**Task 1 (`eb58469`) repaired the lockfile.** `npm install --package-lock-only` (never a bare `npm install`, which would have reified the `--no-package-lock` `node_modules` that plan 01-01 had to untangle). The resulting delta matched the researched prediction exactly, so no reassessment was triggered.

**Task 2 (`56dc9a4`) added `scripts/lib/token-usage.ts`**, a new directory. It is the repo's first CLI-side writer of `TokenUsage`, which matters because `TokenUsage.userId` is a required foreign key and both existing writers take it from an authenticated session that a script does not have.

**Task 3 (`27f864e`) added `scripts/checks/env-preflight.check.ts` and recorded `artifacts/preflight.md`.** The check is live-only: it requires an `--env-file` and opens a read-only Postgres connection, so unlike `language-filter.check.ts` it has no offline section.

## Lockfile delta, verbatim

Entries before/after: **1821 / 1827**. Removals: **0**.

| Package | Before | After |
|---|---|---|
| `@sanity/client` | 7.23.0 | 7.26.2 |
| `@sanity/eventsource` | 5.0.2 | 5.0.4 |
| `get-it` | 8.8.0 | 8.8.3 |
| `nanoid` | 3.3.11 | 3.3.18 |

Six added entries, all under `node_modules/@tailwindcss/oxide-wasm32-wasi/node_modules/`: `@emnapi/core`, `@emnapi/runtime`, `@emnapi/wasi-threads`, `@napi-rs/wasm-runtime`, `@tybys/wasm-util`, `tslib`.

Framework pins compared at `HEAD~1` and `HEAD` and confirmed **unmoved**: `next` 15.5.14, `react` 19.1.0, `next-sanity` 11.4.2, `sanity` 4.10.2, `@anthropic-ai/sdk` 0.80.0, `prisma` 7.5.0. `package.json` is byte-unchanged (`git diff --stat package.json` empty). The T-03-10 stop condition therefore never fired, and the T-03-11 supply-chain concern is answered by evidence rather than ceremony: `npx next build` exit 0 and route-smoke 28/28 on the repaired tree.

## Preflight results, redacted to presence booleans

Full detail in `artifacts/preflight.md`. Every credential is a boolean; the only env value printed or recorded is the dataset name.

| Row | `.env.local` | `.env.vercel-prod` |
|---|---|---|
| `ANTHROPIC_API_KEY` | **BLOCKER** (missing) | **BLOCKER** (missing) |
| `SANITY_API_TOKEN` | PASS | PASS |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | PASS | PASS |
| `NEXT_PUBLIC_SANITY_DATASET` | PASS (`blog_posts_dev`) | PASS (`blog_posts`) |
| `DATABASE_URL` | PASS | PASS |
| `TokenUsage` table | PASS, 4 rows | PASS, 0 rows |
| `ADMIN` user | PASS, resolved | PASS, resolved |

Both runs exit 0 with `6/7 passed, 0 failed, 1 blocker(s)`. Output verified to contain no Anthropic key prefix and no Postgres URL scheme (grep count 0 for all three patterns), satisfying T-03-04.

## A2, A3, A4 resolved

**A2 (`ANTHROPIC_API_KEY` present in at least one env file): FALSE.** It is in none of `.env`, `.env.local` or `.env.vercel-prod`. The existing Claude call sites run on Vercel and take the key from the Vercel project environment, which is why nothing in the repo ever needed it locally. **This is the phase's one open blocker** and it needs a Saeid action before plan 03-05: add the key to `.env.local` (dev rehearsal) and `.env.vercel-prod` (proof run). Nothing between here and 03-05 is affected.

**A3 (`.env.vercel-prod` carries a `DATABASE_URL`): TRUE**, and reachable. The prod proof run can satisfy success criterion 5 directly from that env file.

**A4 (dev DB has `TokenUsage` and an `ADMIN`): TRUE, both.** The dev rehearsal can exercise the real spend path, so criterion 5 does not have to wait for production.

Both RESEARCH-authorised fallbacks (print spend to stdout plus an artifact, prove criterion 5 only on prod) are therefore **unused**.

## Deviations from Plan

### 1. [Rule 2 - Missing critical functionality] `env-preflight.check.ts` needed a third row state

- **Found during:** Task 3
- **Issue:** The plan specified PASS/FAIL rows plus an acceptance criterion that the `.env.local` run exits 0. When A2 came back FALSE, those two requirements became mutually unsatisfiable: a missing `ANTHROPIC_API_KEY` is a genuine FAIL under a two-state model, which exits 1. But the same plan instructs "if `ANTHROPIC_API_KEY` is absent from both files, record that as a BLOCKER row naming which env file it must be added to before plan 03-05 runs", which presumes execution continues.
- **Fix:** Added a third status, `BLOCKER`, for gaps owned by a later plan. FAIL still means this phase's plumbing is broken and still exits 1 (missing `SANITY_API_TOKEN`, absent `TokenUsage` table, unresolvable `ADMIN`). BLOCKER prints loudly, is counted separately in the summary line, and terminates with `PASS WITH N BLOCKER(S)` instead of `ALL PASS`, exiting 0. This preserves both the plan's literal instruction and honest check semantics; collapsing the two would either hide a real break or leave the check permanently red for a reason no code change can fix.
- **Files modified:** `scripts/checks/env-preflight.check.ts`
- **Commit:** `27f864e`

### 2. [Rule 1 - Test pollution] Probe row deleted from the dev database

- **Found during:** Task 2
- **Issue:** The RED/GREEN probe wrote a real `TokenUsage` row (`activity: "translate-probe"`) into the dev Postgres to prove `recordTokenUsage` returns a row count. Leaving it behind would have contaminated the dev spend table and the preflight's row count.
- **Fix:** Deleted it immediately after the GREEN run. Dev `TokenUsage` is back to its pre-probe 4 rows, which is the number `preflight.md` records.
- **Files modified:** none (database state only)
- **Commit:** n/a

### 3. [Observation, no action] RESEARCH's "48 root dependency entries"

Task 1 asked to confirm `package.json`'s 48 root dependency entries are unchanged. The actual counts are 43 `dependencies` plus 11 `devDependencies` (54). The number in RESEARCH appears to be a miscount and is not load-bearing: the stronger property was proven directly, namely that `package.json` is byte-identical before and after (`git diff --stat package.json` empty, and the commit contains exactly one file).

## TDD Gate Compliance

Task 2 carried `tdd="true"`, but the git log for this plan has **no `test(...)` commit**, so the standard RED gate commit is absent. This is deliberate, not an omission:

- This repo has **no test framework by design**. RESEARCH's Validation Architecture section states "Framework: None, by design. Verification is `npx tsx` check scripts plus Studio/browser smoke. Do not add vitest or pytest." A vitest RED commit would have violated an explicit phase constraint.
- The plan declared exactly one file for task 2 (`scripts/lib/token-usage.ts`). Committing an unplanned check script alongside it would have expanded the task's declared surface.

The RED/GREEN cycle was still executed and observed, from the scratchpad:

1. **RED:** a probe asserting all four `<behavior>` items was run with `npx tsx --env-file .env.local` and failed with `ERR_MODULE_NOT_FOUND` on the absent module.
2. **GREEN:** `scripts/lib/token-usage.ts` was written and the same unchanged probe passed, resolving a real ADMIN id, returning `0` for an empty rows array, and returning `1` for a single written row.
3. **REFACTOR:** none needed.

The durable, committed exercise of the same behaviours is `scripts/checks/env-preflight.check.ts`, which calls `resolveAdminUserId()` on every run against both env files. The one behaviour it does not cover is the empty-array short-circuit, which is asserted only by the scratchpad probe and by reading the two-line guard.

## Verification

All plan-level verification commands, re-run on the final tree:

| Command | Result |
|---|---|
| `npm ci --dry-run --ignore-scripts` | exit 0, `added 406 packages`, zero `EUSAGE` |
| `npx tsc --noEmit` | exit 0 |
| `npx next build` | exit 0 |
| `node scripts/checks/route-smoke.mjs --verify` | **28/28 passed**, `ALL PASS` |
| `npx tsx --env-file .env.local scripts/checks/env-preflight.check.ts` | exit 0, `dataset=blog_posts_dev` |
| `npx tsx --env-file .env.vercel-prod scripts/checks/env-preflight.check.ts` | exit 0, `dataset=blog_posts` |
| `npx eslint scripts/lib/token-usage.ts scripts/checks/env-preflight.check.ts` | exit 0, no output |
| `git show --name-only HEAD` (lockfile commit) | exactly one path |

Phase 2 regression, run unprompted to confirm the two new script files did not trip the closed allowlists: `npx tsx scripts/checks/language-filter.check.ts` reports `ALL PASS` with 17 schema fields and the sole-carrier list unchanged.

Task 2 grep criteria: `.catch(` count **0**, `await prisma.tokenUsage.createMany` count **1**, `role: "ADMIN"` count **1**.
Task 3 grep criteria: `process.env.NEXT_PUBLIC_SANITY_DATASET ??` count **0** (no silent dataset default).

## Known Stubs

None. Every function written in this plan is fully wired and exercised against a live database.

## Threat Flags

None. No new network endpoint, auth path or schema change was introduced. The three registered threats this plan owned were all mitigated as planned: T-03-10 (pinned lockfile delta, stop condition never fired), T-03-04 (presence booleans only, leak-scanned output and artifact), T-03-08 (`resolveAdminUserId` throws before spend, `recordTokenUsage` awaited with no swallow), T-03-15 (`npx next build` used throughout, `npm run build` never invoked).

## Blockers for later plans

**`ANTHROPIC_API_KEY` must be added to `.env.local` and `.env.vercel-prod` before plan 03-05 runs.** This is a Saeid action; the value is not derivable from anything in the repo. Everything between here and 03-05 (glossary mining, the Portable Text walker, the select query) is unaffected.

## Self-Check: PASSED

Files claimed created, all confirmed present on disk:
- `scripts/lib/token-usage.ts` FOUND
- `scripts/checks/env-preflight.check.ts` FOUND
- `.planning/phases/03-translation-pipeline/artifacts/preflight.md` FOUND

Commits claimed, all confirmed in `git log`:
- `eb58469` FOUND (`fix(03-01): repair package-lock.json so npm ci is green again`)
- `56dc9a4` FOUND (`feat(03-01): add scripts/lib/token-usage.ts for CLI spend recording`)
- `27f864e` FOUND (`feat(03-01): add env-preflight check and record the A2/A3/A4 answers`)
