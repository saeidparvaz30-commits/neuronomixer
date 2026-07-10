/**
 * Pure learning-rate-schedule math for the learning-rate-schedules guide.
 * No React imports.
 *
 * This module is the single source of every number the guide displays:
 * the schedule curves, every training loss, run classifications, the
 * target / prediction heatmaps, and the parameter count. A verifier can
 * recompute all of them by executing these functions with node/tsx.
 *
 * The setup: a tiny MLP (2 -> HIDDEN tanh -> 1, netParamCount()
 * parameters) regresses a fixed 2-D target surface from a fixed
 * GRID_RES x GRID_RES sample grid using REAL minibatch SGD. Plain SGD on
 * purpose: no momentum, no Adam. The update RULE is the subject of the
 * optimizers-race guide; this guide isolates the schedule dimension, so
 * the only thing that differs between runs is lr(t).
 *
 * Determinism: weights always start from INIT_SEED and the minibatch
 * order always comes from SHUFFLE_SEED, so two runs with the same
 * schedule and peak produce byte-identical curves, and SSR/client agree.
 */

// ── Architecture and training constants ─────────────────────────────────────

export const INPUT_DIM = 2;
export const HIDDEN = 32;

export const TOTAL_STEPS = 1200;
export const BATCH_SIZE = 16;
/** Linear warmup length for the warmup-cosine schedule (20% of the run). */
export const WARMUP_STEPS = 240;

/** Cosine floor as a fraction of the peak LR. */
export const ETA_MIN_FRAC = 0.01;
/** Step-decay multiplier applied at each drop. */
export const STEP_DECAY_FACTOR = 0.3;
/** Step decay drops the LR twice: at TOTAL_STEPS/3 and 2*TOTAL_STEPS/3. */
export const STEP_DECAY_DROPS = 2;

/** The training / evaluation grid resolution (GRID_RES^2 points). */
export const GRID_RES = 16;
/** Heatmap resolution for the target / prediction surfaces. */
export const HEATMAP_RES = 24;

/** Deterministic seeds: same init and same batch order for every run. */
export const INIT_SEED = 20260710;
export const SHUFFLE_SEED = 987654321;

/** Peak learning rates the slider can select (log-ish spacing). */
export const PEAK_CHOICES: readonly number[] = [
  0.02, 0.05, 0.1, 0.2, 0.4, 0.7, 1.0,
];
export const DEFAULT_PEAK = 0.2;
/** The peak used by the cliff / rescue presets (tuned; see module tests). */
export const CLIFF_PEAK = 0.4;

/** A run whose full-grid MSE exceeds this is numerically gone. */
export const DIVERGE_LIMIT = 1e6;
/**
 * Full-grid MSE at or below this counts as converged: about 8x below the
 * predict-the-mean baseline (baselineMse() is ~0.158) and within reach of
 * the step budget (tuned; the best runs end near 0.010).
 */
export const CONVERGED_LOSS = 0.02;

// ── Schedules ────────────────────────────────────────────────────────────────

export type ScheduleKind = "constant" | "step" | "cosine" | "warmup-cosine";

export const SCHEDULE_KINDS: readonly ScheduleKind[] = [
  "constant",
  "step",
  "cosine",
  "warmup-cosine",
];

export const SCHEDULE_LABELS: Record<ScheduleKind, string> = {
  constant: "Constant",
  step: "Step decay",
  cosine: "Cosine",
  "warmup-cosine": "Warmup + cosine",
};

/**
 * lr(t) for step t in [0, total). This one function defines every curve
 * the guide draws and every step the trainer takes.
 * - constant: peak
 * - step: peak * STEP_DECAY_FACTOR^(number of drops passed)
 * - cosine: eta_min + (peak - eta_min) * 0.5 * (1 + cos(pi * t / total))
 *   (cosine annealing, Loshchilov & Hutter 2016, arXiv:1608.03983)
 * - warmup-cosine: linear 0 -> peak over WARMUP_STEPS, then cosine on the rest
 *   (linear warmup, Goyal et al. 2017, arXiv:1706.02677)
 */
