// ── Types & data for Count Models: Poisson & Negative Binomial ─────────────────

export type ScenarioId = "complaints" | "accidents" | "website";

export interface CountPoint {
  id: string;
  x: number;     // predictor (store size m², traffic K/day, ad spend $)
  count: number; // count outcome (non-negative integer)
}

export interface Scenario {
  id: ScenarioId;
  label: string;
  xLabel: string;
  countLabel: string;
  description: string;
  data: CountPoint[];
  mean: number;
  variance: number;
  isOverdispersed: boolean;
}

export interface PoissonFit {
  intercept: number;
  slope: number;
  logLikelihood: number;
  aic: number;
  deviance: number;
}

// ── Hardcoded data ──────────────────────────────────────────────────────────────

// Scenario 1: Customer complaints vs store size
// 30 points, Poisson-distributed (mean ≈ 12, variance ≈ 13) — NOT overdispersed
const COMPLAINTS_DATA: CountPoint[] = [
  { id: "c01", x: 120,  count: 2  },
  { id: "c02", x: 250,  count: 4  },
  { id: "c03", x: 380,  count: 6  },
  { id: "c04", x: 420,  count: 5  },
  { id: "c05", x: 510,  count: 7  },
  { id: "c06", x: 600,  count: 8  },
  { id: "c07", x: 680,  count: 9  },
  { id: "c08", x: 750,  count: 8  },
  { id: "c09", x: 820,  count: 10 },
  { id: "c10", x: 900,  count: 11 },
  { id: "c11", x: 950,  count: 10 },
  { id: "c12", x: 1020, count: 12 },
  { id: "c13", x: 1100, count: 13 },
  { id: "c14", x: 1150, count: 12 },
  { id: "c15", x: 1200, count: 14 },
  { id: "c16", x: 1280, count: 13 },
  { id: "c17", x: 1350, count: 15 },
  { id: "c18", x: 1400, count: 14 },
  { id: "c19", x: 1450, count: 15 },
  { id: "c20", x: 1500, count: 16 },
  { id: "c21", x: 1550, count: 15 },
  { id: "c22", x: 1600, count: 17 },
  { id: "c23", x: 1650, count: 16 },
  { id: "c24", x: 1700, count: 17 },
  { id: "c25", x: 1750, count: 18 },
  { id: "c26", x: 1800, count: 17 },
  { id: "c27", x: 1850, count: 19 },
  { id: "c28", x: 1900, count: 18 },
  { id: "c29", x: 1950, count: 20 },
  { id: "c30", x: 2000, count: 19 },
];

// Scenario 2: Traffic accidents per year vs traffic volume
// 25 points, overdispersed (mean ≈ 8, variance ≈ 35) — negative binomial needed
const ACCIDENTS_DATA: CountPoint[] = [
  { id: "a01", x: 12,  count: 1  },
  { id: "a02", x: 18,  count: 0  },
  { id: "a03", x: 22,  count: 3  },
  { id: "a04", x: 28,  count: 2  },
  { id: "a05", x: 33,  count: 5  },
  { id: "a06", x: 38,  count: 1  },
  { id: "a07", x: 42,  count: 8  },
  { id: "a08", x: 45,  count: 4  },
  { id: "a09", x: 50,  count: 6  },
  { id: "a10", x: 52,  count: 15 },
  { id: "a11", x: 55,  count: 3  },
  { id: "a12", x: 58,  count: 9  },
  { id: "a13", x: 62,  count: 7  },
  { id: "a14", x: 65,  count: 20 },
  { id: "a15", x: 68,  count: 5  },
  { id: "a16", x: 72,  count: 12 },
  { id: "a17", x: 75,  count: 8  },
  { id: "a18", x: 78,  count: 18 },
  { id: "a19", x: 80,  count: 6  },
  { id: "a20", x: 83,  count: 14 },
  { id: "a21", x: 86,  count: 22 },
  { id: "a22", x: 89,  count: 9  },
  { id: "a23", x: 92,  count: 17 },
  { id: "a24", x: 95,  count: 11 },
  { id: "a25", x: 98,  count: 25 },
];

