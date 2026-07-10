/**
 * Pure math for the chain-of-thought guide. No React imports.
 *
 * This module is the single source of every number the guide displays:
 * the analytic compounding curves, the two tiny neural networks trained
 * live in the browser (a direct one-shot adder and a per-column
 * scratchpad adder), their measured exact-match accuracies on a held-out
 * test set, and the per-step probabilities shown in the trace panel.
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

  /** Uniform integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
}

// ---------------------------------------------------------------------------
// Task constants
// ---------------------------------------------------------------------------

/** Maximum operand length in digits. */
export const MAX_LEN = 5;
/** Answer length: sum of two MAX_LEN-digit numbers has at most MAX_LEN+1 digits. */
export const SUM_LEN = MAX_LEN + 1;
/** Held-out test problems per length. */
export const TEST_PER_LENGTH = 200;
/** Assumed tokens written per scratchpad step (illustrative, disclosed in UI). */
export const TOKENS_PER_STEP = 12;

export const DIRECT_HIDDEN = 64;
export const STEP_HIDDEN = 32;
export const DIRECT_SAMPLES = 60000;
export const STEP_SAMPLES = 30000;

export const TRAIN_SEED = 305419896;
export const EVAL_SEED = 777000111;
export const TRACE_SEED = 424242;

// ---------------------------------------------------------------------------
// Analytic compounding model (a model, not a measurement; disclosed in UI)
// ---------------------------------------------------------------------------

/** Probability that a chain of `steps` independent steps, each succeeding
 *  with probability p, is entirely correct: p^steps. */
export function chainSuccess(p: number, steps: number): number {
  return Math.pow(p, steps);
}

/** chainSuccess(p, n) for n = 1..maxSteps. */
export function chainCurve(p: number, maxSteps: number): number[] {
  const out: number[] = [];
  for (let n = 1; n <= maxSteps; n++) out.push(chainSuccess(p, n));
  return out;
}

/** Output tokens for an n-digit answer with no scratchpad: just the digits. */
export function directTokens(n: number): number {
  return n + 1;
}

/** Output tokens with a scratchpad: one written step per column plus the answer. */
export function cotTokens(n: number): number {
  return n * TOKENS_PER_STEP + (n + 1);
}

// ---------------------------------------------------------------------------
// Addition problems (digit arrays, least-significant digit first)
// ---------------------------------------------------------------------------

export interface Problem {
  /** Operand digits, LSB first, padded with zeros to MAX_LEN. */
  a: number[];
  b: number[];
  /** True operand length in digits (1..MAX_LEN). */
  len: number;
  /** True sum digits, LSB first, padded to SUM_LEN. */
  sum: number[];
}

/** One column of long addition: digit + digit + carry-in. */
export function addColumn(
  da: number,
  db: number,
  cin: number
): { digit: number; carry: number } {
  const t = da + db + cin;
  return { digit: t % 10, carry: t >= 10 ? 1 : 0 };
}

function randomOperand(rng: Rng, len: number): number[] {
  const d = new Array<number>(MAX_LEN).fill(0);
  for (let i = 0; i < len; i++) d[i] = rng.int(10);
  if (len > 1) d[len - 1] = 1 + rng.int(9);
  return d;
}

export function makeProblem(rng: Rng, len: number): Problem {
  const a = randomOperand(rng, len);
  const b = randomOperand(rng, len);
  const sum = new Array<number>(SUM_LEN).fill(0);
  let cin = 0;
  for (let i = 0; i < MAX_LEN; i++) {
    const { digit, carry } = addColumn(a[i], b[i], cin);
    sum[i] = digit;
    cin = carry;
  }
  sum[MAX_LEN] = cin;
  return { a, b, len, sum };
}

/** Format an LSB-first digit array as a decimal string (no leading zeros). */
export function digitsToString(digits: number[]): string {
  let hi = digits.length - 1;
  while (hi > 0 && digits[hi] === 0) hi--;
  let s = "";
  for (let i = hi; i >= 0; i--) s += String(digits[i]);
  return s;
}

