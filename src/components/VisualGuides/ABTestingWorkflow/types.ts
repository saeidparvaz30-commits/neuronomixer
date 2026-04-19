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

/** Abramowitz & Stegun normal CDF approximation */
export function normalCDF(z: number): number {
  const p = 0.3275911;
  const a = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429];
  const sign = z < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(z));
  const poly = t * (a[0] + t * (a[1] + t * (a[2] + t * (a[3] + t * a[4]))));
  return 0.5 * (1 + sign * (1 - poly * Math.exp(-z * z)));
}

/** Sample size formula: n = 2 * (z_alpha + z_power)^2 * p*(1-p) / mde^2 */
export function computeSampleSize(
  p: number,
  mde: number,
  alpha: number,
  power: number,
  direction: TestDirection
): number {
  const zAlpha = direction === "two-tailed" ? 1.959964 : 1.644854;
  const zPower = power <= 0.8 ? 0.841621 : power <= 0.9 ? 1.281552 : 1.644854;
  const n = (2 * (zAlpha + zPower) ** 2 * p * (1 - p)) / mde ** 2;
  return Math.ceil(n);
}

/** Two-proportion z-test */
export function twoProportionZTest(
  x1: number,
  n1: number,
  x2: number,
  n2: number
): { z: number; pValue: number; ciLow: number; ciHigh: number; cohenH: number } {
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const pPooled = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2));
  const z = se === 0 ? 0 : (p2 - p1) / se;
  // two-tailed p-value
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  // 95% CI for difference
  const seDiff = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  const ciLow = p2 - p1 - 1.96 * seDiff;
  const ciHigh = p2 - p1 + 1.96 * seDiff;
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
