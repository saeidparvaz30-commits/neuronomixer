---
phase: 03-translation-pipeline
verified: 2026-09-01T20:12:46Z
status: passed
score: 5/5 roadmap success criteria verified (10/10 plans, PIPE-01 + PIPE-02 satisfied)
behavior_unverified: 0
overrides_applied: 0
---

# Phase 3: Translation Pipeline Verification Report

**Phase Goal:** A repeatable script translates approved English posts into structurally intact Farsi drafts in Sanity, with automated drift verification, so nothing machine-generated reaches Saeid unreviewed or reaches readers at all.
**Verified:** 2026-09-01T20:12:46Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP.md Success Criteria, the contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `scripts/translate-posts.ts` run against one real approved English post produces a Sanity DRAFT, `language: "fa"`, `translationOf` set, Portable Text structurally intact (only `span.text` translated; `_key`/`_type`/`marks`/`markDefs`/code blocks pass through; links working) | VERIFIED | Production draft `drafts.23396d5b-5d90-461b-b9ba-d31768bc73a6` created 2026-08-25 from `industry-50-explained-...`. `translation.check.ts --post-run --slug ...` on production: 28 assertions, ALL PASS — structural fingerprint identical, 18 `markDefs` hrefs byte-identical and in order, `changed=97.7%`, `arabic-script=94.2%` (anti-vacuity guards T-03-30 both clear). Code-level confirmed live in this session: `grep -n 'status: "draft"'` → line 778; `createIfNotExists` count 1; `createOrReplace` count 0; `featured\|heroOrder` count 0; `"scheduled"` (the cron-matched status, D-12) count 0 in `translate-posts.ts`, while the check script's own tripwire (`CRON_STATUS = "scheduled"`) does contain it, which is the correct asymmetry. |
| 2 | Verify pass writes drift findings (numbers/dates/URLs/entity names/code/glossary adherence/leftovers) to `translationNotes`, visible where the draft is reviewed | VERIFIED | Prod draft `translationNotes = "Verify pass clean (2026-08-25)"`, the explicit D-06 clean-line form. `formatNotes`/`Finding` union offline-proven (`translation.check.ts` section G, re-run this session: `notes format pinned (clean line, warn before info, one-lined, no em dash)`). Saeid's Studio walk (2026-09-01) confirmed Translation Notes "populated and read-only, legible at a glance" (item 3, PASS). |
| 3 | `content/fa-glossary.json` exists, Simorgh-drafted first pass from recurring AI/data/finance terms, corrected by Saeid, injected in the system prompt with prompt caching, so glossary terms render consistently | VERIFIED | File on disk, re-read this session: `entries: 98` (bound 60–100 held). Offline check re-run this session: `glossary 98 entries (translate 82, transliterate 6, keep-english 10), block 4078 chars ... byte identical across two independent loads, no date, D-04 standing instruction present`. Saeid's 03-06 verdict verbatim: "Glossary approved" with zero corrections. `GLOSSARY_BLOCK = serializeGlossaryBlock(loadGlossary())` confirmed embedded at the top of both the translate and verify prompts (`scripts/translate-posts.ts` lines 376, 851, 953). Determinism is what makes the block cache-stable across calls; the CLI's own usage envelope reports `cache_creation_input_tokens`/`cache_read_input_tokens` on every call, confirming caching is active on this transport. |
| 4 | The very first pipeline run was a dry-run to a scratch/dev dataset before any production content was touched | VERIFIED | 03-07 (2026-08-22): dry runs only, against both `.env.local` and `.env.vercel-prod`, zero writes either dataset. 03-09 (2026-08-25): first WRITING run of the whole phase targeted `blog_posts_dev` — dry-run captured first (`## Dry run`, header `dataset=blog_posts_dev mode=DRY RUN`), then execute. Production was not written to until 03-10, after the D-11 deploy gate closed. Ordering independently reconfirmed in `deploy-gate.md` (prod Farsi count 0 before and after the 08-23 deploy) and `translate-prod.log` (prod Farsi count 0 immediately before the 08-25 dry run, 1 after the single authorised execute). |
| 5 | Token spend for every run is recorded through the existing `TokenUsage` model | VERIFIED | Rows independently read back (not just claimed) for `glossary-mine` (dev-run era, 03-05), `translate-post` and `translate-verify` (dev rehearsal 03-09 and production 03-10), all at cost 0 with CLI-reported token counts matching run-summary totals exactly. `recordTokenUsage` awaited with no `.catch` (only the top-level `main().catch` exists — grep-confirmed count 1). ADMIN resolution required before spend (`resolveAdminUserId`) is fatal under `--execute`. |

