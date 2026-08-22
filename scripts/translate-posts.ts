/**
 * The Farsi translation pipeline CLI (PIPE-01): select approved English posts, translate
 * them, and write each result as a Farsi sibling DRAFT that a human publishes by hand.
 *
 * Dry run is the DEFAULT. There is no flag that turns it on. Writing requires --execute.
 *
 * Dry run, default selection (dev dataset):
 *   npx tsx --env-file .env.local scripts/translate-posts.ts
 * Dry run, whole backlog (dev dataset):
 *   npx tsx --env-file .env.local scripts/translate-posts.ts --all
 * Dry run against the production dataset, which reads and never writes:
 *   npx tsx --env-file .env.vercel-prod scripts/translate-posts.ts --all
 * Execute one post (dev dataset):
 *   npx tsx --env-file .env.local scripts/translate-posts.ts --slug <slug> --execute
 * Execute against the PRODUCTION dataset, only on Saeid's explicit in-session go (D-11):
 *   npx tsx --env-file .env.vercel-prod scripts/translate-posts.ts --all --execute
 *
 * Flags, all of them optional:
 *   --slug <value>     target exactly one post (D-09; the phase success gate uses this)
 *   --all              required before --execute will process more than one post
 *   --retranslate      the only way a stale or existing Farsi sibling enters the working set (D-08)
 *   --execute          the only way anything is written (D-14)
 *   --dry-run          an explicit alias for the default, accepted for readability, a no-op
 *   --resume <batch-id>  reattach to an already-created batch instead of re-spending tokens
 *
 * The resolved projectId, dataset, apiVersion and mode print as the FIRST line, before any
 * read and before any write. The two datasets here are `blog_posts` (production) and
 * `blog_posts_dev` (dev), they differ by one suffix, and the choice is made entirely by
 * which --env-file the operator passed. Without that read-back a wrong-dataset run prints a
 * confident success message about the wrong content lake (research Pitfall 2). A mutating
 * run against production prints a second, louder line on top of it.
 *
 * No credential, connection string or other environment value is ever printed here.
 */

import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { createClient } from "@sanity/client";

// Relative paths, not the `@/` alias: the scripts tree does not use it.
import type { Body, Translatable } from "./lib/portable-text-walk";
import { extractTranslatables, structuralFingerprint } from "./lib/portable-text-walk";
import { translationCandidatesQuery, translationStaleQuery } from "../src/sanity/lib/queries";

const PRODUCTION_DATASET = "blog_posts";
const ARTIFACT_DIR = ".planning/phases/03-translation-pipeline/artifacts";

// ── Flags ────────────────────────────────────────────────────────────────────
// process.argv plus includes/indexOf, no argument-parsing library, matching
// scripts/migrate-post-language.ts and scripts/checks/language-filter.check.ts.
const argv = process.argv.slice(2);

/** The value that follows `name`, or null when `name` was not passed. */
function flagValue(name: string): string | null {
  const at = argv.indexOf(name);
  if (at === -1) return null;
  const value = argv[at + 1];
  if (value === undefined || value.startsWith("--")) {
    console.error(`${name} needs a value: ${name} <value>. Nothing was read and nothing was written.`);
    process.exit(1);
  }
  return value;
}

const slugArg = flagValue("--slug");
const resumeArg = flagValue("--resume");
const all = argv.includes("--all");
const retranslate = argv.includes("--retranslate");
const execute = argv.includes("--execute");
const dryRunAlias = argv.includes("--dry-run");

// D-14: --dry-run is an alias for a default that is already dry, so pairing it with
// --execute states two opposite intentions in one command. There is no defensible
// reading of that combination, so it is refused rather than silently resolved.
if (dryRunAlias && execute) {
  console.error(
    "--dry-run and --execute conflict: --dry-run is only an explicit alias for the default, which already writes nothing, and --execute is the one flag that writes. " +
      "Pass exactly one of them, or neither. Nothing was read and nothing was written.",
  );
  process.exit(1);
}

