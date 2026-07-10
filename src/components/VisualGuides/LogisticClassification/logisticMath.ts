/**
 * Pure logistic-classification math for the logistic-classification guide.
 * No React imports.
 *
 * This module is the single source of every number the guide displays:
 * the linear score, sigmoid probabilities, cross-entropy loss, the gradient
 * descent updates, the probability heatmap, the decision boundary segment,
 * and the confusion counts at any threshold. A verifier can recompute all
 * of them by executing these functions with node/tsx.
 *
 * The setup: binary classification of 2-D points in [-1, 1]^2 with a
 * logistic model p = sigmoid(w1*x1 + w2*x2 + b), trained by full-batch
 * gradient descent on the average cross-entropy loss plus a small L2
 * penalty (L2_LAMBDA) so the weights stay bounded when the classes are
 * linearly separable. This is the machine-learning view of the model:
 * fit, predict, decide. Coefficient inference (standard errors, Wald
 * tests, GLM theory) is deliberately out of scope here.
 */

// ── Model and training constants ────────────────────────────────────────────

export const LEARNING_RATE = 1.5;
export const L2_LAMBDA = 0.002;
/** Gradient steps required (via the Train buttons) before routing gates unlock. */
export const MIN_TRAIN_STEPS = 150;
/** Cap on total button-training steps so weights cannot grow without end. */
export const MAX_TRAIN_STEPS = 2000;
/** Warm-start steps run automatically whenever a point moves. */
export const REFIT_STEPS = 30;
export const TRAIN_BATCH_SIZES: readonly number[] = [50, 250];

export const DEFAULT_THRESHOLD = 0.5;
export const THRESHOLD_MIN = 0.05;
export const THRESHOLD_MAX = 0.95;

/** Probability heatmap resolution (HEAT_RES^2 cells). */
export const HEAT_RES = 30;

/** Deterministic seed for the starting dataset. */
export const DATA_SEED = 20260710;
export const N_PER_CLASS = 18;

/** Class display colors, from the guide token table (never accent/warning/success). */
export const CLASS0_COLOR = "#1e5d8a"; // blue, circles
export const CLASS1_COLOR = "#ec4899"; // pink, diamonds

// ── Types ────────────────────────────────────────────────────────────────────

export interface LabeledPoint {
  id: number;
  x1: number;
  x2: number;
  /** Class label: 0 or 1. */
  y: 0 | 1;
}

export interface LogisticParams {
  w1: number;
  w2: number;
  b: number;
}

export interface ConfusionCounts {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
}

// ── Deterministic pseudo-random data (SPEC LCG, no Math.random) ─────────────

export function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/** Box-Muller standard normal from an LCG stream. */
function gaussian(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-9);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * The fixed starting dataset: two Gaussian clusters with enough overlap that
 * the threshold slider genuinely trades false positives against false
 * negatives. Deterministic (LCG seed), so SSR and client render identically.
 */
export function makeDefaultPoints(): LabeledPoint[] {
  const rand = makeLcg(DATA_SEED);
  const points: LabeledPoint[] = [];
  const clusters: Array<{ y: 0 | 1; cx: number; cy: number; sd: number }> = [
    { y: 0, cx: -0.42, cy: -0.32, sd: 0.3 },
    { y: 1, cx: 0.42, cy: 0.32, sd: 0.3 },
  ];
  let id = 0;
  for (const c of clusters) {
    for (let i = 0; i < N_PER_CLASS; i++) {
      const x1 = round2(clamp(c.cx + c.sd * gaussian(rand), -0.95, 0.95));
      const x2 = round2(clamp(c.cy + c.sd * gaussian(rand), -0.95, 0.95));
      points.push({ id: id++, x1, x2, y: c.y });
    }
  }
  return points;
}

// ── Model ────────────────────────────────────────────────────────────────────

export function initParams(): LogisticParams {
  return { w1: 0, w2: 0, b: 0 };
}

