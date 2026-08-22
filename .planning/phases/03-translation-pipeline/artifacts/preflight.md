# Phase 3 Environment Preflight

**Recorded:** 2026-08-22
**Produced by:** `scripts/checks/env-preflight.check.ts` (plan 03-01, task 3)
**Purpose:** answer RESEARCH assumptions A2, A3 and A4 from live probes, so no later plan discovers a missing key or a missing ADMIN mid-run.

Reproduce with:

```
npx tsx --env-file .env.local        scripts/checks/env-preflight.check.ts
npx tsx --env-file .env.vercel-prod  scripts/checks/env-preflight.check.ts
```

**Secret discipline:** every credential below is a presence boolean. The only environment value recorded verbatim is `NEXT_PUBLIC_SANITY_DATASET`, which is the operator read-back defence against a wrong-dataset run and is not a secret. No env value was pasted into this file and none was printed to the terminal. Asserted mechanically: the check's output contains no Anthropic key prefix and no Postgres connection-URL scheme (grep count 0 for all three patterns). Those patterns are deliberately not spelled out in this file either, so a future leak scan over the artifacts directory has no false positive to explain away.

---

## `.env.local` (dev rehearsal target)

Resolved dataset: **`blog_posts_dev`**
Exit code: **0** (`PASS WITH 1 BLOCKER(S)`)

| Row | Status | Detail |
|---|---|---|
| `ANTHROPIC_API_KEY` | **BLOCKER** | MISSING from this env file |
| `SANITY_API_TOKEN` | PASS | defined and non-empty |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | PASS | defined and non-empty |
| `NEXT_PUBLIC_SANITY_DATASET` | PASS | defined and non-empty, resolves to `blog_posts_dev` |
| `DATABASE_URL` | PASS | defined and non-empty |
| `TokenUsage` table | PASS | present, **4 rows** |
| `ADMIN` user | PASS | resolved via `resolveAdminUserId()` |

Summary line: `env-preflight: dataset=blog_posts_dev 6/7 passed, 0 failed, 1 blocker(s)`

## `.env.vercel-prod` (proof-run target)

Resolved dataset: **`blog_posts`**
Exit code: **0** (`PASS WITH 1 BLOCKER(S)`)

| Row | Status | Detail |
|---|---|---|
| `ANTHROPIC_API_KEY` | **BLOCKER** | MISSING from this env file |
| `SANITY_API_TOKEN` | PASS | defined and non-empty |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | PASS | defined and non-empty |
| `NEXT_PUBLIC_SANITY_DATASET` | PASS | defined and non-empty, resolves to `blog_posts` |
| `DATABASE_URL` | PASS | defined and non-empty |
| `TokenUsage` table | PASS | present, **0 rows** |
| `ADMIN` user | PASS | resolved via `resolveAdminUserId()` |

Summary line: `env-preflight: dataset=blog_posts 6/7 passed, 0 failed, 1 blocker(s)`

---

## RESEARCH assumptions, resolved

### A2: `ANTHROPIC_API_KEY` is present in at least one of the repo's env files

**FALSE. This is the one BLOCKER this preflight found.**

The key is absent from **all three** env files: `.env`, `.env.local` and `.env.vercel-prod`. Verified by a presence-only probe (`node --env-file=<f> -e ...`) across all three, plus the two check runs above.

The two existing Claude call sites (`src/app/api/cv/extract/route.ts`, `src/app/api/cv/design/route.ts`) run on Vercel, where the key comes from the Vercel project environment rather than a checked-out file. That is why nothing in the repo has ever needed it locally, and why RESEARCH could only mark it UNVERIFIED.

**Required before plan 03-05 (the Batch API run) can start:**

| Env file | Why | Which run it unblocks |
|---|---|---|
| `.env.local` | dev rehearsal spends real tokens against the Batch API | D-10 rehearsal |
| `.env.vercel-prod` | proof run against the production dataset | D-11 proof run |

Adding it is a Saeid action (the value is not derivable from anything in the repo). Nothing between here and 03-05 needs it: plans that only read Sanity, build the glossary, or exercise the pure Portable Text walker are unaffected. The check reports this as `BLOCKER` rather than `FAIL` precisely so the phase's plumbing checks stay honest about their own state while this stays visible.

### A3: `.env.vercel-prod` carries a `DATABASE_URL`

**TRUE.** `DATABASE_URL` is defined and non-empty in `.env.vercel-prod`, and it resolves to a reachable Postgres: `prisma.tokenUsage.count()` succeeded and `resolveAdminUserId()` returned an id.

Consequence: the prod proof run **can** satisfy success criterion 5 (recorded spend) from `--env-file .env.vercel-prod` directly. The RESEARCH fallback of printing spend to stdout plus an artifact is **not needed** for the prod run.

### A4: the dev database has the `TokenUsage` table and at least one `ADMIN` user

**TRUE, both.** `blog_posts_dev`'s paired Postgres has the `TokenUsage` table (4 pre-existing rows) and at least one `ADMIN` user, resolved by `resolveAdminUserId()`.

Consequence: the dev rehearsal **can** exercise the real spend path. Success criterion 5 does not have to wait for the production run, and the documented stdout-plus-artifact fallback is **not needed** on either target.

A round-trip write was proven during task 2: a probe row (`activity: "translate-probe"`) was inserted against the dev DB through `recordTokenUsage()`, returned a count of 1, and was deleted afterwards. Dev `TokenUsage` is back to its pre-probe 4 rows.

---

## Fallbacks: none required

RESEARCH pre-authorised a fallback for A3 and A4 ("the dev rehearsal prints spend to stdout and to its run artifact, and success criterion 5 is proven on the production run instead"). **Both assumptions came back true, so that fallback is unused.** It is recorded here only so a later reader knows it was considered and why it was dropped.

## Observations worth carrying forward

- **Prod `TokenUsage` is empty (0 rows) while dev has 4.** Not a failure: the table exists and an ADMIN resolves, which is all this phase needs. Recorded because it means the prod proof run's `TokenUsage` insert will be the first row in that table, so a silent no-op there would be invisible by row-count comparison alone. The awaited `createMany` in `scripts/lib/token-usage.ts` returns its own count, which is the check that does not depend on a non-empty baseline.
- **`.env` carries a `DATABASE_URL` but no Sanity variables at all** (no `SANITY_API_TOKEN`, no `NEXT_PUBLIC_SANITY_DATASET`). This is consistent with the standing STATE.md rule that `.env` exists for the Prisma CLI and points at production. It is not a valid `--env-file` for any pipeline script, since the hard `assert.ok` on `NEXT_PUBLIC_SANITY_DATASET` aborts immediately. That abort is the desired behaviour and is now enforced rather than assumed.
