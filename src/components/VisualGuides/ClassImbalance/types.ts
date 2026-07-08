// Pure, deterministic math for the Class Imbalance guide. No React in this file.
//
// The score model: one fixed pair of Gaussian score distributions
//   positive class ~ N(POS_MEAN, SCORE_SD), negative class ~ N(NEG_MEAN, SCORE_SD)
// Samples are drawn as stratified quantiles (inverse normal CDF at (i + 0.5) / n),
// so every dataset is fully deterministic and representative even at tiny class
// counts. The imbalance slider changes ONLY the class counts, never the
// distributions themselves.

export const TOTAL_POINTS = 400;
export const POS_MEAN = 0.62;
export const NEG_MEAN = 0.38;
export const SCORE_SD = 0.15;

export interface Dataset {
  /** Positive-class scores, ascending. */
  pos: number[];
  /** Negative-class scores, ascending. */
  neg: number[];
}

export interface RocPoint {
  fpr: number;
  tpr: number;
}

export interface PrPoint {
  recall: number;
  precision: number;
}

export interface RocResult {
  points: RocPoint[];
  /** Area under the ROC curve, trapezoidal rule. */
  auc: number;
}

export interface PrResult {
  points: PrPoint[];
  /** Area under the PR curve, trapezoidal rule (displayed as average precision). */
  averagePrecision: number;
}

export interface ConfusionMatrix {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
}

export interface ThresholdMetrics {
  accuracy: number;
  /** null when no points are predicted positive (undefined precision). */
  precision: number | null;
  recall: number;
  f1: number;
}

export interface OptimalThresholds {
  accThreshold: number;
  accValue: number;
  f1Threshold: number;
  f1Value: number;
}

/** Deterministic LCG in [0, 1): used only for display jitter, never for scores. */
export function lcg(seed: number): number {
  return ((seed * 1664525 + 1013904223) >>> 0) / 0xffffffff;
}

/**
 * Inverse standard normal CDF (Acklam's rational approximation).
 * Accurate to ~1.15e-9 over (0, 1).
 */
export function normalQuantile(p: number): number {
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

  if (p <= 0 || p >= 1) {
    throw new Error("normalQuantile requires p in (0, 1)");
  }

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(
    (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

/** n deterministic Gaussian samples via stratified quantiles, clipped to (0, 1), ascending. */
export function gaussianScores(n: number, mean: number, sd: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const q = (i + 0.5) / n;
    const s = mean + sd * normalQuantile(q);
    out.push(Math.min(0.995, Math.max(0.005, s)));
  }
  return out;
}

/**
 * Build the on-screen dataset for a given imbalance ratio (negatives per positive).
 * Total point count stays ~TOTAL_POINTS; only the class split changes.
 */
export function buildDataset(negPerPos: number): Dataset {
  const nPos = Math.max(2, Math.round(TOTAL_POINTS / (1 + negPerPos)));
  const nNeg = TOTAL_POINTS - nPos;
  return {
    pos: gaussianScores(nPos, POS_MEAN, SCORE_SD),
    neg: gaussianScores(nNeg, NEG_MEAN, SCORE_SD),
  };
}

interface LabeledScore {
  s: number;
  isPos: boolean;
}

function sortedDescending(data: Dataset): LabeledScore[] {
  const all: LabeledScore[] = [
    ...data.pos.map((s) => ({ s, isPos: true })),
    ...data.neg.map((s) => ({ s, isPos: false })),
  ];
  all.sort((a, b) => b.s - a.s);
  return all;
}

/**
 * ROC curve: sweep the threshold down through every distinct score
 * (ties grouped), collecting (FPR, TPR). AUC by the trapezoidal rule.
 */
export function computeRoc(data: Dataset): RocResult {
  const P = data.pos.length;
  const N = data.neg.length;
  const all = sortedDescending(data);

  const points: RocPoint[] = [{ fpr: 0, tpr: 0 }];
  let tp = 0;
  let fp = 0;
  let i = 0;
  while (i < all.length) {
    const s = all[i].s;
    while (i < all.length && all[i].s === s) {
      if (all[i].isPos) tp++;
      else fp++;
      i++;
    }
    points.push({ fpr: fp / N, tpr: tp / P });
  }

  let auc = 0;
  for (let k = 1; k < points.length; k++) {
    auc +=
      ((points[k].fpr - points[k - 1].fpr) *
        (points[k].tpr + points[k - 1].tpr)) /
      2;
  }
  return { points, auc };
}

/**
 * PR curve from the same threshold sweep (ties grouped), anchored at
 * recall 0 with the first computed precision. Area by the trapezoidal rule,
 * displayed as average precision.
 */
export function computePr(data: Dataset): PrResult {
  const P = data.pos.length;
  const all = sortedDescending(data);

  const raw: PrPoint[] = [];
  let tp = 0;
  let fp = 0;
  let i = 0;
  while (i < all.length) {
    const s = all[i].s;
    while (i < all.length && all[i].s === s) {
      if (all[i].isPos) tp++;
      else fp++;
      i++;
    }
    raw.push({ recall: tp / P, precision: tp / (tp + fp) });
  }

  const anchor: PrPoint = {
    recall: 0,
    precision: raw.length > 0 ? raw[0].precision : 1,
  };
  const points = [anchor, ...raw];

  let ap = 0;
  for (let k = 1; k < points.length; k++) {
    ap +=
      ((points[k].recall - points[k - 1].recall) *
        (points[k].precision + points[k - 1].precision)) /
      2;
  }
  return { points, averagePrecision: ap };
}

/** Count of entries in an ascending array that are >= t (binary search). */
function countAtLeast(sortedAsc: number[], t: number): number {
  let lo = 0;
  let hi = sortedAsc.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sortedAsc[mid] >= t) hi = mid;
    else lo = mid + 1;
  }
  return sortedAsc.length - lo;
}

/** Confusion matrix at a threshold: predict positive when score >= threshold. */
export function confusionAt(data: Dataset, threshold: number): ConfusionMatrix {
  const tp = countAtLeast(data.pos, threshold);
  const fp = countAtLeast(data.neg, threshold);
  return { tp, fp, fn: data.pos.length - tp, tn: data.neg.length - fp };
}

export function metricsFrom(cm: ConfusionMatrix): ThresholdMetrics {
  const total = cm.tp + cm.fp + cm.fn + cm.tn;
  const accuracy = total > 0 ? (cm.tp + cm.tn) / total : 0;
  const predictedPos = cm.tp + cm.fp;
  const precision = predictedPos > 0 ? cm.tp / predictedPos : null;
  const actualPos = cm.tp + cm.fn;
  const recall = actualPos > 0 ? cm.tp / actualPos : 0;
  const p = precision ?? 0;
  const f1 = p + recall > 0 ? (2 * p * recall) / (p + recall) : 0;
  return { accuracy, precision, recall, f1 };
}

/**
 * Sweep 201 candidate thresholds (0.000 to 1.000 in steps of 0.005) and return
 * the accuracy-optimal and F1-optimal thresholds with their metric values.
 */
export function optimalThresholds(data: Dataset): OptimalThresholds {
  let accThreshold = 0.5;
  let accValue = -1;
  let f1Threshold = 0.5;
  let f1Value = -1;
  for (let i = 0; i <= 200; i++) {
    const t = i / 200;
    const m = metricsFrom(confusionAt(data, t));
    if (m.accuracy > accValue) {
      accValue = m.accuracy;
      accThreshold = t;
    }
    if (m.f1 > f1Value) {
      f1Value = m.f1;
      f1Threshold = t;
    }
  }
  return { accThreshold, accValue, f1Threshold, f1Value };
}
