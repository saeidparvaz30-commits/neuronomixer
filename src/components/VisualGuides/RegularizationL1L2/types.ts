// Pure math + deterministic data for the Regularization (L1/L2) guide.
// No React imports here; everything is testable in isolation.

export type RegMode = "l2" | "l1";
export type SplitId = "train" | "holdout";
export type LambdaBucket = "low" | "mid" | "high";

export interface DataPoint {
  x: number;
  y: number;
  split: SplitId;
}

export interface FeatureScaler {
  /** Per-feature mean of x^d (d = 1..DEGREE) over the TRAIN split. */
  mu: number[];
  /** Per-feature standard deviation over the TRAIN split. */
  sigma: number[];
  /** Mean of y over the TRAIN split (acts as the unpenalized intercept). */
  yMean: number;
}

export interface DesignMatrices {
  /** Standardized train features, rows = train points, cols = DEGREE. */
  Ztrain: number[][];
  /** Centered train targets (y - yMean). */
  ycTrain: number[];
  scaler: FeatureScaler;
}

export interface FitResult {
  /** Weights in standardized feature space, length DEGREE. */
  weights: number[];
  trainMse: number;
  holdoutMse: number;
  zeroCount: number;
  maxAbsWeight: number;
}

export interface ErrorCurvePoint {
  step: number;
  lambda: number;
  trainMse: number;
  holdoutMse: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const DEGREE = 8;
export const N_POINTS = 25;

/** Slider takes integer steps 0..LAMBDA_MAX_STEP. Step 0 means lambda = 0. */
export const LAMBDA_MAX_STEP = 40;
const LOG_LO = -6; // lambda = 1e-6 at step 1
const LOG_HI = 1; // lambda = 10 at step LAMBDA_MAX_STEP

// ── Deterministic pseudo-random (SPEC v2 LCG) ────────────────────────────────

function lcg(seed: number): number {
  return ((seed * 1664525 + 1013904223) >>> 0) / 0xffffffff;
}

// ── Synthetic dataset ────────────────────────────────────────────────────────

/** Ground-truth signal the noisy samples are drawn around. */
export function trueFunction(x: number): number {
  return Math.sin(2.5 * x);
}

/**
 * 25 deterministic noisy points on [-1, 1]:
 * base x is evenly spaced then jittered by up to +/-0.25;
 * y = sin(2.5x) + uniform noise in [-0.45, 0.45].
 * Odd-indexed points (i % 2 === 1) are held out; the even ones train the model.
 */
export function generateData(): DataPoint[] {
  const pts: DataPoint[] = [];
  for (let i = 0; i < N_POINTS; i++) {
    const base = -1 + (2 * i) / (N_POINTS - 1);
    const jitter = (lcg(i * 29 + 5) - 0.5) * 0.5;
    const x = Math.max(-1, Math.min(1, base + jitter));
    const noise = (lcg(i * 101 + 17) - 0.5) * 0.9;
    pts.push({
      x: parseFloat(x.toFixed(4)),
      y: parseFloat((trueFunction(x) + noise).toFixed(4)),
      split: i % 2 === 1 ? "holdout" : "train",
    });
  }
  return pts;
}

// ── Polynomial features + standardization ───────────────────────────────────

/** Raw polynomial features [x, x^2, ..., x^DEGREE]. */
export function polyFeatures(x: number): number[] {
  const f: number[] = [];
  let p = 1;
  for (let d = 1; d <= DEGREE; d++) {
    p *= x;
    f.push(p);
  }
  return f;
}

/**
 * Builds standardized train design matrix and centered targets.
 * Scaling statistics come from the TRAIN split only (no leakage), which is
 * also why regularization needs scaled features: the penalty treats every
 * weight equally, so every feature must live on a comparable scale.
 */
export function buildDesign(points: DataPoint[]): DesignMatrices {
  const train = points.filter((p) => p.split === "train");
  const raw = train.map((p) => polyFeatures(p.x));
  const n = train.length;

  const mu = new Array<number>(DEGREE).fill(0);
  for (const row of raw) for (let j = 0; j < DEGREE; j++) mu[j] += row[j] / n;

  const sigma = new Array<number>(DEGREE).fill(0);
  for (const row of raw)
    for (let j = 0; j < DEGREE; j++) sigma[j] += (row[j] - mu[j]) ** 2 / n;
  for (let j = 0; j < DEGREE; j++) sigma[j] = Math.sqrt(sigma[j]) || 1;

  const yMean = train.reduce((s, p) => s + p.y, 0) / n;

  const Ztrain = raw.map((row) => row.map((v, j) => (v - mu[j]) / sigma[j]));
  const ycTrain = train.map((p) => p.y - yMean);

  return { Ztrain, ycTrain, scaler: { mu, sigma, yMean } };
}

// ── Linear algebra: Gauss-Jordan with partial pivoting ──────────────────────

/** Solves A w = b for a small square system. */
export function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    }
    if (piv !== col) {
      const tmp = M[col];
      M[col] = M[piv];
      M[piv] = tmp;
    }
    const d = M[col][col];
    if (Math.abs(d) < 1e-12) continue;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / d;
      if (f === 0) continue;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row, i) => (Math.abs(row[i]) > 1e-12 ? row[n] / row[i] : 0));
}

