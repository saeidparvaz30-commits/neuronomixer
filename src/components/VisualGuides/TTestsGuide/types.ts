// ── Scenario types ────────────────────────────────────────────────────────────

export type ScenarioId = "one-sample" | "independent" | "paired" | "proportion";

export interface TTestResult {
  tStatistic: number;
  pValue: number;
  df: number;
  ciLower: number;
  ciUpper: number;
  cohensD: number;
  effectSizeLabel: "small" | "medium" | "large";
  significant: boolean;
}

export interface ProportionTestResult {
  zStatistic: number;
  pValue: number;
  ciLower: number;
  ciUpper: number;
  significant: boolean;
}

// ── Math helpers ──────────────────────────────────────────────────────────────

export function gaussianRandom(meanVal: number, sd: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * sd + meanVal;
}

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1);
}

export function stdDev(arr: number[]): number {
  return Math.sqrt(variance(arr));
}

// ── t-distribution CDF via incomplete beta (Lentz continued fraction) ─────────

function lgamma(x: number): number {
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
  let f = 1, C = 1;
  let D = 1 - (a + b) * x / (a + 1);
  if (Math.abs(D) < 1e-30) D = 1e-30;
  D = 1 / D;
  f = D;
  for (let m = 1; m <= 200; m++) {
    let num = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    D = 1 + num * D;
    if (Math.abs(D) < 1e-30) D = 1e-30;
    D = 1 / D;
    C = 1 + num / C;
    if (Math.abs(C) < 1e-30) C = 1e-30;
    f *= C * D;
    num = (-(a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    D = 1 + num * D;
    if (Math.abs(D) < 1e-30) D = 1e-30;
    D = 1 / D;
    C = 1 + num / C;
    if (Math.abs(C) < 1e-30) C = 1e-30;
    f *= C * D;
    if (Math.abs(C * D - 1) < 1e-10) break;
  }
  return front * f;
}

export function tCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  return 1 - 0.5 * incompleteBeta(x, df / 2, 0.5);
}

// ── Normal CDF (Abramowitz & Stegun) ─────────────────────────────────────────

export function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422820 * Math.exp(-z * z / 2);
  const poly =
    t * (0.3193815 +
    t * (-0.3565638 +
    t * (1.7814779 +
    t * (-1.8212560 +
    t * 1.3302744))));
  const p = 1 - d * poly;
  return z >= 0 ? p : 1 - p;
}

// ── Effect size label ─────────────────────────────────────────────────────────

export function effectSizeLabel(d: number): "small" | "medium" | "large" {
  const abs = Math.abs(d);
  if (abs < 0.5) return "small";
  if (abs < 0.8) return "medium";
  return "large";
}

// ── One-sample t-test ─────────────────────────────────────────────────────────

export function runOneSampleTTest(values: number[], targetMean: number): TTestResult {
  const n = values.length;
  const m = mean(values);
  const s = stdDev(values);
  const se = s / Math.sqrt(n);
  const tStat = se === 0 ? 0 : (m - targetMean) / se;
  const df = n - 1;
  const abst = Math.abs(tStat);
  const pValue = Math.max(0, Math.min(1, 2 * (1 - tCDF(abst, df))));
  // 95% CI for the mean
  const tCrit = 2.0; // approximate t-critical for large df
  const ciLower = m - tCrit * se;
  const ciUpper = m + tCrit * se;
  const d = (m - targetMean) / s;
  return {
    tStatistic: tStat,
    pValue,
    df,
    ciLower,
    ciUpper,
    cohensD: d,
    effectSizeLabel: effectSizeLabel(d),
    significant: pValue < 0.05,
  };
}

// ── Independent samples t-test ────────────────────────────────────────────────

export function runIndependentTTest(
  group1: number[],
  group2: number[],
  equalVariance = true
): TTestResult {
  const n1 = group1.length, n2 = group2.length;
  const m1 = mean(group1), m2 = mean(group2);
  const s1 = stdDev(group1), s2 = stdDev(group2);
  const diff = m1 - m2;

  let tStat: number, df: number, se: number;

  if (equalVariance) {
    // Pooled variance
    const sp2 = ((n1 - 1) * s1 ** 2 + (n2 - 1) * s2 ** 2) / (n1 + n2 - 2);
    se = Math.sqrt(sp2 * (1 / n1 + 1 / n2));
    df = n1 + n2 - 2;
  } else {
    // Welch's t-test
    const v1 = s1 ** 2 / n1, v2 = s2 ** 2 / n2;
    se = Math.sqrt(v1 + v2);
    df = (v1 + v2) ** 2 / (v1 ** 2 / (n1 - 1) + v2 ** 2 / (n2 - 1));
  }

  tStat = se === 0 ? 0 : diff / se;
  const abst = Math.abs(tStat);
  const pValue = Math.max(0, Math.min(1, 2 * (1 - tCDF(abst, df))));

  // 95% CI for difference
  const tCrit = 2.0;
  const ciLower = diff - tCrit * se;
  const ciUpper = diff + tCrit * se;

  // Pooled SD for Cohen's d
  const spooled = Math.sqrt(((n1 - 1) * s1 ** 2 + (n2 - 1) * s2 ** 2) / (n1 + n2 - 2));
  const d = spooled === 0 ? 0 : diff / spooled;

  return {
    tStatistic: tStat,
    pValue,
    df,
    ciLower,
    ciUpper,
    cohensD: d,
    effectSizeLabel: effectSizeLabel(d),
    significant: pValue < 0.05,
  };
}

