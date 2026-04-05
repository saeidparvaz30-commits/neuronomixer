export type DistId = "normal" | "uniform" | "exponential" | "poisson" | "binomial" | "beta" | "gamma" | "laplace";

export interface DistParam { label: string; min: number; max: number; step: number; default: number; key: string }
export type ParamValues = Record<string, number>;

// ── Math helpers ─────────────────────────────────────────────────────────────
function lgamma(x: number): number {
  const c = [76.18009172947146,-86.50532032941677,24.01409824083091,
    -1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let r = 1; for (let i = 2; i <= n; i++) r *= i; return r;
}

function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  return Math.exp(lgamma(n+1) - lgamma(k+1) - lgamma(n-k+1));
}

// ── PDF/PMF functions ─────────────────────────────────────────────────────────
export function computePDF(id: DistId, x: number, params: ParamValues): number {
  switch (id) {
    case "normal": {
      const { mu, sigma } = params;
      if (sigma <= 0) return 0;
      return Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
    }
    case "uniform": {
      const { a, b } = params;
      return x >= a && x <= b ? 1 / (b - a) : 0;
    }
    case "exponential": {
      const lambda = params.lambda;
      return x < 0 ? 0 : lambda * Math.exp(-lambda * x);
    }
    case "poisson": {
      const lambda = params.lambda;
      const k = Math.round(x);
      if (k < 0 || k > 40) return 0;
      return Math.exp(-lambda + k * Math.log(lambda) - lgamma(k + 1));
    }
    case "binomial": {
      const { n, p } = params;
      const k = Math.round(x);
      if (k < 0 || k > n) return 0;
      return comb(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
    }
    case "beta": {
      const { alpha, beta } = params;
      if (x <= 0 || x >= 1) return 0;
      return Math.exp(lgamma(alpha + beta) - lgamma(alpha) - lgamma(beta) +
        (alpha - 1) * Math.log(x) + (beta - 1) * Math.log(1 - x));
    }
    case "gamma": {
      const { alpha, beta } = params;
      if (x <= 0) return 0;
      return Math.exp((alpha - 1) * Math.log(x) - beta * x - lgamma(alpha) + alpha * Math.log(beta));
    }
    case "laplace": {
      const { mu, b } = params;
      return (1 / (2 * b)) * Math.exp(-Math.abs(x - mu) / b);
    }
    default: return 0;
  }
}

// ── Distribution metadata ─────────────────────────────────────────────────────
export interface DistMeta {
  label: string;
  color: string;
  type: "continuous" | "discrete";
  params: DistParam[];
  defaultParams: ParamValues;
  xRange: (params: ParamValues) => [number, number];
  stats: (params: ParamValues) => Record<string, string>;
  useCases: string[];
  shortDesc: string;
}

export const DISTRIBUTIONS: Record<DistId, DistMeta> = {
  normal: {
    label: "Normal", color: "#3bb4a4", type: "continuous",
    shortDesc: "Symmetric bell curve. The most common distribution in nature.",
    params: [
      { label: "Mean (μ)", key: "mu", min: -5, max: 5, step: 0.5, default: 0 },
      { label: "Std Dev (σ)", key: "sigma", min: 0.5, max: 5, step: 0.1, default: 1 },
    ],
    defaultParams: { mu: 0, sigma: 1 },
    xRange: ({ mu, sigma }) => [mu - 4 * sigma, mu + 4 * sigma],
    stats: ({ mu, sigma }) => ({
      Mean: mu.toFixed(2), Variance: (sigma**2).toFixed(2), "Std Dev": sigma.toFixed(2),
      Skewness: "0.00", Kurtosis: "0.00",
    }),
    useCases: ["Heights of a population", "Test scores", "Measurement errors", "Blood pressure values"],
  },
  uniform: {
    label: "Uniform", color: "#d4af37", type: "continuous",
    shortDesc: "All values equally likely in [a, b]. Perfectly flat.",
    params: [
      { label: "Min (a)", key: "a", min: -10, max: 0, step: 0.5, default: 0 },
      { label: "Max (b)", key: "b", min: 0, max: 10, step: 0.5, default: 5 },
    ],
    defaultParams: { a: 0, b: 5 },
    xRange: ({ a, b }) => [a - 0.5, b + 0.5],
    stats: ({ a, b }) => {
      const mu = (a + b) / 2, variance = (b - a) ** 2 / 12;
      return { Mean: mu.toFixed(2), Variance: variance.toFixed(2), "Std Dev": Math.sqrt(variance).toFixed(2) };
    },
    useCases: ["Fair dice rolls", "Random number generators", "Uniform sampling", "Simulation seeds"],
  },
  exponential: {
    label: "Exponential", color: "#1e5d8a", type: "continuous",
    shortDesc: "Time between events in a Poisson process. Right-skewed.",
    params: [{ label: "Rate (λ)", key: "lambda", min: 0.1, max: 3, step: 0.1, default: 1 }],
    defaultParams: { lambda: 1 },
    xRange: ({ lambda }) => [0, 5 / lambda],
    stats: ({ lambda }) => ({
      Mean: (1/lambda).toFixed(2), Variance: (1/lambda**2).toFixed(2),
      "Std Dev": (1/lambda).toFixed(2), Skewness: "2.00",
    }),
    useCases: ["Time between arrivals", "Radioactive decay", "Equipment failure times", "Customer service times"],
  },
  poisson: {
    label: "Poisson", color: "#ef4444", type: "discrete",
    shortDesc: "Count of events in a fixed interval. Right-skewed for small λ.",
    params: [{ label: "Rate (λ)", key: "lambda", min: 0.5, max: 10, step: 0.5, default: 3 }],
    defaultParams: { lambda: 3 },
    xRange: ({ lambda }) => [0, Math.max(15, lambda + 4 * Math.sqrt(lambda))],
    stats: ({ lambda }) => ({
      Mean: lambda.toFixed(2), Variance: lambda.toFixed(2),
      "Std Dev": Math.sqrt(lambda).toFixed(2), Skewness: (1/Math.sqrt(lambda)).toFixed(2),
    }),
    useCases: ["Emails per hour", "Defects in manufacturing", "Customers arriving at a store", "Mutations per genome"],
  },
  binomial: {
    label: "Binomial", color: "#f59e0b", type: "discrete",
    shortDesc: "Number of successes in n independent trials with probability p.",
    params: [
      { label: "Trials (n)", key: "n", min: 1, max: 50, step: 1, default: 10 },
      { label: "Probability (p)", key: "p", min: 0.01, max: 0.99, step: 0.01, default: 0.5 },
    ],
    defaultParams: { n: 10, p: 0.5 },
    xRange: ({ n }) => [-0.5, n + 0.5],
    stats: ({ n, p }) => ({
      Mean: (n*p).toFixed(2), Variance: (n*p*(1-p)).toFixed(2),
      "Std Dev": Math.sqrt(n*p*(1-p)).toFixed(2), Skewness: ((1-2*p)/Math.sqrt(n*p*(1-p))).toFixed(2),
    }),
    useCases: ["Coin flips", "Success rate in A/B tests", "Defective items in a batch", "Election forecasting"],
  },
  beta: {
    label: "Beta", color: "#a855f7", type: "continuous",
    shortDesc: "Bounded to [0,1]. Models probabilities and proportions.",
    params: [
      { label: "Alpha (α)", key: "alpha", min: 0.5, max: 8, step: 0.5, default: 2 },
      { label: "Beta (β)", key: "beta", min: 0.5, max: 8, step: 0.5, default: 2 },
    ],
    defaultParams: { alpha: 2, beta: 2 },
    xRange: () => [0, 1],
    stats: ({ alpha, beta }) => {
      const mu = alpha / (alpha + beta);
      const v = alpha * beta / ((alpha + beta) ** 2 * (alpha + beta + 1));
      return { Mean: mu.toFixed(3), Variance: v.toFixed(4), "Std Dev": Math.sqrt(v).toFixed(3) };
    },
    useCases: ["Bayesian priors for probabilities", "A/B test conversion rates", "Modelling proportions", "Random forest feature importance"],
  },
  gamma: {
    label: "Gamma", color: "#06b6d4", type: "continuous",
    shortDesc: "Generalizes the exponential. Models wait times and amounts.",
    params: [
      { label: "Shape (α)", key: "alpha", min: 0.5, max: 8, step: 0.5, default: 2 },
      { label: "Rate (β)", key: "beta", min: 0.5, max: 4, step: 0.5, default: 1 },
    ],
    defaultParams: { alpha: 2, beta: 1 },
    xRange: ({ alpha, beta }) => [0, (alpha + 4 * Math.sqrt(alpha)) / beta],
    stats: ({ alpha, beta }) => ({
      Mean: (alpha/beta).toFixed(2), Variance: (alpha/beta**2).toFixed(2),
      "Std Dev": Math.sqrt(alpha/beta**2).toFixed(2), Skewness: (2/Math.sqrt(alpha)).toFixed(2),
    }),
    useCases: ["Insurance claim amounts", "Time until nth event", "Queuing systems", "Bayesian priors (conjugate)"],
  },
  laplace: {
    label: "Laplace", color: "#ec4899", type: "continuous",
    shortDesc: "Double exponential. Heavier tails than normal. Robust regression.",
    params: [
      { label: "Location (μ)", key: "mu", min: -5, max: 5, step: 0.5, default: 0 },
      { label: "Scale (b)", key: "b", min: 0.5, max: 3, step: 0.1, default: 1 },
    ],
    defaultParams: { mu: 0, b: 1 },
    xRange: ({ mu, b }) => [mu - 6*b, mu + 6*b],
    stats: ({ mu, b }) => ({
      Mean: mu.toFixed(2), Variance: (2*b**2).toFixed(2), "Std Dev": (Math.sqrt(2)*b).toFixed(2), Skewness: "0.00",
    }),
    useCases: ["Robust regression (L1 loss)", "Signal processing", "Finance (fat tails)", "Sparse priors in ML"],
  },
};

export const DIST_ORDER: DistId[] = ["normal", "uniform", "exponential", "poisson", "binomial", "beta", "gamma", "laplace"];
