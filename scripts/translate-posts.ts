/**
 * The Farsi translation pipeline CLI (PIPE-01): select approved English posts, translate
 * them, and write each result as a Farsi sibling DRAFT that a human publishes by hand.
 *
 * Dry run is the DEFAULT. There is no flag that turns it on. Writing requires --execute.
 *
 * The model transport is the Claude Code CLI on Saeid's subscription (D-16), not the paid
 * API: every request is `claude -p --model sonnet --output-format json` with the prompt on
 * stdin. There is no SDK client, no API key and no batch surface anywhere in this file.
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
 *   --resume <path>    a prior run-state artifact; posts it records as written are skipped
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

import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { createClient } from "@sanity/client";

// Relative paths, not the `@/` alias: the scripts tree does not use it.
import type { Body, Translatable } from "./lib/portable-text-walk";
import {
  applyTranslatables,
  extractTranslatables,
  structuralFingerprint,
  toTexts,
} from "./lib/portable-text-walk";
import { formatNotes, todayIso, type Finding } from "./lib/translation-notes";
import { loadGlossary, serializeGlossaryBlock } from "./lib/glossary";
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

// ── The model transport (D-16) ───────────────────────────────────────────────
// One helper pair, and nothing else in this file talks to a model.
//
// The prompt travels on stdin rather than in an argument: it is a multi-line block carrying
// Farsi renderings and arbitrary post prose, and a Windows command line is both length
// limited and a quoting minefield. stdin has neither problem.
//
// Only stdout is parsed. The CLI writes warnings to stderr, including permission-rule
// notices, and a run that treated stderr as data would parse a warning as a translation
// (T-03-32). stderr is captured for one purpose: printing it when the exit code is non-zero.

/** The model the CLI is asked for. An alias, so the CLI resolves the current Sonnet. */
const MODEL_ALIAS = "sonnet";

/**
 * Every built-in tool, denied.
 *
 * This transport runs a full agent CLI inside the repository working directory, so unlike the
 * API transport D-16 replaced, the model on the other end of the pipe would otherwise be able
 * to read and write files. The pipeline needs one thing from it, a string-in string-out
 * transformation over Saeid's own prose, and the post bodies it is fed are untrusted input as
 * far as this boundary is concerned (T-03-05). Denying the tool surface makes prompt injection
 * unable to reach anything at all, rather than merely unable to get past the count gate.
 */
const DISALLOWED_TOOLS = [
  "Bash",
  "BashOutput",
  "KillShell",
  "Read",
  "Write",
  "Edit",
  "NotebookEdit",
  "Glob",
  "Grep",
  "WebFetch",
  "WebSearch",
  "Task",
  "TodoWrite",
  "SlashCommand",
  "Skill",
  "ExitPlanMode",
];

/**
 * `--disallowedTools` is variadic, so it goes last and nothing may follow it.
 * `--strict-mcp-config` with no `--mcp-config` means no MCP server is loaded either.
 */
function cliArgs(): string[] {
  return [
    "-p",
    "--model",
    MODEL_ALIAS,
    "--output-format",
    "json",
    "--strict-mcp-config",
    "--disallowedTools",
    ...DISALLOWED_TOOLS,
  ];
}

/** One call's token counts, exactly as the CLI reported them. No estimate is involved. */
type Usage = {
  calls: number;
  /** uncached + cacheCreation + cacheRead: the whole prompt side of the call. */
  inputTokens: number;
  outputTokens: number;
  uncachedInputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
};

const ZERO_USAGE: Usage = {
  calls: 0,
  inputTokens: 0,
  outputTokens: 0,
  uncachedInputTokens: 0,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
};

function addUsage(a: Usage, b: Usage): Usage {
  return {
    calls: a.calls + b.calls,
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    uncachedInputTokens: a.uncachedInputTokens + b.uncachedInputTokens,
    cacheCreationInputTokens: a.cacheCreationInputTokens + b.cacheCreationInputTokens,
    cacheReadInputTokens: a.cacheReadInputTokens + b.cacheReadInputTokens,
  };
}

