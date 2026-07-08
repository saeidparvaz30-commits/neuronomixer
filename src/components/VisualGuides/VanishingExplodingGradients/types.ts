// Pure math for the Vanishing & Exploding Gradients guide.
// No React, no side effects, fully deterministic (seeded LCG weights).

export type Activation = "sigmoid" | "tanh" | "relu";
export type GradientStatus = "vanishing" | "healthy" | "exploding";
export type FixMethod = "ReLU" | "Weight scale";

// ── Constants ────────────────────────────────────────────────────────────────

export const MIN_DEPTH = 2;
export const MAX_DEPTH = 40;
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 3.0;

/** Fixed network input (a_0). */
export const INPUT_X = 0.7;
/** Fixed regression target for the squared loss. */
export const TARGET_Y = 0.3;

/** |dL/dw_1| below this counts as vanishing. */
export const VANISH_THRESHOLD = 1e-6;
/** |dL/dw_1| above this counts as exploding. */
export const EXPLODE_THRESHOLD = 1e3;

export const ACTIVATION_META: Record<
  Activation,
  { label: string; color: string; derivativeNote: string }
> = {
  sigmoid: {
    label: "Sigmoid",
    color: "#a855f7",
    derivativeNote: "f'(z) = f(z)(1 - f(z)), peaks at 0.25",
  },
  tanh: {
    label: "Tanh",
    color: "#3bb4a4",
    derivativeNote: "f'(z) = 1 - tanh^2(z), peaks at 1",
  },
  relu: {
    label: "ReLU",
    color: "#ec4899",
    derivativeNote: "f'(z) = 1 for z > 0, else 0",
  },
};

// ── Deterministic pseudo-randomness (spec LCG, no Math.random) ──────────────

export function lcg(seed: number): number {
  return ((seed * 1664525 + 1013904223) >>> 0) / 0xffffffff;
}

/**
 * Deterministic base weight for layer index i (0-based): uniform-ish jitter
 * in [0.8, 1.2]. Kept positive on purpose so the single-unit chain never has
 * a dead ReLU and the product story stays visible.
 */
export function baseWeight(i: number): number {
  return 0.8 + 0.4 * lcg(i * 9973 + 17);
}

export function buildWeights(depth: number, weightScale: number): number[] {
  return Array.from({ length: depth }, (_, i) => weightScale * baseWeight(i));
}

// ── Activations ──────────────────────────────────────────────────────────────

export function activate(z: number, act: Activation): number {
  switch (act) {
    case "sigmoid":
      return 1 / (1 + Math.exp(-z));
    case "tanh":
      return Math.tanh(z);
    case "relu":
      return z > 0 ? z : 0;
  }
}

export function activateDeriv(z: number, act: Activation): number {
  switch (act) {
    case "sigmoid": {
      const s = 1 / (1 + Math.exp(-z));
      return s * (1 - s);
    }
    case "tanh": {
      const t = Math.tanh(z);
      return 1 - t * t;
    }
    case "relu":
      return z > 0 ? 1 : 0;
  }
}

// ── Forward + backward pass ──────────────────────────────────────────────────

export interface NetworkResult {
  /** w_1..w_L (index 0 = layer 1, the input side). */
  weights: number[];
  /** a_0..a_L, where a_0 = INPUT_X and a_L = output. */
  activations: number[];
  /** z_1..z_L pre-activations. */
  preacts: number[];
  output: number;
  loss: number;
  /** Signed dL/dw_i for i = 1..L (index 0 = layer 1). */
  gradients: number[];
  /** |dL/dw_i| for i = 1..L (index 0 = layer 1). */
  gradientMags: number[];
  /** |dL/dw_1| (input side, the vanishing/exploding indicator). */
  layer1Mag: number;
  /** |dL/dw_L| (output side, next to the loss). */
  layerLMag: number;
  /** |delta_L| = |(a_L - y) * f'(z_L)|, the error signal at the loss end. */
  deltaLMag: number;
  /** Geometric mean of the backward multipliers |w_{i+1} * f'(z_i)|. */
  meanBackwardFactor: number;
  status: GradientStatus;
}

