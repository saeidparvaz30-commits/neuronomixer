// Pure deterministic math for the Model Calibration guide. No React in this file.
//
// Honest-by-construction setup: labels are drawn (via a seeded LCG) from a KNOWN
// true probability sigmoid(logit). The model's reported score is a distorted
// sigmoid(logit / trueT). Because the label process is known, the reliability
// diagram and ECE are genuinely computed from (score, label) pairs, never faked.

export interface CalibrationSample {
  logit: number;
  label: 0 | 1;
}

export interface ReliabilityBin {
  /** Inclusive lower edge of the confidence bin. */
  lo: number;
  /** Exclusive upper edge (inclusive for the last bin). */
  hi: number;
  count: number;
  meanConfidence: number;
  empiricalAccuracy: number;
  /** empiricalAccuracy - meanConfidence (0 for empty bins). */
  gap: number;
}

export interface ReliabilityResult {
  bins: ReliabilityBin[];
  /** Expected Calibration Error: sum over bins of (count/n) * |acc - conf|. */
  ece: number;
  n: number;
}

export type ScoreView = "raw" | "calibrated";

// ── Constants ────────────────────────────────────────────────────────────────

export const SAMPLE_COUNT = 1000;
export const BIN_COUNT = 10;
/** Fixed seed so server and client generate the identical dataset. */
export const SEED = 31;
/** Std dev of the true logits (drawn from a centered normal). */
export const LOGIT_STD = 1.8;

/** Raw ECE at or above this counts as "clearly miscalibrated" (gate A). */
export const MISCALIBRATED_ECE = 0.08;
/** Margin added to the sampling-noise floor to form the calibration target. */
export const TARGET_ECE_MARGIN = 0.015;

export const TRUE_T_MIN = 0.3;
export const TRUE_T_MAX = 3;
export const USER_T_MIN = 0.3;
export const USER_T_MAX = 3.5;
export const T_STEP = 0.01;

// ── Core math ────────────────────────────────────────────────────────────────

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Deterministic LCG stream (same constants as the spec's single-shot lcg()).
 * Never Math.random: identical sequence on server and client.
 */
export function createLcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

/**
 * Generates (logit, label) pairs. logit ~ Normal(0, LOGIT_STD) via Box-Muller;
 * label ~ Bernoulli(sigmoid(logit)). The label process is the ground truth the
 * reliability diagram is measured against.
 */
export function generateSamples(
  seed: number = SEED,
  n: number = SAMPLE_COUNT
): CalibrationSample[] {
  const rand = createLcg(seed);
  const samples: CalibrationSample[] = [];
  for (let i = 0; i < n; i++) {
    const u1 = Math.max(rand(), 1e-12);
    const u2 = rand();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const logit = z * LOGIT_STD;
    const label: 0 | 1 = rand() < sigmoid(logit) ? 1 : 0;
    samples.push({ logit, label });
  }
  return samples;
}

/**
 * Model scores after the miscalibration knob and the user's temperature.
 * The model's logit is z = logit / trueT, so its reported score is sigmoid(z).
 * Temperature scaling divides the model's logit by T:
 *   score = sigmoid(z / T) = sigmoid(logit / (trueT * T))
 * Perfectly calibrated exactly when trueT * T = 1, i.e. T = 1 / trueT.
 */
export function modelScores(
  samples: CalibrationSample[],
  trueT: number,
  temperature: number = 1
): number[] {
  return samples.map((s) => sigmoid(s.logit / (trueT * temperature)));
}

/**
 * 10 equal-width bins over [0, 1]. Per bin: mean predicted probability
 * (confidence) vs observed positive rate (empirical accuracy).
 * ECE = sum over non-empty bins of (count / n) * |accuracy - confidence|.
 */
export function computeReliability(
  scores: number[],
  labels: ReadonlyArray<0 | 1>
): ReliabilityResult {
  const n = scores.length;
  const count = new Array<number>(BIN_COUNT).fill(0);
  const sumConf = new Array<number>(BIN_COUNT).fill(0);
  const sumPos = new Array<number>(BIN_COUNT).fill(0);

  for (let i = 0; i < n; i++) {
    let b = Math.floor(scores[i] * BIN_COUNT);
    if (b >= BIN_COUNT) b = BIN_COUNT - 1; // score exactly 1.0 goes in the top bin
    count[b]++;
    sumConf[b] += scores[i];
    sumPos[b] += labels[i];
  }

  let ece = 0;
  const bins: ReliabilityBin[] = [];
  for (let b = 0; b < BIN_COUNT; b++) {
    const meanConfidence = count[b] > 0 ? sumConf[b] / count[b] : 0;
    const empiricalAccuracy = count[b] > 0 ? sumPos[b] / count[b] : 0;
    const gap = count[b] > 0 ? empiricalAccuracy - meanConfidence : 0;
    if (count[b] > 0) ece += (count[b] / n) * Math.abs(gap);
    bins.push({
      lo: b / BIN_COUNT,
      hi: (b + 1) / BIN_COUNT,
      count: count[b],
      meanConfidence,
      empiricalAccuracy,
      gap,
    });
  }
  return { bins, ece, n };
}

/**
 * AUC via the rank-sum (Mann-Whitney) formula with average ranks for ties.
 * Any strictly increasing rescaling of the scores leaves the ranking, and
 * therefore the AUC, unchanged.
 */
export function computeAuc(
  scores: number[],
  labels: ReadonlyArray<0 | 1>
): number {
  const n = scores.length;
  const idx = scores.map((_, i) => i).sort((a, b) => scores[a] - scores[b]);
  const ranks = new Array<number>(n).fill(0);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && scores[idx[j + 1]] === scores[idx[i]]) j++;
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[idx[k]] = avgRank;
    i = j + 1;
  }
  let nPos = 0;
  let nNeg = 0;
  let sumPosRanks = 0;
  for (let k = 0; k < n; k++) {
    if (labels[k] === 1) {
      nPos++;
      sumPosRanks += ranks[k];
    } else {
      nNeg++;
    }
  }
  if (nPos === 0 || nNeg === 0) return 0.5;
  return (sumPosRanks - (nPos * (nPos + 1)) / 2) / (nPos * nNeg);
}
