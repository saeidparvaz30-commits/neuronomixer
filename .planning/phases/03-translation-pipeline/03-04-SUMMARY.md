---
phase: 03-translation-pipeline
plan: 04
status: complete
completed: 2026-08-23
requirements: [PIPE-01]
---

# Plan 03-04 Summary: D-11 deploy gate closed

## What happened

The gate ran across two sessions. On 2026-08-22 Task 1 assembled the pre-push evidence
pack (`03a0dc0`): all ten commands captured green, 79 commits ahead at capture time,
production branch proven to be `main` from two independent Vercel signals, and the
raw-perspective production Farsi count recorded at 0. The session ended at the Task 2
blocking checkpoint with nothing pushed.

On 2026-08-23 Saeid answered the checkpoint: **"Approved — push main"**. His authorisation
and the T-03-11 framing acceptance were recorded in the artifact (`43b5dfe`), then Task 3
executed.

## The push and deploy

- `git push origin main`: `5ea9ddb..43b5dfe`, 81 commits, no force, no `--no-verify`.
- Vercel deployment `dpl_A16hZgLQZJozQsmvXq8NkY8C8qmD` reached **READY** (~3 min build).
- `gitSource.sha` = `43b5dfef8ad9ac941c928bf481efbd55f57a97ed` = the pushed HEAD, branch
  `main`, target `production`; `www.neuronomixer.com` resolves to this deployment.
- The repaired lockfile (plan 03-01) installed cleanly on Vercel for the first time —
  the T-03-11 evidence pass for the three too-new package bumps.

## Liveness proofs

1. `language-filter.check.ts --live` exit 0 against `blog_posts` after the deploy
   (nine parities identical, pipeline selection 26/0 stale).
2. Live `/blog` HTTP 200 with the expected title, served by the pushed SHA.
3. Production Studio walked in an authenticated Chrome session: `Posts — English` /
   `Posts — Farsi` split live; Language radio, Translation of and Translation Notes all
   present on an English post with their pipeline descriptions; `sourceUpdatedAt`
   correctly absent on English documents (hidden rule, proven by the SHA match).

## Ordering invariant

Production Farsi count is **0 before and 0 after** the deploy. The English filter is
live on the regenerated production build before any Farsi document exists — exactly
the state plan 03-10 requires.

## Deviations

- Commit count was 80 at approval (81 pushed) versus the "roughly sixty" the plan
  anticipated; breakdown recorded in the artifact, no source drift after evidence capture.
- The Studio walk was automated through Saeid's authenticated Chrome rather than walked
  by Saeid personally; every field observation is screenshot-backed.

## State handoffs

- STATE.md records the gate CLOSED and the lockfile blocker resolved.
- The `ANTHROPIC_API_KEY` blocker for 03-05 stands; Saeid committed in-session to adding
  the key to `.env.local` and `.env.vercel-prod` himself. Re-run
  `npx tsx --env-file .env.local scripts/checks/env-preflight.check.ts` before 03-05.
