// ── Types ─────────────────────────────────────────────────────────────────────

export type TestDirection = "two-tailed" | "one-tailed";
export type MetricName = "Conversion Rate" | "Revenue per User" | "Click-through Rate";
export type RandomizationMethod = "simple" | "stratified" | "blocked";

export interface Hypothesis {
  h0: string;
  h1: string;
  direction: TestDirection;
}

export interface MetricConfig {
  name: MetricName;
  baselineRate: number;
}

export interface TestParameters {
  alpha: number;
  power: number;
  mde: number;
}

export interface Phase1State {
  hypothesis: Hypothesis;
  metric: MetricConfig;
  parameters: TestParameters;
  sampleSize: number;
}

export interface Covariate {
  name: string;
  controlMean: number;
  treatmentMean: number;
  pValue: number;
}

export interface Phase2State {
  randomizationMethod: RandomizationMethod;
  controlSize: number;
  treatmentSize: number;
  covariates: Covariate[];
}

export interface Phase3State {
  elapsedDays: number;
  totalDays: number;
  controlConversions: number;
  treatmentConversions: number;
  controlN: number;
  treatmentN: number;
  isPaused: boolean;
  isComplete: boolean;
  history: { day: number; controlRate: number; treatmentRate: number }[];
}

export interface Phase4Props {
  controlConversions: number;
  treatmentConversions: number;
  controlN: number;
  treatmentN: number;
  alpha: number;
  baselineRate: number;
  mde: number;
  direction: TestDirection;
}

// ── Math helpers ──────────────────────────────────────────────────────────────

/**
 * Standard normal CDF: Phi(z) = 0.5 * (1 + erf(z / sqrt(2))),
 * with erf via Abramowitz & Stegun 7.1.26 (|error| < 1.5e-7).
 */
export function normalCDF(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const p = 0.3275911;
  const a = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429];
  const t = 1 / (1 + p * x);
  const poly = t * (a[0] + t * (a[1] + t * (a[2] + t * (a[3] + t * a[4]))));
  const erf = 1 - poly * Math.exp(-x * x);
  return z < 0 ? 0.5 * (1 - erf) : 0.5 * (1 + erf);
}

/**
 * Inverse of the standard normal CDF (Acklam's rational approximation,
 * relative error < 1.15e-9). Returns z such that Phi(z) = p.
 */
export function normalQuantile(p: number): number {
  if (p <= 0 || p >= 1) {
    throw new RangeError("normalQuantile requires 0 < p < 1");
  }
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number;
  let r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return (
    -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

/** z_alpha for the chosen significance level and test direction */
export function zAlphaFor(alpha: number, direction: TestDirection): number {
  return direction === "two-tailed"
    ? normalQuantile(1 - alpha / 2)
    : normalQuantile(1 - alpha);
}

/**
 * Per-group sample size for a two-proportion test
 * (unpooled-variance form, e.g. Fleiss):
 * n = (z_alpha * sqrt(2*pbar*(1-pbar)) + z_beta * sqrt(p1*(1-p1) + p2*(1-p2)))^2 / mde^2
 * where p1 = baseline, p2 = baseline + mde, pbar = (p1 + p2) / 2.
 * z_alpha and z_beta are computed from the user's actual alpha, power, and direction.
 */
export function computeSampleSize(
  p: number,
  mde: number,
  alpha: number,
  power: number,
  direction: TestDirection
): number {
  const zAlpha = zAlphaFor(alpha, direction);
  const zPower = normalQuantile(power);
  const p1 = p;
  const p2 = Math.min(0.999, p + mde);
  const pBar = (p1 + p2) / 2;
  const numerator =
    zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) +
    zPower * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  const n = numerator ** 2 / mde ** 2;
  return Math.ceil(n);
}

/**
 * Two-proportion z-test.
 * One-tailed mode tests H1: p2 > p1 (right tail), matching the guide's
 * one-tailed hypothesis that the treatment is better.
 * The CI level matches the test: (1 - alpha) two-sided.
 */
export function twoProportionZTest(
  x1: number,
  n1: number,
  x2: number,
  n2: number,
  alpha: number = 0.05,
  direction: TestDirection = "two-tailed"
): { z: number; pValue: number; ciLow: number; ciHigh: number; cohenH: number } {
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const pPooled = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2));
  const z = se === 0 ? 0 : (p2 - p1) / se;
  // p-value matching the chosen rejection region
  const pValue =
    direction === "two-tailed"
      ? 2 * (1 - normalCDF(Math.abs(z)))
      : 1 - normalCDF(z);
  // (1 - alpha) two-sided CI for the difference
  const zCI = normalQuantile(1 - alpha / 2);
  const seDiff = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  const ciLow = p2 - p1 - zCI * seDiff;
  const ciHigh = p2 - p1 + zCI * seDiff;
  // Cohen's h
  const cohenH = 2 * Math.asin(Math.sqrt(p2)) - 2 * Math.asin(Math.sqrt(p1));
  return { z, pValue, ciLow, ciHigh, cohenH };
}

/** Seeded pseudo-random (mulberry32) */
export function seededRandom(seed: number): () => number {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SIMULATED_COVARIATES: Covariate[] = [
  { name: "Age (years)", controlMean: 34.2, treatmentMean: 33.8, pValue: 0.42 },
  { name: "Gender (% Female)", controlMean: 0.512, treatmentMean: 0.508, pValue: 0.78 },
  { name: "Device (% Mobile)", controlMean: 0.631, treatmentMean: 0.629, pValue: 0.91 },
];
