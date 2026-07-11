/**
 * Pure math for the scaling-intuition guide. No React imports.
 *
 * This module is the single source of every number the guide displays:
 * the training data, the 16 real training runs (4 widths x 4 data budgets),
 * per-run train and validation losses, parameter counts, per-budget best
 * widths, and the quiz answer. A verifier can recompute all of them by
 * executing these functions with node/tsx.
 *
 * The toy experiment: tiny MLPs (2 -> W tanh -> 1) of four widths are each
 * trained with full-batch gradient descent (with momentum) on four nested
 * training sets of the same 2D regression task
 *   y = sin(3 x1) * cos(3 x2) + Gaussian noise (sigma = NOISE_SIGMA).
 * Every run uses the same step count and learning rate, the same
 * initialization per width, and deterministic seeds, so the only thing that
 * differs across a row of the grid is how much data the model saw.
 * Validation loss is the MSE against the NOISE-FREE true function on a fixed
 * held-out grid, so it measures how well the network recovered the signal
 * rather than the label noise (this is disclosed in the UI).
 */

// Architecture and experiment constants

export const WIDTHS: readonly number[] = [2, 8, 32, 128];
export const DATA_SIZES: readonly number[] = [8, 32, 128, 512];
export const NUM_WIDTHS = WIDTHS.length;
export const NUM_SIZES = DATA_SIZES.length;
export const NUM_RUNS = NUM_WIDTHS * NUM_SIZES;

/** Full-batch Adam settings, identical for all 16 runs. */
export const STEPS = 700;
export const LEARNING_RATE = 0.02;
export const ADAM_BETA1 = 0.9;
export const ADAM_BETA2 = 0.999;
export const ADAM_EPS = 1e-8;
/** Decoupled weight decay (AdamW style), same for every run. */
export const WEIGHT_DECAY = 1e-3;

/** Std dev of the Gaussian label noise on training targets. */
export const NOISE_SIGMA = 0.25;

/** Validation grid resolution (VAL_RES^2 noise-free points). */
export const VAL_RES = 16;

/** Deterministic seeds. */
export const DATA_SEED = 20260710;
export const INIT_SEED_BASE = 977;

export const TRUE_FORMULA =
  "y = sin(4 * x1) * cos(4 * x2) + 0.5 * sin(3 * x1 * x2) + noise";

// Deterministic pseudo-random generation (SPEC LCG, no Math.random)