function numberAt(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

type SpawnOutcome = {
  code: number | null;
  stdout: string;
  stderr: string;
  spawnError: NodeJS.ErrnoException | null;
};

/** One child process. `useShell` is the Windows `.cmd` shim fallback, never the first try. */
function spawnClaude(prompt: string, useShell: boolean): Promise<SpawnOutcome> {
  return new Promise<SpawnOutcome>((resolve) => {
    const child = spawn("claude", cliArgs(), { shell: useShell, windowsHide: true });
    let stdout = "";
    let stderr = "";
    let spawnError: NodeJS.ErrnoException | null = null;

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (err: NodeJS.ErrnoException) => {
      spawnError = err;
    });
    // A spawn that never started rejects the write with EPIPE. That is the same failure the
    // error handler above already has, so it must not become an unhandled stream error.
    child.stdin.on("error", () => undefined);
    child.on("close", (code) => {
      resolve({ code, stdout, stderr, spawnError });
    });

    child.stdin.end(prompt, "utf8");
  });
}

const CLI_UNAVAILABLE =
  "the Claude Code CLI could not be started, so no model call is possible. This pipeline runs on Saeid's subscription through `claude -p` (D-16) and has no API fallback by design. Install or PATH-resolve the `claude` command and re-run. Nothing was written";

/** One model call. Returns the model's text and the CLI-reported usage for that call. */
async function callClaude(prompt: string): Promise<{ text: string; usage: Usage }> {
  let outcome = await spawnClaude(prompt, false);
  // node cannot exec a `.cmd` shim directly on Windows; a shell can.
  if (outcome.spawnError !== null && outcome.spawnError.code === "ENOENT") {
    outcome = await spawnClaude(prompt, true);
  }
  if (outcome.spawnError !== null) {
    throw new Error(`${CLI_UNAVAILABLE}: ${outcome.spawnError.message}`);
  }
  if (outcome.code !== 0) {
    // A subscription usage-limit stop lands here too. stderr is PRINTED and never returned:
    // keeping it out of the thrown message keeps it out of the run-state artifact and out of
    // the `translationNotes` line a failed verify writes into a document (T-03-04, T-03-32).
    console.error(`  CLI stderr (printed only, never parsed): ${outcome.stderr.trim() || "(empty)"}`);
    throw new Error(
      `the Claude Code CLI exited ${String(outcome.code)}. Its stderr was printed above. Nothing was written for this post.`,
    );
  }

  let envelope: unknown;
  try {
    envelope = JSON.parse(outcome.stdout);
  } catch (err) {
    throw new Error(
      `the CLI exited 0 but its stdout was not valid JSON, so the --output-format contract was not honoured (${err instanceof Error ? err.message : String(err)}).`,
    );
  }
  if (typeof envelope !== "object" || envelope === null) {
    throw new Error("the CLI returned JSON that is not an object.");
  }

  const record = envelope as Record<string, unknown>;
  if (record.is_error === true) {
    throw new Error(
      `the CLI reported an error result (subtype ${String(record.subtype ?? "unknown")}). Nothing was written for this post.`,
    );
  }
  const text = record.result;
  if (typeof text !== "string") {
    throw new Error("the CLI envelope carried no string `result` field.");
  }

  const raw = typeof record.usage === "object" && record.usage !== null
    ? (record.usage as Record<string, unknown>)
    : {};
  const uncached = numberAt(raw, "input_tokens");
  const created = numberAt(raw, "cache_creation_input_tokens");
  const read = numberAt(raw, "cache_read_input_tokens");

  return {
    text,
    usage: {
      calls: 1,
      inputTokens: uncached + created + read,
      outputTokens: numberAt(raw, "output_tokens"),
      uncachedInputTokens: uncached,
      cacheCreationInputTokens: created,
      cacheReadInputTokens: read,
    },
  };
}

/**
 * A parse failure that still spent tokens. The usage rides on the error so the caller can
 * book the spend it already incurred instead of losing the record with the response.
 */
class ResponseParseError extends Error {
  readonly usage: Usage;
  constructor(message: string, usage: Usage) {
    super(message);
    this.name = "ResponseParseError";
    this.usage = usage;
  }
}

/**
 * One model call whose response must parse as JSON, retried exactly once on a parse failure.
 *
 * The returned usage covers every attempt made, including the discarded one: a retry is real
 * spend and a run that hid it would under-report itself. Markdown fences are deliberately NOT
 * stripped. The prompt demands JSON and nothing else, and a response that needs its fences
 * removed is a response that broke the contract, which the retry exists to catch.
 */
