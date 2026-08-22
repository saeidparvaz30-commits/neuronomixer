# Phase 3: Translation Pipeline - Research

**Researched:** 2026-08-22
**Domain:** Node CLI script (npx tsx) driving Claude Sonnet 5 Batch API translation of Sanity Portable Text, writing Farsi draft documents; plus an npm lockfile repair
**Confidence:** HIGH

## Summary

Every mechanism this phase needs already exists in the repo and is verified working. `@anthropic-ai/sdk@0.80.0` (installed, not just declared) exposes `messages.batches.create/retrieve/results/cancel`, and its `BatchCreateParams.Request.params` is typed `MessageCreateParamsNonStreaming`, which carries both `output_config` (structured outputs) and `cache_control` (prompt caching). No SDK bump is required for anything this phase does. `claude-sonnet-5` is a real model id (1M context, $3/$15 per MTok, halved by Batch API, currently on a $2/$10 intro rate through 2026-08-31), but it is newer than this SDK's `Model` union, so it lands in the `(string & {})` escape hatch and type-checks without error. Two Sonnet 5 breaking changes matter here and would each return HTTP 400 if carried over from the repo's existing Claude call sites: `temperature`/`top_p`/`top_k` are removed, and assistant prefill is removed.

The Sanity side is equally settled. `scripts/migrate-post-language.ts` is the exact template the CLI must mirror: explicit dataset from env with no fallback, a loud `projectId/dataset/mode` header line printed before any read or write, dry-run as the default with no flag that turns it on, and `perspective: "raw"` so drafts are visible. That last point is load-bearing and easy to get wrong: this repo runs `apiVersion 2025-10-07`, and `@sanity/client@7.26.2` defaults to the `published` perspective at any apiVersion at or after `2025-02-19`. A default-perspective client cannot see `drafts.*` documents at all, so sibling detection silently returns "no sibling exists" forever unless the pipeline client sets `raw`. The same fact is a free second layer of defence for D-12: `src/app/api/cron/publish-scheduled/route.ts` uses `@/sanity/lib/client`, which sets no perspective, so the cron cannot see a Farsi draft even if it somehow carried `status: "scheduled"`.

Two findings change the shape of the plan. First, the corpus contains **no code blocks at all**: I enumerated all 26 production posts and all 17 dev posts and found block types `block`, `image`, `video`, `table` only, zero `code` decorator marks, and zero triple-backtick fences. The "code blocks pass through untouched" success criterion is satisfied vacuously today and should be verified as a walker property (unknown `_type` passes through verbatim) rather than hunted for in data. Second, and more consequential: production carries **10 `table` blocks whose `rows[].cells[]` are plain strings**, plus **61 image `alt` strings and 7 `mainImage.alt` strings**, all of them reader-visible English prose that lives outside `span.text`. A strict reading of the success criterion ("only `span.text` translated") ships Farsi posts containing untranslated English comparison tables and alt text. This is the single genuine open decision in the phase and it needs Saeid, not Claude's discretion.

