/**
 * Mine the recurring AI, data and finance vocabulary out of the published English corpus,
 * so the Farsi glossary (D-01) is seeded from evidence rather than from memory.
 *
 * READ ONLY against Sanity. This script never patches, creates or deletes a document. Its
 * only writes are to files in this repository.
 *
 * Usage:
 *   npx tsx --env-file .env.vercel-prod scripts/mine-glossary-terms.ts            (mine, writes the candidate artifact)
 *   npx tsx --env-file .env.vercel-prod scripts/mine-glossary-terms.ts --check    (report the top 50, writes nothing)
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

import { mkdirSync, writeFileSync } from "node:fs";
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

const argv = process.argv.slice(2);
const CHECK = argv.includes("--check");

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

async function main(): Promise<void> {
  await mine();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