// ── Paired t-test ─────────────────────────────────────────────────────────────

export function runPairedTTest(before: number[], after: number[]): TTestResult {
  const diffs = before.map((b, i) => after[i] - b);
  return runOneSampleTTest(diffs, 0);
}

// ── Two-proportion z-test ─────────────────────────────────────────────────────

export function runProportionTest(
  x1: number, n1: number,
  x2: number, n2: number
): ProportionTestResult {
  const p1 = x1 / n1, p2 = x2 / n2;
  const diff = p1 - p2;
  const pPooled = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2));
  const zStat = se === 0 ? 0 : diff / se;
  const pValue = Math.max(0, Math.min(1, 2 * (1 - normalCDF(Math.abs(zStat)))));

  // 95% CI using unpooled SE
  const seUnpooled = Math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2);
  const ciLower = diff - 1.96 * seUnpooled;
  const ciUpper = diff + 1.96 * seUnpooled;

  return {
    zStatistic: zStat,
    pValue,
    ciLower,
    ciUpper,
    significant: pValue < 0.05,
  };
}

// ── Levene's test (simplified) ────────────────────────────────────────────────

export function levenesTest(
  group1: number[],
  group2: number[]
): { pValue: number; equalVariance: boolean } {
  const m1 = mean(group1), m2 = mean(group2);
  const z1 = group1.map(v => Math.abs(v - m1));
  const z2 = group2.map(v => Math.abs(v - m2));
  const { pValue } = runIndependentTTestRaw(z1, z2);
  return { pValue, equalVariance: pValue > 0.05 };
}

function runIndependentTTestRaw(g1: number[], g2: number[]): { pValue: number } {
  const n1 = g1.length, n2 = g2.length;
  const m1 = mean(g1), m2 = mean(g2);
  const s1 = stdDev(g1), s2 = stdDev(g2);
  const v1 = s1 ** 2 / n1, v2 = s2 ** 2 / n2;
  const se = Math.sqrt(v1 + v2);
  const tStat = se === 0 ? 0 : (m1 - m2) / se;
  const df = (v1 + v2) ** 2 / (v1 ** 2 / Math.max(n1 - 1, 1) + v2 ** 2 / Math.max(n2 - 1, 1));
  const abst = Math.abs(tStat);
  const pValue = Math.max(0, Math.min(1, 2 * (1 - tCDF(abst, Math.max(df, 1)))));
  return { pValue };
}

// ── Pre-generated datasets ────────────────────────────────────────────────────

export const FACTORY_DATA: number[] = [
  498, 512, 505, 497, 508, 515, 502, 493, 510, 506,
  499, 511, 504, 495, 507, 514, 501, 492, 509, 505,
  503, 498, 512, 507, 494, 509, 503, 515, 499, 507,
];

export const CAMPAIGN_A_DATA: number[] = [
  5.2, 4.8, 6.1, 5.5, 4.9, 5.8, 6.3, 4.7, 5.1, 5.9,
  6.0, 5.3, 4.6, 5.7, 5.4, 6.2, 4.5, 5.6, 5.0, 6.1,
  5.8, 4.4, 5.3, 6.0, 5.5,
];

export const CAMPAIGN_B_DATA: number[] = [
  4.1, 4.5, 3.9, 4.8, 4.2, 5.0, 3.7, 4.6, 4.3, 4.9,
  3.8, 4.7, 4.0, 5.1, 4.4, 3.6, 4.8, 4.2, 5.2, 4.3,
  3.9, 4.6, 4.1, 4.7, 4.5,
];

export const TRAINING_BEFORE: number[] = [
  72, 65, 78, 70, 68, 74, 61, 75, 69, 73,
  66, 71, 63, 76, 67, 72, 64, 70, 78, 65,
  69, 74, 62, 77, 68,
];

export const TRAINING_AFTER: number[] = [
  78, 70, 84, 76, 75, 81, 68, 82, 77, 80,
  73, 78, 70, 83, 74, 79, 71, 77, 85, 72,
  76, 81, 69, 84, 75,
];
