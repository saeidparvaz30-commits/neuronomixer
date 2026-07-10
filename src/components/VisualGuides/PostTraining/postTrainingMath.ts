/**
 * Pure math for the post-training guide (from base model to assistant).
 * No React imports. Every number the guide displays is computed here:
 * two real bigram language models trained on the visible corpora below,
 * the SFT log-linear blend, the closed-form KL-regularized preference
 * optimum, token rewards counted from the visible preference pairs,
 * entropies, KL divergences, effective vocabulary sizes, and seeded
 * samples. A verifier can recompute every displayed value by executing
 * these functions with node/tsx.
 *
 * The toy setup: a shared vocabulary over two small corpora, a base
 * bigram model p_base trained on raw web-style text, a demonstration
 * bigram model p_demo trained on assistant-style text, and two knobs:
 *
 *   SFT blend      p_sft(w|c) = (1 - lambda) * p_base(w|c) + lambda * p_demo(w|c)
 *   preference     p_rl(w|c)  proportional to p_sft(w|c) * exp( r(w) / beta )
 *
 * The preference formula is the exact optimum of
 *   max_p  E_p[r] - beta * KL(p || p_sft)
 * which is the KL-regularized objective used in RLHF-style tuning.
 */

// ── Visible training data ────────────────────────────────────────────────────

/** Raw web-style pretraining corpus: what a base model imitates. */
export const BASE_CORPUS: readonly string[] = [
  "idk the answer is wrong lol",
  "the answer is whatever man",
  "lol the model is broken again",
  "the answer is wrong and the thread is locked",
  "the response is spam and the mods are asleep",
  "honestly the answer is a guess",
  "the model is hype and the demo is fake",
  "first the answer is maybe and then the answer is no",
  "the reply is rude but the joke is funny",
  "the model is fine idk what you mean",
  "the forum is spam and the thread is spam",
  "the answer is on page two lol",
  "the response is late and the thread is dead",
  "the model is guessing and the answer is random",
];

/** Demonstration corpus: assistant-style completions written for SFT. */
export const SFT_CORPUS: readonly string[] = [
  "the answer is correct and the reasoning is clear",
  "the answer is helpful because the source is cited",
  "the response is concise and the tone is polite",
  "the model is helpful and the answer is accurate",
  "the answer is clear and the summary is short",
  "the response is helpful and the answer is correct",
  "the model is careful and the answer is honest",
  "the reply is polite and the answer is complete",
  "the answer is accurate and the response is clear",
  "sure the answer is helpful and the answer is clear",
];

export interface PreferencePair {
  id: string;
  /** Preferred next word. */
  winner: string;
  /** Dispreferred next word. */
  loser: string;
  rationale: string;
}

/** Authored preference judgments: the entire "human feedback" for this toy run. */
export const PREF_PAIRS: readonly PreferencePair[] = [
  { id: "p1", winner: "helpful", loser: "whatever", rationale: "An engaged answer beats a shrug." },
  { id: "p2", winner: "correct", loser: "wrong", rationale: "Raters put right answers above wrong ones." },
  { id: "p3", winner: "clear", loser: "spam", rationale: "Readable beats noise." },
  { id: "p4", winner: "helpful", loser: "lol", rationale: "Substance beats a reaction." },
  { id: "p5", winner: "polite", loser: "rude", rationale: "Tone shows up in ratings." },
  { id: "p6", winner: "concise", loser: "random", rationale: "Focused beats filler." },
];

// ── Constants ────────────────────────────────────────────────────────────────

/** Add-k smoothing constant so every vocabulary word has nonzero probability. */
export const SMOOTHING_K = 0.05;
export const LAMBDA_MIN = 0;
export const LAMBDA_MAX = 1;
export const LAMBDA_STEP = 0.05;
export const LAMBDA_DEFAULT = 0.5;
export const BETA_MIN = 0.1;
export const BETA_MAX = 3;
export const BETA_STEP = 0.05;
export const BETA_DEFAULT = 2;
export const SAMPLE_COUNT = 12;
export const INITIAL_SEED = 20260710;
export const CHART_TOP_N = 12;

