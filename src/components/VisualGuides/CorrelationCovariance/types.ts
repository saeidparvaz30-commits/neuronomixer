// ── Core types ────────────────────────────────────────────────────────────────

export interface DataPoint {
  x: number;
  y: number;
  id: string;
}

export interface CorrelationStats {
  pearsonR: number;
  covariance: number;
  spearmanRho: number;
  kendallTau: number;
  rSquared: number;
  pValue: number;
  slope: number;
  intercept: number;
  meanX: number;
  meanY: number;
  sdX: number;
  sdY: number;
}

// ── Normal CDF approximation (Abramowitz & Stegun 26.2.17) ───────────────────

export function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const poly =
    t * (0.319381530 +
      t * (-0.356563782 +
        t * (1.781477937 +
          t * (-1.821255978 +
            t * 1.330274429))));
  const pdf = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return x >= 0 ? cdf : 1 - cdf;
}

// ── Student t two-tailed p-value (exact, via regularized incomplete beta) ────
// The previous normal approximation was anti-conservative (p too small) for
// small samples; this evaluates the exact t CDF for any df >= 1.

function logGamma(x: number): number {
  // Lanczos approximation
  const g = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += g[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200, EPS = 3e-12, FPMIN = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function regIncBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** Exact two-tailed p-value for a t statistic with df degrees of freedom. */
export function tTestPValue(tStat: number, df: number): number {
  if (!isFinite(tStat)) return 0;
  const x = df / (df + tStat * tStat);
  return Math.max(0, Math.min(1, regIncBeta(df / 2, 0.5, x)));
}

// ── Ranking helper ────────────────────────────────────────────────────────────

function rankArray(arr: number[]): number[] {
  const n = arr.length;
  const sorted = arr
    .map((v, i) => ({ v, i }))
    .sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(n);
  let j = 0;
  while (j < n) {
    let k = j;
    // Find ties
    while (k < n - 1 && sorted[k + 1].v === sorted[k].v) k++;
    const avgRank = (j + k) / 2 + 1; // 1-based average rank
    for (let m = j; m <= k; m++) ranks[sorted[m].i] = avgRank;
    j = k + 1;
  }
  return ranks;
}

// ── Main computation ──────────────────────────────────────────────────────────

export function computePearsonR(points: DataPoint[]): CorrelationStats {
  const n = points.length;

  if (n < 2) {
    return {
      pearsonR: 0, covariance: 0, spearmanRho: 0, kendallTau: 0,
      rSquared: 0, pValue: 1, slope: 0, intercept: 0,
      meanX: n === 1 ? points[0].x : 0,
      meanY: n === 1 ? points[0].y : 0,
      sdX: 0, sdY: 0,
    };
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  // Sample convention (n - 1 divisor, Bessel's correction) for covariance and
  // SDs; the population convention would divide by n instead.
  const covariance = sumXY / (n - 1);
  const sdX = Math.sqrt(sumX2 / (n - 1));
  const sdY = Math.sqrt(sumY2 / (n - 1));

  let pearsonR = 0;
  if (sdX > 0 && sdY > 0) {
    pearsonR = sumXY / Math.sqrt(sumX2 * sumY2);
    pearsonR = Math.max(-1, Math.min(1, pearsonR));
  }

  const rSquared = pearsonR * pearsonR;

  // OLS slope and intercept
  const slope = sumX2 > 0 ? sumXY / sumX2 : 0;
  const intercept = meanY - slope * meanX;

  // p-value via t-statistic (two-tailed)
  let pValue = 1;
  if (n > 2) {
    const df = n - 2;
    const r2 = pearsonR * pearsonR;
    const denom = 1 - r2;
    const tStat = denom > 1e-12
      ? pearsonR * Math.sqrt(df / denom)
      : (pearsonR > 0 ? Infinity : -Infinity);

    pValue = tTestPValue(tStat, df);
  }

  // Spearman ρ: Pearson on ranks
  const rankX = rankArray(xs);
  const rankY = rankArray(ys);
  let srSumXY = 0, srSumX2 = 0, srSumY2 = 0;
  const mrX = (n + 1) / 2;
  const mrY = (n + 1) / 2;
  for (let i = 0; i < n; i++) {
    const dx = rankX[i] - mrX;
    const dy = rankY[i] - mrY;
    srSumXY += dx * dy;
    srSumX2 += dx * dx;
    srSumY2 += dy * dy;
  }
  let spearmanRho = 0;
  if (srSumX2 > 0 && srSumY2 > 0) {
    spearmanRho = srSumXY / Math.sqrt(srSumX2 * srSumY2);
    spearmanRho = Math.max(-1, Math.min(1, spearmanRho));
  }

  // Kendall τ-b
  let concordant = 0, discordant = 0;
  let tiesX = 0, tiesY = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const signX = Math.sign(xs[j] - xs[i]);
      const signY = Math.sign(ys[j] - ys[i]);
      const product = signX * signY;
      if (product > 0) concordant++;
      else if (product < 0) discordant++;
      if (signX === 0) tiesX++;
      if (signY === 0) tiesY++;
    }
  }
  const total = (n * (n - 1)) / 2;
  const denomTau = Math.sqrt((total - tiesX) * (total - tiesY));
  const kendallTau = denomTau > 0 ? (concordant - discordant) / denomTau : 0;

  return {
    pearsonR, covariance, spearmanRho, kendallTau,
    rSquared, pValue, slope, intercept,
    meanX, meanY, sdX, sdY,
  };
}

// ── Anscombe's Quartet ────────────────────────────────────────────────────────

function mkPts(pairs: [number, number][]): DataPoint[] {
  return pairs.map(([x, y], i) => ({ x, y, id: `a-${i}` }));
}

export const ANSCOMBE_I: DataPoint[] = mkPts([
  [10, 8.04], [8, 6.95], [13, 7.58], [9, 8.81], [11, 8.33],
  [14, 9.96], [6, 7.24], [4, 4.26], [12, 10.84], [7, 4.82], [5, 5.68],
]);

export const ANSCOMBE_II: DataPoint[] = mkPts([
  [10, 9.14], [8, 8.14], [13, 8.74], [9, 8.77], [11, 9.26],
  [14, 8.10], [6, 6.13], [4, 3.10], [12, 9.13], [7, 7.26], [5, 4.74],
]);

export const ANSCOMBE_III: DataPoint[] = mkPts([
  [10, 7.46], [8, 6.77], [13, 12.74], [9, 7.11], [11, 7.81],
  [14, 8.84], [6, 6.08], [4, 5.39], [12, 8.15], [7, 6.42], [5, 5.73],
]);

export const ANSCOMBE_IV: DataPoint[] = mkPts([
  [8, 6.58], [8, 5.76], [8, 7.71], [8, 8.84], [8, 8.47],
  [8, 7.04], [8, 5.25], [19, 12.50], [8, 5.56], [8, 7.91], [8, 6.89],
]);

// ── Causation examples ────────────────────────────────────────────────────────

export interface CausationExample {
  title: string;
  xLabel: string;
  yLabel: string;
  description: string;
  lurkingVariable: string;
  naiveConclusion: string;
  correlationValue: number;
  points: DataPoint[];
}

/** Seeded pseudo-random for reproducible demo data */
function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function buildCausation1(): DataPoint[] {
  // Ice cream sales vs drowning deaths (lurking: summer)
  const rand = seededRand(42);
  return Array.from({ length: 24 }, (_, i) => {
    const month = i % 12;
    const summer = Math.exp(-((month - 6.5) ** 2) / 8);
    const x = 20 + summer * 60 + (rand() - 0.5) * 12; // ice cream
    const y = 2 + summer * 14 + (rand() - 0.5) * 3;    // drowning
    return { x: +x.toFixed(1), y: +y.toFixed(1), id: `c1-${i}` };
  });
}

function buildCausation2(): DataPoint[] {
  // Shoe size vs reading ability (lurking: age)
  const rand = seededRand(77);
  return Array.from({ length: 20 }, (_, i) => {
    const age = 5 + (i / 19) * 8 + (rand() - 0.5) * 1.5;
    const shoe = 3 + (age - 5) * 1.1 + (rand() - 0.5) * 0.8;
    const reading = 10 + (age - 5) * 9 + (rand() - 0.5) * 8;
    return { x: +shoe.toFixed(1), y: +reading.toFixed(0), id: `c2-${i}` };
  });
}

function buildCausation3(): DataPoint[] {
  // Coffee consumption vs heart disease (lurking: smoking)
  const rand = seededRand(113);
  return Array.from({ length: 20 }, (_, i) => {
    const smoker = i < 10;
    const coffee = smoker
      ? 3 + rand() * 4
      : 1 + rand() * 3;
    const heartRisk = smoker
      ? 20 + rand() * 25
      : 5 + rand() * 15;
    return { x: +coffee.toFixed(1), y: +heartRisk.toFixed(0), id: `c3-${i}` };
  });
}

export const CAUSATION_EXAMPLES: CausationExample[] = [
  {
    title: "Ice Cream Sales & Drowning Deaths",
    xLabel: "Ice Cream Sales (units/day)",
    yLabel: "Drowning Deaths (per month)",
    description:
      "Both ice cream sales and drowning rates spike in summer months. When you plot them together the correlation looks alarming — r ≈ 0.85.",
    lurkingVariable:
      "Season (Temperature) is the true driver. Hot weather makes people buy more ice cream AND swim more often, increasing drowning risk. Ice cream causes neither.",
    naiveConclusion: "Ice cream sales cause drowning deaths.",
    correlationValue: 0.85,
    points: buildCausation1(),
  },
  {
    title: "Children's Shoe Size & Reading Ability",
    xLabel: "Shoe Size (EU)",
    yLabel: "Reading Score",
    description:
      "In a sample of children aged 5–13, bigger shoe sizes strongly predict better reading scores — r ≈ 0.90. Should we buy bigger shoes?",
    lurkingVariable:
      "Age is the hidden driver. Older children have larger feet AND have had more years of schooling. Neither shoe size causes reading ability.",
    naiveConclusion: "Bigger shoe size improves reading ability.",
    correlationValue: 0.90,
    points: buildCausation2(),
  },
  {
    title: "Coffee Consumption & Heart Disease Risk",
    xLabel: "Cups of Coffee per Day",
    yLabel: "10-Year Heart Disease Risk (%)",
    description:
      "Early studies found moderate positive correlation (r ≈ 0.55) between coffee intake and cardiovascular risk, causing coffee scares.",
    lurkingVariable:
      "Smoking was the confound — heavy coffee drinkers of that era were also more likely to smoke, which actually drives the heart risk. After adjusting for smoking the coffee effect disappears or reverses.",
    naiveConclusion: "Drinking coffee causes heart disease.",
    correlationValue: 0.55,
    points: buildCausation3(),
  },
];

// ── Presets ───────────────────────────────────────────────────────────────────

function buildPreset(
  n: number,
  targetR: number,
  seed: number
): DataPoint[] {
  const rand = seededRand(seed);
  const points: DataPoint[] = [];
  for (let i = 0; i < n; i++) {
    // Box-Muller for two independent N(0,1)
    const u1 = Math.max(rand(), 1e-10);
    const u2 = rand();
    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
    // Induce correlation
    const x = z1;
    const y = targetR * z1 + Math.sqrt(1 - targetR * targetR) * z2;
    points.push({
      x: +(x * 15 + 50).toFixed(1),
      y: +(y * 15 + 50).toFixed(1),
      id: `p-${seed}-${i}`,
    });
  }
  return points;
}

export const STRONG_POS: DataPoint[]    = buildPreset(20, 0.92, 11);
export const MODERATE_POS: DataPoint[]  = buildPreset(20, 0.60, 22);
export const NO_CORR: DataPoint[]       = buildPreset(20, 0.00, 33);
export const MODERATE_NEG: DataPoint[]  = buildPreset(20, -0.60, 44);
export const STRONG_NEG: DataPoint[]    = buildPreset(20, -0.92, 55);
