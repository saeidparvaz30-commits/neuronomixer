/**
 * Pure weight-initialization math for the weight-initialization guide.
 * No React imports. Every number the guide displays comes from these
 * functions: per-layer activation and gradient statistics and histograms,
 * the init-scheme standard deviations, and the training-race losses and
 * accuracies. A verifier can recompute all of them with npx tsx.
 *
 * Setup: a real 6-layer MLP for binary classification of 2-D points
 * (two concentric rings): 2 -> 16 -> 16 -> 16 -> 16 -> 16 -> 16 -> 1 logit,
 * tanh or ReLU hidden activations, sigmoid + binary cross-entropy loss.
 * The signal lab runs a real forward and backward pass over the full batch
 * and histograms what it finds. The race trains five copies of the network,
 * identical except for how the weights start, with full-batch gradient
 * descent plus momentum.
 */

// ── Architecture and training constants ─────────────────────────────────────

export const INPUT_DIM = 2;
export const WIDTH = 16;
/** Number of hidden (activated) layers. */
export const DEPTH = 6;
export const DATA_N = 192;
export const SEED = 20260710;

export const RACE_STEPS = 240;
export const LEARNING_RATE = 0.25;
export const MOMENTUM = 0.9;
/** Steps trained per setTimeout tick so the UI thread stays responsive. */
export const CHUNK_STEPS = 4;

export const HIST_BINS = 25;
/** |tanh activation| above this counts as saturated. */
export const TANH_SAT_THRESHOLD = 0.95;

export const TINY_STD = 0.01;
export const LARGE_STD = 1.0;

// ── Init schemes ─────────────────────────────────────────────────────────────

export type Scheme = "zeros" | "tiny" | "large" | "xavier" | "he";
export type Activation = "tanh" | "relu";

export const SCHEMES: readonly Scheme[] = [
  "zeros",
  "tiny",
  "large",
  "xavier",
  "he",
];

export interface SchemeMeta {
  label: string;
  /** Formula shown in the UI. Plain text, no markup. */
  formula: string;
  /** Where the formula comes from; null for the deliberately naive schemes. */
  citation: string | null;
  /** Display color from the guide token table. Never the sole indicator. */
  color: string;
}

export const SCHEME_META: Record<Scheme, SchemeMeta> = {
  zeros: {
    label: "All zeros",
    formula: "W = 0",
    citation: null,
    color: "#94a3b8",
  },
  tiny: {
    label: "Tiny random",
    formula: "W ~ N(0, 0.01²)",
    citation: null,
    color: "#a855f7",
  },
  large: {
    label: "Large random",
    formula: "W ~ N(0, 1.0²)",
    citation: null,
    color: "#ef4444",
  },
  xavier: {
    label: "Xavier (Glorot)",
    formula: "W ~ N(0, 2 / (fan_in + fan_out))",
    citation:
      "Glorot & Bengio 2010, Understanding the difficulty of training deep feedforward neural networks, AISTATS",
    color: "#3bb4a4",
  },
  he: {
    label: "He",
    formula: "W ~ N(0, 2 / fan_in)",
    citation:
      "He et al. 2015, Delving Deep into Rectifiers, ICCV (arXiv:1502.01852)",
    color: "var(--color-accent)",
  },
};

/** Standard deviation each scheme assigns to a layer's weights. */
export function schemeStd(
  scheme: Scheme,
  fanIn: number,
  fanOut: number
): number {
  switch (scheme) {
    case "zeros":
      return 0;
    case "tiny":
      return TINY_STD;
    case "large":
      return LARGE_STD;
    case "xavier":
      return Math.sqrt(2 / (fanIn + fanOut));
    case "he":
      return Math.sqrt(2 / fanIn);
  }
}

// ── Deterministic pseudo-random numbers (SPEC LCG, no Math.random) ──────────

