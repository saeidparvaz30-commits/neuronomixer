// ── Distribution types ────────────────────────────────────────────────────────

export type DistributionType = "normal" | "uniform" | "exponential" | "poisson";

export interface NormalParams  { mu: number; sigma: number }
export interface UniformParams { a: number; b: number }
export interface ExponentialParams { lambda: number }
export interface PoissonParams { lambda: number }

export interface DataDistributionsState {
  selectedDistribution: DistributionType;
  normalParams: NormalParams;
  uniformParams: UniformParams;
  exponentialParams: ExponentialParams;
  poissonParams: PoissonParams;
  showOverlay: boolean;
  overlayDistribution: DistributionType;
  overlayNormalParams: NormalParams;
  overlayUniformParams: UniformParams;
  overlayExponentialParams: ExponentialParams;
  overlayPoissonParams: PoissonParams;
  sampleData: number[];
  sampleSize: number;
  empiricalVisible: boolean;
  exploredDistributions: Set<DistributionType>;
  adjustedParameters: boolean;
  drewSamples: boolean;
}

// ── Histogram bin ─────────────────────────────────────────────────────────────

export interface HistBin {
  lo: number;
  hi: number;
  /** Normalised height (0-1) */
  height: number;
  /** Raw frequency count (for empirical overlay) */
  count?: number;
  /** Display label for tooltip */
  label?: string;
}

// ── Analytical statistics ─────────────────────────────────────────────────────

export interface DistStats {
  mean: number;
  median: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
  min: number;
  max: number;
  skewnessLabel: string;
  kurtosisLabel: string;
  formula: string;
}

// ── Theoretical histogram builders ───────────────────────────────────────────

const BINS = 35;

function gaussianPDF(x: number, mu: number, sigma: number): number {
  const exp = -((x - mu) ** 2) / (2 * sigma ** 2);
  return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(exp);
}

function poissonPMF(k: number, lambda: number): number {
  // Use log-factorial to avoid overflow
  let logFact = 0;
  for (let i = 2; i <= k; i++) logFact += Math.log(i);
  return Math.exp(-lambda + k * Math.log(lambda) - logFact);
}

export function getTheoreticalBins(
  dist: DistributionType,
  params: NormalParams | UniformParams | ExponentialParams | PoissonParams
): HistBin[] {
  switch (dist) {
    case "normal": {
      const { mu, sigma } = params as NormalParams;
      const lo = mu - 4 * sigma;
      const hi = mu + 4 * sigma;
      const step = (hi - lo) / BINS;
      const raw = Array.from({ length: BINS }, (_, i) => {
        const center = lo + (i + 0.5) * step;
        return gaussianPDF(center, mu, sigma) * step;
      });
      const maxH = Math.max(...raw, 1e-10);
      return raw.map((h, i) => ({
        lo: lo + i * step,
        hi: lo + (i + 1) * step,
        height: h / maxH,
        label: `${(lo + i * step).toFixed(1)} – ${(lo + (i + 1) * step).toFixed(1)}`,
      }));
    }
    case "uniform": {
      const { a, b } = params as UniformParams;
      const step = (b - a) / BINS;
      return Array.from({ length: BINS }, (_, i) => ({
        lo: a + i * step,
        hi: a + (i + 1) * step,
        height: 1,
        label: `${(a + i * step).toFixed(1)} – ${(a + (i + 1) * step).toFixed(1)}`,
      }));
    }
    case "exponential": {
      const { lambda } = params as ExponentialParams;
      const xMax = 6 / lambda;
      const step = xMax / BINS;
      const raw = Array.from({ length: BINS }, (_, i) => {
        const center = (i + 0.5) * step;
        return lambda * Math.exp(-lambda * center) * step;
      });
      const maxH = Math.max(...raw, 1e-10);
      return raw.map((h, i) => ({
        lo: i * step,
        hi: (i + 1) * step,
        height: h / maxH,
        label: `${(i * step).toFixed(2)} – ${((i + 1) * step).toFixed(2)}`,
      }));
    }
    case "poisson": {
      const { lambda } = params as PoissonParams;
      // Show k = 0 .. max(lambda*3, 20)
      const kMax = Math.max(Math.ceil(lambda * 3), 20);
      const raw = Array.from({ length: kMax + 1 }, (_, k) => poissonPMF(k, lambda));
      const maxH = Math.max(...raw, 1e-10);
      return raw.map((h, k) => ({
        lo: k - 0.4,
        hi: k + 0.4,
        height: h / maxH,
        label: `k = ${k}`,
      }));
    }
  }
}

// ── Empirical histogram ───────────────────────────────────────────────────────

