---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 3
current_phase_name: Translation Pipeline
status: in_progress
stopped_at: "Completed 03-08 (translate, gate, verify and draft write built; gate proven live on dev). Next: 03-09 dev rehearsal."
last_updated: "2026-08-25T15:30:36.305Z"
last_activity: 2026-08-25
last_activity_desc: "03-08 executed: the subscription-CLI transport, translate pass, blocking structural gate, verify pass, draft write and spend record are all in scripts/translate-posts.ts; the gate was proven live on blog_posts_dev by a deliberate corruption that blocked the write, and dev Farsi count is still 0"
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 17
  completed_plans: 15
  percent: 88
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-11)

**Core value:** Every published claim is correct and checkable; anything that puts unverified content under Saeid's byline is a failure regardless of reach.
**Current focus:** Phase 3 — Translation Pipeline

## Current Position

Phase: 3 (Translation Pipeline) — IN PROGRESS
Plan: 9 of 10 (03-01..03-08 all have SUMMARYs; 03-09, 03-10 remain)
Status: 03-08 CLOSED. `scripts/translate-posts.ts` now carries the whole model half: the subscription-CLI transport, the translate pass, the blocking structural gate, the verify pass, the draft write with its `--retranslate` patch path, and the `TokenUsage` record at cost 0. No Farsi draft exists on any dataset yet, because every `--execute` run in 03-08 was a gate probe that blocked before the write by design. Next: 03-09 (dev rehearsal plus the `--post-run` assertions).
Last activity: 2026-08-25 — 03-08 executed: three atomic commits (0029de0 transport and translate, 6633c75 reassembly, gate and verify, a961839 write, retranslate and spend); the gate was proven live on `blog_posts_dev` by patching reassembly to rewrite one `_key`, which blocked at first differing offset 10 and created nothing; tsc, eslint, the offline suite and the dry run all pass

Progress: [█████████░] 88% (15/17 plans)

## Performance Metrics

**Velocity:**

- Total plans completed: 7
- Average duration: ~1h active execution per plan
- Total execution time: ~2h05m active (~9h50m wall clock including three human checkpoints)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 route-groups | 2/2 | ~2h05m active | ~1h03m |
| 01 | 2 | - | - |
| 02 | 5 | - | - |

*Updated after each plan completion*
| Phase 02 P01 | 42 min | 3 tasks | 9 files |
| Phase 02 P02 | 9 min | 3 tasks | 2 files |
| Phase 02 P03 | 6 min | 3 tasks | 4 files |
| Phase 03 P01 | 10 min | 3 tasks | 4 files |
| Phase 03 P02 | 15 min | 3 tasks | 3 files |
| Phase 03 P03 | 25 min | 3 tasks | 3 files |
| Phase 03 P07 | 15 min | 3 tasks | 3 files |
| Phase 03 P06 | 12 min | 2 tasks | 0 files |
| Phase 03 P08 | 55 min | 3 tasks | 1 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Recent decisions affecting current work:

- Route groups with two root layouts, not a `[locale]` segment (design spec 2026-08-11)
- Two plain Sanity fields (`language`, `translationOf`) instead of the i18n plugin — no new dependency
- Claude Sonnet 5 via Batch API; translate → verify → human publish (drafts only)
- Jalali calendar with Persian digits via `Intl.DateTimeFormat('fa-IR')` (approved)
- Backlog run covers ALL ~30 posts (approved)
- Declined: `neuronomixer.ir` registration (Saeid, 2026-08-13)
- npm is the authoritative package manager; `pnpm-lock.yaml` and `pnpm-workspace.yaml` deleted (Saeid, 2026-08-16)
- OQ-1 resolved: enable `experimental.globalNotFound` plus `src/app/global-not-found.tsx` to keep the branded 404 once the sole root layout moved into `(en)` (Saeid, 2026-08-16)
- Accepted that the global 404 no longer carries nav and footer, since `global-not-found.tsx` renders outside every layout (Saeid, 2026-08-16)
- The `(fa)` root layout stays subtractive for Phase 1: one import, `metadataBase` plus a plain title, and the two colour tokens. No fonts, auth, analytics or chrome, all of which Phase 4 owns (plan 01-02, 2026-08-16)
- OQ-1 needed no action in 01-02. The 01-01 `globalNotFound` fix held under two root layouts, so `next.config.ts` was not touched and no contingency was applied (2026-08-16)
- The frozen-files fingerprint is five paths, not six. `pnpm-lock.yaml` was deleted in 01-01, so every later check runs over the five surviving paths (2026-08-16)
- [Phase 02]: Status predicates are exported constants, not module-private, so plan 02-02's check script can assert per query which of the four variants is present (plan 02-01, 2026-08-20)
- [Phase 02]: blogIndexQuery and homePageQuery stay single compound constants; splitting them would turn one network round trip into three, a behaviour change (plan 02-01, 2026-08-20)
- [Phase 02]: postsByAuthorIdQuery and authorReviewPostsQuery stay separate despite identical filters; their projections differ and merging would change a caller's output shape (plan 02-01, 2026-08-20)
- [Phase 02]: Studio chrome is a separate surface from the public read path: assertion H's allowlist names postType.ts (D-07 picker resolver) and will name structure.ts (02-05), rather than the GROQ being reworded to dodge a text check. CONTENT-02 governs the public read predicate; a picker resolver constrains an editor's search, never a read (plan 02-03, 2026-08-20)
- [Phase 02]: postType's field count is asserted at 17 as a deliberate tripwire, so a later schema addition fails at the check rather than drifting silently (plan 02-03, 2026-08-20)
- [Phase 03]: STATE.md's npm ci diagnosis is superseded. The root manifest was never out of sync; the failure was four transitive version mismatches, repaired by npm install --package-lock-only (plan 03-01, 2026-08-22)
- [Phase 03]: env-preflight.check.ts rows carry three states. FAIL means this phase's plumbing is broken and exits 1; BLOCKER means a later plan is gated on a human action and exits 0 (plan 03-01, 2026-08-22)
- [Phase 03]: CLI TokenUsage writes are awaited and never swallowed, and resolveAdminUserId throws, so a missing ADMIN aborts a run before paid spend rather than losing the record after (plan 03-01, 2026-08-22)
- [Phase 03]: D-08 staleness is exact via a stored sourceUpdatedAt on the Farsi document, not a comparison of the two documents' _updatedAt values, which Saeid editing the Farsi draft would invert (plan 03-02, 2026-08-22)
- [Phase 03]: One new schema field, not two. postType goes 17 to 18; the Farsi draft's own _createdAt answers when it was translated, so no translatedAt companion (plan 03-02, 2026-08-22)
- [Phase 03]: The two pipeline queries stay OUT of language-filter.check.ts's nine-query QUERIES array. Its per-query counts are CONTENT-02's public read contract; a script-side read gets its own assertion section L instead (plan 03-02, 2026-08-22)
- [Phase 03]: extraction and reapplication share ONE private enumerator in portable-text-walk.ts. Two traversals can drift apart, and the day they disagree about which slots are translatable is the day a Farsi string lands in the wrong slot with no error (plan 03-03, 2026-08-22)
- [Phase 03]: structuralFingerprint is derived from applyTranslatables rather than written as an independent JSON replacer, so the D-05 tier 1 gate blanks exactly the slots the walker owns and compares every other leaf verbatim (plan 03-03, 2026-08-22)
- [Phase 03]: applyTranslatables compares counts BEFORE writing, so a short or long model response never leaves a half-translated body in memory (plan 03-03, 2026-08-22)
- [Phase 03]: the translation check's --post-run flag is a reserved stub that exits 1 before the offline suite, so it can never print ALL PASS for assertions plan 03-09 has not written yet (plan 03-03, 2026-08-22)
- [Phase 03]: the run-state artifact carries a SHA-256 digest of the structural fingerprint, not the fingerprint itself; equality is the only property 03-08 needs and the raw value is hundreds of KB of document structure in a version-controlled directory (plan 03-07, 2026-08-22)
- [Phase 03]: the printed header is asserted against client.config().dataset before the first read, so the operator read-back cannot drift from the content lake actually being talked to (plan 03-07, 2026-08-22)
- [Phase 03]: the multi-post brake is evaluated on the resolved working set, and a non-stale Farsi sibling is promoted into that set only when --slug accompanies --retranslate, because doing it across the backlog would rewrite every Farsi draft (plan 03-07, 2026-08-22)
- [Phase 03] **D-16 (Saeid, 2026-08-23): the model transport is the Claude Code CLI on his subscription, not the paid API.** `scripts/translate-posts.ts` spawns `claude -p --model sonnet --output-format json` per request (prompt via stdin, clean JSON on stdout with a full `usage` block; CLI warnings go to stderr and must not be parsed). This supersedes D-03's Batch API half; the model stays Sonnet. Consequences: the `ANTHROPIC_API_KEY` blocker is VOID (no key anywhere); no batch ids, no `custom_id` matching, no 29-day resume — a crashed run resumes from the per-post status in the run-state artifact instead; passes run sequentially per post; TokenUsage rows record the CLI-reported token counts with cost 0 (subscription); prompt-cache economics are no longer a goal. Everything protective is unchanged: walker, structural fingerprint gate, D-05 tiers, D-08 staleness, draft-only writes, never-scheduled invariant. Headless transport proven in-session (subscription auth, `result` + `usage` parsed from JSON). Plans 03-05/03-08/03-09/03-10 revised to match.
- [Phase 03]: Glossary approved by Saeid with zero corrections (03-06): fa-glossary.json frozen at 98 entries (82 translate, 6 transliterate, 10 keep-english), prompt block frozen at 4078 chars. Approval came back unconditional, so no entry was edited; the regenerated review HTML is byte-identical to the reviewed one, proving JSON and HTML agree.
- [Phase 03]: every built-in tool is denied on every claude -p call (--disallowedTools plus --strict-mcp-config). D-16 swapped an API transport, which has no tools, for an agent CLI running inside the repo working directory, which quietly widened T-03-05 from a count-gate problem into a filesystem one. Verified live: the same probe prompt ran Bash without the flags and answered NO_TOOLS with them (plan 03-08, 2026-08-25)
- [Phase 03]: TokenUsage input counts are uncached plus cache-creation plus cache-read. The CLI reports input_tokens of 2 to 4 for a 30 KB prompt because its own system prompt and the payload land in the cache fields, so recording the bare field would under-report a run by four orders of magnitude (plan 03-08, 2026-08-25)
- [Phase 03]: markdown fences are never stripped from a model response. A live first attempt came back fenced; the fix was to harden the instruction and keep the single retry, because a fenced response is a broken contract rather than a format to accommodate (plan 03-08, 2026-08-25)
- [Phase 03]: the run-state artifact keeps fingerprint digests only, and a blocked post gets its own gate-mismatch artifact carrying both raw fingerprints, which is the path the blocked-post message names (plan 03-08, 2026-08-25)