export function classifyStatus(layer1Mag: number): GradientStatus {
  if (!Number.isFinite(layer1Mag) || layer1Mag > EXPLODE_THRESHOLD) return "exploding";
  if (layer1Mag < VANISH_THRESHOLD) return "vanishing";
  return "healthy";
}

/**
 * Runs a real forward pass on the fixed input, then a real backward pass
 * from the squared loss L = 0.5 * (a_L - y)^2.
 *
 * Forward:  z_i = w_i * a_{i-1},  a_i = f(z_i),  a_0 = INPUT_X.
 * Backward: delta_L = (a_L - y) * f'(z_L)
 *           delta_i = delta_{i+1} * w_{i+1} * f'(z_i)   (multiplying BACKWARDS,
 *           from the loss at the output toward layer 1 on the input side)
 *           dL/dw_i = delta_i * a_{i-1}
 */
export function runNetwork(
  depth: number,
  act: Activation,
  weightScale: number
): NetworkResult {
  const weights = buildWeights(depth, weightScale);

  // Forward pass
  const activations: number[] = [INPUT_X];
  const preacts: number[] = [];
  for (let i = 0; i < depth; i++) {
    const z = weights[i] * activations[i];
    preacts.push(z);
    activations.push(activate(z, act));
  }
  const output = activations[depth];
  const loss = 0.5 * (output - TARGET_Y) ** 2;

  // Backward pass: start at the LOSS (output layer) and multiply backwards.
  const gradients = new Array<number>(depth).fill(0);
  let delta = (output - TARGET_Y) * activateDeriv(preacts[depth - 1], act);
  gradients[depth - 1] = delta * activations[depth - 1];
  for (let k = depth - 2; k >= 0; k--) {
    delta = delta * weights[k + 1] * activateDeriv(preacts[k], act);
    gradients[k] = delta * activations[k];
  }

  const gradientMags = gradients.map(Math.abs);
  const layer1Mag = gradientMags[0];
  const layerLMag = gradientMags[depth - 1];
  const deltaLMag = Math.abs(
    (output - TARGET_Y) * activateDeriv(preacts[depth - 1], act)
  );

  // Backward multipliers |w_{i+1} * f'(z_i)| for i = 1..L-1
  let logSum = 0;
  let factorCount = 0;
  for (let k = 0; k <= depth - 2; k++) {
    const f = Math.abs(weights[k + 1] * activateDeriv(preacts[k], act));
    if (f > 0 && Number.isFinite(f)) {
      logSum += Math.log(f);
      factorCount++;
    }
  }
  const meanBackwardFactor = factorCount > 0 ? Math.exp(logSum / factorCount) : 1;

  return {
    weights,
    activations,
    preacts,
    output,
    loss,
    gradients,
    gradientMags,
    layer1Mag,
    layerLMag,
    deltaLMag,
    meanBackwardFactor,
    status: classifyStatus(layer1Mag),
  };
}

// ── Derivative curves (for the "why sigmoid vanishes" panel) ─────────────────

export interface DerivativeCurve {
  z: number[];
  d: number[];
  maxD: number;
  maxZ: number;
}

export function derivativeCurve(
  act: Activation,
  zMin = -8,
  zMax = 8,
  samples = 161
): DerivativeCurve {
  const z: number[] = [];
  const d: number[] = [];
  let maxD = -Infinity;
  let maxZ = zMin;
  for (let i = 0; i < samples; i++) {
    const zi = zMin + ((zMax - zMin) * i) / (samples - 1);
    const di = activateDeriv(zi, act);
    z.push(zi);
    d.push(di);
    if (di > maxD) {
      maxD = di;
      maxZ = zi;
    }
  }
  return { z, d, maxD, maxZ };
}

// ── Formatting ───────────────────────────────────────────────────────────────

/** Compact magnitude formatter: 0.00352 -> "3.5e-3", 12.4 -> "12.4". */
export function formatMagnitude(v: number): string {
  if (!Number.isFinite(v)) return "overflow";
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 0.01 && a < 1000) {
    return Number(v.toPrecision(3)).toString();
  }
  return v.toExponential(1).replace("e+", "e");
}
