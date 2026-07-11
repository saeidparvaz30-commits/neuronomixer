/**
 * Pure VAE math for the variational-autoencoders guide. No React imports.
 *
 * This module is the single source of every number the guide displays:
 * the visible dataset, encoder means and log-variances, reparameterized
 * samples, decoder reconstructions, per-epoch training ELBO terms, the
 * post-training reconstruction / KL metrics per beta, the latent-space
 * embeddings, and the parameter counters. A verifier can recompute all
 * of them by executing these functions with node/tsx.
 *
 * The toy setup: a real VAE over 8x8 grayscale images.
 *   - encoder: 64 -> 16 (tanh) -> mu (2), logvar (2)
 *   - reparameterization: z = mu + exp(0.5 * logvar) * eps, eps ~ N(0, I)
 *     drawn with Box-Muller from the deterministic LCG stream
 *   - decoder: 2 -> 16 (tanh) -> 64 (sigmoid)
 *   - loss per image: BCE(x, xhat) + beta * KL( N(mu, sigma^2) || N(0, I) )
 * Trained in the browser with Adam on minibatches of the visible dataset,
 * once per beta value in BETAS, from fixed seeds, so every re-run
 * reproduces the same numbers exactly.
 */

// ── Architecture constants ──────────────────────────────────────────────────

export const IMG_SIZE = 8;
export const PIX = IMG_SIZE * IMG_SIZE; // 64
export const HIDDEN = 16;
export const LATENT = 2;

/** The betas the guide trains at. The UI slider snaps between these. */
export const BETAS: readonly number[] = [0.05, 1, 4];
export const DEFAULT_BETA_INDEX = 1;

/** Deterministic per-beta init seed (index into BETAS). */
export function betaSeed(betaIndex: number): number {
  return INIT_SEED + betaIndex * 7919;
}

/** Training settings (tuned on the fixed dataset, verified via tsx). */
export const EPOCHS_PER_BETA = 160;
export const BATCH_SIZE = 30;
export const LEARNING_RATE = 0.01;
export const ADAM_B1 = 0.9;
export const ADAM_B2 = 0.999;
export const ADAM_EPS = 1e-8;

/** Deterministic seeds. */
export const DATA_SEED = 424242;
export const INIT_SEED = 20260710;

/** Dataset shape families. */
export const SAMPLES_PER_CLASS = 60;
export const NUM_CLASSES = 3;
export const CLASS_NAMES: readonly string[] = ["blob", "cross", "ring"];

/** Interpolation frame positions along the A to B segment. */
export const FRAME_TS: readonly number[] = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1];

// ── Deterministic pseudo-random stream (SPEC LCG, no Math.random) ───────────

export interface RngState {
  s: number;
}

export function makeRng(seed: number): RngState {
  return { s: seed >>> 0 };
}

export function rngNext(rng: RngState): number {
  rng.s = (rng.s * 1664525 + 1013904223) >>> 0;
  return rng.s / 0xffffffff;
}

