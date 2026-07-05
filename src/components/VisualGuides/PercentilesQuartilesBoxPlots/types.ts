export type DatasetType = "test_scores" | "wait_times" | "sales_revenue";
export type StepType = 1 | 2 | 3 | 4 | 5;

export interface DatasetInfo {
  id: DatasetType;
  label: string;
  description: string;
  unit: string;
  data: number[];
}

export interface StatsResult {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  iqr: number;
  /** Tukey fences: the outlier cutoffs at Q1/Q3 ± 1.5×IQR */
  lowerFence: number;
  upperFence: number;
  /** Whisker ends: the most extreme data points still inside the fences */
  whiskerLower: number;
  whiskerUpper: number;
  mean: number;
  sd: number;
  outliers: number[];
  sorted: number[];
  n: number;
}

export interface State {
  selectedDataset: DatasetType;
  currentStep: StepType;
  showZScores: boolean;
  selectedPointIds: Set<number>;
  percentilePointsClicked: Set<number>;
  reachedFinalStep: boolean;
  toggledZScores: boolean;
}

export const STEP_LABELS: Record<StepType, string> = {
  1: "Raw Data",
  2: "Median",
  3: "Quartiles",
  4: "Whiskers",
  5: "Z-Scores",
};

export const DATASETS: DatasetInfo[] = [
  {
    id: "test_scores",
    label: "Student Test Scores",
    description: "n=50",
    unit: "score",
    data: [45,52,58,61,65,68,70,72,74,75,77,78,79,81,82,83,84,85,86,87,88,88,89,90,91,92,92,93,94,95,95,96,97,97,98,99,72,75,80,85,89,91,93,95,97,50,55,60,65,70],
  },
  {
    id: "wait_times",
    label: "Customer Wait Times (min)",
    description: "n=40",
    unit: "min",
    data: [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,32,34,36,38,40,42,44,45,45,45,45],
  },
  {
    id: "sales_revenue",
    label: "Daily Sales Revenue ($k)",
    description: "n=60",
    unit: "$k",
    data: [12,14,16,18,20,22,25,28,32,35,38,42,45,48,50,52,55,58,60,62,65,68,70,72,75,78,80,82,85,88,90,92,95,98,100,102,105,108,110,112,115,118,120,122,125,128,130,132,135,138,140,142,145,148,150,155,160,165,170,175],
  },
];

/** Linear-interpolation quantile (type 7, the default in NumPy/Excel/R) on sorted data */
function quantileSorted(sorted: number[], p: number): number {
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function calcStats(data: number[]): StatsResult {
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  const median = quantileSorted(sorted, 0.5);
  const q1 = quantileSorted(sorted, 0.25);
  const q3 = quantileSorted(sorted, 0.75);
  const iqr = q3 - q1;
  // Tukey fences are the OUTLIER CUTOFFS at Q1/Q3 ± 1.5×IQR ...
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  // ... while whiskers extend to the most extreme data points INSIDE the fences
  // (they are not drawn at the fences themselves).
  const inliers = sorted.filter((v) => v >= lowerFence && v <= upperFence);
  const whiskerLower = inliers[0];
  const whiskerUpper = inliers[inliers.length - 1];
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(sorted.reduce((s, x) => s + (x - mean) ** 2, 0) / n);
  const outliers = sorted.filter((v) => v < lowerFence || v > upperFence);
  return { min: sorted[0], q1, median, q3, max: sorted[n - 1], iqr, lowerFence, upperFence, whiskerLower, whiskerUpper, mean, sd, outliers, sorted, n };
}

/** Seeded pseudo-random for consistent jitter — lcg xorshift */
export function seededRandom(seed: number): number {
  let x = seed;
  x = ((x >> 16) ^ x) * 0x45d9f3b;
  x = ((x >> 16) ^ x) * 0x45d9f3b;
  x = (x >> 16) ^ x;
  return (x >>> 0) / 0xffffffff;
}
