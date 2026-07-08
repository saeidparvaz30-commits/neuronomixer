// Pure deterministic math for the Categorical Encoding guide. No React in this file.
//
// Honest-by-construction setup: every displayed number is computed from either
// (a) the literal 12-row HOUSES table below, or (b) a 60-value sample generated
// by a seeded PRNG (mulberry32, literal seed). Least-squares fits are solved
// exactly via the normal equations (X^T X) beta = X^T y with Gaussian
// elimination. Nothing is precomputed or faked.

export interface HouseRow {
  neighborhood: string;
  /** Sale price in thousands of dollars. */
  price: number;
}

/** Literal constant dataset: identical on server and client. */
export const HOUSES: readonly HouseRow[] = [
  { neighborhood: "Riverside", price: 372 },
  { neighborhood: "Old Town", price: 300 },
  { neighborhood: "Docklands", price: 240 },
  { neighborhood: "Hillcrest", price: 405 },
  { neighborhood: "Old Town", price: 322 },
  { neighborhood: "Riverside", price: 388 },
  { neighborhood: "Docklands", price: 262 },
  { neighborhood: "Old Town", price: 291 },
  { neighborhood: "Hillcrest", price: 430 },
  { neighborhood: "Riverside", price: 401 },
  { neighborhood: "Old Town", price: 315 },
  { neighborhood: "Hillcrest", price: 418 },
];

/** Alphabetical category list; the ordinal encoding uses this (arbitrary) order. */
export const CATEGORIES: readonly string[] = ["Docklands", "Hillcrest", "Old Town", "Riverside"];

export type EncodingMethod = "onehot" | "ordinal" | "frequency" | "target";

export const METHOD_ORDER: readonly EncodingMethod[] = ["onehot", "ordinal", "frequency", "target"];

export const METHOD_META: Record<
  EncodingMethod,
  { label: string; color: string; tagline: string }
> = {
  onehot: {
    label: "One-hot",
    color: "#3bb4a4",
    tagline: "One binary column per category. No fake structure, but the width grows with the number of categories.",
  },
  ordinal: {
    label: "Ordinal",
    color: "#a855f7",
    tagline: "One integer column, assigned alphabetically here. It invents an order the neighborhoods never had.",
  },
  frequency: {
    label: "Frequency",
    color: "#ec4899",
    tagline: "One column: how common the category is. Categories with equal counts collapse to the same number.",
  },
  target: {
    label: "Target",
    color: "#ef4444",
    tagline: "One column: the mean price of the category. Built from the label itself, so it can leak the answer.",
  },
};

// ── Seeded PRNG ──────────────────────────────────────────────────────────────

/** mulberry32: deterministic stream, identical on server and client. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Exact least squares via normal equations ────────────────────────────────

export interface FitResult {
  beta: number[];
  predictions: number[];
  sse: number;
  sst: number;
  /** 1 - SSE/SST with SST about the mean of y. */
  r2: number;
}

/**
 * Solves A x = b by Gaussian elimination with partial pivoting.
 * Returns null when A is (numerically) singular.
 */
export function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    }
    if (Math.abs(M[piv][col]) < 1e-10) return null;
    const tmp = M[col];
    M[col] = M[piv];
    M[piv] = tmp;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / M[i][i]);
}

/**
 * Exact OLS: beta = (X^T X)^{-1} X^T y via the normal equations.
 * R^2 is computed against the mean of y.
 */
export function leastSquares(X: number[][], y: number[]): FitResult | null {
  const n = X.length;
  const p = X[0].length;
  const XtX: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const Xty: number[] = new Array<number>(p).fill(0);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < p; a++) {
      Xty[a] += X[i][a] * y[i];
      for (let b = a; b < p; b++) XtX[a][b] += X[i][a] * X[i][b];
    }
  }
  for (let a = 0; a < p; a++) {
    for (let b = 0; b < a; b++) XtX[a][b] = XtX[b][a];
  }
  const beta = solveLinearSystem(XtX, Xty);
  if (!beta) return null;
  const predictions = X.map((row) => row.reduce((s, v, j) => s + v * beta[j], 0));
  const meanY = y.reduce((s, v) => s + v, 0) / n;
  let sse = 0;
  let sst = 0;
  for (let i = 0; i < n; i++) {
    sse += (y[i] - predictions[i]) ** 2;
    sst += (y[i] - meanY) ** 2;
  }
  const r2 = sst === 0 ? 0 : 1 - sse / sst;
  return { beta, predictions, sse, sst, r2 };
}

