---
phase: 03-translation-pipeline
plan: 10
subsystem: infra
tags: [sanity, portable-text, claude-code-cli, subscription-transport, token-usage, production-run, studio-review, glossary]

# Dependency graph
requires:
  - phase: 03-translation-pipeline (plan 03-04)
    provides: the closed D-11 deploy gate, so the Phase 2 English filter was live on production before the first Farsi document existed
  - phase: 03-translation-pipeline (plan 03-09)
    provides: the --post-run live assertion mode, the dev rehearsal precedent and the diagnosed failure modes this run was watched for
  - phase: 03-translation-pipeline (plan 03-08)
    provides: the transport, the structural gate, the verify pass, the draft write and the spend booking
  - phase: 03-translation-pipeline (plan 03-06)
    provides: content/fa-glossary.json frozen at 98 approved entries
  - phase: 02-content-model (plan 02-05)
    provides: the Studio split whose Farsi list was empty until this plan filled it
provides:
  - "The phase success gate: one real approved English production post translated end to end into a structurally intact Farsi draft in blog_posts"
  - "drafts.23396d5b-5d90-461b-b9ba-d31768bc73a6, the first Farsi document that has ever existed in the production dataset"
  - "Saeid's own reading and judgement of production Farsi output, which is the review the drafts-not-published design exists to serve"
  - "The first observable proof that the Phase 2 English filter drops a Farsi document rather than merely being present"
  - "The six carried-over plan 02-05 Studio items, closed with a recorded disposition each"
  - "A measured refutation of the token estimator, and two named design follow-ups for Phase 4 and Phase 5"
affects: [Phase 4 Farsi presentation and /fa routing, Phase 5 backlog sweep and glossary]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A check assertion states a partition invariant that holds in every dataset state, not a precondition that the feature itself retires"
    - "A terminology complaint from the human reviewer becomes a named glossary entry, never a silent edit to the output"
    - "A design change requested at a review gate is recorded with its full impact list and planned, not implemented inside the plan that surfaced it"

key-files:
  created:
    - .planning/phases/03-translation-pipeline/artifacts/translate-prod.log
    - .planning/phases/03-translation-pipeline/artifacts/blog_posts-2026-08-25T18-08-41.044Z.json
    - .planning/phases/03-translation-pipeline/artifacts/blog_posts-2026-08-25T19-40-20.694Z.json
  modified:
    - scripts/checks/language-filter.check.ts

key-decisions:
  - "language-filter.check.ts asserts the partition invariant candidates + withSibling == approvedEnglish instead of candidates == approvedEnglish. The original assertion was only true while no Farsi document existed anywhere, so the plan's own acceptance criteria contradicted it; the partition form is true in every state and is strictly stronger, catching both an under-counting and a double-counting sibling subquery"
  - "The printed field stale= was renamed with-sibling= because translationStaleQuery measures having a sibling, not being stale; the D-08 timestamp comparison happens in translate-posts.ts after the fetch, so the old name would have raised a false alarm on every future green run"
  - "Route smoke ran against the live production site rather than a local next start, because a local server resolves its dataset from .env.local, which points at the preview database, so a local run would have smoke-tested the wrong dataset"
  - "Saeid's terminology complaint is carried to Phase 5 as two named glossary entries rather than fixed by editing the draft, per the plan's explicit rule"
  - "The Farsi slug design change he requested is recorded with its six impacts and deferred to Phase 4 and Phase 5 planning; no code, query, schema or draft was changed for it in this plan"
  - "The draft was left unpublished and unedited after the walk, so the assertions captured in the run log still describe the document as it stands"

patterns-established:
  - "Pattern: the human review gate produces named follow-up items with impact lists, not silent corrections to machine output"
  - "Pattern: a measured estimate that misses by an order of magnitude is recorded as a refuted brake rather than quietly recalibrated mid-phase"

requirements-completed: [PIPE-01, PIPE-02]