// ── Client ───────────────────────────────────────────────────────────────────
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
// No fallback dataset string on purpose. `production` is not a dataset in this
// project, and a silent default is exactly how a script writes to the wrong dataset.
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!;
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2025-10-07";

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  // Raw, not the default published perspective. Farsi siblings exist only as drafts, and
  // the published perspective cannot see a `drafts.` document at all, so the sibling count
  // in the selection query would come back 0 for every post and the pipeline would happily
  // re-translate the entire backlog on every run. This one line is the whole ballgame.
  perspective: "raw",
});

// ── Selection ────────────────────────────────────────────────────────────────
// Local types declared next to the fetch rather than in a shared module, matching
// scripts/migrate-post-language.ts. Each field below is in the query's projection.

/** One approved English post, exactly as `translationCandidatesQuery` projects it. */
type SourcePost = {
  _id: string;
  _updatedAt: string;
  title?: string;
  description?: string;
  metaDescription?: string;
  slug?: string;
  publishedAt?: string;
  category?: unknown;
  author?: unknown;
  mainImage?: { alt?: string; [key: string]: unknown };
  body?: Body;
};

/** A source post that already has a Farsi sibling, as `translationStaleQuery` projects it. */
type StaleRow = SourcePost & {
  sibling: { _id: string; sourceUpdatedAt: string | null } | null;
};

/** Why a post is in the working set, which decides how the plan block labels it. */
type WorkItem = {
  post: SourcePost;
  reason: "new" | "stale" | "forced";
  existingSiblingId: string | null;
};

/**
 * D-08 staleness, decided by the source timestamp the sibling recorded at translation time
 * and never by comparing the two documents' `_updatedAt` values, which Saeid editing the
 * Farsi draft would invert into "permanently fresh".
 *
 * A sibling with no recorded `sourceUpdatedAt` counts as stale: that is a sibling written
 * before the field existed, and unknown has to read as stale rather than as fresh.
 */
function isStale(row: StaleRow): boolean {
  const recorded = row.sibling?.sourceUpdatedAt ?? null;
  if (recorded === null) return true;
  return Date.parse(row._updatedAt) > Date.parse(recorded);
}

function describe(post: SourcePost): string {
  return `${post.slug ?? "(no slug)"}  ${post._id}`;
}

/**
 * Why a --slug run can come up empty. Printed on both empty paths, because an operator who
 * typed a slug and got nothing needs the same three answers either way.
 */
const SLUG_MISS_REASONS =
  "A --slug run selects nothing for one of three reasons:\n" +
  '  1. the post is not approved: the pipeline reads status "approved" only\n' +
  '  2. the post is not English: it must carry no language field, or language "en"\n' +
  "  3. the post already has a Farsi sibling that is not stale, and --retranslate was not passed\n" +
  "  (a slug that exists in no document at all in this dataset lands here too)";

// ── Extraction and cost ──────────────────────────────────────────────────────

/** One document-level translatable string. `label` is what the verify pass names it by. */
type FieldItem = { label: string; text: string };

/** Everything the pipeline needs about one post, computed before any model is involved. */
type TranslationUnit = {
  item: WorkItem;
  bodyItems: Translatable[];
  fieldItems: FieldItem[];
  /**
   * The D-05 tier 1 gate value, captured here and carried forward, so plan 03-08 compares
   * the translated body against a fingerprint taken before any model saw the document.
   */
  sourceFingerprint: string;
  translatableChars: number;
};

/**
 * The document-level translatable strings, enumerated by code in a fixed order (D-07).
 *
 * Slug, category, author, publishedAt and the images themselves are carried over untouched:
 * the slug is reused verbatim per the design spec, and a reference or an asset has no prose
 * in it to translate. `mainImage.alt` does, so it is here, next to the body's image alts.
 */
