// ── Color and label constants ─────────────────────────────────────────────────

export const GROUP_COLORS = ["#1e5d8a", "#3bb4a4", "#ec4899", "#f59e0b"] as const;
export const GROUP_NAMES = ["Method A", "Method B", "Method C", "Method D"] as const;

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface GroupData {
  groupName: string;
  values: number[];
  color: string;
}

export interface AnovaStatistics {
  grandMean: number;
  ssTotal: number;
  ssBetween: number;
  ssWithin: number;
  dfBetween: number;
  dfWithin: number;
  msBetween: number;
  msWithin: number;
  fStatistic: number;
  pValue: number;
  etaSquared: number;
}

export interface PairwiseComparison {
  group1: string;
  group2: string;
  meanDiff: number;
  ciLower: number;
  ciUpper: number;
  pValueAdjusted: number;
  significant: boolean;
}

// ── Basic math helpers ────────────────────────────────────────────────────────

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1);
}

export function stdDev(arr: number[]): number {
  return Math.sqrt(variance(arr));
}

// ── Gamma / incomplete beta (Lentz continued fraction) ───────────────────────

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

function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
  let f = 1, C = 1;
  let D = 1 - (a + b) * x / (a + 1);
  if (Math.abs(D) < 1e-30) D = 1e-30;
  D = 1 / D;
  f = D;
  for (let m = 1; m <= 200; m++) {
    let num = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    D = 1 + num * D;
    if (Math.abs(D) < 1e-30) D = 1e-30;
    D = 1 / D;
    C = 1 + num / C;
    if (Math.abs(C) < 1e-30) C = 1e-30;
    f *= C * D;
    num = (-(a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    D = 1 + num * D;
    if (Math.abs(D) < 1e-30) D = 1e-30;
    D = 1 / D;
    C = 1 + num / C;
    if (Math.abs(C) < 1e-30) C = 1e-30;
    f *= C * D;
    if (Math.abs(C * D - 1) < 1e-10) break;
  }
  return front * f;
}

export function fPValue(f: number, d1: number, d2: number): number {
  if (f <= 0) return 1;
  return incompleteBeta(d2 / (d2 + d1 * f), d2 / 2, d1 / 2);
}

export function tCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  return 1 - 0.5 * incompleteBeta(x, df / 2, 0.5);
}

// ── ANOVA computation ─────────────────────────────────────────────────────────

export function computeANOVA(groups: GroupData[]): AnovaStatistics {
  const allValues = groups.flatMap(g => g.values);
  const N = allValues.length;
  const k = groups.length;
  const grandMean = mean(allValues);

  let ssBetween = 0;
  let ssWithin = 0;

  for (const g of groups) {
    const n_j = g.values.length;
    const gMean = mean(g.values);
    ssBetween += n_j * (gMean - grandMean) ** 2;
    for (const v of g.values) {
      ssWithin += (v - gMean) ** 2;
    }
  }

  const ssTotal = ssBetween + ssWithin;
  const dfBetween = k - 1;
  const dfWithin = N - k;
  const msBetween = dfBetween > 0 ? ssBetween / dfBetween : 0;
  const msWithin = dfWithin > 0 ? ssWithin / dfWithin : 0;
  const fStatistic = msWithin === 0 ? 0 : msBetween / msWithin;
  const pValue = fPValue(fStatistic, dfBetween, dfWithin);
  const etaSquared = ssTotal === 0 ? 0 : ssBetween / ssTotal;

  return {
    grandMean,
    ssTotal,
    ssBetween,
    ssWithin,
    dfBetween,
    dfWithin,
    msBetween,
    msWithin,
    fStatistic,
    pValue,
    etaSquared,
  };
}

// ── Bonferroni-corrected pairwise t-tests ────────────────────────────────────

/**
 * Inverse Student-t CDF by bisection on tCDF.
 * Returns t >= 0 such that P(T <= t) = p, for p in [0.5, 1).
 */
export function tQuantile(p: number, df: number): number {
  if (p <= 0.5) return 0;
  let lo = 0;
  let hi = 500;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (tCDF(mid, df) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Pairwise post-hoc comparisons using Bonferroni-corrected t-tests
 * on the pooled ANOVA error (MS_Within).
 * The CIs use the same Bonferroni-adjusted level as the p-values
 * (simultaneous ~95% family coverage), so a CI excludes 0 exactly
 * when the adjusted p-value is below 0.05.
 */
export function computeBonferroniPairwise(
  groups: GroupData[],
  anova: AnovaStatistics
): PairwiseComparison[] {
  const comparisons: PairwiseComparison[] = [];
  const k = groups.length;
  const numPairs = (k * (k - 1)) / 2;
  const alpha = 0.05;
  // Bonferroni-adjusted per-comparison level for simultaneous CIs
  const tCrit =
    anova.dfWithin > 0 ? tQuantile(1 - alpha / numPairs / 2, anova.dfWithin) : 0;

  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const g1 = groups[i];
      const g2 = groups[j];
      const m1 = mean(g1.values);
      const m2 = mean(g2.values);
      const meanDiff = m1 - m2;
      const n1 = g1.values.length;
      const n2 = g2.values.length;
      const se = Math.sqrt(anova.msWithin * (1 / n1 + 1 / n2));
      const t_ij = se === 0 ? 0 : Math.abs(meanDiff) / se;
      const rawP = 2 * (1 - tCDF(t_ij, anova.dfWithin));
      const pValueAdjusted = Math.min(1, numPairs * rawP);
      const ciLower = meanDiff - tCrit * se;
      const ciUpper = meanDiff + tCrit * se;

      comparisons.push({
        group1: g1.groupName,
        group2: g2.groupName,
        meanDiff,
        ciLower,
        ciUpper,
        pValueAdjusted,
        significant: pValueAdjusted < alpha,
      });
    }
  }

  return comparisons;
}