coverage:
  - id: D1
    description: "One real approved English production post translated end to end into a structurally intact Farsi draft in blog_posts, the phase success gate"
    requirement: PIPE-01
    verification:
      - kind: integration
        ref: "translate-posts.ts --slug industry-50-explained-... --execute: exit 0, header dataset=blog_posts mode=EXECUTE followed by the production banner, 1 draft created, gate passed on the first written attempt"
        status: pass
      - kind: integration
        ref: "translation.check.ts --post-run --slug industry-50-explained-...: exit 0, ALL PASS, 28 assertions over 1 sibling"
        status: pass
    human_judgment: false
  - id: D2
    description: "The two anti-vacuity guards (T-03-30) clear on production content: strings changed and Arabic-script coverage both above the 80 percent bound, with all 33 table cells and 3 image alts inside the count (D-13)"
    requirement: PIPE-02
    verification:
      - kind: integration
        ref: "post-run line: changed=97.7% arabic-script=94.2% items=171 (span 135, cell 33, alt 3, caption 0) hrefs=18"
        status: pass
    human_judgment: false
  - id: D3
    description: "The D-12 tripwire (T-03-03) is green on production non-vacuously for the first time: exactly one Farsi document exists and zero carry the publish-cron status"
    requirement: PIPE-02
    verification:
      - kind: integration
        ref: "translation.check.ts --post-run (dataset-wide): exit 0, farsi-documents=1, 0 carrying the publish-cron status, all translationOf refs resolve and none is shared"
        status: pass
    human_judgment: false
  - id: D4
    description: "The English site is provably unchanged with a Farsi document present, which is the first observable proof of the Phase 2 filter (T-03-23)"
    requirement: PIPE-02
    verification:
      - kind: integration
        ref: "language-filter.check.ts --live: exit 0, ALL PASS, posts=26, nine query parities identical at unchanged row counts, fragment dropped \"fa\""
        status: pass
      - kind: e2e
        ref: "GATE_BASE_URL=https://www.neuronomixer.com node scripts/checks/route-smoke.mjs --verify: 28/28, ALL PASS"
        status: pass
    human_judgment: false
  - id: D5
    description: "Spend recorded for both passes at cost 0 (SC-5, D-16, T-03-08), proven in place with no fallback"
    requirement: PIPE-01
    verification:
      - kind: integration
        ref: "post-run spend line: translate-post 1 row 172000 in / 120147 out, translate-verify 1 row 58296 in / 7744 out, at cost 0; counts match the CLI-reported run summary exactly"
        status: pass
    human_judgment: false
  - id: D6
    description: "Saeid read the Farsi draft in the production Studio and judged the translation himself (T-03-31)"
    requirement: PIPE-02
    verification:
      - kind: manual_procedural
        ref: "Studio walk 2026-09-01, fourteen items, recorded verbatim under ## Studio walk in artifacts/translate-prod.log"
        status: pass
    human_judgment: true
    rationale: "No automated check substitutes for the reviewer reading the output under his own byline. This is the gate the entire drafts-not-published design exists to serve, and it returned two real findings that no assertion in the phase could have produced."
  - id: D7
    description: "The six carried-over plan 02-05 Studio items, observable for the first time against a non-empty Farsi list, each with a recorded disposition"
    requirement: PIPE-02
    verification:
      - kind: manual_procedural
        ref: "items 9 to 14 in the ## Studio walk disposition table: all PASS under Saeid's blanket confirmation, none singled out"
        status: pass
    human_judgment: true
    rationale: "They are visual and console-level Studio observations in a live editor; nothing in the repo can assert them."

# Metrics
duration: ~1h10m active
completed: 2026-09-01
status: complete
---

# Phase 3 Plan 10: The Production Proof Run and Studio Walk Summary

**One real approved production post is now a structurally intact Farsi draft in `blog_posts`, proven by 28 live assertions and read end to end by Saeid in the Studio, who approved it with two named follow-ups: pin "post" and "article" to `مقاله` in the Phase 5 glossary, and give Farsi documents their own slugs in Phase 4.**