function fieldItemsOf(post: SourcePost): FieldItem[] {
  const items: FieldItem[] = [];
  if (post.title) items.push({ label: "title", text: post.title });
  if (post.description) items.push({ label: "description", text: post.description });
  if (post.metaDescription) items.push({ label: "metaDescription", text: post.metaDescription });
  if (typeof post.mainImage?.alt === "string" && post.mainImage.alt !== "") {
    items.push({ label: "mainImage.alt", text: post.mainImage.alt });
  }
  return items;
}

function toUnit(item: WorkItem): TranslationUnit {
  const body = item.post.body ?? [];
  const bodyItems = extractTranslatables(body);
  const fieldItems = fieldItemsOf(item.post);
  const chars =
    bodyItems.reduce((sum, t) => sum + t.text.length, 0) +
    fieldItems.reduce((sum, f) => sum + f.text.length, 0);
  return {
    item,
    bodyItems,
    fieldItems,
    sourceFingerprint: structuralFingerprint(body),
    translatableChars: chars,
  };
}

function countByKind(items: readonly Translatable[]): Record<Translatable["kind"], number> {
  const counts: Record<Translatable["kind"], number> = { span: 0, alt: 0, caption: 0, cell: 0 };
  for (const item of items) counts[item.kind] += 1;
  return counts;
}

// Cost model. Every number below is an ASSUMPTION and is printed as one, because an
// estimate that hides its inputs is a number nobody can argue with before spending money.
// The Sonnet 5 intro rate is $2.00 / $10.00 per MTok and expires 2026-08-31, reverting to
// $3.00 / $15.00. The batch surface halves whichever one applies.
const INTRO_RATE_LAST_DAY = "2026-08-31";
const BATCH_RATES = {
  intro: { input: 1.0, output: 5.0 },
  standard: { input: 1.5, output: 7.5 },
} as const;
/** English source, the usual rule of thumb. */
const CHARS_PER_TOKEN = 4;
/**
 * Farsi output tokens per English input token. Persian tokenizes less densely than English,
 * and this is deliberately set high so the printed figure reads as a ceiling, not a floor.
 */
const FARSI_OUTPUT_MULTIPLIER = 2;
/** The cached glossary system block plus the per-request task framing, per request. */
const REQUEST_OVERHEAD_TOKENS = 4000;
/** The verify pass returns a compact findings object, not prose. */
const VERIFY_OUTPUT_TOKENS = 600;

type Estimate = { inputTokens: number; outputTokens: number };

/**
 * Both passes for one post: translate (source in, Farsi out) then verify (source plus the
 * Farsi rendering in, a findings object out).
 */
function estimate(unit: TranslationUnit): Estimate {
  const sourceTokens = Math.ceil(unit.translatableChars / CHARS_PER_TOKEN);
  const farsiTokens = Math.ceil(sourceTokens * FARSI_OUTPUT_MULTIPLIER);
  return {
    inputTokens: sourceTokens + REQUEST_OVERHEAD_TOKENS + (sourceTokens + farsiTokens + REQUEST_OVERHEAD_TOKENS),
    outputTokens: farsiTokens + VERIFY_OUTPUT_TOKENS,
  };
}

function dollars(tokens: number, perMTok: number): number {
  return (tokens / 1_000_000) * perMTok;
}

/** `Rule.warning(...).max(160)` on metaDescription, so a longer Farsi rendering shows a badge. */
const META_DESCRIPTION_WARN_AT = 160;
const META_DESCRIPTION_NOTE_AT = 140;

let databaseWasOpened = false;

/**
 * The id of the ADMIN user that token spend will be booked against.
 *
 * Imported lazily and only from here, because src/lib/prisma.ts builds its Postgres adapter
 * at module load: a top-level import would make a Sanity-only dry run fail on an unreachable
 * database. Same lazy-import convention as scripts/checks/env-preflight.check.ts.
 */
async function resolveAdmin(): Promise<string> {
  const { resolveAdminUserId } = await import("./lib/token-usage");
  databaseWasOpened = true;
  return resolveAdminUserId();
}

