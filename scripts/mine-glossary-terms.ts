/**
 * Mine the recurring AI, data and finance vocabulary out of the published English corpus,
 * so the Farsi glossary (D-01) is seeded from evidence rather than from memory.
 *
 * READ ONLY against Sanity. This script never patches, creates or deletes a document. Its
 * only writes are to files in this repository.
 *
 * Usage:
 *   npx tsx --env-file .env.vercel-prod scripts/mine-glossary-terms.ts              (mine, writes the candidate artifact)
 *   npx tsx --env-file .env.vercel-prod scripts/mine-glossary-terms.ts --check      (report the top 50, writes nothing)
 *   npx tsx --env-file .env.vercel-prod scripts/mine-glossary-terms.ts --classify   (ONE model call, writes both content files)
 *   npx tsx scripts/mine-glossary-terms.ts --regen-html                             (rebuild the HTML from the JSON, no env, no model)
 *
 * Mining and classification live in one script on purpose: the frequency that reaches the
 * review table has to be the same number that was counted, with no hand-carried step in
 * between where a copy-paste could drift.
 *
 * Why the counting is done here in code and not by a model: D-03 promises Saeid a review
 * table carrying "corpus frequency" per term, and he corrects the glossary from that number.
 * A model asked to estimate how often a term appears produces a plausible integer, not a
 * count. That would be a fabrication presented to him as evidence. The model is used for
 * exactly one thing in this pipeline (classification, see --classify in plan 03-05 task 2);
 * every number that reaches the review table is counted here.
 *
 * Why n-grams are built per sentence rather than over the whole document: a flat token stream
 * silently manufactures phrases across sentence boundaries, so "...uses machine learning.
 * Models are trained..." would mint the trigram "learning models are". Those are the exact
 * junk candidates that crowd a top-350 list and push real terms out of it.
 *
 * Why grams may not start or end on a stopword: "the transformer" and "of the model" are not
 * terms. Interior stopwords are allowed, because "rate of return" and "bag of words" are.
 *
 * Why counting is keyed on the lowercased form but display keeps a casing: "API", "api" and
 * "Api" are one term with one frequency, but the review table has to show the spelling Saeid
 * actually writes, so the most frequent original casing wins.
 *
 * Why the example sentence is captured during counting rather than searched for afterwards:
 * a gram's display form is its tokens joined by single spaces, which need not appear verbatim
 * in the source ("machine, learning" tokenises to the bigram "machine learning"). A post-hoc
 * substring search would therefore find nothing for a real candidate and leave the review
 * table's evidence column empty. Recording the sentence the gram was extracted from cannot.
 */

import { spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Repo root, resolved from this file rather than from cwd, so the artifact path is fixed. */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CANDIDATES_PATH = path.join(
  REPO_ROOT,
  ".planning",
  "phases",
  "03-translation-pipeline",
  "artifacts",
  "glossary-candidates.json",
);

const GLOSSARY_PATH = path.join(REPO_ROOT, "content", "fa-glossary.json");
const REVIEW_HTML_PATH = path.join(REPO_ROOT, "content", "fa-glossary-review.html");
/** Only written when the spend record cannot reach a database. Never a silent skip. */
const RUN_LOG_PATH = path.join(
  REPO_ROOT,
  ".planning",
  "phases",
  "03-translation-pipeline",
  "artifacts",
  "glossary-mine-run.md",
);

const argv = process.argv.slice(2);
const CHECK = argv.includes("--check");
const CLASSIFY = argv.includes("--classify");
const REGEN_HTML = argv.includes("--regen-html");

/** A candidate must recur. A term seen once is not vocabulary, it is an accident. */
const MIN_FREQUENCY = 2;
/** Per-n quotas, so the list is not 350 unigrams with every multi-word term crowded out. */
const QUOTA: Readonly<Record<number, number>> = { 1: 200, 2: 100, 3: 50 };
const MAX_EXAMPLE_CHARS = 220;
const TOP_N_FOR_CHECK = 50;

/**
 * Unicode-aware word tokeniser. Letters and digits, with internal hyphens and apostrophes
 * kept, so "state-of-the-art", "GPT-4" and "don't" survive as single tokens.
 */
const TOKEN_PATTERN = "[\\p{L}\\p{N}]+(?:[-'’][\\p{L}\\p{N}]+)*";
/**
 * Built with the RegExp constructor rather than a literal: the repo targets ES2017 and the
 * TypeScript compiler rejects Unicode property escapes in a literal at that target.
 */
function tokenRegex(): RegExp {
  return new RegExp(TOKEN_PATTERN, "gu");
}

const DIGITS_ONLY = /^[0-9]+$/;

/**
 * English stopwords. Inline and explicit, not a dependency: the list is part of what makes
 * the counts reproducible, so it belongs in the file that produces them.
 */
const STOPWORDS: ReadonlySet<string> = new Set([
  "a", "about", "above", "after", "again", "against", "all", "also", "am", "an", "and", "any",
  "are", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both",
  "but", "by", "can", "cannot", "could", "did", "do", "does", "doing", "done", "down", "during",
  "each", "either", "else", "even", "every", "few", "for", "from", "further", "get", "gets",
  "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him", "himself",
  "his", "how", "however", "i", "if", "in", "into", "is", "it", "its", "itself", "just", "like",
  "made", "make", "makes", "many", "may", "me", "might", "more", "most", "much", "must", "my",
  "myself", "need", "no", "nor", "not", "now", "of", "off", "on", "once", "one", "only", "or",
  "other", "others", "ought", "our", "ours", "ourselves", "out", "over", "own", "per", "put",
  "rather", "same", "see", "she", "should", "since", "so", "some", "still", "such", "than",
  "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they",
  "this", "those", "though", "through", "to", "too", "two", "under", "until", "up", "upon",
  "us", "use", "used", "uses", "using", "very", "was", "we", "well", "were", "what", "when",
  "where", "whether", "which", "while", "who", "whom", "why", "will", "with", "within",
  "without", "would", "you", "your", "yours", "yourself",
]);

type CorpusPost = { slug: string | null; title: string | null; text: string | null };

type Candidate = {
  term: string;
  frequency: number;
  example: string;
  exampleSlug: string;
};

type Tally = {
  /** n of the n-gram, kept so the per-n quotas can be applied without re-parsing the key. */
  n: number;
  count: number;
  /** Original spellings seen, so the display form is the one Saeid actually writes. */
  casings: Map<string, number>;
  /** Shortest sentence the gram was extracted from, with the post it came from. */
  bestSentence: string;
  bestSlug: string;
};

/**
 * Sentence segmentation without a lookbehind, which the ES2017 target does not allow in a
 * regex literal. Newlines are boundaries too: pt::text joins table cells and list items with
 * them, and a table cell is not a continuation of the sentence above it.
 */
function splitSentences(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split(/[\r\n]+/)) {
    for (const piece of line.split(/(?:[.!?]+)\s+/)) {
      const trimmed = piece.trim();
      if (trimmed.length > 0) out.push(trimmed);
    }
  }
  return out;
}