// ── Ridge (L2): closed form ──────────────────────────────────────────────────

/**
 * Minimizes (1/2n)||yc - Zw||^2 + (lambda/2)||w||^2.
 * Closed form: w = (Z^T Z / n + lambda I)^(-1) (Z^T yc / n).
 */
export function ridgeFit(Z: number[][], yc: number[], lambda: number): number[] {
  const n = Z.length;
  const A: number[][] = Array.from({ length: DEGREE }, () =>
    new Array<number>(DEGREE).fill(0)
  );
  const b = new Array<number>(DEGREE).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < DEGREE; j++) {
      b[j] += (Z[i][j] * yc[i]) / n;
      for (let k = j; k < DEGREE; k++) A[j][k] += (Z[i][j] * Z[i][k]) / n;
    }
  }
  for (let j = 0; j < DEGREE; j++) {
    for (let k = 0; k < j; k++) A[j][k] = A[k][j];
    A[j][j] += lambda;
  }
  return solveLinearSystem(A, b);
}

// ── Lasso (L1): coordinate descent ───────────────────────────────────────────

function softThreshold(z: number, gamma: number): number {
  if (z > gamma) return z - gamma;
  if (z < -gamma) return z + gamma;
  return 0;
}

/**
 * Minimizes (1/2n)||yc - Zw||^2 + lambda * sum|w_j| by cyclic coordinate
 * descent. Per coordinate: rho_j = (1/n) sum_i z_ij (r_i + z_ij w_j),
 * nu_j = (1/n) sum_i z_ij^2, then w_j = soft(rho_j, lambda) / nu_j.
 * The soft threshold is what produces EXACT zeros.
 */
export function lassoFit(
  Z: number[][],
  yc: number[],
  lambda: number,
  maxIter = 20000,
  tol = 1e-10,
  warmStart?: number[]
): number[] {
  const n = Z.length;
  // Warm-starting from the ridge solution at the same lambda lets coordinate
  // descent converge in a few sweeps even at tiny lambda on this near-collinear
  // degree-8 basis (a cold start would need far more than maxIter and would
  // stop short of OLS, showing a spurious jump at the smallest slider notch).
  const w = warmStart ? [...warmStart] : new Array<number>(DEGREE).fill(0);
  const nu = new Array<number>(DEGREE).fill(0);
  for (let j = 0; j < DEGREE; j++) {
    for (let i = 0; i < n; i++) nu[j] += (Z[i][j] * Z[i][j]) / n;
  }
  // residual r = yc - Z w for the current (possibly warm-started) w
  const r = [...yc];
  if (warmStart) {
    for (let i = 0; i < n; i++) {
      let dot = 0;
      for (let j = 0; j < DEGREE; j++) dot += Z[i][j] * w[j];
      r[i] -= dot;
    }
  }

  for (let iter = 0; iter < maxIter; iter++) {
    let maxDelta = 0;
    for (let j = 0; j < DEGREE; j++) {
      if (nu[j] <= 0) continue;
      let rho = 0;
      for (let i = 0; i < n; i++) rho += Z[i][j] * (r[i] + Z[i][j] * w[j]);
      rho /= n;
      const wNew = softThreshold(rho, lambda) / nu[j];
      const delta = wNew - w[j];
      if (delta !== 0) {
        for (let i = 0; i < n; i++) r[i] -= Z[i][j] * delta;
        w[j] = wNew;
        const ad = Math.abs(delta);
        if (ad > maxDelta) maxDelta = ad;
      }
    }
    if (maxDelta < tol) break;
  }
  return w;
}