// ---------------------------------------------------------------------------
// Tiny MLP with multi-head softmax output (sparse one-hot inputs)
// ---------------------------------------------------------------------------

export interface Mlp {
  nIn: number;
  nHidden: number;
  /** Sizes of the softmax groups the output layer is partitioned into. */
  heads: number[];
  /** Cumulative offsets of each head within the output vector. */
  offsets: number[];
  nOut: number;
  w1: Float32Array; // [nIn x nHidden], row-major by input index
  b1: Float32Array;
  w2: Float32Array; // [nHidden x nOut], row-major by hidden index
  b2: Float32Array;
}

export function createMlp(
  nIn: number,
  nHidden: number,
  heads: number[],
  rng: Rng
): Mlp {
  const nOut = heads.reduce((a, b) => a + b, 0);
  const offsets: number[] = [];
  let acc = 0;
  for (const h of heads) {
    offsets.push(acc);
    acc += h;
  }
  const w1 = new Float32Array(nIn * nHidden);
  const w2 = new Float32Array(nHidden * nOut);
  const r1 = Math.sqrt(6 / (nIn + nHidden));
  const r2 = Math.sqrt(6 / (nHidden + nOut));
  for (let i = 0; i < w1.length; i++) w1[i] = (rng.next() * 2 - 1) * r1;
  for (let i = 0; i < w2.length; i++) w2[i] = (rng.next() * 2 - 1) * r2;
  return {
    nIn,
    nHidden,
    heads,
    offsets,
    nOut,
    w1,
    b1: new Float32Array(nHidden),
    w2,
    b2: new Float32Array(nOut),
  };
}

export interface TrainBuf {
  z1: Float32Array;
  h: Float32Array;
  z2: Float32Array; // logits, converted to probs, then to gradient in place
  dh: Float32Array;
}

export function makeBuf(m: Mlp): TrainBuf {
  return {
    z1: new Float32Array(m.nHidden),
    h: new Float32Array(m.nHidden),
    z2: new Float32Array(m.nOut),
    dh: new Float32Array(m.nHidden),
  };
}

function forwardInto(m: Mlp, active: number[], buf: TrainBuf): void {
  const { z1, h, z2 } = buf;
  const nH = m.nHidden;
  z1.set(m.b1);
  for (let k = 0; k < active.length; k++) {
    const base = active[k] * nH;
    for (let j = 0; j < nH; j++) z1[j] += m.w1[base + j];
  }
  for (let j = 0; j < nH; j++) h[j] = z1[j] > 0 ? z1[j] : 0;
  z2.set(m.b2);
  for (let j = 0; j < nH; j++) {
    const hj = h[j];
    if (hj === 0) continue;
    const base = j * m.nOut;
    for (let k = 0; k < m.nOut; k++) z2[k] += hj * m.w2[base + k];
  }
}

/** Softmax each head of buf.z2 in place. */
function softmaxHeads(m: Mlp, z2: Float32Array): void {
  for (let hIdx = 0; hIdx < m.heads.length; hIdx++) {
    const off = m.offsets[hIdx];
    const size = m.heads[hIdx];
    let max = -Infinity;
    for (let k = 0; k < size; k++) if (z2[off + k] > max) max = z2[off + k];
    let sum = 0;
    for (let k = 0; k < size; k++) {
      const e = Math.exp(z2[off + k] - max);
      z2[off + k] = e;
      sum += e;
    }
    for (let k = 0; k < size; k++) z2[off + k] /= sum;
  }
}

/**
 * One SGD step on a single example. Returns the summed cross-entropy loss
 * over the heads. `targets[i]` is the correct class within head i.
 */
