/**
 * Pure autoencoder math for the autoencoders guide. No React imports.
 *
 * This module is the single source of every number the guide displays:
 * reconstructions, per-pixel errors, MSE, latent activations, the training
 * loss history, parameter counts, and compression ratios. A verifier can
 * recompute all of them by executing these functions with node/tsx.
 *
 * The toy setup: a tiny undercomplete autoencoder on 8x8 grayscale images.
 *   encoder: 64 -> k, tanh          (k = bottleneck width, 1..16)
 *   decoder: k -> 64, sigmoid
 * It is trained in the browser with full-batch gradient descent plus
 * momentum on 50 images (10 digit glyphs and their four 1-pixel shifts),
 * minimizing mean squared reconstruction error. Weight initialization uses
 * the deterministic SPEC LCG keyed by the bottleneck width, so every
 * training run is reproducible and SSR/client renders agree.
 */

// ── Architecture and training constants ─────────────────────────────────────

export const IMG_SIZE = 8;
export const NUM_PIXELS = IMG_SIZE * IMG_SIZE; // 64

export const MIN_WIDTH = 1;
export const MAX_WIDTH = 16;
export const DEFAULT_WIDTH = 4;

/** Full-batch gradient descent settings (tuned on the fixed 50-image set). */
export const LEARNING_RATE = 2.0;
export const MOMENTUM = 0.9;
export const TRAIN_STEPS = 1500;

/** Deterministic base seed; per-width seed = INIT_SEED + width * 101. */
export const INIT_SEED = 20260710;

// ── Preset digit glyphs (8x8, values 0 or 1) ────────────────────────────────

function glyph(rows: string[]): number[] {
  const px: number[] = [];
  for (const row of rows) {
    for (const ch of row) px.push(ch === "#" ? 1 : 0);
  }
  return px;
}

export interface Preset {
  id: string;
  label: string;
  pixels: number[];
}

export const PRESETS: readonly Preset[] = [
  {
    id: "d0",
    label: "0",
    pixels: glyph([
      "..####..",
      ".#....#.",
      ".#....#.",
      ".#....#.",
      ".#....#.",
      ".#....#.",
      "..####..",
      "........",
    ]),
  },
  {
    id: "d1",
    label: "1",
    pixels: glyph([
      "...##...",
      "..###...",
      "...##...",
      "...##...",
      "...##...",
      "...##...",
      "..####..",
      "........",
    ]),
  },
  {
    id: "d2",
    label: "2",
    pixels: glyph([
      "..####..",
      ".#....#.",
      "......#.",
      ".....#..",
      "....#...",
      "..##....",
      ".######.",
      "........",
    ]),
  },
  {
    id: "d3",
    label: "3",
    pixels: glyph([
      "..####..",
      ".#....#.",
      "......#.",
      "...###..",
      "......#.",
      ".#....#.",
      "..####..",
      "........",
    ]),
  },
  {
    id: "d4",
    label: "4",
    pixels: glyph([
      "....##..",
      "...#.#..",
      "..#..#..",
      ".#...#..",
      ".######.",
      ".....#..",
      ".....#..",
      "........",
    ]),
  },
  {
    id: "d5",
    label: "5",
    pixels: glyph([
      ".#####..",
      ".#......",
      ".####...",
      ".....#..",
      "......#.",
      ".#....#.",
      "..####..",
      "........",
    ]),
  },
  {
    id: "d6",
    label: "6",
    pixels: glyph([
      "..####..",
      ".#......",
      ".#......",
      ".#####..",
      ".#....#.",
      ".#....#.",
      "..####..",
      "........",
    ]),
  },
  {
    id: "d7",
    label: "7",
    pixels: glyph([
      ".######.",
      "......#.",
      ".....#..",
      "....#...",
      "...#....",
      "...#....",
      "...#....",
      "........",
    ]),
  },
  {
    id: "d8",
    label: "8",
    pixels: glyph([
      "..####..",
      ".#....#.",
      ".#....#.",
      "..####..",
      ".#....#.",
      ".#....#.",
      "..####..",
      "........",
    ]),
  },
  {
    id: "d9",
    label: "9",
    pixels: glyph([
      "..####..",
      ".#....#.",
      ".#....#.",
      "..#####.",
      "......#.",
      "......#.",
      "..####..",
      "........",
    ]),
  },
];

export const DEFAULT_PRESET_INDEX = 3;

// ── Training set: presets plus their four 1-pixel shifts (50 images) ────────