// ── Encodings of the HOUSES table ───────────────────────────────────────────

export function ordinalCode(neighborhood: string): number {
  return CATEGORIES.indexOf(neighborhood);
}

export function categoryCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const h of HOUSES) counts.set(h.neighborhood, (counts.get(h.neighborhood) ?? 0) + 1);
  return counts;
}

/** Full-data mean price per category (the naive, leak-prone target encoding). */
export function categoryMeans(): Map<string, number> {
  const sums = new Map<string, { sum: number; n: number }>();
  for (const h of HOUSES) {
    const cur = sums.get(h.neighborhood) ?? { sum: 0, n: 0 };
    cur.sum += h.price;
    cur.n += 1;
    sums.set(h.neighborhood, cur);
  }
  const means = new Map<string, number>();
  for (const [k, v] of sums) means.set(k, v.sum / v.n);
  return means;
}

export interface EncodedMatrix {
  columns: string[];
  /** One numeric row per house, aligned with HOUSES order. */
  rows: number[][];
  /** Decimal places for display. */
  decimals: number;
}

export function encodeHouses(method: EncodingMethod): EncodedMatrix {
  switch (method) {
    case "onehot":
      return {
        columns: CATEGORIES.map((c) => `is_${c.replace(" ", "_")}`),
        rows: HOUSES.map((h) => CATEGORIES.map((c) => (h.neighborhood === c ? 1 : 0))),
        decimals: 0,
      };
    case "ordinal":
      return {
        columns: ["nbhd_code"],
        rows: HOUSES.map((h) => [ordinalCode(h.neighborhood)]),
        decimals: 0,
      };
    case "frequency": {
      const counts = categoryCounts();
      return {
        columns: ["nbhd_freq"],
        rows: HOUSES.map((h) => [(counts.get(h.neighborhood) ?? 0) / HOUSES.length]),
        decimals: 3,
      };
    }
    case "target": {
      const means = categoryMeans();
      return {
        columns: ["nbhd_target_mean"],
        rows: HOUSES.map((h) => [means.get(h.neighborhood) ?? 0]),
        decimals: 1,
      };
    }
  }
}

// ── Fit lab: ordinal vs one-hot on the HOUSES table ─────────────────────────

export interface ComparisonFits {
  /** OLS of price on [1, code]. */
  ordinal: FitResult;
  /** OLS of price on the 4 dummies (no intercept): predictions are category means. */
  oneHot: FitResult;
  /** Category mean price indexed by ordinal code. */
  meansByCode: number[];
}

export function computeComparisonFits(): ComparisonFits {
  const y = HOUSES.map((h) => h.price);
  const ordinalX = HOUSES.map((h) => [1, ordinalCode(h.neighborhood)]);
  const oneHotX = HOUSES.map((h) => CATEGORIES.map((c) => (h.neighborhood === c ? 1 : 0)));
  const ordinal = leastSquares(ordinalX, y);
  const oneHot = leastSquares(oneHotX, y);
  if (!ordinal || !oneHot) {
    throw new Error("Normal equations unexpectedly singular on the fixed dataset");
  }
  const means = categoryMeans();
  const meansByCode = CATEGORIES.map((c) => means.get(c) ?? 0);
  return { ordinal, oneHot, meansByCode };
}

// ── Cardinality explosion ────────────────────────────────────────────────────

export const CARD_MIN = 4;
export const CARD_MAX = 60;
/** Hypothetical dataset size used for the rows-per-column readout. */
export const CARD_ROWS = 200;
/** One-hot column count beyond which we call it exploded (under 10 rows per column at n = 200). */
export const EXPLOSION_THRESHOLD = 20;