/** Collapse whitespace and trim to a length a review table can show on one row. */
function readableExample(sentence: string): string {
  const flat = sentence.replace(/\s+/g, " ").trim();
  if (flat.length <= MAX_EXAMPLE_CHARS) return flat;
  const cut = flat.slice(0, MAX_EXAMPLE_CHARS);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > MAX_EXAMPLE_CHARS / 2 ? cut.slice(0, lastSpace) : cut).trim()}...`;
}

/** Deterministic string order. Never localeCompare: its result depends on the host locale. */
function byString(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function isAcceptableGram(tokens: readonly string[]): boolean {
  if (tokens.some((t) => DIGITS_ONLY.test(t))) return false;
  if (tokens.some((t) => t.length < 2)) return false;
  const first = tokens[0]!;
  const last = tokens[tokens.length - 1]!;
  if (STOPWORDS.has(first)) return false;
  if (STOPWORDS.has(last)) return false;
  return true;
}

/**
 * Better example = shorter sentence; ties broken on the sentence text, then on the slug, so
 * the choice never depends on which post happened to be read first.
 */
function isBetterExample(
  candidateSentence: string,
  candidateSlug: string,
  currentSentence: string,
  currentSlug: string,
): boolean {
  if (candidateSentence.length !== currentSentence.length) {
    return candidateSentence.length < currentSentence.length;
  }
  if (candidateSentence !== currentSentence) return candidateSentence < currentSentence;
  return candidateSlug < currentSlug;
}

function tally(posts: readonly CorpusPost[]): { tallies: Map<string, Tally>; sentences: number } {
  const tallies = new Map<string, Tally>();
  let sentenceCount = 0;

  for (const post of posts) {
    const slug = post.slug ?? "(no slug)";
    const text = post.text ?? "";

    for (const sentence of splitSentences(text)) {
      sentenceCount += 1;
      const raw = sentence.match(tokenRegex()) ?? [];
      if (raw.length === 0) continue;
      const lower = raw.map((t) => t.toLowerCase());

      for (const n of [1, 2, 3]) {
        for (let i = 0; i + n <= raw.length; i += 1) {
          const lowerTokens = lower.slice(i, i + n);
          if (!isAcceptableGram(lowerTokens)) continue;

          const key = lowerTokens.join(" ");
          const display = raw.slice(i, i + n).join(" ");

          const existing = tallies.get(key);
          if (existing === undefined) {
            tallies.set(key, {
              n,
              count: 1,
              casings: new Map([[display, 1]]),
              bestSentence: sentence,
              bestSlug: slug,
            });
            continue;
          }

          existing.count += 1;
          existing.casings.set(display, (existing.casings.get(display) ?? 0) + 1);
          if (isBetterExample(sentence, slug, existing.bestSentence, existing.bestSlug)) {
            existing.bestSentence = sentence;
            existing.bestSlug = slug;
          }
        }
      }
    }
  }

  return { tallies, sentences: sentenceCount };
}

/** Most frequent original spelling; ties broken lexicographically so the pick is stable. */
function displayForm(casings: ReadonlyMap<string, number>): string {
  let best = "";
  let bestCount = -1;
  for (const [form, count] of [...casings.entries()].sort((a, b) => byString(a[0], b[0]))) {
    if (count > bestCount) {
      best = form;
      bestCount = count;
    }
  }
  return best;
}

function selectCandidates(tallies: ReadonlyMap<string, Tally>): Candidate[] {
  const perN = new Map<number, Candidate[]>([
    [1, []],
    [2, []],
    [3, []],
  ]);

  for (const t of tallies.values()) {
    if (t.count < MIN_FREQUENCY) continue;
    perN.get(t.n)!.push({
      term: displayForm(t.casings),
      frequency: t.count,
      example: readableExample(t.bestSentence),
      exampleSlug: t.bestSlug,
    });
  }

  const selected: Candidate[] = [];
  for (const n of [1, 2, 3]) {
    const ranked = perN
      .get(n)!
      .sort((a, b) => b.frequency - a.frequency || byString(a.term, b.term))
      .slice(0, QUOTA[n]);
    selected.push(...ranked);
  }

  return selected
    .sort((a, b) => b.frequency - a.frequency || byString(a.term, b.term))
    .map(({ term, frequency, example, exampleSlug }) => ({ term, frequency, example, exampleSlug }));
}

/** Two-space indentation and a trailing newline: diffable, and byte-comparable across runs. */
function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function mine(): Promise<void> {
  const { createClient } = await import("@sanity/client");

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  // No fallback on the dataset, on purpose. A silent default is how a script reports a
  // confident corpus size for a dataset nobody meant to read.
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
  const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2025-10-07";

  if (!dataset || !projectId) {
    throw new Error(
      "NEXT_PUBLIC_SANITY_DATASET and NEXT_PUBLIC_SANITY_PROJECT_ID are required and have no defaults. Re-run with --env-file .env.vercel-prod (production corpus) or --env-file .env.local (dev).",
    );
  }

  // Operator read-back defence, printed before the first read. This script only ever reads,
  // so there is no production warning line to print: there is nothing here to damage.
  console.log(
    `mine-glossary-terms: projectId=${projectId} dataset=${dataset} apiVersion=${apiVersion} mode=${CHECK ? "CHECK (report only)" : "MINE"} (READ ONLY)`,
  );

  const client = createClient({
    projectId,
    dataset,
    apiVersion,
    token: process.env.SANITY_API_TOKEN,
    useCdn: false,
    // Raw, like every other client in this pipeline: the corpus definition must not shift
    // under the default published perspective if a draft ever appears.
    perspective: "raw",
  });

  // pt::text(body) already includes table cell text, which matters because D-13 has the
  // translator translating table cells; the glossary must cover their vocabulary too.
  const posts = await client.fetch<CorpusPost[]>(
    `*[_type == "post" && status == "approved" && (!defined(language) || language == "en")]{ "slug": slug.current, title, "text": pt::text(body) }`,
  );

  // Sorted in code rather than in GROQ: the counts do not depend on order, but the example
  // sentence tie-breaks must not depend on the order the Content Lake happened to return.
  const ordered = [...posts].sort((a, b) => byString(a.slug ?? "", b.slug ?? ""));

  const chars = ordered.reduce((sum, p) => sum + (p.text?.length ?? 0), 0);
  console.log(`${ordered.length} post(s) pulled, ${chars} characters of body text`);

  const { tallies, sentences } = tally(ordered);
  const candidates = selectCandidates(tallies);

  console.log(
    `${sentences} sentence(s), ${tallies.size} distinct n-gram(s), ${candidates.length} candidate(s) at frequency >= ${MIN_FREQUENCY} under the per-n quotas ${QUOTA[1]}/${QUOTA[2]}/${QUOTA[3]}`,
  );

  if (CHECK) {
    console.log(`Top ${TOP_N_FOR_CHECK} candidates (nothing written):`);
    for (const c of candidates.slice(0, TOP_N_FOR_CHECK)) {
      console.log(`  ${String(c.frequency).padStart(5)}  ${c.term}`);
    }
    return;
  }

  writeJson(CANDIDATES_PATH, candidates);
  console.log(`Wrote ${candidates.length} candidate(s) to ${path.relative(REPO_ROOT, CANDIDATES_PATH)}`);
}

// ── Classification (D-02), one model call over the CLI transport (D-16) ──────

/** The three strategy tags of D-02. Anything else fails validation in code. */
const STRATEGIES = ["translate", "transliterate", "keep-english"] as const;
type Strategy = (typeof STRATEGIES)[number];

const MIN_ENTRIES = 60;
const MAX_ENTRIES = 100;

/** The TokenUsage `model` label. Deliberately the alias, not a dated snapshot id. */
const MODEL_LABEL = "claude-sonnet-5";
const ACTIVITY = "glossary-mine";

type ModelEntry = { term: string; rendering: string; strategy: Strategy };
type GlossaryEntry = ModelEntry & { frequency: number; example: string; exampleSlug: string };
type Glossary = { version: 1; entries: GlossaryEntry[] };

type CliUsage = {
  inputTokens: number;
  outputTokens: number;
  breakdown: string;
};

function relToRepo(p: string): string {
  return path.relative(REPO_ROOT, p).split(path.sep).join("/");
}

/**
 * One `claude -p --model sonnet --output-format json` subprocess (D-16).
 *
 * The prompt goes in on stdin, never as an argument: it is tens of kilobytes and this is
 * Windows, where a command line has a hard length limit and quoting a JSON-shaped payload
 * through cmd.exe is a corruption waiting to happen.
 *
 * Only stdout is parsed. stderr carries CLI notices, including permission-rule warnings that
 * appear on a perfectly successful run, so treating it as an error signal would fail healthy
 * runs; it is surfaced only when the process itself exits non-zero.
 */
function callClaude(prompt: string): { result: string; usage: CliUsage } {
  let lastSpawnError = "";

  for (const useShell of [false, true]) {
    const proc = spawnSync("claude", ["-p", "--model", "sonnet", "--output-format", "json"], {
      input: prompt,
      encoding: "utf8",
      shell: useShell,
      windowsHide: true,
      maxBuffer: 64 * 1024 * 1024,
    });

    if (proc.error) {
      const code = (proc.error as NodeJS.ErrnoException).code;
      // Only a resolution failure is worth a second attempt through a shell. Anything else
      // would just be paid for twice.
      if (code === "ENOENT" && !useShell) {
        lastSpawnError = proc.error.message;
        continue;
      }
      throw new Error(`Spawning the claude CLI failed: ${proc.error.message}`);
    }

    if (proc.status !== 0) {
      throw new Error(
        `The claude CLI exited ${proc.status ?? "on a signal"}. stderr follows:\n${proc.stderr ?? "(empty)"}`,
      );
    }

    return parseEnvelope(proc.stdout ?? "");
  }

  throw new Error(
    `\`claude\` could not be spawned directly or through a shell. Every model call in this phase rides the CLI on the subscription (D-16). Last spawn error: ${lastSpawnError}`,
  );
}

