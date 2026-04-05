export type DetectionMethod = "zscore" | "iqr";

export interface Point {
  id: number;
  x: number;
  y: number;
}

export const INITIAL_POINTS: Point[] = [
  // Cluster core
  { id: 0,  x: 48, y: 52 }, { id: 1,  x: 51, y: 48 }, { id: 2,  x: 50, y: 51 },
  { id: 3,  x: 49, y: 49 }, { id: 4,  x: 52, y: 50 }, { id: 5,  x: 50, y: 47 },
  { id: 6,  x: 51, y: 52 }, { id: 7,  x: 48, y: 51 }, { id: 8,  x: 50, y: 50 },
  { id: 9,  x: 49, y: 52 }, { id: 10, x: 52, y: 48 },
  // Moderate outliers
  { id: 11, x: 75, y: 30 }, { id: 12, x: 20, y: 80 }, { id: 13, x: 85, y: 15 },
  // Extreme outlier
  { id: 14, x: 95, y: 5  },
];

// ── Statistics ─────────────────────────────────────────────────────────────

export function mean(vals: number[])   { return vals.reduce((a, b) => a + b, 0) / vals.length; }
export function median(vals: number[]) {
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}
export function stdDev(vals: number[], m = mean(vals)) {
  return Math.sqrt(vals.reduce((s, v) => s + (v - m) ** 2, 0) / vals.length);
}
export function quartiles(vals: number[]) {
  const s = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  const q1 = median(s.slice(0, mid));
  const q3 = median(s.slice(s.length % 2 === 0 ? mid : mid + 1));
  return { q1, q3, iqr: q3 - q1 };
}

export function computeStats(pts: Point[]) {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const mx = mean(xs),   my = mean(ys);
  const sdx = stdDev(xs, mx);
  const { q1, q3, iqr } = quartiles(xs);
  return { meanX: mx, meanY: my, medianX: median(xs), medianY: median(ys), stdDevX: sdx, q1, q3, iqr };
}

// ── Regression ─────────────────────────────────────────────────────────────

export function regression(pts: Point[]): { slope: number; intercept: number } {
  const n = pts.length;
  const sx = pts.reduce((s, p) => s + p.x, 0);
  const sy = pts.reduce((s, p) => s + p.y, 0);
  const sxy = pts.reduce((s, p) => s + p.x * p.y, 0);
  const sx2 = pts.reduce((s, p) => s + p.x ** 2, 0);
  const denom = n * sx2 - sx ** 2;
  if (denom === 0) return { slope: 0, intercept: sy / n };
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

// ── Detection ──────────────────────────────────────────────────────────────

export function detectZScore(pts: Point[], threshold = 3): Set<number> {
  const xs = pts.map((p) => p.x);
  const m  = mean(xs);
  const s  = stdDev(xs, m);
  if (s === 0) return new Set();
  return new Set(pts.filter((p) => Math.abs((p.x - m) / s) > threshold).map((p) => p.id));
}

export function detectIQR(pts: Point[]): Set<number> {
  const xs = pts.map((p) => p.x);
  const { q1, q3, iqr } = quartiles(xs);
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  return new Set(pts.filter((p) => p.x < lo || p.x > hi).map((p) => p.id));
}
