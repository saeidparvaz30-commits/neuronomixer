/**
 * Pure math for the residual-connections guide. No React imports.
 *
 * This module is the single source of every number the guide displays:
 * the per-layer gradient norms from a real backward pass through a deep
 * MLP built from two-layer blocks (with and without skip connections),
 * and the two networks trained live in the browser on the same toy
 * regression task.
 *
 * Block structure follows He et al. 2015 (arXiv:1512.03385): each block
 * computes f(h) = W2 tanh(W1 h + b1) + b2, ending in a LINEAR layer, and
 * the residual variant adds the identity: h_{l+1} = h_l + f(h_l). The
 * plain variant stacks the exact same blocks without the skip:
 * h_{l+1} = f(h_l). Both variants share identical weights when built
 * from the same seed; only the wiring differs.
 *
 * Everything is deterministic: all randomness flows from the seeded LCG
 * below (same constants as the guides SPEC), so re-running the experiment
 * reproduces identical numbers, and a verifier can recompute any figure
 * by executing these functions with node/tsx.
 */

// ---------------------------------------------------------------------------
// Deterministic PRNG (LCG constants from the guides SPEC, as a stream)
// ---------------------------------------------------------------------------

export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.s = (this.s * 1664525 + 1013904223) >>> 0;
    return this.s / 0x100000000;
  }

  /** Uniform float in [-r, r). */
  uniform(r: number): number {
    return (this.next() * 2 - 1) * r;
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Hidden width of every network in this guide. */
export const WIDTH = 12;

/** Depth slider range (number of blocks) for the gradient-flow lab. */
export const MIN_DEPTH = 2;
export const MAX_DEPTH = 30;
export const DEFAULT_DEPTH = 16;

/** Batch size used for the gradient-flow backward pass. */
export const GRAD_BATCH = 32;

/** Training-race configuration. */
export const TRAIN_DEPTH = 16;
export const TRAIN_STEPS = 2000;
export const TRAIN_LR = 0.005;
export const RECORD_EVERY = 10;
export const N_POINTS = 48;

export const GRAD_SEED = 90210417;
export const TRAIN_SEED = 40100777;

// ---------------------------------------------------------------------------
// Toy task: fit y = sin(3x) on a fixed grid over [-1, 1]
// ---------------------------------------------------------------------------

export function makeDataset(n: number): { xs: number[]; ys: number[] } {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = -1 + (2 * i) / (n - 1);
    xs.push(x);
    ys.push(Math.sin(3 * x));
  }
  return { xs, ys };
}

// ---------------------------------------------------------------------------
// Network: scalar in, `depth` blocks of width WIDTH, scalar out.
// Block:    f(h) = W2 tanh(W1 h + b1) + b2
// Plain:    h_{l+1} = f(h_l)
// Residual: h_{l+1} = h_l + f(h_l)
// ---------------------------------------------------------------------------

export interface Net {
  depth: number;
  width: number;
  residual: boolean;
  wIn: Float64Array; // [width], input embed: h0 = wIn * x + bIn
  bIn: Float64Array;
  Ws1: Float64Array[]; // per block, row-major [j * width + k]
  bs1: Float64Array[];
  Ws2: Float64Array[];
  bs2: Float64Array[];
  wOut: Float64Array; // [width], yhat = wOut . h_depth + bOut
  bOut: number;
}

/**
 * Block-weight init scale relative to the Xavier/Glorot bound. Slightly
 * below 1, so each block genuinely attenuates the backward signal (the
 * vanishing-gradient regime this guide is about). Disclosed in the UI.
 */
export const INIT_GAIN = 0.9;

/**
 * Xavier/Glorot uniform init (Glorot & Bengio 2010): r = sqrt(6/(fanIn+fanOut)),
 * with block weights scaled by `gain` (INIT_GAIN by default).
 */