function parseEnvelope(stdout: string): { result: string; usage: CliUsage } {
  let envelope: unknown;
  try {
    envelope = JSON.parse(stdout.trim());
  } catch (err) {
    throw new Error(
      `stdout from the claude CLI was not JSON, so --output-format json did not do what it says. First 400 characters:\n${stdout.slice(0, 400)}\n(${err instanceof Error ? err.message : String(err)})`,
    );
  }

  if (typeof envelope !== "object" || envelope === null) {
    throw new Error("The claude CLI envelope is not a JSON object.");
  }

  const env = envelope as Record<string, unknown>;
  if (env.is_error === true) {
    throw new Error(`The claude CLI reported is_error: true. subtype=${String(env.subtype)}`);
  }
  if (typeof env.result !== "string") {
    throw new Error("The claude CLI envelope carries no string `result` field.");
  }

  const usage = (env.usage ?? {}) as Record<string, unknown>;
  const num = (key: string): number => (typeof usage[key] === "number" ? (usage[key] as number) : 0);

  const fresh = num("input_tokens");
  const cacheCreate = num("cache_creation_input_tokens");
  const cacheRead = num("cache_read_input_tokens");
  const output = num("output_tokens");

  return {
    result: env.result,
    usage: {
      // All three input components, summed. `input_tokens` alone is the uncached remainder
      // and on this transport it is a single-digit number, which would record a run that
      // read tens of thousands of tokens as if it had read four.
      inputTokens: fresh + cacheCreate + cacheRead,
      outputTokens: output,
      breakdown: `input=${fresh} cache_creation=${cacheCreate} cache_read=${cacheRead} output=${output}`,
    },
  };
}

