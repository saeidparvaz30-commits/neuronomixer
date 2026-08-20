---
phase: 02-content-model
plan: 03
subsystem: sanity-schema
tags: [sanity, schema, content-model, translation, write-path, verification]

# Dependency graph
requires:
  - phase: 02-content-model
    provides: "Plan 02-02's `EN_LANGUAGE` predicate at 12 read positions and `scripts/checks/language-filter.check.ts`, which this plan extends and re-runs as its regression gate."
provides:
  - "`language` on `postType`: string, en/fa radio list, `initialValue: \"en\"` (roadmap criterion 4)."
  - "`translationOf` on `postType`: reference to `post`, resolver-form `options.filter` offering English posts only and excluding the current document in both its published and draft form, `options.disableNew` true (D-07)."
  - "`translationNotes` on `postType`: text, `rows: 6`, `readOnly: true` (D-08)."
  - "A Studio preview that names a Farsi document's English source in the subtitle while leaving the English subtitle byte-identical (D-06)."
  - "`language: \"en\"` stamped by both post-creating API routes, so a post that never opens a Studio form still lands classified (D-04)."
  - "Schema-shape and write-path assertions in the check script, including a 17-field tripwire."
affects: [02-04 migration, 02-05 studio split, 03-translation-pipeline, 04-fa-chrome]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Resolver form of `options.filter` on a reference field: the predicate needs the current document id, so the resolver returns both the filter string and its params (`filterParams` is typed `never` in this form)."
    - "Preview `prepare` destructures its selection explicitly instead of spreading it, so `select` keys that exist only to compute the subtitle never leak into the returned preview object."
    - "Field-count tripwire in the check script: a schema addition that skips the check fails loudly at the check rather than drifting silently."
    - "Studio chrome is a separate surface from the public read path. CONTENT-02's single-source rule governs reads; the Studio's own predicates are an explicit, commented allowlist."

key-files:
  created: []
  modified:
    - src/sanity/schemaTypes/postType.ts
    - src/app/api/v1/posts/route.ts
    - src/app/api/dashboard/author/submit-post/route.ts
    - scripts/checks/language-filter.check.ts

key-decisions:
  - "Assertion H's allowlist gained `src/sanity/schemaTypes/postType.ts` rather than the D-07 resolver being rewritten to avoid the `language ==` text. The picker resolver constrains an editor's search, never a public read, so it is the same class of deliberate duplication that plan 02-05's `structure.ts` will be."
  - "The schema block's field count is asserted at 17 as a deliberate tripwire, not as incidental strictness."
  - "The `language === \"fa\" && sourceTitle` guard is what keeps the English preview byte-identical. A truthiness check on `sourceTitle` alone would have changed the English subtitle the moment an English post was ever referenced."
  - "Both new negative tests were run: removing the field trips the count tripwire, renaming it trips the field-named assertion. Both layers are kept because they fail at different distances from the mistake."

requirements-completed: [CONTENT-01]

