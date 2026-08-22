# Phase 3: Translation Pipeline - Pattern Map

**Mapped:** 2026-08-22
**Files analyzed:** 10 new/modified
**Analogs found:** 8 / 10

Scope note: RESEARCH.md already grounds every API surface (SDK 0.80.0, GROQ select, TokenUsage schema, perspective mechanics). This document does not re-derive any of that. It answers one question only: **which existing file does each new file copy its shape from, and what exactly is copied.**

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scripts/translate-posts.ts` | CLI script | batch / transform | `scripts/migrate-post-language.ts` | exact (role + flow) |
| `scripts/lib/portable-text-walk.ts` | utility (pure) | transform | `src/lib/sharedPdfs.ts` helpers (pure, check-backed) | role-match |
| `scripts/lib/glossary.ts` | utility (config load) | file-I/O | `scripts/fix-title-suffix.ts` (fs read, no dep) | partial |
| `scripts/lib/translation-notes.ts` | utility (pure format) | transform | `src/lib/sharedPdfs.ts` `slugifyFilename` | role-match |
| `scripts/checks/translation.check.ts` | test/check | request-response (offline + `--live`) | `scripts/checks/language-filter.check.ts` | exact |
| `scripts/mine-glossary-terms.ts` | one-off script | batch / file-I/O | `scripts/add-range-aria-labels.ts` | role-match |
| `content/fa-glossary.json` | config data | file-I/O | none in repo | **no analog** |
| `content/fa-glossary-review.html` | doc artifact | file-I/O | none in repo | **no analog** |
| `src/sanity/lib/queries.ts` (MODIFY) | query module | CRUD (read) | itself, lines 13-29 + 31-45 | exact |
| `src/sanity/schemaTypes/postType.ts` (MODIFY) | model/schema | n/a | itself, lines 121-165 | exact |
| `package-lock.json` (MODIFY) | config | n/a | n/a (npm CLI owns it) | n/a |

Two second-order edits fall out of the schema change and must be planned together, not discovered at the gate:
- `scripts/checks/language-filter.check.ts` line 313 `EXPECTED_FIELD_COUNT = 17` -> 18 (if `sourceUpdatedAt` is added per RESEARCH staleness option A).
- Any new file under `src/` containing the text `language ==` breaks assertion H (line 285-299, closed three-file allowlist). The pipeline select query goes in `queries.ts`, nowhere else.

---

## Pattern Assignments

### `scripts/translate-posts.ts` (CLI script, batch/transform)

**Analog:** `scripts/migrate-post-language.ts` (101 lines, read in full). This is a structural sibling, not a loose inspiration. Copy the file's skeleton and replace the middle.

**Header docblock pattern** (lines 1-20) — copy the *shape*: purpose, the dry-run-is-default sentence, one invocation line per env target, and the paragraph explaining why the header prints:

```typescript
/**
 * One-off migration: stamp `language: "en"` on every post document that lacks it.
 *
 * Dry run is the DEFAULT. There is no flag that turns it on. Mutation requires --execute.
 *
 * Dry run (dev dataset):
 *   npx tsx --env-file .env.local scripts/migrate-post-language.ts
 * Execute (dev dataset):
 *   npx tsx --env-file .env.local scripts/migrate-post-language.ts --execute
 * Execute (PRODUCTION dataset, only on Saeid's explicit in-session go, D-09):
 *   npx tsx --env-file .env.vercel-prod scripts/migrate-post-language.ts --execute
 */
```

This docblock is also the D-14 evidence: the existing script's own words are "Dry run is the DEFAULT. There is no flag that turns it on."

**Env + client construction** (lines 22-45) — copy verbatim, including both comments. The no-fallback rule and `perspective: "raw"` are the two load-bearing lines:

```typescript
import { createClient } from "@sanity/client";

const PRODUCTION_DATASET = "blog_posts";

