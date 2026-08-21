---
phase: 02-content-model
plan: 05
subsystem: sanity-studio
tags: [sanity, studio, structure-builder, content-model, language, groq]
status: complete

# Dependency graph
requires:
  - phase: 02-content-model
    provides: "Plan 02-03's `language` field on `postType` (the thing both list filters read) and its extended preview that surfaces the English source title for Farsi documents; plan 02-04's fully stamped datasets, which make the English list's tolerance a safety net rather than the load-bearing mechanism; plan 02-02's check script, whose single-source allowlist this plan closes."
provides:
  - "Two top-level Studio lists, `posts-en` (\"Posts — English\") and `posts-fa` (\"Posts — Farsi\"), each with its own GROQ filter, its own id on both the list item and its child list, an explicit `apiVersion`, and a publish-date-descending default ordering."
  - "Creation disabled on the Farsi list via `.initialValueTemplates([])`, so no Studio form can mint a Farsi document carrying the English initial value."
  - "Section J of `scripts/checks/language-filter.check.ts`: source-text assertions that pin every mechanically checkable property of the split."
  - "A closed three-file allowlist for the language-equality text, demonstrated to fail on a fourth carrier."
  - "`.planning/phases/02-content-model/02-VALIDATION.md` filled and signed off: 14 task rows across plans 02-01 to 02-05, `nyquist_compliant: true`."
