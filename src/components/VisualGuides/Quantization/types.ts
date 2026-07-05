// Pure math and deterministic data for the Quantization visual guide.
// No React, no side effects, no randomness at call time (seeded LCG only).

// ── Interactive A: memory footprint ──────────────────────────────────────────

export type PrecisionId = "fp32" | "fp16" | "int8" | "int4" | "int2";

export interface PrecisionOption {
  id: PrecisionId;
  label: string;
  bytesPerParam: number;
  note: string;
}

export const PRECISION_OPTIONS: readonly PrecisionOption[] = [
  { id: "fp32", label: "FP32", bytesPerParam: 4, note: "Full precision. The training default." },
  { id: "fp16", label: "FP16", bytesPerParam: 2, note: "Half precision. The common serving baseline." },
  { id: "int8", label: "INT8", bytesPerParam: 1, note: "8-bit integers. Usually near-lossless for weights." },
  { id: "int4", label: "INT4", bytesPerParam: 0.5, note: "4-bit. The popular sweet spot for local inference." },
  { id: "int2", label: "2-bit", bytesPerParam: 0.25, note: "Extreme compression. The error lab below shows its cost." },
] as const;

export const PARAM_MIN = 1;
export const PARAM_MAX = 180;

export interface DeviceRef {
  id: string;
  label: string;
  capacityGB: number;
}

/** Honest reference capacities of real device classes (memory available, not a benchmark). */
export const DEVICE_REFS: readonly DeviceRef[] = [
  { id: "phone", label: "Flagship phone (8 GB RAM)", capacityGB: 8 },
  { id: "consumer", label: "Consumer GPU (24 GB VRAM)", capacityGB: 24 },
  { id: "workstation", label: "Workstation GPU (80 GB VRAM)", capacityGB: 80 },
] as const;

/**
 * Weights-only memory footprint.
 * paramsBillions × 1e9 params × bytesPerParam bytes = bytes; divided by 1e9 = GB.
 * The 1e9 factors cancel, so GB = paramsBillions × bytesPerParam (1 GB = 10^9 bytes).
 */
export function weightsMemoryGB(paramsBillions: number, bytesPerParam: number): number {
  return paramsBillions * bytesPerParam;
}

// ── Interactive B: real symmetric uniform quantization ───────────────────────

export const BIT_WIDTHS = [8, 4, 3, 2] as const;
export type BitWidth = (typeof BIT_WIDTHS)[number];

/**
 * Deterministic bell-shaped weight sample.
 * Uses a linear congruential generator plus the Irwin-Hall construction
 * (sum of 12 uniforms, minus 6) to approximate a standard normal, then
 * scales by sigma. Same output on server and client: no hydration mismatch.
 */
export function generateWeightSample(count = 2000, sigma = 0.02, seed = 42): number[] {
  let state = seed >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    let s = 0;
    for (let j = 0; j < 12; j++) s += next();
    out.push((s - 6) * sigma);
  }
  return out;
}

export interface QuantizationResult {
  /** Weights after quantize -> dequantize round trip. */
  dequantized: number[];
  /** Per-weight error: original minus dequantized. */
  errors: number[];
  /** Quantization step size: max|w| / (2^(b-1) - 1). */
  scale: number;
  /** Largest positive integer level: 2^(b-1) - 1. */
  qMax: number;
  /** Total representable levels: 2 * qMax + 1. */
  levels: number;
  rmsError: number;
  maxAbsError: number;
  /** Share of weights (0..1) that dequantize to exactly zero. */
  zeroShare: number;
}

/**
 * Real symmetric uniform quantization:
 *   scale = max|w| / (2^(b-1) - 1)
 *   q     = clamp(round(w / scale), -qMax, qMax)
 *   w_hat = q * scale
 */
export function quantizeSymmetric(weights: number[], bits: number): QuantizationResult {
  const qMax = Math.pow(2, bits - 1) - 1;
  const absMax = maxAbs(weights);
  const scale = absMax / qMax;

  const dequantized = new Array<number>(weights.length);
  const errors = new Array<number>(weights.length);
  let sumSq = 0;
  let maxErr = 0;
  let zeros = 0;

  for (let i = 0; i < weights.length; i++) {
    const q = Math.max(-qMax, Math.min(qMax, Math.round(weights[i] / scale)));
    const w = q * scale;
    dequantized[i] = w;
    const e = weights[i] - w;
    errors[i] = e;
    sumSq += e * e;
    const ae = Math.abs(e);
    if (ae > maxErr) maxErr = ae;
    if (q === 0) zeros++;
  }

  return {
    dequantized,
    errors,
    scale,
    qMax,
    levels: 2 * qMax + 1,
    rmsError: Math.sqrt(sumSq / weights.length),
    maxAbsError: maxErr,
    zeroShare: zeros / weights.length,
  };
}

// ── Small numeric helpers ─────────────────────────────────────────────────────

export function maxAbs(values: number[]): number {
  let m = 0;
  for (const v of values) {
    const a = Math.abs(v);
    if (a > m) m = a;
  }
  return m;
}

export function rms(values: number[]): number {
  let s = 0;
  for (const v of values) s += v * v;
  return Math.sqrt(s / values.length);
}

export interface HistogramBin {
  x0: number;
  x1: number;
  count: number;
}

export function computeHistogram(
  values: number[],
  min: number,
  max: number,
  binCount: number
): HistogramBin[] {
  const width = (max - min) / binCount;
  const counts = new Array<number>(binCount).fill(0);
  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx < 0) idx = 0;
    if (idx >= binCount) idx = binCount - 1;
    counts[idx]++;
  }
  return counts.map((count, i) => ({
    x0: min + i * width,
    x1: min + (i + 1) * width,
    count,
  }));
}

export function formatSmall(x: number): string {
  if (x === 0) return "0";
  const a = Math.abs(x);
  if (a >= 100) return x.toFixed(0);
  if (a >= 1) return x.toFixed(1);
  if (a >= 0.01) return x.toFixed(3);
  return x.toExponential(1);
}

export function formatGB(gb: number): string {
  if (gb >= 100) return gb.toFixed(0);
  if (gb >= 10) return gb.toFixed(1);
  return gb.toFixed(2);
}
