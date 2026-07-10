/**
 * Pure math for the attention-mechanism guide. No React imports.
 *
 * This module is the single source of every number the guide displays:
 * the playground dot-product scores, softmax weights and blended output,
 * the tiny attention layer trained live in the browser (real forward and
 * backward passes through the softmax), the probe heatmap that sharpens
 * as training runs, and the held-out evaluation numbers.
 *
 * Everything is deterministic: all randomness flows from the seeded LCG
 * below (constants from the guides SPEC), so SSR and client render the
 * same numbers, re-running training reproduces identical results, and a
 * verifier can recompute any figure by executing these functions with
 * node/tsx.
 *
 * Scope note: this is single-query attention over a stored sequence, the
 * bare mechanism. Self-attention, multi-head attention, and transformers
 * are deliberately out of scope here (they live in the llms category).
 */

// ---------------------------------------------------------------------------
// Deterministic PRNG (LCG constants from the guides SPEC, as a stream)
// ---------------------------------------------------------------------------

export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.s = (this.s * 1664525 + 1013904223) >>> 0;
    return this.s / 0x100000000;
  }

  /** Uniform integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  /** Uniform float in [lo, hi). */
  range(lo: number, hi: number): number {
    return lo + (hi - lo) * this.next();
  }
}

export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ---------------------------------------------------------------------------
// Shared attention primitives
// ---------------------------------------------------------------------------

