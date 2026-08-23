---
phase: 03-translation-pipeline
plan: 05
subsystem: content
tags: [glossary, farsi, mining, n-grams, claude-cli, token-usage, review-artifact, preflight]

# Dependency graph
requires:
  - phase: 03-translation-pipeline
    plan: 01
    provides: "`scripts/lib/token-usage.ts` (resolveAdminUserId, recordTokenUsage) and `scripts/checks/env-preflight.check.ts`, the file whose API-key BLOCKER row this plan retires."
  - phase: 03-translation-pipeline
    plan: 03
    provides: "`scripts/checks/translation.check.ts` sections A to G, the offline check this plan extends with section H."
provides:
  - "`content/fa-glossary.json`: 98 evidence-backed entries, sorted by term, timestamp free, each carrying a counted corpus frequency and a real example sentence."
  - "`content/fa-glossary-review.html`: the standalone review table Saeid corrects in plan 03-06, regenerable from the JSON at zero cost."
  - "`scripts/lib/glossary.ts`: `loadGlossary`, `serializeGlossaryBlock`, `glossaryTermIndex` and the `Glossary` type. The block is the cache-stable system text every translate and verify prompt in 03-08 and 03-09 embeds verbatim."
  - "`scripts/mine-glossary-terms.ts`: the corpus miner, the one-call classifier and a no-cost HTML regenerator."
  - "The first working D-16 transport in the repo: a reusable `claude -p --model sonnet --output-format json` subprocess with stdin prompting, stdout-only parsing and CLI usage extraction, proven end to end against the production corpus."
