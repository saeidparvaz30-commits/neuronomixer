export type PopDist = "uniform" | "exponential" | "bimodal" | "custom";

export interface PopConfig {
  label: string;
  color: string;
  description: string;
  generate: () => number;
}

function expRand(): number {
  return -Math.log(1 - Math.random()) * 20 + 5;
}

function bimodalRand(): number {
  return Math.random() < 0.5
    ? gaussRand() * 5 + 25
    : gaussRand() * 5 + 75;
}

export function gaussRand(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const POPULATIONS: Record<PopDist, PopConfig> = {
  uniform: {
    label: "Uniform",
    color: "#22c55e",
    description: "All values equally likely between 0 and 100. Flat histogram, no center, no mode.",
    generate: () => Math.random() * 100,
  },
  exponential: {
    label: "Exponential",
    color: "#f97316",
    description: "Heavily right-skewed. Models time between events, wait times, radioactive decay.",
    generate: () => Math.min(expRand(), 100),
  },
  bimodal: {
    label: "Bimodal",
    color: "#ec4899",
    description: "Two peaks at 25 and 75. Could represent two sub-populations mixed together.",
    generate: () => Math.max(5, Math.min(95, bimodalRand())),
  },
  custom: {
    label: "Custom (Skewed)",
    color: "#8b5cf6",
    description: "Right-skewed with a sharp peak near zero and a long tail. Very non-normal.",
    generate: () => Math.min(Math.abs(gaussRand()) * 15 + 5, 95),
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
  if (data.length === 0) return { mean: 0, std: 0 };
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const std = Math.sqrt(data.reduce((a, v) => a + (v - mean) ** 2, 0) / data.length);
  return { mean, std };
}

export function sampleMean(popDist: PopDist, sampleSize: number): number {
  let sum = 0;
  const gen = POPULATIONS[popDist].generate;
  for (let i = 0; i < sampleSize; i++) sum += gen();
  return sum / sampleSize;
}