**Score:** 5/5 roadmap success criteria verified. All behavior-dependent truths (idempotent re-run, staleness reporting, hand-edit protection, structural-gate blocking) were exercised against real live runs in 03-09/03-10, not inferred from code presence alone — see below.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| PIPE-01 | A script translates approved English posts to Farsi drafts, preserving Portable Text structure, links, and code | SATISFIED | `scripts/translate-posts.ts` end to end; structural gate (D-05 tier 1) proven to block live 3 times on real model output during 03-09 (empty-leaf defect on `"The "` before a link) plus a deliberate corruption probe in 03-08; unknown/code block types pass through untouched by construction (rule 5 of the walker, section E of `translation.check.ts`). |
| PIPE-02 | Translation output is checked for drift in numbers, dates, URLs, entity names, and glossary terms before it reaches Saeid | SATISFIED | Verify pass + `validateFindings` + `formatNotes` write `translationNotes` before any human review; D-12 tripwire (`status !== "scheduled"`) keeps unreviewed output from ever reaching readers or auto-publishing; Saeid's Studio walk is the terminal human gate and it already ran (2026-09-01, approved with two named non-blocking follow-ups). |

No orphaned requirements: ROADMAP.md traceability table maps only PIPE-01 and PIPE-02 to Phase 3, and both are claimed and satisfied across the ten plans' `requirements:` frontmatter.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `scripts/translate-posts.ts` | CLI: selection, extraction, transport, gate, verify, write | VERIFIED | Exists, 1,579+ lines, `npx tsc --noEmit` exit 0 this session |
| `scripts/lib/portable-text-walk.ts` | Walker + structural fingerprint | VERIFIED | Exists; offline round-trip + 6/6 mutation-detection re-confirmed this session |
| `scripts/lib/translation-notes.ts` | `formatNotes`/`Finding` | VERIFIED | Exists; notes-format assertions re-confirmed this session |
| `scripts/lib/glossary.ts` | Loader/serializer/validator | VERIFIED | Exists; byte-identity + no-date assertions re-confirmed this session |
| `scripts/lib/token-usage.ts` | ADMIN resolution + spend recording | VERIFIED | Exists; used by both `translate-posts.ts` and `mine-glossary-terms.ts` |
| `scripts/checks/translation.check.ts` | Offline sections A–H + live `--post-run` | VERIFIED | Re-run this session, offline sections ALL PASS; `--post-run` exercised live in 03-09/03-10 (not re-run here per task scope — no `--env-file` re-check requested) |
| `scripts/checks/env-preflight.check.ts` | CLI/env probe, no API-key blocker | VERIFIED | `ANTHROPIC_API_KEY` absent from source (D-16 retirement), `claude` CLI probe present |
| `content/fa-glossary.json` / `content/fa-glossary-review.html` | Frozen, Saeid-approved glossary | VERIFIED | 98 entries on disk, HTML companion present |
| `.planning/phases/03-translation-pipeline/artifacts/deploy-gate.md` | D-11 step 2 evidence | VERIFIED | Pre-push + Post-deploy sections, Saeid's authorisation quoted verbatim |
| `.planning/phases/03-translation-pipeline/artifacts/translate-dev.log` | Dev rehearsal evidence | VERIFIED | Present, dry run / single post / backlog sweep / idempotence / staleness / hand-edit sections all captured |
| `.planning/phases/03-translation-pipeline/artifacts/translate-prod.log` | Production proof evidence | VERIFIED | Present, dry run / authorisation / execute / verification / Studio walk sections all captured |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `translate-posts.ts` | `scripts/lib/portable-text-walk.ts` | `applyTranslatables` / `structuralFingerprint` before write | WIRED | Gate proven live to block a real defective model response (03-09) and a deliberate corruption (03-08) |
| `translate-posts.ts` | `scripts/lib/glossary.ts` | `GLOSSARY_BLOCK` embedded at top of every prompt | WIRED | Grep-confirmed at both prompt-assembly sites (lines 851, 953) |
| `translate-posts.ts` | `scripts/lib/token-usage.ts` | `resolveAdminUserId` / `recordTokenUsage` | WIRED | Rows independently read back after each writing run |
| Draft `status` field | `src/app/api/cron/publish-scheduled/route.ts` | literal status value never shared | WIRED (isolated by design) | `"scheduled"` (`CRON_STATUS`) appears 0 times in `translate-posts.ts`, confirmed by direct grep this session; D-12 dataset-wide tripwire (0 Farsi docs carrying that status) passed live on both datasets in 03-09/03-10 |
| `translationCandidatesQuery`/`translationStaleQuery` | `src/sanity/lib/queries.ts` | raw-perspective sibling detection | WIRED | Exercised with real Farsi siblings present for the first time in 03-09/03-10 (previously only provable vacuously); idempotence re-run in 03-09 showed candidate count drop from 11→0 with zero model calls |

### Behavioral Spot-Checks (this session)

