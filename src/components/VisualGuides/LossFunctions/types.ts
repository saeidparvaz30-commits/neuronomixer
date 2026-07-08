// Pure math and deterministic data for the Loss Functions guide.
// No React here: every displayed number in the guide is computed by these
// functions from the on-screen data, so the numbers are testable and honest.

export interface Pt {
  x: number;
  y: number;
}

export interface Line {
  slope: number;
  intercept: number;
}

/** Deterministic LCG in [0, 1) (SPEC v2 pseudo-random source, no Math.random). */
export function lcg(seed: number): number {
  return ((seed * 1664525 + 1013904223) >>> 0) / 0xffffffff;
}

/** Format a number with fixed decimals for display. */
export function fmt(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "n/a";
  const v = n.toFixed(digits);
  // Avoid "-0.00" style output
  return Number(v) === 0 ? (0).toFixed(digits) : v;
}

/** Format with an explicit leading sign (for gradients). */
export function fmtSigned(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "n/a";
  const v = fmt(n, digits);
  return n > 0 && Number(v) !== 0 ? `+${v}` : v;
}

// ── Interactive A: single-prediction losses on a number line ────────────────
// Convention: e = prediction - target. Losses are per-point; gradients are
// with respect to the prediction.

export const TARGET = 2;
export const PRED_MIN = -8;
export const PRED_MAX = 8;

/** Squared error: e^2 */
export function mseLoss(e: number): number {
  return e * e;
}

/** d/dpred of e^2 = 2e (grows linearly with the error). */
export function mseGrad(e: number): number {
  return 2 * e;
}

/** Absolute error: |e| */
export function maeLoss(e: number): number {
  return Math.abs(e);
}

/**
 * d/dpred of |e| = sign(e). Undefined at e = 0 (the kink); we return NaN
 * there and the UI says so explicitly.
 */
export function maeGrad(e: number): number {
  return e === 0 ? NaN : Math.sign(e);
}

/** Huber: 0.5 e^2 for |e| <= delta, else delta (|e| - 0.5 delta). */
export function huberLoss(e: number, delta: number): number {
  const a = Math.abs(e);
  return a <= delta ? 0.5 * e * e : delta * (a - 0.5 * delta);
}

/** Huber gradient: e inside the band, delta * sign(e) outside. */
export function huberGrad(e: number, delta: number): number {
  const a = Math.abs(e);
  if (e === 0) return 0;
  return a <= delta ? e : delta * Math.sign(e);
}

// ── Interactive B: outlier sensitivity, MSE line vs MAE line ────────────────

export const OUTLIER_INDEX = 9; // the point at x = 10
export const OUTLIER_Y = 24;

/**
 * Fixed 12-point dataset near y = 2 + 0.8x with small deterministic LCG noise.
 * Computed once at module load; identical on server and client.
 */
export const BASE_POINTS: Pt[] = Array.from({ length: 12 }, (_, i) => {
  const x = i + 1;
  const noise = (lcg(i * 37 + 11) - 0.5) * 1.6;
  return { x, y: Number((2 + 0.8 * x + noise).toFixed(2)) };
});

/** The dataset shown on screen: base points, with one point swapped to an outlier. */
export function datasetWithOutlier(outlierOn: boolean): Pt[] {
  return BASE_POINTS.map((p, i) =>
    i === OUTLIER_INDEX && outlierOn ? { x: p.x, y: OUTLIER_Y } : p
  );
}

/** Ordinary least squares fit, closed form (minimizes total squared error). */
export function fitOLS(points: Pt[]): Line {
  const n = points.length;
  const xBar = points.reduce((s, p) => s + p.x, 0) / n;
  const yBar = points.reduce((s, p) => s + p.y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (const p of points) {
    sxy += (p.x - xBar) * (p.y - yBar);
    sxx += (p.x - xBar) ** 2;
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  return { slope, intercept: yBar - slope * xBar };
}

export function totalSquaredError(points: Pt[], line: Line): number {
  return points.reduce((s, p) => {
    const r = p.y - (line.intercept + line.slope * p.x);
    return s + r * r;
  }, 0);
}

export function totalAbsoluteError(points: Pt[], line: Line): number {
  return points.reduce(
    (s, p) => s + Math.abs(p.y - (line.intercept + line.slope * p.x)),
    0
  );
}

/**
 * L1-optimal line (minimizes total absolute error) by honest coarse-to-fine
 * grid search: start centered on the OLS solution, scan a 61 x 61 grid of
 * (slope, intercept), then shrink the search window around the best cell and
 * repeat. Four passes with a 6x shrink give slope/intercept resolution of
 * about 0.0003, far below the 2-decimal display precision. Deterministic.
 */
export function fitL1(points: Pt[]): Line {
  const ols = fitOLS(points);
  let best: Line = { slope: ols.slope, intercept: ols.intercept };
  let bestLoss = totalAbsoluteError(points, best);
  let slopeSpan = 2;
  let interceptSpan = 8;
  const STEPS = 60;

  for (let pass = 0; pass < 4; pass++) {
    const s0 = best.slope;
    const i0 = best.intercept;
    for (let si = 0; si <= STEPS; si++) {
      const slope = s0 - slopeSpan + (2 * slopeSpan * si) / STEPS;
      for (let ii = 0; ii <= STEPS; ii++) {
        const intercept = i0 - interceptSpan + (2 * interceptSpan * ii) / STEPS;
        const loss = totalAbsoluteError(points, { slope, intercept });
        if (loss < bestLoss - 1e-12) {
          bestLoss = loss;
          best = { slope, intercept };
        }
      }
    }
    slopeSpan /= 6;
    interceptSpan /= 6;
  }
  return best;
}

// ── Interactive C: cross entropy vs squared error on a probability ──────────
// p is the predicted probability of the TRUE class (binary case, y = 1).

/** Cross entropy for the true class: -ln(p), in nats. */
export function crossEntropy(p: number): number {
  return -Math.log(p);
}

/** Squared error on the probability: (1 - p)^2. */
export function squaredErrorProb(p: number): number {
  return (1 - p) ** 2;
}

/**
 * Gradient of cross entropy with respect to the logit z, for a sigmoid output
 * p = sigmoid(z) and true label y = 1. The sigmoid derivative cancels exactly:
 * dL/dz = p - y = p - 1.
 */
export function ceGradLogit(p: number): number {
  return p - 1;
}

/**
 * Gradient of squared error (1 - p)^2 with respect to the logit z, for
 * p = sigmoid(z) and y = 1: dL/dz = 2 (p - 1) * p (1 - p). The sigmoid
 * derivative p (1 - p) survives and crushes the gradient near p = 0.
 */
export function seGradLogit(p: number): number {
  return 2 * (p - 1) * p * (1 - p);
}
