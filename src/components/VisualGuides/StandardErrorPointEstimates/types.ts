export type EstimatorView = "bias" | "consistency" | "efficiency";

export interface PointEstimatesState {
  populationMean: number;         // 100 (hidden initially)
  populationSD: number;           // 20
  sampleSize: number;             // default 20
  sampleMeans: number[];          // array of sample means drawn
  sampleMedians: number[];        // for efficiency comparison
  populationMeanRevealed: boolean;
  currentEstimatorView: EstimatorView;
  sizeChanged: boolean;
  panelsViewed: Set<EstimatorView>;
}

// ── Math helpers ──────────────────────────────────────────────────────────────

export function gaussianRandom(mean: number, sd: number): number {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function drawSample(n: number, mean: number, sd: number): number[] {
  return Array.from({ length: n }, () => gaussianRandom(mean, sd));
}

export function computeMean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function computeMedian(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

export function computeSD(arr: number[]): number {
  const m = computeMean(arr);
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length);
}

export function computeSE(sd: number, n: number): number {
  return sd / Math.sqrt(n);
}

export function normalPDF(x: number, mu: number, sigma: number): number {
  return (
    Math.exp(-0.5 * ((x - mu) / sigma) ** 2) /
    (sigma * Math.sqrt(2 * Math.PI))
  );
}