/** Standard normal sample via Box-Muller on the LCG stream. */
export function rngGauss(rng: RngState): number {
  const u1 = Math.max(1e-12, 1 - rngNext(rng));
  const u2 = rngNext(rng);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ── Dataset: three soft shape families on an 8x8 canvas ─────────────────────

export interface Sample {
  /** 64 pixel intensities in [0, 1], row-major, quantized to 3 decimals. */
  x: number[];
  /** 0 = blob, 1 = cross, 2 = ring. */
  cls: number;
  /** Shape center used to draw the image (for display only). */
  cx: number;
  cy: number;
}

function shapeIntensity(
  cls: number,
  px: number,
  py: number,
  cx: number,
  cy: number
): number {
  if (cls === 0) {
    // Soft filled blob.
    const d2 = (px - cx) ** 2 + (py - cy) ** 2;
    return Math.exp(-d2 / (2 * 1.2 * 1.2));
  }
  if (cls === 1) {
    // Plus sign: two soft bars with a soft length cutoff.
    const v =
      Math.exp(
        -((px - cx) ** 2) / (2 * 0.45 * 0.45) -
          Math.max(0, Math.abs(py - cy) - 2.2) ** 2 / (2 * 0.6 * 0.6)
      );
    const h =
      Math.exp(
        -((py - cy) ** 2) / (2 * 0.45 * 0.45) -
          Math.max(0, Math.abs(px - cx) - 2.2) ** 2 / (2 * 0.6 * 0.6)
      );
    return Math.max(v, h);
  }
  // Soft ring of radius 2.1.
  const d = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  return Math.exp(-((d - 2.1) ** 2) / (2 * 0.55 * 0.55));
}

export function renderShape(cls: number, cx: number, cy: number): number[] {
  const x: number[] = [];
  for (let r = 0; r < IMG_SIZE; r++) {
    for (let c = 0; c < IMG_SIZE; c++) {
      const v = shapeIntensity(cls, c + 0.5, r + 0.5, cx, cy);
      x.push(Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000);
    }
  }
  return x;
}

/**
 * The fixed visible dataset: SAMPLES_PER_CLASS images per class, centers
 * LCG-sampled in [2.7, 5.3]^2 and quantized, so SSR and client agree.
 */
export function makeDataset(): Sample[] {
  const rng = makeRng(DATA_SEED);
  const samples: Sample[] = [];
  for (let cls = 0; cls < NUM_CLASSES; cls++) {
    for (let i = 0; i < SAMPLES_PER_CLASS; i++) {
      const cx = Math.round((2.7 + rngNext(rng) * 2.6) * 100) / 100;
      const cy = Math.round((2.7 + rngNext(rng) * 2.6) * 100) / 100;
      samples.push({ x: renderShape(cls, cx, cy), cls, cx, cy });
    }
  }
  return samples;
}

export const DATASET: readonly Sample[] = makeDataset();

// ── Parameters ──────────────────────────────────────────────────────────────

export interface VAEParams {
  /** Encoder: HIDDEN x PIX, HIDDEN. */
  We: number[][];
  be: number[];
  /** Posterior head: LATENT x HIDDEN, LATENT (mean and log-variance). */
  Wmu: number[][];
  bmu: number[];
  Wlv: number[][];
  blv: number[];
  /** Decoder: HIDDEN x LATENT, HIDDEN, then PIX x HIDDEN, PIX. */
  Wd: number[][];
  bd: number[];
  Wo: number[][];
  bo: number[];
}

function mat(rows: number, cols: number, fill: () => number): number[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, fill)
  );
}

function vec(n: number, fill: () => number): number[] {
  return Array.from({ length: n }, fill);
}

/**
 * Xavier-style uniform init, limit sqrt(6 / (fanIn + fanOut))
 * (Glorot and Bengio, 2010). Biases start at zero.
 */
export function initParams(seed: number = INIT_SEED): VAEParams {
  const rng = makeRng(seed);
  const u = (fanIn: number, fanOut: number) => {
    const lim = Math.sqrt(6 / (fanIn + fanOut));
    return () => (rngNext(rng) * 2 - 1) * lim;
  };
  return {
    We: mat(HIDDEN, PIX, u(PIX, HIDDEN)),
    be: vec(HIDDEN, () => 0),
    Wmu: mat(LATENT, HIDDEN, u(HIDDEN, LATENT)),
    bmu: vec(LATENT, () => 0),
    Wlv: mat(LATENT, HIDDEN, u(HIDDEN, LATENT)),
    blv: vec(LATENT, () => 0),
    Wd: mat(HIDDEN, LATENT, u(LATENT, HIDDEN)),
    bd: vec(HIDDEN, () => 0),
    Wo: mat(PIX, HIDDEN, u(HIDDEN, PIX)),
    bo: vec(PIX, () => 0),
  };
}

function zerosLike(p: VAEParams): VAEParams {
  return {
    We: p.We.map((r) => r.map(() => 0)),
    be: p.be.map(() => 0),
    Wmu: p.Wmu.map((r) => r.map(() => 0)),
    bmu: p.bmu.map(() => 0),
    Wlv: p.Wlv.map((r) => r.map(() => 0)),
    blv: p.blv.map(() => 0),
    Wd: p.Wd.map((r) => r.map(() => 0)),
    bd: p.bd.map(() => 0),
    Wo: p.Wo.map((r) => r.map(() => 0)),
    bo: p.bo.map(() => 0),
  };
}

