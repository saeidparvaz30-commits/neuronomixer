// Pure simulation math for the "Reading Benchmarks Critically" guide.
// No React imports. Every number displayed on the page is computed by a
// function in this file, so a verifier can recompute each figure by
// executing these functions with node/tsx.
//
// The simulation: each synthetic model has a defined true skill (ground
// truth we set, not a claim about any real model). A benchmark is a set of
// items with difficulties. Item-level correctness is generated with a
// seeded PRNG (common random numbers per item, so scores are monotone in
// skill). Contamination leaks a fraction of the PUBLIC items into the
// model's training set: leaked items become memorized and always score
// correct. The private held-out set can never leak.

export interface BenchmarkItem {
  id: string;
  difficulty: number; // 0..1, higher is harder
}

export interface SimModel {
  id: string;
  name: string;
  /** Ground-truth skill we defined for this synthetic model (0..1). */
  trueSkill: number;
  /** Fraction of the public test set leaked into this model's training data. */
  contamination: number;
  /** Per-model PRNG seed for its item outcomes. */
  seed: number;
}

// ── Seeded PRNG ──────────────────────────────────────────────────────────────

/** Deterministic mulberry32 PRNG. Same seed, same sequence, every run. */
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

export function seededUniforms(count: number, seed: number): number[] {
  const rng = mulberry32(seed);
  return Array.from({ length: count }, () => rng());
}