export function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/** Standard normal samples via Box-Muller on top of the LCG. Deterministic. */
export function makeGaussian(rng: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    let u = rng();
    while (u <= 1e-12) u = rng();
    const v = rng();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
}

// ── Network ──────────────────────────────────────────────────────────────────

export interface Layer {
  /** w[out][in]. */
  w: number[][];
  b: number[];
}

/** DEPTH hidden layers followed by one linear output layer (WIDTH -> 1). */
export type Net = Layer[];

/** [fanIn, fanOut] for every weight matrix, input to output. */
export function layerDims(): Array<[number, number]> {
  const dims: Array<[number, number]> = [[INPUT_DIM, WIDTH]];
  for (let i = 1; i < DEPTH; i++) dims.push([WIDTH, WIDTH]);
  dims.push([WIDTH, 1]);
  return dims;
}

/** Weights ~ N(0, schemeStd^2), biases 0 (the standard convention). */
export function initNet(scheme: Scheme, seed: number = SEED): Net {
  const gauss = makeGaussian(makeLcg(seed));
  return layerDims().map(([fanIn, fanOut]) => {
    const std = schemeStd(scheme, fanIn, fanOut);
    return {
      w: Array.from({ length: fanOut }, () =>
        Array.from({ length: fanIn }, () => gauss() * std)
      ),
      b: Array.from({ length: fanOut }, () => 0),
    };
  });
}

function zerosNet(): Net {
  return layerDims().map(([fanIn, fanOut]) => ({
    w: Array.from({ length: fanOut }, () =>
      Array.from({ length: fanIn }, () => 0)
    ),
    b: Array.from({ length: fanOut }, () => 0),
  }));
}

// ── Dataset: two concentric rings, fixed and deterministic ──────────────────

export interface Sample {
  x: [number, number];
  y: 0 | 1;
}

export const INNER_RADIUS = 0.5;
export const OUTER_RADIUS = 1.0;
export const RING_NOISE = 0.08;

export function makeRings(
  n: number = DATA_N,
  seed: number = SEED + 1
): Sample[] {
  const rng = makeLcg(seed);
  const gauss = makeGaussian(rng);
  const out: Sample[] = [];
  for (let i = 0; i < n; i++) {
    const y = (i % 2) as 0 | 1;
    const angle = rng() * 2 * Math.PI;
    const radius =
      (y === 0 ? INNER_RADIUS : OUTER_RADIUS) + gauss() * RING_NOISE;
    out.push({
      x: [radius * Math.cos(angle), radius * Math.sin(angle)],
      y,
    });
  }
  return out;
}

export const RINGS: readonly Sample[] = makeRings();

// ── Core math ────────────────────────────────────────────────────────────────

export function actFn(a: Activation, z: number): number {
  return a === "tanh" ? Math.tanh(z) : Math.max(0, z);
}

/** Derivative of the activation, using pre and post values as available. */
export function actDeriv(a: Activation, pre: number, post: number): number {
  return a === "tanh" ? 1 - post * post : pre > 0 ? 1 : 0;
}

export function sigmoid(z: number): number {
  return z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
}

/** Numerically stable binary cross-entropy from the raw logit. */
export function bceFromLogit(z: number, y: number): number {
  return Math.max(z, 0) - z * y + Math.log(1 + Math.exp(-Math.abs(z)));
}

export interface ForwardCache {
  /** pres[l][j]: pre-activation of unit j in hidden layer l. */
  pres: number[][];
  /** posts[l][j]: post-activation of unit j in hidden layer l. */
  posts: number[][];
  logit: number;
}