const execute = process.argv.includes("--execute");

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
// No fallback dataset string on purpose. `production` is not a dataset in this
// project, and a silent default is exactly how a migration stamps the wrong one.
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!;
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2025-10-07";

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  // Raw, not the default published perspective: a draft post must be stamped too.
  perspective: "raw",
});
```

**Flag parsing pattern** (line 27): flags are `process.argv.includes("--x")`, no arg-parsing library. `--slug <x>` is the one flag needing a value; follow the same minimal style (`const i = process.argv.indexOf("--slug"); const slug = i === -1 ? null : process.argv[i + 1]`). Note `language-filter.check.ts:479` uses the slightly richer `const argv = process.argv.slice(2)` form when there are several flags; either is in-convention.

**Loud header + production warning** (lines 50-56) — copy verbatim, adapting the prefix:

```typescript
  // Operator read-back defence, printed before any read or write.
  console.log(
    `migrate-post-language: projectId=${projectId} dataset=${dataset} apiVersion=${apiVersion} mode=${execute ? "EXECUTE" : "DRY RUN"}`,
  );
  if (execute && dataset === PRODUCTION_DATASET) {
    console.log("!! TARGET IS THE PRODUCTION DATASET !!");
  }
```

**Dry-run body pattern** (lines 72-83) — the analog does something better than printing: it fires exactly one server-validated `commit({ dryRun: true })` to prove the token carries write scope *before* any loop starts partial writes. The translation pipeline should keep this property (a `createIfNotExists` with `dryRun: true` against the prepared draft), because a token-scope failure discovered after a paid Batch API run is the expensive version of the same bug:

```typescript
  if (!execute) {
    // Exactly one server-validated commit that persists nothing. This is also the
    // probe that proves the token carries write scope BEFORE any loop starts
    // making partial writes (research assumption A1).
    await client
      .patch(rows[0]!._id)
      .setIfMissing({ language: EN })
      .commit({ dryRun: true });
    console.log("DRY RUN: mutation validated server-side, nothing written.");
    console.log(`Re-run with --execute to apply: npx tsx --env-file <env> scripts/migrate-post-language.ts --execute`);
    return;
  }
```

**Post-write verification pattern** (lines 93-94): the analog re-queries after mutating and prints the residual count rather than trusting its own success line. Mirror it: after writing N drafts, re-count `language == "fa"` under the raw perspective and print it.

**Error handling / exit** (lines 97-100) — copy verbatim. This is the repo's only script error convention:

```typescript
main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
```

**Row typing** (line 47): a local `type Row = {...}` next to the query, not a shared types module. Keep that.

**Do NOT copy from `src/app/api/cv/extract/route.ts`:** its fence-stripping (`first.text.replace(/^```[a-z]*\n?/, "")`) and its fire-and-forget `.catch` on the TokenUsage write are both explicitly wrong here (RESEARCH "Don't Hand-Roll" + TokenUsage section).

---

### TokenUsage recording inside `scripts/translate-posts.ts`

**Analogs:** two writers, and the phase needs the *shape* of one and the *awaiting* of neither.

`src/app/api/cv/extract/route.ts:233-243` — the single-call shape and the field mapping (copy the field mapping, drop the fire-and-forget):

```typescript
    // Log token usage (fire-and-forget — don't block the response)
    prisma.tokenUsage.create({
      data: {
        userId: session.user.id!,
        activity: "cv-extract",
        model: "claude-haiku-4-5-20251001",
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        totalTokens: message.usage.input_tokens + message.usage.output_tokens,
      },
    }).catch((err) => console.error("[cv/extract] token log error:", err));
```

`src/app/api/cv/design/route.ts:338-348` — **this is the closer analog** for a batch of N posts: `createMany` with one row per model call, and it is `await`ed:

```typescript
  // Log token usage — one row per Claude call (3 per generation)
  await prisma.tokenUsage.createMany({
    data: designs.map((d) => ({
      userId,
      activity: "cv-design",
      model: "claude-sonnet-4-6",
      inputTokens: d.inputTokens,
      outputTokens: d.outputTokens,
      totalTokens: d.inputTokens + d.outputTokens,
    })),
  });
```

Copy this one, with `activity: "translate-post"` / `"translate-verify"` and `model: "claude-sonnet-5"`.

**Prisma client construction** — the script imports `src/lib/prisma.ts`; there is no script-local Prisma pattern to copy and none should be invented. The module reads `DATABASE_URL` at construction time, which is exactly why the `--env-file` choice controls both Sanity and Postgres targets:

```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}
const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? createPrismaClient();
```

`userId` has no session analog in this repo. There is no existing CLI writer of `TokenUsage` — the ADMIN-resolution lookup in RESEARCH is new code with no precedent to copy.

---

### `scripts/checks/translation.check.ts` (check script, offline + `--live`)

**Analog:** `scripts/checks/language-filter.check.ts` (689 lines; read in full). Second analog for the minimal end of the range: `scripts/checks/shared-pdfs-lib.check.ts` (23 lines) — pure-helper assertions with no env and no network, which is exactly the shape of the walker round-trip assertions.

