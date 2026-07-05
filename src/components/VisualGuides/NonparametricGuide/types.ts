// ─── Types ────────────────────────────────────────────────────────────────────

export type DatasetId = "skewed" | "ordinal" | "small-sample" | "outliers";

export interface NonparametricData {
  id: DatasetId;
  label: string;
  description: string;
  values: number[];
  group1?: number[];
  group2?: number[];
  before?: number[];
  after?: number[];
  dataType: "continuous" | "ordinal";
}

export interface AssumptionResult {
  qqCorrelation: number;
  isNormal: boolean;
  skewness: number;
  interpretation: string;
}

export interface TestResult {
  testName: string;
  statistic: number;
  statisticLabel: string; // "t", "U", "W", "T", "H"
  pValue: number;
  significant: boolean;
  assumptionsMet: boolean;
  reliable: boolean;
  ciLower?: number;
  ciUpper?: number;
}

export interface DecisionAnswer {
  numGroups?: "one" | "two" | "many";
  design?: "paired" | "independent";
  variableType?: "continuous" | "ordinal" | "binary";
  sampleSize?: "small" | "medium" | "large";
  normality?: "yes" | "no" | "unsure";
}

// ─── Pre-generated datasets ────────────────────────────────────────────────────

const SKEWED_GROUP1: number[] = [
  2, 3, 4, 4, 5, 5, 5, 6, 7, 8, 10, 12, 15, 18, 23, 28, 35, 42, 55, 71,
];
const SKEWED_GROUP2: number[] = [
  5, 6, 7, 8, 9, 11, 14, 17, 22, 29, 38, 47, 59, 74, 92, 108, 132, 159, 201, 248,
];

const ORDINAL_GROUP1: number[] = [
  1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5, 5, 3, 2, 4, 3, 2,
];
const ORDINAL_GROUP2: number[] = [
  2, 3, 3, 4, 4, 4, 5, 5, 5, 5, 4, 3, 4, 5, 4, 3, 5, 4, 3, 4,
];

const SMALL_BEFORE: number[] = [45, 52, 38, 61, 47, 55, 43, 58, 62, 49, 51, 40];
const SMALL_AFTER: number[] = [39, 48, 35, 55, 43, 50, 40, 60, 57, 46, 47, 38];

const OUTLIERS_BASE: number[] = [
  22, 24, 23, 25, 21, 26, 24, 22, 25, 23, 27, 21, 24, 25, 22,
];
const OUTLIERS_G1: number[] = [...OUTLIERS_BASE, 95, 128];
const OUTLIERS_G2: number[] = [
  25, 27, 26, 28, 24, 29, 27, 25, 28, 26, 30, 24, 27, 28, 25, 98, 141,
];

export const DATASETS: NonparametricData[] = [
  {
    id: "skewed",
    label: "Skewed Data",
    description: "Right-skewed continuous data violating normality assumption",
    values: [...SKEWED_GROUP1, ...SKEWED_GROUP2],
    group1: SKEWED_GROUP1,
    group2: SKEWED_GROUP2,
    dataType: "continuous",
  },
  {
    id: "ordinal",
    label: "Ordinal Data",
    description: "1–5 Likert scale responses from two groups",
    values: [...ORDINAL_GROUP1, ...ORDINAL_GROUP2],
    group1: ORDINAL_GROUP1,
    group2: ORDINAL_GROUP2,
    dataType: "ordinal",
  },
  {
    id: "small-sample",
    label: "Small Sample",
    description: "Paired before/after measurements (n=12 pairs)",
    values: [...SMALL_BEFORE, ...SMALL_AFTER],
    before: SMALL_BEFORE,
    after: SMALL_AFTER,
    group1: SMALL_BEFORE,
    group2: SMALL_AFTER,
    dataType: "continuous",
  },
  {
    id: "outliers",
    label: "Outliers Present",
    description: "Mostly normal distribution with 2 extreme outliers per group",
    values: [...OUTLIERS_G1, ...OUTLIERS_G2],
    group1: OUTLIERS_G1,
    group2: OUTLIERS_G2,
    dataType: "continuous",
  },
];

// ─── Math helpers ─────────────────────────────────────────────────────────────

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

export function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
}

export function stdDev(arr: number[]): number {
  return Math.sqrt(variance(arr));
}

export function skewness(arr: number[]): number {
  const n = arr.length;
  if (n < 3) return 0;
  const m = mean(arr);
  const s = stdDev(arr);
  if (s === 0) return 0;
  return (arr.reduce((sum, v) => sum + ((v - m) / s) ** 3, 0) * n) / ((n - 1) * (n - 2));
}

/** Abramowitz & Stegun approximation for normal CDF */
export function normalCDF(z: number): number {
  const sign = z >= 0 ? 1 : -1;
  const x = Math.abs(z);
  const p = 0.2316419;
  const b = [0.319381530, -0.356563782, 1.781477937, -1.821255978, 1.330274429];
  const t = 1 / (1 + p * x);
  const poly = t * (b[0] + t * (b[1] + t * (b[2] + t * (b[3] + t * b[4]))));
  const phi = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const tail = phi * poly;
  return sign === 1 ? 1 - tail : tail;
}

