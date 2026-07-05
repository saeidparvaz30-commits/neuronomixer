export type TestType = "one-tailed" | "two-tailed";

export interface SimulationState {
  effectSize: number;
  sampleSize: number;
  alpha: number;
  testType: TestType;
  groupA: number[];
  groupB: number[];
  tStatistic: number | null;
  pValue: number | null;
  permutationResults: number[];
  significantPermutations: number;
  experimentsRun: number;
  permutationCount: number;
}

export const INITIAL_STATE: SimulationState = {
  effectSize: 0.5,
  sampleSize: 30,
  alpha: 0.05,
  testType: "two-tailed",
  groupA: [],
  groupB: [],
  tStatistic: null,
  pValue: null,
  permutationResults: [],
  significantPermutations: 0,
  experimentsRun: 0,
  permutationCount: 0,
};

// ── Gaussian random (Box-Muller) ─────────────────────────────────────────────
export function gaussianRandom(mean: number, sd: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ── Basic statistics ─────────────────────────────────────────────────────────
export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, v) => a + (v - m) ** 2, 0) / (arr.length - 1));
}

// ── Unpaired t-statistic (pooled SD). Positive t = Group B above Group A,
// matching the direction of the simulated effect. ────────────────────────────
export function computeTStatistic(groupA: number[], groupB: number[]): number {
  const ma = mean(groupA), mb = mean(groupB);
  const sa = stdDev(groupA), sb = stdDev(groupB);
  const n = groupA.length;
  const pooled = Math.sqrt(((n - 1) * sa ** 2 + (n - 1) * sb ** 2) / (2 * n - 2));
  if (pooled === 0) return 0;
  return (mb - ma) / (pooled * Math.sqrt(2 / n));
}

// ── t-distribution CDF (lgamma + incomplete beta via Lentz continued fraction)
function lgamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5;
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
  let f = 1, C = 1;
  let D = 1 - (a + b) * x / (a + 1);
  if (Math.abs(D) < 1e-30) D = 1e-30;
  D = 1 / D;
  f = D;
  for (let m = 1; m <= 200; m++) {
    let num = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
    D = 1 + num * D; if (Math.abs(D) < 1e-30) D = 1e-30; D = 1 / D;
    C = 1 + num / C; if (Math.abs(C) < 1e-30) C = 1e-30;
    f *= C * D;
    num = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
    D = 1 + num * D; if (Math.abs(D) < 1e-30) D = 1e-30; D = 1 / D;
    C = 1 + num / C; if (Math.abs(C) < 1e-30) C = 1e-30;
    f *= C * D;
    if (Math.abs(C * D - 1) < 1e-10) break;
  }
  return front * f;
}

export function tCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  return 1 - 0.5 * incompleteBeta(x, df / 2, 0.5);
}

export function tPDF(t: number, df: number): number {
  return Math.exp(lgamma((df + 1) / 2) - lgamma(df / 2)) /
    (Math.sqrt(df * Math.PI) * Math.pow(1 + t * t / df, (df + 1) / 2));
}

export function computePValue(tStat: number, df: number, testType: TestType): number {
  if (testType === "two-tailed") {
    const p = 1 - tCDF(Math.abs(tStat), df);
    return Math.min(2 * p, 1);
  }
  // One-tailed with the direction fixed BEFORE seeing the data: H1 is
  // "Group B > Group A" (the direction built into the simulation), so the
  // p-value is the right-tail probability P(T >= t). Using |t| here would
  // secretly pick the tail after looking at the result and halve the p-value.
  if (tStat >= 0) return 1 - tCDF(tStat, df);
  // Observed effect points the wrong way: p is greater than 0.5.
  return tCDF(-tStat, df);
}

// Critical value (binary search)
export function criticalValue(alpha: number, df: number, testType: TestType): number {
  const targetP = testType === "two-tailed" ? alpha / 2 : alpha;
  let lo = 0, hi = 10;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (1 - tCDF(mid, df) < targetP) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

// ── Fisher-Yates shuffle ─────────────────────────────────────────────────────
export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Permutation test: shuffle combined, re-split, compute t-stat ─────────────
export function runPermutation(groupA: number[], groupB: number[]): number {
  const combined = shuffleArray([...groupA, ...groupB]);
  const n = groupA.length;
  return computeTStatistic(combined.slice(0, n), combined.slice(n));
}

// ── gaussRand alias (backward compat) ────────────────────────────────────────
export const gaussRand = gaussianRandom;

// ── Legacy helpers used by existing PValuesClient ────────────────────────────
export function generateGroups(effectSize: number, n: number): [number[], number[]] {
  const a = Array.from({ length: n }, () => gaussianRandom(100, 15));
  const b = Array.from({ length: n }, () => gaussianRandom(100 + effectSize * 10, 15));
  return [a, b];
}

export function computeTStat(a: number[], b: number[]): number {
  return computeTStatistic(a, b);
}