export function scheduleLR(
  kind: ScheduleKind,
  t: number,
  total: number = TOTAL_STEPS,
  peak: number = DEFAULT_PEAK
): number {
  const etaMin = ETA_MIN_FRAC * peak;
  switch (kind) {
    case "constant":
      return peak;
    case "step": {
      const dropEvery = total / (STEP_DECAY_DROPS + 1);
      const drops = Math.min(Math.floor(t / dropEvery), STEP_DECAY_DROPS);
      return peak * Math.pow(STEP_DECAY_FACTOR, drops);
    }
    case "cosine":
      return etaMin + (peak - etaMin) * 0.5 * (1 + Math.cos((Math.PI * t) / total));
    case "warmup-cosine": {
      if (t < WARMUP_STEPS) return (peak * (t + 1)) / WARMUP_STEPS;
      const u = (t - WARMUP_STEPS) / (total - WARMUP_STEPS);
      return etaMin + (peak - etaMin) * 0.5 * (1 + Math.cos(Math.PI * u));
    }
  }
}

/** The full lr curve for a schedule, one value per step. */
export function scheduleCurve(
  kind: ScheduleKind,
  total: number = TOTAL_STEPS,
  peak: number = DEFAULT_PEAK
): number[] {
  return Array.from({ length: total }, (_, t) => scheduleLR(kind, t, total, peak));
}

// ── Target surface and training grid ────────────────────────────────────────

/** The visible ground truth: a Gaussian hill at (0.4, 0.4) and a Gaussian pit at (-0.4, -0.4). */
export function targetFn(x1: number, x2: number): number {
  const hill = Math.exp(-4 * ((x1 - 0.4) ** 2 + (x2 - 0.4) ** 2));
  const pit = Math.exp(-4 * ((x1 + 0.4) ** 2 + (x2 + 0.4) ** 2));
  return hill - pit;
}

export const TARGET_FORMULA =
  "f(x1, x2) = exp(-4 * ((x1 - 0.4)^2 + (x2 - 0.4)^2)) - exp(-4 * ((x1 + 0.4)^2 + (x2 + 0.4)^2))";

export interface Sample {
  x: [number, number];
  y: number;
}

/** The fixed GRID_RES^2 training grid over [-1, 1]^2. Never resampled. */
export function makeTrainingGrid(): Sample[] {
  const samples: Sample[] = [];
  for (let i = 0; i < GRID_RES; i++) {
    for (let j = 0; j < GRID_RES; j++) {
      const x1 = -1 + (2 * i) / (GRID_RES - 1);
      const x2 = -1 + (2 * j) / (GRID_RES - 1);
      samples.push({ x: [x1, x2], y: targetFn(x1, x2) });
    }
  }
  return samples;
}

export const TRAINING_GRID: readonly Sample[] = makeTrainingGrid();

/**
 * MSE of the best constant predictor (the grid mean): the "predicting the
 * average" baseline. A finished run sitting above this learned less than
 * nothing, which is how the guide classifies divergence-in-effect.
 */
export function baselineMse(): number {
  const mean =
    TRAINING_GRID.reduce((a, s) => a + s.y, 0) / TRAINING_GRID.length;
  return (
    TRAINING_GRID.reduce((a, s) => a + (s.y - mean) ** 2, 0) /
    TRAINING_GRID.length
  );
}

// ── Deterministic pseudo-random (SPEC LCG, no Math.random) ──────────────────

export function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// ── The tiny net ─────────────────────────────────────────────────────────────

export interface Net {
  /** HIDDEN x INPUT_DIM. */
  w1: number[][];
  /** HIDDEN. */
  b1: number[];
  /** HIDDEN. */
  w2: number[];
  b2: number;
}

/** Parameter count of the net: (2+1)*HIDDEN + HIDDEN + 1. */
export function netParamCount(): number {
  return HIDDEN * INPUT_DIM + HIDDEN + HIDDEN + 1;
}

