import { CANONICAL_PATH, PATH_LENGTH, Strictness, VOCAB, VOCAB_SIZE } from "./types";
import { allowedTokenIds, classifySequence, firstIllegalPosition, isLegalToken, Outcome } from "./grammar";

/**
 * Simulated token generator + batch runner. All randomness flows through a
 * seeded mulberry32 PRNG so every displayed empirical number is reproducible
 * by re-running these functions with the same arguments.
 *
 * Generator model, per step:
 *   with probability (1 - errorRate) it emits the intended token for the
 *   current grammar position; with probability errorRate it gets distracted
 *   and emits a uniformly random token from the full vocabulary (which may
 *   happen to be grammar-legal).
 *
 * Constrained decoding = rejection sampling against the grammar mask: any
 * draw that is not in allowedTokenIds(pos) is masked and the generator draws
 * again from the same distribution. Rejection sampling from a restricted
 * support IS the renormalized distribution, so the analytic formulas below
 * match the empirical rates exactly (up to sampling noise).
 */

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

/** Deterministic seed from the current settings, so identical settings replay identically. */
export function settingsSeed(
  errorRatePct: number,
  strictness: Strictness,
  constrained: boolean,
  salt: number
): number {
  const sIdx = strictness === "loose" ? 1 : strictness === "typed" ? 2 : 3;
  return (
    (Math.round(errorRatePct * 100) * 92821 +
      sIdx * 7919 +
      (constrained ? 104729 : 0) +
      salt * 15485863) >>>
    0
  );
}

export interface StepTrace {
  pos: number;
  intendedId: string;
  /** Raw draws rejected by the grammar mask before a legal token came out (constrained only). */
  maskedIds: string[];
  emittedId: string;
  legal: boolean;
}

export interface GenerationTrace {
  steps: StepTrace[];
  ids: string[];
  outcome: Outcome;
  firstIllegalPos: number | null;
}

const MAX_MASK_REJECTIONS = 1000;

export function sampleGeneration(
  rng: () => number,
  errorRate: number,
  strictness: Strictness,
  constrained: boolean
): GenerationTrace {
  const steps: StepTrace[] = [];
  const ids: string[] = [];

  for (let pos = 0; pos < PATH_LENGTH; pos++) {
    const intendedId = CANONICAL_PATH[pos];
    const draw = (): string =>
      rng() < errorRate ? VOCAB[Math.floor(rng() * VOCAB_SIZE)].id : intendedId;

    let emittedId = draw();
    const maskedIds: string[] = [];

    if (constrained) {
      let guard = 0;
      while (!isLegalToken(pos, emittedId, strictness) && guard < MAX_MASK_REJECTIONS) {
        maskedIds.push(emittedId);
        emittedId = draw();
        guard++;
      }
      // The intended token is always legal, so the loop terminates with
      // probability 1; the guard only bounds the theoretical worst case.
      if (!isLegalToken(pos, emittedId, strictness)) emittedId = intendedId;
    }

    ids.push(emittedId);
    steps.push({
      pos,
      intendedId,
      maskedIds,
      emittedId,
      legal: isLegalToken(pos, emittedId, strictness),
    });
  }

  return {
    steps,
    ids,
    outcome: classifySequence(ids, strictness),
    firstIllegalPos: firstIllegalPosition(ids, strictness),
  };
}

export interface BatchResult {
  n: number;
  validCorrect: number;
  validWrong: number;
  invalid: number;
  /** (validCorrect + validWrong) / n */
  validRate: number;
  /** validCorrect / n */
  correctRate: number;
  outcomes: Outcome[];
}

export function runBatch(
  n: number,
  errorRate: number,
  strictness: Strictness,
  constrained: boolean,
  seed: number
): BatchResult {
  const rng = mulberry32(seed);
  const outcomes: Outcome[] = [];
  let validCorrect = 0;
  let validWrong = 0;
  let invalid = 0;

  for (let i = 0; i < n; i++) {
    const { outcome } = sampleGeneration(rng, errorRate, strictness, constrained);
    outcomes.push(outcome);
    if (outcome === "valid-correct") validCorrect++;
    else if (outcome === "valid-wrong") validWrong++;
    else invalid++;
  }

  return {
    n,
    validCorrect,
    validWrong,
    invalid,
    validRate: (validCorrect + validWrong) / n,
    correctRate: validCorrect / n,
    outcomes,
  };
}

/**
 * Exact probability that an unconstrained generation is grammar-valid:
 * the product over positions of P(emitted token is legal), where
 * P(legal at pos) = (1 - e) + e * |allowed(pos)| / |V|.
 * Under constrained decoding the mask makes every emission legal, so 1.
 */
export function analyticValidRate(
  errorRate: number,
  strictness: Strictness,
  constrained: boolean
): number {
  if (constrained) return 1;
  let p = 1;
  for (let pos = 0; pos < PATH_LENGTH; pos++) {
    p *= 1 - errorRate + (errorRate * allowedTokenIds(pos, strictness).length) / VOCAB_SIZE;
  }
  return p;
}

/**
 * Exact probability that a generation is grammar-valid AND every token is the
 * intended one. Unconstrained: product of P(emitted = intended) =
 * (1 - e) + e / |V| per position. Constrained: the mask renormalizes each
 * step over the allowed set, so per-step P(intended) becomes
 * [(1 - e) + e / |V|] / [(1 - e) + e * |allowed| / |V|].
 */
export function analyticCorrectRate(
  errorRate: number,
  strictness: Strictness,
  constrained: boolean
): number {
  let p = 1;
  for (let pos = 0; pos < PATH_LENGTH; pos++) {
    const pIntended = 1 - errorRate + errorRate / VOCAB_SIZE;
    if (!constrained) {
      p *= pIntended;
    } else {
      const z =
        1 - errorRate + (errorRate * allowedTokenIds(pos, strictness).length) / VOCAB_SIZE;
      p *= pIntended / z;
    }
  }
  return p;
}

/** Exact probability of a valid-but-semantically-wrong generation. */
export function analyticValidWrongRate(
  errorRate: number,
  strictness: Strictness,
  constrained: boolean
): number {
  return (
    analyticValidRate(errorRate, strictness, constrained) -
    analyticCorrectRate(errorRate, strictness, constrained)
  );
}