function buildPrompt(candidates: readonly Candidate[]): string {
  const lines = candidates.map((c) => `${c.frequency}\t${c.term}\t${c.example}`).join("\n");

  return `You are seeding a Farsi (Persian) translation glossary for a technical publication that writes in English about AI, machine learning, data engineering, financial risk and regulation. Its articles will be translated into Farsi, and this glossary fixes how the recurring terminology is rendered so it cannot drift from article to article.

Below is a candidate list mined from the publication's own 26 published articles. Every line is:

frequency<TAB>term<TAB>an example sentence containing it, taken from the corpus

The frequencies were counted in code over the real corpus. They are evidence, not estimates. Use them as a signal of what actually recurs.

TASK

Select between ${MIN_ENTRIES} and ${MAX_ENTRIES} candidates that are genuinely recurring DOMAIN terms in AI, data or finance, and give each one a Farsi rendering and a strategy tag.

Select for: terms a translator would need a fixed decision about. Named regulations, model and system concepts, data and infrastructure vocabulary, statistical and risk terms, finance and banking terms, tool and language names.

Reject: generic English that happens to be frequent (words like "across", "understanding", "building", "matters", "three"), fragments of a longer term when the longer term is also a candidate, and inflected duplicates of a term you have already selected (choose one of "model" and "models", not both).

For each selection return three fields:

- "term": the English term copied EXACTLY as it appears in the candidate list, character for character. Do not re-case it, do not singularise or pluralise it, do not merge or split candidates. A term that does not appear verbatim in the list will be dropped by the code that reads your answer.
- "rendering": the exact string a translator should write in Farsi prose for that term.
- "strategy": one of "translate", "transliterate", "keep-english".

STRATEGY MEANINGS

- "translate": a real Farsi equivalent is idiomatic. The rendering is Persian script.
- "transliterate": the English word is what Farsi writers say, but written out in Persian script. The rendering is Persian script.
- "keep-english": Farsi technical prose keeps this term in Latin script. The rendering is the Latin-script form exactly as it should appear inside a Farsi sentence.

"keep-english" is a correct and expected answer, not a failure to translate. Farsi tech press routinely keeps terms such as transformer, API, Python and SQL in Latin script, and forcing Persian script onto those reads as amateur. Choose it whenever Latin script is the idiomatic rendering. Where a term has a settled Persian form, choose "translate" and give that form.

OUTPUT

Respond with a single JSON object and nothing else. No prose before it, no prose after it, no markdown code fences, no explanation.

Exact shape:

{"entries":[{"term":"machine learning","rendering":"...","strategy":"translate"}]}

These rules are checked in code and a violation fails the run:

- between ${MIN_ENTRIES} and ${MAX_ENTRIES} entries
- every "strategy" is exactly one of ${STRATEGIES.map((s) => `"${s}"`).join(", ")}
- every "term" appears verbatim in the candidate list
- no duplicate terms
- non-empty "rendering" on every entry

CANDIDATE LIST (${candidates.length} candidates)

${lines}
`;
}

/**
 * Shape validation in code, because this transport has no request-level schema enforcement.
 * This is the hard gate that a response schema used to be, and it runs before anything is
 * written: a model response is untrusted input that becomes a version-controlled file which
 * then shapes every future translation (T-03-05).
 */
function validateModelEntries(parsed: unknown): ModelEntry[] {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`The model response is not a JSON object. Got: ${typeof parsed}`);
  }

  const entries = (parsed as Record<string, unknown>).entries;
  if (!Array.isArray(entries)) {
    throw new Error("The model response has no `entries` array.");
  }
  if (entries.length < MIN_ENTRIES || entries.length > MAX_ENTRIES) {
    throw new Error(
      `The model returned ${entries.length} entries, outside the required ${MIN_ENTRIES} to ${MAX_ENTRIES}.`,
    );
  }

  const out: ModelEntry[] = [];
  entries.forEach((raw, i) => {
    if (typeof raw !== "object" || raw === null) {
      throw new Error(`entries[${i}] is not an object.`);
    }
    const e = raw as Record<string, unknown>;
    const term = e.term;
    const rendering = e.rendering;
    const strategy = e.strategy;

    if (typeof term !== "string" || term.trim().length === 0) {
      throw new Error(`entries[${i}] has no non-empty string \`term\`.`);
    }
    if (typeof rendering !== "string" || rendering.trim().length === 0) {
      throw new Error(`entries[${i}] ("${term}") has no non-empty string \`rendering\`.`);
    }
    if (typeof strategy !== "string" || !STRATEGIES.includes(strategy as Strategy)) {
      throw new Error(
        `entries[${i}] ("${term}") has strategy ${JSON.stringify(strategy)}, which is not one of ${STRATEGIES.join(", ")}.`,
      );
    }

    out.push({ term, rendering: rendering.trim(), strategy: strategy as Strategy });
  });

  return out;
}

