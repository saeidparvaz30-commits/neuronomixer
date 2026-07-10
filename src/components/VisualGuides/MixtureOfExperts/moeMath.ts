/**
 * Pure Mixture-of-Experts math for the mixture-of-experts guide. No React imports.
 *
 * This module is the single source of every number the guide displays:
 * router probabilities, top-2 gates, per-expert outputs, the MoE prediction,
 * training loss, grid RMSE, expert utilization, the router map, and the
 * parameter / FLOP counters. A verifier can recompute all of them by
 * executing these functions with node/tsx.
 *
 * The toy setup: a real MoE layer over a 2-D input x in [-1, 1]^2.
 *   - 8 expert MLPs, each 2 -> 8 (tanh) -> 1
 *   - a linear softmax router 2 -> 8
 *   - top-2 gating: y = sum over the 2 highest-probability experts of
 *     (renormalized gate) * expert(x)
 * The layer is trained in the browser with full-batch gradient descent
 * (with momentum) to regress the visible target function TARGET_FN on a
 * fixed 16x16 grid, plus the standard Switch-Transformer style load
 * balancing auxiliary loss so experts do not collapse onto one region.
 * Gradients flow into the selected experts and, through the renormalized
 * gates and the softmax, into the router: the same trick real sparse MoE
 * models use to train a non-differentiable top-k selection.
 */

// ── Architecture constants ──────────────────────────────────────────────────

export const INPUT_DIM = 2;
export const HIDDEN_DIM = 8;
export const NUM_EXPERTS = 8;
export const TOP_K = 2;

/** Full-batch gradient descent settings (tuned on the fixed grid). */
export const LEARNING_RATE = 0.06;
export const MOMENTUM = 0.9;
/** Coefficient of the load-balancing auxiliary loss. */
export const AUX_LOSS_COEF = 0.01;

/** Training step limits. */
export const MAX_STEPS = 1200;
export const MIN_TRAIN_STEPS = 200;
export const TRAIN_BATCH_SIZES: readonly number[] = [100, 400];

/** The training / evaluation grid resolution (GRID_RES^2 points). */
export const GRID_RES = 16;
/** The router-map resolution (MAP_RES^2 cells). */
export const MAP_RES = 32;

/** Deterministic seed for weight initialization. */
export const INIT_SEED = 20260710;

/** Default input the lab starts at. */
export const DEFAULT_X1 = 0.35;
export const DEFAULT_X2 = -0.4;

/**
 * Display colors per expert, all from the guide token table.
 * Color is never the sole indicator: every use is paired with the
 * expert's number label.
 */
export const EXPERT_COLORS: readonly string[] = [
  "#1e5d8a", // E1 blue
  "#3bb4a4", // E2 teal
  "#a855f7", // E3 purple
  "#ec4899", // E4 pink
  "#ef4444", // E5 red
  "var(--color-warning)", // E6 orange
  "var(--color-success)", // E7 green
  "#94a3b8", // E8 slate
];

// ── Target function and training grid ───────────────────────────────────────

/** The visible ground-truth function the MoE learns: f(x1, x2) = sin(2.5 x1) * cos(2.5 x2). */
export function targetFn(x1: number, x2: number): number {
  return Math.sin(2.5 * x1) * Math.cos(2.5 * x2);
}

export const TARGET_FORMULA = "f(x1, x2) = sin(2.5 * x1) * cos(2.5 * x2)";

export interface Sample {
  x: [number, number];
  y: number;
}

/** The fixed 16x16 training grid over [-1, 1]^2. Deterministic, never resampled. */
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

// ── Deterministic pseudo-random init (SPEC LCG, no Math.random) ─────────────

export function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = ((s * 1664525 + 1013904223) >>> 0);
    return s / 0xffffffff;
  };
}

// ── Parameters ──────────────────────────────────────────────────────────────

export interface ExpertParams {
  /** HIDDEN_DIM x INPUT_DIM. */
  w1: number[][];
  /** HIDDEN_DIM. */
  b1: number[];
  /** HIDDEN_DIM. */
  w2: number[];
  b2: number;
}

