// ── Math helpers ──────────────────────────────────────────────────────────────

export function normalPDF(x: number, mu: number, sigma: number): number {
  return Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
}

// Normal CDF using Abramowitz & Stegun approximation
export function normalCDF(z: number): number {
  const sign = z >= 0 ? 1 : -1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x));
  return 0.5 * (1 + sign * y);
}

export function areaUnderCurve(z1: number, z2: number): number {
  return Math.abs(normalCDF(Math.max(z1, z2)) - normalCDF(Math.min(z1, z2)));
}

export function computeZ(raw: number, mean: number, sd: number): number {
  if (sd === 0) return 0;
  return (raw - mean) / sd;
}

// ── State interface ───────────────────────────────────────────────────────────

export interface NormalDistributionState {
  markerX1: number;
  markerX2: number;
  mean: number;
  stdDev: number;
  rawValue: number;
  calculatorMean: number;
  calculatorStdDev: number;
  testA_value: number;
  testA_mean: number;
  testA_stdDev: number;
  testB_value: number;
  testB_mean: number;
  testB_stdDev: number;
  showStandardNormal: boolean;
}

export const INITIAL_STATE: NormalDistributionState = {
  markerX1: 85,
  markerX2: 115,
  mean: 100,
  stdDev: 15,
  rawValue: 115,
  calculatorMean: 100,
  calculatorStdDev: 15,
  testA_value: 85,
  testA_mean: 70,
  testA_stdDev: 10,
  testB_value: 90,
  testB_mean: 80,
  testB_stdDev: 5,
  showStandardNormal: false,
};