affects: [03-translation-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A custom `.filter()` on a `documentTypeList` REPLACES the preset `_type == $type` filter rather than appending to it, so every custom filter restates the type clause itself."
    - "Two lists over the same document type each set an explicit id on BOTH the list item and its child list; the default id of a document type list is the type name, so omitting either collides in Studio pane state and in the URL."
    - "Any document list whose filter differs from the preset passes `.apiVersion(apiVersion)` from `src/sanity/env.ts`, never a hardcoded date."
    - "Studio chrome may restate a GROQ predicate the public read path owns, but only from an explicitly closed allowlist that a check script enforces."

key-files:
  created:
    - .planning/phases/02-content-model/02-05-SUMMARY.md
  modified:
    - src/sanity/structure.ts
    - scripts/checks/language-filter.check.ts
    - .planning/phases/02-content-model/02-VALIDATION.md

key-decisions:
  - "The check script's single-source allowlist was widened to THREE files, not the two the plan's prose named. The plan text said \"the shared query module and the Studio structure file\" but overlooked `postType.ts`, which has carried the predicate inside the `translationOf` picker resolver since plan 02-03 and was already in the allowlist. Two files would have failed the assertion outright. The check script's own comment, written in plan 02-02, had it right: \"Plan 02-05 adds the THIRD entry\"."
  - "The whole of `src/sanity/structure.ts` was converted from the Sanity CLI boilerplate style (single quotes, no semicolons) to the repo's dominant double-quote-plus-semicolon style, and the two filter strings are backtick template literals rather than single-quoted strings, because the plan's own verify gate rejects any apostrophe in the file and the filters contain double-quoted GROQ literals."
  - "The final Studio browser pass could not be performed: the executing agent had no browser tooling in its context. It is recorded as OUTSTANDING in 02-VALIDATION.md rather than silently marked done."

requirements-completed: [CONTENT-01]

coverage:
  - id: D1
    description: "Two language-filtered Studio lists exist with distinct ids and correct titles."
    requirement: "CONTENT-01"
    verification:
      - kind: unit
        evidence: "language-filter.check.ts section J: each of \"posts-en\" and \"posts-fa\" asserted to appear exactly twice, each with two matching Posts titles containing its language word. ALL PASS."
  - id: D2
    description: "Neither custom filter leaks documents of other types (T-02-21)."
    requirement: "CONTENT-01"
    verification:
      - kind: unit
        evidence: "section J asserts `_type == \"post\"` appears exactly twice in structure.ts, once per filter."
  - id: D3
    description: "Both filtered lists carry an explicit apiVersion sourced from the env constant."
    requirement: "CONTENT-01"
    verification:
      - kind: unit
        evidence: "section J asserts 2 `.apiVersion(` calls, 2 of them of the form `.apiVersion(apiVersion)`, plus an import assertion for `{ apiVersion } from \"./env\"`."
  - id: D4
    description: "The Farsi list offers no create button (T-02-23)."
    requirement: "CONTENT-01"
    verification:
      - kind: unit
        evidence: "section J asserts exactly one `.initialValueTemplates([])` and that its position in the file follows the Farsi filter, so it cannot have landed on the English list."
  - id: D5
    description: "The language predicate has not spread beyond its three sanctioned carriers (T-02-25)."
    requirement: "CONTENT-02"
    verification:
      - kind: unit
        evidence: "Allowlist widening demonstrated to fail on a fourth file: a scratch file under src/ produced a non-zero exit and the AssertionError quoted below, then was deleted."
  - id: D6
    description: "The whole phase gate is green after the split."
    requirement: "CONTENT-01, CONTENT-02"
    verification:
      - kind: integration
        evidence: "npx tsc --noEmit exit 0; check offline ALL PASS; --live ALL PASS (17 posts, 9/9 parity identical); --post-migration en=17 fa=0 none=0; npx next build exit 0; route-smoke --verify 28/28 ALL PASS."
---

# Plan 02-05 Summary: the Studio post list split into English and Farsi

## The two lists, verbatim

| Property | English list | Farsi list |
|---|---|---|
| List id (set on BOTH the list item and its child list) | `posts-en` | `posts-fa` |
| Title (D-05 wording) | `Posts — English` | `Posts — Farsi` |
| Filter | `` `_type == "post" && (!defined(language) \|\| language == "en")` `` | `` `_type == "post" && language == "fa"` `` |
| `apiVersion` | `apiVersion` imported from `./env` | same |
| Default ordering | `[{ field: "publishedAt", direction: "desc" }]` | same |
| Create button | present (stock initial value templates) | **removed** via `.initialValueTemplates([])` |

The filters are declared as module-level backtick constants `EN_LIST_FILTER` and `FA_LIST_FILTER` above the resolver.

## Why the duplication is deliberate, and why it is safe

CONTENT-02 says the language filter is expressed in exactly one place, and it still is: `EN_LANGUAGE` in `src/sanity/lib/queries.ts` owns every public read path a visitor can reach. The two strings above are Studio chrome. They are editorial list filters executed with the credentials of a signed-in editor, and the structure builder cannot import a GROQ fragment meant for the content client without dragging server-read concerns into Studio config. The duplication is bounded to two string literals in one file, and section J of the check script pins the allowed set of carriers so a further occurrence anywhere under `src/` fails the gate. **Do not "fix" this by making structure.ts import from queries.ts.**

English is tolerant and Farsi is strict on purpose. After plan 02-04 the two forms are equivalent on both datasets, and they stop being equivalent the moment a future writer creates a post without the stamp. With a tolerant English filter such a document stays visible and editable; with a strict one it would be invisible in both lists, which is the worst outcome available. Farsi is always explicit by design (research Open Question 3).

## Deviations from Plan

**1. [Rule 1 - Bug] The allowlist is three files, not two**

- **Found during:** Task 2
- **Issue:** The plan's Task 2 action says the allowlist "becomes exactly two: the shared query module and the Studio structure file", and its acceptance criteria repeat "exactly two allowed files". But `src/sanity/schemaTypes/postType.ts` has carried `language ==` since plan 02-03, inside the `translationOf` reference-picker resolver (D-07), and was already one of the two entries in the pre-existing allowlist. Following the plan's literal count would have made the assertion fail on the very first run.
- **Fix:** Widened to exactly three: `queries.ts`, `postType.ts`, `structure.ts`. The check script's own comment from plan 02-02 already anticipated this ("Plan 02-05 adds the third entry"), so the plan prose is the outlier, not the code.
- **Files modified:** `scripts/checks/language-filter.check.ts`
- **Commit:** `1ed846a`

**2. [Rule 3 - Blocking] Filter strings are template literals, not single-quoted strings**

- **Found during:** Task 1
- **Issue:** 02-RESEARCH.md's verified example writes the filters as `const EN = '_type == "post" && ...'`. The plan's own second verify command rejects the file if it contains any apostrophe at all (`if (s.includes("\x27"))`), so the researched form fails its own gate. The first attempt also failed on apostrophes inside prose comments ("the Studio's own", "the editor's own credentials").
- **Fix:** Backtick template literals for both filters, matching `queries.ts` house style, and comment prose reworded to avoid possessive apostrophes.
- **Files modified:** `src/sanity/structure.ts`
- **Commit:** `5283b23`

**3. [Rule 3 - Blocking] The package-manifest assertion was scoped, not run verbatim**

- **Found during:** Task 2
- **Issue:** The plan's verify command asserts `git status --porcelain package.json package-lock.json` is empty. `package-lock.json` carries pre-existing uncommitted drift that predates this plan (`@sanity/client` 7.23.0 → 7.24.0 and `@sanity/eventsource` 5.0.2 → 5.0.4, 7 insertions / 7 deletions), which the execution brief explicitly says is not mine to stage or revert. The verbatim command would report a false failure.
- **Fix:** Asserted the intent rather than the letter: `package.json` clean, and the `package-lock.json` diff confined to exactly those pre-existing version/resolved/integrity lines and nothing else. Output: `package.json unchanged; package-lock.json carries only the pre-existing @sanity/client 7.23.0->7.24.0 + @sanity/eventsource 5.0.2->5.0.4 drift (7/7 lines), untouched by this plan`. No package-manager command was run at any point (T-02-SC).
- **Files modified:** none
- **Commit:** n/a

## The demonstrated allowlist failure

A scratch file `src/allowlist-probe.scratch.ts` containing `` export const scratchProbe = `language == "en"`; `` was created, the offline check run, and the file deleted. Exit code 1, with:

```
AssertionError [ERR_ASSERTION]: the language predicate must be expressed in exactly one place under src/ (CONTENT-02).
  found: src/allowlist-probe.scratch.ts, src/sanity/lib/queries.ts, src/sanity/schemaTypes/postType.ts, src/sanity/structure.ts
+ actual - expected

  [
+   'src/allowlist-probe.scratch.ts',
    'src/sanity/lib/queries.ts',
    'src/sanity/schemaTypes/postType.ts',
    'src/sanity/structure.ts'
  ]
```

`git status` after deletion is clean of the probe. The gate is live.

## Gate results

| Command | Result |
|---|---|
| `npx tsc --noEmit` | exit 0, run after each task |
| `npx eslint src/sanity/structure.ts scripts/checks/language-filter.check.ts` | clean |
| `npx tsx scripts/checks/language-filter.check.ts` | `ALL PASS` — `Studio split pinned (posts-en + posts-fa, 2 type clauses, 2 apiVersion calls, 1 create-disabled list)`, sole carriers = the three sanctioned files, 1184 src files scanned |
| `... --live` (dev) | `ALL PASS` — `dataset=blog_posts_dev posts=17`, all 9 parity assertions identical, row counts 15/9/1/11/1/15/17/17/17 unchanged from plan 02-04's recorded run, 17 distinct slugs each with max 1 English match |
| `... --post-migration` (dev) | `ALL PASS` — `language distribution en=17 fa=0 none=0` |
| `npx next build` | exit 0. **`npm run build` was never invoked** (T-02-DB) |
| `node scripts/checks/route-smoke.mjs --verify` | `28/28 passed`, `ALL PASS`, against a backgrounded `npx next start` (since stopped) |

## The seven Studio human-check items: OUTSTANDING

**The browser pass was not performed.** The executing agent had no browser tooling in its tool context, so all seven items are unreported rather than reported-as-passing. This is recorded as an outstanding manual row in `02-VALIDATION.md`; the script to run is in `02-05-PLAN.md` Task 2's `<human-check>` block, and the short form is:

1. `/studio` shows two post lists plus the unchanged Categories, Authors, divider and trailing types.
2. English list shows the existing posts, newest first, subtitles unchanged.
3. Farsi list is empty and offers **no create button**.
4. Console is clean while navigating between the two lists: no custom-filter/apiVersion warning, no duplicate-id error.
5. A post shows the Language radio (defaulting to English), the Translation of reference, and a read-only Translation Notes.
6. The Translation of picker offers English posts only, offers no create, and does not offer the open post itself.

What the browser would have added over what is already proven: the visual pass and the devtools console. Everything else in that list is pinned mechanically by section J (ids, titles, type-clause restatement, apiVersion source, create-disabled Farsi list, tolerant EN and strict FA predicates) and section I (picker `disableNew` plus the resolver-form filter). A failure on items 3, 4 or 6 would be a defect in this plan; a failure on item 5 belongs to plan 02-03.

## A note on the em dash in the titles

D-05 fixes the wording as "Posts — English" and "Posts — Farsi", and those literals are what shipped. They are Sanity Studio UI labels, not prose, so the project's no-em-dash content rule is not engaged. If Saeid prefers "Posts (English)" and "Posts (Farsi)", that is a four-token edit in `src/sanity/structure.ts`: the check asserts only that each title starts with `Posts` and contains its language word, so the separator is deliberately free.

## Inherited invariants for Phase 3

Two things this phase hands forward, both of which the Farsi list makes load-bearing:

1. **Farsi documents must never carry a scheduled status.** The Farsi list is filtered on language alone, so a scheduled Farsi document would be visible and editable there while remaining outside every public read path; nothing in the Studio would signal the mismatch. The Phase 3 pipeline is the only writer of Farsi documents and must stamp a status the public queries understand.
2. **The filter must reach production before the first Farsi document exists.** The split lives in Studio config, which ships with the Next.js build. Until `src/sanity/structure.ts` is deployed and the production build regenerated, the production Studio still renders the single unfiltered post list, and the first Farsi document created against the production dataset would appear inside it, mixed in with the English posts, with no way for an editor to tell the two populations apart. Deploy the split first, then run the pipeline.

## Phase close

Roadmap Phase 2 success criterion 4 is fully satisfied: the three schema fields exist (plan 02-03) and the Studio lists English and Farsi documents as distinct language-filtered lists (this plan). **CONTENT-01 is complete**, CONTENT-02 remains complete and is now enforced by a closed allowlist. The validation contract is filled and signed off with one manual row carried forward.

Pre-existing working-tree drift (`.planning/config.json`, `package-lock.json`, `.planning/ROADMAP.md`) was left untouched and unstaged. No `.env` file was read into a commit or modified.

## Self-Check: PASSED

- `src/sanity/structure.ts` — FOUND (modified, committed in `5283b23`)
- `scripts/checks/language-filter.check.ts` — FOUND (modified, committed in `1ed846a`)
- `.planning/phases/02-content-model/02-VALIDATION.md` — FOUND (modified, committed in `1ed846a`)
- `.planning/phases/02-content-model/02-05-SUMMARY.md` — FOUND
- commit `5283b23` — FOUND in `git log`
- commit `1ed846a` — FOUND in `git log`