**Header + run-line docblock** (language-filter lines 1-6):

```typescript
/**
 * Logic + fidelity checks for the English-language filter ...
 * Run: npx tsx scripts/checks/language-filter.check.ts | live: npx tsx --env-file .env.local scripts/checks/language-filter.check.ts --live
 * The offline section needs no env and no network. Only --live / --post-migration touch the Content Lake, read-only.
 */
import assert from "node:assert";
```

**Two-section split pattern** (lines 479-488 + 683-688) — offline assertions run unconditionally at module top level; the live section is a function gated on a flag and only invoked at the bottom:

```typescript
const argv = process.argv.slice(2);
const wantsLive = argv.includes("--live") || argv.includes("--post-migration");

if (!wantsLive) {
  console.log("language-filter.check.ts: ALL PASS");
}
// ... async function runLive(): Promise<void> { ... }
if (wantsLive) {
  runLive().catch((err: unknown) => { console.error(err); process.exit(1); });
}
```

**Live-section client** (lines 529-547): a *second*, separately constructed client inside `runLive`, with the same no-fallback env reads plus explicit `assert.ok` on each:

```typescript
  const { createClient } = await import("@sanity/client");
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
  // No fallback dataset string on purpose ...
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!;
  assert.ok(dataset, "NEXT_PUBLIC_SANITY_DATASET is required for a live run and has no default");
```

Note lines 655-662: when the check needs to see drafts it builds a **third** client with `perspective: "raw"` rather than changing the first, with a comment saying why. The translation check needs the raw client for sibling assertions and should follow the same "one client per perspective, commented" rule.

**Assertion message style** (throughout) — every `assert` carries a message that states expected vs actual AND the remedy. Copy this tone; it is the repo's substitute for a test framework:

```typescript
assert.strictEqual(
  schemaFields.length,
  EXPECTED_FIELD_COUNT,
  `${POST_TYPE_PATH} has ${schemaFields.length} fields, expected ${EXPECTED_FIELD_COUNT}. If a field was added on purpose, update this count and say why in the plan.\n  found: ${schemaFields.map((f) => f.name as string).join(", ")}`,
);
```

**Deliberate-tripwire pattern** (lines 311-318, plus the closed-allowlist comment at 276-284): when a count or a list is asserted, the comment explains that a failure is a *signal*, not bookkeeping. The structural-fingerprint check should be written the same way.

**Final line convention** (line 475-477, 680): a single summary `console.log` with real counts, then `<file>: ALL PASS`.

**Anti-vacuity pattern** (lines 594-603, 576-578): before asserting parity, the check asserts that the manipulated input actually differs from the original, so a no-op transformation cannot pass silently. The fingerprint round-trip needs the same guard — assert that `extractSpans` returned a non-empty array before asserting `applySpans` restored it.

---

### `scripts/lib/portable-text-walk.ts`, `translation-notes.ts`, `glossary.ts` (pure utilities)

There is **no `scripts/lib/` directory today** — this is a new directory. The nearest convention for "pure helper backed by a check script" is `src/lib/sharedPdfs.ts` + `scripts/checks/shared-pdfs-lib.check.ts`:

```typescript
/**
 * Logic checks for src/lib/sharedPdfs.ts. Run: npx tsx scripts/checks/shared-pdfs-lib.check.ts
 * DB-free: only pure helpers are checked here; getActiveShare is exercised in manual verification.
 */
import assert from "node:assert";
import { generateShareToken, slugifyFilename } from "../../src/lib/sharedPdfs";
```

Two things to carry over: the check imports helpers by **named export** across a `../../` relative path (the scripts tree does not use the `@/` alias — see `language-filter.check.ts:25` importing `"../../src/sanity/lib/queries"`), and the docblock states what is *not* covered offline.

**Filesystem read pattern for the glossary** — `scripts/fix-title-suffix.ts:7` and `add-range-aria-labels.ts:19` both use bare `node:fs` sync APIs with a stated "glob is not a dependency" reason:

```typescript
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";
```

`language-filter.check.ts:7-9` uses the prefixed form (`node:assert`, `node:fs`, `node:path`). Prefer the **prefixed** form for new files; it is the more recent convention (Phase 2) and both are present.

---

### `scripts/mine-glossary-terms.ts` (one-off script, batch)