// ── Target-encoding leakage preview ─────────────────────────────────────────

export const LEAK_N = 60;
export const LEAK_SEED = 20260708;
export const LEAK_BASE = 350;
export const LEAK_NOISE = 40;
export const LEAK_K_MIN = 2;
export const LEAK_K_MAX = 30;
export const LEAK_K_INITIAL = 6;

/**
 * 60 prices that do NOT depend on the category at all:
 * price_i = 350 + uniform(-40, 40) from mulberry32(LEAK_SEED).
 * Any fit quality a category feature achieves on this data is pure memorization.
 */
export function generateLeakPrices(): number[] {
  const rand = mulberry32(LEAK_SEED);
  return Array.from({ length: LEAK_N }, () => LEAK_BASE + (rand() * 2 - 1) * LEAK_NOISE);
}

/** Row i belongs to category floor(i * k / LEAK_N): contiguous blocks, k categories. */
export function leakCategory(i: number, k: number): number {
  return Math.floor((i * k) / LEAK_N);
}

/** Deterministic split: every third row (index mod 3 equal to 2) is held out. */
export function isHoldout(i: number): boolean {
  return i % 3 === 2;
}

export interface LeakPoint {
  k: number;
  trainR2: number;
  holdoutR2: number;
  /** Smallest number of TRAIN rows any category has (0 means fallback to global mean). */
  minTrainRows: number;
  /** Average train rows per category. */
  avgTrainRows: number;
}

/**
 * Target-encode with TRAIN-fold category means, fit price = a + b * encoded by
 * exact OLS on the train slice, then score R^2 on train (SST about the train
 * mean) and on the held-out slice (SST about the holdout mean).
 */
export function computeLeakPoint(y: number[], k: number): LeakPoint {
  const n = y.length;
  const cats = Array.from({ length: n }, (_, i) => leakCategory(i, k));
  const trainIdx: number[] = [];
  const holdIdx: number[] = [];
  for (let i = 0; i < n; i++) (isHoldout(i) ? holdIdx : trainIdx).push(i);

  const sum = new Array<number>(k).fill(0);
  const cnt = new Array<number>(k).fill(0);
  for (const i of trainIdx) {
    sum[cats[i]] += y[i];
    cnt[cats[i]] += 1;
  }
  const trainGlobalMean = trainIdx.reduce((s, i) => s + y[i], 0) / trainIdx.length;
  const catMean = sum.map((s, c) => (cnt[c] > 0 ? s / cnt[c] : trainGlobalMean));
  const enc = cats.map((c) => catMean[c]);

  const trainX = trainIdx.map((i) => [1, enc[i]]);
  const trainY = trainIdx.map((i) => y[i]);
  const fit = leastSquares(trainX, trainY);
  const predict = (i: number) =>
    fit ? fit.beta[0] + fit.beta[1] * enc[i] : trainGlobalMean;

  const r2On = (idx: number[]): number => {
    const mean = idx.reduce((s, i) => s + y[i], 0) / idx.length;
    let sse = 0;
    let sst = 0;
    for (const i of idx) {
      sse += (y[i] - predict(i)) ** 2;
      sst += (y[i] - mean) ** 2;
    }
    return sst === 0 ? 0 : 1 - sse / sst;
  };

  const usedCats = new Set(cats);
  let minTrainRows = Infinity;
  for (const c of usedCats) minTrainRows = Math.min(minTrainRows, cnt[c]);

  return {
    k,
    trainR2: r2On(trainIdx),
    holdoutR2: r2On(holdIdx),
    minTrainRows: Number.isFinite(minTrainRows) ? minTrainRows : 0,
    avgTrainRows: trainIdx.length / k,
  };
}

export function computeLeakCurve(y: number[]): LeakPoint[] {
  const points: LeakPoint[] = [];
  for (let k = LEAK_K_MIN; k <= LEAK_K_MAX; k++) points.push(computeLeakPoint(y, k));
  return points;
}