export function sigmoid(z: number): number {
  if (z >= 0) {
    return 1 / (1 + Math.exp(-z));
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

/** The linear score z = w1*x1 + w2*x2 + b. */
export function score(params: LogisticParams, x1: number, x2: number): number {
  return params.w1 * x1 + params.w2 * x2 + params.b;
}

/** Predicted probability of class 1. */
export function predictProb(
  params: LogisticParams,
  x1: number,
  x2: number
): number {
  return sigmoid(score(params, x1, x2));
}

/** logit(t) = ln(t / (1 - t)): the score value where p equals the threshold t. */
export function logit(t: number): number {
  return Math.log(t / (1 - t));
}

// ── Loss and gradient descent ───────────────────────────────────────────────

/** Average cross-entropy of the data (the displayed loss; excludes the L2 term). */
export function crossEntropy(
  params: LogisticParams,
  points: readonly LabeledPoint[]
): number {
  if (points.length === 0) return 0;
  let sum = 0;
  for (const pt of points) {
    const p = clamp(predictProb(params, pt.x1, pt.x2), 1e-9, 1 - 1e-9);
    sum += pt.y === 1 ? -Math.log(p) : -Math.log(1 - p);
  }
  return sum / points.length;
}

/**
 * One full-batch gradient descent step on
 *   L = crossEntropy + (L2_LAMBDA / 2) * (w1^2 + w2^2).
 * Gradient of the data term: (1/n) * sum over points of (p - y) * [x1, x2, 1].
 */
export function gradStep(
  params: LogisticParams,
  points: readonly LabeledPoint[],
  lr: number = LEARNING_RATE
): LogisticParams {
  const n = points.length;
  if (n === 0) return params;
  let gw1 = 0;
  let gw2 = 0;
  let gb = 0;
  for (const pt of points) {
    const err = predictProb(params, pt.x1, pt.x2) - pt.y;
    gw1 += err * pt.x1;
    gw2 += err * pt.x2;
    gb += err;
  }
  gw1 = gw1 / n + L2_LAMBDA * params.w1;
  gw2 = gw2 / n + L2_LAMBDA * params.w2;
  gb = gb / n;
  return {
    w1: params.w1 - lr * gw1,
    w2: params.w2 - lr * gw2,
    b: params.b - lr * gb,
  };
}

/** Run n gradient steps; returns the new params and the loss after every step. */
export function trainSteps(
  params: LogisticParams,
  points: readonly LabeledPoint[],
  n: number
): { params: LogisticParams; lossHistory: number[] } {
  let current = params;
  const lossHistory: number[] = [];
  for (let i = 0; i < n; i++) {
    current = gradStep(current, points);
    lossHistory.push(crossEntropy(current, points));
  }
  return { params: current, lossHistory };
}

// ── Decisions, confusion counts, metrics ────────────────────────────────────

/** Predict class 1 when p >= threshold. */
export function predictClass(
  params: LogisticParams,
  x1: number,
  x2: number,
  threshold: number
): 0 | 1 {
  return predictProb(params, x1, x2) >= threshold ? 1 : 0;
}

/** Confusion counts of the current model on the current points at a threshold. */
export function confusionCounts(
  params: LogisticParams,
  points: readonly LabeledPoint[],
  threshold: number
): ConfusionCounts {
  const c: ConfusionCounts = { tp: 0, fp: 0, fn: 0, tn: 0 };
  for (const pt of points) {
    const pred = predictClass(params, pt.x1, pt.x2, threshold);
    if (pt.y === 1) {
      if (pred === 1) c.tp++;
      else c.fn++;
    } else {
      if (pred === 1) c.fp++;
      else c.tn++;
    }
  }
  return c;
}

export function accuracy(c: ConfusionCounts): number {
  const n = c.tp + c.fp + c.fn + c.tn;
  return n === 0 ? 0 : (c.tp + c.tn) / n;
}

/** Precision tp / (tp + fp); null when the model predicts no positives. */
export function precision(c: ConfusionCounts): number | null {
  const denom = c.tp + c.fp;
  return denom === 0 ? null : c.tp / denom;
}

/** Recall tp / (tp + fn); null when there are no positive points. */
export function recall(c: ConfusionCounts): number | null {
  const denom = c.tp + c.fn;
  return denom === 0 ? null : c.tp / denom;
}

// ── Decision boundary geometry ──────────────────────────────────────────────

export type Segment = [[number, number], [number, number]];

/**
 * The decision boundary for threshold t is the line
 *   w1*x1 + w2*x2 + b = logit(t),
 * clipped to the plot box [-1, 1]^2. Returns null when the weights are
 * (numerically) zero, i.e. before training, or when the line misses the box.
 */
export function boundarySegment(
  params: LogisticParams,
  threshold: number
): Segment | null {
  const { w1, w2, b } = params;
  const L = logit(threshold);
  const eps = 1e-9;
  if (Math.abs(w1) < eps && Math.abs(w2) < eps) return null;

  const pts: Array<[number, number]> = [];
  const push = (x: number, y: number) => {
    if (x < -1 - 1e-9 || x > 1 + 1e-9 || y < -1 - 1e-9 || y > 1 + 1e-9) return;
    for (const [px, py] of pts) {
      if (Math.abs(px - x) < 1e-6 && Math.abs(py - y) < 1e-6) return;
    }
    pts.push([clamp(x, -1, 1), clamp(y, -1, 1)]);
  };

  if (Math.abs(w2) > eps) {
    push(-1, (L - b + w1) / w2); // x1 = -1
    push(1, (L - b - w1) / w2); // x1 = +1
  }
  if (Math.abs(w1) > eps) {
    push((L - b + w2) / w1, -1); // x2 = -1
    push((L - b - w2) / w1, 1); // x2 = +1
  }
  if (pts.length < 2) return null;
  return [pts[0], pts[1]];
}

// ── Probability heatmap ─────────────────────────────────────────────────────

/**
 * Probabilities at the centers of a HEAT_RES x HEAT_RES grid over [-1, 1]^2,
 * row-major with row 0 at x2 = -1 (bottom).
 */
export function probGrid(
  params: LogisticParams,
  res: number = HEAT_RES
): number[] {
  const out: number[] = new Array(res * res);
  for (let r = 0; r < res; r++) {
    const x2 = -1 + ((r + 0.5) * 2) / res;
    for (let c = 0; c < res; c++) {
      const x1 = -1 + ((c + 0.5) * 2) / res;
      out[r * res + c] = predictProb(params, x1, x2);
    }
  }
  return out;
}

/**
 * Heatmap cell color: the plot background mixed toward the class-0 blue when
 * p < 0.5 and toward the class-1 pink when p > 0.5, with mix strength
 * |p - 0.5| * 2. Uncertain regions stay dark. Integer rgb components, so the
 * string is deterministic across SSR and client.
 */
export function heatColor(p: number): string {
  const bg: [number, number, number] = [15, 23, 42]; // #0f172a
  const blue: [number, number, number] = [30, 93, 138]; // #1e5d8a
  const pink: [number, number, number] = [236, 72, 153]; // #ec4899
  const target = p < 0.5 ? blue : pink;
  const t = Math.min(1, Math.abs(p - 0.5) * 2) * 0.75;
  const mix = (i: number) => Math.round(bg[i] + (target[i] - bg[i]) * t);
  return `rgb(${mix(0)},${mix(1)},${mix(2)})`;
}