export function trainOne(
  m: Mlp,
  buf: TrainBuf,
  active: number[],
  targets: number[],
  lr: number
): number {
  forwardInto(m, active, buf);
  softmaxHeads(m, buf.z2);
  const { z1, h, z2, dh } = buf;
  let loss = 0;
  for (let hIdx = 0; hIdx < m.heads.length; hIdx++) {
    const p = z2[m.offsets[hIdx] + targets[hIdx]];
    loss += -Math.log(Math.max(p, 1e-12));
    // dLoss/dLogit = prob - onehot(target); z2 becomes the gradient in place
    z2[m.offsets[hIdx] + targets[hIdx]] -= 1;
  }
  const nH = m.nHidden;
  const nOut = m.nOut;
  for (let j = 0; j < nH; j++) {
    let acc = 0;
    const base = j * nOut;
    const hj = h[j];
    for (let k = 0; k < nOut; k++) {
      acc += m.w2[base + k] * z2[k];
      m.w2[base + k] -= lr * z2[k] * hj;
    }
    dh[j] = acc;
  }
  for (let k = 0; k < nOut; k++) m.b2[k] -= lr * z2[k];
  for (let j = 0; j < nH; j++) {
    const g = z1[j] > 0 ? dh[j] : 0;
    dh[j] = g;
    m.b1[j] -= lr * g;
  }
  for (let k = 0; k < active.length; k++) {
    const base = active[k] * nH;
    for (let j = 0; j < nH; j++) m.w1[base + j] -= lr * dh[j];
  }
  return loss;
}

export interface Prediction {
  /** Full output vector, softmaxed per head. */
  probs: Float32Array;
  /** Argmax class per head. */
  pred: number[];
}

export function predict(m: Mlp, active: number[]): Prediction {
  const buf: TrainBuf = {
    z1: new Float32Array(m.nHidden),
    h: new Float32Array(m.nHidden),
    z2: new Float32Array(m.nOut),
    dh: new Float32Array(0),
  };
  forwardInto(m, active, buf);
  softmaxHeads(m, buf.z2);
  const pred: number[] = [];
  for (let hIdx = 0; hIdx < m.heads.length; hIdx++) {
    const off = m.offsets[hIdx];
    const size = m.heads[hIdx];
    let best = 0;
    for (let k = 1; k < size; k++) if (buf.z2[off + k] > buf.z2[off + best]) best = k;
    pred.push(best);
  }
  return { probs: buf.z2, pred };
}

// ---------------------------------------------------------------------------
// Input encodings (lists of active one-hot indices)
// ---------------------------------------------------------------------------

export const DIRECT_IN = 2 * MAX_LEN * 10;
export const STEP_IN = 22; // 10 (digit a) + 10 (digit b) + 2 (carry in)

export function encodeDirect(p: Problem): number[] {
  const idx: number[] = [];
  for (let pos = 0; pos < MAX_LEN; pos++) idx.push(pos * 10 + p.a[pos]);
  for (let pos = 0; pos < MAX_LEN; pos++) idx.push((MAX_LEN + pos) * 10 + p.b[pos]);
  return idx;
}

export function encodeStep(da: number, db: number, cin: number): number[] {
  return [da, 10 + db, 20 + cin];
}

// ---------------------------------------------------------------------------
// The experiment: train both models, then measure them
// ---------------------------------------------------------------------------

export interface ExperimentState {
  direct: Mlp;
  step: Mlp;
  rng: Rng;
  bufD: TrainBuf;
  bufS: TrainBuf;
  /** Samples processed so far (step model first, then direct model). */
  done: number;
  total: number;
  /** Exponential moving averages of the per-example training loss. */
  stepLoss: number;
  directLoss: number;
}

export function initExperiment(): ExperimentState {
  const rng = new Rng(TRAIN_SEED);
  const direct = createMlp(
    DIRECT_IN,
    DIRECT_HIDDEN,
    new Array<number>(SUM_LEN).fill(10),
    rng
  );
  const step = createMlp(STEP_IN, STEP_HIDDEN, [10, 2], rng);
  return {
    direct,
    step,
    rng,
    bufD: makeBuf(direct),
    bufS: makeBuf(step),
    done: 0,
    total: STEP_SAMPLES + DIRECT_SAMPLES,
    stepLoss: NaN,
    directLoss: NaN,
  };
}