function lgamma(x: number): number {
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x,
    tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
  let f = 1,
    C = 1,
    D = 1 - ((a + b) * x) / (a + 1);
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
  return 1 - 0.5 * incompleteBeta(df / (df + t * t), df / 2, 0.5);
}

function normalInvCDF(p: number): number {
  const a = [2.515517, 0.802853, 0.010328];
  const b = [1.432788, 0.189269, 0.001308];
  if (p <= 0.001) return -3.09;
  if (p >= 0.999) return 3.09;
  const tt = p < 0.5 ? Math.sqrt(-2 * Math.log(p)) : Math.sqrt(-2 * Math.log(1 - p));
  const x =
    tt - (a[0] + tt * (a[1] + tt * a[2])) / (1 + tt * (b[0] + tt * (b[1] + tt * b[2])));
  return p < 0.5 ? -x : x;
}

/**
 * Normality check via the Q-Q plot correlation coefficient: the Pearson
 * correlation between the sorted data and the corresponding normal quantiles
 * (a Shapiro-Francia style statistic, NOT the true Shapiro-Wilk W).
 * Rule of thumb used throughout this guide: r > 0.95 = consistent with
 * normality for these sample sizes (n = 12 to 20).
 */
export function checkNormalityQQ(arr: number[]): AssumptionResult {
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;
  const m = mean(sorted);
  const normalScores = sorted.map((_, i) => normalInvCDF((i + 1) / (n + 1)));
  const nsMean = mean(normalScores);
  const numerator = sorted.reduce((s, v, i) => s + (v - m) * (normalScores[i] - nsMean), 0);
  const denomA = Math.sqrt(sorted.reduce((s, v) => s + (v - m) ** 2, 0));
  const denomB = Math.sqrt(normalScores.reduce((s, v) => s + (v - nsMean) ** 2, 0));
  const denom = denomA * denomB;
  const corr = denom === 0 ? 1 : numerator / denom;
  const r = Math.max(0, Math.min(1, corr));
  const sk = skewness(arr);
  return {
    qqCorrelation: r,
    isNormal: r > 0.95,
    skewness: sk,
    interpretation:
      r > 0.98
        ? "Approximately normal"
        : r > 0.95
        ? "Mild departure from normality"
        : "Significant departure from normality",
  };
}

// ─── Statistical tests ────────────────────────────────────────────────────────

export function runIndependentTTest(g1: number[], g2: number[]): TestResult {
  const n1 = g1.length,
    n2 = g2.length;
  const m1 = mean(g1),
    m2 = mean(g2);
  const v1 = variance(g1),
    v2 = variance(g2);
  const se = Math.sqrt(v1 / n1 + v2 / n2);
  if (se === 0) {
    return {
      testName: "Independent t-test",
      statistic: 0,
      statisticLabel: "t",
      pValue: 1,
      significant: false,
      assumptionsMet: true,
      reliable: true,
    };
  }
  const t = (m1 - m2) / se;
  // Welch df
  const df = (v1 / n1 + v2 / n2) ** 2 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));
  const pOneTail = tCDF(Math.abs(t), df);
  const p = 2 * (1 - pOneTail);
  // 95% CI for difference
  const tCrit = 1.96;
  const ciLower = m1 - m2 - tCrit * se;
  const ciUpper = m1 - m2 + tCrit * se;
  return {
    testName: "Independent t-test",
    statistic: t,
    statisticLabel: "t",
    pValue: Math.max(0.0001, Math.min(0.9999, p)),
    significant: p < 0.05,
    assumptionsMet: true,
    reliable: true,
    ciLower,
    ciUpper,
  };
}

export function mannWhitneyU(g1: number[], g2: number[]): TestResult {
  const n1 = g1.length,
    n2 = g2.length;
  // Rank all combined values
  const combined = [
    ...g1.map((v) => ({ v, group: 0 })),
    ...g2.map((v) => ({ v, group: 1 })),
  ].sort((a, b) => a.v - b.v);
  // Assign ranks (average for ties)
  const ranks = new Array(combined.length);
  let i = 0;
  while (i < combined.length) {
    let j = i;
    while (j < combined.length - 1 && combined[j + 1].v === combined[i].v) j++;
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[k] = avgRank;
    i = j + 1;
  }
  let R1 = 0;
  for (let k = 0; k < combined.length; k++) {
    if (combined[k].group === 0) R1 += ranks[k];
  }
  const U1 = n1 * n2 + (n1 * (n1 + 1)) / 2 - R1;
  const U2 = n1 * n2 - U1;
  const U = Math.min(U1, U2);
  const muU = (n1 * n2) / 2;
  const sigmaU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  const z = sigmaU === 0 ? 0 : (U - muU) / sigmaU;
  const p = 2 * normalCDF(Math.min(0, z));
  return {
    testName: "Mann-Whitney U",
    statistic: U,
    statisticLabel: "U",
    pValue: Math.max(0.0001, Math.min(0.9999, p)),
    significant: p < 0.05,
    assumptionsMet: true,
    reliable: true,
  };
}

