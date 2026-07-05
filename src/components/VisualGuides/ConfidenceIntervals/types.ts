export type ConfidenceLevel = 90 | 95 | 99;

export interface ConfidenceInterval {
  sampleId: number;
  mean: number;
  sd: number;
  lower: number;
  upper: number;
  containsTruth: boolean;
  sampleData: number[];
}

export interface SimulationState {
  confidenceLevel: ConfidenceLevel;
  intervals: ConfidenceInterval[];
  trueParameter: number; // 100
  expandedSampleId: number | null;
  totalIntervalsGenerated: number;
  samplesExplored: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const TRUE_MEAN = 100;
export const TRUE_SD = 15;
export const SAMPLE_N = 30;

// Two-sided t critical values for df = n - 1 = 29 (correct for a mean CI with
// unknown population SD at n = 30; using z here would give ~93.6% true coverage)
export const T_SCORES: Record<ConfidenceLevel, number> = {
  90: 1.699,
  95: 2.045,
  99: 2.756,
};

// ── Math helpers ──────────────────────────────────────────────────────────────

function gaussianRandom(mean: number, sd: number): number {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function generateSample(n: number): number[] {
  return Array.from({ length: n }, () => gaussianRandom(TRUE_MEAN, TRUE_SD));
}

function computeMean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Sample SD with Bessel's correction (n - 1 divisor), matching the "Sample SD (s)" label
function computeSD(arr: number[]): number {
  const m = computeMean(arr);
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1));
}

export function run100Experiments(cl: ConfidenceLevel): ConfidenceInterval[] {
  const t = T_SCORES[cl];
  return Array.from({ length: 100 }, (_, i) => {
    const sample = generateSample(SAMPLE_N);
    const mean = computeMean(sample);
    const sd = computeSD(sample);
    const se = sd / Math.sqrt(SAMPLE_N);
    const me = t * se;
    return {
      sampleId: i + 1,
      mean,
      sd,
      lower: mean - me,
      upper: mean + me,
      containsTruth: mean - me <= TRUE_MEAN && TRUE_MEAN <= mean + me,
      sampleData: sample,
    };
  });
}