export const PROMPT_CONTEXTS = [
  { id: "is", context: "is", display: "the answer is ___" },
  { id: "the", context: "the", display: "... and the ___" },
] as const;

export type ContextId = (typeof PROMPT_CONTEXTS)[number]["id"];

export type StageId = "base" | "sft" | "assistant";

/**
 * Series colors, defined once. The assistant series uses the accent CSS var
 * per the design token rules; the other two come from the token table.
 */
export const SERIES_COLORS: Record<StageId, string> = {
  base: "#475569",
  sft: "#3bb4a4",
  assistant: "var(--color-accent)",
};

// ── Tokenization and training ────────────────────────────────────────────────

export function tokenize(line: string): string[] {
  return line.toLowerCase().split(/\s+/).filter(Boolean);
}

export function buildVocab(corpora: readonly (readonly string[])[]): string[] {
  const set = new Set<string>();
  for (const corpus of corpora) {
    for (const line of corpus) {
      for (const tok of tokenize(line)) set.add(tok);
    }
  }
  return [...set].sort();
}

export type BigramCounts = Record<string, Record<string, number>>;

/** Train a bigram model: count(next | prev) over consecutive word pairs. */
export function trainBigram(lines: readonly string[]): BigramCounts {
  const counts: BigramCounts = {};
  for (const line of lines) {
    const toks = tokenize(line);
    for (let i = 0; i + 1 < toks.length; i++) {
      const prev = toks[i];
      const next = toks[i + 1];
      if (!counts[prev]) counts[prev] = {};
      counts[prev][next] = (counts[prev][next] ?? 0) + 1;
    }
  }
  return counts;
}

/**
 * Add-k smoothed next-token distribution over the full vocabulary,
 * conditioned on a single context word (this is a real bigram LM).
 */
export function nextTokenDist(
  counts: BigramCounts,
  context: string,
  vocab: readonly string[],
  k: number = SMOOTHING_K
): number[] {
  const row = counts[context] ?? {};
  let total = 0;
  for (const key of Object.keys(row)) total += row[key];
  const denom = total + k * vocab.length;
  return vocab.map((w) => ((row[w] ?? 0) + k) / denom);
}

export function corpusStats(lines: readonly string[]): { lines: number; tokens: number } {
  let tokens = 0;
  for (const line of lines) tokens += tokenize(line).length;
  return { lines: lines.length, tokens };
}

// ── Distribution shaping ─────────────────────────────────────────────────────

