// ── Types ─────────────────────────────────────────────────────────────────────

export type ActiveDistribution = "t" | "chi-square" | "f";

export interface StudentTChiSquareFState {
  tDF: number;
  chiSquareDF: number;
  fDF1: number;
  fDF2: number;
  activeDistribution: ActiveDistribution;
  showConvergence: boolean;
}

export const INITIAL_STATE: StudentTChiSquareFState = {
  tDF: 3,
  chiSquareDF: 5,
  fDF1: 3,
  fDF2: 10,
  activeDistribution: "t",
  showConvergence: false,
};

// ── Math helpers ──────────────────────────────────────────────────────────────

// Log-gamma via Lanczos approximation
export function logGamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  const zz = z - 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (zz + i);
  const t = zz + g + 0.5;
  return (
    0.5 * Math.log(2 * Math.PI) +
    (zz + 0.5) * Math.log(t) -
    t +
    Math.log(x)
  );
}

export function gamma(z: number): number {
  return Math.exp(logGamma(z));
}

// t-distribution PDF
export function tPDF(x: number, df: number): number {
  const num = gamma((df + 1) / 2);
  const denom = Math.sqrt(df * Math.PI) * gamma(df / 2);
  return (num / denom) * Math.pow(1 + (x * x) / df, -(df + 1) / 2);
}

// Standard normal PDF
export function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Chi-square PDF
export function chiSquarePDF(x: number, df: number): number {
  if (x <= 0) return 0;
  return Math.exp(
    (df / 2 - 1) * Math.log(x) -
      x / 2 -
      (df / 2) * Math.log(2) -
      logGamma(df / 2)
  );
}

// F-distribution PDF: f(x) = sqrt((d1 x)^d1 d2^d2 / (d1 x + d2)^(d1+d2)) / (x B(d1/2, d2/2))
export function fPDF(x: number, df1: number, df2: number): number {
  if (x <= 0) return 0;
  const num = Math.pow(df1 * x, df1) * Math.pow(df2, df2);
  const denom = Math.pow(df1 * x + df2, df1 + df2);
  const logBeta =
    logGamma(df1 / 2) + logGamma(df2 / 2) - logGamma((df1 + df2) / 2);
  return Math.sqrt(num / denom) / (x * Math.exp(logBeta));
}

// ── SVG path helpers ──────────────────────────────────────────────────────────

export function generatePoints(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
  n = 300
): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const x = xMin + (i / (n - 1)) * (xMax - xMin);
    return [x, Math.max(0, fn(x))] as [number, number];
  });
}

export function pointsToSVGPath(
  points: [number, number][],
  svgW: number,
  svgH: number,
  xMin: number,
  xMax: number,
  yMax: number
): string {
  const scaleX = (x: number) => ((x - xMin) / (xMax - xMin)) * svgW;
  const scaleY = (y: number) => svgH - (y / yMax) * svgH * 0.85;
  return points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${scaleX(x).toFixed(1)},${scaleY(y).toFixed(1)}`)
    .join(" ");
}