export function createNet(
  depth: number,
  width: number,
  residual: boolean,
  seed: number,
  gain: number = INIT_GAIN
): Net {
  const rng = new Rng(seed);
  const rIn = Math.sqrt(6 / (1 + width));
  const rHid = gain * Math.sqrt(6 / (width + width));
  const rOut = Math.sqrt(6 / (width + 1));
  const wIn = new Float64Array(width);
  for (let j = 0; j < width; j++) wIn[j] = rng.uniform(rIn);
  const Ws1: Float64Array[] = [];
  const bs1: Float64Array[] = [];
  const Ws2: Float64Array[] = [];
  const bs2: Float64Array[] = [];
  for (let l = 0; l < depth; l++) {
    const W1 = new Float64Array(width * width);
    for (let i = 0; i < W1.length; i++) W1[i] = rng.uniform(rHid);
    const W2 = new Float64Array(width * width);
    for (let i = 0; i < W2.length; i++) W2[i] = rng.uniform(rHid);
    Ws1.push(W1);
    Ws2.push(W2);
    bs1.push(new Float64Array(width));
    bs2.push(new Float64Array(width));
  }
  const wOut = new Float64Array(width);
  for (let j = 0; j < width; j++) wOut[j] = rng.uniform(rOut);
  return {
    depth,
    width,
    residual,
    wIn,
    bIn: new Float64Array(width),
    Ws1,
    bs1,
    Ws2,
    bs2,
    wOut,
    bOut: 0,
  };
}

export interface Grads {
  wIn: Float64Array;
  bIn: Float64Array;
  Ws1: Float64Array[];
  bs1: Float64Array[];
  Ws2: Float64Array[];
  bs2: Float64Array[];
  wOut: Float64Array;
  bOut: number;
}

export function zeroGrads(net: Net): Grads {
  const sq = () => new Float64Array(net.width * net.width);
  const vec = () => new Float64Array(net.width);
  return {
    wIn: vec(),
    bIn: vec(),
    Ws1: net.Ws1.map(sq),
    bs1: net.bs1.map(vec),
    Ws2: net.Ws2.map(sq),
    bs2: net.bs2.map(vec),
    wOut: vec(),
    bOut: 0,
  };
}

/**
 * Full-batch forward + backward. Accumulates parameter gradients of the
 * mean-squared-error loss into `grads` and returns the loss. When
 * `hGradNormSq` is provided (length depth+1), accumulates the squared
 * norm of dLoss/dh_l per sample at every level l = 0..depth.
 */
export function forwardBackward(
  net: Net,
  xs: number[],
  ys: number[],
  grads: Grads,
  hGradNormSq?: Float64Array
): number {
  const { depth, width, residual, wIn, bIn, Ws1, bs1, Ws2, bs2, wOut } = net;
  const n = xs.length;
  const hs: Float64Array[] = [];
  const as: Float64Array[] = [];
  for (let l = 0; l <= depth; l++) hs.push(new Float64Array(width));
  for (let l = 0; l < depth; l++) as.push(new Float64Array(width));
  const dh = new Float64Array(width);
  const dhPrev = new Float64Array(width);
  const da = new Float64Array(width);
  const dz1 = new Float64Array(width);

  let loss = 0;
  for (let s = 0; s < n; s++) {
    const x = xs[s];
    // Forward
    const h0 = hs[0];
    for (let j = 0; j < width; j++) h0[j] = wIn[j] * x + bIn[j];
    for (let l = 0; l < depth; l++) {
      const W1 = Ws1[l];
      const b1 = bs1[l];
      const W2 = Ws2[l];
      const b2 = bs2[l];
      const hIn = hs[l];
      const a = as[l];
      const hOut = hs[l + 1];
      for (let j = 0; j < width; j++) {
        let z = b1[j];
        const base = j * width;
        for (let k = 0; k < width; k++) z += W1[base + k] * hIn[k];
        a[j] = Math.tanh(z);
      }
      for (let j = 0; j < width; j++) {
        let f = b2[j];
        const base = j * width;
        for (let k = 0; k < width; k++) f += W2[base + k] * a[k];
        hOut[j] = residual ? hIn[j] + f : f;
      }
    }
    const hLast = hs[depth];
    let yhat = net.bOut;
    for (let j = 0; j < width; j++) yhat += wOut[j] * hLast[j];
    const err = yhat - ys[s];
    loss += err * err;

    // Backward (of the mean loss: d(mean)/dyhat = 2 err / n)
    const dy = (2 * err) / n;
    grads.bOut += dy;
    for (let j = 0; j < width; j++) {
      grads.wOut[j] += dy * hLast[j];
      dh[j] = wOut[j] * dy;
    }
    if (hGradNormSq) {
      let sq = 0;
      for (let j = 0; j < width; j++) sq += dh[j] * dh[j];
      hGradNormSq[depth] += sq;
    }
    for (let l = depth - 1; l >= 0; l--) {
      const W1 = Ws1[l];
      const W2 = Ws2[l];
      const gW1 = grads.Ws1[l];
      const gb1 = grads.bs1[l];
      const gW2 = grads.Ws2[l];
      const gb2 = grads.bs2[l];
      const hIn = hs[l];
      const a = as[l];
      // df = dh (gradient wrt the block output f)
      for (let j = 0; j < width; j++) {
        gb2[j] += dh[j];
        const base = j * width;
        for (let k = 0; k < width; k++) gW2[base + k] += dh[j] * a[k];
      }
      // da = W2^T df, dz1 = da * (1 - a^2)
      for (let k = 0; k < width; k++) {
        let acc = 0;
        for (let j = 0; j < width; j++) acc += W2[j * width + k] * dh[j];
        da[k] = acc;
      }
      for (let j = 0; j < width; j++) {
        dz1[j] = da[j] * (1 - a[j] * a[j]);
        gb1[j] += dz1[j];
        const base = j * width;
        for (let k = 0; k < width; k++) gW1[base + k] += dz1[j] * hIn[k];
      }
      // dhPrev = W1^T dz1 (+ dh through the identity when residual)
      for (let k = 0; k < width; k++) {
        let acc = residual ? dh[k] : 0;
        for (let j = 0; j < width; j++) acc += W1[j * width + k] * dz1[j];
        dhPrev[k] = acc;
      }
      dh.set(dhPrev);
      if (hGradNormSq) {
        let sq = 0;
        for (let j = 0; j < width; j++) sq += dh[j] * dh[j];
        hGradNormSq[l] += sq;
      }
    }
    for (let j = 0; j < width; j++) {
      grads.wIn[j] += dh[j] * x;
      grads.bIn[j] += dh[j];
    }
  }
  return loss / n;
}