export interface MoEParams {
  /** NUM_EXPERTS x INPUT_DIM. */
  routerW: number[][];
  /** NUM_EXPERTS. */
  routerB: number[];
  experts: ExpertParams[];
}

/** Model state carried through training: parameters plus momentum buffers. */
export interface MoEState {
  params: MoEParams;
  vel: MoEParams;
}

function zerosLike(p: MoEParams): MoEParams {
  return {
    routerW: p.routerW.map((row) => row.map(() => 0)),
    routerB: p.routerB.map(() => 0),
    experts: p.experts.map((e) => ({
      w1: e.w1.map((row) => row.map(() => 0)),
      b1: e.b1.map(() => 0),
      w2: e.w2.map(() => 0),
      b2: 0,
    })),
  };
}

export function initParams(seed: number = INIT_SEED): MoEParams {
  const rng = makeLcg(seed);
  const u = (scale: number) => (rng() * 2 - 1) * scale;
  const experts: ExpertParams[] = [];
  for (let e = 0; e < NUM_EXPERTS; e++) {
    experts.push({
      w1: Array.from({ length: HIDDEN_DIM }, () =>
        Array.from({ length: INPUT_DIM }, () => u(1.2))
      ),
      b1: Array.from({ length: HIDDEN_DIM }, () => u(0.5)),
      w2: Array.from({ length: HIDDEN_DIM }, () => u(0.7)),
      b2: u(0.1),
    });
  }
  return {
    routerW: Array.from({ length: NUM_EXPERTS }, () =>
      Array.from({ length: INPUT_DIM }, () => u(1.0))
    ),
    routerB: Array.from({ length: NUM_EXPERTS }, () => u(0.1)),
    experts,
  };
}

export function initState(seed: number = INIT_SEED): MoEState {
  const params = initParams(seed);
  return { params, vel: zerosLike(params) };
}

// ── Core forward math ───────────────────────────────────────────────────────

