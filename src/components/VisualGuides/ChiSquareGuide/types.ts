// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ContingencyTable {
  rowLabels: string[];
  colLabels: string[];
  data: number[][];
}

export interface ChiSquareResult {
  chiSq: number;
  df: number;
  pValue: number;
  contributions: number[][];
  lowExpectedWarning: boolean;
}

export interface AssociationMeasures {
  cramersV: number;
  phi?: number;
  oddsRatio?: number;
  riskRatio?: number;
  effectSizeLabel: "weak" | "moderate" | "strong";
}

// ── Gamma / regularized incomplete gamma ─────────────────────────────────────

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

/**
 * Regularised lower incomplete gamma P(a, x) via series expansion.
 * Returns the probability that a chi-squared random variable with 2a degrees
 * of freedom is less than 2x.
 */
function regularizedGammaP(a: number, x: number): number {
  if (x < 0) return 0;
  if (x === 0) return 0;
  if (x >= a + 1) {
    // Use continued fraction for upper tail then subtract
    return 1 - regularizedGammaQ(a, x);
  }
  // Series expansion
  let sum = 1 / a;
  let term = 1 / a;
  for (let n = 1; n <= 300; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < 1e-12 * Math.abs(sum)) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
}

/** Regularised upper incomplete gamma Q(a, x) via Lentz continued fraction. */
function regularizedGammaQ(a: number, x: number): number {
  if (x < 0) return 1;
  if (x < a + 1) return 1 - regularizedGammaP(a, x);
  // Lentz method
  let f = x - a + 1;
  if (Math.abs(f) < 1e-30) f = 1e-30;
  let C = f;
  let D = 0;
  for (let i = 1; i <= 200; i++) {
    const an = i * (a - i);
    const bn = x - a + 2 * i + 1;
    D = bn + an * D;
    if (Math.abs(D) < 1e-30) D = 1e-30;
    C = bn + an / C;
    if (Math.abs(C) < 1e-30) C = 1e-30;
    D = 1 / D;
    const delta = C * D;
    f *= delta;
    if (Math.abs(delta - 1) < 1e-10) break;
  }
  return Math.exp(-x + a * Math.log(x) - lgamma(a)) / f;
}

/**
 * p-value for a chi-squared statistic with `df` degrees of freedom.
 * = 1 - P(df/2, chiSq/2)  = Q(df/2, chiSq/2)
 */
export function chiSquarePValue(chiSq: number, df: number): number {
  if (chiSq <= 0 || df <= 0) return 1;
  return regularizedGammaQ(df / 2, chiSq / 2);
}

// ── Core math ─────────────────────────────────────────────────────────────────

/** Row totals. */
export function rowTotals(data: number[][]): number[] {
  return data.map(row => row.reduce((a, b) => a + b, 0));
}

/** Column totals. */
export function colTotals(data: number[][]): number[] {
  const cols = data[0]?.length ?? 0;
  return Array.from({ length: cols }, (_, j) =>
    data.reduce((s, row) => s + (row[j] ?? 0), 0)
  );
}

/** Grand total. */
export function grandTotal(data: number[][]): number {
  return data.reduce((s, row) => s + row.reduce((a, b) => a + b, 0), 0);
}

/** E_ij = (rowTotal_i × colTotal_j) / grandTotal */
export function computeExpected(table: ContingencyTable): number[][] {
  const rt = rowTotals(table.data);
  const ct = colTotals(table.data);
  const gt = grandTotal(table.data);
  if (gt === 0) {
    return table.data.map(row => row.map(() => 0));
  }
  return table.data.map((row, i) =>
    row.map((_, j) => (rt[i] * ct[j]) / gt)
  );
}

export function computeChiSquare(
  observed: number[][],
  expected: number[][]
): ChiSquareResult {
  const rows = observed.length;
  const cols = observed[0]?.length ?? 0;
  const df = (rows - 1) * (cols - 1);

  let chiSq = 0;
  let lowExpectedWarning = false;
  const contributions: number[][] = [];

  for (let i = 0; i < rows; i++) {
    const contribRow: number[] = [];
    for (let j = 0; j < cols; j++) {
      const o = observed[i][j] ?? 0;
      const e = expected[i][j] ?? 0;
      if (e < 5) lowExpectedWarning = true;
      const contrib = e > 0 ? (o - e) ** 2 / e : 0;
      chiSq += contrib;
      contribRow.push(contrib);
    }
    contributions.push(contribRow);
  }

  const pValue = df > 0 ? chiSquarePValue(chiSq, df) : 1;

  return { chiSq, df, pValue, contributions, lowExpectedWarning };
}

export function computeAssociationMeasures(
  chiSq: number,
  n: number,
  rows: number,
  cols: number,
  table: number[][]
): AssociationMeasures {
  const minDim = Math.min(rows - 1, cols - 1);
  const cramersV = n > 0 && minDim > 0 ? Math.sqrt(chiSq / (n * minDim)) : 0;

  let effectSizeLabel: "weak" | "moderate" | "strong";
  if (cramersV < 0.1) effectSizeLabel = "weak";
  else if (cramersV < 0.3) effectSizeLabel = "moderate";
  else effectSizeLabel = "strong";

  const result: AssociationMeasures = { cramersV, effectSizeLabel };

  if (rows === 2 && cols === 2) {
    result.phi = n > 0 ? Math.sqrt(chiSq / n) : 0;

    const a = table[0][0] ?? 0;
    const b = table[0][1] ?? 0;
    const c = table[1][0] ?? 0;
    const d = table[1][1] ?? 0;

    const oddsRatioDenom = b * c;
    result.oddsRatio = oddsRatioDenom > 0 ? (a * d) / oddsRatioDenom : undefined;

    const row0Total = a + b;
    const row1Total = c + d;
    if (row0Total > 0 && row1Total > 0) {
      result.riskRatio = a / row0Total / (c / row1Total);
    }
  }

  return result;
}

// ── Preset scenarios ──────────────────────────────────────────────────────────

export type ScenarioKey =
  | "treatment-outcome"
  | "gender-product"
  | "age-politics"
  | "education-employment";

export const SCENARIOS: Record<ScenarioKey, ContingencyTable> = {
  "treatment-outcome": {
    rowLabels: ["Treatment", "Control"],
    colLabels: ["Success", "Failure"],
    data: [
      [45, 15],
      [30, 30],
    ],
  },
  "gender-product": {
    rowLabels: ["Male", "Female"],
    colLabels: ["Product A", "Product B", "Product C"],
    data: [
      [40, 20, 10],
      [15, 35, 30],
    ],
  },
  "age-politics": {
    rowLabels: ["Age 18-34", "Age 35-54", "Age 55+"],
    colLabels: ["Conservative", "Liberal"],
    data: [
      [120, 200],
      [180, 160],
      [220, 100],
    ],
  },
  "education-employment": {
    rowLabels: ["High School", "Bachelor's", "Graduate"],
    colLabels: ["Employed", "Unemployed", "Part-Time"],
    data: [
      [80, 30, 40],
      [120, 20, 30],
      [100, 10, 15],
    ],
  },
};

export const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  "treatment-outcome": "Treatment / Outcome",
  "gender-product": "Gender / Product",
  "age-politics": "Age / Politics",
  "education-employment": "Education / Employment",
};