coverage:
  - id: D1
    description: "`postType` carries `language`, `translationOf` and `translationNotes` with the shapes required by roadmap criterion 4 and decisions D-07 and D-08, taking the field count from 14 to 17."
    requirement: "CONTENT-01"
    verification:
      - kind: unit
        ref: "scripts/checks/language-filter.check.ts#section I (field count 17, language string/initialValue en/list en+fa, translationOf reference with disableNew true and function-valued filter, translationNotes text readOnly true)"
        status: pass
      - kind: other
        ref: "npx tsx -e '<import postType, assert 17 fields and the three names>' => FIELDS(17) ... postType field set OK"
        status: pass
      - kind: other
        ref: "negative test: translationNotes deleted => exit 1 on the count tripwire; translationNotes renamed => exit 1 naming the field"
        status: pass
    human_judgment: false
  - id: D2
    description: "The Studio preview distinguishes a Farsi document by naming its English source, and the English subtitle is byte-identical to today's author line (D-06)."
    requirement: "CONTENT-01"
    verification:
      - kind: unit
        ref: "npx tsx -e '<call postType.preview.prepare with an EN and an FA selection>' => EN subtitle 'by Saeid Sheikhi', FA subtitle 'fa of: English Source'"
        status: pass
      - kind: other
        ref: "git diff src/sanity/schemaTypes/postType.ts => 53 insertions, 3 deletions, the only removal being the replaced prepare body"
        status: pass
    human_judgment: false
  - id: D3
    description: "Both post-creating API routes stamp `language: \"en\"` at creation time, so a post created by `client.create` (which never runs `initialValue`) still lands classified (D-04)."
    requirement: "CONTENT-01"
    verification:
      - kind: unit
        ref: "scripts/checks/language-filter.check.ts#section J (exactly one stamp in each of the two writer files)"
        status: pass
      - kind: other
        ref: "node -e '<assert one language stamp per writer and that `doc as any` survives>' => both post writers stamp language once, cast preserved"
        status: pass
    human_judgment: false
  - id: D4
    description: "No D-02 surface was modified and neither writer gained a read filter."
    requirement: "CONTENT-01"
    verification:
      - kind: other
        ref: "node -e '<git diff --name-only, reject src/app/api/cron/ and src/app/(en)/dashboard/>' => no D-02 surface modified"
        status: pass
      - kind: other
        ref: "node -e '<count `language ==` in both writers>' => 0 and 0"
        status: pass
    human_judgment: false
  - id: D5
    description: "The filter is still inert after the schema change: all nine queries return identical result sets with and without the language clause, at row counts unchanged from plan 02-02."
    verification:
      - kind: integration
        ref: "npx tsx --env-file .env.local scripts/checks/language-filter.check.ts --live => 9/9 identical on blog_posts_dev, rows 15/9/1/11/1/15/17/17/17"
        status: pass
    human_judgment: false
  - id: D6
    description: "The English site is unchanged: green typecheck, green build, green lint on every touched file."
    verification:
      - kind: other
        ref: "npx tsc --noEmit"
        status: pass
      - kind: e2e
        ref: "npx next build"
        status: pass
      - kind: other
        ref: "npx eslint on the four touched files"
        status: pass
    human_judgment: false
  - id: D7
    description: "Phase 3 inherits the invariant that Farsi documents must never carry `status: \"scheduled\"`, because the publish-scheduled cron is unfiltered by D-02 and mails every subscriber on publish."
    verification: []
    human_judgment: true
    rationale: "Nothing in this phase can assert it. The constraint binds a phase that has not been planned yet, and the schema deliberately does not forbid the combination. A human must carry it into Phase 3's plan."

# Metrics
duration: 6 min
completed: 2026-08-20
status: complete
---

# Phase 2 Plan 3: Schema Fields Summary

**`postType` now models a Farsi post as a sibling document linked to its English source through three additive fields, both post-creating API routes stamp `language: "en"` at creation time, and the check script asserts all of it mechanically without touching a single English behaviour.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-08-20T20:10Z
- **Completed:** 2026-08-20T20:17Z
- **Tasks:** 3
- **Files modified:** 4 (0 created, 4 modified)

## Accomplishments

- Appended `language`, `translationOf` and `translationNotes` to `postType` as a clean tail addition, each copying an in-file precedent: `status` for the list plus radio plus initialValue combination, `category` for the array form of a reference target, `submittedBy` for `readOnly`, and `description` for the text plus rows pairing.
- Wired D-07 into the `translationOf` picker with the resolver form of `options.filter`, so the picker offers English posts only and excludes the current document in both its published and its draft form, plus `disableNew` so no new post can be minted from inside the picker.
- Extended the shared preview for D-06 and replaced the `{ ...selection }` spread with an explicit destructure, so the two new `select` keys compute the subtitle without leaking into the returned preview object.
- Stamped `language: "en"` in both post writers next to their existing `status` property, closing the write-path half of D-04.
- Added a schema-shape block and a write-path block to `scripts/checks/language-filter.check.ts`, both inside the offline section, so they need no env and no network.
- Re-proved the filter is inert after the schema change: 9/9 queries identical on `blog_posts_dev`, at row counts byte-matching plan 02-02's recorded run.
- Held the English site steady: `npx tsc --noEmit` 0, `npx next build` 0, `npx eslint` clean on all four touched files. `npm run build` was never invoked.

## Recorded outputs (required by the plan)

### The resulting field list and its count

```
FIELDS(17): title,slug,category,order,featured,heroOrder,author,mainImage,description,
metaDescription,status,submittedBy,publishedAt,body,language,translationOf,translationNotes
```

