import type { DataPoint, ComputedStats } from "./types";

export function computeMean(data: number[]): number {
  if (data.length === 0) return 0;
  return data.reduce((a, b) => a + b, 0) / data.length;
}

export function computeMedian(data: number[]): number {
  if (data.length === 0) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function computeMode(data: number[]): number[] | null {
  if (data.length === 0) return null;
  const freq: Record<number, number> = {};
  for (const v of data) freq[v] = (freq[v] ?? 0) + 1;
  const maxFreq = Math.max(...Object.values(freq));
  if (maxFreq === 1) return null; // all unique
  return Object.entries(freq)
    .filter(([, f]) => f === maxFreq)
    .map(([v]) => Number(v))
    .sort((a, b) => a - b);
}

export function computeVariance(data: number[], mean: number): number {
  if (data.length === 0) return 0;
  return data.reduce((sum, x) => sum + (x - mean) ** 2, 0) / data.length;
}

export function computeQuantile(sorted: number[], p: number): number {
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

export function computeIQR(data: number[]): {
  iqr: number;
  q1: number;
  q3: number;
} {
  if (data.length < 4) return { iqr: 0, q1: 0, q3: 0 };
  const sorted = [...data].sort((a, b) => a - b);
  const q1 = computeQuantile(sorted, 0.25);
  const q3 = computeQuantile(sorted, 0.75);
  return { iqr: q3 - q1, q1, q3 };
}

export function computeTrimmedMean(data: number[], fraction: number): number {
  if (data.length === 0) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const cut = Math.round(sorted.length * fraction);
  const trimmed = sorted.slice(cut, sorted.length - cut);
  if (trimmed.length === 0) return computeMean(sorted);
  return computeMean(trimmed);
}

export function computeMAD(data: number[], median: number): number {
  if (data.length === 0) return 0;
  const deviations = data.map((x) => Math.abs(x - median));
  return computeMedian(deviations);
}

export function computeAllStats(dataPoints: DataPoint[]): ComputedStats {
  const values = dataPoints.map((p) => p.value);
  const sorted = [...values].sort((a, b) => a - b);

  const mean = computeMean(values);
  const median = computeMedian(values);
  const mode = computeMode(values);
  const variance = computeVariance(values, mean);
  const stdDev = Math.sqrt(variance);
  const { iqr, q1, q3 } = computeIQR(values);
  const trimmedMean = computeTrimmedMean(values, 0.1);
  const mad = computeMAD(values, median);
  const min = sorted[0] ?? 0;
  const max = sorted[sorted.length - 1] ?? 0;

  return {
    mean,
    median,
    mode,
    range: max - min,
    variance,
    stdDev,
    iqr,
    q1,
    q3,
    trimmedMean,
    mad,
    min,
    max,
  };
}