export function forwardSample(
  net: Net,
  activation: Activation,
  x: readonly number[]
): ForwardCache {
  const pres: number[][] = [];
  const posts: number[][] = [];
  let input: readonly number[] = x;
  for (let l = 0; l < DEPTH; l++) {
    const { w, b } = net[l];
    const pre = b.map((bj, j) => {
      let s = bj;
      const row = w[j];
      for (let i = 0; i < row.length; i++) s += row[i] * input[i];
      return s;
    });
    const post = pre.map((z) => actFn(activation, z));
    pres.push(pre);
    posts.push(post);
    input = post;
  }
  const out = net[DEPTH];
  let logit = out.b[0];
  for (let i = 0; i < WIDTH; i++) logit += out.w[0][i] * input[i];
  return { pres, posts, logit };
}

// ── Statistics helpers ───────────────────────────────────────────────────────

export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

export function std(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  let s = 0;
  for (const v of values) s += (v - m) * (v - m);
  return Math.sqrt(s / values.length);
}

/** Bin counts of values over [lo, hi]; out-of-range values clamp to end bins. */
export function computeHistogram(
  values: readonly number[],
  lo: number,
  hi: number,
  bins: number = HIST_BINS
): number[] {
  const counts = new Array<number>(bins).fill(0);
  const span = Math.max(hi - lo, 1e-12);
  for (const v of values) {
    let idx = Math.floor(((v - lo) / span) * bins);
    if (idx < 0) idx = 0;
    if (idx >= bins) idx = bins - 1;
    counts[idx]++;
  }
  return counts;
}

// ── Signal-flow analysis: one real forward + backward pass on the batch ─────

export interface LayerSignal {
  /** Histogram bin counts of all post-activations in this layer (batch x units). */
  actHist: number[];
  /** Histogram bin counts of dL/d(pre-activation) in this layer. */
  gradHist: number[];
  actStd: number;
  actMean: number;
  /**
   * tanh: fraction of activations with |a| > TANH_SAT_THRESHOLD (saturated).
   * relu: fraction of activations equal to 0 (inactive).
   */
  inertFrac: number;
  gradStd: number;
}

export interface SignalAnalysis {
  layers: LayerSignal[];
  /** Shared activation histogram range across layers. */
  actRange: [number, number];
  /** Shared (symmetric) gradient histogram range across layers. */
  gradRange: [number, number];
  logitStd: number;
  /**
   * Backward amplification factor across the depth:
   * gradStd(layer 1) / gradStd(layer 6). Below 1 the gradient vanishes on
   * its way back, above 1 it explodes. NaN when layer 6 has zero gradient.
   */
  gradRatio: number;
}

/**
 * Initialize a fresh net with the scheme, run the full ring batch forward,
 * then backprop the per-example loss gradient (dL/dlogit = sigmoid(z) - y,
 * no 1/N factor) and collect per-layer activation and gradient values.
 */
export function analyzeSignal(
  scheme: Scheme,
  activation: Activation,
  seed: number = SEED,
  samples: readonly Sample[] = RINGS
): SignalAnalysis {
  const net = initNet(scheme, seed);
  const acts: number[][] = Array.from({ length: DEPTH }, () => []);
  const grads: number[][] = Array.from({ length: DEPTH }, () => []);
  const logits: number[] = [];

  for (const sample of samples) {
    const cache = forwardSample(net, activation, sample.x);
    logits.push(cache.logit);
    for (let l = 0; l < DEPTH; l++) acts[l].push(...cache.posts[l]);

    const dz = sigmoid(cache.logit) - sample.y;
    let dPost = net[DEPTH].w[0].map((wi) => wi * dz);
    for (let l = DEPTH - 1; l >= 0; l--) {
      const dPre = dPost.map(
        (d, j) => d * actDeriv(activation, cache.pres[l][j], cache.posts[l][j])
      );
      grads[l].push(...dPre);
      if (l > 0) {
        const w = net[l].w;
        const next = new Array<number>(w[0].length).fill(0);
        for (let j = 0; j < w.length; j++) {
          const row = w[j];
          const dj = dPre[j];
          for (let i = 0; i < row.length; i++) next[i] += row[i] * dj;
        }
        dPost = next;
      }
    }
  }

  const actLo = activation === "tanh" ? -1 : 0;
  let actHi = 1;
  if (activation === "relu") {
    for (const layer of acts) {
      for (const v of layer) if (v > actHi) actHi = v;
    }
  }
  let gradMax = 1e-12;
  for (const layer of grads) {
    for (const v of layer) {
      const a = Math.abs(v);
      if (a > gradMax) gradMax = a;
    }
  }

  const layers: LayerSignal[] = [];
  for (let l = 0; l < DEPTH; l++) {
    const a = acts[l];
    let inert = 0;
    for (const v of a) {
      if (activation === "tanh") {
        if (Math.abs(v) > TANH_SAT_THRESHOLD) inert++;
      } else if (v === 0) {
        inert++;
      }
    }
    layers.push({
      actHist: computeHistogram(a, actLo, actHi),
      gradHist: computeHistogram(grads[l], -gradMax, gradMax),
      actStd: std(a),
      actMean: mean(a),
      inertFrac: a.length > 0 ? inert / a.length : 0,
      gradStd: std(grads[l]),
    });
  }

  const first = layers[0].gradStd;
  const last = layers[DEPTH - 1].gradStd;
  const gradRatio = last > 0 ? first / last : NaN;

  return {
    layers,
    actRange: [actLo, actHi],
    gradRange: [-gradMax, gradMax],
    logitStd: std(logits),
    gradRatio,
  };
}