/** Close the Postgres pool, but only if something actually opened it. */
async function releaseDatabase(): Promise<void> {
  if (!databaseWasOpened) return;
  const { prisma } = await import("../src/lib/prisma");
  await prisma.$disconnect();
}

// ── Run state ────────────────────────────────────────────────────────────────

/**
 * A digest of the structural fingerprint rather than the fingerprint itself.
 *
 * The fingerprint is the whole body serialized with every translatable slot blanked, so for
 * the production backlog it is hundreds of kilobytes of document structure, and this file
 * lands in a version-controlled planning directory. Equality is the only thing plan 03-08
 * asks of it, and a digest answers equality exactly. The full strings stay in memory, where
 * a mismatch can still be diffed.
 */
function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Ids, labels, counts and digests. No prose, no environment value, no credential. */
type RunState = {
  script: "translate-posts";
  mode: "dry-run";
  createdAt: string;
  projectId: string;
  dataset: string;
  apiVersion: string;
  flags: { slug: string | null; all: boolean; retranslate: boolean; resume: string | null };
  adminResolved: boolean;
  totals: {
    posts: number;
    bodyItems: number;
    fieldItems: number;
    translatableChars: number;
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
    estimatedCostUsd: number;
  };
  posts: Array<{
    _id: string;
    slug: string | null;
    reason: WorkItem["reason"];
    existingSiblingId: string | null;
    bodyItemsByKind: Record<Translatable["kind"], number>;
    bodyLabels: string[];
    fieldLabels: string[];
    translatableChars: number;
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
    sourceFingerprintSha256: string;
  }>;
};

function writeRunState(state: RunState): string {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  // ISO 8601 with the colons swapped for dashes: `:` is not a legal Windows filename character.
  const path = join(ARTIFACT_DIR, `${state.dataset}-${state.createdAt.replace(/:/g, "-")}.json`);
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return path;
}

/**
 * The Farsi draft document as it will be shaped, with the English strings still in place.
 *
 * Used here only as the payload of the server-validated mutation that persists nothing, so
 * the shape itself is what gets checked. Plan 03-08 swaps the translated strings in.
 */
function draftShell(post: SourcePost): { _id: string; _type: string; [key: string]: unknown } {
  return {
    // A `drafts.` id prefix is the whole of what makes a Sanity document a draft.
    _id: `drafts.${randomUUID()}`,
    _type: "post",
    language: "fa",
    translationOf: { _type: "reference", _ref: post._id },
    // D-12: never "scheduled". api/cron/publish-scheduled is unfiltered by language, and it
    // would patch a Farsi document to approved and mail every subscriber an English subject.
    status: "draft",
    title: post.title ?? "",
    // The slug is reused verbatim per the design spec; the projection flattened it to a
    // string, so the slug object has to be rebuilt here.
    ...(post.slug === undefined ? {} : { slug: { _type: "slug", current: post.slug } }),
    ...(post.description === undefined ? {} : { description: post.description }),
    ...(post.metaDescription === undefined ? {} : { metaDescription: post.metaDescription }),
    ...(post.category === undefined ? {} : { category: post.category }),
    ...(post.author === undefined ? {} : { author: post.author }),
    ...(post.mainImage === undefined ? {} : { mainImage: post.mainImage }),
    ...(post.publishedAt === undefined ? {} : { publishedAt: post.publishedAt }),
    body: post.body ?? [],
    sourceUpdatedAt: post._updatedAt,
  };
}