## Performance

- **Duration:** ~1h10m active execution (dry run, execute, five verification steps, one auto-fix), spread across a 7-day wall clock because Tasks 1 and 3 are blocking human gates
- **Started:** 2026-08-25T18:05Z (Task 1 checkpoint opened)
- **Completed:** 2026-09-01 (Task 3 Studio walk answered)
- **Tasks:** 3 of 3
- **Files modified:** 1 source file (`scripts/checks/language-filter.check.ts`), 3 evidence artifacts created

## Accomplishments

- **The phase success gate is met.** `industry-50-explained-why-the-future-is-human-centred-not-just-automated`, chosen by Saeid from a 26-post dry-run breakdown, was translated end to end and written as `drafts.23396d5b-5d90-461b-b9ba-d31768bc73a6`. The structural gate passed on the first written attempt: 171 body items (135 spans, 33 table cells, 3 image alts) plus title and metaDescription, 19,592 characters, 18 link hrefs byte identical and in order.
- **The Phase 2 filter became observable rather than merely present.** The deploy gate recorded nine identical query parities on 2026-08-23 and said plainly that they were identical because production held zero Farsi documents. With one Farsi document present, `posts=26` is unchanged, all nine parities are still identical at the same row counts, and the fragment line reports it `dropped "fa"`. The filter is doing work and the English reader sees nothing.
- **The D-12 tripwire is green on production non-vacuously for the first time.** Exactly one Farsi document, zero carrying the publish-cron status. The same command exited 1 with the no-sibling message throughout plan 03-09.
- **Saeid judged the output himself**, which is the review the whole drafts-not-published architecture exists to serve, and it returned two findings no assertion in this phase could have produced.
- **The six carried-over plan 02-05 Studio items are closed**, each with a recorded disposition. They were the last outstanding manual checks from Phase 2.
- **The token estimator was refuted with measurements** rather than trusted into a 26-post sweep.

## Task Commits

