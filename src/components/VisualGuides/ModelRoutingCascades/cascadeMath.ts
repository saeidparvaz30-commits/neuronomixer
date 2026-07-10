// Pure simulation math for the Model Routing and Cascades guide.
// No React imports. Every number displayed in the guide is produced by a
// function in this file running over the seeded query stream, so a verifier
// can recompute all of them with node/tsx.

import {
  TierParams,
  QuerySample,
  RoutedQuery,
  SimResult,
  BaselineResult,
  FrontierPoint,
  N_QUERIES,
  STREAM_SEED,
  HARD_DIFFICULTY,
  SKILL_WIDTH,
  FRONTIER_STEP,
  WIN_TOLERANCE,
} from "./types";

// ── Seeded PRNG (LCG) ────────────────────────────────────────────────────────

export function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

// ── Query stream ─────────────────────────────────────────────────────────────

/**
 * Deterministic stream of queries. Difficulty is drawn from a fixed mixture:
 * 60% easy (0.05 to 0.40), 25% medium (0.40 to 0.70), 15% hard (0.70 to 0.98).
 * All randomness (difficulty, per-tier correctness draws, per-tier confidence
 * noise) is pre-drawn here, so changing tier parameters or the threshold
 * re-evaluates the SAME stream: the frontier is exact, not resampled.
 */
export function generateStream(
  n: number = N_QUERIES,
  seed: number = STREAM_SEED
): QuerySample[] {
  const rng = createRng(seed);
  const stream: QuerySample[] = [];
  for (let i = 0; i < n; i++) {
    const bucket = rng();
    const spread = rng();
    let difficulty: number;
    if (bucket < 0.6) difficulty = 0.05 + 0.35 * spread;
    else if (bucket < 0.85) difficulty = 0.4 + 0.3 * spread;
    else difficulty = 0.7 + 0.28 * spread;
    const correctU: [number, number, number] = [rng(), rng(), rng()];
    const confU: [number, number, number] = [rng(), rng(), rng()];
    stream.push({ difficulty, correctU, confU });
  }
  return stream;
}

// ── Model behavior ───────────────────────────────────────────────────────────

/**
 * Probability that a tier with the given capability midpoint answers a query
 * of the given difficulty correctly. Logistic in difficulty: 50% at
 * difficulty == skill, near 1 well below it, near 0 well above it.
 */
export function pCorrect(skill: number, difficulty: number): number {
  return 1 / (1 + Math.exp((difficulty - skill) / SKILL_WIDTH));
}

/**
 * Self-reported confidence of a tier on a query, with editable calibration.
 *
 *   confidence = clamp01(pTrue + GAIN * (1 - calibration) * (1 - pTrue) * noise)
 *
 * calibration = 1: perfectly calibrated, confidence equals the true
 * probability of being right. As calibration falls, confidence gets inflated
 * toward 1, and the inflation is largest exactly where the model is weakest
 * (the (1 - pTrue) factor): the classic overconfident small model. Confidence
 * never falls below pTrue, so miscalibration only ever ADDS false
 * acceptances; it never blocks answers the model was truly sure of. That is
 * what makes the failure silent: cost goes down, confidence stays high.
 */
export const OVERCONFIDENCE_GAIN = 2;

export function reportedConfidence(
  pTrue: number,
  noise: number,
  calibration: number
): number {
  return clamp01(pTrue + OVERCONFIDENCE_GAIN * (1 - calibration) * (1 - pTrue) * noise);
}

// ── Cascade simulation ───────────────────────────────────────────────────────

/**
 * Run the full cascade over the stream. Each query starts at tier 0; if the
 * tier's self-reported confidence clears the threshold its answer is accepted,
 * otherwise the query escalates and the next tier's cost is also paid. The
 * final tier always answers (no gate, so no confidence is recorded for it).
 */
