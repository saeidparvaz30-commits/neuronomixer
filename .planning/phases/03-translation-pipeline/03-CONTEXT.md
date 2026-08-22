# Phase 3: Translation Pipeline - Context

**Gathered:** 2026-08-22
**Status:** Ready for planning

<domain>
## Phase Boundary

A repeatable `scripts/translate-posts.ts` (run via `npx tsx`) translates approved English posts into structurally intact Farsi drafts in Sanity: block-by-block Portable Text walk (only `span.text` translated), Claude Sonnet 5 via the Batch API for both the translate and verify passes, `content/fa-glossary.json` prompt-cached in the system prompt, verify findings written to `translationNotes`, output always a DRAFT with `language: "fa"` and `translationOf` set, token spend recorded through the existing `TokenUsage` model. The first-ever run is a dry-run against the dev dataset. The phase also front-loads the deploy gate: package-lock repair, push, and prod deploy of the Phase-2 filter happen before the first Farsi doc reaches the production dataset.

Out of scope: Farsi routes/chrome (Phase 4), hreflang/sitemap/publishing (Phase 5), the 151 visual guides (milestone-wide exclusion), Farsi-native original content.

</domain>

<decisions>
## Implementation Decisions

### Glossary seed and correction loop
- **D-01:** First-pass glossary is LEAN: ~60-100 high-frequency terms mined from the 26 production posts. It grows organically as the verify pass flags drift; no up-front comprehensive sweep.
- **D-02:** Entry shape: English term + chosen Farsi rendering + strategy tag (`translate` / `transliterate` / `keep-english`). Farsi tech prose routinely keeps terms like "transformer" or "API" in Latin script; the tag makes that explicit and checkable by the verify pass.
- **D-03:** Review loop: Simorgh writes `content/fa-glossary.json` PLUS a sibling HTML review table (term, rendering, strategy, corpus frequency, example sentence from Saeid's posts). Saeid marks corrections; Simorgh applies them back to the JSON. (Matches his spec-HTML-companion preference.)
- **D-04:** Standing instruction for terms NOT in the glossary: follow common Farsi tech-press usage, keeping English in Latin script where that is the norm. The verify pass flags "untranslated leftovers" only where a term reads as accidental, not where Latin script is idiomatic.

### Verify findings and draft gating
- **D-05:** Two-tier gating. Structural integrity (`_key`, `_type`, `marks`, `markDefs`, code-block content, link hrefs unchanged) is validated by CODE in the script itself; a structural failure blocks draft creation for that post and reports loudly. The Claude verify pass covers prose-level drift (numbers, dates, URLs, entity/product names, glossary adherence, untranslated leftovers) and its findings land as notes on a created draft — they never block.
- **D-06:** `translationNotes` format: compact human-readable English summary, one line per finding with location context (e.g. "Number drift: 42% became ۴۲ درصد — check para 3"). A clean verify pass writes an explicit "Verify pass clean (date)" line so an empty field is never ambiguous.
- **D-07:** Translated fields: Portable Text body + title + excerpt/description + any SEO/meta text fields on the post schema. Slug (reused verbatim per design), categories, author, and images carry over untouched from the English source.

### Re-run and overwrite policy
- **D-08:** Stale siblings (English `_updatedAt` newer than the sibling's recorded translation timestamp) are REPORTED by default but never touched. Retranslation happens only under an explicit `--retranslate` flag. Hand-edited Farsi drafts are never silently clobbered.
- **D-09:** CLI shape: default run = approved English posts with no Farsi sibling; `--slug <x>` targets one post (the phase success gate uses this); `--all` sweeps the backlog; `--dry-run` prints the prepared batch without submitting. Mirror the conventions of the existing `scripts/migrate-post-language.ts`.

### Rollout sequencing and gates
- **D-10:** The mandatory first dry-run/rehearsal writes to the EXISTING dev dataset (`blog_posts_dev`, 17 posts, already language-stamped, wired via `.env.local`). No new scratch dataset (Sanity plan dataset cap; Studio/env already wired).
- **D-11:** Deploy gate folded in as WAVE 0 of this phase: (1) Simorgh repairs `package-lock.json` until `npm ci` is green, (2) Saeid gates push of main (~56 commits ahead) + prod deploy in-session, (3) only after the Phase-2 EN filter is live on prod and the prod build regenerated does the pipeline touch the production dataset. Phase ends proven end-to-end against prod (one real post translated, per success criteria).
- **D-12 (carried from Phase 2 handoff, hard rule):** Farsi documents must NEVER carry `status: "scheduled"` — the unfiltered publish-scheduled cron would auto-approve and email subscribers in English. The pipeline must enforce this (drafts carry a safe status or none).

### Post-research decisions (Saeid, 2026-08-22 — resolve RESEARCH.md open questions)
- **D-13:** The walker translates a code-enumerated list of extra translatable string paths beyond `span.text`: table block `cells[]`, image `alt` (body images and `mainImage`), and video `caption`. Still index-keyed, still under the structural fingerprint gate. (Corpus ground truth: 10 English tables, 61 image alts, 2 video captions, zero code blocks.)
- **D-14:** CLI default is DRY-RUN; writes require `--execute` (mirrors `migrate-post-language.ts`). `--dry-run` kept as a readability alias. This supersedes the D-09 wording that implied writes by default.
- **D-15:** Farsi drafts OMIT `featured` / `heroOrder` entirely — Farsi hero/featured curation is a Phase 4 decision; no accidental homepage placement.

### Claude's Discretion
- Batch chunking (whole backlog in one Batch API job vs chunks), polling cadence, and partial-failure resume strategy.
- TokenUsage recording mechanics (which DB the script writes to and how it loads env — note `.env` = prod DB, `.env.local` = dev; follow existing script conventions).
- Exact glossary JSON schema and system-prompt injection format (prompt-cache-friendly).
- Verify-pass JSON schema (`output_config.format`) design.
- How the "recorded translation timestamp" for staleness is stored (field on the Farsi doc vs comparing `_updatedAt`s).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design spec (milestone-level)
- `C:\Users\saeid\Desktop\Agent Simorgh\projects\2. NeuroNomixer\farsi edition\2026-08-11-farsi-edition-design.md` §3 "Translation pipeline" — approved pipeline design: 6 steps (select, PT walk, Batch API, glossary, verify pass, draft write), model choice, cost model, ongoing weekly integration. (Outside this repo; absolute path intentional.)

### In-repo planning
- `.planning/ROADMAP.md` — Phase 3 goal, 5 success criteria, fixed implementation notes (claude-sonnet-5, Batch API, custom_id keying).
- `.planning/phases/02-content-model/02-CONTEXT.md` — content-model decisions this pipeline writes against (tolerant filter, sibling docs, Studio split, D-02 cron deliberately unfiltered — the root of D-12 here).
- `.planning/phases/02-content-model/02-05-SUMMARY.md` and `02-04-SUMMARY.md` — Studio split + migration facts (script conventions, dataset names, token scopes).
- `.planning/STATE.md` — standing blockers: NEVER `npm run build` locally (chains prisma migrate deploy against prod DB; gate is `npx next build`); lint gate ON; tsc 0 at every gate; package-lock broken at HEAD (repaired in this phase's wave 0 per D-11).

### Content rules (apply to Farsi output)
- Memory `pref-nnx-guide-geo-references` — no USA/America/Israel references (carries over to translations; English sources are already clean).
- The no-em-dashes rule is English-specific and does NOT apply to Farsi output (per design spec §3).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/migrate-post-language.ts` — the Phase-2 migration script: Sanity client + token wiring, dry-run-default/--execute convention, dataset targeting. The pipeline CLI mirrors these conventions (D-09).
- `scripts/checks/language-filter.check.ts` — check-script pattern for offline + live assertions; a structural-integrity check script for translations can follow it.
- `src/sanity/lib/queries.ts` — Phase-2 query module with `EN_LANGUAGE` filter fragment and status constants; the pipeline's select query (approved English, no sibling) belongs beside these.
- `@anthropic-ai/sdk` already in package.json — no new dependency for the Batch API.
- `TokenUsage` Prisma model — existing spend-recording target (note: exists in prod DB; dev DB parity to verify during planning).

### Established Patterns
- No test framework by design: verification = `npx tsx` check scripts + browser/Studio smoke.
- `.env` targets the PROD DB / prod Sanity dataset; `.env.local` overrides to dev. Scripts choose their target by which env file they load — the pipeline must make its target dataset explicit and loud.
- Sanity writes go through the token-scoped client established in Phase 2 (write scope proven during migration).

### Integration Points
- Sanity `post` documents: reads English sources (approved only), writes Farsi sibling DRAFTS (`language: "fa"`, `translationOf`, `translationNotes`).
- Studio "Posts — Farsi" list (Phase 2 split) — where Saeid reviews drafts; `translationNotes` renders in the read-only field there.
- Weekly `neuronomixer-batch-post-builder` pipeline — gains a translation step after posts reach `approved` (documented handoff, not code in this repo).

</code_context>

<specifics>
## Specific Ideas

- Glossary review artifact is a readable HTML table with corpus frequency and a real example sentence per term — Saeid corrects from evidence, not from memory.
- translationNotes must be scannable in Studio at a glance: one English line per finding, explicit "clean" line when there are no findings.
- The structural check is code, not Claude: the script diffs everything except `span.text` between source and translation and refuses to write on any mismatch (D-05).

</specifics>

<deferred>
## Deferred Ideas

- Extending the dashboard admin UI with translation-status columns (which posts have siblings, which are stale) — revisit in Phase 4/5 if draft management gets noisy.
- Automatic weekly-pipeline invocation of the translation step (the batch-post-builder skill change) — documented as an integration handoff; wiring it happens after this phase proves the script.
- `/cv/[slug]` unguarded `generateStaticParams` build query — pre-existing, separate quick task (carried from Phase 2).

</deferred>

---

*Phase: 3-Translation Pipeline*
*Context gathered: 2026-08-22*