1. **Task 1: Saeid authorises the production run** (checkpoint) - recorded under `## Authorisation` in the run log, committed with Task 2
2. **Task 2: The production proof run and its verification** - `dd4dcf5` (fix: let the live filter check survive a translated dataset) and `719c8c2` (feat: translate the first production post into a Farsi draft)
3. **Task 3: Saeid walks the Studio and judges the translation** (checkpoint) - `50d3f3b` (docs: record Saeid's Studio walk verdict on the production Farsi draft)

**Plan metadata:** the docs commit immediately following `50d3f3b`, carrying this summary and the STATE.md update

## The production header line and banner, verbatim

The first two lines of the execute capture, in order, which is the pairing the plan requires:

```
translate-posts: projectId=pz9ppas8 dataset=blog_posts apiVersion=2025-10-07 mode=EXECUTE
!! TARGET IS THE PRODUCTION DATASET !!
```

The header carries ` dataset=blog_posts ` and ` mode=EXECUTE`, and the banner is the line immediately after it with nothing between them. The command was `npx tsx --env-file .env.vercel-prod scripts/translate-posts.ts --slug industry-50-explained-why-the-future-is-human-centred-not-just-automated --execute`: one `--slug`, no `--all`, exit 0, empty stderr.

## Per-pass token totals, as reported by the CLI

| Pass | Calls | Input tokens | Output tokens |
|---|---:|---:|---:|
| translate | 2 | 172,000 | 120,147 |
| verify | 1 | 58,296 | 7,744 |
| **Total** | **3** | **230,296** | **127,891** |

**Subscription-funded, $0 marginal (D-16).** `TokenUsage` rows exist under both `translate-post` and `translate-verify` at cost 0, written by the run and read back independently by the post-run check, with counts matching the run summary exactly. Success criterion 5 was proven in place; neither pre-authorised fallback was needed, because `.env.vercel-prod` does carry a reachable `DATABASE_URL` and the run resolved an ADMIN user.

Two translate calls for one post: the first response came back fenced in a ` ```json ` block and failed to parse, and the script's single retry recovered it. That is the 03-09 precedent exactly (40 percent fenced there), not a new failure mode. No fence stripping was added.

The `"The "` empty-string defect that 03-09 diagnosed **did not fire on this post**, which matches the pre-run reading: this post is not one of the two candidates known to carry that pattern. The fix therefore remains unwritten and is inherited by Phase 5.

## Saeid's translation-quality judgement, verbatim

Held 2026-09-01 in his own Chrome against the production Studio. His three responses, in order:

> "Instead of نوشته we should use مقاله. Also, the SLug needs fixing. It should be something else than the original one. Any idea what to use for best experience?"

> "I can't really preview the final page here can I/"

> "Other than that everything looks good."

**Verdict: the walk passes.** The third quote is a blanket confirmation covering every item he did not single out. Item 7, his reading of the Farsi, is approved with the two findings below.

The second quote is **expected behaviour, not a defect**: the `/fa` routes do not exist until Phase 4, so the Studio editor is the only surface on which a Farsi document can be read at all, which is precisely the review surface this phase was designed around.

## Disposition of the six carried-over plan 02-05 Studio items

Left OUTSTANDING when the Studio split shipped because none could be observed against an empty Farsi list. All six are **PASS** under Saeid's blanket confirmation, and none was singled out as wrong. They are now closed.

| # | Item | Disposition |
|---|---|---|
| 9 | Two post lists plus the unchanged Categories, Authors, divider and trailing types | PASS |
| 10 | English list shows existing posts, newest first, subtitles unchanged | PASS |
| 11 | The Farsi list offers no create button | PASS |
| 12 | Devtools console clean across both lists: no custom-filter or apiVersion warning, no duplicate-id error | PASS |
| 13 | Language radio defaults to English, Translation of reference present, Translation Notes read-only | PASS |
| 14 | Translation of picker offers English posts only, no create, and not the open post itself | PASS |

The eight items new to this phase are all PASS as well, item 7 being PASS with the findings below. Full fourteen-item table in `artifacts/translate-prod.log` under `## Studio walk`.

## Findings from the walk, both carried forward

### Finding A: pin "post" and "article" to `مقاله` (Phase 5, glossary)

The draft renders "post" / "article" as `نوشته`; Saeid wants `مقاله`.

**Verified, not assumed:** `content/fa-glossary.json` was read for this record. It holds 98 entries, **neither `نوشته` nor `مقاله` appears anywhere in it**, and no entry has the term `post`, `article` or `blog` (the only near match is `post-hoc explanation`, an unrelated XAI term). The word was the model's free choice on an unpinned term, not a violation of an approved rendering. This is the first real evidence of the glossary boundary on production content: what is pinned holds, what is not pinned drifts.

**Phase 5 follow-up:** add `post` to `مقاله` and `article` to `مقاله` under the `translate` strategy, regenerate the frozen prompt block (98 entries to 100, and the 4078-character block changes, both asserted by the offline suite), then correct the existing proof draft with `--retranslate` on the authorised slug. Not actioned here: the glossary is frozen by Saeid's 03-06 approval and the plan states that a terminology complaint becomes a named Phase 5 item.

### Finding B: Farsi slugs must differ from the English slug (Phase 4 and 5, design change)

Current behaviour is deliberate, not a defect: `scripts/translate-posts.ts` line 780 copies the slug verbatim "per the design spec", and `scripts/checks/translation.check.ts` line 942 asserts it. Saeid is asking to change the design.

**Direction discussed in session, proposed by Simorgh and not yet ratified as final:** a Persian-script slug derived from the Farsi title, three to five words, Persian stop words (`از`, `به`, `در`, `برای`) stripped, Latin digits kept, `keep-english` glossary terms left in Latin script, with `translationOf` as the sole pairing key.

**Impacts to plan before building:** Phase 4's `/fa` route lookup can no longer resolve by the English slug; Phase 5's hreflang mapping; the post-run same-slug assertion inverts to assert the slugs differ and that the pairing resolves through `translationOf`; slug uniqueness becomes per-language (note `language-filter.check.ts` already scopes its uniqueness test to English, so that check survives unmodified); slug generation must be added to the pipeline and made editable in the Studio; and the one existing Farsi draft needs its slug rewritten.

**No code, query, schema or draft was changed for this in plan 03-10.**

## Files Created/Modified

- `.planning/phases/03-translation-pipeline/artifacts/translate-prod.log` - the dry run over 26 candidates, Saeid's authorisation, the execute capture, seven verification sections, the deviation, and the Studio walk
- `.planning/phases/03-translation-pipeline/artifacts/blog_posts-2026-08-25T18-08-41.044Z.json` and `blog_posts-2026-08-25T19-40-20.694Z.json` - run-state artifacts (fingerprint digests only, never raw fingerprints)
- `scripts/checks/language-filter.check.ts` - the deviation fix below; outside the plan's declared `files_modified`, recorded rather than widened silently

## Decisions Made

- The live filter check now asserts a partition invariant instead of a precondition this plan exists to end (see the deviation).
- The printed `stale=` field was renamed `with-sibling=` so it names what it measures.
- Route smoke ran against the live production site rather than a local `npx next start`, deliberately: a local server resolves its dataset from `.env.local`, which points at the preview database, so a local run would have smoke-tested the wrong dataset and proved nothing about what a reader sees. The 28 routes compare status, redirect behaviour, final path, content type, the `<html>` tag and the presence of nav, footer and the branded not-found body, all base-URL independent.
- Saeid's terminology complaint became a named glossary item rather than an edit to the draft.
- The slug design change was recorded with its impact list and deferred rather than implemented.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug, Rule 3 - Blocking] `language-filter.check.ts --live` asserted a precondition that this plan exists to end**