export function getEmpiricalBins(
  data: number[],
  dist: DistributionType,
  params: NormalParams | UniformParams | ExponentialParams | PoissonParams
): HistBin[] {
  if (data.length === 0) return [];

  if (dist === "poisson") {
    const { lambda } = params as PoissonParams;
    const kMax = Math.max(Math.ceil(lambda * 3), 20, Math.max(...data));
    const counts = new Array(kMax + 1).fill(0);
    data.forEach(v => { const k = Math.round(v); if (k >= 0 && k <= kMax) counts[k]++; });
    const maxC = Math.max(...counts, 1);
    return counts.map((c, k) => ({
      lo: k - 0.4,
      hi: k + 0.4,
      height: c / maxC,
      count: c,
      label: `k = ${k}`,
    }));
  }

  // Continuous distributions — use same x-range as theoretical
  const theorBins = getTheoreticalBins(dist, params);
  const lo = theorBins[0].lo;
  const hi = theorBins[theorBins.length - 1].hi;
  const binCount = theorBins.length;
  const step = (hi - lo) / binCount;
  const counts = new Array(binCount).fill(0);
  data.forEach(v => {
    let idx = Math.floor((v - lo) / step);
    idx = Math.max(0, Math.min(binCount - 1, idx));
    counts[idx]++;
  });
  const maxC = Math.max(...counts, 1);
  return counts.map((c, i) => ({
    lo: lo + i * step,
    hi: lo + (i + 1) * step,
    height: c / maxC,
    count: c,
    label: `${(lo + i * step).toFixed(1)} – ${(lo + (i + 1) * step).toFixed(1)}`,
  }));
}

// ── Analytical statistics getters ─────────────────────────────────────────────

export function getDistStats(
  dist: DistributionType,
  params: NormalParams | UniformParams | ExponentialParams | PoissonParams
): DistStats {
  switch (dist) {
    case "normal": {
      const { mu, sigma } = params as NormalParams;
      return {
        mean: mu, median: mu, stdDev: sigma,
        skewness: 0, kurtosis: 3,
        min: mu - 4 * sigma, max: mu + 4 * sigma,
        skewnessLabel: "Symmetric",
        kurtosisLabel: "Normal (Mesokurtic)",
        formula: `N(${mu.toFixed(1)}, ${sigma.toFixed(1)}²)`,
      };
    }
    case "uniform": {
      const { a, b } = params as UniformParams;
      const mean = (a + b) / 2;
      const sd = Math.sqrt(((b - a) ** 2) / 12);
      return {
        mean, median: mean, stdDev: sd,
        skewness: 0, kurtosis: 1.8,
        min: a, max: b,
        skewnessLabel: "Symmetric",
        kurtosisLabel: "Platykurtic (flat)",
        formula: `U(${a}, ${b})`,
      };
    }
    case "exponential": {
      const { lambda } = params as ExponentialParams;
      const m = 1 / lambda;
      return {
        mean: m, median: Math.log(2) / lambda, stdDev: m,
        skewness: 2, kurtosis: 9,
        min: 0, max: 6 / lambda,
        skewnessLabel: "Right-skewed",
        kurtosisLabel: "Leptokurtic (heavy-tailed)",
        formula: `Exp(λ=${lambda.toFixed(2)})`,
      };
    }
    case "poisson": {
      const { lambda } = params as PoissonParams;
      const skew = 1 / Math.sqrt(lambda);
      return {
        mean: lambda, median: Math.floor(lambda + 1/3 - 0.02/lambda),
        stdDev: Math.sqrt(lambda),
        skewness: skew, kurtosis: 3 + 1 / lambda,
        min: 0, max: Math.ceil(lambda * 3),
        skewnessLabel: skew > 0.5 ? "Right-skewed" : "Nearly symmetric",
        kurtosisLabel: "Leptokurtic",
        formula: `Poisson(λ=${lambda.toFixed(1)})`,
      };
    }
  }
}

// ── Random sample generators ──────────────────────────────────────────────────

function generateNormal(mu: number, sigma: number): number {
  const u1 = Math.random(), u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * sigma + mu;
}

function generateUniform(a: number, b: number): number {
  return Math.random() * (b - a) + a;
}

function generateExponential(lambda: number): number {
  return -Math.log(Math.random()) / lambda;
}

function generatePoisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

export function generateSamples(
  dist: DistributionType,
  params: NormalParams | UniformParams | ExponentialParams | PoissonParams,
  n: number
): number[] {
  switch (dist) {
    case "normal": {
      const { mu, sigma } = params as NormalParams;
      return Array.from({ length: n }, () => generateNormal(mu, sigma));
    }
    case "uniform": {
      const { a, b } = params as UniformParams;
      return Array.from({ length: n }, () => generateUniform(a, b));
    }
    case "exponential": {
      const { lambda } = params as ExponentialParams;
      return Array.from({ length: n }, () => generateExponential(lambda));
    }
    case "poisson": {
      const { lambda } = params as PoissonParams;
      return Array.from({ length: n }, () => generatePoisson(lambda));
    }
  }
}

// ── Initial state ─────────────────────────────────────────────────────────────

export const INITIAL_STATE: DataDistributionsState = {
  selectedDistribution: "normal",
  normalParams: { mu: 50, sigma: 10 },
  uniformParams: { a: 20, b: 80 },
  exponentialParams: { lambda: 1 },
  poissonParams: { lambda: 3 },
  showOverlay: false,
  overlayDistribution: "uniform",
  overlayNormalParams: { mu: 50, sigma: 10 },
  overlayUniformParams: { a: 20, b: 80 },
  overlayExponentialParams: { lambda: 1 },
  overlayPoissonParams: { lambda: 3 },
  sampleData: [],
  sampleSize: 1000,
  empiricalVisible: false,
  exploredDistributions: new Set(["normal"]),
  adjustedParameters: false,
  drewSamples: false,
};

export const DIST_LABELS: Record<DistributionType, string> = {
  normal: "Normal",
  uniform: "Uniform",
  exponential: "Exponential",
  poisson: "Poisson",
};

export const SAMPLE_SIZES = [50, 100, 500, 1000, 5000] as const;