function schedule(t: number, total: number, hi: number, lo: number): number {
  return lo + (hi - lo) * (1 - t / total);
}

/** Advance training by up to `n` samples. Chunk-friendly for the UI thread. */
export function trainChunk(st: ExperimentState, n: number): void {
  for (let k = 0; k < n && st.done < st.total; k++) {
    if (st.done < STEP_SAMPLES) {
      const da = st.rng.int(10);
      const db = st.rng.int(10);
      const cin = st.rng.int(2);
      const { digit, carry } = addColumn(da, db, cin);
      const lr = schedule(st.done, STEP_SAMPLES, 0.15, 0.01);
      const loss = trainOne(st.step, st.bufS, encodeStep(da, db, cin), [digit, carry], lr);
      st.stepLoss = Number.isNaN(st.stepLoss) ? loss : st.stepLoss * 0.995 + loss * 0.005;
    } else {
      const t = st.done - STEP_SAMPLES;
      const len = 1 + st.rng.int(MAX_LEN);
      const p = makeProblem(st.rng, len);
      const lr = schedule(t, DIRECT_SAMPLES, 0.08, 0.005);
      const loss = trainOne(st.direct, st.bufD, encodeDirect(p), p.sum, lr);
      st.directLoss = Number.isNaN(st.directLoss)
        ? loss
        : st.directLoss * 0.999 + loss * 0.001;
    }
    st.done++;
  }
}

export function isTrained(st: ExperimentState): boolean {
  return st.done >= st.total;
}

// ---------------------------------------------------------------------------
// Scratchpad inference (run the step model once per column, autoregressively)
// ---------------------------------------------------------------------------

export interface TraceStep {
  i: number;
  da: number;
  db: number;
  /** Carry the model actually fed itself (its own previous prediction). */
  cin: number;
  predDigit: number;
  pPredDigit: number;
  predCarry: number;
  pPredCarry: number;
  /** Correct outputs GIVEN the carry-in the model used. */
  trueDigit: number;
  trueCarry: number;
  correct: boolean;
}

export interface ScratchRun {
  steps: TraceStep[];
  /** Final answer digits, LSB first, padded to SUM_LEN. */
  finalDigits: number[];
  exactMatch: boolean;
  /** Product over steps of the probability the model gave its own choices. */
  confidenceProduct: number;
}

export function runScratchpad(step: Mlp, p: Problem): ScratchRun {
  const steps: TraceStep[] = [];
  const finalDigits = new Array<number>(SUM_LEN).fill(0);
  let cin = 0;
  let conf = 1;
  for (let i = 0; i < p.len; i++) {
    const { probs, pred } = predict(step, encodeStep(p.a[i], p.b[i], cin));
    const predDigit = pred[0];
    const predCarry = pred[1];
    const pPredDigit = probs[predDigit];
    const pPredCarry = probs[10 + predCarry];
    const truth = addColumn(p.a[i], p.b[i], cin);
    steps.push({
      i,
      da: p.a[i],
      db: p.b[i],
      cin,
      predDigit,
      pPredDigit,
      predCarry,
      pPredCarry,
      trueDigit: truth.digit,
      trueCarry: truth.carry,
      correct: predDigit === truth.digit && predCarry === truth.carry,
    });
    finalDigits[i] = predDigit;
    conf *= pPredDigit * pPredCarry;
    cin = predCarry;
  }
  finalDigits[p.len] = cin;
  let exact = true;
  for (let i = 0; i < SUM_LEN; i++) {
    if (finalDigits[i] !== p.sum[i]) {
      exact = false;
      break;
    }
  }
  return { steps, finalDigits, exactMatch: exact, confidenceProduct: conf };
}

// ---------------------------------------------------------------------------
// Direct (one-shot) inference
// ---------------------------------------------------------------------------