- **Found during:** Task 2, step 4, on the first run after the execute
- **Issue:** The check exited 1 with `translationCandidatesQuery returned 25 row(s) but 26 approved English post(s) exist and none has a Farsi sibling yet` (`25 !== 26`). Both numbers were correct and the data was fine: 26 approved English posts exist, one now has a Farsi sibling, so the candidates query correctly returns the other 25. The assertion demanded `candidates == approvedEnglish`, which is only true while no Farsi document exists anywhere, and the code said so in the comment directly above it. The plan's own acceptance criteria require this check to exit 0 **after** the write that makes the statement false, so the plan contradicted itself, exactly as 03-09's did over the `sourceUpdatedAt` anchor. A second assertion had the same shape, requiring `translationStaleQuery` to return 0 rows. A quieter defect surfaced with it: the check printed `stale=1` for a sibling that is not stale, because that query measures "has a sibling" and never compares timestamps.
- **Fix:** In `scripts/checks/language-filter.check.ts` only. Replaced `candidates == approvedEnglish` with the partition invariant `candidates + withSibling == approvedEnglish`, which is true in every dataset state and strictly stronger; added a disjointness assertion so no post can appear in both sets; replaced the `stale == 0` assertion with one that every returned row must resolve to a real sibling, which closes the gap a straight swap of the two sibling tests would otherwise slip through since it still sums to 26; renamed the printed `stale=` to `with-sibling=`.
- **Files modified:** `scripts/checks/language-filter.check.ts`
- **Verification:** `npx tsc --noEmit` exit 0, `npx eslint scripts/checks/language-filter.check.ts` exit 0, the offline suite exit 0 unchanged, `--live` against production exit 0 with ALL PASS
- **Committed in:** `dd4dcf5`

---

**Total deviations:** 1 auto-fixed (1 wrong assertion that was also a blocker on a stated acceptance criterion)
**Impact on plan:** No behaviour, query, schema or production data changed. No scope creep. The scope note that the file sits outside the plan's declared `files_modified` is recorded in the run log rather than the widening being left silent.

## Issues Encountered