async function run(): Promise<void> {
  // The header printed the env values. This asserts the client actually resolved the same
  // dataset, so the operator read-back can never drift from the content lake really being
  // talked to, which is the one thing the read-back exists to guarantee.
  const resolved = client.config().dataset;
  if (resolved !== dataset) {
    throw new Error(
      `the client resolved dataset "${resolved}" but the header announced "${dataset}". Refusing to continue: the read-back and the target disagree.`,
    );
  }

  // Resolved before anything is submitted and before a single token is spent.
  // TokenUsage.userId is a required foreign key with no session to take it from, so a run
  // that discovers a missing ADMIN afterwards has already lost the record of what it cost.
  let adminUserId: string | null = null;
  try {
    adminUserId = await resolveAdmin();
  } catch (err) {
    // Fatal for a run that will spend money. A dry run spends nothing, so it continues and
    // says so, which keeps the script usable against an environment whose database parity
    // the phase preflight artifact flagged as missing.
    if (execute) throw err;
    console.log(
      "WARNING: no ADMIN user could be resolved in this environment's database, so a real run could not record its token spend. Continuing because this is a dry run; --execute would abort here.",
    );
    console.log(`  ${err instanceof Error ? err.message : String(err)}`);
  }

  if (adminUserId !== null) {
    console.log("ADMIN user resolved: token spend can be recorded. The id itself is not printed.");
  }

  // The slug always travels as the GROQ parameter $slug. It never reaches the query as a
  // template interpolation, so a value off the command line cannot become query syntax
  // (T-03-09). Passing null selects every post, which is what the queries' !defined($slug)
  // branch is for.
  const candidates = await client.fetch<SourcePost[]>(translationCandidatesQuery, {
    slug: slugArg,
  });
  const siblingRows = await client.fetch<StaleRow[]>(translationStaleQuery, {
    slug: slugArg,
  });

  const staleRows = siblingRows.filter((row) => isStale(row));
  const freshRows = siblingRows.filter((row) => !isStale(row));

  if (slugArg !== null && candidates.length === 0 && siblingRows.length === 0) {
    console.error(`--slug ${slugArg} matched no post in ${dataset}.`);
    console.error(SLUG_MISS_REASONS);
    process.exit(1);
  }

  console.log(
    `plan: ${candidates.length} candidate(s) with no Farsi sibling, ${staleRows.length} stale sibling(s), ${freshRows.length} fresh sibling(s)`,
  );

  if (staleRows.length > 0) {
    console.log("stale sibling(s), reported and not touched:");
    for (const row of staleRows) {
      console.log(
        `  ${row.slug ?? "(no slug)"}  source _updatedAt=${row._updatedAt}` +
          `  sibling sourceUpdatedAt=${row.sibling?.sourceUpdatedAt ?? "(none recorded)"}` +
          `  sibling _id=${row.sibling?._id ?? "(none)"}`,
      );
    }
    if (!retranslate) {
      console.log(
        "stale siblings were reported and NOT retranslated. --retranslate is the only flag that changes that, because a hand-edited Farsi draft is never silently clobbered (D-08).",
      );
    }
  }

  const workingSet: WorkItem[] = candidates.map((post) => ({
    post,
    reason: "new" as const,
    existingSiblingId: null,
  }));

  if (retranslate) {
    for (const row of staleRows) {
      workingSet.push({ post: row, reason: "stale", existingSiblingId: row.sibling?._id ?? null });
    }
    // A deliberate single-post retranslation is a legitimate operation, so --slug with
    // --retranslate may also select a sibling that is not stale. Only with --slug: doing
    // the same across the backlog would rewrite every Farsi draft in the dataset, which is
    // the exact outcome D-08 exists to prevent.
    if (slugArg !== null) {
      for (const row of freshRows) {
        workingSet.push({
          post: row,
          reason: "forced",
          existingSiblingId: row.sibling?._id ?? null,
        });
      }
    }
  }

  console.log(`working set: ${workingSet.length} post(s)`);
  for (const item of workingSet) {
    if (item.reason === "new") {
      console.log(`  ${describe(item.post)}`);
    } else if (item.reason === "stale") {
      console.log(
        `  ${describe(item.post)}  RETRANSLATION, rewrites stale sibling ${item.existingSiblingId ?? "(unknown)"}`,
      );
    } else {
      console.log(
        `  ${describe(item.post)}  RETRANSLATION, rewrites sibling ${item.existingSiblingId ?? "(unknown)"} which is NOT stale, selected deliberately by --slug with --retranslate`,
      );
    }
  }

  if (workingSet.length === 0) {
    if (slugArg !== null) {
      console.log(
        `nothing to translate for --slug ${slugArg}: it matched the pipeline queries but is not selectable as it stands.`,
      );
      console.log(SLUG_MISS_REASONS);
    } else {
      console.log(
        `nothing to translate in ${dataset}: every approved English post already has a Farsi sibling that is not stale. A run that finds nothing to do is the D-08 idempotence property, not an error.`,
      );
    }
    return;
  }

  // D-09 turned into a brake rather than decoration: --all is what an operator types to
  // confirm they meant a multi-post paid run, and the list above is exactly what it buys.
  if (execute && workingSet.length > 1 && !all) {
    console.error(
      `refusing to translate ${workingSet.length} posts under --execute without --all. Re-run with --all to confirm the multi-post run, or with --slug <value> to translate one post. Nothing was written.`,
    );
    process.exit(1);
  }

  // ── What each post actually costs to translate ─────────────────────────────
  const units = workingSet.map((item) => toUnit(item));

  const totals = { bodyItems: 0, fieldItems: 0, chars: 0, inputTokens: 0, outputTokens: 0 };
  const metaNotes: string[] = [];

  console.log("translatable text per post:");
  for (const unit of units) {
    const kinds = countByKind(unit.bodyItems);
    const est = estimate(unit);
    totals.bodyItems += unit.bodyItems.length;
    totals.fieldItems += unit.fieldItems.length;
    totals.chars += unit.translatableChars;
    totals.inputTokens += est.inputTokens;
    totals.outputTokens += est.outputTokens;

    console.log(
      `  ${unit.item.post.slug ?? "(no slug)"}` +
        `  body ${unit.bodyItems.length} (span ${kinds.span}, cell ${kinds.cell}, alt ${kinds.alt}, caption ${kinds.caption})` +
        `  fields ${unit.fieldItems.length} (${unit.fieldItems.map((f) => f.label).join(", ") || "none"})` +
        `  chars ${unit.translatableChars}`,
    );

    const meta = unit.item.post.metaDescription;
    if (meta !== undefined && meta.length >= META_DESCRIPTION_NOTE_AT) {
      metaNotes.push(
        `  ${unit.item.post.slug ?? "(no slug)"}  English metaDescription is ${meta.length} characters, against a ${META_DESCRIPTION_WARN_AT}-character Studio warning bound`,
      );
    }
  }

  if (metaNotes.length > 0) {
    console.log(
      "note, informational only: a Farsi rendering usually runs longer, so these will probably show a Studio warning badge. It is a warning, not an error, and it never blocks a publish:",
    );
    for (const note of metaNotes) console.log(note);
  }

  // Estimated before submission, which is the brake on a runaway paid run.
  const introApplies = new Date().toISOString().slice(0, 10) <= INTRO_RATE_LAST_DAY;
  const rate = introApplies ? BATCH_RATES.intro : BATCH_RATES.standard;
  const cost = dollars(totals.inputTokens, rate.input) + dollars(totals.outputTokens, rate.output);

  console.log(
    `run total: ${units.length} post(s), ${totals.bodyItems} body item(s), ${totals.fieldItems} field item(s), ${totals.chars} translatable character(s)`,
  );
  console.log(
    `estimated tokens: ${totals.inputTokens} in, ${totals.outputTokens} out, covering a translate pass and a verify pass`,
  );
  console.log(
    `estimated cost: $${cost.toFixed(2)} at the batch rate $${rate.input.toFixed(2)} in / $${rate.output.toFixed(2)} out per MTok` +
      (introApplies
        ? `, which is the Sonnet 5 intro rate and expires after ${INTRO_RATE_LAST_DAY}`
        : `, the Sonnet 5 standard rate`),
  );
  if (introApplies) {
    const later =
      dollars(totals.inputTokens, BATCH_RATES.standard.input) +
      dollars(totals.outputTokens, BATCH_RATES.standard.output);
    console.log(
      `  the same run after ${INTRO_RATE_LAST_DAY} costs about $${later.toFixed(2)} at $${BATCH_RATES.standard.input.toFixed(2)} / $${BATCH_RATES.standard.output.toFixed(2)} per MTok`,
    );
  }
  console.log(
    `  assumptions: ${CHARS_PER_TOKEN} characters per English token, Farsi output at ${FARSI_OUTPUT_MULTIPLIER}x the source token count, ${REQUEST_OVERHEAD_TOKENS} overhead tokens per request, ${VERIFY_OUTPUT_TOKENS} output tokens per verify response. An estimate, not a quote.`,
  );

  const envFile = dataset === PRODUCTION_DATASET ? ".env.vercel-prod" : ".env.local";

  if (!execute) {
    const createdAt = new Date().toISOString();
    const statePath = writeRunState({
      script: "translate-posts",
      mode: "dry-run",
      createdAt,
      projectId,
      dataset,
      apiVersion,
      flags: { slug: slugArg, all, retranslate, resume: resumeArg },
      adminResolved: adminUserId !== null,
      totals: {
        posts: units.length,
        bodyItems: totals.bodyItems,
        fieldItems: totals.fieldItems,
        translatableChars: totals.chars,
        estimatedInputTokens: totals.inputTokens,
        estimatedOutputTokens: totals.outputTokens,
        estimatedCostUsd: Number(cost.toFixed(4)),
      },
      posts: units.map((unit) => {
        const est = estimate(unit);
        return {
          _id: unit.item.post._id,
          slug: unit.item.post.slug ?? null,
          reason: unit.item.reason,
          existingSiblingId: unit.item.existingSiblingId,
          bodyItemsByKind: countByKind(unit.bodyItems),
          bodyLabels: unit.bodyItems.map((t) => t.label),
          fieldLabels: unit.fieldItems.map((f) => f.label),
          translatableChars: unit.translatableChars,
          estimatedInputTokens: est.inputTokens,
          estimatedOutputTokens: est.outputTokens,
          sourceFingerprintSha256: digest(unit.sourceFingerprint),
        };
      }),
    });
    console.log(`run state written to ${statePath}`);

    // Exactly one server-validated mutation that persists nothing. It is also the probe that
    // proves this token carries write scope on this dataset BEFORE any paid run is submitted,
    // because a scope failure discovered after the spend is the expensive version of the bug.
    await client
      .transaction()
      .createIfNotExists(draftShell(units[0]!.item.post))
      .commit({ dryRun: true });

    console.log("DRY RUN: mutation validated server-side, nothing written.");
    console.log(
      `Re-run with --execute to apply: npx tsx --env-file ${envFile} scripts/translate-posts.ts ${[...argv, "--execute"].join(" ")}`,
    );
    return;
  }

  // ── SEAM: plan 03-08 attaches the translate and verify passes here ─────────
  // Everything above is selection, enumeration and estimation, and none of it calls a model.
  // Plan 03-08 adds the two passes, the structural gate, the draft writes and the spend
  // record, and consumes `units`, `adminUserId`, `resumeArg` and `envFile` as they stand.
  console.error(
    `--execute was passed, but the translate and verify passes do not exist yet: plan 03-07 builds selection and the dry run, plan 03-08 adds the model calls. Nothing was written. Re-run without --execute to see the full plan for these ${units.length} post(s).`,
  );
  process.exit(1);
}

async function main(): Promise<void> {
  // Operator read-back defence, printed before any read or write.
  console.log(
    `translate-posts: projectId=${projectId} dataset=${dataset} apiVersion=${apiVersion} mode=${execute ? "EXECUTE" : "DRY RUN"}`,
  );
  if (execute && dataset === PRODUCTION_DATASET) {
    console.log("!! TARGET IS THE PRODUCTION DATASET !!");
  }
  console.log(
    `translate-posts: slug=${slugArg ?? "(none)"} all=${all} retranslate=${retranslate} resume=${resumeArg ?? "(none)"}`,
  );

  try {
    await run();
  } finally {
    await releaseDatabase();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