/** Normalize a vector of log-scores into a probability distribution (softmax). */
export function normalizeLog(logits: readonly number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((z) => Math.exp(z - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/**
 * SFT stage: linear mixture of the base and demonstration models.
 * lambda = 0 returns the base model, lambda = 1 the pure demonstration model.
 * Real SFT runs gradient descent on demonstration tokens; this mixture is a
 * transparent stand-in with the same qualitative effect, probability mass
 * moves toward the demonstration data (disclosed in the UI).
 */
export function sftBlend(
  pBase: readonly number[],
  pDemo: readonly number[],
  lambda: number
): number[] {
  return pBase.map((p, i) => (1 - lambda) * p + lambda * pDemo[i]);
}

/** Net reward per vocabulary word, counted from the preference pairs. */
export function tokenRewards(
  vocab: readonly string[],
  pairs: readonly PreferencePair[]
): number[] {
  const net: Record<string, number> = {};
  for (const pair of pairs) {
    net[pair.winner] = (net[pair.winner] ?? 0) + 1;
    net[pair.loser] = (net[pair.loser] ?? 0) - 1;
  }
  return vocab.map((w) => net[w] ?? 0);
}

/**
 * Preference stage: the exact closed-form optimum of
 *   max_p  E_p[r] - beta * KL(p || pRef)
 * which is p(w) proportional to pRef(w) * exp(r(w) / beta).
 * Large beta: tight tether, stays near the reference.
 * Small beta: loose tether, reward dominates and diversity collapses.
 */
export function preferenceOptimum(
  pRef: readonly number[],
  rewards: readonly number[],
  beta: number
): number[] {
  return normalizeLog(pRef.map((p, i) => Math.log(p) + rewards[i] / beta));
}

// ── Metrics ──────────────────────────────────────────────────────────────────

export function entropyBits(p: readonly number[]): number {
  let h = 0;
  for (const v of p) {
    if (v > 0) h -= v * Math.log2(v);
  }
  return h;
}

/** 2^H: the "effective number of distinct next words" the distribution spreads over. */
export function effectiveVocab(p: readonly number[]): number {
  return 2 ** entropyBits(p);
}

/** KL(p || q) in bits. Both inputs are strictly positive (smoothed / softmaxed). */
export function klBits(p: readonly number[], q: readonly number[]): number {
  let kl = 0;
  for (let i = 0; i < p.length; i++) {
    if (p[i] > 0) kl += p[i] * Math.log2(p[i] / q[i]);
  }
  return Math.max(0, kl);
}

export function argmax(values: readonly number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[best]) best = i;
  }
  return best;
}

// ── Chart rows ───────────────────────────────────────────────────────────────

export interface ChartRow {
  token: string;
  base: number;
  sft: number;
  rl: number;
  isOther?: boolean;
}

/**
 * Top-N vocabulary words by their largest probability across the three
 * distributions, plus one aggregate "all other words" row so the full
 * probability mass is accounted for on screen.
 */
export function buildChartRows(
  vocab: readonly string[],
  pBase: readonly number[],
  pSft: readonly number[],
  pRl: readonly number[],
  topN: number = CHART_TOP_N
): ChartRow[] {
  const scored = vocab.map((_, i) => ({
    i,
    score: Math.max(pBase[i], pSft[i], pRl[i]),
  }));
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topN).map((s) => s.i);
  const rows: ChartRow[] = top.map((i) => ({
    token: vocab[i],
    base: pBase[i],
    sft: pSft[i],
    rl: pRl[i],
  }));
  const sumOf = (p: readonly number[]) => top.reduce((acc, i) => acc + p[i], 0);
  rows.push({
    token: "all other words",
    base: Math.max(0, 1 - sumOf(pBase)),
    sft: Math.max(0, 1 - sumOf(pSft)),
    rl: Math.max(0, 1 - sumOf(pRl)),
    isOther: true,
  });
  return rows;
}

// ── Seeded sampling (deterministic LCG, only advanced on user clicks) ───────

export function lcgNext(seed: number): number {
  return (seed * 1664525 + 1013904223) >>> 0;
}

/** Draw n words from a distribution by inverse CDF using the LCG chain. */
export function drawSamples(
  dist: readonly number[],
  vocab: readonly string[],
  n: number,
  seed: number
): { words: string[]; seed: number } {
  let s = seed;
  const words: string[] = [];
  for (let d = 0; d < n; d++) {
    s = lcgNext(s);
    const u = s / 0xffffffff;
    let acc = 0;
    let picked = dist.length - 1;
    for (let i = 0; i < dist.length; i++) {
      acc += dist[i];
      if (u <= acc) {
        picked = i;
        break;
      }
    }
    words.push(vocab[picked]);
  }
  return { words, seed: s };
}

export function distinctCount(words: readonly string[]): number {
  return new Set(words).size;
}

// ── Precomputed, deterministic module-level artifacts ───────────────────────

export const VOCAB: readonly string[] = buildVocab([BASE_CORPUS, SFT_CORPUS]);
export const BASE_COUNTS: BigramCounts = trainBigram(BASE_CORPUS);
export const DEMO_COUNTS: BigramCounts = trainBigram(SFT_CORPUS);
export const REWARDS: readonly number[] = tokenRewards(VOCAB, PREF_PAIRS);