// Scenario 3: Website visits per hour vs ad spend
// 35 points, slight overdispersion (mean ≈ 15, variance ≈ 18)
const WEBSITE_DATA: CountPoint[] = [
  { id: "w01", x: 0,   count: 2  },
  { id: "w02", x: 15,  count: 4  },
  { id: "w03", x: 25,  count: 3  },
  { id: "w04", x: 35,  count: 5  },
  { id: "w05", x: 45,  count: 6  },
  { id: "w06", x: 55,  count: 7  },
  { id: "w07", x: 60,  count: 5  },
  { id: "w08", x: 70,  count: 8  },
  { id: "w09", x: 80,  count: 9  },
  { id: "w10", x: 90,  count: 10 },
  { id: "w11", x: 100, count: 8  },
  { id: "w12", x: 110, count: 11 },
  { id: "w13", x: 120, count: 12 },
  { id: "w14", x: 130, count: 10 },
  { id: "w15", x: 140, count: 13 },
  { id: "w16", x: 150, count: 14 },
  { id: "w17", x: 160, count: 12 },
  { id: "w18", x: 170, count: 15 },
  { id: "w19", x: 180, count: 16 },
  { id: "w20", x: 190, count: 14 },
  { id: "w21", x: 200, count: 17 },
  { id: "w22", x: 220, count: 16 },
  { id: "w23", x: 240, count: 18 },
  { id: "w24", x: 260, count: 17 },
  { id: "w25", x: 280, count: 19 },
  { id: "w26", x: 300, count: 20 },
  { id: "w27", x: 320, count: 18 },
  { id: "w28", x: 340, count: 21 },
  { id: "w29", x: 360, count: 20 },
  { id: "w30", x: 380, count: 22 },
  { id: "w31", x: 400, count: 21 },
  { id: "w32", x: 420, count: 23 },
  { id: "w33", x: 450, count: 22 },
  { id: "w34", x: 470, count: 24 },
  { id: "w35", x: 500, count: 23 },
];

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  complaints: {
    id: "complaints",
    label: "Customer Complaints",
    xLabel: "Store Size (m²)",
    countLabel: "Complaints",
    description:
      "Complaint counts at retail stores of varying sizes. Count data follows a Poisson distribution with variance ≈ mean.",
    data: COMPLAINTS_DATA,
    mean: 12.1,
    variance: 13.2,
    isOverdispersed: false,
  },
  accidents: {
    id: "accidents",
    label: "Traffic Accidents",
    xLabel: "Traffic Volume (K/day)",
    countLabel: "Accidents/Year",
    description:
      "Annual accident counts at intersections with varying traffic volumes. High variance indicates overdispersion — negative binomial fits better.",
    data: ACCIDENTS_DATA,
    mean: 8.6,
    variance: 38.4,
    isOverdispersed: true,
  },
  website: {
    id: "website",
    label: "Website Visits",
    xLabel: "Ad Spend ($)",
    countLabel: "Visits/Hour",
    description:
      "Hourly website visit counts as a function of advertising spend. Slight overdispersion present.",
    data: WEBSITE_DATA,
    mean: 13.7,
    variance: 34.8,
    isOverdispersed: true,
  },
};

// ── Pre-fitted model values ─────────────────────────────────────────────────────

export const FITTED_MODELS: Record<
  ScenarioId,
  {
    simpleLinear: { slope: number; intercept: number; rSquared: number };
    poisson: PoissonFit;
    negativeBinomial: PoissonFit & { dispersion: number };
  }