export function wilcoxonSignedRank(before: number[], after: number[]): TestResult {
  const n = Math.min(before.length, after.length);
  const diffs = before.slice(0, n).map((v, i) => v - after[i]);
  const nonZero = diffs.filter((d) => d !== 0);
  const m = nonZero.length;
  if (m === 0) {
    return {
      testName: "Wilcoxon Signed-Rank",
      statistic: 0,
      statisticLabel: "T",
      pValue: 1,
      significant: false,
      assumptionsMet: true,
      reliable: true,
    };
  }
  const ranked = nonZero
    .map((d, i) => ({ d, abs: Math.abs(d), origIdx: i }))
    .sort((a, b) => a.abs - b.abs);
  // Assign ranks with ties
  const ranks = new Array(ranked.length);
  let ii = 0;
  while (ii < ranked.length) {
    let jj = ii;
    while (jj < ranked.length - 1 && ranked[jj + 1].abs === ranked[ii].abs) jj++;
    const avg = (ii + jj) / 2 + 1;
    for (let k = ii; k <= jj; k++) ranks[k] = avg;
    ii = jj + 1;
  }
  let Wplus = 0,
    Wminus = 0;
  for (let k = 0; k < ranked.length; k++) {
    if (ranked[k].d > 0) Wplus += ranks[k];
    else Wminus += ranks[k];
  }
  const T = Math.min(Wplus, Wminus);
  const muT = (m * (m + 1)) / 4;
  const sigmaT = Math.sqrt((m * (m + 1) * (2 * m + 1)) / 24);
  const z = sigmaT === 0 ? 0 : (T - muT) / sigmaT;
  const p = 2 * normalCDF(Math.min(0, z));
  return {
    testName: "Wilcoxon Signed-Rank",
    statistic: T,
    statisticLabel: "T",
    pValue: Math.max(0.0001, Math.min(0.9999, p)),
    significant: p < 0.05,
    assumptionsMet: true,
    reliable: true,
  };
}

export function kruskalWallis(groups: number[][]): TestResult {
  const N = groups.reduce((s, g) => s + g.length, 0);
  const k = groups.length;
  // Combine all values
  const combined: { v: number; group: number }[] = [];
  groups.forEach((g, gi) => g.forEach((v) => combined.push({ v, group: gi })));
  combined.sort((a, b) => a.v - b.v);
  // Assign ranks
  const ranks = new Array(combined.length);
  let idx = 0;
  while (idx < combined.length) {
    let jdx = idx;
    while (jdx < combined.length - 1 && combined[jdx + 1].v === combined[idx].v) jdx++;
    const avg = (idx + jdx) / 2 + 1;
    for (let kk = idx; kk <= jdx; kk++) ranks[kk] = avg;
    idx = jdx + 1;
  }
  // Sum of ranks per group
  const rankSums = groups.map(() => 0);
  for (let i = 0; i < combined.length; i++) rankSums[combined[i].group] += ranks[i];
  const H =
    (12 / (N * (N + 1))) * groups.reduce((s, g, gi) => s + rankSums[gi] ** 2 / g.length, 0) -
    3 * (N + 1);
  const df = k - 1;
  // Approximate p-value: chi-square approximation via normal CDF
  // p ≈ 1 - normalCDF(sqrt(2*H) - sqrt(2*df - 1)) when df >= 1
  let p: number;
  if (df <= 0) {
    p = 1;
  } else if (df === 1) {
    p = 2 * (1 - normalCDF(Math.sqrt(Math.max(0, H))));
  } else {
    const z = Math.sqrt(2 * Math.max(0, H)) - Math.sqrt(2 * df - 1);
    p = 1 - normalCDF(z);
  }
  return {
    testName: "Kruskal-Wallis",
    statistic: H,
    statisticLabel: "H",
    pValue: Math.max(0.0001, Math.min(0.9999, p)),
    significant: p < 0.05,
    assumptionsMet: true,
    reliable: true,
  };
}

export function signTest(before: number[], after: number[]): TestResult {
  const n = Math.min(before.length, after.length);
  const diffs = before.slice(0, n).map((v, i) => v - after[i]).filter((d) => d !== 0);
  const m = diffs.length;
  const positives = diffs.filter((d) => d > 0).length;
  if (m === 0) {
    return {
      testName: "Sign Test",
      statistic: 0,
      statisticLabel: "S",
      pValue: 1,
      significant: false,
      assumptionsMet: true,
      reliable: true,
    };
  }
  // Normal approximation for binomial (m, 0.5)
  const mu = m / 2;
  const sigma = Math.sqrt(m / 4);
  // Continuity correction
  const z = (Math.abs(positives - mu) - 0.5) / sigma;
  const p = 2 * (1 - normalCDF(Math.abs(z)));
  return {
    testName: "Sign Test",
    statistic: positives,
    statisticLabel: "S",
    pValue: Math.max(0.0001, Math.min(0.9999, p)),
    significant: p < 0.05,
    assumptionsMet: true,
    reliable: true,
  };
}
