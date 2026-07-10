/**
 * Pure math for the train-validation-test guide. No React imports.
 *
 * This module is the single source of every number the guide displays:
 * the dataset, the split sizes, every polynomial fit (real least squares
 * via normal equations plus a tiny ridge for numerical stability), the
 * train / validation / test RMSE table across all degrees, the
 * best-by-validation and best-by-test picks, and the fresh-data RMSE
 * that exposes the selection penalty when you peek at the test set.
 * A verifier can recompute all of them by executing these functions
 * with node/tsx.
 *
 * The toy setup: 60 samples of y = sin(2 pi x) + noise on x in [0, 1],
 * generated in already-shuffled order from a deterministic LCG (SPEC
 * hydration rule: no Math.random). The strip splits the samples into
 * contiguous train / validation / test blocks; polynomials of degree
 * 1..10 are fit on the train block ONLY. A large fresh sample from the
 * same generator (never used for fitting or selection) stands in for
 * "data you will see in production".
 */

// ── Dataset constants ───────────────────────────────────────────────────────

export const N_SAMPLES = 60;
export const NOISE_SD = 0.3;
export const DATA_SEED = 201;
export const FRESH_SEED = 987654321;
export const N_FRESH = 2000;

/** Polynomial degrees the guide fits, always on train only. */
export const DEGREES: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const DEFAULT_DEGREE = 3;

/** Split boundaries are sample counts: [0, b1) train, [b1, b2) val, [b2, N) test. */
export const MIN_TRAIN = 12;
export const MIN_VAL = 6;
export const MIN_TEST = 6;
export const DEFAULT_B1 = 36;
export const DEFAULT_B2 = 48;

/** Ridge added to the normal equations so degree-10 fits stay solvable. */
export const RIDGE = 1e-8;

// ── Deterministic pseudo-random generation (SPEC LCG, no Math.random) ───────

export function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/** Box-Muller standard normal driven by the LCG. */
export function makeGaussian(rand: () => number): () => number {
  return () => {
    const u1 = Math.max(rand(), 1e-12);
    const u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
}

// ── The data-generating process ─────────────────────────────────────────────

/** Ground-truth signal the polynomials try to recover. */
export function trueFn(x: number): number {
  return Math.sin(2 * Math.PI * x);
}

export const TRUE_FORMULA = "y = sin(2 pi x) + noise, noise sd = 0.3";

export interface Sample {
  x: number;
  y: number;
}

export function makeSamples(n: number, seed: number): Sample[] {
  const rand = makeLcg(seed);
  const gauss = makeGaussian(rand);
  const samples: Sample[] = [];
  for (let i = 0; i < n; i++) {
    const x = rand();
    const y = trueFn(x) + NOISE_SD * gauss();
    samples.push({ x, y });
  }
  return samples;
}

/**
 * The visible dataset. Generation order IS the strip order: x values are
 * i.i.d. uniform draws, so the sequence is already shuffled and contiguous
 * blocks are valid random splits.
 */
export const DATASET: readonly Sample[] = makeSamples(N_SAMPLES, DATA_SEED);

/**
 * Fresh data from the same process, never touched by fitting or selection.
 * Stands in for production data when revealing the selection penalty.
 */
export const FRESH: readonly Sample[] = makeSamples(N_FRESH, FRESH_SEED);

// ── Splitting ───────────────────────────────────────────────────────────────

export interface Split {
  train: Sample[];
  val: Sample[];
  test: Sample[];
}

export function splitDataset(b1: number, b2: number): Split {
  const all = DATASET as Sample[];
  return {
    train: all.slice(0, b1),
    val: all.slice(b1, b2),
    test: all.slice(b2),
  };
}

export function clampB1(b1: number, b2: number): number {
  return Math.min(Math.max(b1, MIN_TRAIN), b2 - MIN_VAL);
}

export function clampB2(b2: number, b1: number): number {
  return Math.min(Math.max(b2, b1 + MIN_VAL), N_SAMPLES - MIN_TEST);
}

// ── Least-squares polynomial fit (train only) ───────────────────────────────

/** Map x in [0, 1] to t in [-1, 1] so the monomial basis stays conditioned. */
export function scaleX(x: number): number {
  return 2 * x - 1;
}

function basisRow(x: number, degree: number): number[] {
  const t = scaleX(x);
  const row = new Array<number>(degree + 1);
  let p = 1;
  for (let j = 0; j <= degree; j++) {
    row[j] = p;
    p *= t;
  }
  return row;
}

/** Gauss-Jordan with partial pivoting; systems here are at most 11x11. */
export function solveLinearSystem(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[piv][col])) piv = r;
    }
    const tmp = m[col];
    m[col] = m[piv];
    m[piv] = tmp;
    const p = m[col][col];
    if (Math.abs(p) < 1e-300) continue;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = m[r][col] / p;
      if (f === 0) continue;
      for (let c = col; c <= n; c++) m[r][c] -= f * m[col][c];
    }
  }
  return m.map((row, i) =>
    Math.abs(row[i]) < 1e-300 ? 0 : row[n] / row[i]
  );
}

/**
 * Ordinary least squares on the scaled monomial basis via normal equations,
 * with ridge RIDGE on the diagonal purely for numerical stability.
 */
export function fitPoly(samples: readonly Sample[], degree: number): number[] {
  const k = degree + 1;
  const xtx: number[][] = Array.from({ length: k }, () =>
    new Array<number>(k).fill(0)
  );
  const xty = new Array<number>(k).fill(0);
  for (const s of samples) {
    const row = basisRow(s.x, degree);
    for (let i = 0; i < k; i++) {
      xty[i] += row[i] * s.y;
      for (let j = i; j < k; j++) xtx[i][j] += row[i] * row[j];
    }
  }
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < i; j++) xtx[i][j] = xtx[j][i];
    xtx[i][i] += RIDGE;
  }
  return solveLinearSystem(xtx, xty);
}

export function predict(coeffs: readonly number[], x: number): number {
  const t = scaleX(x);
  let y = 0;
  for (let j = coeffs.length - 1; j >= 0; j--) y = y * t + coeffs[j];
  return y;
}

export function rmseOf(
  coeffs: readonly number[],
  samples: readonly Sample[]
): number {
  if (samples.length === 0) return NaN;
  let sse = 0;
  for (const s of samples) {
    const e = predict(coeffs, s.x) - s.y;
    sse += e * e;
  }
  return Math.sqrt(sse / samples.length);
}

// ── The full results table the guide displays ───────────────────────────────

export interface DegreeResult {
  degree: number;
  coeffs: number[];
  trainRmse: number;
  valRmse: number;
  testRmse: number;
  freshRmse: number;
}

export function computeResults(b1: number, b2: number): DegreeResult[] {
  const { train, val, test } = splitDataset(b1, b2);
  return DEGREES.map((degree) => {
    const coeffs = fitPoly(train, degree);
    return {
      degree,
      coeffs,
      trainRmse: rmseOf(coeffs, train),
      valRmse: rmseOf(coeffs, val),
      testRmse: rmseOf(coeffs, test),
      freshRmse: rmseOf(coeffs, FRESH),
    };
  });
}

export function bestBy(
  results: readonly DegreeResult[],
  key: "trainRmse" | "valRmse" | "testRmse"
): DegreeResult {
  let best = results[0];
  for (const r of results) {
    if (r[key] < best[key]) best = r;
  }
  return best;
}

/** Curve points for drawing a fitted polynomial in SVG. */
export function curvePoints(
  coeffs: readonly number[],
  n = 101
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    pts.push({ x, y: predict(coeffs, x) });
  }
  return pts;
}
