---
phase: 03-translation-pipeline
plan: 03
subsystem: pipeline-core
tags: [portable-text, walker, structural-gate, translation-notes, check-script, pipe-01, pipe-02]

# Dependency graph
requires:
  - phase: 03-translation-pipeline
    provides: "Plan 03-01's repaired lockfile and the `node:` prefixed builtin convention; plan 03-02's `EN_LANGUAGE` / `STATUS_APPROVED` fragments, which the live section reuses rather than retyping."
  - phase: 02-content-model
    provides: "The `translationNotes` field (`type: text, rows: 6, readOnly: true`) whose rendering constraints the formatter is written against."
provides:
  - "`scripts/lib/` as a new surface: pure, dependency-free, side-effect-free modules that a check script proves offline."
  - "`extractTranslatables` / `toTexts` / `applyTranslatables` / `structuralFingerprint` and the `Translatable` type: the only path by which a model's output may re-enter a document (D-05 tier 1, D-13)."
  - "`formatNotes` / `todayIso` and the `Finding` type, whose `category` union is the one plan 03-08's verify schema must import rather than redeclare."
  - "`scripts/checks/translation.check.ts`: offline sections A to G, a read-only `--live` round trip over every approved English post, and the reserved `--post-run` flag name for plan 03-09."

affects: [03-05, 03-08, 03-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One private enumerator shared by extraction and reapplication. Two traversals can drift apart; a single one cannot, and the day they disagree is the day a translated string lands in the wrong slot silently."
    - "The blocking gate is derived from the walker, not written independently. `structuralFingerprint` is `JSON.stringify(applyTranslatables(body, blanks))`, so it blanks exactly the slots the walker owns and compares every other leaf verbatim, and it stays correct as the content model grows."
    - "Deny by default for unknown `_type`. A block type nobody has written yet contributes zero translatable strings and is not recursed into, so it survives byte identical with no code change."
    - "Negative fixtures over presence assertions, mirroring plan 02-05's allowlist probe: six mutations each asserted to CHANGE the fingerprint, each behind an anti-vacuity assertion that the clone really differs from the source."

key-files:
  created:
    - scripts/lib/portable-text-walk.ts
    - scripts/lib/translation-notes.ts
    - scripts/checks/translation.check.ts
  modified: []

key-decisions:
  - "`applyTranslatables` compares counts BEFORE it writes anything, not while consuming. A short or long model response therefore never produces a half-translated body that a later reader could mistake for partial success. A second post-walk comparison stays as a tripwire on the deep copy itself."
  - "Every mutation in section D is guarded by an anti-vacuity assertion that the mutated clone actually differs from the fixture. Without it, a mutation helper that silently did nothing would make the gate look alive while proving nothing, which is the exact failure mode the section exists to rule out."
  - "`--post-run` short-circuits before the offline sections and exits 1. A reserved flag that ran the offline suite and printed ALL PASS would let a future caller believe the post-run assertions had passed when they do not exist yet."
  - "The live section reads bodies through its own query rather than `translationCandidatesQuery`, which projects `_id` and `slug` only, on purpose, so pipeline selection never drags a body across the wire. It reuses the `EN_LANGUAGE` and `STATUS_APPROVED` fragments so the two reads cannot disagree about what an approved English post is."
  - "Labels are asserted per kind, not just in aggregate. `block[0]/span[0]`, `table[6]/row[1]/cell[2]`, `image[7]/alt`, `video[8]/caption` are the location strings plan 03-08 renders into `translationNotes`, which makes the format a contract rather than a debugging convenience."

metrics:
  duration: ~25m
  completed: 2026-08-22
status: complete
---

# Phase 3 Plan 03: Pipeline Correctness Core Summary

Built the load-bearing part of the translation pipeline as pure functions that are provable with no network and no model: the walker that decides which strings may be translated, the fingerprint gate that refuses a write when anything else moved, and the `translationNotes` renderer. Every claim below is asserted in a check script, including six negative cases proving the gate detects mutation rather than merely existing.

## What was built

Three tasks, three commits, all autonomous, no checkpoints.

**Task 1 (`6f246ee`) created `scripts/lib/portable-text-walk.ts`**, the first file under a new `scripts/lib/` surface. It has zero imports, no side effects on import, and no id generation of any kind. One private enumerator, `walkSlots`, is called by both `extractTranslatables` and `applyTranslatables`. That is the central constraint of the module: separate traversals can drift apart, and two traversals that disagree about which slots are translatable would put a Farsi string in the wrong place with no error anywhere.

The enumerator visits, in strict document order:

| Rule | `_type` | Slot | Kind |
|---|---|---|---|
| 1 | `block` | each `children[]` entry with `_type === "span"` and non-empty `text` | `span` |
| 2 | `image` | `alt` when non-empty | `alt` |
| 3 | `video` | `caption` when non-empty | `caption` |
| 4 | `table` | each `rows[].cells[]` entry that is a non-empty string | `cell` |
| 5 | anything else | nothing, and no recursion into it | none |

Rule 5 is the D-13 boundary and the "code blocks pass through untouched" success criterion at the same time. There is deliberately no `code` branch, and the source carries a comment saying so, because the corpus contains zero code blocks across all 26 production and 17 dev posts. The absence is the guarantee, not an oversight.

`structuralFingerprint` is `JSON.stringify(applyTranslatables(body, new Array(extractTranslatables(body).length).fill("\u0000")))`. Deriving it from the walker instead of from an independent replacer means the gate blanks exactly the slots the walker owns and compares every other leaf verbatim. An independent replacer is free to fall out of step with the walker, and a gate out of step with the thing it guards is worse than no gate.

**Task 2 (`b4c7f1d`) created `scripts/lib/translation-notes.ts`.** `formatNotes` renders zero findings as the single line `Verify pass clean (YYYY-MM-DD)`, and findings as a header plus one line per finding, `warn` before `info`, stable within a severity. `summary` and `location` are collapsed to one line before emission, so a multi-line model summary cannot break the format that makes a six-row read-only Studio box scannable. The `Finding` `category` union is the one the verify pass JSON schema enumerates; plan 03-08 imports it rather than restating it. No em dash appears anywhere in the module, and none can appear in its output.

**Task 3 (`b87d76b`) created `scripts/checks/translation.check.ts`**, offline sections A to G plus a read-only `--live` section, with `--post-run` reserved for plan 03-09.

## The fixture

One inline body, ten entries, carrying every shape the corpus census measured, the two shapes `blockContentType.ts` does not declare, and one shape that does not exist in the corpus at all.

| Index | Shape | Slots |
|---|---|---|
| 0 | `normal` block, two spans, one carrying a `markDefs` link with an `href` | 2 `span` |
| 1 | `h2` block | 1 `span` |
| 2 | `blockquote` block | 1 `span` |
| 3 | `listItem: "bullet"` | 1 `span` |
| 4 | `listItem: "number"` (undeclared in the schema, present in real data) | 1 `span` |
| 5 | span with `marks: ["code"]` (undeclared), plus an empty-text span | 1 `span` |
| 6 | `table`, 2 rows x 3 string cells, one cell empty | 5 `cell` |
| 7 | `image` with `alt`, `alignment`, `width`, `asset._ref`, `crop`, `hotspot` | 1 `alt` |
| 8 | `video` with a `caption` | 1 `caption` |
| 9 | synthetic `_type: "code"` with `code`, `language`, `filename` | 0 |

**Translatable-item count: 14.** Hand-counted from the fixture, asserted against the walker rather than derived from it.

**Kind sequence**, asserted with `deepStrictEqual`:

```
["span","span","span","span","span","span","span","cell","cell","cell","cell","cell","alt","caption"]
```

The empty span at index 5 and the empty cell at index 6 contribute nothing, and section A separately asserts that no enumerated slot has an empty `text`. An empty slot handed to a model comes back as invented prose.

The fixture also carries ten index-drift assertions (`FIXTURE[IX_TABLE]._type === "table"` and so on), so a later edit that inserts a block cannot silently repoint the section D mutations at the wrong node.

## Section D, and the deliberate break probe

Section D is the only section whose failure is a security event rather than a maintenance chore. Six independent mutated clones, each asserted to change the fingerprint, each preceded by an anti-vacuity assertion that the clone really differs from the source:

| # | Mutation | Detected |
|---|---|---|
| 1 | a span `_key` regenerated | yes |
| 2 | `markDefs[0].href` rewritten | yes |
| 3 | `listItem` flipped bullet to number | yes |
| 4 | image `asset._ref` changed | yes |
| 5 | a block removed | yes |
| 6 | a pair of children reordered | yes |

**The probe (plan acceptance criterion).** `structuralFingerprint` was temporarily changed to return the constant `"BROKEN-CONSTANT"` and the offline check re-run. It exited **1** on section D, at the first mutation, with this message verbatim:

```
AssertionError [ERR_ASSERTION]: structuralFingerprint did NOT detect "a span _key". The D-05 tier 1 gate
is blind to this mutation, which means a model response carrying it would be written to the Content Lake
unchallenged.
    at assert (.../scripts/checks/translation.check.ts:327:10)
  actual: 'BROKEN-CONSTANT',
  expected: 'BROKEN-CONSTANT',
  operator: 'notStrictEqual',
```

The probe was reverted from a backup taken before it was applied, and `git diff scripts/lib/portable-text-walk.ts` against HEAD is empty. Note the anti-vacuity assertion immediately before it still passed under the probe, which is the correct behaviour: the body genuinely changed, and it was the gate that had gone blind.

## Live round trip, both datasets

Read-only, one client per run, `perspective: "raw"` because that is the perspective the pipeline itself uses and a published-perspective read would prove nothing about it. Every statement in the section is a `fetch`; nothing is written.

| Dataset | env file | approved English | round trip byte identical | blocks | translatable slots | largest post |
|---|---|---|---|---|---|---|
| `blog_posts_dev` | `.env.local` | 11 | **11/11** | 567 | 866 | `what-is-data-a-complete-beginners-guide-for-the-curious-mind`, 60 blocks, 132 slots, 24,426 chars |
| `blog_posts` | `.env.vercel-prod` | 26 | **26/26** | 1,668 | 2,962 | `explainable-ai-in-credit-risk-why-banks-cannot-afford-black-boxes`, 115 blocks, 230 slots, 57,961 chars |

Both header lines verbatim:

```
live: projectId=pz9ppas8 dataset=blog_posts_dev apiVersion=2025-10-07 (raw perspective) approved-english=11
live: projectId=pz9ppas8 dataset=blog_posts apiVersion=2025-10-07 (raw perspective) approved-english=26
```

The prod figures line up with RESEARCH's independent probe: 26 approved English posts, and a largest post of 115 blocks. RESEARCH measured 183 spans in that post; the walker enumerates 230 slots for it, and the 47 extra are exactly the table cells, image alts and video captions that D-13 added to the translatable set and that a span-only walker would have shipped in English.

For each post the check also asserts the fingerprint is identical across two computations over two independent copies of the same body, so the gate is proven deterministic rather than merely self-consistent.

## Deviations from Plan

### 1. [Rule 2 - Missing critical functionality] The count check runs before any write, and a second one runs after

- **Found during:** Task 1
- **Issue:** The plan asked that `applyTranslatables` throw when the consumed count and `texts.length` differ. Read literally, that means consuming as you go and throwing at the end, which leaves a partially mutated body in memory at the moment of the throw. That body is deep-equal to nothing in particular: half Farsi, half English, structurally intact, and therefore exactly the kind of object a later `catch` could log and move on from.
- **Fix:** The enumeration count is compared to `texts.length` before the copy is walked, so nothing is written when the counts disagree, and the message says "Nothing was written." A second comparison after the walk stays as a tripwire on the deep copy: if the copied body enumerates a different number of slots than the source, the two walks disagreed about a body that did not change in between, which should be impossible.
- **Files modified:** `scripts/lib/portable-text-walk.ts`
- **Commit:** `6f246ee`

### 2. [Rule 2 - Missing critical functionality] Anti-vacuity guards on every section D mutation

- **Found during:** Task 3
- **Issue:** The plan specified six clones each asserted to change the fingerprint. A mutation helper that silently did nothing (a wrong index, a property that does not exist on the node it was pointed at) would fail that assertion loudly today, but the reverse failure is the dangerous one: a future edit that shifts the fixture indices could point a mutation at a node where it is a no-op, and the assertion would then be testing nothing while still passing or failing for the wrong reason.
- **Fix:** Each mutation is preceded by `assert.notStrictEqual(JSON.stringify(clone), JSON.stringify(FIXTURE))` naming the mutation, and the fixture carries ten `_type` / `style` / `listItem` index-drift assertions above section A. This is the same discipline plan 02-05 used for its allowlist probe.
- **Files modified:** `scripts/checks/translation.check.ts`
- **Commit:** `b87d76b`

### 3. [Rule 2 - Missing critical functionality] The `--post-run` stub exits 1 and short-circuits

- **Found during:** Task 3
- **Issue:** The plan asked for a stub that "reports not implemented until plan 03-09". A stub that reported and then let the offline suite run would print `translation.check.ts: ALL PASS` and exit 0, which is precisely the wrong signal: a caller running `--post-run` is asking whether a written Farsi draft is sound, and would be told yes by a run that never looked at one.
- **Fix:** The flag is parsed at the top of the file, prints to stderr and exits 1 before any assertion runs. The comment enumerates what plan 03-09 will fill in (fingerprint identical to source, every `markDefs` href byte identical, `translationNotes` present in the D-06 shape, `TokenUsage` rows recorded, zero `fa` + `scheduled` documents).
- **Files modified:** `scripts/checks/translation.check.ts`
- **Commit:** `b87d76b`

### 4. [Clarification, no behaviour change] The blanking character is written as an escape

The fingerprint's blanking character is NUL. Writing it as a literal character makes `scripts/lib/portable-text-walk.ts` a binary file to `grep` and to any diff viewer. It is written as the escape `"\u0000"` with a comment saying why, so the source stays plain text. Anyone editing that line should keep the escape form.

### 5. [Clarification, no behaviour change] The live section reads bodies through its own query

The plan said to fetch every approved English post body. `translationCandidatesQuery` cannot serve that: plan 03-02 deliberately projects `_id` and `slug` only, so selection never fetches a body it would discard. The live section therefore writes its own projection, reusing the imported `EN_LANGUAGE` and `STATUS_APPROVED` fragments and the `path("drafts.**")` exclusion so the two reads cannot disagree about what an approved English post is. A comment states this.

## TDD Gate Compliance

Tasks 1 and 2 carry `tdd="true"`, and the commit sequence is `feat`, `feat`, `test` rather than `test`, `feat`. That ordering comes from the plan itself: this repo has no test framework by design, the check script IS the test, and the plan places the check script in Task 3 while giving Tasks 1 and 2 a `<verify>` block of `tsc` and `eslint` only.

What was preserved is the substance rather than the commit order. Every `<behavior>` line from Tasks 1 and 2 is transcribed into a named assertion in sections A to G, and the fixture's expected slot count (14) and kind sequence were hand-counted from the fixture definition before the check was run, not read off the walker's output. The deliberate break probe is the RED evidence that the gate assertions actually fail when the thing they guard is broken.

## Verification

Every plan-level verification command, re-run on the final committed tree:

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint scripts/lib/portable-text-walk.ts scripts/lib/translation-notes.ts scripts/checks/translation.check.ts` | exit 0, no output |
| `npx tsx scripts/checks/translation.check.ts` | `ALL PASS`, 14 slots, 6/6 mutations detected |
| `npx tsx --env-file .env.local scripts/checks/translation.check.ts --live` | exit 0, `ALL PASS`, 11/11 byte identical |
| `npx tsx --env-file .env.vercel-prod scripts/checks/translation.check.ts --live` | exit 0, `ALL PASS`, 26/26 byte identical |
| Section D break probe applied and reverted | exited 1 on section D, message recorded above, `git diff` clean after revert |

Per-task acceptance greps:

- Task 1: id-generation scan (`nanoid|randomUUID|uuid\(`) **0**; `structuredClone` **1**; the dependency-free probe for `@sanity` and `../../src` imports exits **0**; five exports present (`extractTranslatables`, `toTexts`, `applyTranslatables`, `structuralFingerprint`, `Translatable`).
- Task 2: `Verify pass clean` **1**; em dash scan exits **0** (no em dash, and no en dash either); `formatNotes`, `todayIso`, `Finding` all exported.
- Task 3: `_type: "code"` **2**; `listItem` **8**; `perspective: "raw"` **1**; `--post-run` stub exits **1** with the not-implemented message.

Regression, on the final tree:

| Command | Result |
|---|---|
| `npx tsx scripts/checks/language-filter.check.ts` | `ALL PASS`, 18 schema fields, 9/9 queries faithful, 2 pipeline queries pinned |
| `npx tsx scripts/checks/shared-pdfs-lib.check.ts` | `ALL PASS` |

`npm run build` was never invoked. `npx next build` was not run either: nothing in this plan touches a route, a component or a build-time query, and all three files live under `scripts/`, which Next.js does not compile. `npx tsc --noEmit` covers them, and it includes `scripts/**` through the tsconfig `**/*.ts` glob.

## What is still unproven

- **The walker has never seen a Farsi string that came from a model.** Section C substitutes Farsi-looking markers of the check's own making. Real model output can carry zero-width joiners, bidi control characters and Arabic-Indic digits, none of which affect the structural gate (they are text inside an enumerated slot) but all of which are the verify pass's business in plan 03-08.
- **`formatNotes` has never rendered a real finding.** Section G's findings are hand-written. The shape is pinned; the model's ability to fill it is plan 03-08's to prove.
- **No `image` with an absent or empty `alt` was exercised against real data**, only the fixture's positive case. Both datasets round tripped byte identical, so any such image passed through the walker correctly, but the count of them was not measured here.
- **The `--post-run` assertions do not exist.** The flag name and its meaning are fixed; plan 03-09 implements it against the first Farsi draft.

## Known Stubs

`--post-run` is a deliberate, declared stub that exits 1 with a message naming the plan that fills it in (03-09). It is not a silent placeholder: no code path can mistake it for a passing run. Everything else in all three files is complete and exercised.

## Threat Flags

None new. The five threats this plan owned are disposed as registered:

- **T-03-02 (Tampering, Portable Text reassembly): mitigated.** Reassembly deep copies and assigns only into enumerated slots; the fingerprint is derived from the same enumerator, so every unowned leaf is compared verbatim; six negative fixtures prove the comparison detects mutation, and the break probe proves the assertions fail when it stops.
- **T-03-19 (Tampering, `markDefs` hrefs): mitigated.** Link annotations are never enumerated, so no href is ever sent to a model, and mutation 2 asserts that changing one changes the fingerprint.
- **T-03-20 (Tampering, undeclared or future block types): mitigated.** Rule 5 contributes nothing for an unknown `_type`, and section E proves the synthetic code block contributes 0 slots and survives a full substitution round trip byte identical.
- **T-03-13 (Repudiation, ambiguous empty `translationNotes`): mitigated.** `formatNotes` emits an explicit clean line, asserted in section G.
- **T-03-17 (Information Disclosure, live check output): accepted as registered.** The live section prints a project id, a dataset name, an apiVersion, five integers and one slug. No token, no env value, no body text. Slugs are public URLs.

## Self-Check: PASSED

Files claimed created, all confirmed present on disk:

- `scripts/lib/portable-text-walk.ts` FOUND
- `scripts/lib/translation-notes.ts` FOUND
- `scripts/checks/translation.check.ts` FOUND

Commits claimed, all confirmed in `git log`:

- `6f246ee` FOUND (`feat(03-03): add the Portable Text translation walker and structural fingerprint`)
- `b4c7f1d` FOUND (`feat(03-03): add the translationNotes formatter with an explicit clean line`)
- `b87d76b` FOUND (`test(03-03): prove the walker, the fingerprint gate and the notes formatter`)

Working tree clean after each commit. No file deletions in any of the three: `git diff --diff-filter=D HEAD~3 HEAD` is empty.
