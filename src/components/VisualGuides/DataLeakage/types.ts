// Pure, deterministic math for the Data Leakage guide.
// No React here: every number shown in the UI is computed by these functions
// from the seeded synthetic datasets below.

// ── Deterministic PRNG ────────────────────────────────────────────────────────

export function lcg(seed: number): number {
  return (((seed * 1664525 + 1013904223) >>> 0) / 0xffffffff);
}

/** Deterministic standard-normal draw (Box-Muller over two LCG streams). */
export function pseudoNormal(seed: number): number {
  const u1 = Math.min(Math.max(lcg(seed), 1e-9), 1 - 1e-9);
  const u2 = lcg(seed * 7919 + 17);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ── Shared helpers ────────────────────────────────────────────────────────────

export interface MeanStd {
  mean: number;
  std: number;
}

export function meanStd(xs: number[]): MeanStd {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  return { mean, std: Math.sqrt(variance) || 1 };
}

// ══════════════════════════════════════════════════════════════════════════════
// Demo A: preprocessing leakage (z-scaling before vs after the split)
// ══════════════════════════════════════════════════════════════════════════════

export type Pipeline = "leaky" | "proper";
export type LeakState = "excluded" | "included";

export interface LabeledPoint {
  f1: number; // signal feature: separates the classes
  f2: number; // batch feature: shifted in the validation half
  y: 0 | 1;
}

export interface ScaledPoint extends LabeledPoint {
  z1: number;
  z2: number;
  split: "train" | "val";
}

export const SHIFT_MIN = 0;
export const SHIFT_MAX = 12;
export const SHIFT_DEFAULT = 8;

const SCALING_N_PER_SPLIT = 20;

/**
 * Train half: f1 ~ +-1 by class, f2 ~ N(0, 0.5).
 * Validation half: same f1 pattern, but f2 offset by `shift`
 * (a batch effect: think "recalibrated sensor" or "new cohort").
 */
export function buildScalingDemoData(shift: number): {
  train: LabeledPoint[];
  val: LabeledPoint[];
} {
  const train: LabeledPoint[] = [];
  const val: LabeledPoint[] = [];
  for (let i = 0; i < SCALING_N_PER_SPLIT; i++) {
    const y = (i % 2) as 0 | 1;
    const sign = y === 1 ? 1 : -1;
    train.push({
      f1: sign + 0.35 * pseudoNormal(i * 101 + 3),
      f2: 0.5 * pseudoNormal(i * 211 + 5),
      y,
    });
    val.push({
      f1: sign + 0.35 * pseudoNormal(i * 307 + 11),
      f2: shift + 0.5 * pseudoNormal(i * 401 + 13),
      y,
    });
  }
  return { train, val };
}

function zScale(points: LabeledPoint[], s1: MeanStd, s2: MeanStd, split: "train" | "val"): ScaledPoint[] {
  return points.map((p) => ({
    ...p,
    z1: (p.f1 - s1.mean) / s1.std,
    z2: (p.f2 - s2.mean) / s2.std,
    split,
  }));
}

/** 1-nearest-neighbor classification accuracy of `val` against `train`. */
export function nn1Accuracy(train: ScaledPoint[], val: ScaledPoint[]): number {
  let correct = 0;
  for (const v of val) {
    let best = Infinity;
    let label: 0 | 1 = 0;
    for (const t of train) {
      const d = (v.z1 - t.z1) ** 2 + (v.z2 - t.z2) ** 2;
      if (d < best) {
        best = d;
        label = t.y;
      }
    }
    if (label === v.y) correct++;
  }
  return correct / val.length;
}

export interface ScalingPipelineResult {
  points: ScaledPoint[]; // train + val in the pipeline's scaled space
  accuracy: number; // validation accuracy under this pipeline
  statsSource: "train only" | "train + validation";
}

export interface ScalingDemoResult {
  leaky: ScalingPipelineResult;
  proper: ScalingPipelineResult;
  trainN: number;
  valN: number;
}

export function runScalingDemo(shift: number): ScalingDemoResult {
  const { train, val } = buildScalingDemoData(shift);

  // Proper pipeline: scaler fitted on the training half only.
  const properS1 = meanStd(train.map((p) => p.f1));
  const properS2 = meanStd(train.map((p) => p.f2));
  const properTrain = zScale(train, properS1, properS2, "train");
  const properVal = zScale(val, properS1, properS2, "val");

  // Leaky pipeline: scaler fitted on ALL rows before splitting.
  const all = [...train, ...val];
  const leakyS1 = meanStd(all.map((p) => p.f1));
  const leakyS2 = meanStd(all.map((p) => p.f2));
  const leakyTrain = zScale(train, leakyS1, leakyS2, "train");
  const leakyVal = zScale(val, leakyS1, leakyS2, "val");

  return {
    leaky: {
      points: [...leakyTrain, ...leakyVal],
      accuracy: nn1Accuracy(leakyTrain, leakyVal),
      statsSource: "train + validation",
    },
    proper: {
      points: [...properTrain, ...properVal],
      accuracy: nn1Accuracy(properTrain, properVal),
      statsSource: "train only",
    },
    trainN: train.length,
    valN: val.length,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Demo B: target leakage (a feature that is a noisy copy of the label)
// ══════════════════════════════════════════════════════════════════════════════

export interface Customer {
  tickets: number; // support tickets in the last quarter
  tenure: number; // months as a customer
  y: 0 | 1; // churned
  leakNoise: number; // per-row noise applied to the leaked feature
}

export const LEAK_NOISE_MIN = 0;
export const LEAK_NOISE_MAX = 1.5;
export const LEAK_NOISE_DEFAULT = 0.2;

const CHURN_N = 40;
const CHURN_TRAIN_N = 24;

export function buildChurnData(): Customer[] {
  const rows: Customer[] = [];
  for (let i = 0; i < CHURN_N; i++) {
    const tickets = Math.min(9, Math.max(0, Math.round(3 + 2 * pseudoNormal(i * 53 + 7))));
    const tenure = Math.min(48, Math.max(1, Math.round(24 + 12 * pseudoNormal(i * 59 + 9))));
    const score =
      ((tickets - 3) / 2) * 1.0 - ((tenure - 24) / 12) * 0.8 + 1.2 * pseudoNormal(i * 61 + 11);
    rows.push({
      tickets,
      tenure,
      y: score > 0 ? 1 : 0,
      leakNoise: pseudoNormal(i * 67 + 13),
    });
  }
  return rows;
}

/**
 * Logistic regression via batch gradient descent.
 * Returns weights [bias, w1..wd]. Deterministic: zero init, fixed schedule.
 */
export function trainLogistic(X: number[][], y: number[], lr = 0.5, epochs = 400): number[] {
  const n = X.length;
  const d = X[0].length;
  const w = new Array<number>(d + 1).fill(0);
  for (let e = 0; e < epochs; e++) {
    const grad = new Array<number>(d + 1).fill(0);
    for (let i = 0; i < n; i++) {
      let z = w[0];
      for (let j = 0; j < d; j++) z += w[j + 1] * X[i][j];
      const p = 1 / (1 + Math.exp(-z));
      const err = p - y[i];
      grad[0] += err;
      for (let j = 0; j < d; j++) grad[j + 1] += err * X[i][j];
    }
    for (let j = 0; j <= d; j++) w[j] -= (lr / n) * grad[j];
  }
  return w;
}

export function logisticAccuracy(w: number[], X: number[][], y: number[]): number {
  let correct = 0;
  for (let i = 0; i < X.length; i++) {
    let z = w[0];
    for (let j = 0; j < X[i].length; j++) z += w[j + 1] * X[i][j];
    if ((z > 0 ? 1 : 0) === y[i]) correct++;
  }
  return correct / X.length;
}

export interface ChurnFit {
  accuracy: number; // validation accuracy
  trainAccuracy: number;
  /** Absolute standardized weight per feature, in the order given by featureNames. */
  absWeights: number[];
  featureNames: string[];
}

export interface ChurnDemoResult {
  baseline: ChurnFit; // tickets + tenure only
  withLeak: ChurnFit; // tickets + tenure + leaked feature
  trainN: number;
  valN: number;
  valChurnRate: number;
}

export function runChurnDemo(leakNoiseLevel: number): ChurnDemoResult {
  const rows = buildChurnData();
  const train = rows.slice(0, CHURN_TRAIN_N);
  const val = rows.slice(CHURN_TRAIN_N);

  // Standardize with TRAIN stats only (this demo is not about scaling leakage).
  const tS = meanStd(train.map((r) => r.tickets));
  const nS = meanStd(train.map((r) => r.tenure));
  const leakOf = (r: Customer) => r.y + leakNoiseLevel * r.leakNoise;
  const lS = meanStd(train.map(leakOf));

  const base = (r: Customer) => [(r.tickets - tS.mean) / tS.std, (r.tenure - nS.mean) / nS.std];
  const leaked = (r: Customer) => [...base(r), (leakOf(r) - lS.mean) / lS.std];

  const yTrain = train.map((r) => r.y);
  const yVal = val.map((r) => r.y);

  const wBase = trainLogistic(train.map(base), yTrain);
  const wLeak = trainLogistic(train.map(leaked), yTrain);

  return {
    baseline: {
      accuracy: logisticAccuracy(wBase, val.map(base), yVal),
      trainAccuracy: logisticAccuracy(wBase, train.map(base), yTrain),
      absWeights: [Math.abs(wBase[1]), Math.abs(wBase[2])],
      featureNames: ["support_tickets", "tenure_months"],
    },
    withLeak: {
      accuracy: logisticAccuracy(wLeak, val.map(leaked), yVal),
      trainAccuracy: logisticAccuracy(wLeak, train.map(leaked), yTrain),
      absWeights: [Math.abs(wLeak[1]), Math.abs(wLeak[2]), Math.abs(wLeak[3])],
      featureNames: ["support_tickets", "tenure_months", "days_until_churn_call"],
    },
    trainN: train.length,
    valN: val.length,
    valChurnRate: yVal.reduce<number>((a, b) => a + b, 0) / yVal.length,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Demo C: temporal leakage (random split vs time-based split on a trending series)
// ══════════════════════════════════════════════════════════════════════════════

export type SplitKind = "random" | "time";

export const TREND_MIN = 0;
export const TREND_MAX = 3;
export const TREND_DEFAULT = 2;

const SERIES_N = 40;
const SERIES_VAL_N = 10;

/** Trending series: 50 + trend * t + fixed deterministic noise. */
export function buildTrendSeries(trendStrength: number): number[] {
  return Array.from(
    { length: SERIES_N },
    (_, t) => 50 + trendStrength * t + 4 * pseudoNormal(t * 71 + 19)
  );
}

export function splitIndices(kind: SplitKind): { trainIdx: number[]; valIdx: number[] } {
  const all = Array.from({ length: SERIES_N }, (_, t) => t);
  if (kind === "time") {
    return {
      trainIdx: all.slice(0, SERIES_N - SERIES_VAL_N),
      valIdx: all.slice(SERIES_N - SERIES_VAL_N),
    };
  }
  // Deterministic pseudo-random split: rank each index by a double-hashed LCG key
  // (two rounds decorrelate sequential indices).
  const ranked = all
    .map((t) => ({ t, key: lcg(Math.floor(lcg(t * 97 + 29) * 0xffffffff)) }))
    .sort((a, b) => a.key - b.key || a.t - b.t);
  const valSet = new Set(ranked.slice(0, SERIES_VAL_N).map((r) => r.t));
  return {
    trainIdx: all.filter((t) => !valSet.has(t)),
    valIdx: all.filter((t) => valSet.has(t)),
  };
}

export interface TemporalFit {
  valIdx: number[];
  predictions: number[]; // aligned with valIdx
  mae: number;
}

export interface TemporalDemoResult {
  series: number[];
  random: TemporalFit;
  time: TemporalFit;
}

/** 1-NN regression on the time index: predict each held-out point with the value of the nearest training timestamp. */
function fitTemporal(series: number[], kind: SplitKind): TemporalFit {
  const { trainIdx, valIdx } = splitIndices(kind);
  const predictions = valIdx.map((v) => {
    let bestT = trainIdx[0];
    let bestD = Infinity;
    for (const t of trainIdx) {
      const d = Math.abs(t - v);
      if (d < bestD || (d === bestD && t < bestT)) {
        bestD = d;
        bestT = t;
      }
    }
    return series[bestT];
  });
  const mae =
    valIdx.reduce((acc, v, i) => acc + Math.abs(series[v] - predictions[i]), 0) / valIdx.length;
  return { valIdx, predictions, mae };
}

export function runTemporalDemo(trendStrength: number): TemporalDemoResult {
  const series = buildTrendSeries(trendStrength);
  return {
    series,
    random: fitTemporal(series, "random"),
    time: fitTemporal(series, "time"),
  };
}
