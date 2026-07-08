// ── Types & data for Count Models: Poisson & Negative Binomial ─────────────────
//
// All displayed statistics (marginal moments, OLS fit, Poisson GLM fit, negative
// binomial fit, Pearson dispersion) are COMPUTED from the data arrays below at
// module load. Nothing shown on screen is hardcoded. The data itself is
// illustrative (constructed for teaching), and the guide labels it as such.

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
  mean: number;     // computed marginal mean of counts
  variance: number; // computed marginal sample variance of counts (n - 1)
}

export interface PoissonFit {
  intercept: number;
  slope: number;
  logLikelihood: number;
  aic: number;
  deviance: number;
}

export interface PoissonFitFull extends PoissonFit {
  pearsonX2: number; // sum (y - mu)^2 / mu over all points
  df: number;        // n - 2 (intercept + slope)
  phi: number;       // pearsonX2 / df, the model-based dispersion estimate
}

export interface NegBinomFit extends PoissonFit {
  theta: number;        // NB2 size parameter: Var(Y) = mu + mu^2 / theta
  thetaAtBound: boolean; // true when theta ran to the search bound (NB ~ Poisson)
}

// ── Illustrative data ───────────────────────────────────────────────────────────

// Scenario 1: Customer complaints vs store size (30 points)
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

// Scenario 2: Traffic accidents per year vs traffic volume (25 points)
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

// Scenario 3: Website visits per hour vs ad spend (35 points)
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

// ── Math helpers ────────────────────────────────────────────────────────────────