// ── Training race: five nets, identical except for initialization ───────────

export interface Runner {
  scheme: Scheme;
  net: Net;
  vel: Net;
  /**
   * losses[t] = full-batch BCE at the params seen at step t (computed during
   * that step's forward pass). One extra entry is appended at race completion
   * with the loss at the final params.
   */
  losses: number[];
  diverged: boolean;
  divergedAtStep: number | null;
}

export interface RaceState {
  activation: Activation;
  runners: Runner[];
  step: number;
}

export function datasetLoss(
  net: Net,
  activation: Activation,
  samples: readonly Sample[] = RINGS
): number {
  let s = 0;
  for (const sample of samples) {
    s += bceFromLogit(forwardSample(net, activation, sample.x).logit, sample.y);
  }
  return s / samples.length;
}

export function netAccuracy(
  net: Net,
  activation: Activation,
  samples: readonly Sample[] = RINGS
): number {
  let correct = 0;
  for (const sample of samples) {
    const p = forwardSample(net, activation, sample.x).logit > 0 ? 1 : 0;
    if (p === sample.y) correct++;
  }
  return correct / samples.length;
}

export function initRace(
  activation: Activation,
  seed: number = SEED
): RaceState {
  return {
    activation,
    step: 0,
    runners: SCHEMES.map((scheme) => ({
      scheme,
      net: initNet(scheme, seed),
      vel: zerosNet(),
      losses: [],
      diverged: false,
      divergedAtStep: null,
    })),
  };
}

/**
 * One full-batch gradient descent step with momentum on the mean BCE.
 * Returns the loss at the pre-update params. If that loss is not finite the
 * caller marks the runner diverged and no update is applied.
 */
