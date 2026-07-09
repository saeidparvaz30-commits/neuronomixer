// Pure statistics module for the Designing Eval Datasets guide.
// No React imports. Every displayed number in the guide is computed by a
// function in this file (or types.ts), so a verifier can recompute them all
// by executing this module with node/tsx.

import {
  CategoryId,
  EvalTask,
  POOL,
  SLICES,
  createRng,
} from "./types";

// ─── Exact binomial confidence interval (Clopper-Pearson) ──────────────────
// The CP interval needs beta-distribution quantiles. We compute the
// regularized incomplete beta function via the standard continued-fraction
// expansion (Lentz), then invert it with bisection. No normal approximation
// anywhere.

const LANCZOS_G = [
  676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012,
  9.9843695780195716e-6, 1.5056327351493116e-7,
];

/** Natural log of the gamma function (Lanczos approximation, g = 7). */
export function logGamma(z: number): number {
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  const zz = z - 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < LANCZOS_G.length; i++) {
    x += LANCZOS_G[i] / (zz + i + 1);
  }
  const t = zz + 7.5;
  return (
    0.5 * Math.log(2 * Math.PI) + (zz + 0.5) * Math.log(t) - t + Math.log(x)
  );
}

/** Continued-fraction helper for the incomplete beta function (Lentz). */
function betaContinuedFraction(a: number, b: number, x: number): number {
  const MAX_ITER = 300;
  const EPS = 3e-14;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAX_ITER; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Regularized incomplete beta function I_x(a, b). */
export function regularizedIncompleteBeta(
  x: number,
  a: number,
  b: number
): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lnFront =
    logGamma(a + b) -
    logGamma(a) -
    logGamma(b) +
    a * Math.log(x) +
    b * Math.log(1 - x);
  const front = Math.exp(lnFront);
  if (x < (a + 1) / (a + b + 2)) {
    return (front * betaContinuedFraction(a, b, x)) / a;
  }
  return 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
}

/** Quantile (inverse CDF) of the Beta(a, b) distribution, by bisection. */
export function betaQuantile(p: number, a: number, b: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (regularizedIncompleteBeta(mid, a, b) < p) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

export interface BinomialCI {
  lo: number;
  hi: number;
  width: number;
}

/**
 * Exact Clopper-Pearson confidence interval for a binomial proportion,
 * from k passes out of n trials. Default confidence 95%.
 */
export function clopperPearson(
  k: number,
  n: number,
  confidence = 0.95
): BinomialCI {
  if (n <= 0) return { lo: 0, hi: 1, width: 1 };
  const alpha = 1 - confidence;
  const lo = k === 0 ? 0 : betaQuantile(alpha / 2, k, n - k + 1);
  const hi = k === n ? 1 : betaQuantile(1 - alpha / 2, k + 1, n - k);
  return { lo, hi, width: hi - lo };
}

// ─── Sample summaries and stratification ────────────────────────────────────

export function passCount(tasks: readonly EvalTask[]): number {
  return tasks.reduce((acc, t) => acc + (t.passes ? 1 : 0), 0);
}

/** Plain (unweighted) pass rate of the sampled set. Null when empty. */
export function rawPassRate(tasks: readonly EvalTask[]): number | null {
  if (tasks.length === 0) return null;
  return passCount(tasks) / tasks.length;
}

export interface SliceBreakdown {
  id: CategoryId;
  label: string;
  color: string;
  productionShare: number;
  sampleCount: number;
  sampleShare: number;
  samplePassRate: number | null;
}

export function sliceBreakdown(tasks: readonly EvalTask[]): SliceBreakdown[] {
  const n = tasks.length;
  return SLICES.map((slice) => {
    const inSlice = tasks.filter((t) => t.category === slice.id);
    return {
      id: slice.id,
      label: slice.label,
      color: slice.color,
      productionShare: slice.share,
      sampleCount: inSlice.length,
      sampleShare: n === 0 ? 0 : inSlice.length / n,
      samplePassRate:
        inSlice.length === 0 ? null : passCount(inSlice) / inSlice.length,
    };
  });
}

export interface StratifiedResult {
  /** Production-weighted (post-stratified) estimate; null until every slice is covered. */
  estimate: number | null;
  /** Slices with zero sampled tasks. */
  missing: CategoryId[];
}

/**
 * Post-stratified estimate: per-slice sample pass rates weighted by the known
 * production traffic shares. Defined only once every slice has at least one
 * sampled task.
 */
export function stratifiedPassRate(
  tasks: readonly EvalTask[]
): StratifiedResult {
  const breakdown = sliceBreakdown(tasks);
  const missing = breakdown
    .filter((s) => s.sampleCount === 0)
    .map((s) => s.id);
  if (missing.length > 0 || tasks.length === 0) {
    return { estimate: null, missing };
  }
  let estimate = 0;
  for (const s of breakdown) {
    estimate += s.productionShare * (s.samplePassRate ?? 0);
  }
  return { estimate, missing: [] };
}

/**
 * True production-weighted pass rate of the whole pool (simulation truth,
 * computed from the pool's true labels).
 */
export function truePoolPassRate(): number {
  return passCount(POOL) / POOL.length;
}

// ─── Label noise ─────────────────────────────────────────────────────────────

/**
 * Expected measured pass rate when each label is independently flipped with
 * probability `flipRate` (symmetric noise):
 *   measured = p * (1 - flipRate) + (1 - p) * flipRate
 */
export function expectedMeasuredRate(
  trueRate: number,
  flipRate: number
): number {
  return trueRate * (1 - flipRate) + (1 - trueRate) * flipRate;
}

/** Best measured score any model can reach under symmetric flip noise: 1 - flipRate. */
export function noiseCeiling(flipRate: number): number {
  return 1 - flipRate;
}

/**
 * Attenuation factor for true improvements under symmetric flip noise:
 * a true improvement of d points shows up as d * (1 - 2 * flipRate) points.
 */
export function improvementAttenuation(flipRate: number): number {
  return 1 - 2 * flipRate;
}

/** Deterministic 32-bit string hash (FNV-1a). */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface NoiseRealization {
  flippedIds: ReadonlySet<string>;
  /** Measured pass rate with the flipped labels applied. Null when set empty. */
  measured: number | null;
}

/**
 * One seeded realization of label noise on the sampled set. Each task's label
 * flips when its per-task seeded draw falls below flipRate. Deterministic for
 * a given (task set, flipRate, nonce): no Math.random anywhere.
 */
export function noisyRealization(
  tasks: readonly EvalTask[],
  flipRate: number,
  nonce: number
): NoiseRealization {
  const flippedIds = new Set<string>();
  if (tasks.length === 0) return { flippedIds, measured: null };
  const flipKey = Math.round(flipRate * 1000);
  let measuredPasses = 0;
  for (const t of tasks) {
    const rng = createRng(hashString(`${t.id}|${nonce}|${flipKey}`));
    const flipped = rng() < flipRate;
    if (flipped) flippedIds.add(t.id);
    const observed = flipped ? !t.passes : t.passes;
    if (observed) measuredPasses++;
  }
  return { flippedIds, measured: measuredPasses / tasks.length };
}

// ─── Formatting helper ───────────────────────────────────────────────────────

/** Format a proportion as a percentage string, e.g. 0.6512 -> "65.1%". */
export function pct(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`;
}