async function callClaudeJson(prompt: string, label: string): Promise<{ value: unknown; usage: Usage }> {
  let usage = ZERO_USAGE;
  let lastMessage = "";

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const call = await callClaude(prompt);
    usage = addUsage(usage, call.usage);
    try {
      return { value: JSON.parse(call.text) as unknown, usage };
    } catch (err) {
      lastMessage = err instanceof Error ? err.message : String(err);
      if (attempt === 1) {
        console.log(`  ${label}: the response was not valid JSON (${lastMessage}). Retrying once.`);
      }
    }
  }

  throw new ResponseParseError(
    `${label}: the response was not valid JSON on either attempt (${lastMessage}). The prompt demands a single JSON object and nothing else.`,
    usage,
  );
}

// ── Prompt blocks ────────────────────────────────────────────────────────────
// Module-level constants with no per-post interpolation, so every request in a run carries
// byte-identical instruction text and two posts in the same backlog can never be translated
// against subtly different rules. `serializeGlossaryBlock` is deterministic by contract, and
// `loadGlossary` throws on a malformed glossary here, before the first call rather than after.

const GLOSSARY_BLOCK = serializeGlossaryBlock(loadGlossary());

const TRANSLATE_INSTRUCTIONS = [
  "TASK. You are translating strings from an English technical article into Farsi for a professional audience.",
  "",
  "Respond with a single JSON object of the shape { \"strings\": [...] } and nothing else. No prose before it, no prose after it, and no markdown fences of any kind.",
  "Return exactly the number of strings the payload's `count` field states, in the same order as the payload's `strings` array. One output string per input string. Never merge two, never split one, never add or drop an entry. A string that genuinely needs no change is returned unchanged rather than omitted.",
  "",
  "Translate into natural Farsi technical prose. Aim for how a Farsi technology publication writes, not a literal word-by-word rendering.",
  "Preserve every number, every date, every URL, every product name and every entity name exactly as written. Do not convert digits to Persian forms, do not localise a date, and do not rewrite a URL.",
  "Follow the glossary block above exactly. For a term that is not in the glossary, follow common Farsi tech-press usage, and keep the English term in Latin script where that is the norm for Farsi technical writing.",
  "Keep any inline formatting the string already carries, and keep leading and trailing whitespace as it is.",
  "A string whose payload label is `metaDescription` should come back under 160 characters where the meaning survives it, because the content model warns above that length.",
  "Introduce no reference to the United States, America or Israel. This is a standing rule for this catalogue and it applies even where a literal translation would produce one.",
  "The house rule against em dashes is an English-prose rule for this project and does not apply to your Farsi output.",
].join("\n");

/**
 * The finding categories, keyed by the union imported from the notes formatter.
 *
 * A `Record` keyed by `Finding["category"]` is exhaustive by construction: adding a category
 * to the type breaks this object until it is listed, and a category that is not in the type
 * cannot be listed at all. That is why the union is imported rather than retyped here. The
 * validator and the formatter cannot drift into disagreeing about what a finding can be.
 */
const FINDING_CATEGORIES: Readonly<Record<Finding["category"], true>> = {
  number: true,
  date: true,
  url: true,
  "entity-name": true,
  "code-content": true,
  "glossary-adherence": true,
  "untranslated-leftover": true,
};

const FINDING_SEVERITIES: Readonly<Record<Finding["severity"], true>> = {
  info: true,
  warn: true,
};

const VERIFY_INSTRUCTIONS = [
  "TASK. You are checking a Farsi translation of an English technical article for prose-level drift. You are NOT checking structure: the document structure is compared byte for byte by code before you are asked, and you cannot see or change it.",
  "",
  "The payload gives you aligned pairs. Each pair carries a `label` naming where in the document the string lives, the English source in `english`, and the Farsi rendering in `farsi`.",
  "",
  "Report drift in these categories and no others:",
  `  ${Object.keys(FINDING_CATEGORIES).join("\n  ")}`,
  "",
  "number: a figure, percentage, quantity or ordinal that changed value, was dropped, or was rewritten in a different numeral system.",
  "date: a date or a year that changed, was dropped, or was converted to another calendar.",
  "url: any link text or address that differs in any way from the English.",
  "entity-name: a person, company, organisation or product name that was altered rather than carried across.",
  "code-content: identifiers, commands, file names or code fragments that were translated when they should have been left alone.",
  "glossary-adherence: a glossary term rendered differently from the glossary block above.",
  "untranslated-leftover: English that should have become Farsi and did not.",
  "",
  "NUANCE, and this one matters. Keeping a term in Latin script is often the idiomatic Farsi rendering, and the glossary block above marks many terms exactly that way. Report an untranslated-leftover ONLY where the English reads as an accidental leftover, for example a whole clause or sentence that was simply not translated. Never report one merely because a technical term appears in Latin script.",
  "",
  "Respond with a single JSON object of the shape { \"findings\": [...] } and nothing else. No prose before it, no prose after it, and no markdown fences of any kind. An empty array is the correct answer when nothing drifted.",
  "Each finding is an object with exactly four string fields: `category`, one of the values listed above; `severity`, either \"warn\" or \"info\"; `location`, the `label` of the pair the finding is about; and `summary`, one English line describing the drift.",
  "Use \"warn\" for anything a reviewer would have to act on and \"info\" for anything merely worth knowing.",
  "Every `summary` must be a single English line. No newline inside it, and no em dash anywhere in it: that is a house style rule for this project.",
].join("\n");

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