14 before, 3 appended, 17 after. The three additions are the tail of the array, so the diff is purely additive apart from the preview replacement.

| Field | Type | Shape |
|---|---|---|
| `language` | `string` | `options.list` = English/`en` and Farsi/`fa`, `options.layout: "radio"`, `initialValue: "en"` |
| `translationOf` | `reference` | `to: [{ type: "post" }]`, `options.filter` resolver (English only, self excluded in both published and draft form), `options.disableNew: true` |
| `translationNotes` | `text` | `rows: 6`, `readOnly: true` |

No existing field's name, type, options, validation or order changed. `git diff` on the schema shows 53 insertions and 3 deletions, and the only three deleted lines are the replaced `prepare` body.

### The exact English and Farsi preview subtitle forms

Run verbatim against `postType.preview.prepare`:

```
EN: {"title":"T","subtitle":"by Saeid Sheikhi"}
FA: {"title":"T","subtitle":"fa of: English Source"}
```

The English subtitle is byte-identical to today's `by ${author}`. The Farsi branch is the only new user-visible string in the Studio's English editing experience, and it is reachable only when `language === "fa"` AND the reference resolves to a title.

### The two stamped writer locations

| File | Where | Neighbour |
|---|---|---|
| `src/app/api/v1/posts/route.ts` | inside the object literal passed straight to `client.create` | directly after `status: "pending"` |
| `src/app/api/dashboard/author/submit-post/route.ts` | inside the `const doc: Record<string, unknown>` literal | directly after `status: action === "draft" ? "draft" : "pending"` |

One line each. The `as any` cast at the dashboard route's `client.create` and its eslint-disable comment are untouched, as is the `[submit-post]` try/catch. Neither file gained a read filter: the `language ==` count in both is 0.

**Recorded for the record, per the plan.** The two writers have deliberately divergent error handling. `api/v1/posts` lets `client.create` throw; `submit-post` wraps it, logs with a `[submit-post]` prefix and returns a 500. Neither changed here, and adding a property to a created document cannot introduce a new failure mode in either.

### The demonstrated schema-block failure messages

Both negative tests were run and both were reverted, with `git status --porcelain` on the schema confirmed empty afterwards.

**1. `translationNotes` block deleted.** Exit code 1. The count tripwire fires first, which is the intended ordering: it names the drift before any field-specific assertion runs.

```
AssertionError [ERR_ASSERTION]: src/sanity/schemaTypes/postType.ts has 16 fields, expected 17.
If a field was added on purpose, update this count and say why in the plan.
  found: title, slug, category, order, featured, heroOrder, author, mainImage, description,
  metaDescription, status, submittedBy, publishedAt, body, language, translationOf
```

**2. `translationNotes` renamed, so the count stays 17.** Exit code 1, and this is the message that names the field directly.

```
AssertionError [ERR_ASSERTION]: postType must define the `translationNotes` field
```

Both layers are kept. The count tripwire catches a field vanishing; the field-named assertion catches a field being renamed or retyped underneath a stable count.

### Live run after the schema change

```
live: projectId=pz9ppas8 dataset=blog_posts_dev apiVersion=2025-10-07 posts=17
```

| Query | Parity | Rows | Rows in 02-02 |
|---|---|---|---|
| `blogIndexQuery` | identical | 15 | 15 |
| `homePageQuery` | identical | 9 | 9 |
| `postBySlugQuery` | identical | 1 | 1 |
| `postStaticParamsQuery` | identical | 11 | 11 |
| `postMetadataBySlugQuery` | identical | 1 | 1 |
| `postsByAuthorSlugQuery` | identical | 15 | 15 |
| `sitemapQuery` | identical | 17 | 17 |
| `postsByAuthorIdQuery` | identical | 17 | 17 |
| `authorReviewPostsQuery` | identical | 17 | 17 |

Every count matches plan 02-02 exactly. Slug uniqueness re-proven: 17 distinct slugs, at most 1 English match each, 0 with zero English matches.

## HANDOFF TO PHASE 3: Farsi documents must never be scheduled

**`src/app/api/cron/publish-scheduled/route.ts` finds every post with `status == "scheduled"` and `publishedAt <= $now`, patches it to `approved`, and calls `notifyAllUsers(...)` with an English subject line.**