/**
 * Join the model's selections back onto the counted evidence. A term the model invented, or
 * re-cased, or pluralised, has no counted frequency, and inventing one for it would put a
 * fabricated number in front of Saeid as if it were measured (T-03-24). Those are dropped
 * and reported instead.
 */
function joinToCandidates(
  selections: readonly ModelEntry[],
  candidates: readonly Candidate[],
): { entries: GlossaryEntry[]; dropped: string[] } {
  const byLowerTerm = new Map(candidates.map((c) => [c.term.toLowerCase(), c]));
  const entries: GlossaryEntry[] = [];
  const seen = new Set<string>();
  const dropped: string[] = [];

  for (const sel of selections) {
    const key = sel.term.toLowerCase();
    const candidate = byLowerTerm.get(key);
    if (!candidate) {
      dropped.push(`${sel.term} (not in the candidate list)`);
      continue;
    }
    if (seen.has(key)) {
      dropped.push(`${sel.term} (duplicate selection)`);
      continue;
    }
    seen.add(key);
    entries.push({
      // The candidate's spelling, not the model's: the term column must match the corpus.
      term: candidate.term,
      rendering: sel.rendering,
      strategy: sel.strategy,
      frequency: candidate.frequency,
      example: candidate.example,
      exampleSlug: candidate.exampleSlug,
    });
  }

  entries.sort((a, b) => byString(a.term, b.term));
  return { entries, dropped };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const STRATEGY_BLURB: Readonly<Record<Strategy, string>> = {
  translate: "a real Farsi equivalent is idiomatic, so the rendering is Persian script",
  transliterate: "the English word is what Farsi writers say, spelled out in Persian script",
  "keep-english": "Farsi tech prose keeps this one in Latin script, which is the correct answer here and not a missed translation",
};

/**
 * The review artifact (D-03). Standalone by construction: inline CSS, no script, no external
 * font, no image, so it opens correctly from a file path with no network.
 *
 * It carries no generation date. --regen-html must reproduce this file byte for byte from the
 * same JSON in plan 03-06 after Saeid's corrections are applied, and a timestamp would make
 * every regeneration a diff.
 */
function renderReviewHtml(glossary: Glossary): string {
  const counts = STRATEGIES.map(
    (s) => `${s}: ${glossary.entries.filter((e) => e.strategy === s).length}`,
  ).join(", ");

  const rows = glossary.entries
    .map(
      (e) => `      <tr>
        <td class="term">${escapeHtml(e.term)}</td>
        <td class="rendering" dir="rtl" lang="fa">${escapeHtml(e.rendering)}</td>
        <td class="strategy"><span class="tag tag-${e.strategy}">${e.strategy}</span></td>
        <td class="freq">${e.frequency}</td>
        <td class="example">${escapeHtml(e.example)}<span class="slug">${escapeHtml(e.exampleSlug)}</span></td>
        <td class="correction"></td>
      </tr>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Farsi glossary: first pass for review</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 2rem 1.5rem 4rem;
    font: 15px/1.6 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1a1c20; background: #f6f7f9;
  }
  main { max-width: 1180px; margin: 0 auto; }
  h1 { font-size: 1.6rem; margin: 0 0 .35rem; letter-spacing: -.01em; }
  .lede { color: #4a4f57; max-width: 70ch; margin: 0 0 1.25rem; }
  .panel {
    background: #fff; border: 1px solid #e2e5ea; border-radius: 10px;
    padding: 1rem 1.25rem; margin: 0 0 1.5rem;
  }
  .panel h2 { font-size: .95rem; text-transform: uppercase; letter-spacing: .06em; color: #6b7280; margin: 0 0 .6rem; }
  .panel ul { margin: 0; padding-left: 1.1rem; }
  .panel li { margin: .3rem 0; }
  .stats { font-variant-numeric: tabular-nums; color: #4a4f57; margin: .4rem 0 0; }
  table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e2e5ea; border-radius: 10px; overflow: hidden; }
  thead th {
    position: sticky; top: 0; background: #eef1f5; text-align: left;
    font-size: .78rem; text-transform: uppercase; letter-spacing: .05em; color: #4a4f57;
    padding: .6rem .7rem; border-bottom: 1px solid #d8dce3; white-space: nowrap;
  }
  tbody td { padding: .55rem .7rem; border-bottom: 1px solid #eef0f3; vertical-align: top; }
  tbody tr:nth-child(even) { background: #fbfcfd; }
  .term { font-weight: 600; white-space: nowrap; }
  .rendering {
    font-family: "Vazirmatn", "Segoe UI", Tahoma, "Iranian Sans", "B Nazanin", sans-serif;
    font-size: 1.05rem; white-space: nowrap;
  }
  .freq { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .example { color: #3d424a; min-width: 26rem; }
  .slug { display: block; margin-top: .2rem; font-size: .76rem; color: #8b919b; }
  .correction { min-width: 12rem; background: #fffdf3; }
  .tag { display: inline-block; padding: .1rem .45rem; border-radius: 999px; font-size: .74rem; white-space: nowrap; }
  .tag-translate { background: #e4f1e6; color: #216032; }
  .tag-transliterate { background: #e6ecf7; color: #22437f; }
  .tag-keep-english { background: #f6ecdc; color: #7a4a12; }
</style>
</head>
<body>
<main>
  <h1>Farsi glossary: first pass for review</h1>
  <p class="lede">
    This is the drafted first pass of the translation glossary. Every term below was mined from
    your own 26 published English posts, and the frequency column is a real count over that
    corpus, computed in code rather than estimated. The example sentence is a real sentence
    from the post named under it. Correct anything that reads wrong and the corrections are
    applied straight back to <code>content/fa-glossary.json</code>.
  </p>

  <div class="panel">
    <h2>What the three strategies mean</h2>
    <ul>
${STRATEGIES.map((s) => `      <li><strong>${s}</strong>: ${STRATEGY_BLURB[s]}</li>`).join("\n")}
    </ul>
    <p class="stats">${glossary.entries.length} entries. ${counts}.</p>
  </div>

  <div class="panel">
    <h2>How to send corrections</h2>
    <ul>
      <li>Write the rendering you want in the <strong>Correction</strong> column, or mark the row for deletion.</li>
      <li>To change only the strategy tag, write the tag you want in that column.</li>
      <li>Send the marked-up table back, or list the corrections as "term: new rendering (strategy)" lines. Either form is applied to the JSON, and this page is then regenerated from it so the two can never disagree.</li>
    </ul>
  </div>

  <table>
    <thead>
      <tr>
        <th>Term</th>
        <th>Farsi rendering</th>
        <th>Strategy</th>
        <th>Corpus frequency</th>
        <th>Example sentence from your posts</th>
        <th>Correction</th>
      </tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
</main>
</body>
</html>
`;
}

function readCandidates(): Candidate[] {
  let raw: string;
  try {
    raw = readFileSync(CANDIDATES_PATH, "utf8");
  } catch {
    throw new Error(
      `No candidate artifact at ${relToRepo(CANDIDATES_PATH)}. Run the mining mode first: npx tsx --env-file .env.vercel-prod scripts/mine-glossary-terms.ts`,
    );
  }

  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`${relToRepo(CANDIDATES_PATH)} is not a non-empty array of candidates.`);
  }
  return parsed as Candidate[];
}

