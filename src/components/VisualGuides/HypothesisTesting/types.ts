// ── Result types ──────────────────────────────────────────────────────────────

export type ExperimentResult = "reject" | "fail-to-reject";

export interface ConfusionMatrixCounts {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
}

export interface TestingState {
  effectSize: number;
  sampleSize: number;
  alpha: number;
  currentResult: ExperimentResult | null;
  lastTStat: number | null;
  lastPValue: number | null;
  confusionMatrix: ConfusionMatrixCounts;
  isRunning: boolean;
  experimentsCompleted: number;
  scenariosExplored: Set<string>;
}

export const INITIAL_STATE: TestingState = {
  effectSize: 0.5,
  sampleSize: 50,
  alpha: 0.05,
  currentResult: null,
  lastTStat: null,
  lastPValue: null,
  confusionMatrix: { truePositives: 0, falsePositives: 0, falseNegatives: 0, trueNegatives: 0 },
  isRunning: false,
  experimentsCompleted: 0,
  scenariosExplored: new Set<string>(),
};

// ── Math helpers ──────────────────────────────────────────────────────────────

export function gaussianRandom(mu: number, sd: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * sd + mu;
}

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1));
}

// ── t-distribution CDF (Abramowitz & Stegun / Lentz continued fraction) ──────

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
  // Lentz continued fraction
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

function tCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  const ib = incompleteBeta(x, df / 2, 0.5);
  return 1 - 0.5 * ib;
}

// ── t-test ────────────────────────────────────────────────────────────────────

export function runTTest(groupA: number[], groupB: number[]): { tStat: number; pValue: number } {
  const mA = mean(groupA), mB = mean(groupB);
  const sA = stdDev(groupA), sB = stdDev(groupB);
  const nA = groupA.length, nB = groupB.length;
  const se = Math.sqrt(sA ** 2 / nA + sB ** 2 / nB);
  const tStat = se === 0 ? 0 : (mA - mB) / se;
  const df = Math.max(2 * nA - 2, 1);
  const abst = Math.abs(tStat);
  const pValue = 2 * (1 - tCDF(abst, df));
  return { tStat, pValue: Math.max(0, Math.min(1, pValue)) };
}

// ── Experiment runner ─────────────────────────────────────────────────────────

export function runExperiment(
  effectSize: number,
  n: number,
  alpha: number
): ExperimentResult {
  const groupA = Array.from({ length: n }, () => gaussianRandom(0, 1));
  const groupB = Array.from({ length: n }, () => gaussianRandom(effectSize, 1));
  const { pValue } = runTTest(groupA, groupB);
  return pValue < alpha ? "reject" : "fail-to-reject";
}

export function runExperimentFull(
  effectSize: number,
  n: number,
  alpha: number
): { result: ExperimentResult; tStat: number; pValue: number; groupA: number[]; groupB: number[] } {
  const groupA = Array.from({ length: n }, () => gaussianRandom(0, 1));
  const groupB = Array.from({ length: n }, () => gaussianRandom(effectSize, 1));
  const { tStat, pValue } = runTTest(groupA, groupB);
  return {
    result: pValue < alpha ? "reject" : "fail-to-reject",
    tStat,
    pValue: Math.max(0, Math.min(1, pValue)),
    groupA,
    groupB,
  };
}

// ── Confusion matrix updater ──────────────────────────────────────────────────

export function updateConfusionMatrix(
  result: ExperimentResult,
  effectSize: number,
  matrix: ConfusionMatrixCounts
): ConfusionMatrixCounts {
  const hasEffect = effectSize > 0;
  if (result === "reject" && hasEffect) {
    return { ...matrix, truePositives: matrix.truePositives + 1 };
  } else if (result === "reject" && !hasEffect) {
    return { ...matrix, falsePositives: matrix.falsePositives + 1 };
  } else if (result === "fail-to-reject" && hasEffect) {
    return { ...matrix, falseNegatives: matrix.falseNegatives + 1 };
  } else {
    return { ...matrix, trueNegatives: matrix.trueNegatives + 1 };
  }
}