It is deliberately unfiltered by D-02 and was not touched by this phase. Adding a language filter to it is forbidden, so the constraint has to be carried by the pipeline instead:

> **Phase 3 invariant: a Farsi document must never carry `status: "scheduled"`.**

If one ever does, the cron will publish it and mail the entire subscriber list about a Farsi article in English. The approved design already lands Farsi documents as drafts, so this is a constraint to preserve rather than a bug to fix, but nothing in the schema enforces it. `status` has no validation and the two fields are independent, on purpose. Phase 3's planner owns this.

Threat `T-02-13` is dispositioned `accept` on exactly this basis.

## Task Commits

1. **Task 1: Add the three schema fields and extend the preview for language pairs** - `45e2492` (feat)
2. **Task 2: Stamp language en in both post-creating API routes** - `a9f8011` (feat)
3. **Task 3: Add the schema-shape section to the check script and run the plan gate** - `4cabe5b` (test)

## Files Created/Modified

- `src/sanity/schemaTypes/postType.ts` - Three appended fields and a replaced `prepare`. 53 insertions, 3 deletions.
- `src/app/api/v1/posts/route.ts` - One line: `language: "en"` in the `client.create` literal. The GET read query, finished in plans 02-01 and 02-02, is untouched.
- `src/app/api/dashboard/author/submit-post/route.ts` - One line: `language: "en"` in the `doc` literal. No read filter, per D-02.
- `scripts/checks/language-filter.check.ts` - Two new offline blocks (section I schema shape, section J write-path stamps), one new import, and the assertion H allowlist extended by one entry. 89 insertions, 4 deletions.

`git diff --name-only 24d9aec..HEAD` lists exactly those four files.

## Decisions Made

- **Assertion H's allowlist gained `postType.ts` instead of the D-07 resolver being reworded.** The resolver's filter string necessarily contains `language == "en"`, which made it the second carrier of that text under `src/`. Rewording the GROQ to dodge a text-matching check would have been a semantic change made for a lint reason. The honest fix is to say what the exception is: CONTENT-02 governs the public read predicate, and the picker resolver is Studio chrome that constrains an editor's search, never a public read. The comment now names both permitted Studio carriers, the second being plan 02-05's `structure.ts`.
- **The field count is asserted as a deliberate tripwire, with the reason in a comment.** A future phase adding a field will fail this check. That failure is the feature: it points at the check, which points at the plan, instead of letting the model drift silently.
- **The Farsi preview branch is guarded on `language === "fa"` first.** Guarding on `sourceTitle` alone would have been enough to make the Farsi case work and would have silently changed the English subtitle the first time an English post was referenced by anything.
- **Two negative tests rather than one.** Deleting a field and renaming a field fail at different assertions and at different distances from the mistake, so both were demonstrated.
- **The stamp sits next to `status` in both writers, not at the end of the literal.** The two document-classification fields read as a pair, which is the point of the placement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Assertion H from plan 02-02 failed once the D-07 resolver landed**

- **Found during:** Task 3, on the first offline run of the extended check script.
- **Issue:** The `translationOf` picker resolver contains the GROQ string `(!defined(language) || language == "en")`, which made `src/sanity/schemaTypes/postType.ts` a second file under `src/` carrying the text `language ==`. Plan 02-02's assertion H asserts exactly one carrier, so the offline check exited 1 with `found: src/sanity/lib/queries.ts, src/sanity/schemaTypes/postType.ts`. The plan did not anticipate this interaction: it specified the resolver body verbatim from research and separately required the offline check to pass, and those two requirements collided.
- **Fix:** Extended `ALLOWED_LANGUAGE_TEXT_FILES` from one entry to two and rewrote the comment above it to state the rule rather than just the exception: CONTENT-02 governs the public read predicate, and Studio chrome is a separate surface whose duplication is deliberate. The comment names both Studio carriers, the second being `src/sanity/structure.ts` when plan 02-05 lands. Plan 02-02 explicitly designed this assertion "to be extended, not rewritten", and research had already recorded the same reasoning for `structure.ts` ("these are Studio chrome, not a read path, so the duplication is intentional and does not violate CONTENT-02").
- **Rejected alternative:** rewording the resolver's GROQ to avoid the literal text. That would have changed a semantic construct to satisfy a text-matching check, which is the wrong direction.
- **Files modified:** `scripts/checks/language-filter.check.ts`
- **Verification:** offline check `ALL PASS`, live check `ALL PASS`, and the sole-carrier line now reads `sole carrier src/sanity/lib/queries.ts, src/sanity/schemaTypes/postType.ts`.
- **Commit:** `4cabe5b`