/**
 * Where this run's spend gets recorded. Resolved BEFORE the model call, never after: an ADMIN
 * that cannot be resolved must stop the run while there is nothing to lose, not after the
 * tokens are gone.
 */
async function resolveSpendTarget(): Promise<{ kind: "db"; userId: string } | { kind: "log" }> {
  const hasDb = typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.length > 0;
  if (!hasDb) {
    console.log(
      "No DATABASE_URL in this env file, so the TokenUsage row cannot be written. Falling back to the documented run log; the counts are still recorded, just not in the database.",
    );
    return { kind: "log" };
  }
  const { resolveAdminUserId } = await import("./lib/token-usage");
  const userId = await resolveAdminUserId();
  console.log(`Spend recipient resolved before the model call (ADMIN id length ${userId.length}).`);
  return { kind: "db", userId };
}

async function recordSpend(
  target: { kind: "db"; userId: string } | { kind: "log" },
  usage: CliUsage,
  calls: number,
): Promise<void> {
  const line = `${ACTIVITY}: model=${MODEL_LABEL} calls=${calls} inputTokens=${usage.inputTokens} outputTokens=${usage.outputTokens} (${usage.breakdown}) costUSD=0 (subscription-funded, D-16)`;

  if (target.kind === "log") {
    mkdirSync(path.dirname(RUN_LOG_PATH), { recursive: true });
    appendFileSync(RUN_LOG_PATH, `- ${line}\n`, "utf8");
    console.log(`FALLBACK: appended the spend record to ${relToRepo(RUN_LOG_PATH)}`);
    console.log(`  ${line}`);
    return;
  }

  const { recordTokenUsage } = await import("./lib/token-usage");
  const written = await recordTokenUsage(target.userId, [
    {
      activity: ACTIVITY,
      model: MODEL_LABEL,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    },
  ]);
  if (written !== 1) {
    throw new Error(`Expected to write exactly 1 TokenUsage row, wrote ${written}.`);
  }
  console.log(`Recorded 1 TokenUsage row. ${line}`);

  const { prisma } = await import("../src/lib/prisma");
  await prisma.$disconnect();
}