export function applyGrads(net: Net, grads: Grads, lr: number): void {
  const { width, depth } = net;
  for (let j = 0; j < width; j++) {
    net.wIn[j] -= lr * grads.wIn[j];
    net.bIn[j] -= lr * grads.bIn[j];
    net.wOut[j] -= lr * grads.wOut[j];
  }
  net.bOut -= lr * grads.bOut;
  for (let l = 0; l < depth; l++) {
    const W1 = net.Ws1[l];
    const gW1 = grads.Ws1[l];
    const W2 = net.Ws2[l];
    const gW2 = grads.Ws2[l];
    for (let i = 0; i < W1.length; i++) {
      W1[i] -= lr * gW1[i];
      W2[i] -= lr * gW2[i];
    }
    const b1 = net.bs1[l];
    const gb1 = grads.bs1[l];
    const b2 = net.bs2[l];
    const gb2 = grads.bs2[l];
    for (let j = 0; j < width; j++) {
      b1[j] -= lr * gb1[j];
      b2[j] -= lr * gb2[j];
    }
  }
}

// ---------------------------------------------------------------------------
// Gradient-flow lab: one real backward pass, per-layer gradient norms
// ---------------------------------------------------------------------------

export interface GradientFlowResult {
  /**
   * RMS-per-sample norm of dLoss/dh_l for each level l = 0..depth:
   * the gradient signal that reaches the input side of block l.
   */
  hGradNorms: number[];
  /** Loss of the freshly initialized network on the fixed batch. */
  loss: number;
  /** hGradNorms[0] / hGradNorms[depth]: input-side vs output-side signal. */
  bottomOverTop: number;
}

/**
 * Builds a fresh Xavier-initialized network of the given depth (identical
 * weights for both variants: same seed), runs one full forward + backward
 * pass on the fixed 32-point batch, and reports the per-layer gradient
 * norms. No training happens here; this is the gradient a first SGD step
 * would use.
 */