**Analog:** `scripts/add-range-aria-labels.ts` — the repo's template for a one-off with a report mode.

**Report-vs-apply flag** (lines 17-22):

```typescript
/**
 * Usage:  npx tsx scripts/add-range-aria-labels.ts           (apply)
 *         npx tsx scripts/add-range-aria-labels.ts --check    (report only)
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = "src/components/VisualGuides";
const CHECK = process.argv.includes("--check");
```

Also note its docblock explains *why the naive regex approach was rejected*. Glossary mining has the same character (frequency counting over `pt::text` output has obvious wrong ways to do it), and the docblock should carry that reasoning.

---

### `src/sanity/lib/queries.ts` (MODIFY — add the pipeline select query)

**Analog:** the file itself. Three conventions bind here.

**Module docblock warning** (lines 1-11) — this file declares itself server-only and declares its predicates non-unifiable. A new pipeline query must not "tidy" the existing four status variants:

```typescript
/**
 * The only home for public post GROQ.
 *
 * Server-only. These constants are consumed by server components, route handlers
 * and metadata routes. Never import this module from a client component.
 *
 * The status predicates below are FOUR deliberate variants lifted verbatim from
 * the call sites: tolerant, strict, approved-only, and none-at-all ...
 * They must not be unified.
 */
```

**Fragment reuse by interpolation** (lines 23-29, 35):

