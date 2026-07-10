/**
 * Pure character n-gram math for the next-token-prediction guide. No React.
 *
 * This module is the single source of every number the guide displays:
 * the corpus statistics, the count tables, every probability bar, the
 * entropy readout, and the sampling draw. A verifier can recompute all
 * of them by executing these functions with node/tsx.
 *
 * The model is a count-based character n-gram language model trained on
 * the visible CORPUS below. For a context of k characters, the
 * distribution over the next character is the normalized count of what
 * actually followed that context in the corpus. If a requested context
 * never appears in the corpus, the model backs off to a shorter context,
 * down to the order-0 model (overall character frequencies), which always
 * exists. This is disclosed in the UI whenever it happens.
 */

export const CORPUS_RAW =
  "the cat sat on the mat and the dog slept by the door. " +
  "the rain in spain stays mainly on the plain. " +
  "she sells sea shells by the sea shore. " +
  "the queen quietly quizzed the quick squid. " +
  "a model that reads this text learns which letter tends to follow which letter. " +
  "the model then writes new text one letter at a time by guessing the next letter again and again. " +
  "the more text the model reads the better the guesses get. " +
  "there is no plan and no meaning inside the machine. " +
  "there is only a table of counts and a roll of the dice.";

/** Lowercase, collapse whitespace, and keep only the guide's alphabet: a-z, space, period. */
export function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z .]/g, "")
    .trim();
}

export const CORPUS = normalizeText(CORPUS_RAW);

/** Every distinct character in the corpus, sorted. */
export const ALPHABET: readonly string[] = [...new Set(CORPUS)].sort();

const ALPHABET_SET = new Set(ALPHABET);

/** Filter arbitrary user input down to the corpus alphabet (uppercase is folded). */
export function normalizeInput(raw: string): string {
  return [...raw.toLowerCase()].filter((c) => ALPHABET_SET.has(c)).join("");
}

/** Render a character for display: space becomes a visible open box. */
export function displayChar(c: string): string {
  return c === " " ? "␣" : c;
}

/** Render a whole context string for display. */
export function displayContext(ctx: string): string {
  return [...ctx].map(displayChar).join("");
}

export const MAX_ORDER = 2;

export interface NgramModel {
  /** Context length k: the distribution conditions on the previous k characters. */
  order: number;
  /** context string -> (next char -> count). Only contexts seen in the corpus appear. */
  table: Map<string, Map<string, number>>;
  /** Number of distinct contexts observed. */
  contextCount: number;
  /** Number of (context, next char) training windows: corpus length minus order. */
  windowCount: number;
}

export function buildModel(corpus: string, order: number): NgramModel {
  const table = new Map<string, Map<string, number>>();
  let windowCount = 0;
  for (let i = order; i < corpus.length; i++) {
    const ctx = corpus.slice(i - order, i);
    const next = corpus[i];
    let row = table.get(ctx);
    if (!row) {
      row = new Map<string, number>();
      table.set(ctx, row);
    }
    row.set(next, (row.get(next) ?? 0) + 1);
    windowCount++;
  }
  return { order, table, contextCount: table.size, windowCount };
}

/** Models for orders 0..MAX_ORDER, built once from the visible corpus. Deterministic. */
export const MODELS: readonly NgramModel[] = Array.from(
  { length: MAX_ORDER + 1 },
  (_, k) => buildModel(CORPUS, k)
);

export interface DistEntry {
  char: string;
  /** Raw count of this continuation after the used context. */
  count: number;
  /** count / total: the probability the model assigns. */
  prob: number;
}

export interface Distribution {
  /** The context the user's order asked for (tail of the sequence). */
  contextRequested: string;
  /** The context actually used after backoff ("" means order-0 frequencies). */
  contextUsed: string;
  orderUsed: number;
  /** True when contextUsed is shorter than contextRequested. */
  backedOff: boolean;
  /** Total observations of contextUsed in the corpus. */
  total: number;
  /** Sorted by count descending, then alphabetically. Only counts > 0 appear. */
  entries: DistEntry[];
  /** Shannon entropy of the distribution, in bits. */
  entropyBits: number;
}

/**
 * The next-character distribution given the full current sequence and a
 * requested order, with disclosed backoff to shorter contexts.
 */
export function getDistribution(sequence: string, order: number): Distribution {
  const maxK = Math.min(order, sequence.length);
  const contextRequested = sequence.slice(sequence.length - maxK);
  for (let k = maxK; k >= 0; k--) {
    const ctx = k === 0 ? "" : sequence.slice(sequence.length - k);
    const row = MODELS[k].table.get(ctx);
    if (!row) continue;
    let total = 0;
    for (const count of row.values()) total += count;
    const entries: DistEntry[] = [...row.entries()]
      .map(([char, count]) => ({ char, count, prob: count / total }))
      .sort((a, b) => b.count - a.count || a.char.localeCompare(b.char));
    let entropyBits = 0;
    for (const e of entries) entropyBits -= e.prob * Math.log2(e.prob);
    return {
      contextRequested,
      contextUsed: ctx,
      orderUsed: k,
      backedOff: k < maxK,
      total,
      entries,
      entropyBits: Math.max(0, entropyBits),
    };
  }
  // Unreachable: the order-0 model always has the "" context.
  throw new Error("order-0 model missing");
}

export interface SamplePick {
  /** Index into dist.entries of the sampled character. */
  index: number;
  /** Cumulative-probability slice [lo, hi) the draw landed in. */
  lo: number;
  hi: number;
  /** The uniform draw in [0, 1). */
  u: number;
}

/** Inverse-CDF sampling: walk the cumulative distribution until u falls in a slice. */
export function samplePick(dist: Distribution, u: number): SamplePick {
  let acc = 0;
  for (let i = 0; i < dist.entries.length; i++) {
    const lo = acc;
    acc += dist.entries[i].prob;
    if (u < acc || i === dist.entries.length - 1) {
      return { index: i, lo, hi: acc, u };
    }
  }
  throw new Error("empty distribution");
}

/** Deterministic LCG (SPEC v2): the guide's only source of randomness. */
export function lcgNext(seed: number): number {
  return (seed * 1664525 + 1013904223) >>> 0;
}

/** Map an LCG state to a uniform draw in [0, 1). */
export function lcgUnit(seed: number): number {
  return seed / 0xffffffff;
}

export const INITIAL_SEED = 20260710;
export const INITIAL_PREFIX = "the ";
export const MAX_GENERATED = 160;
export const GATE_MIN_CHARS = 15;
export const AUTOPLAY_MS = 300;

/** Display colors for this guide's series (from the spec token table only). */
export const SERIES_COLORS = {
  /** Probability bars: secondary teal. */
  bar: "#3bb4a4",
  /** Alternate slice color in the cumulative strip: primary blue. */
  slice: "#1e5d8a",
} as const;