export function softmax(logits: readonly number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((z) => Math.exp(z - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/** Router probabilities p(expert | x): softmax of the linear router scores. */
export function routerProbs(params: MoEParams, x: readonly number[]): number[] {
  const logits = params.routerW.map(
    (row, e) => row[0] * x[0] + row[1] * x[1] + params.routerB[e]
  );
  return softmax(logits);
}

/**
 * Indices of the top-k probability experts among the enabled ones,
 * sorted by descending probability. Deterministic tie-break by index.
 */
export function selectTopK(
  probs: readonly number[],
  enabled: readonly boolean[],
  k: number = TOP_K
): number[] {
  const candidates = probs
    .map((p, i) => ({ p, i }))
    .filter(({ i }) => enabled[i]);
  candidates.sort((a, b) => b.p - a.p || a.i - b.i);
  return candidates.slice(0, k).map(({ i }) => i);
}

export interface ExpertForward {
  /** tanh hidden activations, needed for backprop. */
  h: number[];
  /** the expert's scalar output. */
  out: number;
}

export function expertForward(
  e: ExpertParams,
  x: readonly number[]
): ExpertForward {
  const h = e.b1.map((b, j) =>
    Math.tanh(b + e.w1[j][0] * x[0] + e.w1[j][1] * x[1])
  );
  const out = e.b2 + h.reduce((acc, hj, j) => acc + hj * e.w2[j], 0);
  return { h, out };
}

export interface MoEForward {
  /** Full softmax router distribution over all 8 experts. */
  probs: number[];
  /** Indices of the selected experts (top-k among enabled). */
  top: number[];
  /** Renormalized gates aligned with `top` (sum to 1). */
  gates: number[];
  /** Every expert's individual output at x (for display). */
  expertOuts: number[];
  /** The MoE prediction: sum of gate * expert output over `top`. */
  y: number;
}

/**
 * Full MoE forward pass at input x with the given enabled mask.
 * Only the selected experts contribute to y; all 8 individual outputs
 * are returned so the UI can show what each expert would have said.
 */
export function moeForward(
  params: MoEParams,
  x: readonly number[],
  enabled: readonly boolean[]
): MoEForward {
  const probs = routerProbs(params, x);
  const top = selectTopK(probs, enabled, TOP_K);
  const s = top.reduce((acc, i) => acc + probs[i], 0);
  const gates = top.map((i) => (s > 0 ? probs[i] / s : 0));
  const expertOuts = params.experts.map((e) => expertForward(e, x).out);
  const y = top.reduce((acc, i, k) => acc + gates[k] * expertOuts[i], 0);
  return { probs, top, gates, expertOuts, y };
}

// ── Training ────────────────────────────────────────────────────────────────

const ALL_ENABLED: readonly boolean[] = Array.from(
  { length: NUM_EXPERTS },
  () => true
);

export function allEnabled(): boolean[] {
  return [...ALL_ENABLED];
}

/**
 * One full-batch gradient descent step (with momentum) on
 *   L = mean squared error of the top-2 MoE prediction
 *     + AUX_LOSS_COEF * N * sum_i f_i * P_i   (load balancing)
 * where f_i is the fraction of samples routing expert i into their top-2
 * (treated as constant, as in Switch Transformer) and P_i is the mean
 * router probability of expert i. Training always uses ALL experts;
 * the UI ablation toggles affect inference only.
 *
 * Returns the training-grid RMSE after the step.
 */
export function trainStep(
  state: MoEState,
  samples: readonly Sample[] = TRAINING_GRID,
  lr: number = LEARNING_RATE,
  momentum: number = MOMENTUM
): number {
  const { params, vel } = state;
  const B = samples.length;
  const grad = zerosLike(params);

  // Pre-pass: router probabilities and top-2 selections for the whole batch,
  // so the load fractions f_i are known before accumulating gradients.
  const batchProbs: number[][] = [];
  const batchTop: number[][] = [];
  const load = new Array<number>(NUM_EXPERTS).fill(0);
  for (const sample of samples) {
    const probs = routerProbs(params, sample.x);
    const top = selectTopK(probs, ALL_ENABLED, TOP_K);
    batchProbs.push(probs);
    batchTop.push(top);
    for (const i of top) load[i] += 1 / B;
  }

  for (let n = 0; n < B; n++) {
    const { x, y: target } = samples[n];
    const probs = batchProbs[n];
    const top = batchTop[n];
    const s = probs[top[0]] + probs[top[1]];
    const g0 = probs[top[0]] / s;
    const g1 = probs[top[1]] / s;

    const f0 = expertForward(params.experts[top[0]], x);
    const f1 = expertForward(params.experts[top[1]], x);
    const y = g0 * f0.out + g1 * f1.out;
    const dy = (2 * (y - target)) / B;

    // Backprop into the two selected experts.
    const pairs: Array<[number, ExpertForward, number]> = [
      [top[0], f0, g0],
      [top[1], f1, g1],
    ];
    for (const [idx, fwd, gate] of pairs) {
      const dOut = dy * gate;
      const ge = grad.experts[idx];
      const pe = params.experts[idx];
      ge.b2 += dOut;
      for (let j = 0; j < HIDDEN_DIM; j++) {
        ge.w2[j] += dOut * fwd.h[j];
        const dH = dOut * pe.w2[j] * (1 - fwd.h[j] * fwd.h[j]);
        ge.b1[j] += dH;
        ge.w1[j][0] += dH * x[0];
        ge.w1[j][1] += dH * x[1];
      }
    }

    // Backprop through the renormalized gates into the router probabilities.
    const dG0 = dy * f0.out;
    const dG1 = dy * f1.out;
    const dP = new Array<number>(NUM_EXPERTS).fill(0);
    dP[top[0]] = ((dG0 - dG1) * probs[top[1]]) / (s * s);
    dP[top[1]] = ((dG1 - dG0) * probs[top[0]]) / (s * s);

    // Load-balancing term: dAux/dP_i = AUX_LOSS_COEF * N * f_i / B.
    for (let i = 0; i < NUM_EXPERTS; i++) {
      dP[i] += (AUX_LOSS_COEF * NUM_EXPERTS * load[i]) / B;
    }

    // Softmax backprop: dL/dr_j = p_j * (dL/dp_j - sum_i dL/dp_i * p_i).
    let dot = 0;
    for (let i = 0; i < NUM_EXPERTS; i++) dot += dP[i] * probs[i];
    for (let j = 0; j < NUM_EXPERTS; j++) {
      const dR = probs[j] * (dP[j] - dot);
      grad.routerB[j] += dR;
      grad.routerW[j][0] += dR * x[0];
      grad.routerW[j][1] += dR * x[1];
    }
  }

  // Momentum update, in place.
  for (let j = 0; j < NUM_EXPERTS; j++) {
    vel.routerB[j] = momentum * vel.routerB[j] - lr * grad.routerB[j];
    params.routerB[j] += vel.routerB[j];
    for (let i = 0; i < INPUT_DIM; i++) {
      vel.routerW[j][i] = momentum * vel.routerW[j][i] - lr * grad.routerW[j][i];
      params.routerW[j][i] += vel.routerW[j][i];
    }
  }
  for (let e = 0; e < NUM_EXPERTS; e++) {
    const pe = params.experts[e];
    const ve = vel.experts[e];
    const ge = grad.experts[e];
    ve.b2 = momentum * ve.b2 - lr * ge.b2;
    pe.b2 += ve.b2;
    for (let j = 0; j < HIDDEN_DIM; j++) {
      ve.b1[j] = momentum * ve.b1[j] - lr * ge.b1[j];
      pe.b1[j] += ve.b1[j];
      ve.w2[j] = momentum * ve.w2[j] - lr * ge.w2[j];
      pe.w2[j] += ve.w2[j];
      for (let i = 0; i < INPUT_DIM; i++) {
        ve.w1[j][i] = momentum * ve.w1[j][i] - lr * ge.w1[j][i];
        pe.w1[j][i] += ve.w1[j][i];
      }
    }
  }

  return gridRmse(params, ALL_ENABLED, samples);
}

/**
 * Run n training steps, mutating a DEEP COPY of the given state.
 * Returns the new state and the RMSE after each step.
 */
export function trainSteps(
  state: MoEState,
  n: number
): { state: MoEState; rmseHistory: number[] } {
  const next: MoEState = JSON.parse(JSON.stringify(state)) as MoEState;
  const rmseHistory: number[] = [];
  for (let i = 0; i < n; i++) {
    rmseHistory.push(trainStep(next));
  }
  return { state: next, rmseHistory };
}

// ── Evaluation ──────────────────────────────────────────────────────────────

/** RMSE of the MoE prediction against the target over the grid, with the given enabled mask. */
export function gridRmse(
  params: MoEParams,
  enabled: readonly boolean[],
  samples: readonly Sample[] = TRAINING_GRID
): number {
  let sq = 0;
  for (const sample of samples) {
    const { y } = moeForward(params, sample.x, enabled);
    sq += (y - sample.y) * (y - sample.y);
  }
  return Math.sqrt(sq / samples.length);
}

/** Fraction of grid points where each expert is selected into the top-2 (enabled mask applied). */
export function expertUtilization(
  params: MoEParams,
  enabled: readonly boolean[],
  samples: readonly Sample[] = TRAINING_GRID
): number[] {
  const util = new Array<number>(NUM_EXPERTS).fill(0);
  for (const sample of samples) {
    const probs = routerProbs(params, sample.x);
    for (const i of selectTopK(probs, enabled, TOP_K)) {
      util[i] += 1 / samples.length;
    }
  }
  return util;
}

/**
 * The router map: for each cell of a MAP_RES x MAP_RES grid over [-1, 1]^2,
 * the index of the top-1 enabled expert (or -1 if none enabled).
 * Row-major, row = x2 from -1 to 1, column = x1 from -1 to 1.
 */
export function routerMap(
  params: MoEParams,
  enabled: readonly boolean[],
  res: number = MAP_RES
): number[] {
  const cells: number[] = [];
  for (let r = 0; r < res; r++) {
    const x2 = -1 + (2 * (r + 0.5)) / res;
    for (let c = 0; c < res; c++) {
      const x1 = -1 + (2 * (c + 0.5)) / res;
      const probs = routerProbs(params, [x1, x2]);
      const top = selectTopK(probs, enabled, 1);
      cells.push(top.length > 0 ? top[0] : -1);
    }
  }
  return cells;
}

// ── Parameter and FLOP counters (all displayed counts come from here) ───────

/** Parameters of one dense layer inDim -> outDim (weights + biases). */
export function linearParams(inDim: number, outDim: number): number {
  return inDim * outDim + outDim;
}

/** FLOPs of one dense layer, counting each multiply-add as 2 FLOPs plus the bias add. */
export function linearFlops(inDim: number, outDim: number): number {
  return 2 * inDim * outDim + outDim;
}

/** Parameters in one expert MLP: 2 -> HIDDEN_DIM (tanh) -> 1. */
export function expertParamCount(): number {
  return linearParams(INPUT_DIM, HIDDEN_DIM) + linearParams(HIDDEN_DIM, 1);
}

/** Parameters in the linear router 2 -> NUM_EXPERTS. */
export function routerParamCount(): number {
  return linearParams(INPUT_DIM, NUM_EXPERTS);
}

/** Total parameters stored by the MoE layer: router + all experts. */
export function totalParamCount(): number {
  return routerParamCount() + NUM_EXPERTS * expertParamCount();
}

/** Parameters actually used for one input: router + the k selected experts. */
export function activeParamCount(k: number = TOP_K): number {
  return routerParamCount() + k * expertParamCount();
}

/** FLOPs of one expert forward pass (linear layers only; tanh excluded, stated in UI). */
export function expertFlopCount(): number {
  return linearFlops(INPUT_DIM, HIDDEN_DIM) + linearFlops(HIDDEN_DIM, 1);
}

/** FLOPs of the router's linear scores (softmax excluded, stated in UI). */
export function routerFlopCount(): number {
  return linearFlops(INPUT_DIM, NUM_EXPERTS);
}

/** FLOPs of one sparse MoE forward pass: router + k expert forwards. */
export function activeFlopCount(k: number = TOP_K): number {
  return routerFlopCount() + k * expertFlopCount();
}

/** FLOPs if every expert ran (a dense mixture): router + all expert forwards. */
export function denseMixtureFlopCount(): number {
  return routerFlopCount() + NUM_EXPERTS * expertFlopCount();
}

/**
 * Hidden width of a single dense MLP 2 -> H (tanh) -> 1 with at least as
 * many parameters as the whole MoE layer: the fair FLOP comparison.
 */
export function denseEquivalentHidden(): number {
  // params(2 -> H -> 1) = (INPUT_DIM + 1) * H + (H + 1) = (INPUT_DIM + 2) * H + 1
  return Math.ceil((totalParamCount() - 1) / (INPUT_DIM + 2));
}

export function denseEquivalentParams(): number {
  const h = denseEquivalentHidden();
  return linearParams(INPUT_DIM, h) + linearParams(h, 1);
}

export function denseEquivalentFlops(): number {
  const h = denseEquivalentHidden();
  return linearFlops(INPUT_DIM, h) + linearFlops(h, 1);
}

/** Index of the largest value (deterministic tie-break by lowest index). */
export function argmax(values: readonly number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[best]) best = i;
  }
  return best;
}

/** Stable key for a top-k selection, order-independent. */
export function comboKey(top: readonly number[]): string {
  return [...top].sort((a, b) => a - b).join("-");
}