// ── Extraction and estimate ──────────────────────────────────────────────────

/** One document-level translatable string. `label` is what the verify pass names it by. */
type FieldItem = { label: string; text: string };

/** Everything the pipeline needs about one post, computed before any model is involved. */
type TranslationUnit = {
  item: WorkItem;
  bodyItems: Translatable[];
  fieldItems: FieldItem[];
  /**
   * The D-05 tier 1 gate value, captured before any model saw the document, so the
   * comparison after reassembly is against a fingerprint the model could not influence.
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

// Token estimate. Every number below is an ASSUMPTION and is printed as one. It is a size
// brake before a long run, not a price: the transport is Saeid's subscription (D-16), so the
// run has no marginal dollar cost and this file prints no dollar figure anywhere.
/** English source, the usual rule of thumb. */
const CHARS_PER_TOKEN = 4;
/**
 * Farsi output tokens per English input token. Persian tokenizes less densely than English,
 * and this is deliberately set high so the printed figure reads as a ceiling, not a floor.
 */
const FARSI_OUTPUT_MULTIPLIER = 2;
/** The glossary block plus the per-request instruction text, per request. */
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
 * lands in a version-controlled planning directory. Equality is the only thing the gate asks
 * of it, and a digest answers equality exactly. The full strings stay in memory, where a
 * mismatch can still be diffed, and a mismatch writes them to their own artifact.
 */
function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Where a post got to. Rewritten to disk after every transition, so a crash or a mid-run
 * subscription usage-limit stop leaves an accurate record and `--resume` can skip what is
 * already done (D-16).
 */
type PostStatus = "pending" | "translated" | "gate-blocked" | "verified" | "written" | "failed";

type PostState = {
  _id: string;
  slug: string | null;
  reason: WorkItem["reason"];
  existingSiblingId: string | null;
  status: PostStatus;
  bodyItemsByKind: Record<Translatable["kind"], number>;
  bodyLabels: string[];
  fieldLabels: string[];
  translatableChars: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  sourceFingerprintSha256: string;
  translatedFingerprintSha256: string | null;
  /** Set only on a gate block: the path of the artifact carrying both raw fingerprints. */
  gateArtifact: string | null;
  /** Whether the verify pass returned a valid findings object. A false NEVER blocks a draft. */
  verifyCompleted: boolean | null;
  findings: number | null;
  usage: { translate: Usage | null; verify: Usage | null };
  /** A short reason code. Never the CLI's stderr, which is printed and never persisted. */
  failure: string | null;
};

/** Ids, labels, counts, digests and token counts. No prose, no env value, no credential. */
type RunState = {
  script: "translate-posts";
  mode: "dry-run" | "execute";
  transport: "claude-code-cli-subscription";
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
    marginalCostUsd: 0;
  };
  posts: PostState[];
};

/** ISO 8601 with the colons swapped for dashes: `:` is not a legal Windows filename character. */
function runStatePath(state: RunState): string {
  return join(ARTIFACT_DIR, `${state.dataset}-${state.createdAt.replace(/:/g, "-")}.json`);
}