- **A fenced first response cost one retry**, as in 03-09. Recovered by the existing single retry; no fence stripping was added, because a fenced response is a broken contract rather than a format to accommodate.
- **The token estimator is a long way low.** The dry run estimated 27,592 in / 10,396 out for this post; the measurement was 230,296 in / 127,891 out, roughly 8x the input estimate and 12x the output estimate. Two visible causes: the estimate assumes one translate call and this run made two, and its input model ignores prompt cache creation and cache read, which the 03-08 decision counts as input. **It must not be trusted as a size brake on a 26-post sweep.** Carried to Phase 5.

## Follow-ups carried into Phase 5

New from this plan:

1. **Glossary (Finding A):** add `post` to `مقاله` and `article` to `مقاله`, regenerate the frozen prompt block, then `--retranslate` the proof draft.
2. **Slug design (Finding B):** Farsi slugs must differ from the English slug. Six named impacts across Phase 4 routing and Phase 5 hreflang, the post-run assertion, uniqueness scoping, pipeline generation plus Studio editability, and the one existing draft. Plan before building; the direction discussed is not yet ratified.
3. **Token estimator recalibration:** account for retry calls and for cache-creation plus cache-read input, or stop presenting the estimate as a brake.

Standing follow-ups already on record and still open, restated so nothing is lost at phase close:

4. **The `readStrings` `"The "` empty-string gate fix:** reject an empty string where the source string was non-empty, so the condition becomes a named error recoverable through the existing retry, and state in the translate instruction that no slot may come back empty. It did not fire on this post, so it remains unwritten. Roughly one production post in six blocks on it otherwise.
5. **Fence-rate hardening:** 40 percent of first responses were fenced across the 03-09 dev rehearsal, and 03-08's instruction hardening did not lower it. On a 26-post sweep that is roughly a dozen wasted calls.
6. **Per-post spend booking:** spend is booked once at the end of a run, so an aborted sweep books nothing. This run reached the end, so its record is complete, but the fragility is unchanged.
7. **Threat register update:** T-03-05 still reads as a count-gate problem and understates the CLI transport that D-16 introduced, though 03-08 mitigated it by denying every built-in tool on every call.
8. **Never run two writing commands against one dataset at the same time** (learned in 03-09), which matters most on the 26-post sweep.

## User Setup Required

None. No external service configuration was needed; the run used the existing subscription transport and the existing production env file.

## Next Phase Readiness

- **The phase gate is met and the phase is executable-complete at 10 of 10 plans.** What remains for the phase is verification and close, which the orchestrator owns.
- **Production state:** exactly one Farsi document in `blog_posts`, a draft, unpublished and unedited since the assertions were captured. Zero Farsi documents carry the publish-cron status. The English site is unchanged and proven so.
- **Phase 4 (Farsi presentation) inherits:** the `/fa` routes still do not exist, which is why the Studio is the only Farsi review surface today, and Finding B changes what those routes must look a post up by.
- **Phase 5 (backlog sweep) inherits:** the eight follow-ups above. Items 1, 4 and 5 should land before the 26-post sweep runs, because each one either changes the output the sweep would produce or wastes subscription calls at scale.

## Self-Check: PASSED

All claimed files exist on disk and all three task commits resolve in `git log`:

- FOUND `.planning/phases/03-translation-pipeline/artifacts/translate-prod.log`
- FOUND `.planning/phases/03-translation-pipeline/artifacts/blog_posts-2026-08-25T18-08-41.044Z.json`
- FOUND `.planning/phases/03-translation-pipeline/artifacts/blog_posts-2026-08-25T19-40-20.694Z.json`
- FOUND `scripts/checks/language-filter.check.ts`
- FOUND commit `dd4dcf5`, FOUND commit `719c8c2`, FOUND commit `50d3f3b`
- Task 3's automated verify (`## Studio walk` present in the run log) exits 0
- The leak scan re-run over the extended log still reports 0 occurrences of all three forbidden substrings

---
*Phase: 03-translation-pipeline*
*Completed: 2026-09-01*