/** Deterministic init: every run starts from these exact weights. */
export function initNet(seed: number = INIT_SEED): Net {
  const rng = makeLcg(seed);
  const u = (scale: number) => (rng() * 2 - 1) * scale;
  return {
    w1: Array.from({ length: HIDDEN }, () =>
      Array.from({ length: INPUT_DIM }, () => u(1.0))
    ),
    b1: Array.from({ length: HIDDEN }, () => u(0.5)),
    w2: Array.from({ length: HIDDEN }, () => u(0.5)),
    b2: 0,
  };
}

export function forward(net: Net, x: readonly number[]): number {
  let out = net.b2;
  for (let j = 0; j < HIDDEN; j++) {
    const h = Math.tanh(net.b1[j] + net.w1[j][0] * x[0] + net.w1[j][1] * x[1]);
    out += net.w2[j] * h;
  }
  return out;
}

/** Full-grid MSE: the loss curve the guide plots, recomputed after every step. */
export function gridMse(net: Net): number {
  let sq = 0;
  for (const s of TRAINING_GRID) {
    const d = forward(net, s.x) - s.y;
    sq += d * d;
  }
  return sq / TRAINING_GRID.length;
}

/** One REAL minibatch SGD step at learning rate lr, mutating net in place. */
export function sgdStep(
  net: Net,
  batch: readonly Sample[],
  lr: number
): void {
  const B = batch.length;
  const gW1: number[][] = Array.from({ length: HIDDEN }, () => [0, 0]);
  const gB1 = new Array<number>(HIDDEN).fill(0);
  const gW2 = new Array<number>(HIDDEN).fill(0);
  let gB2 = 0;

  for (const s of batch) {
    const h = new Array<number>(HIDDEN);
    let out = net.b2;
    for (let j = 0; j < HIDDEN; j++) {
      h[j] = Math.tanh(net.b1[j] + net.w1[j][0] * s.x[0] + net.w1[j][1] * s.x[1]);
      out += net.w2[j] * h[j];
    }
    const dOut = (2 * (out - s.y)) / B;
    gB2 += dOut;
    for (let j = 0; j < HIDDEN; j++) {
      gW2[j] += dOut * h[j];
      const dH = dOut * net.w2[j] * (1 - h[j] * h[j]);
      gB1[j] += dH;
      gW1[j][0] += dH * s.x[0];
      gW1[j][1] += dH * s.x[1];
    }
  }

  net.b2 -= lr * gB2;
  for (let j = 0; j < HIDDEN; j++) {
    net.w2[j] -= lr * gW2[j];
    net.b1[j] -= lr * gB1[j];
    net.w1[j][0] -= lr * gW1[j][0];
    net.w1[j][1] -= lr * gW1[j][1];
  }
}

// ── Chunked training runs ────────────────────────────────────────────────────

export interface RunState {
  kind: ScheduleKind;
  peak: number;
  net: Net;
  step: number;
  /** lr actually used at each completed step. */
  lrs: number[];
  /** Full-grid MSE after each completed step; losses[0] is the init loss. */
  losses: number[];
  /** Step at which the loss went non-finite or past DIVERGE_LIMIT, else null. */
  divergedAt: number | null;
  /** Deterministic epoch shuffler. */
  rng: () => number;
  order: number[];
  pos: number;
}

