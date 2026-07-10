/**
 * Pure math for the pass@k vs pass^k reliability lab.
 * No React imports. A verifier can recompute every plotted point and readout
 * by executing these functions with node/tsx.
 *
 * Model: a task has a fixed per-attempt success probability p, attempts are
 * independent. Then:
 *   pass@k  = P(at least one success in k attempts) = 1 - (1 - p)^k
 *   pass^k  = P(all k attempts succeed)             = p^k
 */

export const K_MAX = 12;
export const N_SETS = 200;

/** Deterministic seeded PRNG (mulberry32). Never Math.random in guide code. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic seed derived from p, so the simulation is reproducible. */
export function seedFromP(p: number): number {
  return 7919 + Math.round(p * 1000);
}

/** Exact analytic curve: 1 - (1 - p)^k. */
export function analyticPassAtK(p: number, k: number): number {
  return 1 - Math.pow(1 - p, k);
}

/** Exact analytic curve: p^k. */
export function analyticPassPowK(p: number, k: number): number {
  return Math.pow(p, k);
}

/**
 * Simulate nSets independent task sets, each with kMax Bernoulli(p) attempts.
 * matrix[set][attempt] = true if that attempt succeeded.
 */
export function simulateTrialMatrix(
  p: number,
  nSets: number = N_SETS,
  kMax: number = K_MAX,
  seed: number = seedFromP(p)
): boolean[][] {
  const rng = mulberry32(seed);
  const matrix: boolean[][] = [];
  for (let s = 0; s < nSets; s++) {
    const row: boolean[] = [];
    for (let t = 0; t < kMax; t++) {
      row.push(rng() < p);
    }
    matrix.push(row);
  }
  return matrix;
}

/** Fraction of simulated sets with at least one success in the first k attempts. */
export function empiricalPassAtK(
  matrix: readonly (readonly boolean[])[],
  k: number
): number {
  if (matrix.length === 0) return 0;
  let hits = 0;
  for (const row of matrix) {
    for (let i = 0; i < k; i++) {
      if (row[i]) {
        hits++;
        break;
      }
    }
  }
  return hits / matrix.length;
}

/** Fraction of simulated sets where all of the first k attempts succeeded. */
export function empiricalPassPowK(
  matrix: readonly (readonly boolean[])[],
  k: number
): number {
  if (matrix.length === 0) return 0;
  let hits = 0;
  for (const row of matrix) {
    let all = true;
    for (let i = 0; i < k; i++) {
      if (!row[i]) {
        all = false;
        break;
      }
    }
    if (all) hits++;
  }
  return hits / matrix.length;
}

export interface CurvePoint {
  k: number;
  analyticAtK: number;
  analyticPowK: number;
  empiricalAtK: number;
  empiricalPowK: number;
}

/**
 * One point per integer k: the exact analytic values overlaid with the
 * empirical frequencies from the seeded simulation.
 */
export function buildCurves(
  p: number,
  nSets: number = N_SETS,
  kMax: number = K_MAX
): CurvePoint[] {
  const matrix = simulateTrialMatrix(p, nSets, kMax);
  const points: CurvePoint[] = [];
  for (let k = 1; k <= kMax; k++) {
    points.push({
      k,
      analyticAtK: analyticPassAtK(p, k),
      analyticPowK: analyticPassPowK(p, k),
      empiricalAtK: empiricalPassAtK(matrix, k),
      empiricalPowK: empiricalPassPowK(matrix, k),
    });
  }
  return points;
}
