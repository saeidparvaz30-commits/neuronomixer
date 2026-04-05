export type DistType = "normal" | "uniform" | "skewed-right" | "skewed-left" | "bimodal";

export interface DistConfig {
  label: string;
  color: string;
  description: string;
  mean: string;
  median: string;
  mode: string;
  realWorld: string;
  generate: (n: number) => number[];
}

// Box-Muller transform
function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Deterministic seeded values for reproducibility
function seeded(seed: number): number {
  const s = Math.sin(seed * 9301 + 49297) * 233280;
  return s - Math.floor(s);
}

export const DISTRIBUTIONS: Record<DistType, DistConfig> = {
  normal: {
    label: "Normal",
    color: "#3b82f6",
    description: "The bell curve. Symmetric, with data clustering around the mean. Describes natural measurements like height, IQ, and measurement error.",
    mean: "= Median = Mode",
    median: "Center of distribution",
    mode: "Peak of bell",
    realWorld: "Human heights, test scores, measurement error, blood pressure",
    generate: (n) => Array.from({ length: n }, () => randn() * 15 + 50),
  },
  uniform: {
    label: "Uniform",
    color: "#22c55e",
    description: "Every value in a range is equally likely. No peaks or clusters — a perfectly flat distribution. Rare in nature, common in random number generators.",
    mean: "= Median",
    median: "Midpoint of range",
    mode: "No unique mode",
    realWorld: "Fair dice rolls, random number generators, uniform sampling",
    generate: (n) => Array.from({ length: n }, (_, i) => seeded(i * 7 + 1) * 100),
  },
  "skewed-right": {
    label: "Right-Skewed",
    color: "#f97316",
    description: "Long tail to the right. Most values are small, but a few extreme large values pull the mean above the median. Common in income and wealth data.",
    mean: "> Median > Mode",
    median: "Below mean",
    mode: "Leftmost peak",
    realWorld: "Income, house prices, reaction times, city populations",
    generate: (n) => Array.from({ length: n }, () => {
      const v = -Math.log(1 - Math.random()) * 12 + 5;
      return Math.min(v, 95);
    }),
  },
  "skewed-left": {
    label: "Left-Skewed",
    color: "#8b5cf6",
    description: "Long tail to the left. Most values cluster near the high end, with a few very low values pulling the mean down. Common in exam scores near a ceiling.",
    mean: "< Median < Mode",
    median: "Above mean",
    mode: "Rightmost peak",
    realWorld: "Age at death, exam scores with ceiling, failure times",
    generate: (n) => Array.from({ length: n }, () => {
      const v = 100 - (-Math.log(1 - Math.random()) * 12 + 5);
      return Math.max(v, 5);
    }),
  },
  bimodal: {
    label: "Bimodal",
    color: "#ec4899",
    description: "Two distinct peaks. Often signals two underlying sub-populations in the data — like combining heights of men and women into one dataset.",
    mean: "Between peaks",
    median: "Between peaks",
    mode: "Two modes",
    realWorld: "Mixed gender heights, exam scores (studied vs. didn't), commute times",
    generate: (n) => Array.from({ length: n }, (_, i) =>
      i % 2 === 0 ? randn() * 8 + 35 : randn() * 8 + 65
    ),
  },
};

export interface HistBin {
  lo: number;
  hi: number;
  count: number;
}

export function computeHistogram(data: number[], bins: number): HistBin[] {
  if (data.length === 0) return [];
  const min = Math.min(...data), max = Math.max(...data);
  const width = (max - min) / bins || 1;
  const result: HistBin[] = Array.from({ length: bins }, (_, i) => ({
    lo: min + i * width,
    hi: min + (i + 1) * width,
    count: 0,
  }));
  data.forEach(v => {
    let b = Math.floor((v - min) / width);
    if (b >= bins) b = bins - 1;
    result[b].count++;
  });
  return result;
}

export function computeStats(data: number[]) {
  if (data.length === 0) return { mean: 0, median: 0, mode: 0, std: 0, q1: 0, q3: 0 };
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = data.reduce((a, b) => a + b, 0) / n;
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const std = Math.sqrt(data.reduce((a, v) => a + (v - mean) ** 2, 0) / n);

  // Mode via histogram
  const bins = computeHistogram(data, 20);
  const maxBin = bins.reduce((a, b) => b.count > a.count ? b : a, bins[0]);
  const mode = (maxBin.lo + maxBin.hi) / 2;

  return { mean, median, mode, std, q1, q3 };
}