function shuffledOrder(rng: () => number, n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function initRun(kind: ScheduleKind, peak: number): RunState {
  const rng = makeLcg(SHUFFLE_SEED);
  return {
    kind,
    peak,
    net: initNet(),
    step: 0,
    lrs: [],
    losses: [gridMse(initNet())],
    divergedAt: null,
    rng,
    order: shuffledOrder(rng, TRAINING_GRID.length),
    pos: 0,
  };
}

function nextBatch(state: RunState): Sample[] {
  const n = TRAINING_GRID.length;
  if (state.pos + BATCH_SIZE > n) {
    state.order = shuffledOrder(state.rng, n);
    state.pos = 0;
  }
  const batch: Sample[] = [];
  for (let i = 0; i < BATCH_SIZE; i++) {
    batch.push(TRAINING_GRID[state.order[state.pos + i]]);
  }
  state.pos += BATCH_SIZE;
  return batch;
}

/** Advance up to n steps. Stops early if the run diverges numerically. */
export function trainChunk(state: RunState, n: number): void {
  for (let i = 0; i < n; i++) {
    if (isRunDone(state)) return;
    const lr = scheduleLR(state.kind, state.step, TOTAL_STEPS, state.peak);
    sgdStep(state.net, nextBatch(state), lr);
    const loss = gridMse(state.net);
    state.lrs.push(lr);
    state.losses.push(loss);
    state.step += 1;
    if (!Number.isFinite(loss) || loss > DIVERGE_LIMIT) {
      state.divergedAt = state.step;
      return;
    }
  }
}

export function isRunDone(state: RunState): boolean {
  return state.divergedAt !== null || state.step >= TOTAL_STEPS;
}

// ── Run summaries (every classification the guide shows) ────────────────────

export type RunStatus = "converged" | "partial" | "diverged";

export interface RunSummary {
  kind: ScheduleKind;
  peak: number;
  steps: number;
  /** Grid MSE before the first step (identical for every run: same init). */
  initialLoss: number;
  /** Grid MSE after the last completed step. */
  finalLoss: number;
  bestLoss: number;
  status: RunStatus;
  divergedAt: number | null;
  lrs: number[];
  losses: number[];
  /** Row-major HEATMAP_RES^2 values of the net's learned surface at run end. */
  heatmap: number[];
}

/**
 * Classify a finished run:
 * - diverged: went non-finite / past DIVERGE_LIMIT, or finished WORSE than
 *   the predict-the-mean baseline (baselineMse()).
 * - converged: final grid MSE at or below CONVERGED_LOSS.
 * - partial: finished below baseline but above CONVERGED_LOSS.
 */
export function summarizeRun(state: RunState): RunSummary {
  const finalLoss = state.losses[state.losses.length - 1];
  let best = Infinity;
  for (const l of state.losses) {
    if (Number.isFinite(l) && l < best) best = l;
  }
  const broke =
    state.divergedAt !== null ||
    !Number.isFinite(finalLoss) ||
    finalLoss > baselineMse();
  const status: RunStatus = broke
    ? "diverged"
    : finalLoss <= CONVERGED_LOSS
      ? "converged"
      : "partial";
  return {
    kind: state.kind,
    peak: state.peak,
    steps: state.step,
    initialLoss: state.losses[0],
    finalLoss,
    bestLoss: best,
    status,
    divergedAt: state.divergedAt,
    lrs: state.lrs,
    losses: state.losses,
    heatmap: predictionHeatmap(state.net),
  };
}

/** Run a full training synchronously (used by tests / the verifier). */
export function runFull(kind: ScheduleKind, peak: number): RunSummary {
  const state = initRun(kind, peak);
  while (!isRunDone(state)) trainChunk(state, TOTAL_STEPS);
  return summarizeRun(state);
}

// ── Heatmaps (target vs learned surface) ─────────────────────────────────────

/** Row-major HEATMAP_RES^2 values of the target surface. */
export function targetHeatmap(res: number = HEATMAP_RES): number[] {
  const cells: number[] = [];
  for (let r = 0; r < res; r++) {
    const x2 = -1 + (2 * (r + 0.5)) / res;
    for (let c = 0; c < res; c++) {
      const x1 = -1 + (2 * (c + 0.5)) / res;
      cells.push(targetFn(x1, x2));
    }
  }
  return cells;
}

/** Row-major HEATMAP_RES^2 values of the net's current prediction surface. */
export function predictionHeatmap(net: Net, res: number = HEATMAP_RES): number[] {
  const cells: number[] = [];
  for (let r = 0; r < res; r++) {
    const x2 = -1 + (2 * (r + 0.5)) / res;
    for (let c = 0; c < res; c++) {
      const x1 = -1 + (2 * (c + 0.5)) / res;
      cells.push(forward(net, [x1, x2]));
    }
  }
  return cells;
}
