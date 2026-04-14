// ── Distribution type identifiers ────────────────────────────────────────────

export type DistributionType =
  | "normal"
  | "uniform"
  | "exponential"
  | "poisson"
  | "binomial"
  | "beta"
  | "gamma"
  | "laplace";

// ── Parameter interfaces ──────────────────────────────────────────────────────

export interface NormalParams { mu: number; sigma: number }
export interface UniformParams { a: number; b: number }
export interface ExponentialParams { lambda: number }
export interface PoissonParams { lambda: number }
export interface BinomialParams { n: number; p: number }
export interface BetaParams { alpha: number; beta: number }
export interface GammaParams { alpha: number; beta: number }
export interface LaplaceParams { mu: number; b: number }

export type AllParams =
  | NormalParams
  | UniformParams
  | ExponentialParams
  | PoissonParams
  | BinomialParams
  | BetaParams
  | GammaParams
  | LaplaceParams;

// ── Distribution configuration ────────────────────────────────────────────────

export interface ParamDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface DistributionConfig {
  type: DistributionType;
  label: string;
  color: string;
  /** lucide icon name */
  icon: string;
  tagline: string;
  shortDesc: string;
  paramDefs: ParamDef[];
  isContinuous: boolean;
  defaultParams: Record<string, number>;
  /** x-axis range as [min, max] given current params */
  xRange: (params: Record<string, number>) => [number, number];
  /** Compute analytic statistics; returns label→value string pairs */
  getStats: (params: Record<string, number>) => Record<string, string>;
  useCases: string[];
}

// ── Math helpers ──────────────────────────────────────────────────────────────