/** Shift an 8x8 image by (dx, dy) pixels with zero fill. */
export function shiftImage(pixels: readonly number[], dx: number, dy: number): number[] {
  const out = new Array<number>(NUM_PIXELS).fill(0);
  for (let r = 0; r < IMG_SIZE; r++) {
    for (let c = 0; c < IMG_SIZE; c++) {
      const sr = r - dy;
      const sc = c - dx;
      if (sr >= 0 && sr < IMG_SIZE && sc >= 0 && sc < IMG_SIZE) {
        out[r * IMG_SIZE + c] = pixels[sr * IMG_SIZE + sc];
      }
    }
  }
  return out;
}

/** The fixed training set: each glyph plus 1-pixel shifts in 4 directions. */
export function makeTrainingSet(): number[][] {
  const data: number[][] = [];
  for (const p of PRESETS) {
    data.push([...p.pixels]);
    data.push(shiftImage(p.pixels, 1, 0));
    data.push(shiftImage(p.pixels, -1, 0));
    data.push(shiftImage(p.pixels, 0, 1));
    data.push(shiftImage(p.pixels, 0, -1));
  }
  return data;
}

export const TRAIN_SET_SIZE = PRESETS.length * 5; // 50

// ── Deterministic pseudo-random init (SPEC LCG, no Math.random) ─────────────

export function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// ── Parameters ──────────────────────────────────────────────────────────────

export interface AEParams {
  /** Encoder weights, width x NUM_PIXELS. */
  w1: number[][];
  /** Encoder biases, width. */
  b1: number[];
  /** Decoder weights, NUM_PIXELS x width. */
  w2: number[][];
  /** Decoder biases, NUM_PIXELS. */
  b2: number[];
  /** Bottleneck width the parameters belong to. */
  width: number;
}

export interface AEState {
  params: AEParams;
  vel: AEParams;
  step: number;
  lossHistory: number[];
}

function zerosLike(p: AEParams): AEParams {
  return {
    w1: p.w1.map((row) => row.map(() => 0)),
    b1: p.b1.map(() => 0),
    w2: p.w2.map((row) => row.map(() => 0)),
    b2: p.b2.map(() => 0),
    width: p.width,
  };
}

export function cloneParams(p: AEParams): AEParams {
  return {
    w1: p.w1.map((row) => [...row]),
    b1: [...p.b1],
    w2: p.w2.map((row) => [...row]),
    b2: [...p.b2],
    width: p.width,
  };
}

/**
 * Glorot-style uniform initialization, U(-limit, limit) with
 * limit = sqrt(6 / (fanIn + fanOut)) (Glorot and Bengio, 2010),
 * drawn from the deterministic LCG.
 */
export function initParams(width: number, seed: number = INIT_SEED + width * 101): AEParams {
  const rng = makeLcg(seed);
  const u = (limit: number) => (rng() * 2 - 1) * limit;
  const lim1 = Math.sqrt(6 / (NUM_PIXELS + width));
  const lim2 = Math.sqrt(6 / (width + NUM_PIXELS));
  return {
    w1: Array.from({ length: width }, () =>
      Array.from({ length: NUM_PIXELS }, () => u(lim1))
    ),
    b1: Array.from({ length: width }, () => 0),
    w2: Array.from({ length: NUM_PIXELS }, () =>
      Array.from({ length: width }, () => u(lim2))
    ),
    b2: Array.from({ length: NUM_PIXELS }, () => 0),
    width,
  };
}

export function initState(width: number): AEState {
  const params = initParams(width);
  return { params, vel: zerosLike(params), step: 0, lossHistory: [] };
}

// ── Forward math ────────────────────────────────────────────────────────────

function sigmoid(a: number): number {
  return 1 / (1 + Math.exp(-a));
}

/** Latent code z = tanh(W1 x + b1), length = bottleneck width. */
export function encode(params: AEParams, x: readonly number[]): number[] {
  return params.b1.map((b, j) => {
    let a = b;
    const row = params.w1[j];
    for (let i = 0; i < NUM_PIXELS; i++) a += row[i] * x[i];
    return Math.tanh(a);
  });
}

/** Reconstruction xhat = sigmoid(W2 z + b2), length 64, each in (0, 1). */
export function decode(params: AEParams, z: readonly number[]): number[] {
  return params.b2.map((b, i) => {
    let a = b;
    const row = params.w2[i];
    for (let j = 0; j < params.width; j++) a += row[j] * z[j];
    return sigmoid(a);
  });
}

export interface Reconstruction {
  z: number[];
  xhat: number[];
}

export function reconstruct(params: AEParams, x: readonly number[]): Reconstruction {
  const z = encode(params, x);
  return { z, xhat: decode(params, z) };
}

/** Mean squared error over the 64 pixels. */
export function mse(x: readonly number[], xhat: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < NUM_PIXELS; i++) {
    const d = xhat[i] - x[i];
    s += d * d;
  }
  return s / NUM_PIXELS;
}