export interface DirectRun {
  /** Argmax digit per answer position, LSB first. */
  predDigits: number[];
  /** Probability the model assigned to the TRUE digit at each position. */
  pTrue: number[];
  /** Product of pTrue: the model's probability of the exactly right answer. */
  pAnswer: number;
  exactMatch: boolean;
}

export function runDirect(direct: Mlp, p: Problem): DirectRun {
  const { probs, pred } = predict(direct, encodeDirect(p));
  const pTrue: number[] = [];
  let pAnswer = 1;
  let exact = true;
  for (let pos = 0; pos < SUM_LEN; pos++) {
    const pt = probs[direct.offsets[pos] + p.sum[pos]];
    pTrue.push(pt);
    pAnswer *= pt;
    if (pred[pos] !== p.sum[pos]) exact = false;
  }
  return { predDigits: pred, pTrue, pAnswer, exactMatch: exact };
}

// ---------------------------------------------------------------------------
// Held-out evaluation
// ---------------------------------------------------------------------------

export interface LengthResult {
  len: number;
  /** Exact-match accuracy of the direct model, 0..1. */
  directAcc: number;
  /** Exact-match accuracy of the scratchpad chain, 0..1. */
  scratchAcc: number;
  /** Mean prob the step model gives the true (digit, carry), teacher-forced. */
  meanStepProb: number;
  /** Compounding prediction: meanStepProbOverall ^ len. */
  predictedChain: number;
  nTest: number;
}

export interface EvalResults {
  perLength: LengthResult[];
  meanStepProbOverall: number;
  stepFinalLoss: number;
  directFinalLoss: number;
}

export function evaluate(st: ExperimentState): EvalResults {
  const rng = new Rng(EVAL_SEED);
  const raw: {
    len: number;
    directAcc: number;
    scratchAcc: number;
    meanStepProb: number;
    nTest: number;
  }[] = [];
  let stepProbSum = 0;
  let stepProbCount = 0;

  for (let len = 1; len <= MAX_LEN; len++) {
    let directHits = 0;
    let scratchHits = 0;
    let lenProbSum = 0;
    let lenProbCount = 0;
    for (let t = 0; t < TEST_PER_LENGTH; t++) {
      const p = makeProblem(rng, len);
      if (runDirect(st.direct, p).exactMatch) directHits++;
      if (runScratchpad(st.step, p).exactMatch) scratchHits++;
      // Teacher-forced per-step probability of the truth
      let cin = 0;
      for (let i = 0; i < len; i++) {
        const { probs } = predict(st.step, encodeStep(p.a[i], p.b[i], cin));
        const truth = addColumn(p.a[i], p.b[i], cin);
        lenProbSum += probs[truth.digit] * probs[10 + truth.carry];
        lenProbCount++;
        cin = truth.carry;
      }
    }
    stepProbSum += lenProbSum;
    stepProbCount += lenProbCount;
    raw.push({
      len,
      directAcc: directHits / TEST_PER_LENGTH,
      scratchAcc: scratchHits / TEST_PER_LENGTH,
      meanStepProb: lenProbSum / lenProbCount,
      nTest: TEST_PER_LENGTH,
    });
  }

  const meanStepProbOverall = stepProbSum / stepProbCount;
  const perLength: LengthResult[] = raw.map((r) => ({
    ...r,
    predictedChain: chainSuccess(meanStepProbOverall, r.len),
  }));
  return {
    perLength,
    meanStepProbOverall,
    stepFinalLoss: st.stepLoss,
    directFinalLoss: st.directLoss,
  };
}

// ---------------------------------------------------------------------------
// Deterministic example problems for the trace panel
// ---------------------------------------------------------------------------

export function makeTraceProblems(len: number, count: number): Problem[] {
  const rng = new Rng(TRACE_SEED + len * 1000);
  const out: Problem[] = [];
  for (let i = 0; i < count; i++) out.push(makeProblem(rng, len));
  return out;
}