export function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/** One standard Gaussian sample via Box-Muller from two LCG uniforms. */
function gaussian(rng: () => number): number {
  let u1 = rng();
  if (u1 < 1e-12) u1 = 1e-12;
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Task data

/** The noise-free ground-truth function the networks try to recover. */
export function trueFn(x1: number, x2: number): number {
  return Math.sin(4 * x1) * Math.cos(4 * x2) + 0.5 * Math.sin(3 * x1 * x2);
}

export interface Sample {
  x: [number, number];
  y: number;
}

/**
 * The master training set: DATA_SIZES[last] points, inputs uniform in
 * [-1, 1]^2, targets trueFn + Gaussian noise. Deterministic. The four data
 * budgets are NESTED prefixes of this array (the 32-point budget contains
 * the 8-point budget, and so on), so a bigger budget really is
 * "the same task, more data".
 */
export function makeMasterTrainSet(): Sample[] {
  const rng = makeLcg(DATA_SEED);
  const n = DATA_SIZES[NUM_SIZES - 1];
  const samples: Sample[] = [];
  for (let i = 0; i < n; i++) {
    const x1 = rng() * 2 - 1;
    const x2 = rng() * 2 - 1;
    const y = trueFn(x1, x2) + NOISE_SIGMA * gaussian(rng);
    samples.push({ x: [x1, x2], y });
  }
  return samples;
}

export const MASTER_TRAIN_SET: readonly Sample[] = makeMasterTrainSet();

/** The fixed held-out validation grid: VAL_RES^2 noise-free points. */
export function makeValSet(): Sample[] {
  const samples: Sample[] = [];
  for (let i = 0; i < VAL_RES; i++) {
    for (let j = 0; j < VAL_RES; j++) {
      const x1 = -1 + (2 * i) / (VAL_RES - 1);
      const x2 = -1 + (2 * j) / (VAL_RES - 1);
      samples.push({ x: [x1, x2], y: trueFn(x1, x2) });
    }
  }
  return samples;
}

export const VAL_SET: readonly Sample[] = makeValSet();

// Network

export interface Net {
  width: number;
  /** width x 2 first-layer weights. */
  w1: number[][];
  /** width first-layer biases. */
  b1: number[];
  /** width output weights. */
  w2: number[];
  b2: number;
}

/** Parameters in a 2 -> W (tanh) -> 1 MLP: 2W + W + W + 1. */
export function paramCount(width: number): number {
  return 4 * width + 1;
}

/**
 * Xavier/Glorot uniform initialization (Glorot & Bengio, 2010):
 * U(-a, a) with a = sqrt(6 / (fanIn + fanOut)) per layer.
 * The seed depends only on the width, so a given model size starts from the
 * SAME weights for every data budget: column-to-column differences in the
 * grid come from the data, not from the init draw.
 */
export function initNet(width: number, seed: number): Net {
  const rng = makeLcg(seed);
  const a1 = Math.sqrt(6 / (2 + width));
  const a2 = Math.sqrt(6 / (width + 1));
  const u = (a: number) => (rng() * 2 - 1) * a;
  return {
    width,
    w1: Array.from({ length: width }, () => [u(a1), u(a1)]),
    b1: Array.from({ length: width }, () => 0),
    w2: Array.from({ length: width }, () => u(a2)),
    b2: 0,
  };
}

export function initSeedForWidth(widthIdx: number): number {
  return INIT_SEED_BASE + widthIdx;
}

export function forward(net: Net, x: readonly number[]): number {
  let out = net.b2;
  for (let j = 0; j < net.width; j++) {
    const h = Math.tanh(net.b1[j] + net.w1[j][0] * x[0] + net.w1[j][1] * x[1]);
    out += h * net.w2[j];
  }
  return out;
}

/** Mean squared error of the net over a sample set. */
export function mse(net: Net, samples: readonly Sample[]): number {
  let sq = 0;
  for (const s of samples) {
    const d = forward(net, s.x) - s.y;
    sq += d * d;
  }
  return sq / samples.length;
}

// Training runs

export interface RunState {
  widthIdx: number;
  dataIdx: number;
  net: Net;
  /** Adam first-moment buffers, same shape as the net. */
  mW1: number[][];
  mB1: number[];
  mW2: number[];
  mB2: number;
  /** Adam second-moment buffers, same shape as the net. */
  sW1: number[][];
  sB1: number[];
  sW2: number[];
  sB2: number;
  samples: readonly Sample[];
  stepsDone: number;
  /** Train MSE after the most recent step (Infinity before the first). */
  trainLoss: number;
}

export function createRun(widthIdx: number, dataIdx: number): RunState {
  const width = WIDTHS[widthIdx];
  return {
    widthIdx,
    dataIdx,
    net: initNet(width, initSeedForWidth(widthIdx)),
    mW1: Array.from({ length: width }, () => [0, 0]),
    mB1: Array.from({ length: width }, () => 0),
    mW2: Array.from({ length: width }, () => 0),
    mB2: 0,
    sW1: Array.from({ length: width }, () => [0, 0]),
    sB1: Array.from({ length: width }, () => 0),
    sW2: Array.from({ length: width }, () => 0),
    sB2: 0,
    samples: MASTER_TRAIN_SET.slice(0, DATA_SIZES[dataIdx]),
    stepsDone: 0,
    trainLoss: Infinity,
  };
}

/**
 * One full-batch Adam step (Kingma & Ba, 2015) on the mean squared error.
 * Real forward and backward passes through the tanh MLP; returns the train
 * MSE measured during the forward pass of this step.
 */
export function trainStep(run: RunState, lr: number = LEARNING_RATE): number {
  const { net, samples } = run;
  const W = net.width;
  const n = samples.length;

  const gW1: number[][] = Array.from({ length: W }, () => [0, 0]);
  const gB1 = new Array<number>(W).fill(0);
  const gW2 = new Array<number>(W).fill(0);
  let gB2 = 0;

  let sq = 0;
  const h = new Array<number>(W).fill(0);
  for (let s = 0; s < n; s++) {
    const [x1, x2] = samples[s].x;
    let out = net.b2;
    for (let j = 0; j < W; j++) {
      h[j] = Math.tanh(net.b1[j] + net.w1[j][0] * x1 + net.w1[j][1] * x2);
      out += h[j] * net.w2[j];
    }
    const err = out - samples[s].y;
    sq += err * err;
    const dOut = (2 * err) / n;
    gB2 += dOut;
    for (let j = 0; j < W; j++) {
      gW2[j] += dOut * h[j];
      const dH = dOut * net.w2[j] * (1 - h[j] * h[j]);
      gB1[j] += dH;
      gW1[j][0] += dH * x1;
      gW1[j][1] += dH * x2;
    }
  }

  const t = run.stepsDone + 1;
  const bc1 = 1 - Math.pow(ADAM_BETA1, t);
  const bc2 = 1 - Math.pow(ADAM_BETA2, t);
  const adam = (p: number, g: number, m: number, s: number): [number, number, number] => {
    const nm = ADAM_BETA1 * m + (1 - ADAM_BETA1) * g;
    const ns = ADAM_BETA2 * s + (1 - ADAM_BETA2) * g * g;
    const np =
      p - (lr * (nm / bc1)) / (Math.sqrt(ns / bc2) + ADAM_EPS) - lr * WEIGHT_DECAY * p;
    return [np, nm, ns];
  };

  [net.b2, run.mB2, run.sB2] = adam(net.b2, gB2, run.mB2, run.sB2);
  for (let j = 0; j < W; j++) {
    [net.w2[j], run.mW2[j], run.sW2[j]] = adam(net.w2[j], gW2[j], run.mW2[j], run.sW2[j]);
    [net.b1[j], run.mB1[j], run.sB1[j]] = adam(net.b1[j], gB1[j], run.mB1[j], run.sB1[j]);
    [net.w1[j][0], run.mW1[j][0], run.sW1[j][0]] = adam(net.w1[j][0], gW1[j][0], run.mW1[j][0], run.sW1[j][0]);
    [net.w1[j][1], run.mW1[j][1], run.sW1[j][1]] = adam(net.w1[j][1], gW1[j][1], run.mW1[j][1], run.sW1[j][1]);
  }

  run.stepsDone += 1;
  run.trainLoss = sq / n;
  return run.trainLoss;
}

/** Run up to k steps (stops at STEPS). Returns true when the run is finished. */
export function trainChunk(run: RunState, k: number): boolean {
  const remaining = STEPS - run.stepsDone;
  const todo = Math.min(k, remaining);
  for (let i = 0; i < todo; i++) trainStep(run);
  return run.stepsDone >= STEPS;
}

/** Validation MSE of a run's net against the noise-free grid. */
export function valLoss(run: RunState): number {
  return mse(run.net, VAL_SET);
}

/**
 * Steps per setTimeout tick, sized so each tick does roughly constant work
 * (work per step is proportional to n * W). Keeps every tick well under
 * ~50ms so the progressbar stays smooth for all 16 runs.
 */
export function chunkStepsFor(widthIdx: number, dataIdx: number): number {
  const work = WIDTHS[widthIdx] * DATA_SIZES[dataIdx];
  const TICK_WORK = 400000;
  return Math.max(1, Math.min(STEPS, Math.round(TICK_WORK / work)));
}

/** Total work units of one run (for the overall progressbar). */
export function runWork(widthIdx: number, dataIdx: number): number {
  return WIDTHS[widthIdx] * DATA_SIZES[dataIdx] * STEPS;
}

export function totalWork(): number {
  let t = 0;
  for (let w = 0; w < NUM_WIDTHS; w++) {
    for (let d = 0; d < NUM_SIZES; d++) t += runWork(w, d);
  }
  return t;
}

// Experiment results

export interface RunResult {
  widthIdx: number;
  dataIdx: number;
  /** Final train MSE (noisy labels). */
  train: number;
  /** Final validation MSE against the noise-free function. */
  val: number;
}

/** Row-major run order: run i trains WIDTHS[floor(i/4)] on DATA_SIZES[i%4]. */
export function runSpec(i: number): { widthIdx: number; dataIdx: number } {
  return { widthIdx: Math.floor(i / NUM_SIZES), dataIdx: i % NUM_SIZES };
}

/**
 * Synchronous reference implementation of the full 16-run experiment,
 * used for verification with tsx. The client runs exactly the same
 * createRun / trainChunk / valLoss calls, just chunked across setTimeout
 * ticks, so it produces byte-identical numbers.
 */
export function runFullExperiment(): RunResult[] {
  const results: RunResult[] = [];
  for (let i = 0; i < NUM_RUNS; i++) {
    const { widthIdx, dataIdx } = runSpec(i);
    const run = createRun(widthIdx, dataIdx);
    trainChunk(run, STEPS);
    results.push({ widthIdx, dataIdx, train: run.trainLoss, val: valLoss(run) });
  }
  return results;
}

/**
 * Index into WIDTHS of the lowest validation loss for a given data budget
 * (deterministic tie-break: smaller width wins). This is the quiz answer,
 * always derived from the actual finished runs.
 */
export function bestWidthIdxForData(
  results: readonly RunResult[],
  dataIdx: number
): number {
  let best = -1;
  let bestVal = Infinity;
  for (const r of results) {
    if (r.dataIdx !== dataIdx) continue;
    if (r.val < bestVal - 1e-12 || (best === -1 && r.val < bestVal)) {
      best = r.widthIdx;
      bestVal = r.val;
    }
  }
  return best;
}

/**
 * Validation MSE of the trivial constant predictor that outputs the mean of
 * the training labels for a given budget. An honest floor-of-effort baseline:
 * a net that scores WORSE than this has been actively misled by noise.
 */
export function meanBaselineVal(dataIdx: number): number {
  const n = DATA_SIZES[dataIdx];
  let mean = 0;
  for (let i = 0; i < n; i++) mean += MASTER_TRAIN_SET[i].y;
  mean /= n;
  let sq = 0;
  for (const s of VAL_SET) sq += (mean - s.y) * (mean - s.y);
  return sq / VAL_SET.length;
}

/** log10 helper for the log-log chart (losses and param counts are positive). */
export function log10(v: number): number {
  return Math.log(v) / Math.LN10;
}