// ── Forward passes ──────────────────────────────────────────────────────────

export interface EncodeOut {
  h: number[];
  mu: number[];
  logvar: number[];
}

export function encode(p: VAEParams, x: readonly number[]): EncodeOut {
  const h = p.be.map((b, j) => {
    let s = b;
    const row = p.We[j];
    for (let i = 0; i < PIX; i++) s += row[i] * x[i];
    return Math.tanh(s);
  });
  const mu = p.bmu.map((b, k) => {
    let s = b;
    const row = p.Wmu[k];
    for (let j = 0; j < HIDDEN; j++) s += row[j] * h[j];
    return s;
  });
  const logvar = p.blv.map((b, k) => {
    let s = b;
    const row = p.Wlv[k];
    for (let j = 0; j < HIDDEN; j++) s += row[j] * h[j];
    return s;
  });
  return { h, mu, logvar };
}

export interface DecodeOut {
  hd: number[];
  /** 64 sigmoid outputs in (0, 1). */
  y: number[];
}

export function decode(p: VAEParams, z: readonly number[]): DecodeOut {
  const hd = p.bd.map((b, j) => {
    let s = b;
    const row = p.Wd[j];
    for (let k = 0; k < LATENT; k++) s += row[k] * z[k];
    return Math.tanh(s);
  });
  const y = p.bo.map((b, i) => {
    let s = b;
    const row = p.Wo[i];
    for (let j = 0; j < HIDDEN; j++) s += row[j] * hd[j];
    return 1 / (1 + Math.exp(-s));
  });
  return { hd, y };
}

// ── Loss terms ──────────────────────────────────────────────────────────────

const CLAMP = 1e-7;

/** Binary cross-entropy summed over the 64 pixels (nats per image). */
export function bceLoss(x: readonly number[], y: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < PIX; i++) {
    const yi = Math.min(1 - CLAMP, Math.max(CLAMP, y[i]));
    s += -(x[i] * Math.log(yi) + (1 - x[i]) * Math.log(1 - yi));
  }
  return s;
}

/** KL( N(mu, sigma^2) || N(0, I) ) summed over latent dims (nats per image). */
export function klLoss(mu: readonly number[], logvar: readonly number[]): number {
  let s = 0;
  for (let k = 0; k < LATENT; k++) {
    s += -0.5 * (1 + logvar[k] - mu[k] * mu[k] - Math.exp(logvar[k]));
  }
  return s;
}

// ── Training (Adam on minibatches, fully deterministic) ─────────────────────

export interface TrainerState {
  params: VAEParams;
  m: VAEParams;
  v: VAEParams;
  /** Adam step counter. */
  t: number;
  rng: RngState;
  epoch: number;
  beta: number;
  /** Per-epoch mean training ELBO terms (sampled z). */
  history: { recon: number; kl: number }[];
}

export function createTrainer(beta: number, seed: number): TrainerState {
  const params = initParams(seed);
  return {
    params,
    m: zerosLike(params),
    v: zerosLike(params),
    t: 0,
    rng: makeRng(seed + 1),
    epoch: 0,
    beta,
    history: [],
  };
}

function adamMat(
  w: number[][],
  g: number[][],
  m: number[][],
  v: number[][],
  t: number
): void {
  const c1 = 1 - Math.pow(ADAM_B1, t);
  const c2 = 1 - Math.pow(ADAM_B2, t);
  for (let i = 0; i < w.length; i++) {
    for (let j = 0; j < w[i].length; j++) {
      m[i][j] = ADAM_B1 * m[i][j] + (1 - ADAM_B1) * g[i][j];
      v[i][j] = ADAM_B2 * v[i][j] + (1 - ADAM_B2) * g[i][j] * g[i][j];
      w[i][j] -= (LEARNING_RATE * (m[i][j] / c1)) / (Math.sqrt(v[i][j] / c2) + ADAM_EPS);
    }
  }
}