### Pending Todos

None yet.

### Blockers/Concerns

- **OPEN, and the single most important thing for 03-09 to know: NO FARSI DRAFT EXISTS YET on any dataset.** 03-08 built the whole write path but never exercised it, because both of its `--execute` runs were deliberate gate probes that blocked before the write by design. Type checks, source-level assertions and a server-validated dry-run mutation all pass on the exact document shape, but four things have never actually happened: a draft being created, D-08 idempotence on a second default run, the `--retranslate` patch preserving `_createdAt`, and the count-plus-one assertion firing on a run that creates. The verify pass has also never returned a real findings object. 03-09's dev rehearsal is the first run that touches any of it.
- **OPEN (housekeeping for 03-09): the dev database already carries one `TokenUsage` row from the 03-08 gate probe** (`translate-post`, `claude-sonnet-5`, 72224 in / 16673 out, total 88897, `2026-08-25T15:24:53.859Z`). Any 03-09 assertion that counts rows must account for it rather than assume an empty table.
- **OPEN (measure in 03-09): the fenced-response rate.** The first live translate call returned its JSON wrapped in a code fence; the single retry recovered it, and both instruction blocks were hardened afterwards with a restated format line. No fence stripping was added, on purpose. If the rate stays high across the rehearsal, the 26-post production run in 03-10 could roughly double its calls and hit a subscription window, so the sequential per-post design needs a second look before 03-10.
- **OPEN (register update): T-03-05 understates the CLI transport.** The Phase 3 threat register was written against an API transport, where a model call has no tools. D-16 made it an agent CLI running in the repository working directory. 03-08 mitigated it by denying every built-in tool on every call (`--disallowedTools` plus `--strict-mcp-config`, verified live), but the register entry still reads as a count-gate problem and should be amended in 03-09 or at phase close.
- **VOID 2026-08-23 (superseded by D-16): the `ANTHROPIC_API_KEY` blocker.** Saeid decided the pipeline runs on his Claude Code subscription via `claude -p`, so no API key is needed in any env file, ever. The env-preflight check's BLOCKER row for the key must be replaced by a `claude -p` availability probe (folded into the revised plan 03-05).
- **CLOSED 2026-08-23 (plan 03-04): the D-11 deploy gate.** Saeid authorised the push at the Task 2 checkpoint; `main` pushed `5ea9ddb..43b5dfe` (81 commits), Vercel production deployment `dpl_A16hZgLQZJozQsmvXq8NkY8C8qmD` READY with `gitSource.sha` equal to the pushed HEAD, live filter check ALL PASS against `blog_posts`, live `/blog` 200, Studio walk confirmed the split panes plus Language/Translation of/Translation Notes with `sourceUpdatedAt` correctly hidden on English docs, and the production Farsi count is 0 both sides of the deploy. Full evidence in `.planning/phases/03-translation-pipeline/artifacts/deploy-gate.md`. Plan 03-10's precondition is satisfied.
- **RESOLVED 2026-08-22 (plan 03-01, commit eb58469): `package-lock.json` out of sync, `npm ci` broken.** The recorded `@sanity/visual-editing@3.0.5` diagnosis was **wrong** and is superseded: that package does not depend on `@sanity/client` at all, and `package.json` was never out of sync with the lock's root maps. The real failure was four transitive version mismatches (`@sanity/client` 7.23.0 to 7.26.2, `@sanity/eventsource` 5.0.2 to 5.0.4, `get-it` 8.8.0 to 8.8.3, `nanoid` 3.3.11 to 3.3.18). Repaired with `npm install --package-lock-only` (never a bare `npm install`, which would reify the `--no-package-lock` `node_modules`). Delta was those four bumps plus six `@tailwindcss/oxide-wasm32-wasi` wasm shim entries, zero removals, and no movement in `next`, `react`, `next-sanity`, `sanity`, `prisma` or `@anthropic-ai/sdk`. Verified: `npm ci --dry-run` exit 0, `npx tsc --noEmit` 0, `npx next build` 0, route-smoke 28/28. `npm ci` is usable again locally, in CI and on Vercel, so the D-11 push-and-deploy gate is unblocked.
- **RESOLVED 2026-08-22 (plan 03-01): the uncommitted `package-lock.json` working-tree drift.** It was a partial repair of the above, not unrelated noise, and was absorbed into the repair commit.
- **ANSWERED 2026-08-22 (plan 03-01): dev DB parity for the Phase 3 spend path.** The dev database has the `TokenUsage` table and at least one `ADMIN` user, and `.env.vercel-prod` carries a reachable `DATABASE_URL` (RESEARCH assumptions A4 and A3, both TRUE). Both pre-authorised fallbacks are unused: the dev rehearsal can exercise the real spend path, and the prod proof run can satisfy success criterion 5 directly.
- **OPEN (low priority): `/cv/[slug]`'s `generateStaticParams` has no try/catch fallback**, so an unreachable database fails the entire build. `sitemap.ts` already guards its build-time query this way. Surfaced when the dev DB was paused on 2026-08-16.
- Note: `experimental.globalNotFound` is now enabled in `next.config.ts`. It is an experimental Next.js flag, so any Next.js upgrade should re-verify the branded 404 before deploy.
- Resolved during plan 01-01 and recorded in `01-01-SUMMARY.md`: the hybrid npm/pnpm `node_modules` conflict, the paused Supabase dev project, and the global 404 regression (OQ-1).
- NEVER `npm run build` locally — it runs `prisma migrate deploy` against the PRODUCTION DB (Prisma CLI reads `.env` = prod; Next.js reads `.env.local` = preview). Build gate is `npx next build`.
- Phase 2 hard ordering invariant: the `language == "en"` query filter must be live BEFORE the first Farsi document exists.
- Phase 3 first run must be a dry-run to a scratch dataset.
- Vercel previews sit behind SSO with no bypass secret — browser smoke rides Saeid's authenticated Chrome, not Playwright.
- ~~`content/fa-glossary.json` needs Saeid's correction pass after the drafted first pass (Phase 3 input).~~ CLOSED 2026-08-25 in plan 03-06: approved with zero corrections, frozen at 98 entries and a 4078-character prompt block, and 03-08 embeds that exact block in every request.
- ~~OPEN (low priority, pre-existing): package-lock.json carries an uncommitted working-tree change~~ RESOLVED 2026-08-22 in plan 03-01 (eb58469); see the lockfile entry above.
- Handoff for plan 02-02: this repo checks out CRLF on Windows, so any git-fidelity check must normalise line endings (.replace(/\r\n/g, chr(10))) on both sides before diffing git show output against the working copy. Plan 02-01 pre-verified 9/9 byte fidelity against ref 293616f with that normalisation.
- Phase 3 invariant: Farsi documents must never carry status scheduled. api/cron/publish-scheduled is unfiltered by D-02, patches scheduled posts to approved and mails every subscriber with an English subject. Nothing in the schema enforces it; the pipeline must.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Scope | Farsi translation of the 151 visual guides | Out of scope this milestone | 2026-08-11 |
| Scope | Farsi-native original content | Out of scope this milestone | 2026-08-11 |
| Scope | Serving readers inside Iran / second origin | Out of scope this milestone | 2026-08-11 |

## Session Continuity

Last session: 2026-08-25T15:30:36.298Z
Stopped at: Completed 03-08 (translate, gate, verify and draft write built; gate proven live on dev). Next: 03-09 dev rehearsal.
Resume file: None

Outstanding human checks:

- ~~03-06 Task 1: glossary corrections~~ ANSWERED 2026-08-25: approved with zero corrections, nothing outstanding.
- Carried from Phase 1 (needs Saeid's Chrome against `npx next start`): `/fa` styled and right to left, `/` unchanged with nav and footer, a nonsense URL showing the branded 404. All already green under automated assertion.
