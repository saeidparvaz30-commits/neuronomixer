/**
 * Pure DPO math for the dpo-preference-tuning guide. No React imports.
 *
 * This module is the single source of every number the guide displays:
 * the policy distribution, the DPO loss, its gradient, per-pair margins,
 * implicit rewards, and the KL divergence from the reference model.
 * A verifier can recompute all of them by executing these functions
 * with node/tsx.
 *
 * The toy setup: one fixed prompt, a discrete space of 8 completions,
 * a frozen reference policy given by REF_LOGITS, and a trainable policy
 * parameterized by its own logit vector (initialized to the reference).
 * The DPO objective on a preference pair (y_w, y_l) is the real formula:
 *
 *   L = -log sigmoid( beta * [ (log pi(y_w) - log pi_ref(y_w))
 *                            - (log pi(y_l) - log pi_ref(y_l)) ] )
 *
 * and training is plain gradient descent on the mean loss over PAIRS.
 */

export interface Completion {
  /** Stable id, also the display letter. */
  id: string;
  /** Short quality tag shown next to the bar. */
  quality: string;
  /** The full completion text. */
  text: string;
}

export const PROMPT = "Explain overfitting in one sentence.";

export const COMPLETIONS: readonly Completion[] = [
  {
    id: "A",
    quality: "concise + correct",
    text: "Overfitting is when a model memorizes its training data instead of learning the pattern, so it fails on new data.",
  },
  {
    id: "B",
    quality: "correct, jargon-heavy",
    text: "Overfitting: excess variance from minimizing empirical risk, harming generalization to the true distribution.",
  },
  {
    id: "C",
    quality: "vague filler",
    text: "Overfitting is when a model does not work as well as you would want it to.",
  },
  {
    id: "D",
    quality: "confidently wrong",
    text: "Overfitting is when a model is trained on too little data, and the fix is always adding more layers.",
  },
  {
    id: "E",
    quality: "evasive",
    text: "That depends on many factors and is difficult to explain in a single sentence.",
  },
  {
    id: "F",
    quality: "correct but rambling",
    text: "Overfitting, which happens a lot, is basically when your model, after seeing the same examples many times, does great on those exact examples but then does much worse on anything new.",
  },
  {
    id: "G",
    quality: "playful, roughly right",
    text: "Your model crammed the answer key instead of studying the subject, so it flunks the real exam.",
  },
  {
    id: "H",
    quality: "off-topic",
    text: "Gradient descent updates weights by following the negative gradient of the loss.",
  },
];

/**
 * Frozen reference policy logits (the "base model" after SFT).
 * Authored so the reference favors the vague (C) and confidently wrong (D)
 * completions: the failure mode preference tuning exists to fix.
 */
export const REF_LOGITS: readonly number[] = [
  0.2, // A
  -0.1, // B
  1.1, // C
  0.8, // D
  0.3, // E
  0.6, // F
  -0.4, // G
  -0.9, // H
];

export interface PreferencePair {
  id: string;
  /** Index into COMPLETIONS of the preferred completion. */
  winner: number;
  /** Index into COMPLETIONS of the dispreferred completion. */
  loser: number;
  rationale: string;
}

/** Authored preference data: the entire "human feedback" for this toy run. */
export const PAIRS: readonly PreferencePair[] = [
  {
    id: "p1",
    winner: 0, // A
    loser: 2, // C
    rationale: "Concise and correct beats vague filler.",
  },
  {
    id: "p2",
    winner: 0, // A
    loser: 3, // D
    rationale: "Correct beats confidently wrong.",
  },
  {
    id: "p3",
    winner: 1, // B
    loser: 2, // C
    rationale: "Jargon-heavy but accurate still beats saying nothing.",
  },
  {
    id: "p4",
    winner: 5, // F
    loser: 3, // D
    rationale: "Rambling but correct beats a wrong answer.",
  },
  {
    id: "p5",
    winner: 0, // A
    loser: 5, // F
    rationale: "Between two correct answers, concise wins.",
  },
  {
    id: "p6",
    winner: 6, // G
    loser: 4, // E
    rationale: "A playful real answer beats an evasive non-answer.",
  },
];

/** Gradient descent step size on the logits. */
export const LEARNING_RATE = 2.5;
/** Default beta (KL-tether strength). */
export const DEFAULT_BETA = 0.1;
export const BETA_MIN = 0.05;
export const BETA_MAX = 1.0;
export const BETA_STEP = 0.05;
/** A run must have at least this many steps before it can be saved. */
export const MIN_STEPS_PER_RUN = 10;
/** Hard cap so a low-beta policy cannot drift numerically forever. */
export const MAX_STEPS = 400;

/** Display colors for this guide's chart series (defined once, used everywhere). */
export const SERIES_COLORS = {
  /** applied-ai category color: the trained policy. */
  policy: "#ec4899",
  /** the frozen reference policy. */
  reference: "#475569",
} as const;

// ── Core math ──────────────────────────────────────────────────────────────