function adamVec(
  w: number[],
  g: number[],
  m: number[],
  v: number[],
  t: number
): void {
  const c1 = 1 - Math.pow(ADAM_B1, t);
  const c2 = 1 - Math.pow(ADAM_B2, t);
  for (let i = 0; i < w.length; i++) {
    m[i] = ADAM_B1 * m[i] + (1 - ADAM_B1) * g[i];
    v[i] = ADAM_B2 * v[i] + (1 - ADAM_B2) * g[i] * g[i];
    w[i] -= (LEARNING_RATE * (m[i] / c1)) / (Math.sqrt(v[i] / c2) + ADAM_EPS);
  }
}

/**
 * Run n training epochs, mutating the trainer state in place.
 * Each epoch: deterministic Fisher-Yates shuffle, then one Adam step per
 * minibatch on the gradient of mean(BCE + beta * KL) with reparameterized z.
 *
 * CAUTION: `idx` restarts from the identity permutation on every CALL while
 * the RNG stream persists in `st`, so results depend on call granularity:
 * runEpochs(st, d, 160) and 20 calls of runEpochs(st, d, 8) produce
 * different (both deterministic) trajectories. The client trains in
 * 8-epoch chunks; changing its chunk size changes every displayed metric.
 */
export function runEpochs(
  st: TrainerState,
  dataset: readonly Sample[] = DATASET,
  n: number = 1
): void {
  const N = dataset.length;
  const idx = Array.from({ length: N }, (_, i) => i);
  const p = st.params;

  for (let e = 0; e < n; e++) {
    // Deterministic shuffle.
    for (let i = N - 1; i > 0; i--) {
      const j = Math.floor(rngNext(st.rng) * (i + 1));
      const tmp = idx[i];
      idx[i] = idx[j];
      idx[j] = tmp;
    }

    let epochRecon = 0;
    let epochKl = 0;

    for (let b0 = 0; b0 < N; b0 += BATCH_SIZE) {
      const bEnd = Math.min(N, b0 + BATCH_SIZE);
      const B = bEnd - b0;
      const g = zerosLike(p);

      for (let bi = b0; bi < bEnd; bi++) {
        const { x } = dataset[idx[bi]];

        // Forward.
        const { h, mu, logvar } = encode(p, x);
        const eps = [rngGauss(st.rng), rngGauss(st.rng)];
        const sigma = logvar.map((lv) => Math.exp(0.5 * lv));
        const z = mu.map((m0, k) => m0 + sigma[k] * eps[k]);
        const { hd, y } = decode(p, z);

        epochRecon += bceLoss(x, y);
        epochKl += klLoss(mu, logvar);

        const scale = 1 / B;

        // Backward: BCE with sigmoid output gives dLogit = y - x.
        const dLogit = y.map((yi, i) => (yi - x[i]) * scale);
        const dHd = new Array<number>(HIDDEN).fill(0);
        for (let i = 0; i < PIX; i++) {
          const d = dLogit[i];
          g.bo[i] += d;
          const gRow = g.Wo[i];
          const wRow = p.Wo[i];
          for (let j = 0; j < HIDDEN; j++) {
            gRow[j] += d * hd[j];
            dHd[j] += d * wRow[j];
          }
        }
        const dz = new Array<number>(LATENT).fill(0);
        for (let j = 0; j < HIDDEN; j++) {
          const d = dHd[j] * (1 - hd[j] * hd[j]);
          g.bd[j] += d;
          for (let k = 0; k < LATENT; k++) {
            g.Wd[j][k] += d * z[k];
            dz[k] += d * p.Wd[j][k];
          }
        }

        // Reparameterization: z = mu + sigma * eps, so the reconstruction
        // gradient flows into mu directly and into logvar through sigma.
        // KL adds beta * mu and beta * 0.5 * (e^logvar - 1).
        const dMu = mu.map((m0, k) => dz[k] + st.beta * m0 * scale);
        const dLv = logvar.map(
          (lv, k) =>
            dz[k] * eps[k] * 0.5 * sigma[k] +
            st.beta * 0.5 * (Math.exp(lv) - 1) * scale
        );

        const dH = new Array<number>(HIDDEN).fill(0);
        for (let k = 0; k < LATENT; k++) {
          g.bmu[k] += dMu[k];
          g.blv[k] += dLv[k];
          for (let j = 0; j < HIDDEN; j++) {
            g.Wmu[k][j] += dMu[k] * h[j];
            g.Wlv[k][j] += dLv[k] * h[j];
            dH[j] += dMu[k] * p.Wmu[k][j] + dLv[k] * p.Wlv[k][j];
          }
        }
        for (let j = 0; j < HIDDEN; j++) {
          const d = dH[j] * (1 - h[j] * h[j]);
          g.be[j] += d;
          const gRow = g.We[j];
          for (let i = 0; i < PIX; i++) gRow[i] += d * x[i];
        }
      }

      // One Adam step per minibatch.
      st.t += 1;
      adamMat(p.We, g.We, st.m.We, st.v.We, st.t);
      adamVec(p.be, g.be, st.m.be, st.v.be, st.t);
      adamMat(p.Wmu, g.Wmu, st.m.Wmu, st.v.Wmu, st.t);
      adamVec(p.bmu, g.bmu, st.m.bmu, st.v.bmu, st.t);
      adamMat(p.Wlv, g.Wlv, st.m.Wlv, st.v.Wlv, st.t);
      adamVec(p.blv, g.blv, st.m.blv, st.v.blv, st.t);
      adamMat(p.Wd, g.Wd, st.m.Wd, st.v.Wd, st.t);
      adamVec(p.bd, g.bd, st.m.bd, st.v.bd, st.t);
      adamMat(p.Wo, g.Wo, st.m.Wo, st.v.Wo, st.t);
      adamVec(p.bo, g.bo, st.m.bo, st.v.bo, st.t);
    }

    st.epoch += 1;
    st.history.push({
      recon: epochRecon / N,
      kl: epochKl / N,
    });
  }
}

