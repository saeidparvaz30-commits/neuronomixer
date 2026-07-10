/**
 * Pure math for the positional-encoding guide. No React imports.
 *
 * This module is the single source of every number the guide displays:
 * the sinusoidal PE matrix, per-dimension wavelengths, the heatmap cell
 * colors, RoPE rotations of the fixed query/key vectors, per-pair and
 * total attention scores, and the score-vs-offset curve. A verifier can
 * recompute all of them by executing these functions with node/tsx.
 *
 * Sinusoidal PE, exactly the "Attention Is All You Need" formula:
 *   PE(pos, 2i)   = sin( pos / base^(2i / d_model) )
 *   PE(pos, 2i+1) = cos( pos / base^(2i / d_model) )
 *
 * RoPE on a 2D pair p with per-pair angular frequency theta_p:
 *   rotate the pair of q by (m * theta_p), the pair of k by (n * theta_p).
 * Because R(a)^T R(b) = R(b - a), the rotated dot product
 *   dot(R(m*theta) q, R(n*theta) k) = q^T R((n - m) * theta) k
 * depends only on the relative offset m - n, never on m and n themselves.
 */

// ---------------------------------------------------------------------------
// Sinusoidal PE heatmap
// ---------------------------------------------------------------------------

export interface HeatmapParams {
  nPos: number;
  dModel: number;
  /** log10 of the base wavelength constant; base = round(10^baseExp). */
  baseExp: number;
}

export const HEATMAP_DEFAULTS: HeatmapParams = {
  nPos: 32,
  dModel: 32,
  baseExp: 4, // base = 10000, the Transformer paper's constant
};

export const N_POS_MIN = 8;
export const N_POS_MAX = 64;
export const D_MODEL_MIN = 8;
export const D_MODEL_MAX = 64;
export const BASE_EXP_MIN = 2; // base 100
export const BASE_EXP_MAX = 4; // base 10000

export function baseFromExp(baseExp: number): number {
  return Math.round(Math.pow(10, baseExp));
}

/**
 * The full PE matrix, rows = positions 0..nPos-1, cols = dims 0..dModel-1.
 * Every heatmap cell and every inspected value comes from this function.
 */
export function sinusoidalPE(
  nPos: number,
  dModel: number,
  base: number
): number[][] {
  const rows: number[][] = [];
  for (let pos = 0; pos < nPos; pos++) {
    const row: number[] = [];
    for (let dim = 0; dim < dModel; dim++) {
      const pairIdx = Math.floor(dim / 2);
      const angle = pos / Math.pow(base, (2 * pairIdx) / dModel);
      row.push(dim % 2 === 0 ? Math.sin(angle) : Math.cos(angle));
    }
    rows.push(row);
  }
  return rows;
}

/** Wavelength (in positions) of the sinusoid pair pairIdx: 2*pi*base^(2i/d). */
export function wavelengthForPair(
  pairIdx: number,
  dModel: number,
  base: number
): number {
  return 2 * Math.PI * Math.pow(base, (2 * pairIdx) / dModel);
}

// Diverging heatmap scale built from existing design-token endpoints:
// -1 -> primary blue #1e5d8a, 0 -> background #0f172a, +1 -> pink #ec4899.
const NEG_RGB: readonly [number, number, number] = [30, 93, 138];
const MID_RGB: readonly [number, number, number] = [15, 23, 42];
const POS_RGB: readonly [number, number, number] = [236, 72, 153];

/** Deterministic cell color for a PE value in [-1, 1]. */
export function peColor(value: number): string {
  const t = Math.max(-1, Math.min(1, value));
  const target = t < 0 ? NEG_RGB : POS_RGB;
  const a = Math.abs(t);
  const r = Math.round(MID_RGB[0] + (target[0] - MID_RGB[0]) * a);
  const g = Math.round(MID_RGB[1] + (target[1] - MID_RGB[1]) * a);
  const b = Math.round(MID_RGB[2] + (target[2] - MID_RGB[2]) * a);
  return `rgb(${r},${g},${b})`;
}

// ---------------------------------------------------------------------------
// RoPE lab
// ---------------------------------------------------------------------------

/** Toy head dimension: 4 numbers = two rotating 2D pairs. */
export const ROPE_DIM = 4;
/** Small base so the two pair frequencies (1.0 and 0.1 rad/position) differ visibly. */
export const ROPE_BASE = 100;
/** Position slider range for m and n. */
export const ROPE_MAX_POS = 20;
/** Offset range plotted in the score-vs-offset curve. */
export const CURVE_MAX_GAP = 20;

/** Fixed query vector (two 2D pairs), authored, displayed verbatim in the UI. */
export const Q_VEC: readonly number[] = [0.9, 0.35, 0.55, 0.75];
/** Fixed key vector (two 2D pairs), authored, displayed verbatim in the UI. */
export const K_VEC: readonly number[] = [0.7, -0.4, 0.65, 0.25];

/** Per-pair angular frequencies theta_p = base^(-2p / d). */
export function ropeThetas(
  dModel: number = ROPE_DIM,
  base: number = ROPE_BASE
): number[] {
  const out: number[] = [];
  for (let p = 0; p < Math.floor(dModel / 2); p++) {
    out.push(1 / Math.pow(base, (2 * p) / dModel));
  }
  return out;
}

/** Rotate the 2D point (x, y) by angle radians (counterclockwise). */
export function rotate2d(
  x: number,
  y: number,
  angle: number
): [number, number] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [x * c - y * s, x * s + y * c];
}

/** Apply RoPE at position pos: rotate each 2D pair of vec by pos * theta_p. */
export function ropeRotate(
  vec: readonly number[],
  pos: number,
  thetas: readonly number[]
): number[] {
  const out = vec.slice();
  for (let p = 0; p < thetas.length; p++) {
    const [x, y] = rotate2d(vec[2 * p], vec[2 * p + 1], pos * thetas[p]);
    out[2 * p] = x;
    out[2 * p + 1] = y;
  }
  return out;
}

export function dot(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** Attention score between q at position m and k at position n under RoPE. */
export function ropeScore(
  q: readonly number[],
  k: readonly number[],
  m: number,
  n: number,
  thetas: readonly number[]
): number {
  return dot(ropeRotate(q, m, thetas), ropeRotate(k, n, thetas));
}

/** Dot-product contribution of a single 2D pair at positions (m, n). */
export function pairContribution(
  q: readonly number[],
  k: readonly number[],
  pairIdx: number,
  m: number,
  n: number,
  thetas: readonly number[]
): number {
  const [qx, qy] = rotate2d(
    q[2 * pairIdx],
    q[2 * pairIdx + 1],
    m * thetas[pairIdx]
  );
  const [kx, ky] = rotate2d(
    k[2 * pairIdx],
    k[2 * pairIdx + 1],
    n * thetas[pairIdx]
  );
  return qx * kx + qy * ky;
}

export interface CurvePoint {
  gap: number;
  score: number;
}

/**
 * Score as a function of the relative offset gap = m - n, evaluated at
 * (m = gap, n = 0). Because the rotated dot product depends only on m - n,
 * score(m, n) for ANY pair with m - n = gap lands exactly on this curve;
 * the guide plots the live (m, n) score on top of it as the proof.
 */
export function scoreCurve(
  q: readonly number[],
  k: readonly number[],
  thetas: readonly number[],
  maxGap: number
): CurvePoint[] {
  const pts: CurvePoint[] = [];
  for (let gap = -maxGap; gap <= maxGap; gap++) {
    pts.push({ gap, score: ropeScore(q, k, gap, 0, thetas) });
  }
  return pts;
}