async function classify(): Promise<void> {
  const candidates = readCandidates();
  console.log(
    `mine-glossary-terms: mode=CLASSIFY candidates=${candidates.length} transport=claude CLI on the subscription (D-16), model=sonnet, ONE call`,
  );

  const spendTarget = await resolveSpendTarget();

  const prompt = buildPrompt(candidates);
  console.log(`Prompt built: ${prompt.length} characters on stdin.`);

  let calls = 0;
  const total: CliUsage = { inputTokens: 0, outputTokens: 0, breakdown: "" };
  const breakdowns: string[] = [];

  const call = (): string => {
    calls += 1;
    const { result, usage } = callClaude(prompt);
    total.inputTokens += usage.inputTokens;
    total.outputTokens += usage.outputTokens;
    breakdowns.push(usage.breakdown);
    return result;
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse(call().trim());
  } catch (first) {
    // Exactly one retry. A second parse failure fails the run rather than degrading into
    // some lenient salvage of prose the model wrapped around its JSON.
    console.log(
      `The response did not parse as JSON (${first instanceof Error ? first.message : String(first)}). Retrying the call once.`,
    );
    parsed = JSON.parse(call().trim());
  }
  total.breakdown = breakdowns.join(" | ");

  const selections = validateModelEntries(parsed);
  const { entries, dropped } = joinToCandidates(selections, candidates);

  for (const d of dropped) console.log(`  dropped: ${d}`);
  if (entries.length < MIN_ENTRIES) {
    throw new Error(
      `After joining back to the counted candidates only ${entries.length} entries survived, below the ${MIN_ENTRIES} floor. Dropped: ${dropped.join("; ") || "(none)"}`,
    );
  }

  const glossary: Glossary = { version: 1, entries };
  writeJson(GLOSSARY_PATH, glossary);
  mkdirSync(path.dirname(REVIEW_HTML_PATH), { recursive: true });
  writeFileSync(REVIEW_HTML_PATH, renderReviewHtml(glossary), "utf8");

  const counts = STRATEGIES.map(
    (s) => `${s}=${entries.filter((e) => e.strategy === s).length}`,
  ).join(" ");
  console.log(
    `Wrote ${entries.length} entries (${counts}) to ${relToRepo(GLOSSARY_PATH)} and ${relToRepo(REVIEW_HTML_PATH)}`,
  );

  await recordSpend(spendTarget, total, calls);
}

/**
 * Rebuild the HTML from the JSON with no model call, no corpus read and no env file. Plan
 * 03-06 runs this after applying Saeid's corrections, so the two files cannot drift and a
 * regeneration costs nothing.
 *
 * The shape check here is deliberately minimal: it validates only what rendering needs.
 * scripts/lib/glossary.ts owns the full validating loader that gates the translate prompt.
 */
function regenHtml(): void {
  const parsed: unknown = JSON.parse(readFileSync(GLOSSARY_PATH, "utf8"));
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`${relToRepo(GLOSSARY_PATH)} is not a JSON object.`);
  }
  const g = parsed as Record<string, unknown>;
  if (g.version !== 1) throw new Error(`${relToRepo(GLOSSARY_PATH)} has version ${String(g.version)}, expected 1.`);
  if (!Array.isArray(g.entries) || g.entries.length === 0) {
    throw new Error(`${relToRepo(GLOSSARY_PATH)} has no non-empty entries array.`);
  }

  const glossary = parsed as Glossary;
  for (const [i, e] of glossary.entries.entries()) {
    if (!STRATEGIES.includes(e.strategy)) {
      throw new Error(`entries[${i}] ("${e.term}") has strategy "${e.strategy}", not one of ${STRATEGIES.join(", ")}.`);
    }
  }

  writeFileSync(REVIEW_HTML_PATH, renderReviewHtml(glossary), "utf8");
  console.log(
    `mine-glossary-terms: mode=REGEN-HTML, rebuilt ${relToRepo(REVIEW_HTML_PATH)} from ${glossary.entries.length} entries. No model call, no network.`,
  );
}

async function main(): Promise<void> {
  if (REGEN_HTML) {
    regenHtml();
    return;
  }
  if (CLASSIFY) {
    await classify();
    return;
  }
  await mine();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