| Behavior | Command | Result | Status |
|---|---|---|---|
| Typecheck across the whole pipeline surface | `npx tsc --noEmit` | exit 0, no output | PASS |
| Offline correctness core (walker, gate, notes, glossary) | `npx tsx scripts/checks/translation.check.ts` | exit 0, `translation.check.ts: ALL PASS`, both offline lines printed | PASS |
| D-12 status isolation | `grep -c '"scheduled"' scripts/translate-posts.ts` | 0 | PASS |
| Draft-only write verb | `grep -c "createIfNotExists"` / `createOrReplace` | 1 / 0 | PASS |
| Curation-key omission (D-15) | `grep -cE "featured\|heroOrder"` | 0 | PASS |
| No SDK / no API key surviving D-16 migration | `grep -c "@anthropic-ai/sdk"` / `ANTHROPIC_API_KEY` | 0 / 0 | PASS |
| Debt-marker scan across all phase-touched files | `grep -rn -E "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER"` | 0 matches | PASS |
| Glossary entry count from the actual file on disk | `node -e "require('./content/fa-glossary.json').entries.length"` | 98 | PASS |
| Git state | `git log` / `git status --short` | 10 plans' commits all present through `78c1bb1`, working tree clean | PASS |

Live/production checks (`--post-run`, `language-filter.check.ts --live`, `route-smoke.mjs`) were **not** re-run this session per the task's explicit scope (no `--env-file`/network runs requested); their results are taken from the 03-09/03-10 SUMMARY and artifact logs, which is independent recorded evidence (command + verbatim output), not narrative claims.

### Anti-Patterns Found

None blocking. One advisory finding from the fresh code review (`03-REVIEW.md`, 2026-09-01, 1 critical / 5 warnings) is worth flagging for a human decision, per the task's instruction to weigh but not re-litigate:

- **CR-01** (critical, review-only, confirmed live this session): `scripts/mine-glossary-terms.ts`'s `callClaude` spawns the `claude` CLI **without** `--strict-mcp-config --disallowedTools ...` — verified directly by reading the function (lines ~398–433): only `["-p", "--model", "sonnet", "--output-format", "json"]` are passed, no tool-restriction flags. `scripts/translate-posts.ts` does apply this hardening on every call (added in 03-08 as an auto-fix after the D-16 transport widened T-03-05 from a count-gate problem to a filesystem one). The glossary miner was written in 03-05, before that hardening was added, and was never revisited. **Scope of exposure:** the glossary is frozen (Saeid approved zero corrections in 03-06) and no re-mining is scheduled; the gap only matters if `mine-glossary-terms.ts --classify` is run again (e.g., for Finding A's Phase 5 glossary correction). This does not touch the phase's delivered translate/verify/write path, which is the surface PIPE-01/PIPE-02 govern, and does not change any roadmap success criterion's truth value. **Recommendation:** fix before the next glossary re-mining run (Finding A, carried to Phase 5), not before this phase closes.
- WR-01 through WR-05 (warnings): edge-case robustness items (an unmatched `translationNotes` shape failing `--post-run` with a misleading message, empty-string translations being silently accepted into field-level slots, spend loss on a `mine-glossary-terms.ts --classify` failure path, unredacted driver error messages, an unnormalized em dash in a model finding). None of these were observed to fire on the two real runs performed (dev rehearsal, production proof); they are latent robustness gaps documented for follow-up, consistent with the review's own `issues_found` (not `blocker`) status.

### Human Verification Required

None outstanding for this phase. All blocking human checkpoints already ran and are recorded with verbatim verdicts:
- 03-04 Task 2: Saeid's deploy authorisation ("Approved — push main", 2026-08-23)
- 03-06 Task 1: Saeid's glossary review ("Glossary approved", zero corrections, 2026-08-25)
- 03-10 Task 1: Saeid's production-run authorisation (slug `industry-50-explained-...`, 2026-08-25)
- 03-10 Task 3: Saeid's Studio walk (14 items, PASS with two named non-blocking follow-ups, 2026-09-01)

### Gaps Summary

No gaps block the phase goal. The pipeline exists, is wired end to end, and has been exercised against real production content with the result reviewed by Saeid himself — the specific event the roadmap goal names ("nothing machine-generated reaches Saeid unreviewed"). Two items are worth carrying forward as named follow-ups (already recorded in 03-10's SUMMARY and now cross-referenced here so they are not lost at phase close):

1. **CR-01** (this verification, confirmed live): harden `mine-glossary-terms.ts`'s CLI spawn with the same `--strict-mcp-config`/`--disallowedTools` flags `translate-posts.ts` already carries, before the next glossary re-mining run.
2. **Finding A / Finding B** (Saeid's Studio walk, 2026-09-01): pin `post`/`article` → `مقاله` in the glossary, and redesign Farsi slugs to differ from the English slug — both explicitly deferred to Phase 4/5 by Saeid himself and already scoped with impact lists in `translate-prod.log`.

Neither item is a roadmap success criterion, a stated must-have truth, or a wiring failure — both are forward-looking scope Saeid and the phase's own plans already assigned to later phases.

---

_Verified: 2026-09-01T20:12:46Z_
_Verifier: Claude (gsd-verifier)_