export function dot(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** Numerically stable softmax. */
export function softmax(scores: readonly number[]): number[] {
  let max = -Infinity;
  for (const s of scores) if (s > max) max = s;
  const exps = scores.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/** Weighted sum of scalar values: the attention output. */
export function blend(
  weights: readonly number[],
  values: readonly number[]
): number {
  let s = 0;
  for (let i = 0; i < weights.length; i++) s += weights[i] * values[i];
  return s;
}

/** Shannon entropy of a weight vector in bits (peakedness readout). */
export function entropyBits(weights: readonly number[]): number {
  let h = 0;
  for (const w of weights) {
    if (w > 1e-12) h -= w * Math.log2(w);
  }
  return h;
}

// ---------------------------------------------------------------------------
// Playground: 2-D query and keys the user drags by hand
// ---------------------------------------------------------------------------

export interface Vec2 {
  x: number;
  y: number;
}

/** Playground coordinate bound: vectors live in [-BOUND, BOUND]^2. */
export const PLAY_BOUND = 1.2;

export const PLAY_QUERY_INIT: Vec2 = { x: 0.6, y: 0.5 };

export const PLAY_KEYS_INIT: readonly Vec2[] = [
  { x: 0.9, y: 0.4 },
  { x: -0.7, y: 0.8 },
  { x: -0.5, y: -0.9 },
  { x: 0.8, y: -0.7 },
];

/** The stored values: what each key slot "contains". */
export const PLAY_VALUES: readonly number[] = [10, 20, 30, 40];

export const PLAY_SHARPNESS_MIN = 0.25;
export const PLAY_SHARPNESS_MAX = 8;
export const PLAY_SHARPNESS_DEFAULT = 1;

export interface PlaygroundResult {
  /** Raw dot products q . k_i. */
  scores: number[];
  /** softmax(sharpness * scores). */
  weights: number[];
  /** Weighted sum of PLAY_VALUES. */
  output: number;
  /** Index of the largest weight (the hard-lookup answer). */
  argmax: number;
  /** Entropy of the weights in bits (2 bits = uniform over 4). */
  entropy: number;
}

export function playgroundCompute(
  query: Vec2,
  keys: readonly Vec2[],
  values: readonly number[],
  sharpness: number
): PlaygroundResult {
  const scores = keys.map((k) => query.x * k.x + query.y * k.y);
  const weights = softmax(scores.map((s) => s * sharpness));
  const output = blend(weights, values);
  let argmax = 0;
  for (let i = 1; i < weights.length; i++) {
    if (weights[i] > weights[argmax]) argmax = i;
  }
  return { scores, weights, output, argmax, entropy: entropyBits(weights) };
}

// ---------------------------------------------------------------------------
// The recall task: a sequence of (type, value) slots and a cue
// ---------------------------------------------------------------------------
//
// Each episode stores SEQ_LEN slots. Slot i carries a type tag (one of
// NUM_TYPES, a permutation so every type appears exactly once) and a scalar
// value drawn uniformly from [-2, 2]. The model receives a cue type and must
// output the value stored at the slot whose type matches the cue.
//
// Model: learnable embedding tables Wq (cue type -> query vector) and
// Wk (slot type -> key vector), both NUM_TYPES x DIM. Values pass through
// unchanged (no value projection; disclosed in the UI).
//
//   q = Wq[cue],  k_i = Wk[type_i]
//   s_i = (q . k_i) / sqrt(DIM)        scaled dot product
//   w = softmax(s)
//   yHat = sum_i w_i * v_i
//   L = (yHat - y)^2
//
// The backward pass below is the exact gradient of L through the softmax.

export const NUM_TYPES = 4;
export const SEQ_LEN = 4;
export const DIM = 4;
export const SCALE = 1 / Math.sqrt(DIM);

export const TRAIN_EPISODES = 3000;
export const LR_HI = 0.5;
export const LR_LO = 0.05;
/** Record one loss-history sample every this many episodes. */
export const LOSS_SAMPLE_EVERY = 25;

export const INIT_SEED = 20260710;
export const TRAIN_SEED = 87654321;
export const EVAL_SEED = 424242;
export const EVAL_EPISODES = 500;

export const TYPE_LABELS: readonly string[] = ["A", "B", "C", "D"];

export interface AttnModel {
  /** Query embeddings, NUM_TYPES x DIM row-major. */
  wq: Float64Array;
  /** Key embeddings, NUM_TYPES x DIM row-major. */
  wk: Float64Array;
}

export function initModel(seed: number = INIT_SEED): AttnModel {
  const rng = new Rng(seed);
  const wq = new Float64Array(NUM_TYPES * DIM);
  const wk = new Float64Array(NUM_TYPES * DIM);
  for (let i = 0; i < wq.length; i++) wq[i] = rng.range(-0.5, 0.5);
  for (let i = 0; i < wk.length; i++) wk[i] = rng.range(-0.5, 0.5);
  return { wq, wk };
}

export interface Episode {
  /** Slot type tags: a permutation of 0..NUM_TYPES-1. */
  types: number[];
  /** Stored scalar values, uniform in [-2, 2], rounded to 2 decimals. */
  values: number[];
  /** The cue type to look up. */
  cue: number;
  /** The value stored at the slot whose type matches the cue. */
  target: number;
}

export function makeEpisode(rng: Rng): Episode {
  // Fisher-Yates permutation of the type tags
  const types = Array.from({ length: SEQ_LEN }, (_, i) => i);
  for (let i = SEQ_LEN - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const t = types[i];
    types[i] = types[j];
    types[j] = t;
  }
  const values = Array.from({ length: SEQ_LEN }, () =>
    round2(rng.range(-2, 2))
  );
  const cue = rng.int(NUM_TYPES);
  const target = values[types.indexOf(cue)];
  return { types, values, cue, target };
}

export interface ForwardResult {
  scores: number[];
  weights: number[];
  output: number;
  loss: number;
  /** Index of the slot whose type matches the cue. */
  matchIndex: number;
}

export function forward(model: AttnModel, ep: Episode): ForwardResult {
  const qOff = ep.cue * DIM;
  const scores = new Array<number>(SEQ_LEN);
  for (let i = 0; i < SEQ_LEN; i++) {
    const kOff = ep.types[i] * DIM;
    let s = 0;
    for (let d = 0; d < DIM; d++) s += model.wq[qOff + d] * model.wk[kOff + d];
    scores[i] = s * SCALE;
  }
  const weights = softmax(scores);
  const output = blend(weights, ep.values);
  const err = output - ep.target;
  return {
    scores,
    weights,
    output,
    loss: err * err,
    matchIndex: ep.types.indexOf(ep.cue),
  };
}

/**
 * One SGD step on a single episode. Exact gradients:
 *   dL/dyHat = 2 (yHat - y)
 *   dL/dw_i  = dL/dyHat * v_i
 *   dL/ds_i  = w_i (g_i - sum_j w_j g_j)          softmax Jacobian
 *   dL/dq    = SCALE * sum_i dL/ds_i * k_i
 *   dL/dk_i  = SCALE * dL/ds_i * q
 * Returns the pre-update loss.
 */
export function trainStep(model: AttnModel, ep: Episode, lr: number): number {
  const fw = forward(model, ep);
  const dOut = 2 * (fw.output - ep.target);

  const g = fw.weights.map((_, i) => dOut * ep.values[i]);
  let gDotW = 0;
  for (let i = 0; i < SEQ_LEN; i++) gDotW += fw.weights[i] * g[i];
  const dScores = fw.weights.map((w, i) => w * (g[i] - gDotW));

  const qOff = ep.cue * DIM;
  const q = Array.from(
    { length: DIM },
    (_, d) => model.wq[qOff + d]
  );

  // dL/dq accumulates over slots; dL/dk_i applies to each slot's key row
  const dq = new Array<number>(DIM).fill(0);
  for (let i = 0; i < SEQ_LEN; i++) {
    const kOff = ep.types[i] * DIM;
    const ds = dScores[i] * SCALE;
    for (let d = 0; d < DIM; d++) {
      dq[d] += ds * model.wk[kOff + d];
      model.wk[kOff + d] -= lr * ds * q[d];
    }
  }
  for (let d = 0; d < DIM; d++) model.wq[qOff + d] -= lr * dq[d];

  return fw.loss;
}

// ---------------------------------------------------------------------------
// Chunk-friendly training state for the UI thread
// ---------------------------------------------------------------------------

export interface TrainState {
  model: AttnModel;
  rng: Rng;
  done: number;
  total: number;
  /** Exponential moving average of the per-episode loss. */
  lossEma: number;
  /** Sampled (episode, lossEma) pairs for the loss curve. */
  lossHistory: Array<{ episode: number; loss: number }>;
}

export function initTraining(): TrainState {
  return {
    model: initModel(INIT_SEED),
    rng: new Rng(TRAIN_SEED),
    done: 0,
    total: TRAIN_EPISODES,
    lossEma: NaN,
    lossHistory: [],
  };
}

function lrAt(t: number): number {
  return LR_LO + (LR_HI - LR_LO) * (1 - t / TRAIN_EPISODES);
}

/** Advance training by up to `n` episodes. */
export function trainChunk(st: TrainState, n: number): void {
  for (let k = 0; k < n && st.done < st.total; k++) {
    const ep = makeEpisode(st.rng);
    const loss = trainStep(st.model, ep, lrAt(st.done));
    st.lossEma = Number.isNaN(st.lossEma)
      ? loss
      : st.lossEma * 0.98 + loss * 0.02;
    st.done++;
    if (st.done % LOSS_SAMPLE_EVERY === 0 || st.done === st.total) {
      st.lossHistory.push({ episode: st.done, loss: st.lossEma });
    }
  }
}

export function isTrained(st: TrainState): boolean {
  return st.done >= st.total;
}

// ---------------------------------------------------------------------------
// Held-out evaluation (fresh seed, episodes the model never trained on)
// ---------------------------------------------------------------------------

export interface EvalResult {
  /** Mean squared error of the recalled value. */
  mse: number;
  /** Mean attention weight the model puts on the matching slot. */
  meanCorrectWeight: number;
  /** Fraction of episodes where the argmax weight is the matching slot. */
  argmaxAccuracy: number;
  nEpisodes: number;
}

export function evaluateModel(
  model: AttnModel,
  seed: number = EVAL_SEED,
  n: number = EVAL_EPISODES
): EvalResult {
  const rng = new Rng(seed);
  let sse = 0;
  let wSum = 0;
  let hits = 0;
  for (let t = 0; t < n; t++) {
    const ep = makeEpisode(rng);
    const fw = forward(model, ep);
    sse += fw.loss;
    wSum += fw.weights[fw.matchIndex];
    let am = 0;
    for (let i = 1; i < SEQ_LEN; i++) {
      if (fw.weights[i] > fw.weights[am]) am = i;
    }
    if (am === fw.matchIndex) hits++;
  }
  return {
    mse: sse / n,
    meanCorrectWeight: wSum / n,
    argmaxAccuracy: hits / n,
    nEpisodes: n,
  };
}

// ---------------------------------------------------------------------------
// Probe heatmap: cue type x slot type attention weights
// ---------------------------------------------------------------------------
//
// Probes the model on the canonical episode whose slots are typed in order
// [A, B, C, D]. Row c is the weight vector produced by cue type c, so a
// model that has learned the lookup shows a bright diagonal. Values do not
// matter for the weights (they only enter after the softmax), so any values
// give the same heatmap; zeros are used.

export function probeHeatmap(model: AttnModel): number[][] {
  const rows: number[][] = [];
  for (let cue = 0; cue < NUM_TYPES; cue++) {
    const ep: Episode = {
      types: Array.from({ length: SEQ_LEN }, (_, i) => i),
      values: new Array<number>(SEQ_LEN).fill(0),
      cue,
      target: 0,
    };
    rows.push(forward(model, ep).weights);
  }
  return rows;
}

/** Mean of the diagonal of the probe heatmap (1.0 = perfectly sharp). */
export function heatmapDiagonalMean(heat: number[][]): number {
  let s = 0;
  for (let i = 0; i < NUM_TYPES; i++) s += heat[i][i];
  return s / NUM_TYPES;
}

// ---------------------------------------------------------------------------
// Heatmap cell color: background mixed toward the accent gold by weight.
// Integer rgb components, so the string is byte-identical on SSR and client.
// ---------------------------------------------------------------------------

export function heatCellColor(w: number): string {
  const bg: [number, number, number] = [15, 23, 42]; // #0f172a
  const gold: [number, number, number] = [212, 175, 55]; // #d4af37
  const t = Math.max(0, Math.min(1, w));
  const mix = (i: number) => Math.round(bg[i] + (gold[i] - bg[i]) * t);
  return `rgb(${mix(0)},${mix(1)},${mix(2)})`;
}

// ---------------------------------------------------------------------------
// A fixed demo episode for the task explainer (deterministic)
// ---------------------------------------------------------------------------

export function makeDemoEpisode(): Episode {
  const rng = new Rng(EVAL_SEED + 7);
  return makeEpisode(rng);
}