function lgamma(x: number): number {
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

// ── PDF / PMF computation ─────────────────────────────────────────────────────

export function computePDF(
  type: DistributionType,
  x: number,
  params: Record<string, number>
): number {
  switch (type) {
    case "normal": {
      const { mu, sigma } = params;
      if (sigma <= 0) return 0;
      return (
        Math.exp(-0.5 * ((x - mu) / sigma) ** 2) /
        (sigma * Math.sqrt(2 * Math.PI))
      );
    }
    case "uniform": {
      const { a, b } = params;
      if (b <= a) return 0;
      return x >= a && x <= b ? 1 / (b - a) : 0;
    }
    case "exponential": {
      const { lambda } = params;
      return x < 0 ? 0 : lambda * Math.exp(-lambda * x);
    }
    case "poisson": {
      const { lambda } = params;
      const k = Math.round(x);
      if (k < 0 || k > 60) return 0;
      return Math.exp(-lambda + k * Math.log(lambda) - lgamma(k + 1));
    }
    case "binomial": {
      const { n, p } = params;
      const k = Math.round(x);
      if (k < 0 || k > n) return 0;
      if (p <= 0) return k === 0 ? 1 : 0;
      if (p >= 1) return k === n ? 1 : 0;
      return Math.exp(
        lgamma(n + 1) -
          lgamma(k + 1) -
          lgamma(n - k + 1) +
          k * Math.log(p) +
          (n - k) * Math.log(1 - p)
      );
    }
    case "beta": {
      const { alpha, beta } = params;
      if (x <= 0 || x >= 1) return 0;
      return Math.exp(
        lgamma(alpha + beta) -
          lgamma(alpha) -
          lgamma(beta) +
          (alpha - 1) * Math.log(x) +
          (beta - 1) * Math.log(1 - x)
      );
    }
    case "gamma": {
      const { alpha, beta } = params;
      if (x <= 0) return 0;
      return Math.exp(
        (alpha - 1) * Math.log(x) -
          beta * x -
          lgamma(alpha) +
          alpha * Math.log(beta)
      );
    }
    case "laplace": {
      const { mu, b } = params;
      if (b <= 0) return 0;
      return (1 / (2 * b)) * Math.exp(-Math.abs(x - mu) / b);
    }
    default:
      return 0;
  }
}

// ── Distribution registry ─────────────────────────────────────────────────────

export const DIST_ORDER: DistributionType[] = [
  "normal",
  "uniform",
  "exponential",
  "poisson",
  "binomial",
  "beta",
  "gamma",
  "laplace",
];

export const DISTRIBUTIONS: Record<DistributionType, DistributionConfig> = {
  normal: {
    type: "normal",
    label: "Normal",
    color: "#3bb4a4",
    icon: "Bell",
    tagline: "The bell curve — symmetric and ubiquitous",
    shortDesc: "Symmetric bell curve. Central Limit Theorem in action.",
    isContinuous: true,
    paramDefs: [
      { key: "mu", label: "Mean (μ)", min: -5, max: 5, step: 0.5, default: 0 },
      { key: "sigma", label: "Std Dev (σ)", min: 0.5, max: 5, step: 0.1, default: 1 },
    ],
    defaultParams: { mu: 0, sigma: 1 },
    xRange: ({ mu, sigma }) => [mu - 4 * sigma, mu + 4 * sigma],
    getStats: ({ mu, sigma }) => ({
      Mean: mu.toFixed(3),
      Variance: (sigma ** 2).toFixed(3),
      "Std Dev": sigma.toFixed(3),
      Skewness: "0.000",
      "Ex. Kurtosis": "0.000",
    }),
    useCases: [
      "Heights of a population",
      "Test scores",
      "Measurement errors",
      "Stock returns (approx.)",
    ],
  },
  uniform: {
    type: "uniform",
    label: "Uniform",
    color: "#d4af37",
    icon: "Minus",
    tagline: "Equal probability across an interval",
    shortDesc: "All values equally likely in [a, b]. Perfectly flat.",
    isContinuous: true,
    paramDefs: [
      { key: "a", label: "Min (a)", min: -10, max: 0, step: 0.5, default: -1 },
      { key: "b", label: "Max (b)", min: 0, max: 10, step: 0.5, default: 1 },
    ],
    defaultParams: { a: -1, b: 1 },
    xRange: ({ a, b }) => [a - 0.5, b + 0.5],
    getStats: ({ a, b }) => {
      const mean = (a + b) / 2;
      const variance = (b - a) ** 2 / 12;
      return {
        Mean: mean.toFixed(3),
        Variance: variance.toFixed(3),
        "Std Dev": Math.sqrt(variance).toFixed(3),
        Skewness: "0.000",
      };
    },
    useCases: [
      "Random number generation",
      "Rounding errors",
      "First digit of random time",
      "Random sampling",
    ],
  },
  exponential: {
    type: "exponential",
    label: "Exponential",
    color: "#1e5d8a",
    icon: "TrendingDown",
    tagline: "Time between independent Poisson events",
    shortDesc: "Memoryless decay. Models wait times between events.",
    isContinuous: true,
    paramDefs: [
      { key: "lambda", label: "Rate (λ)", min: 0.1, max: 3, step: 0.1, default: 1 },
    ],
    defaultParams: { lambda: 1 },
    xRange: ({ lambda }) => [0, 6 / lambda],
    getStats: ({ lambda }) => ({
      Mean: (1 / lambda).toFixed(3),
      Variance: (1 / lambda ** 2).toFixed(3),
      "Std Dev": (1 / lambda).toFixed(3),
      Skewness: "2.000",
    }),
    useCases: [
      "Time between Poisson arrivals",
      "Radioactive decay",
      "Equipment failure times",
      "Call center wait times",
    ],
  },
  poisson: {
    type: "poisson",
    label: "Poisson",
    color: "#ef4444",
    icon: "Hash",
    tagline: "Count of rare events in a fixed window",
    shortDesc: "Discrete count of events in a fixed time or space interval.",
    isContinuous: false,
    paramDefs: [
      { key: "lambda", label: "Rate (λ)", min: 0.5, max: 10, step: 0.5, default: 3 },
    ],
    defaultParams: { lambda: 3 },
    xRange: ({ lambda }) => [0, Math.max(15, lambda + 4 * Math.sqrt(lambda))],
    getStats: ({ lambda }) => ({
      Mean: lambda.toFixed(3),
      Variance: lambda.toFixed(3),
      "Std Dev": Math.sqrt(lambda).toFixed(3),
      Skewness: (1 / Math.sqrt(lambda)).toFixed(3),
    }),
    useCases: [
      "Emails received per hour",
      "Defects in manufacturing",
      "Customers at a store",
      "Website clicks per minute",
    ],
  },
  binomial: {
    type: "binomial",
    label: "Binomial",
    color: "#f59e0b",
    icon: "Percent",
    tagline: "Successes in n independent trials",
    shortDesc: "Number of successes in n independent Bernoulli trials.",
    isContinuous: false,
    paramDefs: [
      { key: "n", label: "Trials (n)", min: 1, max: 100, step: 1, default: 10 },
      { key: "p", label: "Probability (p)", min: 0.01, max: 0.99, step: 0.01, default: 0.5 },
    ],
    defaultParams: { n: 10, p: 0.5 },
    xRange: ({ n }) => [-0.5, n + 0.5],
    getStats: ({ n, p }) => {
      const mean = n * p;
      const variance = n * p * (1 - p);
      const skewness = (1 - 2 * p) / Math.sqrt(variance);
      return {
        Mean: mean.toFixed(3),
        Variance: variance.toFixed(3),
        "Std Dev": Math.sqrt(variance).toFixed(3),
        Skewness: skewness.toFixed(3),
      };
    },
    useCases: [
      "Coin flip outcomes",
      "A/B test success rates",
      "Defective items in a batch",
      "Survey yes/no answers",
    ],
  },
  beta: {
    type: "beta",
    label: "Beta",
    color: "#a855f7",
    icon: "Circle",
    tagline: "Flexible model for probabilities in [0,1]",
    shortDesc: "Bounded to [0,1]. Models proportions and Bayesian priors.",
    isContinuous: true,
    paramDefs: [
      { key: "alpha", label: "Alpha (α)", min: 0.5, max: 5, step: 0.1, default: 2 },
      { key: "beta", label: "Beta (β)", min: 0.5, max: 5, step: 0.1, default: 2 },
    ],
    defaultParams: { alpha: 2, beta: 2 },
    xRange: () => [0.001, 0.999],
    getStats: ({ alpha, beta }) => {
      const mean = alpha / (alpha + beta);
      const variance =
        (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
      return {
        Mean: mean.toFixed(4),
        Variance: variance.toFixed(5),
        "Std Dev": Math.sqrt(variance).toFixed(4),
      };
    },
    useCases: [
      "Bayesian prior for probabilities",
      "Conversion rate estimates",
      "Click-through rate modeling",
      "Random forest feature importance",
    ],
  },
  gamma: {
    type: "gamma",
    label: "Gamma",
    color: "#06b6d4",
    icon: "Triangle",
    tagline: "Wait time until the k-th Poisson event",
    shortDesc:
      "Generalizes exponential. Models amounts and wait-until-kth-event.",
    isContinuous: true,
    paramDefs: [
      { key: "alpha", label: "Shape (α)", min: 0.5, max: 5, step: 0.5, default: 2 },
      { key: "beta", label: "Rate (β)", min: 0.5, max: 5, step: 0.5, default: 1 },
    ],
    defaultParams: { alpha: 2, beta: 1 },
    xRange: ({ alpha, beta }) => [0, (alpha + 4 * Math.sqrt(alpha)) / beta],
    getStats: ({ alpha, beta }) => ({
      Mean: (alpha / beta).toFixed(3),
      Variance: (alpha / beta ** 2).toFixed(3),
      "Std Dev": Math.sqrt(alpha / beta ** 2).toFixed(3),
      Skewness: (2 / Math.sqrt(alpha)).toFixed(3),
    }),
    useCases: [
      "Time to kth event",
      "Insurance claim amounts",
      "Rainfall amounts",
      "Bayesian priors (conjugate)",
    ],
  },
  laplace: {
    type: "laplace",
    label: "Laplace",
    color: "#ec4899",
    icon: "Zap",
    tagline: "Double exponential — heavier tails than Normal",
    shortDesc: "Double exponential. Symmetric with sharper peak and fatter tails.",
    isContinuous: true,
    paramDefs: [
      { key: "mu", label: "Location (μ)", min: -5, max: 5, step: 0.5, default: 0 },
      { key: "b", label: "Scale (b)", min: 0.5, max: 3, step: 0.1, default: 1 },
    ],
    defaultParams: { mu: 0, b: 1 },
    xRange: ({ mu, b }) => [mu - 6 * b, mu + 6 * b],
    getStats: ({ mu, b }) => ({
      Mean: mu.toFixed(3),
      Variance: (2 * b ** 2).toFixed(3),
      "Std Dev": (Math.sqrt(2) * b).toFixed(3),
      Skewness: "0.000",
    }),
    useCases: [
      "Speech recognition errors",
      "Robust regression residuals",
      "Difference of exponentials",
      "Sparse ML priors (L1 regularization)",
    ],
  },
};