export function simulateCascade(
  stream: readonly QuerySample[],
  tiers: readonly TierParams[],
  threshold: number,
  calibration: number
): SimResult {
  const routed: RoutedQuery[] = [];
  const last = tiers.length - 1;

  for (let i = 0; i < stream.length; i++) {
    const q = stream[i];
    let cost = 0;
    let answeredBy = last;
    let correct = false;
    let confidence: number | null = null;

    for (let t = 0; t < tiers.length; t++) {
      cost += tiers[t].cost;
      const p = pCorrect(tiers[t].skill, q.difficulty);
      const isCorrect = q.correctU[t] < p;
      if (t === last) {
        answeredBy = t;
        correct = isCorrect;
        confidence = null;
        break;
      }
      const conf = reportedConfidence(p, q.confU[t], calibration);
      if (conf >= threshold) {
        answeredBy = t;
        correct = isCorrect;
        confidence = conf;
        break;
      }
    }

    routed.push({ index: i, difficulty: q.difficulty, answeredBy, correct, cost, confidence });
  }

  const n = routed.length;
  const tierCounts = tiers.map((_, t) => routed.filter((r) => r.answeredBy === t).length);
  const tierAccuracy = tiers.map((_, t) => {
    const rows = routed.filter((r) => r.answeredBy === t);
    if (rows.length === 0) return null;
    return rows.filter((r) => r.correct).length / rows.length;
  });

  const gateAccepted = routed.filter((r) => r.confidence !== null);
  const dashboardConfidence =
    gateAccepted.length === 0
      ? null
      : gateAccepted.reduce((s, r) => s + (r.confidence as number), 0) / gateAccepted.length;
  const gateAcceptedAccuracy =
    gateAccepted.length === 0
      ? null
      : gateAccepted.filter((r) => r.correct).length / gateAccepted.length;

  const hardAtSmall = routed.filter(
    (r) => r.answeredBy === 0 && r.difficulty >= HARD_DIFFICULTY
  );
  const hardAtSmallAccuracy =
    hardAtSmall.length === 0
      ? null
      : hardAtSmall.filter((r) => r.correct).length / hardAtSmall.length;

  return {
    routed,
    avgCost: routed.reduce((s, r) => s + r.cost, 0) / n,
    accuracy: routed.filter((r) => r.correct).length / n,
    tierCounts,
    tierAccuracy,
    dashboardConfidence,
    gateAcceptedCount: gateAccepted.length,
    gateAcceptedAccuracy,
    hardAtSmallCount: hardAtSmall.length,
    hardAtSmallAccuracy,
  };
}

/**
 * Baseline: send every query straight to one tier (no cascade, no gate).
 * Uses that tier's own pre-drawn correctness uniforms, so "always Large"
 * agrees exactly with what the cascade's final tier would have scored.
 */
export function simulateAlways(
  stream: readonly QuerySample[],
  tiers: readonly TierParams[],
  tierIndex: number
): BaselineResult {
  const tier = tiers[tierIndex];
  let correctCount = 0;
  for (const q of stream) {
    const p = pCorrect(tier.skill, q.difficulty);
    if (q.correctU[tierIndex] < p) correctCount++;
  }
  return { avgCost: tier.cost, accuracy: correctCount / stream.length };
}

// ── Cost-quality frontier ────────────────────────────────────────────────────

/**
 * Sweep the escalation threshold across [0, 1] and evaluate the cascade at
 * each value on the SAME stream. Every frontier point is an exact evaluation,
 * not an approximation.
 */
export function computeFrontier(
  stream: readonly QuerySample[],
  tiers: readonly TierParams[],
  calibration: number,
  step: number = FRONTIER_STEP
): FrontierPoint[] {
  const points: FrontierPoint[] = [];
  const steps = Math.round(1 / step);
  for (let k = 0; k <= steps; k++) {
    const threshold = k * step;
    const sim = simulateCascade(stream, tiers, threshold, calibration);
    points.push({ threshold, avgCost: sim.avgCost, accuracy: sim.accuracy });
  }
  return points;
}

/** Does this operating point beat always-big: cheaper AND within tolerance on quality? */
export function beatsAlwaysBig(
  point: { avgCost: number; accuracy: number },
  big: BaselineResult,
  tolerance: number = WIN_TOLERANCE
): boolean {
  return point.avgCost < big.avgCost && point.accuracy >= big.accuracy - tolerance;
}