**Primary recommendation:** Write `scripts/translate-posts.ts` as a direct structural sibling of `scripts/migrate-post-language.ts` (raw perspective, explicit dataset, dry-run default, loud header), translate per post with one Batch API request per post keyed by `custom_id = <slug>:translate` / `<slug>:verify`, ship the glossary as a single cached system block, gate draft creation on a pure-code structural diff, and resolve the tables and alt-text question with Saeid before planning task boundaries.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Post selection (approved EN, no Farsi sibling) | Sanity Content Lake (GROQ) | Node CLI | The sibling test is a `count()` subquery; doing it in GROQ avoids fetching all bodies to filter client-side |
| Portable Text walk and reassembly | Node CLI (pure functions) | none | Deterministic, testable offline, must never depend on a model |
| Translation and verify passes | Anthropic Batch API | none | Not latency-sensitive, 50 percent cost, `custom_id` keying |
| Structural integrity gate | Node CLI (pure code) | none | D-05: code decides whether a draft may be written; the model never gates itself |
| Prose drift findings | Anthropic (structured output) | Node CLI (formatting) | Model detects, code formats into the compact `translationNotes` lines |
| Farsi draft persistence | Sanity Content Lake (`drafts.` id) | none | Draft is the review surface; Studio "Posts - Farsi" list reads it |
| Token spend recording | Prisma / Postgres (`TokenUsage`) | none | Existing model, existing admin dashboard reads it |
| Glossary storage | Repo file `content/fa-glossary.json` | none | Version-controlled, diffable, cache-prefix stable |
| Lockfile repair | npm CLI | none | Wave 0, no runtime tier involved |

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Glossary seed and correction loop**
- **D-01:** First-pass glossary is LEAN: ~60-100 high-frequency terms mined from the 26 production posts. It grows organically as the verify pass flags drift; no up-front comprehensive sweep.
- **D-02:** Entry shape: English term + chosen Farsi rendering + strategy tag (`translate` / `transliterate` / `keep-english`). Farsi tech prose routinely keeps terms like "transformer" or "API" in Latin script; the tag makes that explicit and checkable by the verify pass.
- **D-03:** Review loop: Simorgh writes `content/fa-glossary.json` PLUS a sibling HTML review table (term, rendering, strategy, corpus frequency, example sentence from Saeid's posts). Saeid marks corrections; Simorgh applies them back to the JSON. (Matches his spec-HTML-companion preference.)
- **D-04:** Standing instruction for terms NOT in the glossary: follow common Farsi tech-press usage, keeping English in Latin script where that is the norm. The verify pass flags "untranslated leftovers" only where a term reads as accidental, not where Latin script is idiomatic.

**Verify findings and draft gating**
- **D-05:** Two-tier gating. Structural integrity (`_key`, `_type`, `marks`, `markDefs`, code-block content, link hrefs unchanged) is validated by CODE in the script itself; a structural failure blocks draft creation for that post and reports loudly. The Claude verify pass covers prose-level drift (numbers, dates, URLs, entity/product names, glossary adherence, untranslated leftovers) and its findings land as notes on a created draft, they never block.
- **D-06:** `translationNotes` format: compact human-readable English summary, one line per finding with location context (e.g. "Number drift: 42% became ۴۲ درصد, check para 3"). A clean verify pass writes an explicit "Verify pass clean (date)" line so an empty field is never ambiguous.
- **D-07:** Translated fields: Portable Text body + title + excerpt/description + any SEO/meta text fields on the post schema. Slug (reused verbatim per design), categories, author, and images carry over untouched from the English source.

**Re-run and overwrite policy**
- **D-08:** Stale siblings (English `_updatedAt` newer than the sibling's recorded translation timestamp) are REPORTED by default but never touched. Retranslation happens only under an explicit `--retranslate` flag. Hand-edited Farsi drafts are never silently clobbered.
- **D-09:** CLI shape: default run = approved English posts with no Farsi sibling; `--slug <x>` targets one post (the phase success gate uses this); `--all` sweeps the backlog; `--dry-run` prints the prepared batch without submitting. Mirror the conventions of the existing `scripts/migrate-post-language.ts`.

**Rollout sequencing and gates**
- **D-10:** The mandatory first dry-run/rehearsal writes to the EXISTING dev dataset (`blog_posts_dev`, 17 posts, already language-stamped, wired via `.env.local`). No new scratch dataset (Sanity plan dataset cap; Studio/env already wired).
- **D-11:** Deploy gate folded in as WAVE 0 of this phase: (1) Simorgh repairs `package-lock.json` until `npm ci` is green, (2) Saeid gates push of main (~56 commits ahead) + prod deploy in-session, (3) only after the Phase-2 EN filter is live on prod and the prod build regenerated does the pipeline touch the production dataset. Phase ends proven end-to-end against prod (one real post translated, per success criteria).
- **D-12 (carried from Phase 2 handoff, hard rule):** Farsi documents must NEVER carry `status: "scheduled"`. The unfiltered publish-scheduled cron would auto-approve and email subscribers in English. The pipeline must enforce this (drafts carry a safe status or none).

### Claude's Discretion

- Batch chunking (whole backlog in one Batch API job vs chunks), polling cadence, and partial-failure resume strategy.
- TokenUsage recording mechanics (which DB the script writes to and how it loads env, note `.env` = prod DB, `.env.local` = dev; follow existing script conventions).
- Exact glossary JSON schema and system-prompt injection format (prompt-cache-friendly).
- Verify-pass JSON schema (`output_config.format`) design.
- How the "recorded translation timestamp" for staleness is stored (field on the Farsi doc vs comparing `_updatedAt`s).

### Deferred Ideas (OUT OF SCOPE)

- Extending the dashboard admin UI with translation-status columns (which posts have siblings, which are stale). Revisit in Phase 4/5 if draft management gets noisy.
- Automatic weekly-pipeline invocation of the translation step (the batch-post-builder skill change). Documented as an integration handoff; wiring it happens after this phase proves the script.
- `/cv/[slug]` unguarded `generateStaticParams` build query. Pre-existing, separate quick task (carried from Phase 2).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PIPE-01 | A script translates approved English posts to Farsi drafts, preserving Portable Text structure, links, and code | Standard Stack (SDK surface verified at 0.80.0), Architecture Pattern 1 (span-index walk), Pattern 2 (structural diff gate), Portable Text Ground Truth (real block/span/markDef inventory from all 26 prod posts), Pattern 5 (draft write via `drafts.` id), Pitfalls 1, 2, 4, 7 |
| PIPE-02 | Translation output is checked for drift in numbers, dates, URLs, entity names, and glossary terms before it reaches Saeid | Architecture Pattern 3 (structured-output verify pass, `output_config.format` verified present in `MessageCreateParamsNonStreaming` and therefore in batch request params), Pattern 4 (glossary as cached system block), Code Example 4, Pitfalls 3, 5 |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

There is **no `CLAUDE.md` and no `.claude/skills/` in this repository** (verified: `.claude/` contains only `settings.local.json` and `worktrees/`). The binding constraints therefore come from `.planning/STATE.md` and Saeid's global preferences, and they carry the same authority as locked decisions:

| Constraint | Source | Effect on this phase |
|---|---|---|
| NEVER run `npm run build` locally | STATE.md blocker | It chains `prisma migrate deploy` against the PRODUCTION DB (Prisma CLI reads `.env`). The build gate is `npx next build`, always. |
| `npx tsc --noEmit` must be 0 at every gate | STATE.md | Every task ends with tsc clean. |
| ESLint gate is ON | STATE.md | `npx eslint <changed files>` clean before commit. |
| No test framework by design | 02-05 summary, design spec | Verification is `npx tsx` check scripts plus Studio/browser smoke. Do not add vitest. |
| npm is the authoritative package manager | STATE.md decision 2026-08-16 | No pnpm, no yarn. `pnpm-lock.yaml` was deleted. |
| No em dashes in English prose | global memory `pref-no-em-dashes` | Applies to `translationNotes` lines and any English strings the script emits. Does NOT apply to Farsi output (design spec section 3). |
| No Co-Authored-By / Claude attribution in commits | global memory `pref-no-ai-commit-attribution` | Applies to every commit in this phase. |
| No USA / America / Israel references | memory `pref-nnx-guide-geo-references` | English sources are already clean; the translation must not introduce them. Worth one line in the translate system prompt. |
| GSD workflow enforcement | Simorgh project CLAUDE.md | File edits go through `/gsd-execute-phase`, not ad-hoc. |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | `0.80.0` installed, `^0.80.0` declared | Batch API, structured outputs, prompt caching | Already a direct dependency and already used at two call sites. Every surface this phase needs exists at 0.80.0 (verified below). No bump needed. |
| `@sanity/client` | `7.26.2` installed (`7.24.0` in the working-tree lock) | Read English sources, write Farsi drafts | Already the transitive client behind `next-sanity`; `scripts/migrate-post-language.ts` imports it directly and proved write scope on both datasets |
| `@prisma/client` + `@prisma/adapter-pg` | `^7.5.0` | `TokenUsage` writes | Existing model, existing admin dashboard at `/dashboard/admin/token-usage` reads it |
| `tsx` | `^4.21.0` (devDep) | Script runner | The repo's only script runner; `--env-file` is how every script picks its target |

**No new package is added by this phase.** [VERIFIED: package.json read 2026-08-22]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:assert` | builtin | Check-script assertions | Follow `scripts/checks/language-filter.check.ts` |
| `node:fs` / `node:path` | builtin | Read `content/fa-glossary.json`, write batch artifacts | Glossary load, dry-run artifact dump |
| `nanoid` | `3.3.x` (transitive) | NOT needed | The walker reuses source `_key`s verbatim; it must never mint new ones. Do not import nanoid. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `drafts.<uuid>` id convention via `client.createIfNotExists` | Sanity Actions API (`client.action()`, present at line 3820 of the v7 typings) | The Actions API is the newer surface but nothing in this repo uses it, and the `drafts.` prefix is what the proven Phase 2 client already manipulates. Prefer the proven path. |
| Raw `output_config.format` JSON schema object | `zodOutputFormat()` / `jsonSchemaOutputFormat()` helpers | Both helpers exist in 0.80.0, but their value is auto-parsing on `client.messages.parse()`. Batch results come back through `batches.results()` as plain `Message` objects, so the helper's parsing never fires. Also, `zod` is present in `node_modules` at 4.1.11 but is NOT in `package.json`; importing it would be an undeclared dependency. Use the raw `{ type: "json_schema", schema: {...} }` object. |
| One Batch API request per post | One request per block, or one per N spans | Per-post keeps `custom_id` trivially meaningful and the largest post is only ~183 spans / 32.7k chars of span text, comfortably inside Sonnet 5's 1M context. Per-block explodes request count 100x for no benefit. |
| `perspective: "raw"` | `perspective: "drafts"` | Both see draft documents. `raw` returns draft and published as separate rows (what a sibling count wants) and is the convention already established in `migrate-post-language.ts`. Note `previewDrafts` is **deprecated** in `@sanity/client` v7. |
| `npm install --package-lock-only` | Full `npm install` | `--package-lock-only` rewrites only the lockfile and never touches `node_modules`, which matters because the local tree came from `npm install --no-package-lock`. Verified equivalent outcome below. |

**Installation:**

```bash
# Nothing to install. This phase adds no dependency.
# Wave 0 repairs the lockfile only:
npm install --package-lock-only
npm ci --dry-run --ignore-scripts   # must print "added N packages", not EUSAGE
```

**Version verification (run 2026-08-22):**

```
node -p "require('./node_modules/@anthropic-ai/sdk/package.json').version"   -> 0.80.0
node -p "require('./node_modules/@sanity/client/package.json').version"      -> 7.26.2
npm view @anthropic-ai/sdk version                                           -> 0.120.0 (latest; NOT needed)
```

[VERIFIED: local node_modules inspection + npm registry]

## Package Legitimacy Audit

This phase installs **no new packages**. The Wave 0 lockfile repair changes four already-installed transitive pins. Verdicts from `gsd-tools query package-legitimacy check --ecosystem npm`:

| Package | Registry | Latest publish | Weekly downloads | Source repo | Verdict | Disposition |
|---|---|---|---|---|---|---|
| `@sanity/client` | npm | 2026-08-19 | 2,263,391 | github.com/sanity-io/client | SUS (`too-new`) | KEEP. Already the live production client. |
| `@sanity/eventsource` | npm | 2026-07-15 | 1,301,517 | github.com/sanity-io/eventsource | OK | KEEP |
| `get-it` | npm | 2026-08-19 | 1,763,031 | github.com/sanity-io/get-it | SUS (`too-new`) | KEEP. Sanity's own HTTP layer. |
| `nanoid` | npm | 2026-08-03 | 238,180,340 | github.com/ai/nanoid | SUS (`too-new`) | KEEP |

**Interpretation of the three SUS verdicts:** the `too-new` signal fires on the *most recent release date*, not on package age. All three are long-established, first-party-maintained, repo-backed packages with one to two hundred million weekly downloads that are already installed and already serving production traffic today. None carries a `postinstall` script (`postinstall: null` on all four). They are patch or minor bumps of packages the site already runs, not new dependencies.

**Packages removed due to SLOP verdict:** none.
**Packages flagged SUS:** the three above. Rather than three separate `checkpoint:human-verify` tasks, fold the verification into the **existing** D-11 Wave 0 human gate: Saeid already has to approve the push and prod deploy, and `npx next build` plus `route-smoke --verify` are the meaningful evidence that a `@sanity/client` patch bump did not regress anything. One checkpoint, evidence-backed, not three ceremonial ones.

## Architecture Patterns

### System Architecture Diagram

```
                             .env.local  |  .env.vercel-prod
                                    (chooses dataset + DB)
                                          |
                                          v
   +----------------------------------------------------------------------+
   |  scripts/translate-posts.ts   (npx tsx --env-file <env> ...)          |
   |  flags: --slug <s> | --all | --dry-run | --retranslate | --execute    |
   +----------------------------------------------------------------------+
        |                                                          ^
        | 1. header line: projectId / dataset / mode               |
        |    (printed BEFORE any read or write)                    |
        v                                                          |
   +--------------------------+                                    |
   | SELECT (GROQ)            |   Sanity Content Lake              |
   | perspective: "raw"  <====|=== approved && EN && no fa sibling |
   | count() subquery sees    |                                    |
   | drafts.* Farsi docs      |                                    |
   +--------------------------+                                    |
        |  N source posts (title, description, metaDescription,    |
        |                  body[], _id, _updatedAt, slug)          |
        v                                                          |
   +--------------------------+                                    |
   | EXTRACT (pure code)      |  body[] --> ordered span list      |
   |  walk blocks in order    |  [{i, text}] + a shape fingerprint |
   |  collect span.text only  |                                    |
   +--------------------------+                                    |
        |                                                          |
        |  --dry-run? --> print prepared batch + est. tokens, STOP  |
        v                                                          |
   +--------------------------+       +---------------------------+|
   | BATCH: translate         |------>| Anthropic Batch API       ||
   |  custom_id <slug>:tr     |       |  model claude-sonnet-5    ||
   |  system = [glossary      |       |  poll retrieve() until    ||
   |    block w/ cache_control|       |  processing_status=ended  ||
   |    , task block]         |<------|  results() jsonl stream   ||
   |  output_config.format    |       +---------------------------+|
   +--------------------------+                                    |
        |  {i -> farsi text} keyed by custom_id (ANY order)         |
        v                                                          |
   +--------------------------+                                    |
   | REASSEMBLE (pure code)   |  deep clone source body[],         |
   |  set span.text[i] only   |  touch nothing else                |
   +--------------------------+                                    |
        |                                                          |
        v                                                          |
   +==========================+  <-- D-05 TIER 1: CODE, BLOCKING    |
   | STRUCTURAL DIFF GATE     |      strip every span.text from     |
   |  source vs translated    |      both sides, JSON compare.      |
   |  mismatch => NO WRITE    |      Any diff = refuse this post,   |
   +==========================+      loud report, continue others.  |
        | pass                                                      |
        v                                                           |
   +--------------------------+       +---------------------------+ |
   | BATCH: verify            |------>| Anthropic Batch API       | |
   |  custom_id <slug>:vfy    |       |  output_config.format =   | |
   |  EN source + FA output   |<------|  findings JSON schema     | |
   +--------------------------+       +---------------------------+ |
        |  findings[]  <-- D-05 TIER 2: NEVER BLOCKS                |
        v                                                           |
   +--------------------------+                                     |
   | FORMAT translationNotes  |  one English line per finding, or    |
   |  (D-06)                  |  "Verify pass clean (YYYY-MM-DD)"    |
   +--------------------------+                                     |
        |                                                           |
        v                                                           |
   +--------------------------+                                     |
   | WRITE draft              |--- createIfNotExists ---------------+
   |  _id: drafts.<uuid>      |    language:"fa", translationOf,
   |  status: "draft"         |    translationNotes, translatedAt,
   |  NEVER "scheduled"       |    sourceUpdatedAt
   +--------------------------+
        |
        v
   +--------------------------+       +---------------------------+
   | RECORD SPEND             |------>| Postgres TokenUsage       |
   |  usage from both passes  |       |  userId = resolved ADMIN  |
   |  activity: translate-post|       |  (FK is REQUIRED)         |
   +--------------------------+       +---------------------------+
        |
        v
   Studio "Posts - Farsi" list  ->  Saeid reviews, edits, publishes
```

### Recommended Project Structure

```
scripts/
├── translate-posts.ts              # the CLI (D-09 flags, mirrors migrate-post-language.ts)
├── lib/                            # NEW dir: pure, importable, no side effects on import
│   ├── portable-text-walk.ts       #   extractSpans / applySpans / structuralFingerprint
│   ├── glossary.ts                 #   load + validate content/fa-glossary.json
│   └── translation-notes.ts        #   findings[] -> compact English lines (D-06)
├── checks/
│   └── translation.check.ts        # NEW: offline round-trip + fingerprint assertions,
│                                   #      --live for dataset assertions
└── mine-glossary-terms.ts          # NEW, one-off: pt::text corpus -> frequency -> HTML review table

content/
└── fa-glossary.json                # NEW (D-01..D-04)

src/sanity/lib/
└── queries.ts                      # ADD the pipeline select query here (CONTENT-02 allowlist)
```

**Warning on `src/sanity/lib/queries.ts`:** `scripts/checks/language-filter.check.ts` enforces a **closed three-file allowlist** for the text `language ==` under `src/` (`queries.ts`, `postType.ts`, `structure.ts`) and was demonstrated to fail on a fourth carrier. Adding the pipeline's select query to `queries.ts` is safe. Putting the GROQ inline in `scripts/translate-posts.ts` is also safe (the scan is scoped to `src/`), but putting it in any new file under `src/` will break the Phase 2 gate. [VERIFIED: 02-05-SUMMARY.md + check script source]

### Pattern 1: Index-keyed span extraction and reapplication

**What:** Walk `body[]` once in document order, collect every `span.text` into a flat array with its ordinal index. Send only that array. Reapply by index onto a deep clone of the source.
**When to use:** Always. This is the load-bearing correctness property of PIPE-01.
**Why index-keyed and not `_key`-keyed:** `_key` is unique within a block's `children` array, not globally. Two blocks can each have a child with the same `_key`. A flat ordinal index is unambiguous and lets the model return a compact array with no keys at all.

```typescript
// Source: derived from the verified real shapes in this repo (see Portable Text Ground Truth)
type Span = { _key: string; _type: "span"; text: string; marks: string[] };
type PTBlock = { _key: string; _type: string; children?: Span[]; [k: string]: unknown };

export function extractSpans(body: PTBlock[]): string[] {
  const out: string[] = [];
  for (const b of body) {
    if (b._type !== "block") continue;          // image / video / table pass through
    for (const c of b.children ?? []) {
      if (c._type === "span" && typeof c.text === "string") out.push(c.text);
    }
  }
  return out;
}

export function applySpans(body: PTBlock[], translated: string[]): PTBlock[] {
  const clone = structuredClone(body);
  let i = 0;
  for (const b of clone) {
    if (b._type !== "block") continue;
    for (const c of b.children ?? []) {
      if (c._type === "span" && typeof c.text === "string") {
        const t = translated[i++];
        if (typeof t !== "string") throw new Error(`missing translation at span index ${i - 1}`);
        c.text = t;
      }
    }
  }
  if (i !== translated.length) {
    throw new Error(`span count mismatch: consumed ${i}, received ${translated.length}`);
  }
  return clone;
}
```

Note `if (b._type !== "block") continue;` is a **deny-by-default** rule, not an allowlist of known non-block types. Any future block type, including a `code` type that does not exist today, passes through untouched with no code change. That is exactly what the success criterion asks for.

### Pattern 2: Structural fingerprint diff as the blocking gate (D-05 tier 1)

**What:** Produce a canonical JSON string of the body with every `span.text` blanked. Compute it for the source and for the translated body. They must be byte-identical.
**Why this beats field-by-field assertions:** it catches every structural mutation at once (`_key`, `_type`, `marks`, `markDefs`, `href`, `listItem`, `level`, `style`, `alignment`, `asset._ref`, table `cells`, block count, child count, key order) without enumerating them, and it stays correct when the schema grows.

```typescript
export function structuralFingerprint(body: unknown): string {
  return JSON.stringify(body, (key, value) => {
    if (key === "text" && typeof value === "string") return "\u0000";  // blank every text leaf
    return value;
  });
}
// Gate:
if (structuralFingerprint(source.body) !== structuralFingerprint(translatedBody)) {
  // REFUSE to write this post. Report loudly. Continue with the other posts.
}
```

Because `applySpans` mutates a `structuredClone` of the source and only assigns to `c.text`, this gate should be impossible to fail. That is the point: it is a tripwire on the walker itself, not on the model. It costs nothing and it is the difference between "we believe the structure is intact" and "we proved it before writing".

Blank `text` only when it sits on a span (`_type === "span"`). The replacer above blanks any `text` key; in this corpus `text` appears only on spans (verified: span keys are exactly `_key, _type, marks, text`), so the simple form is correct today. If a future block type adds its own `text` field the fingerprint would over-blank; prefer walking explicitly if that is a concern.

### Pattern 3: One Batch API job, two request kinds, `custom_id` namespacing

**What:** Both passes go through `messages.batches`. Results arrive in arbitrary order and are matched by `custom_id`.
**Recommended `custom_id` scheme:** `<slug>::translate` and `<slug>::verify`. Slugs in this corpus are long (up to 72 chars) but well under the API's `custom_id` limit, and they are unique per post. Do not use array position.
**Chunking (Claude's discretion, D-40s):** submit the translate pass for all selected posts as one batch, wait for `processing_status === "ended"`, run the code gate, then submit a second batch containing only the verify requests for the posts that passed. Two sequential batches, not one interleaved batch, because the verify request's user content is the translated output, which does not exist until the first batch ends.
**Polling cadence:** 30s is fine; most batches finish inside an hour and the maximum is 24h. Print elapsed time and `request_counts` on each poll so a long run is not silent.
**Partial-failure resume:** persist the batch id and the per-post state to `.planning/phases/03-translation-pipeline/artifacts/<dataset>-<timestamp>.json` as soon as the batch is created. Results stay retrievable for 29 days, so a crashed run resumes with `--resume <batch-id>` rather than re-spending tokens.

### Pattern 4: Glossary as the first, stable, cached system block

**What:** `system` is an array of text blocks. Block 0 is the serialized glossary plus the standing D-04 instruction, carrying `cache_control: { type: "ephemeral" }`. Block 1 is the per-request task framing.
**Why order matters:** caching is a **prefix match** over `tools` then `system` then `messages`. Any byte change anywhere in the prefix invalidates everything after it. Keep the glossary block byte-stable across every request in a run: serialize with sorted keys, no timestamps, no per-post interpolation.

```typescript
// Source: claude-api skill, typescript/claude-api/README.md (Prompt Caching)
const system: Anthropic.TextBlockParam[] = [
  { type: "text", text: GLOSSARY_BLOCK, cache_control: { type: "ephemeral" } },
  { type: "text", text: TASK_INSTRUCTIONS },   // still stable, but after the breakpoint
];
```

**Batch-specific caveat:** prompt caching is supported inside Batch API requests, but batch requests are processed asynchronously over minutes to hours, and the default ephemeral TTL is 5 minutes. Cache hits across a batch are opportunistic, not guaranteed. Set `cache_control: { type: "ephemeral", ttl: "1h" }` to widen the window. Do not plan the cost model around a guaranteed hit rate; verify actual behaviour by reading `usage.cache_read_input_tokens` off the batch results and reporting it. The glossary at 60 to 100 entries is roughly 2 to 4k tokens, comfortably over the ~1024-token minimum cacheable prefix.

### Pattern 5: Draft creation via the `drafts.` id prefix

**What:** A Sanity draft is just a document whose `_id` starts with `drafts.`. Create one with `client.createIfNotExists({ _id: "drafts." + uuid, ... })`.
**Why `createIfNotExists` and not `create` or `createOrReplace`:** `createIfNotExists` is the D-08-safe verb. If Saeid has hand-edited the draft, a re-run without `--retranslate` must not clobber it. `createOrReplace` is the verb `--retranslate` uses, and only that flag.
**How it reaches the Studio list:** `src/sanity/structure.ts` filters `posts-fa` on `` `_type == "post" && language == "fa"` ``. Sanity Studio document lists resolve drafts, so a document that exists only as `drafts.X` appears there. That list has `.initialValueTemplates([])`, which removes the create button but does not block programmatic writes. [CITED: 02-05-SUMMARY.md; the Studio render itself is an outstanding manual check carried over from Phase 2 and should be re-walked here.]

### Pattern 6: Loud, dataset-explicit, dry-run-default CLI (copy from `migrate-post-language.ts`)

The Phase 2 migration script established four conventions this CLI must inherit verbatim:

1. `const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!;` with **no `?? "production"` fallback**. A silent default is how a script writes to the wrong dataset.
2. Print `projectId=... dataset=... apiVersion=... mode=...` as the **first line, before any read or write**.
3. Print `!! TARGET IS THE PRODUCTION DATASET !!` when the resolved dataset is `blog_posts` and the mode mutates.
4. Dry run is the behaviour you get with no flags; mutation requires an explicit flag.

**One deviation from D-09 to raise with the planner:** D-09 lists `--dry-run` as a flag, which implies mutation is the default. That inverts the Phase 2 convention, whose header comment states "Dry run is the DEFAULT. There is no flag that turns it on. Mutation requires `--execute`." Recommendation: accept `--dry-run` as an explicit no-op alias for readability, but keep **dry-run as the default** and require `--execute` to write, matching the sibling script. This satisfies D-09's literal flag list and D-09's stated intent ("mirror the conventions of the existing script") at the same time.

### Anti-Patterns to Avoid

- **Sending the whole `body[]` JSON to the model and asking for JSON back.** This is the failure mode the design spec calls out by name. The model will renumber `_key`s, drop `markDefs`, and mangle `href`s. Send an array of strings, get an array of strings.
- **Reading the Content Lake with the default perspective.** At `apiVersion 2025-10-07` the default is `published`, which cannot see `drafts.*`. Sibling detection returns a false negative every time and the pipeline re-translates posts forever.
- **Setting `temperature: 0` on the translate call.** Sampling parameters are removed on Sonnet 5 and return HTTP 400. See Pitfall 3.
- **Using assistant prefill to force JSON output.** Removed on Sonnet 5, returns 400. Use `output_config.format`.
- **Importing `zod` for `zodOutputFormat()`.** `zod@4.1.11` is in `node_modules` transitively but is **not** in `package.json`. Importing it is an undeclared dependency that would break a clean `npm ci` install. Use the raw JSON schema object.
- **Minting new `_key`s with `nanoid`.** The walker reuses the source keys. A new key is a structural mutation and the fingerprint gate will (correctly) refuse the write.
- **Assuming `_key` is globally unique.** It is unique within its parent array only.
- **Writing `status: "scheduled"` on a Farsi document.** D-12. Write `"draft"`.
- **Running `npm run build` to validate the lockfile repair.** It runs `prisma migrate deploy` against production. Use `npx next build`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async job orchestration for ~26 posts | A concurrency pool with retry/backoff over `messages.create` | `messages.batches` | 50 percent cheaper, no rate-limit choreography, and the SDK already pages results for you |
| Matching results to requests | Position tracking, request ordering | `custom_id` | Batch results arrive in arbitrary order. This is stated in the SDK's own doc comment. |
| Forcing the verify pass to emit valid JSON | Prompt begging, regex extraction, markdown fence stripping | `output_config: { format: { type: "json_schema", schema } }` | Schema-constrained decoding. Note `src/app/api/cv/extract/route.ts` currently does the fence-stripping dance; do not copy that pattern here. |
| Deep-cloning the body | Hand-rolled recursive clone or `JSON.parse(JSON.stringify(x))` | `structuredClone()` | Node 22 builtin, no dependency |
| Detecting structural drift | Field-by-field assertions per block type | The text-blanked JSON fingerprint (Pattern 2) | One comparison covers every field, including ones added later |
| Reading env into scripts | `dotenv` | `npx tsx --env-file <file>` | Node builtin; already the repo convention |
| Repairing the lockfile | Hand-editing version strings in `package-lock.json` | `npm install --package-lock-only` | Verified in isolation to produce a green `npm ci` with a 4-package delta (see Environment Availability) |

**Key insight:** every hard part of this phase is either an SDK feature already installed or a pure function over data whose exact shape has been measured. The only genuinely custom code is ~120 lines of Portable Text walking, and its correctness is provable offline with no network and no model.

## Portable Text Ground Truth

Measured on **all 26 production posts** (`blog_posts`) and **all 17 dev posts** (`blog_posts_dev`) via a read-only raw-perspective GROQ probe on 2026-08-22. [VERIFIED: live query, nothing written]

### Corpus census

| Metric | Production `blog_posts` | Dev `blog_posts_dev` |
|---|---|---|
| Post documents | 26 | 17 |
| Documents with a `drafts.` id | **0** | **0** |
| `status` distribution | `approved: 26` | `approved: 11, scheduled: 4, pending: 1, draft: 1` |
| Approved + English (pipeline candidates) | **26** | **11** |
| Existing `language == "fa"` documents | **0** | **0** |
| Total spans | **2,687** | 1,289 |
| Total span text | **330,863 chars** | n/a |
| Total `body[]` JSON | **683,541 chars** | n/a |
| `pt::text(body)` corpus (mining source) | **335,728 chars, ~84k est. tokens** | n/a |

### Block types actually present

| `_type` | Prod count | Dev count | Walker action |
|---|---|---|---|
| `block` | 1,595 | 819 | translate `children[]._type == "span"` `.text` |
| `image` | 61 | 28 | pass through (but see alt-text open question) |
| `video` | 2 | 2 | pass through (`caption` is reader-visible; see open question) |
| `table` | **10** | 2 | pass through (but `cells[]` are reader-visible; see open question) |
| `code` | **0** | **0** | does not exist in this content model |

### Field inventory

- **Keys on a `block`:** exactly `_key, _type, children, level, listItem, markDefs, style`
- **Keys on a `span`:** exactly `_key, _type, marks, text` (no exceptions across 2,687 prod spans)
- **Keys on an `image` block:** prod `_key, _type, alignment, alt, asset, width`; dev additionally `crop, hotspot`
- **`style` values:** `normal` 1200, `h2` 225, `h3` 135, `h4` 22, `blockquote` 9, `h1` 4
- **`listItem` values:** `bullet` 85, **`number` 3**
- **`markDefs._type`:** `link` only (406 in prod), each `{ _key, _type: "link", href }`
- **Decorator marks:** `strong` 197, `em` 36, plus 407 annotation references (the `_key` of a `markDefs` entry). **No `code` decorator anywhere.**
- **Spans containing a triple-backtick fence:** **0**
- **`table` shape:** `{ _key, _type: "table", rows: [{ _key, _type: "tableRow", cells: string[] }] }`

### Two shapes the schema does not declare

`src/sanity/schemaTypes/blockContentType.ts` declares `lists: [{ value: "bullet" }]` and `decorators: [strong, em]`, but real data contains `listItem: "number"` (3 blocks in prod) and `src/lib/markdownToPortableText.ts` can emit `marks: ["code"]`. Both are written by `markdownToPortableText` outside the Studio's validation. The walker's deny-by-default design handles both without special-casing, but a naive allowlist walker would drop them. [VERIFIED: schema read + live data probe]

### The reader-visible text that is NOT in `span.text`

This is the phase's one real gap between the success criterion and the content model:

| Carrier | Prod count | Reader-visible? | Currently translated by "span.text only"? |
|---|---|---|---|
| `table.rows[].cells[]` | 10 tables, dozens of cells | **Yes**, rendered as full comparison tables | **No** |
| `image.alt` | 61 strings, some 200+ chars of prose | Yes (a11y + SEO) | **No** |
| `mainImage.alt` | 7 | Yes (a11y + SEO) | **No** |
| `video.caption` | 2 | Yes | **No** |
| `title` | 26 | Yes | Yes, D-07 covers it |
| `metaDescription` | **26 of 26** | Yes (SEO) | Yes, D-07 covers it |
| `description` | **1 of 26** | Yes (post lists) | Yes, D-07 covers it |

Note also that `pt::text(body)` **does include table cell text** (verified: prod table strings appear in the `pt::text` output). So the glossary mining corpus already covers tables even though the translator would not.

**This needs Saeid's decision, not Claude's discretion.** D-07 enumerates title, excerpt/description, and SEO fields but is silent on in-body non-span text. Shipping a Farsi post with an English "Industry 4.0 vs Industry 5.0" comparison table is a visible defect. Recommended framing for the question: extend the walker to a small, explicit, code-enumerated set of translatable non-span string paths (`table.rows[].cells[]`, `image.alt`, `video.caption`, `mainImage.alt`), each still index-keyed and still under the structural fingerprint gate. That is roughly 20 extra lines and it keeps the "code decides what is translatable, the model never does" property intact.

## Anthropic SDK Surface at 0.80.0

Everything below was verified by reading the installed `.d.ts` files, not from memory. [VERIFIED: node_modules inspection 2026-08-22]

| Capability | Available at 0.80.0? | Evidence |
|---|---|---|
| `client.messages.batches.create(body)` | Yes | `resources/messages/batches.d.ts:` `create(body: BatchCreateParams): APIPromise<MessageBatch>` |
| `.retrieve(id)` / `.list()` / `.cancel(id)` / `.delete(id)` | Yes | same file |
| `.results(id)` streaming JSONL | Yes | same file, returns a `JSONLDecoder` |
| Batch request shape | Yes | `BatchCreateParams.Request = { custom_id: string; params: MessagesAPI.MessageCreateParamsNonStreaming }` |
| **Structured outputs inside a batch** | **Yes** | `output_config?: OutputConfig` is on `MessageCreateParamsBase`, which `MessageCreateParamsNonStreaming` extends, which is exactly the batch `params` type |
| `OutputConfig` shape | Yes | `{ effort?: 'low'\|'medium'\|'high'\|'max'\|null; format?: JSONOutputFormat\|null }` |
| `JSONOutputFormat` shape | Yes | `{ type: 'json_schema'; schema: { [key: string]: unknown } }` |
| **Prompt caching inside a batch** | **Yes** | `cache_control?: CacheControlEphemeral \| null` on `MessageCreateParamsBase` (top-level auto-cache) plus `cache_control` on `TextBlockParam` (35 occurrences in `messages.d.ts`) |
| `cache_control` with `ttl: "1h"` | Yes | `CacheControlEphemeral` carries an optional `ttl` |
| `zodOutputFormat()` helper | Present but **do not use** | `helpers/zod.d.ts`; requires `zod`, which is not a declared dependency |
| `jsonSchemaOutputFormat()` helper | Present, optional | `helpers/json-schema.d.ts`; requires `json-schema-to-ts` (installed transitively). The raw object is simpler. |
| `claude-sonnet-5` in the `Model` union | **No, but harmless** | Union tops out at `claude-opus-4-6 \| claude-sonnet-4-6 \| claude-haiku-4-5 \| ...` and ends with `\| (string & {})`, so the literal type-checks. Confirmed a real model id via the bundled `claude-api` reference. |

**Minimum SDK version:** `0.80.0` is sufficient for the Batch API, structured outputs (`output_config.format`), and prompt caching (`cache_control`, including `ttl`). No bump is needed. Latest on the registry is `0.120.0`; upgrading is **not** recommended in this phase because it is a working-tree change with a blast radius across the two existing CV routes and buys nothing this phase uses.

### Claude Sonnet 5 facts that change the code

[CITED: bundled `claude-api` skill reference, cached 2026-06-24]

| Fact | Consequence here |
|---|---|
| Exact id: `claude-sonnet-5`, no date suffix | Matches the ROADMAP note exactly. Never append a date. |
| 1M context | The largest post (32.7k chars of span text, 58k chars of body JSON) is nowhere near the limit. Per-post batching is safe. |
| $3.00 / $15.00 per MTok, with a $2.00 / $10.00 intro rate through **2026-08-31** | Batch API halves it. The whole 26-post backlog is well under $5. If this phase runs before Aug 31 the effective batch rate is $1.00 / $5.00. |
| `temperature`, `top_p`, `top_k` are **removed** and return 400 | Do not set them. This is a genuine trap: a translation script is exactly where an engineer reaches for `temperature: 0`. |
| Assistant prefill is **removed** and returns 400 | Do not prefill `{` to force JSON. Use `output_config.format`. |
| `budget_tokens` is **removed** and returns 400 | If thinking is wanted, use `thinking: { type: "adaptive" }`. For a mechanical translation pass, thinking is not needed; the verify pass may benefit from `output_config.effort: "high"`. |
| Mid-conversation system messages are **not** supported on Sonnet 5 | Irrelevant here (single-turn requests), but do not copy that pattern from the reference. |
| Batch API supports all Messages API features including caching | Confirms Pattern 4 is legal, subject to the async-TTL caveat. |

## TokenUsage Integration

```prisma
model TokenUsage {
  id           String   @id @default(cuid())
  userId       String                          // <-- REQUIRED, FK to User
  activity     String
  model        String
  inputTokens  Int
  outputTokens Int
  totalTokens  Int
  createdAt    DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId]) @@index([activity]) @@index([createdAt])
}
```

**The blocker to plan around:** `userId` is a required foreign key. Both existing writers get it from an authenticated session (`session.user.id`). A CLI script has no session. It must resolve a real `User.id` or the insert fails with a foreign key violation.

**Recommended resolution:** `prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" }, select: { id: true } })` and **fail loudly with a clear message** if none is found. The `Role` enum is `ADMIN | AUTHOR | SUBSCRIBER`. Do not silently skip the spend record; success criterion 5 requires it.

**Existing writers to copy (both fire-and-forget with `.catch`):**
- `src/app/api/cv/extract/route.ts:234` uses `prisma.tokenUsage.create({ data: { userId, activity: "cv-extract", model, inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens, totalTokens: input + output } })`
- `src/app/api/cv/design/route.ts:339` uses `prisma.tokenUsage.createMany({ data: designs.map(...) })` for the multi-call case, which is the right shape for a batch of N posts

**In a CLI, do not fire-and-forget.** `await` the write and let a failure be visible, otherwise a crashed process loses the record silently.

**Suggested `activity` values:** `"translate-post"` and `"translate-verify"`, so the admin dashboard's `groupBy({ by: ["activity"] })` separates the two passes.

**Env split (critical):** `.env` points `DATABASE_URL` at the **production** Postgres; `.env.local` overrides it to the dev/preview DB. `src/lib/prisma.ts` reads `process.env.DATABASE_URL!` through `PrismaPg`. A `--env-file .env.local` run therefore writes both Sanity **and** Prisma to dev; a `--env-file .env.vercel-prod` run must be checked to confirm it carries a `DATABASE_URL` at all. **Open item:** verify during planning that `.env.vercel-prod` defines `DATABASE_URL`, and that the dev DB has the `TokenUsage` table and at least one `ADMIN` user. If dev DB parity is missing, the rehearsal run needs a documented fallback (record spend to stdout and a JSON artifact, and note it in the summary) rather than crashing.

## Sanity Draft and Perspective Mechanics

### Perspective is the whole ballgame

`@sanity/client@7.26.2` typings state: *"As of API version `v2025-02-19`, the default perspective has changed from `raw` to `published`."* This repo pins `apiVersion = "2025-10-07"`. `ClientPerspective` is `'published' | 'drafts' | 'raw' | StackablePerspective[]`, with `previewDrafts` marked **deprecated**. [VERIFIED: `node_modules/@sanity/client/dist/index.d.ts` lines 716-729, 868-870]

| Client | Perspective set? | Sees `drafts.*`? |
|---|---|---|
| `src/sanity/lib/client.ts` (used by the app and by the cron) | No, so `published` | **No** |
| `scripts/migrate-post-language.ts` | `perspective: "raw"` | Yes |
| **the pipeline client (must)** | `perspective: "raw"` | Yes |

Two consequences:
1. **Sibling detection is broken without `raw`.** Farsi siblings exist only as drafts. A published-perspective count always returns 0, so `--all` would re-translate the entire backlog on every run.
2. **D-12 gets a free second layer.** `src/app/api/cron/publish-scheduled/route.ts` queries through the default-perspective `client`, so it structurally cannot see a Farsi draft even if that draft carried `status: "scheduled"`. This does **not** relieve the pipeline of its D-12 obligation (a published Farsi document would be visible), but it means the failure mode is two mistakes deep, not one.

### The select query

Recommended home: `src/sanity/lib/queries.ts` (already an allowlisted carrier of `language ==`). Verified to execute against production without error:

```groq
*[_type == "post"
   && !(_id in path("drafts.**"))
   && status == "approved"
   && (!defined(language) || language == "en")
   && count(*[_type == "post"
              && language == "fa"
              && translationOf._ref in [^._id, "drafts." + ^._id]]) == 0
]{ _id, _updatedAt, title, description, metaDescription, "slug": slug.current, body }
```

- `!(_id in path("drafts.**"))` excludes draft *English* documents from being treated as sources (there are none today, but the raw perspective would surface them if one appeared).
- The `count()` subquery is the sibling test. It runs under the raw perspective, so it sees `drafts.*` Farsi documents.
- `translationOf._ref in [^._id, "drafts." + ^._id]` covers both possible reference targets. In practice the pipeline should always reference the **published** English `_id`, so the second element is belt and braces.
- Executed live against `blog_posts` on 2026-08-22: returned 26 (all posts, because zero Farsi documents exist). The zero-count branch has **not** been exercised against real Farsi data and must be proven during the dev rehearsal. [VERIFIED: live read-only query]
- `EN_LANGUAGE` from `queries.ts` is exactly `(!defined(language) || language == "en")` and should be interpolated rather than retyped.

### Writing the draft

```typescript
const draftId = `drafts.${crypto.randomUUID()}`;
await client.createIfNotExists({
  _id: draftId,
  _type: "post",
  language: "fa",
  translationOf: { _type: "reference", _ref: source._id },
  status: "draft",                       // D-12: NEVER "scheduled"
  title: farsiTitle,
  slug: source.slug,                     // reused verbatim per design spec
  description: farsiDescription,
  metaDescription: farsiMetaDescription,
  category: source.category,             // reference carried over untouched
  author: source.author,
  mainImage: source.mainImage,
  publishedAt: source.publishedAt,
  body: translatedBody,
  translationNotes: notesText,
  translatedAt: new Date().toISOString(),        // see Staleness below
  sourceUpdatedAt: source._updatedAt,            // see Staleness below
});
```

`createIfNotExists` is the D-08-safe verb; `--retranslate` swaps in `createOrReplace` (or, better, a `patch().set({...})` that preserves `_createdAt` and any Studio-side edits to fields the pipeline does not own).

`postType.ts` has **17 fields** and the Phase 2 check script asserts that count as a deliberate tripwire. Adding `translatedAt` and `sourceUpdatedAt` as schema fields would take it to 19 and **break `scripts/checks/language-filter.check.ts`**. Plan for that: either update the asserted count in the same task, or use the field-free staleness option below. [VERIFIED: 02-05 decision log + check script]

### The 17 fields of `postType.ts` today

| Field | Type | Translate? (D-07) | Notes |
|---|---|---|---|
| `title` | string | **Yes** | reader-visible |
| `slug` | slug | No, reuse verbatim | design spec: Farsi reuses the English slug |
| `category` | reference -> category | No, carry over | |
| `order` | number | No | |
| `featured` | boolean | No | consider forcing `false` so a Farsi draft never claims the hero slot |
| `heroOrder` | number | No | same, consider omitting entirely |
| `author` | reference -> author | No, carry over | |
| `mainImage` | image (+`alt` string) | Image no; **`alt` is an open question** | 7 of 26 have alt |
| `description` | text (Short Description) | **Yes** (D-07 "excerpt") | present on only 1 of 26 prod posts |
| `metaDescription` | string (SEO, max 160 warn) | **Yes** (D-07 "SEO/meta") | present on **26 of 26**; this is the real SEO field |
| `status` | string enum | Set to `"draft"` | D-12 |
| `submittedBy` | string, readOnly | No, omit | Prisma User id of a human submitter |
| `publishedAt` | datetime | No, carry over | |
| `body` | blockContent | **Yes**, spans only | PIPE-01 |
| `language` | string enum en/fa | Set to `"fa"` | |
| `translationOf` | reference -> post | Set to source `_id` | picker filter excludes self and non-English |
| `translationNotes` | text, rows 6, **readOnly** | Written by the script | PIPE-02, D-06. readOnly in Studio, which is correct: only the script writes it. |

Note `metaDescription` carries `Rule.warning(...).max(160)`. It is a **warning**, not an error, so a longer Farsi rendering will not block a Studio publish, but it will show a warning badge. Worth one line in the translate prompt asking for a rendering under 160 characters.

### Staleness detection (Claude's discretion, D-08)

| Option | How | Verdict |
|---|---|---|
| **A. `sourceUpdatedAt` field on the Farsi doc** | Store the source's `_updatedAt` at translation time; stale when `source._updatedAt > sibling.sourceUpdatedAt` | **Recommended.** Exact, cheap, one GROQ comparison, immune to Saeid editing the Farsi draft. Costs two new schema fields and a bump to the 17-field tripwire. |
| B. Compare `source._updatedAt > sibling._updatedAt` | No new fields | **Rejected.** Saeid reviewing and editing the Farsi draft bumps its `_updatedAt`, which makes a stale translation look fresh forever. This is exactly backwards. |
| C. Store the timestamp inside `translationNotes` | No new fields, no tripwire bump | Parsing a human-readable notes field for machine state is fragile and fights D-06's "compact human summary" purpose. |
| D. Sidecar `translationLog` document type | No `postType` change | Over-engineered for 26 posts and adds a document type to the Studio. |

Recommend **A** with a single field, `sourceUpdatedAt` (datetime, readOnly, hidden on English documents), and derive "when was this translated" from the draft's own `_createdAt` rather than adding a second field. That is one new field, taking `postType` from 17 to 18, one tripwire line to update.

## Wave 0: The `npm ci` Failure, Diagnosed and Repaired

STATE.md's recorded diagnosis is **wrong** and the plan should not carry it forward. I reproduced the failure read-only and repaired it in an isolated copy.

### What STATE.md says

> `@sanity/visual-editing@3.0.5` requires `@sanity/client@^7.8.2`, its dependency edge is unrecorded in the lock, and the nested lock entry pins `@sanity/client@6.29.1`.

**This is disproven.** `npm view @sanity/visual-editing@3.0.5 dependencies` returns 15 dependencies and **`@sanity/client` is not among them**. The lockfile's entry for that package matches its published manifest exactly. The nested `@sanity/client@6.29.1` exists to satisfy `@sanity/mutate@0.11.0-canary.4`'s `^6.22.4`, which is correct. [VERIFIED: npm registry]

### The actual failure

`npm ci --dry-run --ignore-scripts` (npm 10.9.3), run at **HEAD**:

```
npm error code EUSAGE
npm error `npm ci` can only install packages when your package.json and package-lock.json
npm error or npm-shrinkwrap.json are in sync.
npm error Invalid: lock file's @sanity/client@7.23.0 does not satisfy @sanity/client@7.26.2
npm error Invalid: lock file's @sanity/eventsource@5.0.2 does not satisfy @sanity/eventsource@5.0.4
npm error Invalid: lock file's get-it@8.8.0 does not satisfy get-it@8.8.3
npm error Invalid: lock file's nanoid@3.3.11 does not satisfy nanoid@3.3.18
```

And in the **working tree** (which already carries the uncommitted 7.23.0 to 7.24.0 drift), three remain:

```
npm error Invalid: lock file's @sanity/client@7.24.0 does not satisfy @sanity/client@7.26.2
npm error Invalid: lock file's get-it@8.8.0 does not satisfy get-it@8.8.3
npm error Invalid: lock file's nanoid@3.3.11 does not satisfy nanoid@3.3.18
```

Two things follow. First, the root `package.json` and the lock's root `dependencies`/`devDependencies` maps are **perfectly in sync** (I diffed all 48 entries: zero mismatches). The problem is entirely in transitive resolution. Second, **the uncommitted `package-lock.json` drift is not unrelated noise, it is a partial repair**: it already fixed one of the four (`@sanity/eventsource`). Phase 2 correctly left it alone under its scope boundary, but Wave 0 should treat it as the start of the fix, not something to revert.

### The repair, tested in isolation

I copied HEAD's `package.json` and `package-lock.json` into a scratch directory and ran:

```bash
npm install --package-lock-only --ignore-scripts   # rewrites ONLY the lock, never node_modules
npm ci --dry-run --ignore-scripts                  # -> "added 1820 packages in 998ms"
```

Delta between the original lock and the repaired lock:

| Measure | Value |
|---|---|
| Lock entries before / after | 1821 / 1827 |
| Entries **removed** | **0** |
| Entries **added** | 6, all `@tailwindcss/oxide-wasm32-wasi/node_modules/*` (`@emnapi/core`, `@emnapi/runtime`, `@emnapi/wasi-threads`, `@napi-rs/wasm-runtime`, `@tybys/wasm-util`, `tslib`) |
| **Version changes** | **4**: `@sanity/client` 7.23.0 to 7.26.2, `@sanity/eventsource` 5.0.2 to 5.0.4, `get-it` 8.8.0 to 8.8.3, `nanoid` 3.3.11 to 3.3.18 |
| `next-sanity` | **unchanged at 11.4.2** |
| `sanity` | **unchanged at 4.10.2** |
| `@anthropic-ai/sdk` | **unchanged at 0.80.0** |
| `next`, `react`, `prisma` | unchanged |

This is about as low-risk as a lockfile repair gets: four patch or minor bumps within existing `^` ranges, six wasm shim entries, zero removals, and no framework movement. [VERIFIED: executed in an isolated scratch copy 2026-08-22; the repo's own lock was not modified]

### Recommended Wave 0 procedure

1. `npm install --package-lock-only` in the repo (touches only `package-lock.json`; leaves the `--no-package-lock`-installed `node_modules` alone).
2. `git diff --stat package-lock.json` and confirm the delta matches the table above. If `next-sanity`, `sanity`, `next`, or `react` moved, **stop and reassess**: something changed on the registry since this research.
3. `npm ci --dry-run --ignore-scripts` must print `added N packages`, not `EUSAGE`.
4. `npx tsc --noEmit` -> 0. `npx next build` -> exit 0. **Never `npm run build`.**
5. `node scripts/checks/route-smoke.mjs --verify` against a backgrounded `npx next start` (28/28 was the Phase 2 baseline).
6. Commit the lock alone, with a message that records the four bumps.
7. Then the Saeid-gated push and prod deploy (D-11 step 2).

**Do not** run a bare `npm install` as the repair. It would reify `node_modules` and could surface the pre-existing hybrid-install state that plan 01-01 already had to untangle. `--package-lock-only` sidesteps that entirely.

**Known noise to expect and ignore:** `npm ci` emits an `ERESOLVE overriding peer dependency` warning about `@auth/core@0.41.0` wanting `nodemailer@^6.8.0` while the root pins `^7.0.7`. That is a **warning**, pre-existing, and does not fail the install.

## Glossary Mining (D-01)

**Recommended source: a single GROQ `pt::text(body)` query against production.** Verified working and correctly sized:

```groq
*[_type == "post" && status == "approved" && (!defined(language) || language == "en")]{
  "slug": slug.current, title, "text": pt::text(body)
}
```

Result: 26 posts, **335,728 characters, roughly 84,000 estimated tokens**, and it **includes table cell text** (confirmed by finding known table strings in the output). That fits inside a single Sonnet 5 request with room to spare, so the mining pass can be one call rather than a chunked pipeline.

| Option | Verdict |
|---|---|
| **GROQ `pt::text(body)`** | **Recommended.** One query, no auth dance, includes table text, gives exact frequencies. |
| `/api/v1/posts` route | Rejected. Requires an API key, returns paginated JSON shaped for external consumers, and adds an HTTP hop for data the script can read directly. |
| `nnx-search` pgvector MCP | Rejected for mining. It is a chunked semantic index built for retrieval, not a complete verbatim corpus, and frequency counts over chunk embeddings are not frequency counts over the corpus. |

**Recommended mining approach:** a small one-off `scripts/mine-glossary-terms.ts` that (a) pulls the corpus, (b) computes n-gram frequencies locally with a stopword filter so the *counts are deterministic and not model-generated*, (c) sends the top few hundred candidates plus their counts and one example sentence each to Sonnet 5 for the `translate` / `transliterate` / `keep-english` classification and the Farsi rendering, and (d) emits both `content/fa-glossary.json` and the sibling HTML review table (D-03). Deterministic counts matter: D-03 promises Saeid "corpus frequency" in the review table, and a model-estimated frequency would be a fabrication.

## Common Pitfalls

### Pitfall 1: Default perspective hides every draft

**What goes wrong:** sibling detection always reports "no Farsi sibling", so `--all` re-translates the whole backlog on every run and burns tokens; staleness reporting never fires.
**Why it happens:** `@sanity/client` v7 defaults to `published` at `apiVersion >= 2025-02-19`, and this repo pins `2025-10-07`. Farsi documents exist only as `drafts.*`.
**How to avoid:** `perspective: "raw"` on the pipeline client, exactly as `migrate-post-language.ts` does. Do not use `previewDrafts`, it is deprecated in v7.
**Warning signs:** a second `--all` run reports the same post count as the first.

### Pitfall 2: Wrong dataset, confident success message

**What goes wrong:** the script writes Farsi drafts into production during what was meant to be the dev rehearsal, or vice versa.
**Why it happens:** the two datasets are `blog_posts` and `blog_posts_dev`, differing by one suffix, and the target is chosen by which `--env-file` was passed. This exact risk is what Phase 2 called research Pitfall 6.
**How to avoid:** no `??` fallback on `NEXT_PUBLIC_SANITY_DATASET`; print the resolved `projectId`, `dataset`, `apiVersion`, and `mode` as the **first line**; print `!! TARGET IS THE PRODUCTION DATASET !!` on a mutating prod run. Record the header line verbatim in the plan summary as evidence.
**Warning signs:** a run whose first line you cannot quote.

### Pitfall 3: Sampling parameters and prefill return HTTP 400 on Sonnet 5

**What goes wrong:** `temperature: 0` (the reflex for a deterministic translation task) fails the request. Prefilling `{` to coerce JSON fails the request.
**Why it happens:** `temperature`, `top_p`, `top_k`, `budget_tokens`, and assistant prefill were all removed on the Sonnet 5 / Opus 4.7+ generation. The repo's existing calls at `src/app/api/cv/*` target older models and do not exercise this, so there is no in-repo precedent to copy safely.
**How to avoid:** send only `model`, `max_tokens`, `system`, `messages`, and `output_config`. Control determinism through the schema and the prompt, not through sampling.
**Warning signs:** a batch that ends immediately with every request `errored` and `error.type === "invalid_request"`.

### Pitfall 4: Batch results arrive out of order

**What goes wrong:** post A gets post B's translation. The structural gate would very likely still pass (span counts often differ, but not always), so this can reach a draft.
**Why it happens:** the API explicitly does not guarantee ordering. The SDK's own doc comment says so.
**How to avoid:** key everything by `custom_id`. Build a `Map<string, Result>` from the results stream, then look up per post. Additionally assert that the returned span array length equals the extracted span array length before calling `applySpans` (the example above already throws on mismatch).
**Warning signs:** a Farsi draft whose paragraph count matches but whose subject matter does not.

### Pitfall 5: Prompt cache silently never hits in a batch

**What goes wrong:** the cost model assumes cached glossary input; the actual bill is 3 to 5 times the estimate on the input side.
**Why it happens:** ephemeral cache TTL defaults to 5 minutes; batch requests can be spread over an hour or more. Also, any byte change in the glossary block between requests invalidates the prefix, and a naive `JSON.stringify` of an object with unstable key order does exactly that.
**How to avoid:** serialize the glossary once, deterministically (sorted keys), into a module-level constant. Use `ttl: "1h"`. **Read `usage.cache_read_input_tokens` off every batch result and report the hit rate** rather than assuming it.
**Warning signs:** `cache_read_input_tokens` is 0 across every result.

### Pitfall 6: TokenUsage insert fails on the foreign key

**What goes wrong:** the whole run succeeds, drafts are written, then the spend record throws a foreign key violation and success criterion 5 is unmet.
**Why it happens:** `TokenUsage.userId` is a required FK to `User`, and a CLI has no session to source it from.
**How to avoid:** resolve an `ADMIN` user id **at the top of the run, before spending any tokens**, and abort with a clear message if none exists. Also confirm the target DB actually has the table: `.env.local` points `DATABASE_URL` at the dev DB, whose `TokenUsage` parity is unverified.
**Warning signs:** `PrismaClientKnownRequestError` with code `P2003`.

### Pitfall 7: `postType.ts` field-count tripwire

**What goes wrong:** adding `sourceUpdatedAt` to the schema breaks `scripts/checks/language-filter.check.ts`, which asserts exactly 17 fields as a deliberate anti-drift tripwire.
**Why it happens:** plan 02-03 pinned the count on purpose so a later schema addition fails loudly rather than drifting.
**How to avoid:** update the asserted count in the same task that adds the field, and say so in the summary. Do not delete the assertion.
**Warning signs:** `AssertionError` on field count from a check that passed the day before.

### Pitfall 8: The `language ==` allowlist

**What goes wrong:** a new file under `src/` containing the language predicate fails `language-filter.check.ts` with a closed-allowlist assertion error.
**Why it happens:** CONTENT-02 is enforced by a three-file allowlist (`queries.ts`, `postType.ts`, `structure.ts`) that was demonstrated to fail on a fourth carrier.
**How to avoid:** put the pipeline's select query in `src/sanity/lib/queries.ts` or in a `scripts/` file. Never in a new file under `src/`.

### Pitfall 9: `npm run build` reaches production

**What goes wrong:** `prisma migrate deploy` runs against the production database from a laptop.
**Why it happens:** `"build": "prisma generate && prisma migrate deploy && next build"` and the Prisma CLI reads `.env`, which is prod.
**How to avoid:** `npx next build`, always. This is a standing repo rule and it bites hardest in Wave 0, where verifying a lockfile repair makes "just run the build" feel natural.

## Code Examples

### 1. Client setup, mirroring the proven Phase 2 script

```typescript
// Source: scripts/migrate-post-language.ts (verbatim conventions), adapted
import { createClient } from "@sanity/client";

const PRODUCTION_DATASET = "blog_posts";
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!;   // NO fallback, on purpose
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2025-10-07";

const client = createClient({
  projectId, dataset, apiVersion,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  perspective: "raw",   // MUST: Farsi siblings are drafts, invisible under "published"
});

console.log(
  `translate-posts: projectId=${projectId} dataset=${dataset} apiVersion=${apiVersion} mode=${execute ? "EXECUTE" : "DRY RUN"}`,
);
if (execute && dataset === PRODUCTION_DATASET) {
  console.log("!! TARGET IS THE PRODUCTION DATASET !!");
}
```

### 2. Batch create with a cached glossary system block

```typescript
// Source: claude-api skill typescript/claude-api/batches.md + README.md (Prompt Caching)
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const batch = await anthropic.messages.batches.create({
  requests: posts.map((p) => ({
    custom_id: `${p.slug}::translate`,
    params: {
      model: "claude-sonnet-5",
      max_tokens: 16000,
      // NO temperature / top_p / top_k -- removed on Sonnet 5, returns 400
      system: [
        { type: "text", text: GLOSSARY_BLOCK, cache_control: { type: "ephemeral", ttl: "1h" } },
        { type: "text", text: TRANSLATE_INSTRUCTIONS },
      ],
      messages: [{ role: "user", content: JSON.stringify({ slug: p.slug, spans: extractSpans(p.body) }) }],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["spans"],
            properties: { spans: { type: "array", items: { type: "string" } } },
          },
        },
      },
    },
  })),
});
console.log(`batch ${batch.id} created, status ${batch.processing_status}`);
```

### 3. Poll and collect results keyed by `custom_id`

```typescript
// Source: claude-api skill typescript/claude-api/batches.md
let b = await anthropic.messages.batches.retrieve(batch.id);
while (b.processing_status !== "ended") {
  console.log(`  ...${b.processing_status} processing=${b.request_counts.processing} succeeded=${b.request_counts.succeeded}`);
  await new Promise((r) => setTimeout(r, 30_000));
  b = await anthropic.messages.batches.retrieve(batch.id);
}

const byId = new Map<string, Anthropic.Message>();
let inputTokens = 0, outputTokens = 0, cacheRead = 0;
for await (const r of await anthropic.messages.batches.results(batch.id)) {
  if (r.result.type !== "succeeded") {
    console.error(`[${r.custom_id}] ${r.result.type}`, r.result.type === "errored" ? r.result.error : "");
    continue;
  }
  byId.set(r.custom_id, r.result.message);       // NEVER key by position
  inputTokens  += r.result.message.usage.input_tokens;
  outputTokens += r.result.message.usage.output_tokens;
  cacheRead    += r.result.message.usage.cache_read_input_tokens ?? 0;
}
console.log(`tokens in=${inputTokens} out=${outputTokens} cacheRead=${cacheRead}`);
```

### 4. Verify-pass schema (PIPE-02, D-05 tier 2, D-06)

```typescript
const VERIFY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["findings"],
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "severity", "location", "summary"],
        properties: {
          category: {
            type: "string",
            enum: ["number", "date", "url", "entity-name", "code-content",
                   "glossary-adherence", "untranslated-leftover"],
          },
          severity: { type: "string", enum: ["info", "warn"] },
          location: { type: "string", description: "e.g. 'para 3' or 'H2 near span 41'" },
          summary:  { type: "string", description: "One English line, no em dashes." },
        },
      },
    },
  },
} as const;
```

Formatting for `translationNotes` (D-06), one line per finding, with an explicit clean line so an empty field is never ambiguous:

```typescript
export function formatNotes(findings: Finding[], date: string): string {
  if (findings.length === 0) return `Verify pass clean (${date})`;
  return [
    `Verify pass ${date}: ${findings.length} finding(s)`,
    ...findings.map((f) => `${f.category}: ${f.summary} (${f.location})`),
  ].join("\n");
}
```

### 5. TokenUsage write from a CLI

```typescript
// Source: src/app/api/cv/design/route.ts:339 (createMany shape), adapted for a script
const admin = await prisma.user.findFirst({
  where: { role: "ADMIN" }, orderBy: { createdAt: "asc" }, select: { id: true },
});
if (!admin) throw new Error("No ADMIN user in the target database; cannot record TokenUsage.");

await prisma.tokenUsage.createMany({
  data: [
    { userId: admin.id, activity: "translate-post",   model: "claude-sonnet-5",
      inputTokens: trIn,  outputTokens: trOut,  totalTokens: trIn + trOut },
    { userId: admin.id, activity: "translate-verify", model: "claude-sonnet-5",
      inputTokens: vfIn,  outputTokens: vfOut,  totalTokens: vfIn + vfOut },
  ],
});
```

Note: `await` it. Do not copy the routes' fire-and-forget `.catch(...)` pattern into a CLI.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| `perspective` defaults to `raw` | defaults to `published` | Sanity API `v2025-02-19` | This repo pins `2025-10-07`, so every client that does not set `perspective` is draft-blind. Root cause of Pitfall 1. |
| `perspective: "previewDrafts"` | `perspective: "drafts"` | `@sanity/client` v7 | `previewDrafts` is typed `DeprecatedPreviewDrafts`. Do not write it in new code. |
| `output_format` top-level param | `output_config: { format: {...} }` | 2025-2026 API revision | The deprecated form still appears in older examples. Use `output_config`. |
| Assistant prefill to force JSON | `output_config.format` | Sonnet 5 / Opus 4.6+ | Prefill now returns 400 on Sonnet 5. |
| `temperature` / `top_p` for determinism | removed | Sonnet 5 / Opus 4.7+ | Returns 400. Determinism comes from the schema and the prompt. |
| `thinking: { type: "enabled", budget_tokens: N }` | `thinking: { type: "adaptive" }` | Sonnet 5 / Opus 4.7+ | `budget_tokens` returns 400 on Sonnet 5. Not needed for this phase. |
| Custom document IDs for drafts | still the `drafts.` prefix, plus the newer Actions API (`client.action()`) | v7 | The prefix convention remains valid and is what Phase 2 exercised. Prefer it. |

**Deprecated / outdated in this repo's own code:**
- `src/app/api/cv/extract/route.ts` strips markdown code fences off the model's response and `JSON.parse`s it. That predates structured outputs. Do **not** copy this pattern into the pipeline; use `output_config.format`.
- `src/app/api/cv/design/route.ts` targets `claude-sonnet-4-6`. Not this phase's business, but note that any future migration of those routes to Sonnet 5 would hit the sampling-parameter removal.

## Runtime State Inventory

Not applicable. This phase is greenfield script authoring plus a lockfile repair; there is no rename, refactor, or migration of existing runtime state. The one adjacent item, the Phase 2 language stamp, is already complete on both datasets (`en=26 fa=0 none=0` on prod, `en=17 fa=0 none=0` on dev, both independently verified).

For completeness, the state this phase **creates** rather than migrates: Sanity draft documents in `blog_posts_dev` (rehearsal) then `blog_posts` (proof run), `TokenUsage` rows in the corresponding Postgres, Anthropic Batch objects (retained 29 days), and `content/fa-glossary.json` in git.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| Node | everything | Yes | 22.19.0 | none needed |
| npm | Wave 0 lock repair | Yes | 10.9.3 | none needed |
| `tsx` | script execution | Yes | ^4.21.0 devDep, `npx tsx` works | none needed |
| `@anthropic-ai/sdk` | both passes | Yes | 0.80.0 installed | none needed |
| `@sanity/client` | reads + writes | Yes | 7.26.2 installed | none needed |
| `.env.local` (dev Sanity + dev DB) | D-10 rehearsal | Yes | verified readable, `dataset=blog_posts_dev`, 17 posts | none |
| `.env.vercel-prod` (prod Sanity) | D-11 proof run | Yes | verified readable, `dataset=blog_posts`, 26 posts | none |
| `SANITY_API_TOKEN` write scope | draft creation | Yes on both datasets | proven by the Phase 2 migration dry-run commit | none |
| `ANTHROPIC_API_KEY` | Batch API | **UNVERIFIED** | present in the CV routes' expectations; not confirmed in any env file this session | see below |
| `DATABASE_URL` in `.env.vercel-prod` | prod-run TokenUsage | **UNVERIFIED** | `.env` = prod DB, `.env.local` = dev DB; whether `.env.vercel-prod` also carries `DATABASE_URL` was not checked | print spend to stdout + artifact and record the gap |
| `TokenUsage` table + `ADMIN` user in the **dev** DB | rehearsal spend record | **UNVERIFIED** | CONTEXT.md itself flags "dev DB parity to verify during planning" | same fallback |
| Chrome (Saeid's, authenticated) | Studio smoke | Yes | Vercel previews sit behind SSO with no bypass secret, so Playwright cannot reach them | Saeid drives the Studio check manually |

**Missing dependencies with no fallback:** none identified.

**Unverified items the plan must resolve in its first task (all are one-line checks, none blocks planning):**
- Does `ANTHROPIC_API_KEY` exist in `.env.local` and/or `.env.vercel-prod`? If not, decide where the script sources it.
- Does `.env.vercel-prod` define `DATABASE_URL`? If not, the prod proof run cannot write `TokenUsage` from that env file and needs a documented approach.
- Does the dev DB have `TokenUsage` and at least one `ADMIN` user?

I deliberately did not read the contents of the env files beyond letting `tsx --env-file` consume them, so that no secret entered this document or the transcript.

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | **None, by design.** Verification is `npx tsx` check scripts plus Studio/browser smoke (design spec section 3; 02-05 summary). Do not add vitest or pytest. |
| Config file | none |
| Quick run command | `npx tsc --noEmit && npx tsx scripts/checks/translation.check.ts` |
| Full suite command | `npx tsc --noEmit && npx eslint <changed> && npx tsx scripts/checks/language-filter.check.ts && npx tsx scripts/checks/translation.check.ts && npx next build` |

### Phase Requirements to Test Map

| Req / Criterion | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| PIPE-01 / SC-1 | `extractSpans` then `applySpans` round-trips the identity function to a byte-identical body | unit (offline) | `npx tsx scripts/checks/translation.check.ts` | ❌ Wave 0 |
| PIPE-01 / SC-1 | `structuralFingerprint` is invariant under any span-text substitution and **changes** under a `_key`, `marks`, `markDefs.href`, `listItem`, or block-count mutation (negative case demonstrated, like the 02-05 allowlist probe) | unit (offline) | same | ❌ Wave 0 |
| PIPE-01 / SC-1 | Non-`block` types (`image`, `video`, `table`) and an injected synthetic `code` block pass through byte-identical | unit (offline, synthetic fixture) | same | ❌ Wave 0 |
| PIPE-01 / SC-1 | Against the real largest prod post (115 blocks, 183 spans, 406 `markDefs` corpus-wide), the identity round-trip is byte-identical | integration (live, read-only) | `npx tsx --env-file .env.vercel-prod scripts/checks/translation.check.ts --live` | ❌ Wave 0 |
| PIPE-01 / SC-1 | A real translated draft exists with `language: "fa"`, `translationOf` set, and a fingerprint identical to its source | integration (live) | `... scripts/checks/translation.check.ts --post-run --slug <s>` | ❌ Wave 0 |
| PIPE-01 / SC-1 | Every `markDefs[].href` in the Farsi draft is byte-identical to the source (links working) | integration (live) | same | ❌ Wave 0 |
| PIPE-02 / SC-2 | `translationNotes` is non-empty on the created draft and matches the D-06 line format (or the explicit clean line) | integration (live) | same | ❌ Wave 0 |
| PIPE-02 / SC-2 | The verify request carried a valid `output_config.format` and the response parsed against the schema | integration | asserted inside the run; batch artifact retained | ❌ Wave 0 |
| SC-3 | `content/fa-glossary.json` exists, parses, has 60 to 100 entries, and every entry has a `strategy` in `{translate, transliterate, keep-english}` | unit (offline) | `npx tsx scripts/checks/translation.check.ts` | ❌ Wave 0 |
| SC-3 | The serialized glossary block is byte-stable across two independent serializations (cache-prefix stability) | unit (offline) | same | ❌ Wave 0 |
| SC-3 | The batch request carried `cache_control` on the glossary block; report observed `cache_read_input_tokens` | integration | run output + artifact | ❌ Wave 0 |
| SC-4 | The first run targeted `blog_posts_dev`; the header line is captured verbatim in the plan artifact | manual evidence | `artifacts/translate-dev.log` first line | ❌ Wave 0 |
| SC-5 | `TokenUsage` rows exist for the run with `activity` in `{translate-post, translate-verify}` | integration (live DB) | `... scripts/checks/translation.check.ts --post-run` | ❌ Wave 0 |
| D-12 | No document in either dataset has `language == "fa" && status == "scheduled"`; count must be 0 | integration (live) | `... --post-run` | ❌ Wave 0 |
| D-12 | Source-text assertion: `scripts/translate-posts.ts` contains no `"scheduled"` literal | unit (offline) | `npx tsx scripts/checks/translation.check.ts` | ❌ Wave 0 |
| D-08 | A second default run over an already-translated post reports it as skipped, writes nothing, and spends no tokens | integration (live, dev) | second `npx tsx --env-file .env.local scripts/translate-posts.ts --all --execute` | ❌ Wave 0 |
| D-11 | `npm ci --dry-run` exits 0 | integration | `npm ci --dry-run --ignore-scripts` | n/a, npm builtin |
| Regression | The Phase 2 gate still passes after `queries.ts` and `postType.ts` change | integration | `npx tsx scripts/checks/language-filter.check.ts` and `--live` | ✅ exists |
| Regression | Public routes unchanged | integration | `node scripts/checks/route-smoke.mjs --verify` (28/28 baseline) | ✅ exists |

### Sampling Rate

- **Per task commit:** `npx tsc --noEmit` + `npx eslint <changed files>` + `npx tsx scripts/checks/translation.check.ts` (offline section, no network, sub-second)
- **Per wave merge:** add `npx tsx scripts/checks/language-filter.check.ts` (offline + `--live`) and `npx next build`
- **Phase gate:** full suite green, plus `route-smoke --verify`, plus the Studio human check below, before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `scripts/checks/translation.check.ts` (offline + `--live` + `--post-run` modes), following the header-comment and `node:assert` conventions of `scripts/checks/language-filter.check.ts`
- [ ] Synthetic Portable Text fixtures covering: a `code` block that does not exist in real data, `listItem: "number"`, `marks: ["code"]`, a `table` with multi-row `cells`, an `image` with `crop`/`hotspot`, and a `markDefs` link
- [ ] A **negative** fingerprint fixture, mutated in one field, demonstrated to fail (mirrors the 02-05 allowlist-probe discipline: prove the gate is live, do not just assert it exists)
- [ ] `package-lock.json` repaired so `npm ci --dry-run` exits 0
- [ ] Update the `postType.ts` 17-field tripwire in `language-filter.check.ts` if `sourceUpdatedAt` is added
- [ ] Artifact directory `.planning/phases/03-translation-pipeline/artifacts/` for run logs and batch state

### Human checks (cannot be automated)

Vercel previews sit behind SSO with no bypass secret, so these ride Saeid's authenticated Chrome:

1. `/studio` "Posts - Farsi" list shows the new draft, with the preview subtitle reading `fa of: <English title>` (the Phase 2 preview `prepare`).
2. Opening the draft shows Language = Farsi, Translation of = the English source, and a **read-only** Translation Notes field with the D-06 lines legible at a glance.
3. Farsi body renders right to left in the Studio editor, links are intact and clickable, images and tables are in their original positions.
4. Saeid reads the Farsi of one post end to end and judges the translation quality. **No automated check substitutes for this**, and it is the actual reason the pipeline writes drafts instead of published documents.
5. The seven Studio items carried over as OUTSTANDING from plan 02-05 get walked in the same session, since the Farsi list is now non-empty for the first time and items 3 and 6 are finally observable with real data.

## Security Domain

ASVS Level 1. This is a developer-operated CLI with no HTTP surface, no user input, and no session, so most categories do not engage. The ones that do:

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2 Authentication | No | No end users; the operator is Saeid at a terminal |
| V3 Session Management | No | No sessions |
| V4 Access Control | **Yes** | `SANITY_API_TOKEN` carries dataset write scope. The dataset is chosen by `--env-file` with no fallback, and the resolved dataset is printed before any write. Prod writes additionally sit behind the D-11 human gate. |
| V5 Input Validation | **Yes** | The model's output is untrusted by construction and is written into the content store. Two controls: `output_config.format` schema-constrains the shape, and the code-side structural fingerprint gate refuses the write on any structural deviation (D-05 tier 1). Neither is optional. |
| V6 Cryptography | No | No crypto is implemented. `crypto.randomUUID()` for document ids only. |
| V7 Error Handling and Logging | **Yes** | Never log `SANITY_API_TOKEN`, `ANTHROPIC_API_KEY`, or `DATABASE_URL`. Print only `projectId`, `dataset`, `apiVersion`, `mode`. Env files are gitignored (`.env`, `.env.*`) and must never be staged. |
| V14 Configuration | **Yes** | The lockfile repair changes what CI and Vercel install. Verify with `npm ci --dry-run` and `npx next build`, and keep the diff to the four documented bumps. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| Model output mutates document structure (keys, refs, hrefs) | Tampering | Code-side structural fingerprint diff, blocking, before any write (D-05 tier 1) |
| Model output injects a URL not present in the source | Tampering / Spoofing | `markDefs` are never sent to the model and are compared byte-for-byte by the fingerprint gate. The verify pass additionally reports URL drift. |
| Wrong-dataset write | Tampering | No env fallback, loud header line, prod banner, human gate (Phase 2 Pitfall 6 carried forward) |
| Farsi draft auto-published and emailed to every subscriber in English | Elevation of Privilege / Repudiation | D-12: never write `status: "scheduled"`. Second layer: the cron's client uses the default `published` perspective and cannot see drafts. Third layer: a source-text assertion that the script contains no `"scheduled"` literal. |
| Prompt injection via post body | Tampering | Low risk (all sources are Saeid's own reviewed content), and structurally contained: the model receives an array of strings and must return an array of strings of the same length; anything else fails the gate. Do not relax that. |
| Secret leakage into git or logs | Information Disclosure | Env files are gitignored; the script prints no secret; batch artifacts must contain document ids and token counts only, never env values |
| Token overspend from a runaway loop | Denial of Service (financial) | Dry-run default, `--slug` for the single-post gate, explicit `--execute`, and an up-front printed cost estimate before submission |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | Sanity Studio's `documentTypeList` resolves draft-only documents, so a `drafts.*` Farsi document appears in the "Posts - Farsi" list | Pattern 5 | If wrong, Saeid has no review surface and the phase's whole review model fails. Mitigated by the Studio human check being an explicit phase gate. Cheap to falsify early: create one draft in dev and look. |
| A2 | `ANTHROPIC_API_KEY` is present in at least one of the repo's env files | Environment Availability | The run cannot start. One-line check in the plan's first task. |
| A3 | `.env.vercel-prod` carries a `DATABASE_URL` | TokenUsage Integration | The prod proof run cannot satisfy success criterion 5 from that env file. |
| A4 | The dev database has the `TokenUsage` table and at least one `ADMIN` user | TokenUsage Integration | The dev rehearsal cannot exercise the spend path, so criterion 5 is only proven on prod. CONTEXT.md already flags this as needing verification. |
| A5 | Prompt caching produces meaningful hit rates inside a Batch API job at `ttl: "1h"` | Pattern 4, Pitfall 5 | Only a cost-estimate miss, not a correctness failure. The plan should **measure** `cache_read_input_tokens` rather than assume. |
| A6 | Sonnet 5 with `output_config.format` reliably returns exactly N strings for N input spans on the largest post (269 spans) | Pattern 1 | A length mismatch throws before any write, so the failure is safe and loud, but it would block that post. Mitigation: the schema can pin `minItems`/`maxItems` to N per request. |
| A7 | The registry state on the day Wave 0 runs still yields the same 4-package lock delta | Wave 0 | A larger delta means a framework moved. Mitigation is step 2 of the procedure: diff and stop if `next-sanity`, `sanity`, `next`, or `react` moved. |
| A8 | `custom_id` accepts a 72-character slug-derived string | Pattern 3 | Trivially falsifiable at batch-create time; fall back to a short hash if rejected. |

## Open Questions (RESOLVED)

1. **In-body reader-visible text that is not `span.text`: tables, image alt, video captions.** RESOLVED: CONTEXT.md D-13 (Saeid 2026-08-22) — walker extended to table cells, image/mainImage alt, video caption.
   - What we know: production has 10 `table` blocks with English `cells[]` strings, 61 `image.alt` strings (some 200+ characters of descriptive prose), 7 `mainImage.alt`, and 2 `video.caption`. All are reader-visible. `pt::text(body)` includes table text, so the glossary corpus already covers it. The success criterion says "only `span.text` translated"; D-07 enumerates title, description, and SEO fields but is silent on these.
   - What is unclear: whether Saeid wants a Farsi post shipping with an English comparison table and English alt text, or whether the walker should be extended.
   - Recommendation: **ask Saeid before planning task boundaries.** Recommended answer is to extend the walker to a small, explicit, code-enumerated list of translatable string paths (`table.rows[].cells[]`, `image.alt`, `video.caption`, `mainImage.alt`), each index-keyed and each still covered by the structural fingerprint gate, so the "code decides what is translatable" property is preserved. That is roughly 20 extra lines and it turns a visible defect into a non-issue. If Saeid prefers strict criterion compliance for this phase, the tables and alt text should be listed explicitly in `translationNotes` as known untranslated regions so a reviewer is not surprised.

2. **`--dry-run` versus the Phase 2 `--execute` default.** RESOLVED: CONTEXT.md D-14 — dry-run default, `--execute` writes, `--dry-run` kept as alias.
   - What we know: D-09 lists `--dry-run` as a flag, which implies writing is the default. `scripts/migrate-post-language.ts` states the opposite convention in its header, and D-09 also says to mirror that script.
   - Recommendation: keep dry-run as the **default**, accept `--dry-run` as an explicit no-op alias for readability, and require `--execute` to write. This satisfies both halves of D-09. Confirm in one line during planning.

3. **`featured` and `heroOrder` on Farsi drafts.** RESOLVED: CONTEXT.md D-15 — omitted entirely; Phase 4 decides Farsi hero curation.
   - What we know: `homePageQuery` selects hero posts by `defined(heroOrder)` and is now filtered to `EN_LANGUAGE`, so a Farsi document with a `heroOrder` cannot reach the English homepage today. But Phase 4 adds Farsi routes and will likely mirror those queries.
   - Recommendation: omit `featured` and `heroOrder` from the created draft entirely (rather than copying them), and let Phase 4 decide Farsi hero curation deliberately. Low cost now, avoids a surprise later.

4. **Whether the verify pass needs `output_config.effort`.** RESOLVED: Claude's Discretion per CONTEXT — left unset (defaults to high); settled in 03-08 Task 1.
   - What we know: `OutputConfig.effort` accepts `low | medium | high | max` in SDK 0.80.0, and Sonnet 5 additionally supports `xhigh`. The default is `high`.
   - Recommendation: leave it unset (defaults to `high`) for the verify pass, and consider `low` for the translate pass if cost matters, since translation is mechanical. Measure before tuning. Claude's discretion per CONTEXT.

## Sources

### Primary (HIGH confidence)

- `node_modules/@anthropic-ai/sdk@0.80.0` typings, read directly: `resources/messages/batches.d.ts` (batch surface, `BatchCreateParams.Request.params` type), `resources/messages/messages.d.ts` (`OutputConfig`, `JSONOutputFormat`, `cache_control`, the `Model` union), `helpers/zod.d.ts`, `helpers/json-schema.d.ts`
- `node_modules/@sanity/client@7.26.2` typings: `ClientPerspective` union, default-perspective changelog note at `v2025-02-19`, `createIfNotExists` / `createOrReplace` / `action` signatures
- Bundled `claude-api` skill (official Anthropic reference, cached 2026-06-24): `claude-sonnet-5` id and pricing, removal of sampling parameters / prefill / `budget_tokens`, Batch API semantics, prompt-caching prefix rules, `output_config.format`, `typescript/claude-api/batches.md`, `typescript/claude-api/tool-use.md`, `typescript/claude-api/README.md`
- Live read-only GROQ probes against `blog_posts` (26 docs) and `blog_posts_dev` (17 docs), 2026-08-22: complete block/span/markDef/field inventory, status distribution, sizing, `pt::text` corpus, sibling-query execution. Nothing was written.
- `npm ci --dry-run --ignore-scripts` at HEAD and in the working tree, plus an isolated `npm install --package-lock-only` repair with a full lock diff, 2026-08-22
- `npm view @sanity/visual-editing@3.0.5 dependencies`, `npm view @anthropic-ai/sdk version`, npm registry
- `gsd-tools query package-legitimacy check --ecosystem npm`, 2026-08-22
- Repo source read directly: `scripts/migrate-post-language.ts`, `scripts/checks/language-filter.check.ts`, `src/sanity/lib/queries.ts`, `src/sanity/lib/client.ts`, `src/sanity/env.ts`, `src/sanity/schemaTypes/postType.ts`, `src/sanity/schemaTypes/blockContentType.ts`, `src/lib/markdownToPortableText.ts`, `src/lib/prisma.ts`, `src/app/api/cron/publish-scheduled/route.ts`, `src/app/api/cv/extract/route.ts`, `src/app/api/cv/design/route.ts`, `src/app/api/v1/posts/route.ts`, `prisma/schema.prisma`, `package.json`, `package-lock.json`
- `.planning/`: `ROADMAP.md`, `STATE.md`, `phases/03-translation-pipeline/03-CONTEXT.md`, `phases/02-content-model/02-04-SUMMARY.md`, `phases/02-content-model/02-05-SUMMARY.md`
- Design spec section 3, `C:\Users\saeid\Desktop\Agent Simorgh\projects\2. NeuroNomixer\farsi edition\2026-08-11-farsi-edition-design.md`

### Secondary (MEDIUM confidence)

- Sanity Studio draft-list behaviour (assumption A1): inferred from `src/sanity/structure.ts` filters plus documented Studio semantics, not observed in a browser this session. The Phase 2 browser pass is still outstanding.

### Tertiary (LOW confidence)

- None. Every claim in this document is either read from installed source, executed live, or cited to the bundled official Anthropic reference.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH**. Versions read from installed `node_modules`, not from `package.json` ranges. No new dependency.
- Anthropic SDK surface: **HIGH**. Every capability confirmed in the installed `.d.ts`, not from memory. Sonnet 5 facts from the bundled official reference.
- Portable Text ground truth: **HIGH**. Enumerated exhaustively across all 43 documents in both datasets by live query.
- Sanity draft and perspective mechanics: **HIGH** for the perspective default and the select query (both verified); **MEDIUM** for the Studio rendering of a draft-only document (A1, needs the browser check).
- Lockfile diagnosis and repair: **HIGH**. Failure reproduced at HEAD and in the working tree; repair executed and verified green in an isolated copy with a full diff.
- TokenUsage integration: **HIGH** for the model shape and the copy-from writers; **MEDIUM** for dev-DB parity (A3, A4).
- Pitfalls: **HIGH**. Each is grounded in a specific verified fact rather than in general experience.

**Research date:** 2026-08-22
**Valid until:** 2026-09-21 for the Sanity and repo findings. **2026-08-31 for the Sonnet 5 intro pricing**, which reverts to $3.00 / $15.00 per MTok after that date. Re-verify the lock delta on the day Wave 0 runs (A7).