/** Log-gamma via the Lanczos approximation (g = 7, n = 9). Accurate to ~1e-13 for x > 0. */
const LANCZOS_COEFFS = [
  676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

export function lgamma(x: number): number {
  if (x <= 0) return Infinity;
  if (x < 0.5) {
    // Reflection formula
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  }
  const z = x - 1;
  let a = 0.99999999999980993;
  for (let i = 0; i < LANCZOS_COEFFS.length; i++) {
    a += LANCZOS_COEFFS[i] / (z + i + 1);
  }
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

/** ln(k!) = lgamma(k + 1) */
function lnFactorial(k: number): number {
  if (k <= 1) return 0;
  return lgamma(k + 1);
}

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

/** Poisson PMF: P(Y = k | λ) */
export function poissonPMF(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  if (k < 0) return 0;
  const logP = -lambda + k * Math.log(lambda) - lnFactorial(k);
  return Math.exp(logP);
}

// ── Model fitting (runs once at module load; all deterministic) ─────────────────

function marginalStats(data: CountPoint[]): { mean: number; variance: number } {
  const n = data.length;
  const mean = data.reduce((s, d) => s + d.count, 0) / n;
  const variance =
    data.reduce((s, d) => s + (d.count - mean) ** 2, 0) / (n - 1);
  return { mean, variance };
}

/** Ordinary least squares for y = intercept + slope * x, with R². */
function fitOLS(data: CountPoint[]): {
  slope: number;
  intercept: number;
  rSquared: number;
} {
  const n = data.length;
  const mx = data.reduce((s, d) => s + d.x, 0) / n;
  const my = data.reduce((s, d) => s + d.count, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const d of data) {
    sxy += (d.x - mx) * (d.count - my);
    sxx += (d.x - mx) ** 2;
    syy += (d.count - my) ** 2;
  }
  const slope = sxy / sxx;
  return {
    slope,
    intercept: my - slope * mx,
    rSquared: (sxy * sxy) / (sxx * syy),
  };
}

/** Weighted least squares for the design [1, x]; returns [b0, b1]. */
function wlsSolve(data: CountPoint[], w: number[], z: number[]): [number, number] {
  let s0 = 0, s1 = 0, s2 = 0, t0 = 0, t1 = 0;
  for (let i = 0; i < data.length; i++) {
    const x = data[i].x;
    s0 += w[i];
    s1 += w[i] * x;
    s2 += w[i] * x * x;
    t0 += w[i] * z[i];
    t1 += w[i] * z[i] * x;
  }
  const det = s0 * s2 - s1 * s1;
  return [(s2 * t0 - s1 * t1) / det, (s0 * t1 - s1 * t0) / det];
}

/** Poisson GLM (log link) fitted by IRLS. */
function fitPoissonGLM(data: CountPoint[]): PoissonFitFull {
  const n = data.length;
  let b0 = Math.log(Math.max(1e-3, data.reduce((s, d) => s + d.count, 0) / n));
  let b1 = 0;
  for (let it = 0; it < 100; it++) {
    const mu = data.map((d) => Math.exp(b0 + b1 * d.x));
    const w = mu.map((m) => Math.max(m, 1e-10));
    const z = data.map((d, i) => b0 + b1 * d.x + (d.count - mu[i]) / w[i]);
    const [nb0, nb1] = wlsSolve(data, w, z);
    const converged = Math.abs(nb0 - b0) < 1e-12 && Math.abs(nb1 - b1) < 1e-14;
    b0 = nb0;
    b1 = nb1;
    if (converged) break;
  }
  const mu = data.map((d) => Math.exp(b0 + b1 * d.x));
  let logLik = 0, deviance = 0, pearsonX2 = 0;
  data.forEach((d, i) => {
    const y = d.count;
    logLik += -mu[i] + y * Math.log(mu[i]) - lnFactorial(y);
    deviance += 2 * ((y > 0 ? y * Math.log(y / mu[i]) : 0) - (y - mu[i]));
    pearsonX2 += (y - mu[i]) ** 2 / mu[i];
  });
  const df = n - 2;
  return {
    intercept: b0,
    slope: b1,
    logLikelihood: logLik,
    aic: -2 * logLik + 2 * 2,
    deviance,
    pearsonX2,
    df,
    phi: pearsonX2 / df,
  };
}

/** NB2 log-likelihood given coefficients and theta. */
function negBinomLogLik(
  data: CountPoint[],
  b0: number,
  b1: number,
  theta: number
): number {
  let ll = 0;
  for (const d of data) {
    const mu = Math.exp(b0 + b1 * d.x);
    ll +=
      lgamma(d.count + theta) - lgamma(theta) - lnFactorial(d.count) +
      theta * Math.log(theta / (theta + mu)) +
      d.count * Math.log(mu / (theta + mu));
  }
  return ll;
}

/** NB2 IRLS for the regression coefficients at fixed theta. */
function fitNegBinomBeta(
  data: CountPoint[],
  theta: number,
  start0: number,
  start1: number
): [number, number] {
  let b0 = start0, b1 = start1;
  for (let it = 0; it < 200; it++) {
    const mu = data.map((d) => Math.exp(b0 + b1 * d.x));
    const w = mu.map((m) => m / (1 + m / theta));
    const z = data.map((d, i) => b0 + b1 * d.x + (d.count - mu[i]) / mu[i]);
    const [nb0, nb1] = wlsSolve(data, w, z);
    const converged = Math.abs(nb0 - b0) < 1e-12 && Math.abs(nb1 - b1) < 1e-14;
    b0 = nb0;
    b1 = nb1;
    if (converged) break;
  }
  return [b0, b1];
}

const THETA_BOUND = 1e5; // above this the NB is numerically indistinguishable from Poisson

/**
 * NB2 regression: theta by profile likelihood (golden-section search on
 * log-theta), coefficients by IRLS at each candidate theta.
 */
function fitNegBinomGLM(data: CountPoint[], start: PoissonFitFull): NegBinomFit {
  const profile = (logTheta: number) => {
    const theta = Math.exp(logTheta);
    const [b0, b1] = fitNegBinomBeta(data, theta, start.intercept, start.slope);
    return { theta, b0, b1, ll: negBinomLogLik(data, b0, b1, theta) };
  };
  let lo = Math.log(0.05);
  let hi = Math.log(1e7);
  const gr = (Math.sqrt(5) - 1) / 2;
  let c = hi - gr * (hi - lo);
  let d = lo + gr * (hi - lo);
  let fc = profile(c);
  let fd = profile(d);
  for (let i = 0; i < 80; i++) {
    if (fc.ll > fd.ll) {
      hi = d; d = c; fd = fc;
      c = hi - gr * (hi - lo);
      fc = profile(c);
    } else {
      lo = c; c = d; fc = fd;
      d = lo + gr * (hi - lo);
      fd = profile(d);
    }
  }
  const best = fc.ll > fd.ll ? fc : fd;
  const { theta, b0, b1, ll } = best;
  const mu = data.map((p) => Math.exp(b0 + b1 * p.x));
  let deviance = 0;
  data.forEach((p, i) => {
    const y = p.count;
    const t1 = y > 0 ? y * Math.log(y / mu[i]) : 0;
    deviance += 2 * (t1 - (y + theta) * Math.log((y + theta) / (mu[i] + theta)));
  });
  return {
    intercept: b0,
    slope: b1,
    logLikelihood: ll,
    aic: -2 * ll + 2 * 3, // three parameters: intercept, slope, theta
    deviance,
    theta,
    thetaAtBound: theta > THETA_BOUND,
  };
}

// ── Scenarios (marginal stats computed from the data) ───────────────────────────

const COMPLAINTS_STATS = marginalStats(COMPLAINTS_DATA);
const ACCIDENTS_STATS = marginalStats(ACCIDENTS_DATA);
const WEBSITE_STATS = marginalStats(WEBSITE_DATA);

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  complaints: {
    id: "complaints",
    label: "Customer Complaints",
    xLabel: "Store Size (m²)",
    countLabel: "Complaints",
    description:
      "Complaint counts at retail stores of varying sizes (illustrative data). After fitting the trend, the Poisson model leaves no excess variation: Pearson X²/df is well below 1, so there is no overdispersion.",
    data: COMPLAINTS_DATA,
    ...COMPLAINTS_STATS,
  },
  accidents: {
    id: "accidents",
    label: "Traffic Accidents",
    xLabel: "Traffic Volume (K/day)",
    countLabel: "Accidents/Year",
    description:
      "Annual accident counts at intersections with varying traffic volumes (illustrative data). Even after fitting the trend, Pearson X²/df stays far above 1: genuine overdispersion, so the negative binomial fits better.",
    data: ACCIDENTS_DATA,
    ...ACCIDENTS_STATS,
  },
  website: {
    id: "website",
    label: "Website Visits",
    xLabel: "Ad Spend ($)",
    countLabel: "Visits/Hour",
    description:
      "Hourly website visit counts versus advertising spend (illustrative data). The raw Var/Mean ratio looks high, but that is the trend talking: after fitting it, Pearson X²/df drops below 1 and no real overdispersion remains.",
    data: WEBSITE_DATA,
    ...WEBSITE_STATS,
  },
};

// ── Fitted models (computed, not hardcoded) ─────────────────────────────────────

function fitScenario(data: CountPoint[]) {
  const poisson = fitPoissonGLM(data);
  return {
    simpleLinear: fitOLS(data),
    poisson,
    negativeBinomial: fitNegBinomGLM(data, poisson),
  };
}

export const FITTED_MODELS: Record<
  ScenarioId,
  {
    simpleLinear: { slope: number; intercept: number; rSquared: number };
    poisson: PoissonFitFull;
    negativeBinomial: NegBinomFit;
  }
> = {
  complaints: fitScenario(COMPLAINTS_DATA),
  accidents: fitScenario(ACCIDENTS_DATA),
  website: fitScenario(WEBSITE_DATA),
};

// ── Dispersion diagnostics ──────────────────────────────────────────────────────

export interface OverdispersionStats {
  mean: number;               // marginal mean of the counts
  variance: number;           // marginal sample variance of the counts
  marginalDispersion: number; // variance / mean of the raw counts (trend-inflated)
  pearsonX2: number;          // Pearson X² of the fitted Poisson model
  df: number;                 // residual degrees of freedom (n - 2)
  phi: number;                // X² / df, the model-based dispersion estimate
  isOverdispersed: boolean;   // based on phi, NOT on the marginal ratio
}

/** phi substantially above 1 signals overdispersion relative to the fitted Poisson model. */
const PHI_OVERDISPERSION_THRESHOLD = 1.5;

export function computeOverdispersion(scenarioId: ScenarioId): OverdispersionStats {
  const scenario = SCENARIOS[scenarioId];
  const poisson = FITTED_MODELS[scenarioId].poisson;
  return {
    mean: scenario.mean,
    variance: scenario.variance,
    marginalDispersion: scenario.variance / scenario.mean,
    pearsonX2: poisson.pearsonX2,
    df: poisson.df,
    phi: poisson.phi,
    isOverdispersed: poisson.phi > PHI_OVERDISPERSION_THRESHOLD,
  };
}