export function trainStep(
  runner: Runner,
  activation: Activation,
  lr: number = LEARNING_RATE,
  momentum: number = MOMENTUM,
  samples: readonly Sample[] = RINGS
): number {
  const { net, vel } = runner;
  const N = samples.length;
  const grad = zerosNet();
  let lossSum = 0;

  for (const sample of samples) {
    const cache = forwardSample(net, activation, sample.x);
    lossSum += bceFromLogit(cache.logit, sample.y);
    const dz = (sigmoid(cache.logit) - sample.y) / N;

    const outIn = cache.posts[DEPTH - 1];
    grad[DEPTH].b[0] += dz;
    for (let i = 0; i < WIDTH; i++) grad[DEPTH].w[0][i] += dz * outIn[i];

    let dPost = net[DEPTH].w[0].map((wi) => wi * dz);
    for (let l = DEPTH - 1; l >= 0; l--) {
      const input: readonly number[] = l === 0 ? sample.x : cache.posts[l - 1];
      const dPre = dPost.map(
        (d, j) => d * actDeriv(activation, cache.pres[l][j], cache.posts[l][j])
      );
      const gl = grad[l];
      for (let j = 0; j < dPre.length; j++) {
        gl.b[j] += dPre[j];
        const row = gl.w[j];
        for (let i = 0; i < input.length; i++) row[i] += dPre[j] * input[i];
      }
      if (l > 0) {
        const w = net[l].w;
        const next = new Array<number>(w[0].length).fill(0);
        for (let j = 0; j < w.length; j++) {
          const row = w[j];
          const dj = dPre[j];
          for (let i = 0; i < row.length; i++) next[i] += row[i] * dj;
        }
        dPost = next;
      }
    }
  }

  const loss = lossSum / N;
  if (!Number.isFinite(loss)) return loss;

  for (let l = 0; l < net.length; l++) {
    const pl = net[l];
    const vl = vel[l];
    const gl = grad[l];
    for (let j = 0; j < pl.b.length; j++) {
      vl.b[j] = momentum * vl.b[j] - lr * gl.b[j];
      pl.b[j] += vl.b[j];
      const wRow = pl.w[j];
      const vRow = vl.w[j];
      const gRow = gl.w[j];
      for (let i = 0; i < wRow.length; i++) {
        vRow[i] = momentum * vRow[i] - lr * gRow[i];
        wRow[i] += vRow[i];
      }
    }
  }
  return loss;
}

export function raceFinished(state: RaceState): boolean {
  return (
    state.step >= RACE_STEPS || state.runners.every((r) => r.diverged)
  );
}

/** Advance the race up to nSteps steps, mutating state in place. */
export function raceChunk(state: RaceState, nSteps: number): void {
  for (let k = 0; k < nSteps && !raceFinished(state); k++) {
    for (const runner of state.runners) {
      if (runner.diverged) continue;
      const loss = trainStep(runner, state.activation);
      if (!Number.isFinite(loss)) {
        runner.diverged = true;
        runner.divergedAtStep = state.step;
        continue;
      }
      runner.losses.push(loss);
    }
    state.step++;
    if (state.step >= RACE_STEPS) {
      for (const runner of state.runners) {
        if (!runner.diverged) {
          runner.losses.push(datasetLoss(runner.net, state.activation));
        }
      }
    }
  }
}

export interface RunnerResult {
  scheme: Scheme;
  finalLoss: number;
  accuracy: number;
  diverged: boolean;
  divergedAtStep: number | null;
}

export function raceResults(state: RaceState): RunnerResult[] {
  return state.runners.map((r) => ({
    scheme: r.scheme,
    finalLoss: r.diverged
      ? NaN
      : r.losses.length > 0
        ? r.losses[r.losses.length - 1]
        : NaN,
    accuracy: r.diverged ? NaN : netAccuracy(r.net, state.activation),
    diverged: r.diverged,
    divergedAtStep: r.divergedAtStep,
  }));
}

/** Scheme with the lowest finite final loss, or null if every runner diverged. */
export function raceWinner(results: readonly RunnerResult[]): Scheme | null {
  let best: Scheme | null = null;
  let bestLoss = Infinity;
  for (const r of results) {
    if (!r.diverged && Number.isFinite(r.finalLoss) && r.finalLoss < bestLoss) {
      bestLoss = r.finalLoss;
      best = r.scheme;
    }
  }
  return best;
}

// ── Display formatting (shared, deterministic) ───────────────────────────────

/** Compact deterministic number formatting for stds and losses. */
export function fmtStat(v: number): string {
  if (!Number.isFinite(v)) return "n/a";
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 100) return v.toFixed(0);
  if (a >= 0.01) return v.toFixed(3);
  return v.toExponential(1);
}
