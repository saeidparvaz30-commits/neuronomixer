import type { Distribution, TrainingPoint } from "./types";

// Linear Congruential Generator — deterministic pseudo-random
function lcg(seed: number): () => number {
  let s = seed;
  return () => {
    s = (1664525 * s + 1013904223) & 0xffffffff;
    return ((s >>> 0) / 0xffffffff);
  };
}

// Generate 20 values sampled from a normal distribution with given mean/std
function sampleNormal(mean: number, std: number, seed: number): number[] {
  const rand = lcg(seed);
  const result: number[] = [];
  for (let i = 0; i < 20; i++) {
    // Box-Muller transform (deterministic via LCG)
    const u1 = rand();
    const u2 = rand();
    const z = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
    result.push(mean + std * z);
  }
  return result;
}

function computeMean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function computeStd(values: number[], mean: number): number {
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// Without BN: each layer distribution drifts (internal covariate shift)
const WITHOUT_BN_PARAMS = [
  { mean: 0.5,  std: 0.3,  seed: 11 },
  { mean: 1.2,  std: 0.8,  seed: 22 },
  { mean: -0.3, std: 1.5,  seed: 33 },
  { mean: 2.1,  std: 2.0,  seed: 44 },
];

// With BN: all layers normalized to ~N(0,1)
const WITH_BN_PARAMS = [
  { mean: 0.02,  std: 0.98, seed: 55 },
  { mean: -0.01, std: 1.02, seed: 66 },
  { mean: 0.03,  std: 0.97, seed: 77 },
  { mean: -0.02, std: 1.01, seed: 88 },
];

export function generateDistributions(withBN: boolean): Distribution[] {
  const params = withBN ? WITH_BN_PARAMS : WITHOUT_BN_PARAMS;
  return params.map((p, i) => {
    const values = sampleNormal(p.mean, p.std, p.seed);
    const mean = computeMean(values);
    const std = computeStd(values, mean);
    return { values, mean, std, layer: i + 1 };
  });
}

// BN formula applied step by step
export function computeBatchNorm(values: number[]): {
  mean: number;
  variance: number;
  normalized: number[];
  gamma: number;
  beta: number;
  output: number[];
} {
  const eps = 1e-5;
  const gamma = 1.0;
  const beta = 0.0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  const normalized = values.map((x) => (x - mean) / Math.sqrt(variance + eps));
  const output = normalized.map((xHat) => gamma * xHat + beta);

  return { mean, variance, normalized, gamma, beta, output };
}

// Pre-computed deterministic training curves
export const TRAINING_CURVES: TrainingPoint[] = Array.from({ length: 20 }, (_, i) => ({
  epoch: i + 1,
  withBN: 0.9 * Math.pow(0.82, i),
  withoutBN: 0.9 * Math.pow(0.90, i),
}));
