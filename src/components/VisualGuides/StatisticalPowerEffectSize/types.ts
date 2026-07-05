// ── State interface ────────────────────────────────────────────────────────────

export interface StatisticalPowerState {
  cohensD: number;               // 0.1 to 2.0, default 0.5
  alpha: 0.05 | 0.01 | 0.001;
  twoTailed: boolean;
  sampleSizePerGroup: number;    // 10 to 500, default 64
  computedPower: number;
  group1Mean: number;            // default 100
  group2Mean: number;            // default 110
  pooledSD: number;              // default 15
  calculatedD: number;           // computed from means/sd
  targetPower: 0.70 | 0.80 | 0.90;
  plannedD: number;              // default 0.5
  plannedAlpha: 0.05 | 0.01;
  plannedN: number;              // computed
}

export const INITIAL_STATE: StatisticalPowerState = {
  cohensD: 0.5,
  alpha: 0.05,
  twoTailed: true,
  sampleSizePerGroup: 64,
  computedPower: 0,
  group1Mean: 100,
  group2Mean: 110,
  pooledSD: 15,
  calculatedD: 0,
  targetPower: 0.80,
  plannedD: 0.5,
  plannedAlpha: 0.05,
  plannedN: 0,
};

// ── Math helpers ───────────────────────────────────────────────────────────────

/**
 * Standard normal CDF: Phi(z) = 0.5 * (1 + erf(z / sqrt(2))).
 * erf approximated via Abramowitz & Stegun 7.1.26, evaluated at |z|/sqrt(2)
 * with exp(-z^2/2). (Evaluating the erf polynomial at z directly with
 * exp(-z^2) computes ~Phi(z*sqrt(2)), which inflated every printed power.)
 */
export function normalCDF(z: number): number {
  const p = 0.3275911;
  const a = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429];
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + p * x);
  const poly = t * (a[0] + t * (a[1] + t * (a[2] + t * (a[3] + t * a[4]))));
  const erf = 1 - poly * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

/** Beasley-Springer-Moro inverse normal CDF */
export function normalInvCDF(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [2.515517, 0.802853, 0.010328];
  const b = [1.432788, 0.189269, 0.001308];
  const t = p < 0.5 ? Math.sqrt(-2 * Math.log(p)) : Math.sqrt(-2 * Math.log(1 - p));
  const num = a[0] + t * (a[1] + t * a[2]);
  const den = 1 + t * (b[0] + t * (b[1] + t * b[2]));
  const x = t - num / den;
  return p < 0.5 ? -x : x;
}

/** Power for two-sample t-test using normal approximation */
export function computePower(
  d: number,
  n: number,
  alpha: number,
  twoTailed: boolean
): number {
  if (d <= 0 || n < 2) return alpha;
  const zAlpha = normalInvCDF(twoTailed ? 1 - alpha / 2 : 1 - alpha);
  const ncp = d * Math.sqrt(n / 2);
  const power =
    1 - normalCDF(zAlpha - ncp) + (twoTailed ? normalCDF(-zAlpha - ncp) : 0);
  return Math.max(0, Math.min(1, power));
}

/** Required sample size per group for given power */
export function computeSampleSize(
  d: number,
  targetPower: number,
  alpha: number,
  twoTailed: boolean
): number {
  if (d <= 0) return 9999;
  const zAlpha = normalInvCDF(twoTailed ? 1 - alpha / 2 : 1 - alpha);
  const zBeta = normalInvCDF(targetPower);
  return Math.ceil(2 * ((zAlpha + zBeta) / d) ** 2);
}

/** Cohen's d from means and pooled SD */
export function computeCohensD(m1: number, m2: number, sd: number): number {
  if (sd <= 0) return 0;
  return Math.abs(m2 - m1) / sd;
}

/** Interpretation label for Cohen's d */
export function effectSizeLabel(d: number): string {
  if (d < 0.2) return "Negligible";
  if (d < 0.5) return "Small";
  if (d < 0.8) return "Medium";
  if (d < 1.2) return "Large";
  return "Very Large";
}