/** Per-pixel absolute error, length 64. */
export function pixelErrors(x: readonly number[], xhat: readonly number[]): number[] {
  return x.map((v, i) => Math.abs(xhat[i] - v));
}

/** Index and value of the largest per-pixel error (tie-break: lowest index). */
export function maxError(errors: readonly number[]): { index: number; value: number } {
  let best = 0;
  for (let i = 1; i < errors.length; i++) {
    if (errors[i] > errors[best]) best = i;
  }
  return { index: best, value: errors[best] };
}

// ── Training ────────────────────────────────────────────────────────────────

/**
 * One full-batch gradient descent step (with momentum) on
 *   L = mean over images of mean squared pixel error.
 * Returns the batch loss computed on the forward pass BEFORE the update,
 * so the recorded history is the loss the gradients were taken at.
 */
export function trainStep(
  state: AEState,
  data: readonly (readonly number[])[],
  lr: number = LEARNING_RATE,
  momentum: number = MOMENTUM
): number {
  const { params, vel } = state;
  const k = params.width;
  const B = data.length;
  const grad = zerosLike(params);
  let loss = 0;

  for (const x of data) {
    // Forward pass (kept inline for speed; matches encode/decode exactly).
    const zPre = new Array<number>(k);
    const z = new Array<number>(k);
    for (let j = 0; j < k; j++) {
      let a = params.b1[j];
      const row = params.w1[j];
      for (let i = 0; i < NUM_PIXELS; i++) a += row[i] * x[i];
      zPre[j] = a;
      z[j] = Math.tanh(a);
    }
    const xhat = new Array<number>(NUM_PIXELS);
    for (let i = 0; i < NUM_PIXELS; i++) {
      let a = params.b2[i];
      const row = params.w2[i];
      for (let j = 0; j < k; j++) a += row[j] * z[j];
      xhat[i] = sigmoid(a);
    }

    // Loss and output-layer gradient.
    const dZ = new Array<number>(k).fill(0);
    for (let i = 0; i < NUM_PIXELS; i++) {
      const diff = xhat[i] - x[i];
      loss += (diff * diff) / (NUM_PIXELS * B);
      // dL/d(pre-sigmoid) = 2 * diff / (64 * B) * sigmoid'(a)
      const dA = ((2 * diff) / (NUM_PIXELS * B)) * xhat[i] * (1 - xhat[i]);
      grad.b2[i] += dA;
      const wRow = params.w2[i];
      const gRow = grad.w2[i];
      for (let j = 0; j < k; j++) {
        gRow[j] += dA * z[j];
        dZ[j] += dA * wRow[j];
      }
    }

    // Backprop through tanh into the encoder.
    for (let j = 0; j < k; j++) {
      const dPre = dZ[j] * (1 - z[j] * z[j]);
      grad.b1[j] += dPre;
      const gRow = grad.w1[j];
      for (let i = 0; i < NUM_PIXELS; i++) gRow[i] += dPre * x[i];
    }
  }

  // Momentum update, in place.
  for (let j = 0; j < k; j++) {
    vel.b1[j] = momentum * vel.b1[j] - lr * grad.b1[j];
    params.b1[j] += vel.b1[j];
    for (let i = 0; i < NUM_PIXELS; i++) {
      vel.w1[j][i] = momentum * vel.w1[j][i] - lr * grad.w1[j][i];
      params.w1[j][i] += vel.w1[j][i];
    }
  }
  for (let i = 0; i < NUM_PIXELS; i++) {
    vel.b2[i] = momentum * vel.b2[i] - lr * grad.b2[i];
    params.b2[i] += vel.b2[i];
    for (let j = 0; j < k; j++) {
      vel.w2[i][j] = momentum * vel.w2[i][j] - lr * grad.w2[i][j];
      params.w2[i][j] += vel.w2[i][j];
    }
  }

  return loss;
}

/** Run up to `steps` training steps (mutates state), capped at TRAIN_STEPS. */
export function trainChunk(
  state: AEState,
  data: readonly (readonly number[])[],
  steps: number
): void {
  const target = Math.min(TRAIN_STEPS, state.step + steps);
  while (state.step < target) {
    state.lossHistory.push(trainStep(state, data));
    state.step++;
  }
}

export function isTrained(state: AEState): boolean {
  return state.step >= TRAIN_STEPS;
}

// ── Counters (all displayed counts come from here) ──────────────────────────

/** Total trainable parameters: encoder (64k + k) plus decoder (64k + 64). */
export function paramCount(width: number): number {
  return NUM_PIXELS * width + width + width * NUM_PIXELS + NUM_PIXELS;
}

/** Compression factor of the bottleneck: 64 pixels stored as k numbers. */
export function compressionRatio(width: number): number {
  return NUM_PIXELS / width;
}