function saveRunState(state: RunState, path: string): void {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

/**
 * The document ids a prior run recorded as written, so `--resume` can skip them.
 *
 * Without `--resume` a rerun is already safe, because D-08 sibling selection will not pick up
 * a post that now has a fresh Farsi sibling. `--resume` covers the narrower case where the run
 * stopped between the model call and the write.
 */
function loadResumeIds(path: string): Set<string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch (err) {
    console.error(
      `--resume ${path} could not be read as a run-state artifact (${err instanceof Error ? err.message : String(err)}). Nothing was written.`,
    );
    process.exit(1);
  }

  const posts = (parsed as { posts?: unknown }).posts;
  if (!Array.isArray(posts)) {
    console.error(`--resume ${path} carries no \`posts\` array, so it is not a run-state artifact. Nothing was written.`);
    process.exit(1);
  }

  const done = new Set<string>();
  for (const entry of posts) {
    if (typeof entry !== "object" || entry === null) continue;
    const row = entry as { _id?: unknown; status?: unknown };
    if (row.status === "written" && typeof row._id === "string") done.add(row._id);
  }
  return done;
}

/**
 * The Farsi draft document as it will be shaped, with the English strings still in place.
 *
 * Used here only as the payload of the server-validated mutation that persists nothing, so
 * the shape itself is what gets checked.
 */