**Total deviations:** 1 auto-fixed (1 blocker, 0 bugs, 0 missing-critical).
**Impact on plan:** None to scope or intent. Every acceptance criterion across the three tasks was executed and passed, and the deviation strengthened an existing assertion's documentation rather than weakening the assertion.

## Issues Encountered

**Pre-existing `package-lock.json` working-tree modification, out of scope (carried from plans 02-01 and 02-02).**

Task 3's acceptance criteria require `git status --porcelain package.json package-lock.json` to print nothing. It still prints ` M package-lock.json`, the same uncommitted drift plans 02-01 and 02-02 documented, adjacent to the OPEN `npm ci` blocker in STATE.md. The execution brief for this plan explicitly instructed that this drift is not ours to touch.

The criterion's actual intent, hard constraint 2 and threat `T-02-SC`, was proven the same stronger way both earlier plans used: blob hashes recorded before the build gate and re-checked after the last commit.

- `package.json`: `eec21ab56725456a997f7c0692ddc7e950fe33bd`, identical to the 02-01 and 02-02 recorded value.
- `package-lock.json`: `57c2a533cd3a8a59290c4cdee00c82466035e729`, identical to the 02-01 and 02-02 recorded value.

Both match the recorded baseline exactly before and after `npx next build`, which proves this plan neither added to the drift nor altered it. No package-manager install command was run and no dependency was added.

**Carried forward, not blocking:**

- The `package-lock.json` / `npm ci` blocker in STATE.md is unchanged and still needs repair before deploy.
- The `sitemapQuery` missing status filter is still a pre-existing SEO bug, still out of scope, still needing a separate quick task.
- Route smoke was not re-run. The plan does not require it: no route file changed beyond a create-time property in two API handlers, and the build gate plus the live parity run cover the read surfaces.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 02-04 (the migration) is unblocked. The phase's strict internal order is now at step (3) complete:

- The three fields exist, so the migration has somewhere to write. `setIfMissing({ language: "en" })` is now a valid patch against a modelled field.
- The check script's `--post-migration` branch is still reserved and still the natural home for 02-04's `count(*[_type == "post" && !defined(language)]) == 0` assertion.
- Plan 02-05's Studio split has both things it needs to filter on: the `language` field itself, and an assertion H allowlist that already names `src/sanity/structure.ts` as its third permitted carrier, so 02-05 extends one array entry rather than rewriting the assertion.
- The English baseline is green (tsc 0, build 0, lint 0, live parity 9/9 at unchanged row counts), so any regression in 02-04 or 02-05 is attributable to that plan alone.

Two obligations leave this plan: the deploy-level ordering invariant recorded in 02-02's summary, which is Saeid's to discharge, and the Phase 3 scheduled-status invariant recorded above, which is the Phase 3 planner's to inherit.

## Self-Check: PASSED

- `src/sanity/schemaTypes/postType.ts`, `src/app/api/v1/posts/route.ts`, `src/app/api/dashboard/author/submit-post/route.ts` and `scripts/checks/language-filter.check.ts` all exist on disk. Confirmed.
- Commits `45e2492`, `a9f8011` and `4cabe5b` exist in `git log`. Confirmed.
- `git diff --name-only 24d9aec..HEAD` lists exactly the four files above. Confirmed.
- All acceptance criteria across the three tasks executed and passing, with the single documented exception of the pre-existing `package-lock.json` working-tree modification, proven byte-unchanged by this plan via blob hash.
- Plan-level verification 1 through 6 re-run: tsc 0, offline check `ALL PASS` with no env file, live check `ALL PASS` naming `blog_posts_dev` at 02-02's row counts, `npx next build` 0, `postType.fields` 17 with the three shapes asserted, both writers stamping once with no D-02 surface touched.
- `npm run build` was never invoked. No package-manager install command was run. No dependency was added.

---
*Phase: 02-content-model*
*Completed: 2026-08-20*