export function softmax(logits: readonly number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((z) => Math.exp(z - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

export function logSoftmax(logits: readonly number[]): number[] {
  const max = Math.max(...logits);
  const logSum =
    Math.log(logits.reduce((a, z) => a + Math.exp(z - max), 0)) + max;
  return logits.map((z) => z - logSum);
}

export function sigmoid(x: number): number {
  return x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x));
}

/** Numerically stable softplus(x) = log(1 + e^x), so -log sigmoid(m) = softplus(-m). */
export function softplus(x: number): number {
  return x > 0 ? x + Math.log(1 + Math.exp(-x)) : Math.log(1 + Math.exp(x));
}

/**
 * The DPO margin for one pair:
 *   m = beta * [ (log pi(y_w) - log pi_ref(y_w)) - (log pi(y_l) - log pi_ref(y_l)) ]
 */
export function pairMargin(
  logits: readonly number[],
  refLogits: readonly number[],
  pair: PreferencePair,
  beta: number
): number {
  const lp = logSoftmax(logits);
  const lr = logSoftmax(refLogits);
  return (
    beta *
    (lp[pair.winner] - lr[pair.winner] - (lp[pair.loser] - lr[pair.loser]))
  );
}

/** Mean DPO loss over the pairs: mean of -log sigmoid(margin). */
export function dpoLoss(
  logits: readonly number[],
  refLogits: readonly number[],
  pairs: readonly PreferencePair[],
  beta: number
): number {
  let total = 0;
  for (const pair of pairs) {
    total += softplus(-pairMargin(logits, refLogits, pair, beta));
  }
  return total / pairs.length;
}

/**
 * Gradient of the mean DPO loss with respect to the policy logits.
 *
 * For one pair, d(-log sigmoid(m))/dz_k = -sigmoid(-m) * dm/dz_k, and
 *   dm/dz_k = beta * [ d log pi(y_w)/dz_k - d log pi(y_l)/dz_k ]
 * with d log pi(y)/dz_k = 1[k = y] - pi(k).
 * The -pi(k) terms cancel between winner and loser, so each pair pushes
 * ONLY its winner logit up and its loser logit down, weighted by
 * sigmoid(-m): the pairs the policy currently gets most wrong push hardest.
 * Completions that appear in no pair receive exactly zero gradient; their
 * probability changes only through softmax renormalization.
 */
export function dpoGradient(
  logits: readonly number[],
  refLogits: readonly number[],
  pairs: readonly PreferencePair[],
  beta: number
): number[] {
  const probs = softmax(logits);
  const grad = new Array<number>(logits.length).fill(0);
  for (const pair of pairs) {
    const m = pairMargin(logits, refLogits, pair, beta);
    const weight = sigmoid(-m);
    for (let k = 0; k < grad.length; k++) {
      const dLogW = (k === pair.winner ? 1 : 0) - probs[k];
      const dLogL = (k === pair.loser ? 1 : 0) - probs[k];
      grad[k] += (-weight * beta * (dLogW - dLogL)) / pairs.length;
    }
  }
  return grad;
}

/** One gradient descent step on the logits. */
export function trainStep(
  logits: readonly number[],
  refLogits: readonly number[],
  pairs: readonly PreferencePair[],
  beta: number,
  learningRate: number = LEARNING_RATE
): number[] {
  const grad = dpoGradient(logits, refLogits, pairs, beta);
  return logits.map((z, k) => z - learningRate * grad[k]);
}

/** Run n gradient steps, returning the final logits and the loss after each step. */
export function trainSteps(
  logits: readonly number[],
  refLogits: readonly number[],
  pairs: readonly PreferencePair[],
  beta: number,
  n: number,
  learningRate: number = LEARNING_RATE
): { logits: number[]; losses: number[] } {
  let current = [...logits];
  const losses: number[] = [];
  for (let i = 0; i < n; i++) {
    current = trainStep(current, refLogits, pairs, beta, learningRate);
    losses.push(dpoLoss(current, refLogits, pairs, beta));
  }
  return { logits: current, losses };
}

/** KL( softmax(pLogits) || softmax(qLogits) ), in nats. */
export function klDivergence(
  pLogits: readonly number[],
  qLogits: readonly number[]
): number {
  const p = softmax(pLogits);
  const lp = logSoftmax(pLogits);
  const lq = logSoftmax(qLogits);
  let kl = 0;
  for (let i = 0; i < p.length; i++) {
    kl += p[i] * (lp[i] - lq[i]);
  }
  return Math.max(0, kl);
}

/** DPO's implicit reward per completion: r(y) = beta * log( pi(y) / pi_ref(y) ). */
export function implicitRewards(
  logits: readonly number[],
  refLogits: readonly number[],
  beta: number
): number[] {
  const lp = logSoftmax(logits);
  const lr = logSoftmax(refLogits);
  return lp.map((v, i) => beta * (v - lr[i]));
}

export interface PairDiagnostics {
  pair: PreferencePair;
  /** The DPO margin m for this pair. */
  margin: number;
  /** sigmoid(margin): the model's implied probability the winner is preferred. */
  orderProb: number;
  /** -log sigmoid(margin): this pair's contribution to the loss. */
  loss: number;
  /** sigmoid(-margin): how hard this pair currently pushes the gradient. */
  gradWeight: number;
}

export function pairDiagnostics(
  logits: readonly number[],
  refLogits: readonly number[],
  pairs: readonly PreferencePair[],
  beta: number
): PairDiagnostics[] {
  return pairs.map((pair) => {
    const margin = pairMargin(logits, refLogits, pair, beta);
    return {
      pair,
      margin,
      orderProb: sigmoid(margin),
      loss: softplus(-margin),
      gradWeight: sigmoid(-margin),
    };
  });
}

/** Index of the highest-probability completion. */
export function argmax(values: readonly number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[best]) best = i;
  }
  return best;
}

/** A saved training run: everything the run cards and the challenge display. */
export interface RunSnapshot {
  id: string;
  label: string;
  beta: number;
  steps: number;
  finalLoss: number;
  kl: number;
  probs: number[];
}

export function makeRunSnapshot(
  logits: readonly number[],
  refLogits: readonly number[],
  pairs: readonly PreferencePair[],
  beta: number,
  steps: number,
  id: string,
  label: string
): RunSnapshot {
  return {
    id,
    label,
    beta,
    steps,
    finalLoss: dpoLoss(logits, refLogits, pairs, beta),
    kl: klDivergence(logits, refLogits),
    probs: softmax(logits),
  };
}