// ── Pre-generated default datasets (no Math.random) ──────────────────────────

export const DEFAULT_METHOD_A: number[] = [
  71, 78, 65, 74, 69, 82, 67, 75, 70, 77,
  63, 80, 72, 68, 76, 73, 66, 79, 71, 74,
];

export const DEFAULT_METHOD_B: number[] = [
  75, 79, 72, 83, 76, 69, 81, 74, 78, 85,
  70, 77, 73, 80, 68, 76, 82, 71, 78, 74,
];

export const DEFAULT_METHOD_C: number[] = [
  77, 82, 70, 85, 74, 88, 79, 73, 84, 76,
  81, 69, 78, 83, 72, 87, 75, 80, 77, 74,
];

export const DEFAULT_METHOD_D: number[] = [
  74, 78, 71, 76, 80, 73, 77, 70, 75, 79,
  72, 76, 68, 77, 74, 81, 73, 76, 70, 75,
];

// ── Preset datasets ───────────────────────────────────────────────────────────

export const PRESET_ALL_EQUAL: GroupData[] = GROUP_NAMES.map((name, i) => ({
  groupName: name,
  color: GROUP_COLORS[i],
  values: [
    74, 76, 73, 75, 77, 74, 76, 73, 75, 77,
    74, 76, 73, 75, 77, 74, 76, 73, 75, 77,
  ],
}));

export const PRESET_STRONG_DIFF: GroupData[] = [
  {
    groupName: "Method A",
    color: GROUP_COLORS[0],
    values: [63, 68, 61, 66, 70, 64, 67, 62, 65, 69, 63, 68, 61, 66, 70, 64, 67, 62, 65, 69],
  },
  {
    groupName: "Method B",
    color: GROUP_COLORS[1],
    values: [73, 77, 71, 75, 79, 74, 76, 72, 74, 78, 73, 77, 71, 75, 79, 74, 76, 72, 74, 78],
  },
  {
    groupName: "Method C",
    color: GROUP_COLORS[2],
    values: [78, 83, 76, 81, 85, 79, 82, 77, 80, 84, 78, 83, 76, 81, 85, 79, 82, 77, 80, 84],
  },
  {
    groupName: "Method D",
    color: GROUP_COLORS[3],
    values: [70, 75, 68, 73, 77, 71, 74, 69, 72, 76, 70, 75, 68, 73, 77, 71, 74, 69, 72, 76],
  },
];

export const PRESET_HIGH_VARIANCE: GroupData[] = [
  {
    groupName: "Method A",
    color: GROUP_COLORS[0],
    values: [55, 90, 62, 85, 70, 45, 95, 68, 80, 57, 88, 63, 75, 48, 92, 60, 83, 52, 77, 66],
  },
  {
    groupName: "Method B",
    color: GROUP_COLORS[1],
    values: [60, 93, 65, 87, 72, 50, 97, 70, 82, 58, 91, 64, 78, 49, 95, 62, 86, 55, 79, 68],
  },
  {
    groupName: "Method C",
    color: GROUP_COLORS[2],
    values: [58, 92, 64, 88, 73, 47, 96, 69, 84, 56, 90, 66, 76, 51, 93, 61, 85, 53, 80, 67],
  },
  {
    groupName: "Method D",
    color: GROUP_COLORS[3],
    values: [57, 91, 63, 86, 71, 48, 94, 68, 81, 57, 89, 65, 77, 50, 94, 62, 84, 54, 78, 67],
  },
];

export function getDefaultGroups(): GroupData[] {
  return [
    { groupName: "Method A", color: GROUP_COLORS[0], values: [...DEFAULT_METHOD_A] },
    { groupName: "Method B", color: GROUP_COLORS[1], values: [...DEFAULT_METHOD_B] },
    { groupName: "Method C", color: GROUP_COLORS[2], values: [...DEFAULT_METHOD_C] },
    { groupName: "Method D", color: GROUP_COLORS[3], values: [...DEFAULT_METHOD_D] },
  ];
}
