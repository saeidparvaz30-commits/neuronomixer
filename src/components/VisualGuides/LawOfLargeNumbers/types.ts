// Pure math for the Law of Large Numbers guide. No React in this file.

export type DistId = "die" | "coin" | "exponential" | "cauchy";

export const DIST_IDS: readonly DistId[] = [
  "die",
  "coin",
  "exponential",
  "cauchy",
] as const;

// ── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────
// Deterministic 32-bit generator, uniform in [0, 1). Every simulated draw in
// this guide flows through this so runs are reproducible from their seed.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic seed per (distribution, run index): FNV-1a over the id. */
export function seedFor(dist: string, runIndex: number): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < dist.length; i++) {
    h = Math.imul(h ^ dist.charCodeAt(i), 16777619) >>> 0;
  }
  return (h + runIndex * 7919) >>> 0;
}

// ── Distribution parameters (the model; every displayed mean derives here) ──

export const COIN_P = 0.3;
export const EXP_RATE = 1;
export const DIE_FACES = [1, 2, 3, 4, 5, 6] as const;

/** Mean of a fair die, computed from its faces: (1+2+...+6)/6 = 3.5 */
export const DIE_MEAN =
  DIE_FACES.reduce((a, b) => a + b, 0) / DIE_FACES.length;
/** Mean of a Bernoulli(p) draw is p itself. */
export const COIN_MEAN = COIN_P;
/** Mean of Exponential(rate) is 1/rate. */
export const EXP_MEAN = 1 / EXP_RATE;

export interface DistMeta {
  id: DistId;
  label: string;
  /** Stroke/accent color. May be a CSS var reference for semantic colors. */
  color: string;
  /** Population mean, or null when the mean is undefined (Cauchy). */
  trueMean: number | null;
  /** Percentile-clamp the chart y-axis (needed for Cauchy spikes). */
  clampAxis: boolean;
  description: string;
}

export const DIST_META: Record<DistId, DistMeta> = {
  die: {
    id: "die",
    label: "Fair die",
    color: "#3bb4a4",
    trueMean: DIE_MEAN,
    clampAxis: false,
    description:
      "Uniform on {1, 2, 3, 4, 5, 6}. Population mean is the face average.",
  },
  coin: {
    id: "coin",
    label: `Biased coin (p = ${COIN_P})`,
    color: "#a855f7",
    trueMean: COIN_MEAN,
    clampAxis: false,
    description:
      "Bernoulli draw: 1 with probability 0.3, else 0. Population mean equals p.",
  },
  exponential: {
    id: "exponential",
    label: "Skewed (exponential)",
    color: "#ec4899",
    trueMean: EXP_MEAN,
    clampAxis: false,
    description:
      "Exponential with rate 1 via inverse CDF. Heavily right-skewed, mean 1/rate.",
  },
  cauchy: {
    id: "cauchy",
    label: "Cauchy (no mean)",
    color: "var(--color-warning)",
    trueMean: null,
    clampAxis: true,
    description:
      "Standard Cauchy via the tangent transform. Tails so heavy the mean is undefined.",
  },
};

// ── Sampling (inverse-CDF / direct transforms of a uniform draw) ────────────

/**
 * Map one uniform u in [0, 1) to a draw from the chosen distribution.
 * - die:          floor(6u) + 1
 * - coin:         1 if u < p else 0
 * - exponential:  -ln(1 - u) / rate            (inverse CDF)
 * - cauchy:       tan(pi * (u - 1/2))          (inverse CDF of standard Cauchy,
 *                  u nudged into (1e-6, 1 - 1e-6) to keep draws finite)
 */
export function sampleDist(dist: DistId, u: number): number {
  switch (dist) {
    case "die":
      return Math.floor(u * 6) + 1;
    case "coin":
      return u < COIN_P ? 1 : 0;
    case "exponential":
      return -Math.log(1 - u) / EXP_RATE;
    case "cauchy": {
      const c = Math.min(Math.max(u, 1e-6), 1 - 1e-6);
      return Math.tan(Math.PI * (c - 0.5));
    }
  }
}

/** Regenerate the full draw sequence for a run from its seed. Deterministic. */
export function generateDraws(
  dist: DistId,
  seed: number,
  count: number
): number[] {
  const rng = mulberry32(seed);
  const out = new Array<number>(count);
  for (let i = 0; i < count; i++) out[i] = sampleDist(dist, rng());
  return out;
}

/** Prefix running means: out[i] = mean(draws[0..i]). */
export function runningMeans(draws: number[]): number[] {
  const out = new Array<number>(draws.length);
  let sum = 0;
  for (let i = 0; i < draws.length; i++) {
    sum += draws[i];
    out[i] = sum / (i + 1);
  }
  return out;
}

// ── Run bookkeeping ──────────────────────────────────────────────────────────

export interface RunSpec {
  seed: number;
  count: number;
}

export const MAX_RUNS = 5;
export const MAX_DRAWS_PER_RUN = 10000;

export function totalDraws(runs: RunSpec[]): number {
  return runs.reduce((a, r) => a + r.count, 0);
}

// ── Gambler's fallacy simulation (fair coin) ─────────────────────────────────

export const GAMBLER_FLIPS = 2000;
export const GAMBLER_BASE_SEED = 20260705;
export const STREAK_LEN = 5;

export interface GamblerSeries {
  n: number;
  headsTotal: number;
  /** proportions[i] = heads through flip i+1, divided by i+1 */
  proportions: number[];
  /** absDeviations[i] = |heads - (i+1)/2| through flip i+1 */
  absDeviations: number[];
  /** Times the flip right after a streak of >= STREAK_LEN heads was heads. */
  streakNextHeads: number;
  /** Number of flips that followed a streak of >= STREAK_LEN heads. */
  streakOpportunities: number;
}

/** Simulate n fair-coin flips from a seed; all series come from ONE run. */
export function computeGamblerSeries(seed: number, n: number): GamblerSeries {
  const rng = mulberry32(seed);
  const proportions = new Array<number>(n);
  const absDeviations = new Array<number>(n);
  let heads = 0;
  let streak = 0;
  let streakNextHeads = 0;
  let streakOpportunities = 0;
  for (let i = 0; i < n; i++) {
    const isHead = rng() < 0.5;
    if (streak >= STREAK_LEN) {
      streakOpportunities++;
      if (isHead) streakNextHeads++;
    }
    if (isHead) {
      heads++;
      streak++;
    } else {
      streak = 0;
    }
    proportions[i] = heads / (i + 1);
    absDeviations[i] = Math.abs(heads - (i + 1) / 2);
  }
  return {
    n,
    headsTotal: heads,
    proportions,
    absDeviations,
    streakNextHeads,
    streakOpportunities,
  };
}

// ── Formatting ───────────────────────────────────────────────────────────────

export function fmt(v: number, digits?: number): string {
  if (!Number.isFinite(v)) return "out of range";
  const d =
    digits ?? (Math.abs(v) >= 100 ? 1 : Math.abs(v) >= 10 ? 2 : 3);
  return v.toFixed(d);
}