function draftShell(post: SourcePost): { _id: string; _type: string; [key: string]: unknown } {
  return {
    // A `drafts.` id prefix is the whole of what makes a Sanity document a draft.
    _id: `drafts.${randomUUID()}`,
    _type: "post",
    language: "fa",
    translationOf: { _type: "reference", _ref: post._id },
    // D-12: the status value api/cron/publish-scheduled matches on must never appear on a
    // Farsi document. That cron is unfiltered by language, and it would patch the document to
    // approved and mail every subscriber an English subject line.
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

// ── The translate pass ───────────────────────────────────────────────────────

/**
 * The per-post payload: the field items first, then the body items, which is the one fixed
 * order reassembly relies on. `count` is what the instruction block tells the model to match.
 */
function sourceStrings(unit: TranslationUnit): string[] {
  return [...unit.fieldItems.map((f) => f.text), ...toTexts(unit.bodyItems)];
}

function translatePrompt(unit: TranslationUnit): string {
  const strings = sourceStrings(unit);
  const payload = JSON.stringify({
    slug: unit.item.post.slug ?? null,
    count: strings.length,
    strings,
  });
  return `${GLOSSARY_BLOCK}\n\n${TRANSLATE_INSTRUCTIONS}\n\nPAYLOAD\n${payload}\n`;
}

/**
 * The parsed response, validated in code.
 *
 * There is no request-level schema on this transport, so the shape demand in the prompt is
 * only a request and this function is the thing that actually decides. The count check is the
 * hard gate against a truncated or padded response (T-03-29): it runs before anything is
 * reassembled, so a short response can never leave a half-translated body behind.
 */
function readStrings(value: unknown, expected: number, label: string): string[] {
  if (typeof value !== "object" || value === null) {
    throw new Error(`${label}: the response parsed but is not a JSON object.`);
  }
  const strings = (value as { strings?: unknown }).strings;
  if (!Array.isArray(strings)) {
    throw new Error(`${label}: the response carries no \`strings\` array.`);
  }
  if (strings.length !== expected) {
    throw new Error(
      `${label}: the response carries ${strings.length} string(s) but the payload demanded exactly ${expected}. Nothing was written for this post.`,
    );
  }
  const out: string[] = [];
  for (let i = 0; i < strings.length; i += 1) {
    const entry: unknown = strings[i];
    if (typeof entry !== "string") {
      throw new Error(`${label}: strings[${i}] is not a string.`);
    }
    out.push(entry);
  }
  return out;
}

// ── Reassembly, the blocking gate, and the verify pass ───────────────────────

/** The labels of the payload strings, in the same fields-then-body order the prompt used. */
function sourceLabels(unit: TranslationUnit): string[] {
  return [...unit.fieldItems.map((f) => f.label), ...unit.bodyItems.map((b) => b.label)];
}

/**
 * The first index at which two fingerprints diverge, or -1 when they are identical.
 * A length difference with a common prefix reports the end of the shorter one.
 */
function firstDifferingOffset(a: string, b: string): number {
  const limit = Math.min(a.length, b.length);
  for (let i = 0; i < limit; i += 1) {
    if (a[i] !== b[i]) return i;
  }
  return a.length === b.length ? -1 : limit;
}

/**
 * Both raw fingerprints, written only when the gate blocks a post.
 *
 * They live in their own file rather than in the run-state artifact because a fingerprint is
 * the whole body with the translatable slots blanked, which for a long post is hundreds of
 * kilobytes. The run state keeps the digests and names this path, so a blocked post can be
 * diffed without every clean run carrying the weight.
 */
function writeGateArtifact(
  postId: string,
  slug: string,
  sourceFingerprint: string,
  translatedFingerprint: string,
): string {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const safeSlug = slug.replace(/[^a-zA-Z0-9-]+/g, "-").slice(0, 60);
  const stamp = new Date().toISOString().replace(/:/g, "-");
  const path = join(ARTIFACT_DIR, `gate-mismatch-${safeSlug}-${stamp}.json`);
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        reason: "D-05 tier 1 structural fingerprint mismatch: the draft was refused for this post",
        postId,
        slug,
        firstDifferingOffset: firstDifferingOffset(sourceFingerprint, translatedFingerprint),
        sourceFingerprintSha256: digest(sourceFingerprint),
        translatedFingerprintSha256: digest(translatedFingerprint),
        sourceFingerprint,
        translatedFingerprint,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return path;
}

function verifyPrompt(unit: TranslationUnit, translated: readonly string[]): string {
  const labels = sourceLabels(unit);
  const english = sourceStrings(unit);
  const pairs = labels.map((label, i) => ({
    label,
    english: english[i] ?? "",
    farsi: translated[i] ?? "",
  }));
  const payload = JSON.stringify({ slug: unit.item.post.slug ?? null, pairs });
  return `${GLOSSARY_BLOCK}\n\n${VERIFY_INSTRUCTIONS}\n\nPAYLOAD\n${payload}\n`;
}

/**
 * The verify response, validated in code.
 *
 * This transport carries no request-level schema, so nothing but this function stands between
 * a model's improvised object and the `translationNotes` field on a document. A response that
 * parses but fails here is treated exactly like a parse failure: that post's verify did not
 * complete, and the draft is still written, because verify findings never block (D-05 tier 2).
 */
function validateFindings(value: unknown, label: string): Finding[] {
  if (typeof value !== "object" || value === null) {
    throw new Error(`${label}: the response parsed but is not a JSON object.`);
  }
  const findings = (value as { findings?: unknown }).findings;
  if (!Array.isArray(findings)) {
    throw new Error(`${label}: the response carries no \`findings\` array.`);
  }

  const out: Finding[] = [];
  for (let i = 0; i < findings.length; i += 1) {
    const entry: unknown = findings[i];
    if (typeof entry !== "object" || entry === null) {
      throw new Error(`${label}: findings[${i}] is not an object.`);
    }
    const row = entry as Record<string, unknown>;
    const category = row.category;
    const severity = row.severity;
    const location = row.location;
    const summary = row.summary;

    if (typeof category !== "string" || !Object.hasOwn(FINDING_CATEGORIES, category)) {
      throw new Error(
        `${label}: findings[${i}].category is ${JSON.stringify(category)}, which is not one of ${Object.keys(FINDING_CATEGORIES).join(", ")}.`,
      );
    }
    if (typeof severity !== "string" || !Object.hasOwn(FINDING_SEVERITIES, severity)) {
      throw new Error(
        `${label}: findings[${i}].severity is ${JSON.stringify(severity)}, which is not one of ${Object.keys(FINDING_SEVERITIES).join(", ")}.`,
      );
    }
    if (typeof location !== "string") {
      throw new Error(`${label}: findings[${i}].location is not a string.`);
    }
    if (typeof summary !== "string") {
      throw new Error(`${label}: findings[${i}].summary is not a string.`);
    }

    out.push({
      category: category as Finding["category"],
      severity: severity as Finding["severity"],
      location,
      summary,
    });
  }
  return out;
}

/**
 * A one-line reason safe to put in front of a human and, in the verify case, into a document
 * field. The CLI's stderr never reaches here: a non-zero exit prints it and keeps it out of
 * the thrown message on purpose.
 */
function shortReason(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const line = message.split("\n")[0]!.trim();
  return line.length > 220 ? `${line.slice(0, 217)}...` : line;
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
    // Fatal for a run that will spend tokens. A dry run spends nothing, so it continues and
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

  let workingSet: WorkItem[] = candidates.map((post) => ({
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

  if (resumeArg !== null) {
    const done = loadResumeIds(resumeArg);
    const before = workingSet.length;
    workingSet = workingSet.filter((item) => !done.has(item.post._id));
    console.log(
      `--resume ${resumeArg}: that artifact records ${done.size} post(s) as written, ${before - workingSet.length} of which are in this working set and are skipped.`,
    );
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
  // confirm they meant a multi-post run, and the list above is exactly what it buys.
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

  console.log(
    `run total: ${units.length} post(s), ${totals.bodyItems} body item(s), ${totals.fieldItems} field item(s), ${totals.chars} translatable character(s)`,
  );
  console.log(
    `estimated tokens: ${totals.inputTokens} in, ${totals.outputTokens} out, covering a translate pass and a verify pass`,
  );
  console.log(
    "estimated cost: $0 marginal. The transport is the Claude Code CLI on Saeid's subscription (D-16), so the token figures above are a size brake on the run, not a price.",
  );
  console.log(
    `  assumptions: ${CHARS_PER_TOKEN} characters per English token, Farsi output at ${FARSI_OUTPUT_MULTIPLIER}x the source token count, ${REQUEST_OVERHEAD_TOKENS} overhead tokens per request, ${VERIFY_OUTPUT_TOKENS} output tokens per verify response. An estimate, not a measurement; the run reports its measured totals at the end.`,
  );

  const envFile = dataset === PRODUCTION_DATASET ? ".env.vercel-prod" : ".env.local";

  const runState: RunState = {
    script: "translate-posts",
    mode: execute ? "execute" : "dry-run",
    transport: "claude-code-cli-subscription",
    createdAt: new Date().toISOString(),
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
      marginalCostUsd: 0,
    },
    posts: units.map((unit) => {
      const est = estimate(unit);
      return {
        _id: unit.item.post._id,
        slug: unit.item.post.slug ?? null,
        reason: unit.item.reason,
        existingSiblingId: unit.item.existingSiblingId,
        status: "pending" as const,
        bodyItemsByKind: countByKind(unit.bodyItems),
        bodyLabels: unit.bodyItems.map((t) => t.label),
        fieldLabels: unit.fieldItems.map((f) => f.label),
        translatableChars: unit.translatableChars,
        estimatedInputTokens: est.inputTokens,
        estimatedOutputTokens: est.outputTokens,
        sourceFingerprintSha256: digest(unit.sourceFingerprint),
        translatedFingerprintSha256: null,
        gateArtifact: null,
        verifyCompleted: null,
        findings: null,
        usage: { translate: null, verify: null },
        failure: null,
      };
    }),
  };
  const statePath = runStatePath(runState);

  if (!execute) {
    saveRunState(runState, statePath);
    console.log(`run state written to ${statePath}`);

    // Exactly one server-validated mutation that persists nothing. It is also the probe that
    // proves this token carries write scope on this dataset BEFORE any real run is submitted,
    // because a scope failure discovered after the work is the expensive version of the bug.
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

  // ── Execute: one post at a time over the subscription CLI (D-16) ───────────
  console.log("");
  console.log(
    `transport: the Claude Code CLI on the subscription, model alias "${MODEL_ALIAS}", prompt on stdin, stdout parsed and stderr never parsed. Posts run strictly sequentially, so no response can be matched to the wrong post (T-03-06).`,
  );
  console.log(`run state: ${statePath}, rewritten after every per-post transition.`);
  saveRunState(runState, statePath);

  let translateUsage = ZERO_USAGE;
  let verifyUsage = ZERO_USAGE;
  let blocked = 0;

  for (let i = 0; i < units.length; i += 1) {
    const unit = units[i]!;
    const state = runState.posts[i]!;
    const slug = unit.item.post.slug ?? "(no slug)";
    const expected = unit.fieldItems.length + unit.bodyItems.length;

    console.log("");
    console.log(`[${i + 1}/${units.length}] ${slug}: translating ${expected} string(s)`);

    let translated: string[];
    try {
      const call = await callClaudeJson(translatePrompt(unit), `${slug} translate`);
      state.usage.translate = call.usage;
      translateUsage = addUsage(translateUsage, call.usage);
      translated = readStrings(call.value, expected, `${slug} translate`);
      state.status = "translated";
      saveRunState(runState, statePath);
    } catch (err) {
      if (err instanceof ResponseParseError) {
        state.usage.translate = err.usage;
        translateUsage = addUsage(translateUsage, err.usage);
      }
      state.status = "failed";
      state.failure = `translate pass did not complete: ${shortReason(err)}`;
      saveRunState(runState, statePath);
      console.error(`  ${slug}: FAILED. ${state.failure}`);
      continue;
    }

    console.log(
      `  ${slug}: translated ${translated.length} string(s), ${state.usage.translate?.inputTokens ?? 0} in / ${state.usage.translate?.outputTokens ?? 0} out as reported by the CLI`,
    );

    // ── Reassembly, then the D-05 tier 1 gate ────────────────────────────────
    // The split is the same fields-then-body order the payload used, and reassembly writes
    // only into the slots the walker enumerated. Code decides whether a draft may be written;
    // the model is never asked to sign off on its own output.
    const translatedFieldTexts = translated.slice(0, unit.fieldItems.length);
    const translatedBodyTexts = translated.slice(unit.fieldItems.length);

    let translatedBody: Body;
    let translatedFingerprint: string;
    try {
      translatedBody = applyTranslatables(unit.item.post.body ?? [], translatedBodyTexts);
      translatedFingerprint = structuralFingerprint(translatedBody);
    } catch (err) {
      state.status = "failed";
      state.failure = `reassembly did not complete: ${shortReason(err)}`;
      saveRunState(runState, statePath);
      console.error(`  ${slug}: FAILED. ${state.failure}`);
      continue;
    }

    state.translatedFingerprintSha256 = digest(translatedFingerprint);

    if (translatedFingerprint !== unit.sourceFingerprint) {
      const offset = firstDifferingOffset(unit.sourceFingerprint, translatedFingerprint);
      const artifact = writeGateArtifact(
        unit.item.post._id,
        slug,
        unit.sourceFingerprint,
        translatedFingerprint,
      );
      blocked += 1;
      state.status = "gate-blocked";
      state.gateArtifact = artifact;
      state.failure = `structural fingerprint mismatch, first differing offset ${offset}`;
      saveRunState(runState, statePath);
      console.error("");
      console.error(`  !! GATE BLOCKED: ${slug} !!`);
      console.error(
        `  reason: the reassembled body's structural fingerprint differs from the source fingerprint captured before any model saw the document, first differing offset ${offset}. No draft was created for this post (D-05 tier 1).`,
      );
      console.error(`  both fingerprints written to: ${artifact}`);
      console.error("  the run continues with the remaining posts.");
      continue;
    }

    console.log("  gate: structural fingerprint identical to the source. The draft may be written.");

    // ── The verify pass. Findings never block (D-05 tier 2) ──────────────────
    let notes: string;
    try {
      const call = await callClaudeJson(verifyPrompt(unit, translated), `${slug} verify`);
      state.usage.verify = call.usage;
      verifyUsage = addUsage(verifyUsage, call.usage);
      const findings = validateFindings(call.value, `${slug} verify`);
      notes = formatNotes(findings, todayIso());
      state.verifyCompleted = true;
      state.findings = findings.length;
      state.status = "verified";
      console.log(
        `  verify: ${findings.length} finding(s), ${call.usage.inputTokens} in / ${call.usage.outputTokens} out as reported by the CLI`,
      );
    } catch (err) {
      if (err instanceof ResponseParseError) {
        state.usage.verify = err.usage;
        verifyUsage = addUsage(verifyUsage, err.usage);
      }
      const reason = shortReason(err);
      notes = `Verify pass did not complete (${todayIso()}): ${reason} The Farsi prose in this draft has not been checked for drift, so read it before publishing.`;
      state.verifyCompleted = false;
      state.findings = null;
      state.status = "verified";
      console.error(`  verify: DID NOT COMPLETE. ${reason}`);
      console.error("  the draft is still written: verify findings never block (D-05 tier 2).");
    }
    saveRunState(runState, statePath);

    // ── SEAM: task 3 writes the draft from translatedFieldTexts, translatedBody and notes.
    void translatedFieldTexts;
    void notes;
  }

  console.log("");
  console.log(
    `translate pass measured totals: ${translateUsage.calls} call(s), ${translateUsage.inputTokens} input token(s), ${translateUsage.outputTokens} output token(s)`,
  );
  console.log(
    `verify pass measured totals: ${verifyUsage.calls} call(s), ${verifyUsage.inputTokens} input token(s), ${verifyUsage.outputTokens} output token(s)`,
  );
  console.log(`gate: ${blocked} post(s) blocked.`);
  console.log("run cost: subscription-funded, $0 marginal.");
  console.error("the draft write and the spend record are added by plan 03-08 task 3. Nothing was written.");
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