/** Deterministic Fisher-Yates shuffle of [0..count-1]. */
export function seededShuffle(count: number, seed: number): number[] {
  const rng = mulberry32(seed);
  const idx = Array.from({ length: count }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = idx[i];
    idx[i] = idx[j];
    idx[j] = tmp;
  }
  return idx;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** Round a 0..1 fraction to one-decimal percentage points. */
export function toPct(fraction: number): number {
  return Math.round(fraction * 1000) / 10;
}

// ── Benchmark item sets ──────────────────────────────────────────────────────

export function generateItems(
  count: number,
  seed: number,
  minDifficulty: number,
  maxDifficulty: number,
  idPrefix: string
): BenchmarkItem[] {
  const u = seededUniforms(count, seed);
  return u.map((x, i) => ({
    id: `${idPrefix}${i + 1}`,
    difficulty: minDifficulty + x * (maxDifficulty - minDifficulty),
  }));
}

export const N_PUBLIC = 120;
export const N_PRIVATE = 120;

/** The public benchmark: the one leaderboards report. Can leak. */
export const PUBLIC_ITEMS: readonly BenchmarkItem[] = generateItems(
  N_PUBLIC,
  11,
  0.05,
  0.95,
  "pub-"
);

/** The private held-out set: same difficulty range, never leaks. */
export const PRIVATE_ITEMS: readonly BenchmarkItem[] = generateItems(
  N_PRIVATE,
  22,
  0.05,
  0.95,
  "priv-"
);

/**
 * Which public items leak first as contamination rises. A fixed seeded
 * order shared by all models, so the leaked set at contamination c is
 * always the first round(c * N_PUBLIC) indices of this permutation.
 */
export const LEAK_ORDER: readonly number[] = seededShuffle(N_PUBLIC, 77);

// ── Item outcome model ───────────────────────────────────────────────────────

const SLOPE = 8;

/** Probability a model of given skill answers an item of given difficulty. */
export function pCorrect(skill: number, difficulty: number): number {
  return 1 / (1 + Math.exp(-SLOPE * (skill - difficulty)));
}

/**
 * Item-level correctness for one model on one item set, WITHOUT any
 * contamination. Uses common random numbers per item (one uniform draw per
 * item from the seed), so raising skill never flips a correct answer to
 * wrong.
 */
export function itemOutcomes(
  skill: number,
  items: readonly BenchmarkItem[],
  seed: number
): boolean[] {
  const u = seededUniforms(items.length, seed);
  return items.map((item, i) => u[i] < pCorrect(skill, item.difficulty));
}

/** Number of public items leaked at a given contamination fraction. */
export function leakedCount(contamination: number): number {
  return Math.round(clamp01(contamination) * N_PUBLIC);
}

/**
 * Contamination flips leaked public items to memorized-correct. The model
 * saw those exact items in training, so it repeats the answer regardless
 * of skill. Non-leaked items keep their genuine outcome.
 */
export function applyContamination(
  outcomes: readonly boolean[],
  contamination: number
): boolean[] {
  const flipped = [...outcomes];
  const n = leakedCount(contamination);
  for (let k = 0; k < n; k++) {
    flipped[LEAK_ORDER[k]] = true;
  }
  return flipped;
}

export function fractionCorrect(outcomes: readonly boolean[]): number {
  if (outcomes.length === 0) return 0;
  let correct = 0;
  for (const o of outcomes) if (o) correct++;
  return correct / outcomes.length;
}

// ── Scores ───────────────────────────────────────────────────────────────────

/** Measured public (leaderboard) score at a given contamination level. */
export function publicScore(
  skill: number,
  contamination: number,
  seed: number
): number {
  return fractionCorrect(
    applyContamination(itemOutcomes(skill, PUBLIC_ITEMS, seed), contamination)
  );
}

/** Measured private held-out score. Contamination cannot touch it. */
export function privateScore(skill: number, seed: number): number {
  return fractionCorrect(itemOutcomes(skill, PRIVATE_ITEMS, seed + 1));
}

export interface ScoreSummary {
  publicPct: number;
  privatePct: number;
  /** publicPct minus privatePct, in points. */
  gapPts: number;
  leaked: number;
}

export function scoreSummary(
  skill: number,
  contamination: number,
  seed: number
): ScoreSummary {
  const publicPct = toPct(publicScore(skill, contamination, seed));
  const privatePct = toPct(privateScore(skill, seed));
  return {
    publicPct,
    privatePct,
    gapPts: Math.round((publicPct - privatePct) * 10) / 10,
    leaked: leakedCount(contamination),
  };
}

/** Public score across the whole contamination range, for the chart line. */
export function contaminationCurve(
  skill: number,
  seed: number,
  steps = 20
): { c: number; publicPct: number }[] {
  const points: { c: number; publicPct: number }[] = [];
  for (let s = 0; s <= steps; s++) {
    const c = s / steps;
    points.push({ c, publicPct: toPct(publicScore(skill, c, seed)) });
  }
  return points;
}

// ── The contamination lab's focus model ──────────────────────────────────────

export const LAB_MODEL_SEED = 5;
export const DEFAULT_LAB_SKILL = 0.68;

// ── The simulated leaderboard ────────────────────────────────────────────────

/**
 * Four synthetic models. Names are invented; trueSkill and contamination
 * are ground-truth parameters we defined, not claims about real systems.
 */
export const LEADERBOARD_MODELS: readonly SimModel[] = [
  { id: "petrel", name: "Petrel-X", trueSkill: 0.66, contamination: 0.7, seed: 101 },
  { id: "corvid", name: "Corvid-1", trueSkill: 0.62, contamination: 0.55, seed: 102 },
  { id: "halcyon", name: "Halcyon-3", trueSkill: 0.78, contamination: 0.0, seed: 103 },
  { id: "lyra", name: "Lyra-Mini", trueSkill: 0.7, contamination: 0.1, seed: 104 },
];

export interface LeaderboardRow {
  model: SimModel;
  publicPct: number;
  privatePct: number;
  gapPts: number;
  publicRank: number;
  privateRank: number;
}

/** Full leaderboard, sorted by public score (what a leaderboard shows). */
export function leaderboardRows(): LeaderboardRow[] {
  const scored = LEADERBOARD_MODELS.map((model) => {
    const publicPct = toPct(
      publicScore(model.trueSkill, model.contamination, model.seed)
    );
    const privatePct = toPct(privateScore(model.trueSkill, model.seed));
    return {
      model,
      publicPct,
      privatePct,
      gapPts: Math.round((publicPct - privatePct) * 10) / 10,
    };
  });
  const byPublic = [...scored].sort((a, b) => b.publicPct - a.publicPct);
  const byPrivate = [...scored].sort((a, b) => b.privatePct - a.privatePct);
  return byPublic.map((row) => ({
    ...row,
    publicRank: byPublic.findIndex((r) => r.model.id === row.model.id) + 1,
    privateRank: byPrivate.findIndex((r) => r.model.id === row.model.id) + 1,
  }));
}

// ── Saturation demo ──────────────────────────────────────────────────────────

export type BenchmarkMix = "legacy" | "frontier";

/** A saturated legacy benchmark: items far too easy for these models. */
export const LEGACY_ITEMS: readonly BenchmarkItem[] = generateItems(
  120,
  33,
  0.02,
  0.35,
  "leg-"
);

/** A frontier benchmark: items that overlap the models' skill range. */
export const FRONTIER_ITEMS: readonly BenchmarkItem[] = generateItems(
  120,
  44,
  0.35,
  0.98,
  "fro-"
);

export interface SaturationScore {
  modelId: string;
  name: string;
  pct: number;
}

/**
 * Clean scores (zero contamination) of all leaderboard models on the
 * chosen item mix. Seeds are offset per mix so the two benchmarks use
 * independent draws.
 */
export function saturationScores(mix: BenchmarkMix): SaturationScore[] {
  const items = mix === "legacy" ? LEGACY_ITEMS : FRONTIER_ITEMS;
  const offset = mix === "legacy" ? 1000 : 2000;
  return LEADERBOARD_MODELS.map((m) => ({
    modelId: m.id,
    name: m.name,
    pct: toPct(fractionCorrect(itemOutcomes(m.trueSkill, items, m.seed + offset))),
  })).sort((a, b) => b.pct - a.pct);
}

/** Top score minus bottom score on a mix, in points. */
export function saturationSpread(mix: BenchmarkMix): number {
  const scores = saturationScores(mix).map((s) => s.pct);
  return Math.round((Math.max(...scores) - Math.min(...scores)) * 10) / 10;
}

// ── Selection effects: rerun the same model, report the best ────────────────

export const RERUN_SKILL = 0.7;
export const RERUN_SEEDS: readonly number[] = [
  301, 302, 303, 304, 305, 306, 307, 308,
];

/**
 * Eight clean public-set evaluations of ONE model with identical true
 * skill, differing only in the random draw (sampling noise). Reporting the
 * best run instead of the mean is a selection effect: free points from
 * noise.
 */
export function rerunScores(): number[] {
  return RERUN_SEEDS.map((seed) => toPct(publicScore(RERUN_SKILL, 0, seed)));
}

export interface RerunSummary {
  runsPct: number[];
  meanPct: number;
  bestPct: number;
  liftPts: number;
}

export function rerunSummary(): RerunSummary {
  const runsPct = rerunScores();
  const meanPct =
    Math.round((runsPct.reduce((a, b) => a + b, 0) / runsPct.length) * 10) / 10;
  const bestPct = Math.max(...runsPct);
  return {
    runsPct,
    meanPct,
    bestPct,
    liftPts: Math.round((bestPct - meanPct) * 10) / 10,
  };
}