affects: [03-06, 03-08, 03-09, 03-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Model calls ride `spawnSync(\"claude\", [\"-p\", \"--model\", \"sonnet\", \"--output-format\", \"json\"])` with the prompt on stdin. Direct spawn first, `shell: true` retried only on ENOENT, so a `claude.cmd` shim and a bare `claude.exe` both resolve without paying for a failed call twice."
    - "A model response is untrusted input: JSON.parse, then a hand-written shape validator, then a join back onto locally computed evidence, all before a byte is written."
    - "Recorded input tokens are `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`. On this transport `input_tokens` alone is a single-digit remainder and would record a 76k-token read as if it were 2."
    - "Generated review artifacts carry no generation date, so a regeneration is a no-op diff rather than a daily churn."

key-files:
  created:
    - scripts/mine-glossary-terms.ts
    - scripts/lib/glossary.ts
    - content/fa-glossary.json
    - content/fa-glossary-review.html
    - .planning/phases/03-translation-pipeline/artifacts/glossary-candidates.json
  modified:
    - scripts/checks/env-preflight.check.ts
    - scripts/checks/translation.check.ts

key-decisions:
  - "The candidate list is quota'd per n-gram length (200 unigrams, 100 bigrams, 50 trigrams) rather than taken as a flat top 350. A flat cut is all unigrams, and \"machine learning\", \"model risk\" and \"EU AI Act\" would never have reached the model."
  - "N-grams are built per sentence, never across sentence boundaries, so no phrase is manufactured out of one sentence's tail and the next one's head."
  - "The example sentence is captured while counting, not searched for afterwards. A gram's display form is its tokens joined by single spaces and need not appear verbatim in the source, so a post-hoc substring search would leave real candidates with an empty evidence column."
  - "The `claude` CLI probe is a FAIL row, not a BLOCKER row. Under D-16 the CLI is the transport, already installed and authenticated, so an unspawnable `claude` is broken plumbing rather than a pending human action."
  - "`env-preflight.check.ts` no longer aborts on a missing env file; it records a FAIL row instead, so the transport probe still reaches the report when the check is run bare. Exit code semantics are unchanged."
  - "`serializeGlossaryBlock` omits frequency, example and exampleSlug. Those are review evidence for Saeid, not translation instructions, and leaving them out is what keeps the block byte-stable and the file diffable."
  - "The spend row was written to the PRODUCTION database, matching the production corpus the mining read. `costUSD` is not a column; the run is subscription-funded and the recorded numbers are token counts only."

requirements-completed: [PIPE-02]

coverage:
  - deliverable: "env-preflight probes the claude CLI and names no API-key variable"
    verification:
      - kind: command
        ref: "npx tsx scripts/checks/env-preflight.check.ts (bare), --env-file .env.local, --env-file .env.vercel-prod"
        status: pass
      - kind: command
        ref: "grep -c ANTHROPIC_API_KEY scripts/checks/env-preflight.check.ts -> 0"
        status: pass
    human_judgment: false
  - deliverable: "350 candidates with deterministic corpus frequencies and real example sentences"
    verification:
      - kind: command
        ref: "two consecutive mining runs, cmp byte-identical"
        status: pass
      - kind: command
        ref: "node -e every entry frequency > 1 and example non-empty -> exit 0"
        status: pass
    human_judgment: false
  - deliverable: "content/fa-glossary.json, 98 entries, sorted, timestamp free, strategy union held"
    verification:
      - kind: command
        ref: "the five node -e acceptance probes from task 2"
        status: pass
      - kind: tests
        ref: "scripts/checks/translation.check.ts#H"
        status: pass
    human_judgment: false
  - deliverable: "content/fa-glossary-review.html as the correction surface"
    verification:
      - kind: command
        ref: "contains <table, contains all 98 terms, zero <script src= and zero <link rel=stylesheet"
        status: pass
      - kind: command
        ref: "--regen-html reproduces it byte identical with no env and no model call"
        status: pass
    human_judgment: true
    rationale: "Whether the table is actually readable and correctable, and whether the Farsi renderings are right, is Saeid's call in plan 03-06. No browser was opened in this session; the assertions cover structure and content, not legibility."
  - deliverable: "scripts/lib/glossary.ts loader and deterministic prompt block"
    verification:
      - kind: tests
        ref: "scripts/checks/translation.check.ts#H (byte identity across two independent loads, no date, one entry line per entry, D-04 instruction present)"
        status: pass
      - kind: command
        ref: "deliberate break probe: invalid strategy -> exit 1 with the entry named, then reverted and re-passed"
        status: pass
    human_judgment: false
  - deliverable: "TokenUsage row for the classification run"
    verification:
      - kind: command
        ref: "prisma.tokenUsage.findMany where activity=glossary-mine against .env.vercel-prod -> 1 row"
        status: pass
    human_judgment: false

metrics:
  duration: ~25m
  completed: 2026-08-23
status: complete
---

# Phase 3 Plan 05: Glossary Mining and Review Surface Summary

A 98-term Farsi glossary mined from Saeid's own 26 published posts, with every frequency counted in code and every example sentence lifted verbatim from the corpus, produced by exactly one Sonnet call over the subscription CLI.

## What was built

Three tasks, three commits, all autonomous, no checkpoints.

**Task 1 (`7b8d6fa`)** retired the void API-key blocker and built the miner.
**Task 2 (`0595ebd`)** made the single classification call and wrote both content files.
**Task 3 (`8893db7`)** added the validating loader and assertion section H.

## The glossary

**98 entries.** Strategy distribution:

| Strategy | Count | Share |
|---|---|---|
| `translate` | 82 | 84% |
| `keep-english` | 10 | 10% |
| `transliterate` | 6 | 6% |

The ten highest-frequency entries, with the counted corpus frequency:

| Term | Rendering | Strategy | Frequency |
|---|---|---|---|
| data | داده | translate | 843 |
| AI | هوش مصنوعی | translate | 518 |
| model | مدل | translate | 307 |
| risk | ریسک | transliterate | 266 |
| governance | حکمرانی | translate | 184 |
| regulatory | نظارتی | translate | 164 |
| financial | مالی | translate | 157 |
| credit | اعتبار | translate | 154 |
| SQL | SQL | keep-english | 120 |
| compliance | انطباق | translate | 119 |

The full `keep-english` set is `Excel`, `Explainable Boosting Machines`, `GDPR`, `Power BI`, `Power Query`, `Python`, `SHAP`, `SQL`, `SR 11-7`, `pandas`. That is the D-02 tag doing exactly the job it exists for: ten terms that a naive "translate everything" pass would have rendered into Persian script and made read as amateur.

**Serialised block: 4,078 characters over 102 lines** (four framing lines plus 98 tab-separated entry lines), byte identical across two independent loads, carrying no date.

## The mining pass, and why the numbers are trustworthy

`pt::text(body)` over the production dataset returned **26 posts, 334,001 characters**, segmented into **3,420 sentences**, yielding **29,954 distinct n-grams** at frequency 2 or more, from which **350 candidates** were selected under per-n quotas of 200 / 100 / 50.

Nothing about those numbers came from a model. Three design choices carry that:

- **Sentence-bounded n-grams.** A flat token stream over a document mints phrases across sentence joins, so "...uses machine learning. Models are trained..." would produce the trigram "learning models are". Those junk grams crowd a top-350 list and push real terms out of it.
- **Stopword-bounded grams.** A gram may not start or end on a stopword, so "the transformer" and "of the model" never become candidates, while "rate of return" and "bag of words" still can.
- **The example sentence is recorded during counting**, not searched for afterwards. A gram's display form is its tokens joined by single spaces and need not appear verbatim in the source ("machine, learning" tokenises to the bigram "machine learning"), so a post-hoc substring search would have left real candidates with an empty evidence column, which is precisely the column D-03 promises Saeid.

Two consecutive runs produced byte-identical candidate files. Determinism required three deliberate choices: posts are sorted by slug in code rather than trusting Content Lake return order, every tie-break is explicit (frequency descending, then term ascending; shortest example sentence, then sentence text, then slug), and `byString` is used everywhere instead of `localeCompare`, whose result depends on the host locale.

## The one model call (D-16)

One `claude -p --model sonnet --output-format json` subprocess. Prompt on stdin (**23,417 characters**), stdout parsed, stderr never parsed. No retry was needed: the first response parsed as JSON, validated, and joined cleanly.

**Zero candidates were dropped.** All 98 returned terms matched a mined candidate verbatim, so no frequency had to be invented and none was.

Recorded spend, from the CLI's own `usage` block:

| Field | Value |
|---|---|
| activity | `glossary-mine` |
| model | `claude-sonnet-5` |
| inputTokens | 76,426 (`input=2 cache_creation=46,529 cache_read=29,895`) |
| outputTokens | 21,495 |
| totalTokens | 97,921 |
| cost | 0, subscription-funded (D-16) |

Written to the **production** database (`.env.vercel-prod`), matching the production corpus the mining read. It is the first row in that table, and it was verified by reading it back:

```
[{ "activity": "glossary-mine", "model": "claude-sonnet-5",
   "inputTokens": 76426, "outputTokens": 21495, "totalTokens": 97921 }]
```

The documented stdout-plus-run-log fallback exists in the code (`resolveSpendTarget` returns `{kind:"log"}` when there is no `DATABASE_URL`) but was **not used**: preflight A3/A4 came back true and the ADMIN id was resolved before the model call, not after.

Note on the input count: `input_tokens` alone was **2**. The prompt and the CLI's own system context land in `cache_creation_input_tokens` and `cache_read_input_tokens`, so recording only `input_tokens` would have logged a 76k-token read as a 2-token one. All three components are summed, and the breakdown is printed and recorded here so the composition is not lost.

## env-preflight after D-16

The `ANTHROPIC_API_KEY` BLOCKER row is gone; `grep -c ANTHROPIC_API_KEY scripts/checks/env-preflight.check.ts` returns **0**. The file names no API-key variable at all, deliberately.

Its replacement is a `claude --version` probe reported as a **FAIL** row rather than a BLOCKER, because under D-16 the CLI is the transport rather than a pending human action. Both env files now report clean:

| Run | Result |
|---|---|
| bare, no `--env-file` | `PASS claude CLI: spawnable, 2.1.241 (Claude Code)` + `FAIL env file` , exit 1 |
| `--env-file .env.local` | `dataset=blog_posts_dev 7/7 passed, 0 failed, 0 blocker(s)`, `ALL PASS` |
| `--env-file .env.vercel-prod` | `dataset=blog_posts 7/7 passed, 0 failed, 0 blocker(s)`, `ALL PASS` |

This phase now has **zero open BLOCKER rows** for the first time since plan 03-01.

## Section H, and the break probe

`scripts/checks/translation.check.ts` gained section H after G. Its summary line:

```
offline: glossary 98 entries (translate 82, transliterate 6, keep-english 10), block 4078 chars
over 102 line(s) with 98 entry line(s), byte identical across two independent loads, no date,
D-04 standing instruction present
```

It asserts, anti-vacuity guard first: entries greater than zero, then the 60 to 100 bound, the strategy union per entry, case-insensitive term uniqueness, term-ascending file order, `glossaryTermIndex` size parity, byte identity of `serializeGlossaryBlock` across **two independent loads**, absence of any `\d{4}-\d{2}-\d{2}` pattern in the block, exactly one tab-separated entry line per entry with exactly three fields each, term-ascending order of those lines, and the presence of the D-04 standing instruction.

**Deliberate break probe.** `entries[3].strategy` was set to `"transcribe"`, the check re-run, then the file restored and re-verified byte identical against its backup. Observed failure, exit code **1**:

```
Error: Invalid glossary at ...\content\fa-glossary.json: entries[3] ("AI systems") has strategy
"transcribe", which is not one of translate, transliterate, keep-english
    at fail (scripts/lib/glossary.ts:46:9)
    at loadGlossary (scripts/lib/glossary.ts:91:46)
    at scripts/checks/translation.check.ts:448:18
```

The throw comes from `loadGlossary`, not from an assertion further down, which is the intended ordering: a malformed glossary fails at load, before any block is serialised and before any request could be built from it. After reverting, `translation.check.ts: ALL PASS`.

## Deviations from Plan

### 1. [Rule 3 - Blocking issue] `env-preflight.check.ts` had to stop aborting on a missing env file

- **Found during:** Task 1
- **Issue:** The plan's acceptance criterion and its `<verification>` block both invoke `npx tsx scripts/checks/env-preflight.check.ts` **bare**, with no `--env-file`, and require the output to contain the `claude` CLI probe row. As written by plan 03-01, the check `assert.ok`s on `NEXT_PUBLIC_SANITY_DATASET` before any probe runs, so a bare invocation threw an AssertionError and printed no rows at all. The criterion was unsatisfiable without a structural change.
- **Fix:** The transport probe was hoisted above the env gate, since it is the one row that needs no env file. The two hard asserts became a single `FAIL` row named `env file`, carrying the same instruction the assertion message did. Exit-code semantics are unchanged: a FAIL row exits 1, exactly as the abort did. A bare run now prints a two-row report instead of a stack trace, which is strictly more useful and answers the question D-16 made the most important one in the phase.
- **Files modified:** `scripts/checks/env-preflight.check.ts`
- **Verification:** bare run prints the `claude CLI` PASS row and exits 1; both env-file runs still print `7/7 passed, 0 failed, 0 blocker(s)` and `ALL PASS`.
- **Commit:** `7b8d6fa`

### 2. [Rule 3 - Blocking issue] Unicode property escapes had to be built through the RegExp constructor

- **Found during:** Task 1
- **Issue:** The plan requires a Unicode-aware word boundary for tokenising. `tsconfig.json` targets `ES2017`, and modern TypeScript rejects `\p{L}` inside a regex **literal** at that target.
- **Fix:** The token pattern is a string constant compiled with `new RegExp(TOKEN_PATTERN, "gu")`, which is not statically analysed against the target. A comment says why, so nobody "tidies" it back into a literal. Sentence segmentation avoids lookbehind for the same reason.
- **Files modified:** `scripts/mine-glossary-terms.ts`
- **Verification:** `npx tsc --noEmit` exit 0; the tokeniser runs correctly over 334,001 characters.
- **Commit:** `7b8d6fa`

### 3. [Design choice within plan discretion, recorded] Per-n quotas rather than a flat top 350

- **Found during:** Task 1
- **Issue:** The plan asks for "roughly 300 to 400 candidates" ordered by frequency. Taken as a flat cut, that list is entirely unigrams: the 350th unigram still outscores the top bigram.
- **Fix:** Quotas of 200 unigrams, 100 bigrams and 50 trigrams, combined and then sorted by frequency descending then term ascending exactly as specified. Without this, `machine learning`, `model risk`, `risk management` and `EU AI Act` would never have been shown to the classifier, and the glossary would have had no multi-word terms at all. 21 of the 98 final entries are multi-word.
- **Files modified:** `scripts/mine-glossary-terms.ts`
- **Commit:** `7b8d6fa`

### 4. [Deliberate non-change, recorded] The Task-2 `--regen-html` reader duplicates a little of `loadGlossary`

`--regen-html` does its own minimal shape check (`version`, non-empty `entries`, strategy union) rather than importing `scripts/lib/glossary.ts`, which task 3 created afterwards. Importing it would have been tidier, but task 3's declared file surface is `glossary.ts` and `translation.check.ts`, and reaching back into `mine-glossary-terms.ts` would have expanded it. The two validators answer different questions: the local one validates what the renderer needs, `loadGlossary` is the hard gate that stands in front of a model call. Flagged for plan 03-06, which touches `--regen-html` anyway.

**Total deviations:** 2 auto-fixed under Rule 3, 1 design choice recorded, 1 deliberate non-change recorded. **Impact:** none on the plan's outcome. Every acceptance criterion and every plan-level verification passed as written.

## Verification

Every plan-level verification command, re-run on the final tree:

| Command | Result |
|---|---|
| `npx tsx scripts/checks/translation.check.ts` | exit 0, `ALL PASS`, glossary line present |
| `npx tsc --noEmit` | exit 0 |
| `npx eslint scripts/mine-glossary-terms.ts scripts/lib/glossary.ts scripts/checks/translation.check.ts scripts/checks/env-preflight.check.ts` | exit 0, no output |
| `npx tsx scripts/checks/env-preflight.check.ts` (bare) | `claude CLI` PASS row present, no API-key row |
| two consecutive `mine-glossary-terms.ts` runs, `cmp` | byte identical |
| `npx tsx scripts/mine-glossary-terms.ts --regen-html` (no env file) | exit 0, HTML byte identical to the `--classify` output |
| `npx tsx scripts/checks/language-filter.check.ts` (unprompted regression) | `ALL PASS`, 18 schema fields, 2 pipeline queries pinned |

Task 1 acceptance probes: candidate count **350** (bound 200 to 500), every entry `frequency > 1` with a non-empty `example` exit 0, `grep -c "process.env.NEXT_PUBLIC_SANITY_DATASET ??"` **0**, first output line contains `dataset=blog_posts`, output reports **26 post(s) pulled**.

Task 2 acceptance probes: entry count **98**, strategy union exit 0, required fields exit 0, term-ascending order exit 0, no `\d{4}-\d{2}-\d{2}T` anywhere exit 0. Greps on `scripts/mine-glossary-terms.ts`: `@anthropic-ai/sdk` **0**, `ANTHROPIC_API_KEY` **0**, `from "zod"` **0**, `output-format` **3**, `claude-sonnet-5` **1**, dated `claude-sonnet-5-[0-9]` **0**. HTML: one `<table`, `<script src=` **0**, `<link rel="stylesheet"` **0**, all 98 terms present.

Task 3 acceptance probes: `grep -c "H. Glossary"` **1**; the two-independent-loads determinism and no-date probe printed `block chars 4078` and `index size 98` and exited 0.

## Known Stubs

None. Every function written in this plan is exercised: by the mining run against the production corpus, by the classification run, by `--regen-html`, or by section H of the offline check. `resolveSpendTarget`'s `{kind:"log"}` fallback branch is the one path not exercised on a real run, by design, because its trigger condition (no `DATABASE_URL`) is false on both env files this repo carries.

## Threat Flags

None. No new network endpoint, no auth path, no schema change. The threats this plan owned were mitigated as registered:

- **T-03-24** (fabricated frequencies): counted in code, and all 98 model selections joined back to a mined candidate. Zero drops, zero invented numbers.
- **T-03-25** (nondeterministic block): asserted byte identical across two independent loads, with an explicit no-date assertion and a comment in `glossary.ts` telling future readers not to add a timestamp.
- **T-03-26** (malformed glossary reaching a model call): proven by the deliberate break probe, which failed at load with the entry named.
- **T-03-05** (prompt injection via corpus text): the response was demanded JSON-only, parsed, shape-validated in code against the three-value strategy union and the entry bound, and every term joined back against the locally computed candidate list before anything was written.
- **T-03-07** (subscription usage): one call over 350 candidates rather than the 84k-token full corpus; `--check` reports with no model call at all.
- **T-03-04** (script output disclosure): the header prints `projectId`, `dataset`, `apiVersion` and mode only; the review HTML contains published post text and slugs, which are already public.
- **T-03-01** (wrong dataset): no `??` fallback on the dataset, header printed before the first read, and the script performs reads only.

## Notes for plan 03-06

- Saeid's correction pass runs against `content/fa-glossary-review.html`. After applying his corrections to the JSON, run `npx tsx scripts/mine-glossary-terms.ts --regen-html` so the two files cannot drift.
- Section H will catch a correction that breaks sortedness, uniqueness or the strategy union, so run `npx tsx scripts/checks/translation.check.ts` after applying corrections.
- If a correction removes entries, the 60-entry floor in `scripts/lib/glossary.ts` is the thing that will fail. It is a deliberate D-01 tripwire, not a nuisance; move it in code and say why, do not delete it.

## Self-Check: PASSED

Files claimed created, all confirmed present on disk:

- `scripts/mine-glossary-terms.ts` FOUND
- `scripts/lib/glossary.ts` FOUND
- `content/fa-glossary.json` FOUND
- `content/fa-glossary-review.html` FOUND
- `.planning/phases/03-translation-pipeline/artifacts/glossary-candidates.json` FOUND

Commits claimed, all confirmed in `git log`:

- `7b8d6fa` FOUND (`feat(03-05): mine glossary candidates and probe the claude CLI in env-preflight`)
- `0595ebd` FOUND (`feat(03-05): classify the candidates into content/fa-glossary.json and the review table`)
- `8893db7` FOUND (`feat(03-05): add the glossary loader and assertion section H`)