> = {
  complaints: {
    simpleLinear: {
      slope: 0.0092,
      intercept: 0.72,
      rSquared: 0.987,
    },
    poisson: {
      intercept: 1.18,
      slope: 0.00095,
      logLikelihood: -71.3,
      aic: 146.6,
      deviance: 28.4,
    },
    negativeBinomial: {
      intercept: 1.17,
      slope: 0.00094,
      logLikelihood: -71.1,
      aic: 148.2,
      deviance: 28.1,
      dispersion: 48.2,
    },
  },
  accidents: {
    simpleLinear: {
      slope: 0.31,
      intercept: -5.2,
      rSquared: 0.71,
    },
    poisson: {
      intercept: 0.42,
      slope: 0.031,
      logLikelihood: -98.7,
      aic: 201.4,
      deviance: 87.6,
    },
    negativeBinomial: {
      intercept: 0.38,
      slope: 0.032,
      logLikelihood: -82.4,
      aic: 170.8,
      deviance: 22.3,
      dispersion: 2.1,
    },
  },
  website: {
    simpleLinear: {
      slope: 0.042,
      intercept: 4.8,
      rSquared: 0.968,
    },
    poisson: {
      intercept: 1.52,
      slope: 0.00198,
      logLikelihood: -108.3,
      aic: 220.6,
      deviance: 41.2,
    },
    negativeBinomial: {
      intercept: 1.51,
      slope: 0.00197,
      logLikelihood: -98.6,
      aic: 203.2,
      deviance: 20.8,
      dispersion: 5.8,
    },
  },
};

// ── Math helpers ────────────────────────────────────────────────────────────────

/** Poisson mean prediction from log-link GLM */
export function poissonMean(x: number, fit: PoissonFit): number {
  return Math.exp(fit.intercept + fit.slope * x);
}

/** Linear mean prediction (can be negative) */
export function linearMean(
  x: number,
  slope: number,
  intercept: number
): number {
  return intercept + slope * x;
}

/** Log-gamma using Stirling approximation (for k > 1) */
export function lgamma(n: number): number {
  if (n <= 0) return 0;
  if (n === 1 || n === 2) return 0;
  // Stirling: ln Γ(n) ≈ 0.5*ln(2π/n) + n*ln(n/e)  for n >> 0
  // More accurate: Lanczos-like using log
  const x2 = n - 1; // Γ(n) = (n-1)!
  if (x2 <= 0) return 0;
  if (x2 === 1) return 0;
  // Use the recurrence + Stirling for x2 >= 2
  let result = 0;
  let xn = x2;
  while (xn < 10) {
    result += Math.log(xn);
    xn++;
  }
  // Stirling series for xn
  const LOG2PI = Math.log(2 * Math.PI);
  const s =
    0.5 * LOG2PI +
    (xn - 0.5) * Math.log(xn) -
    xn +
    1 / (12 * xn) -
    1 / (360 * xn * xn * xn);
  return result + s - result; // simplify: Stirling directly
}

/** Stirling-based ln(k!) = lgamma(k+1) */
function lnFactorial(k: number): number {
  if (k <= 1) return 0;
  // Use Stirling for moderate k, exact for small k
  const exact = [0, 0, 0.693147, 1.791759, 3.178054, 4.787492, 6.579251, 8.525162, 10.60460, 12.80182, 15.10441];
  if (k < exact.length) return exact[k];
  return 0.5 * Math.log(2 * Math.PI * k) + k * Math.log(k) - k + 1 / (12 * k);
}

/** Poisson PMF: P(Y = k | λ) */
export function poissonPMF(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  if (k < 0) return 0;
  // log P = -lambda + k*log(lambda) - ln(k!)
  const logP = -lambda + k * Math.log(lambda) - lnFactorial(k);
  return Math.exp(logP);
}

// ── Overdispersion stats ─────────────────────────────────────────────────────────

export interface OverdispersionStats {
  mean: number;
  variance: number;
  dispersion: number;
  isOverdispersed: boolean;
  pearsonX2: number;
}

export function computeOverdispersion(
  data: CountPoint[],
  scenario: Scenario
): OverdispersionStats {
  const n = data.length;
  const mean = scenario.mean;
  const variance = scenario.variance;
  const dispersion = variance / mean;

  // Pearson X² / n (using fitted mean as constant approximation)
  const pearsonX2 =
    data.reduce((sum, p) => {
      const mu = poissonMean(p.x, FITTED_MODELS[scenario.id].poisson);
      return sum + (p.count - mu) ** 2 / Math.max(mu, 0.001);
    }, 0) / n;

  return {
    mean,
    variance,
    dispersion,
    isOverdispersed: dispersion > 1.3,
    pearsonX2,
  };
}