export function computeGradientFlow(
  depth: number,
  residual: boolean
): GradientFlowResult {
  const net = createNet(depth, WIDTH, residual, GRAD_SEED);
  const { xs, ys } = makeDataset(GRAD_BATCH);
  const grads = zeroGrads(net);
  const hSq = new Float64Array(depth + 1);
  const loss = forwardBackward(net, xs, ys, grads, hSq);
  const hGradNorms: number[] = [];
  for (let l = 0; l <= depth; l++) hGradNorms.push(Math.sqrt(hSq[l] / GRAD_BATCH));
  const top = hGradNorms[depth];
  return {
    hGradNorms,
    loss,
    bottomOverTop: top > 0 ? hGradNorms[0] / top : 0,
  };
}

// ---------------------------------------------------------------------------
// Training race: identical init, identical data, skip connections on/off
// ---------------------------------------------------------------------------

export interface LossPoint {
  step: number;
  loss: number;
}

export interface TrainState {
  plain: Net;
  res: Net;
  xs: number[];
  ys: number[];
  step: number;
  total: number;
  plainCurve: LossPoint[];
  resCurve: LossPoint[];
  plainLoss: number;
  resLoss: number;
}

export function initTrainState(): TrainState {
  const { xs, ys } = makeDataset(N_POINTS);
  return {
    plain: createNet(TRAIN_DEPTH, WIDTH, false, TRAIN_SEED),
    res: createNet(TRAIN_DEPTH, WIDTH, true, TRAIN_SEED),
    xs,
    ys,
    step: 0,
    total: TRAIN_STEPS,
    plainCurve: [],
    resCurve: [],
    plainLoss: NaN,
    resLoss: NaN,
  };
}

function gdStep(net: Net, xs: number[], ys: number[], lr: number): number {
  const grads = zeroGrads(net);
  const loss = forwardBackward(net, xs, ys, grads);
  applyGrads(net, grads, lr);
  return loss;
}

/** Advance full-batch gradient descent by up to `n` steps on BOTH nets. */
export function trainChunk(st: TrainState, n: number): void {
  for (let k = 0; k < n && st.step < st.total; k++) {
    const lp = gdStep(st.plain, st.xs, st.ys, TRAIN_LR);
    const lr = gdStep(st.res, st.xs, st.ys, TRAIN_LR);
    if (st.step % RECORD_EVERY === 0) {
      st.plainCurve.push({ step: st.step, loss: lp });
      st.resCurve.push({ step: st.step, loss: lr });
    }
    st.plainLoss = lp;
    st.resLoss = lr;
    st.step++;
  }
  if (st.step >= st.total) {
    const last = st.plainCurve[st.plainCurve.length - 1];
    if (!last || last.step !== st.step - 1) {
      st.plainCurve.push({ step: st.step - 1, loss: st.plainLoss });
      st.resCurve.push({ step: st.step - 1, loss: st.resLoss });
    }
  }
}

export function isTrainDone(st: TrainState): boolean {
  return st.step >= st.total;
}

/** Model prediction yhat(x) on a grid, for plotting the learned fit. */
export function predictCurve(net: Net, nPts: number): { x: number; y: number }[] {
  const { width, depth, residual } = net;
  const out: { x: number; y: number }[] = [];
  const h = new Float64Array(width);
  const a = new Float64Array(width);
  const hNext = new Float64Array(width);
  for (let i = 0; i < nPts; i++) {
    const x = -1 + (2 * i) / (nPts - 1);
    for (let j = 0; j < width; j++) h[j] = net.wIn[j] * x + net.bIn[j];
    for (let l = 0; l < depth; l++) {
      const W1 = net.Ws1[l];
      const b1 = net.bs1[l];
      const W2 = net.Ws2[l];
      const b2 = net.bs2[l];
      for (let j = 0; j < width; j++) {
        let z = b1[j];
        const base = j * width;
        for (let k = 0; k < width; k++) z += W1[base + k] * h[k];
        a[j] = Math.tanh(z);
      }
      for (let j = 0; j < width; j++) {
        let f = b2[j];
        const base = j * width;
        for (let k = 0; k < width; k++) f += W2[base + k] * a[k];
        hNext[j] = residual ? h[j] + f : f;
      }
      h.set(hNext);
    }
    let yhat = net.bOut;
    for (let j = 0; j < width; j++) yhat += net.wOut[j] * h[j];
    out.push({ x, y: yhat });
  }
  return out;
}