```typescript
export const EN_LANGUAGE = `(!defined(language) || language == "en")`;
export const STATUS_APPROVED = `status == "approved"`;

export const blogIndexQuery = `{
  "posts": *[_type == "post" && ${EN_LANGUAGE} && ${STATUS_TOLERANT}] | order(featured desc, publishedAt desc) {
```

The new select query interpolates `EN_LANGUAGE` and `STATUS_APPROVED` rather than retyping either literal.

**Hard constraint from the check script** (`language-filter.check.ts:198-212`): the interpolation allowlist is closed to exactly four identifier names. Any runtime value in the new query must be a GROQ `$param`, never a template interpolation, or assertion D fails:

```typescript
const ALLOWED_INTERPOLATIONS: readonly string[] = [
  "EN_LANGUAGE", "STATUS_TOLERANT", "STATUS_STRICT", "STATUS_APPROVED",
];
```

So `--slug` must arrive as `$slug`. This also means the new query is subject to assertion B/C only if it is added to the `QUERIES` array in the check; adding it there requires supplying its expected counts. Decide that deliberately in the plan.

Line 21-22 already anticipates this phase: *"The Farsi counterpart is deliberately NOT defined here yet. Phase 4 adds it as a sibling one-liner."* A `fa`-side read predicate is Phase 4, not Phase 3. Phase 3 only needs the EN-source select.

---

### `src/sanity/schemaTypes/postType.ts` (MODIFY — optional `sourceUpdatedAt`)

**Analog:** the three Phase-2 fields already in this file (lines 121-165), which were written for exactly this pipeline.

`translationNotes` (lines 157-165) is the closest shape for a new pipeline-written field: `readOnly: true` plus a description that names the writer.

```typescript
    defineField({
      name: "translationNotes",
      title: "Translation Notes",
      type: "text",
      rows: 6,
      readOnly: true,
      description:
        "Findings from the pipeline's verify pass. Written by the translation script, not by hand.",
    }),
```

`translationOf` (lines 136-156) shows the comment style for a non-obvious mechanism (the resolver-form filter and why `filterParams` is unusable):

```typescript
      options: {
        // Resolver form, because the predicate depends on the current document
        // (self-exclusion). filterParams is typed `never` in this form, so the
        // params come back from the resolver instead.
        filter: ({ document }) => {
          const publishedId = document._id.replace(/^drafts\./, "");
          return {
            filter: '(!defined(language) || language == "en") && !(_id in [$self, $selfDraft])',
            params: { self: publishedId, selfDraft: `drafts.${publishedId}` },
          };
        },
        disableNew: true,
      },
```

Note line 150 is the fourth in-repo copy of the English predicate text and it is inside the allowlisted `postType.ts`. Do not add a fifth carrier.

**Coupled edit:** adding `sourceUpdatedAt` makes `schemaFields.length` 18, so `language-filter.check.ts:313` must move from 17 to 18 in the same task, with the reason stated — the check's own message demands it ("If a field was added on purpose, update this count and say why in the plan").

---

## Shared Patterns

### Dataset safety (applies to every script and check that touches Sanity)
**Source:** `scripts/migrate-post-language.ts:29-33, 50-56`; restated in `scripts/checks/language-filter.check.ts:531-539`
**Apply to:** `translate-posts.ts`, `translation.check.ts`, `mine-glossary-terms.ts`
Four rules, all present in both analogs: no `??` fallback on the dataset; a header line printed before the first read or write; a `!! TARGET IS THE PRODUCTION DATASET !!` line when mutating `blog_posts`; and never log the token or the env contents (the check's line 551 comment says so explicitly).

### Perspective discipline
**Source:** `scripts/migrate-post-language.ts:41-44` and `language-filter.check.ts:648-662`
**Apply to:** every client the pipeline constructs
One client per perspective, each with a comment saying which surface it models. The default-perspective client models what the app sees; `perspective: "raw"` is required to see drafts. Do not flip a shared client's perspective mid-script.

### Script error handling and exit
**Source:** `scripts/migrate-post-language.ts:97-100`, `language-filter.check.ts:684-687`
**Apply to:** every new script
```typescript
main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
```
`err: unknown` is explicit in both. No try/catch-and-continue at the top level; per-post failure handling belongs inside `main`.

### Verification instead of tests
**Source:** `scripts/checks/*.check.ts`
**Apply to:** all new logic in this phase
`node:assert` at module top level, message-rich assertions, a counted summary line, and a terminating `<file>: ALL PASS`. Do not add vitest.

### Comment-the-why, not the what
**Source:** `migrate-post-language.ts:30-31, 41-43, 73-75`; `queries.ts:1-22`; `postType.ts:143-145`; `language-filter.check.ts:106-108, 276-284`
**Apply to:** everything
This codebase's Phase-2 files carry short comments that explain the *trap being avoided* (silent dataset default, published-perspective blindness, a test importing the value it tests). New Phase-3 code that omits these will read as inconsistent with the surrounding files.

### Relative imports in the scripts tree
**Source:** `language-filter.check.ts:25-26`, `shared-pdfs-lib.check.ts:6`
**Apply to:** `scripts/lib/*` and `scripts/checks/translation.check.ts`
Scripts import `src/` code by relative path (`../../src/sanity/lib/queries`), not the `@/` alias.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `content/fa-glossary.json` | config data | file-I/O | No `content/` directory exists and no version-controlled JSON data file is read at runtime anywhere in the repo. Schema is Claude's discretion per CONTEXT; RESEARCH Pattern 4 constrains it (byte-stable, sorted keys, no timestamps). |
| `content/fa-glossary-review.html` | doc artifact | file-I/O | No `<!DOCTYPE html>` generator exists under `scripts/` or `src/lib/`. The convention is Saeid's global spec-HTML-companion preference, not an in-repo pattern. Planner should follow prior companion artifacts in the Simorgh vault, not invent a repo pattern. |
| Anthropic **Batch API** usage | service call | batch | Both existing call sites (`api/cv/extract`, `api/cv/design`) use synchronous `messages.create`. Nothing in this repo has ever called `messages.batches`, used `output_config`, or used `cache_control`. RESEARCH's SDK section is the reference, not any repo file. Explicitly do NOT copy the extract route's markdown-fence stripping or its assistant-prefill-adjacent JSON coaxing. |
| CLI resolution of a `TokenUsage.userId` | data access | CRUD | Both existing writers take `userId` from an authenticated session. No script has ever written `TokenUsage`. The ADMIN lookup is new code. |
| `package-lock.json` repair | config | n/a | Owned by `npm install --package-lock-only`; no file pattern to copy. |

## Metadata

**Analog search scope:** `scripts/`, `scripts/checks/`, `src/sanity/lib/`, `src/sanity/schemaTypes/`, `src/app/api/cv/`, `src/lib/`
**Files read in full:** `scripts/migrate-post-language.ts`, `scripts/checks/language-filter.check.ts`, `scripts/checks/shared-pdfs-lib.check.ts`, `src/lib/prisma.ts`
**Files read in part:** `src/sanity/lib/queries.ts` (1-70), `src/sanity/schemaTypes/postType.ts` (113-172), `src/app/api/cv/extract/route.ts` (180-254), `src/app/api/cv/design/route.ts` (300-354), `scripts/fix-title-suffix.ts` (1-40), `scripts/add-range-aria-labels.ts` (1-35)
**Pattern extraction date:** 2026-08-22
