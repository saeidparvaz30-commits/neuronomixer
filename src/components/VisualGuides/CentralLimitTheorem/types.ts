export type DistributionType = "normal" | "uniform" | "skewed" | "bimodal";

export interface SimulationState {
  selectedDistribution: DistributionType;
  populationData: number[];
  sampleSize: number;
  sampleMeans: number[];
  isRunning: boolean;
}

// ── Math helpers ──────────────────────────────────────────────────────────────

export function gaussianRandom(mean = 0, sd = 1, rnd: () => number = Math.random): number {
  let u = 0, v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Seeded PRNG: the population must be identical between the prerendered HTML
// and the client render, or React reports a hydration text mismatch (#418).
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POPULATION_SEEDS: Record<DistributionType, number> = {
  normal: 0x51a7,
  uniform: 0xb01d,
  skewed: 0x5eed,
  bimodal: 0xcafe,
};

export function generatePopulation(type: DistributionType, n = 500): number[] {
  const rnd = mulberry32(POPULATION_SEEDS[type]);
  switch (type) {
    case "normal":
      return Array.from({ length: n }, () => gaussianRandom(50, 15, rnd));
    case "uniform":
      return Array.from({ length: n }, () => rnd() * 100);
    case "skewed":
      return Array.from({ length: n }, () =>
        Math.min(100, -Math.log(rnd() + 1e-10) * 20 + 5)
      );
    case "bimodal":
      return Array.from({ length: n }, (_, i) =>
        i < n / 2 ? gaussianRandom(30, 8, rnd) : gaussianRandom(70, 8, rnd)
      );
  }
}

export function drawSample(population: number[], n: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < n; i++) {
    result.push(population[Math.floor(Math.random() * population.length)]);
  }
  return result;
}

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function stdDev(arr: number[]): number {
  if (arr.length === 0) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length);
}

export function normalPDF(x: number, mu: number, sigma: number): number {
  if (sigma === 0) return 0;
  return (
    Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI))
  );
}

// ── Histogram binning ─────────────────────────────────────────────────────────

export interface HistBin {
  lo: number;
  hi: number;
  count: number;
  /** Normalised height (0–1) */
  height: number;
}

export function computeBins(
  data: number[],
  binCount: number,
  fixedMin?: number,
  fixedMax?: number
): HistBin[] {
  if (data.length === 0) return [];
  const lo = fixedMin ?? Math.min(...data);
  const hi = fixedMax ?? Math.max(...data);
  const range = hi - lo || 1;
  const width = range / binCount;
  const bins: HistBin[] = Array.from({ length: binCount }, (_, i) => ({
    lo: lo + i * width,
    hi: lo + (i + 1) * width,
    count: 0,
    height: 0,
  }));
  for (const v of data) {
    let idx = Math.floor((v - lo) / width);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count++;
  }
  const maxCount = Math.max(...bins.map((b) => b.count), 1);
  for (const b of bins) b.height = b.count / maxCount;
  return bins;
}
