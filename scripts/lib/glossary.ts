/**
 * The glossary loader and the one serialisation of it that reaches a model.
 *
 * Pure. No Sanity client, no model client, no network. It reads one JSON file and returns
 * strings, which is what lets the whole of it be proven offline in
 * scripts/checks/translation.check.ts before a single request is built.
 *
 * `loadGlossary` validates and throws. A glossary with a bad strategy tag or a missing
 * rendering must fail BEFORE any model call, not after: the block below is embedded verbatim
 * at the top of every translate and verify request in a run, so a malformed glossary that
 * loads silently would corrupt every request in that run rather than one of them.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Repo root from this file, not from cwd: the default path must not move with the caller. */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_GLOSSARY_PATH = path.join(REPO_ROOT, "content", "fa-glossary.json");

/** D-02. A tag outside this union is a validation failure, never a silent passthrough. */
export const STRATEGIES = ["translate", "transliterate", "keep-english"] as const;
export type Strategy = (typeof STRATEGIES)[number];

export type GlossaryEntry = {
  term: string;
  rendering: string;
  strategy: Strategy;
  /** Review evidence (D-03). Counted in code by scripts/mine-glossary-terms.ts. */
  frequency: number;
  example: string;
  exampleSlug: string;
};

export type Glossary = {
  version: 1;
  entries: GlossaryEntry[];
};

/** D-01 bounds. The glossary is deliberately lean; it grows as the verify pass flags drift. */
export const MIN_ENTRIES = 60;
export const MAX_ENTRIES = 100;

function fail(filePath: string, detail: string): never {
  throw new Error(`Invalid glossary at ${filePath}: ${detail}`);
}

/**
 * Read, validate and return the glossary. Throws a message naming the offending entry.
 *
 * @param filePath defaults to <repo>/content/fa-glossary.json
 */
export function loadGlossary(filePath: string = DEFAULT_GLOSSARY_PATH): Glossary {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (err) {
    throw new Error(
      `Could not read the glossary at ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    fail(filePath, `the file is not valid JSON (${err instanceof Error ? err.message : String(err)})`);
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    fail(filePath, "the top level is not a JSON object");
  }

  const root = parsed as Record<string, unknown>;
  if (root.version !== 1) {
    fail(filePath, `version is ${JSON.stringify(root.version)}, expected 1`);
  }
  if (!Array.isArray(root.entries)) {
    fail(filePath, "`entries` is not an array");
  }

  const entries = root.entries as unknown[];
  if (entries.length < MIN_ENTRIES || entries.length > MAX_ENTRIES) {
    fail(
      filePath,
      `it carries ${entries.length} entries, outside the ${MIN_ENTRIES} to ${MAX_ENTRIES} bound of D-01. If the glossary grew on purpose, move the bound in this file and say why in the plan`,
    );
  }

  const validated: GlossaryEntry[] = entries.map((raw, i) => {
    if (typeof raw !== "object" || raw === null) {
      fail(filePath, `entries[${i}] is not an object`);
    }
    const e = raw as Record<string, unknown>;
    const term = e.term;

    if (typeof term !== "string" || term.trim().length === 0) {
      fail(filePath, `entries[${i}] has no non-empty string \`term\``);
    }
    if (typeof e.rendering !== "string" || e.rendering.trim().length === 0) {
      fail(filePath, `entries[${i}] ("${term}") has no non-empty string \`rendering\``);
    }
    if (typeof e.strategy !== "string" || !STRATEGIES.includes(e.strategy as Strategy)) {
      fail(
        filePath,
        `entries[${i}] ("${term}") has strategy ${JSON.stringify(e.strategy)}, which is not one of ${STRATEGIES.join(", ")}`,
      );
    }

    return {
      term,
      rendering: e.rendering,
      strategy: e.strategy as Strategy,
      frequency: typeof e.frequency === "number" ? e.frequency : 0,
      example: typeof e.example === "string" ? e.example : "",
      exampleSlug: typeof e.exampleSlug === "string" ? e.exampleSlug : "",
    };
  });

  return { version: 1, entries: validated };
}

/**
 * The exact text embedded verbatim at the top of every translate and verify prompt.
 *
 * DETERMINISM IS THE POINT OF THIS FUNCTION. It sorts by term and it omits `frequency`,
 * `example`, `exampleSlug`, any date, any run id and any per-post interpolation. Two calls on
 * the same glossary must return byte-identical strings, always.
 *
 * Do NOT "improve" this block by adding a generation timestamp, a run id, a post slug or an
 * entry count that could drift. Three things depend on byte identity: the offline check
 * asserts it; a glossary correction has to show up as a clean diff of the changed terms and
 * nothing else; and every request in a run has to carry exactly the same instruction text, so
 * two posts in the same backlog can never be translated against subtly different rules.
 *
 * Frequency and the example sentence are review evidence for Saeid, not translation
 * instructions, so they are deliberately absent here as well.
 */
export function serializeGlossaryBlock(glossary: Glossary): string {
  const header = [
    "GLOSSARY. Use exactly these renderings for the terms listed below.",
    "The strategy tag says how a term is handled: translate means use the Farsi rendering given; transliterate means the English word written out in Persian script, as given; keep-english means leave the Latin-script form exactly as written, which is idiomatic Farsi technical prose and not a missed translation.",
    "For any term NOT listed here, follow common Farsi tech-press usage, and keep the English term in Latin script where that is the norm.",
    "One entry per line, tab separated: term, strategy, rendering.",
  ];

  const lines = [...glossary.entries]
    .sort((a, b) => (a.term < b.term ? -1 : a.term > b.term ? 1 : 0))
    .map((e) => `${e.term}\t${e.strategy}\t${e.rendering}`);

  return [...header, ...lines].join("\n");
}

/** Lowercased term to entry, for the verify pass to check adherence against. */
export function glossaryTermIndex(glossary: Glossary): Map<string, GlossaryEntry> {
  const index = new Map<string, GlossaryEntry>();
  for (const entry of glossary.entries) {
    index.set(entry.term.toLowerCase(), entry);
  }
  return index;
}