// ── Evaluation (deterministic: z = mu, no sampling noise) ───────────────────

export interface EvalMetrics {
  /** Mean BCE reconstruction loss, nats per image. */
  bce: number;
  /** Mean squared error per pixel. */
  mse: number;
  /** Mean KL divergence to the prior, nats per image. */
  kl: number;
}

export function evalMetrics(
  p: VAEParams,
  dataset: readonly Sample[] = DATASET
): EvalMetrics {
  let bce = 0;
  let mse = 0;
  let kl = 0;
  for (const { x } of dataset) {
    const { mu, logvar } = encode(p, x);
    const { y } = decode(p, mu);
    bce += bceLoss(x, y);
    kl += klLoss(mu, logvar);
    for (let i = 0; i < PIX; i++) mse += (y[i] - x[i]) ** 2;
  }
  const N = dataset.length;
  return { bce: bce / N, mse: mse / (N * PIX), kl: kl / N };
}

export interface EmbeddedPoint {
  mu: [number, number];
  cls: number;
}

/** Encoder means for every dataset image: the latent-space scatter. */
export function embedDataset(
  p: VAEParams,
  dataset: readonly Sample[] = DATASET
): EmbeddedPoint[] {
  return dataset.map(({ x, cls }) => {
    const { mu } = encode(p, x);
    return { mu: [mu[0], mu[1]], cls };
  });
}

/** Symmetric canvas range covering the embeddings, at least the prior's 3 sigma. */
export function latentRange(points: readonly EmbeddedPoint[]): number {
  let maxAbs = 0;
  for (const pt of points) {
    maxAbs = Math.max(maxAbs, Math.abs(pt.mu[0]), Math.abs(pt.mu[1]));
  }
  return Math.max(3, Math.ceil(maxAbs * 1.15 * 10) / 10);
}

// ── Parameter counters (all displayed counts come from here) ────────────────

export function encoderParamCount(): number {
  return (
    PIX * HIDDEN + HIDDEN + 2 * (HIDDEN * LATENT + LATENT)
  );
}

export function decoderParamCount(): number {
  return LATENT * HIDDEN + HIDDEN + HIDDEN * PIX + PIX;
}

export function totalParamCount(): number {
  return encoderParamCount() + decoderParamCount();
}

// ── Convenience for verification via tsx ────────────────────────────────────

export function trainFull(
  beta: number,
  seed: number,
  epochs: number = EPOCHS_PER_BETA
): TrainerState {
  const st = createTrainer(beta, seed);
  runEpochs(st, DATASET, epochs);
  return st;
}