// ── Prediction + evaluation ──────────────────────────────────────────────────

export function predict(x: number, weights: number[], scaler: FeatureScaler): number {
  const f = polyFeatures(x);
  let yhat = scaler.yMean;
  for (let j = 0; j < DEGREE; j++) {
    yhat += weights[j] * ((f[j] - scaler.mu[j]) / scaler.sigma[j]);
  }
  return yhat;
}

export function mseOnSplit(
  points: DataPoint[],
  split: SplitId,
  weights: number[],
  scaler: FeatureScaler
): number {
  const subset = points.filter((p) => p.split === split);
  let s = 0;
  for (const p of subset) s += (p.y - predict(p.x, weights, scaler)) ** 2;
  return s / subset.length;
}

export function fitModel(
  points: DataPoint[],
  design: DesignMatrices,
  mode: RegMode,
  lambda: number
): FitResult {
  const { Ztrain, ycTrain, scaler } = design;
  const weights =
    mode === "l1" && lambda > 0
      ? lassoFit(Ztrain, ycTrain, lambda, 20000, 1e-10, ridgeFit(Ztrain, ycTrain, lambda))
      : ridgeFit(Ztrain, ycTrain, lambda);
  // lambda = 0 in both modes is plain least squares, solved in closed form.

  const zeroCount = weights.filter((v) => v === 0).length;
  const maxAbsWeight = weights.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

  return {
    weights,
    trainMse: mseOnSplit(points, "train", weights, scaler),
    holdoutMse: mseOnSplit(points, "holdout", weights, scaler),
    zeroCount,
    maxAbsWeight,
  };
}

// ── Lambda slider mapping (log scale) ────────────────────────────────────────

export function lambdaFromStep(step: number): number {
  if (step <= 0) return 0;
  const t = (step - 1) / (LAMBDA_MAX_STEP - 1);
  return Math.pow(10, LOG_LO + t * (LOG_HI - LOG_LO));
}

/** Inverse of lambdaFromStep for positioning ticks; lambda must be > 0. */
export function stepFromLambda(lambda: number): number {
  const t = (Math.log10(lambda) - LOG_LO) / (LOG_HI - LOG_LO);
  return 1 + t * (LAMBDA_MAX_STEP - 1);
}

export function bucketFromStep(step: number): LambdaBucket | null {
  if (step <= 0) return null;
  if (step <= 13) return "low";
  if (step <= 27) return "mid";
  return "high";
}

export function formatLambda(lambda: number): string {
  if (lambda === 0) return "0";
  if (lambda < 0.01) return lambda.toExponential(1);
  if (lambda < 1) return lambda.toFixed(3);
  return lambda.toFixed(1);
}

// ── Error curves over the full lambda grid ───────────────────────────────────

export function computeErrorCurve(
  points: DataPoint[],
  design: DesignMatrices,
  mode: RegMode
): ErrorCurvePoint[] {
  const curve: ErrorCurvePoint[] = [];
  for (let s = 0; s <= LAMBDA_MAX_STEP; s++) {
    const lambda = lambdaFromStep(s);
    const fit = fitModel(points, design, mode, lambda);
    curve.push({
      step: s,
      lambda,
      trainMse: fit.trainMse,
      holdoutMse: fit.holdoutMse,
    });
  }
  return curve;
}
