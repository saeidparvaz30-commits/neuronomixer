// ── Domain types ───────────────────────────────────────────────────────────────

export interface TestResult {
  testNumber: number;
  testName: string;
  pValue: number;
  significant: boolean;          // p < 0.05
  adjustedPValue?: number;
  adjustedSignificant?: boolean;
}

export interface MultipleTestingState {
  numberOfTests: 5 | 10 | 15 | 20 | 50;
  sampleSizePerTest: number;     // 30–200, default 100
  testResults: TestResult[];
  falsePositiveCount: number;
  bonferroniApplied: boolean;
  fdrApplied: boolean;
  holmApplied: boolean;
  simulationRun: boolean;
  correctionsApplied: Set<string>;
  assumptionsChecked: Set<string>; // "normality"|"equalVariance"|"independence"|"noConfounding"
  testsAdjusted: boolean;  // user changed number of tests from default (20)
}

// ── Math helpers ───────────────────────────────────────────────────────────────

export function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1));
}

// Abramowitz & Stegun approximation for normal CDF
export function normalCDF(z: number): number {
  const p = 0.3275911;
  const a = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429];
  const sign = z < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(z));
  const poly = t * (a[0] + t * (a[1] + t * (a[2] + t * (a[3] + t * a[4]))));
  return 0.5 * (1 + sign * (1 - poly * Math.exp(-z * z)));
}

// ── Simulation ─────────────────────────────────────────────────────────────────

export function simulateTests(numTests: number, n: number): TestResult[] {
  const results: TestResult[] = [];

  for (let i = 0; i < numTests; i++) {
    // Draw two groups from N(0,1) — pure noise, no real effect
    const groupA = Array.from({ length: n }, () => gaussianRandom());
    const groupB = Array.from({ length: n }, () => gaussianRandom());

    const mA = mean(groupA);
    const mB = mean(groupB);
    const sA = stdDev(groupA);
    const sB = stdDev(groupB);

    // Pooled standard error
    const se = Math.sqrt((sA ** 2) / n + (sB ** 2) / n);
    const tStat = se === 0 ? 0 : (mA - mB) / se;

    // Two-tailed p-value via normal approximation
    const pValue = Math.max(1e-10, Math.min(1, 2 * (1 - normalCDF(Math.abs(tStat)))));

    results.push({
      testNumber: i + 1,
      testName: generateTestName(i),
      pValue,
      significant: pValue < 0.05,
    });
  }

  return results;
}

// ── Corrections ────────────────────────────────────────────────────────────────

export function applyBonferroni(results: TestResult[], numTests: number): TestResult[] {
  const threshold = 0.05 / numTests;
  return results.map(r => ({
    ...r,
    adjustedPValue: Math.min(r.pValue * numTests, 1),
    adjustedSignificant: r.pValue < threshold,
  }));
}

export function applyFDR(results: TestResult[], numTests: number, alpha = 0.05): TestResult[] {
  // Benjamini-Hochberg procedure
  const sorted = [...results].sort((a, b) => a.pValue - b.pValue);

  // Find the largest k where p(k) <= (k/m)*alpha
  let cutoffRank = -1;
  for (let k = sorted.length - 1; k >= 0; k--) {
    if (sorted[k].pValue <= ((k + 1) / numTests) * alpha) {
      cutoffRank = k;
      break;
    }
  }

  const significantNames = new Set(
    cutoffRank >= 0 ? sorted.slice(0, cutoffRank + 1).map(r => r.testName) : []
  );

  return results.map(r => {
    const rank = sorted.findIndex(s => s.testName === r.testName) + 1;
    const adjustedPValue = Math.min((r.pValue * numTests) / rank, 1);
    return {
      ...r,
      adjustedPValue,
      adjustedSignificant: significantNames.has(r.testName),
    };
  });
}

export function applyHolm(results: TestResult[], numTests: number): TestResult[] {
  // Holm stepdown procedure
  const sorted = [...results]
    .map((r, originalIndex) => ({ ...r, originalIndex }))
    .sort((a, b) => a.pValue - b.pValue);

  // Find where to stop rejecting
  let stopAt = sorted.length;
  for (let k = 0; k < sorted.length; k++) {
    const threshold = 0.05 / (numTests - k);
    if (sorted[k].pValue > threshold) {
      stopAt = k;
      break;
    }
  }

  const significantNames = new Set(
    sorted.slice(0, stopAt).map(r => r.testName)
  );

  return results.map(r => {
    const rank = sorted.findIndex(s => s.testName === r.testName) + 1;
    const adjustedPValue = Math.min(r.pValue * (numTests - rank + 1), 1);
    return {
      ...r,
      adjustedPValue,
      adjustedSignificant: significantNames.has(r.testName),
    };
  });
}

// ── Test name generator ────────────────────────────────────────────────────────

const FLAVORS = [
  "Red", "Blue", "Green", "Yellow", "Purple", "Orange", "Pink",
  "Brown", "Teal", "Violet", "Cyan", "Magenta", "Lime", "Indigo",
  "Coral", "Peach", "Mint", "Lavender", "Amber", "Crimson",
  "Turquoise", "Maroon", "Gold", "Silver", "Rose", "Aqua",
  "Chartreuse", "Ivory", "Scarlet", "Sapphire", "Emerald",
  "Ruby", "Jade", "Tan", "Slate", "Fuchsia", "Cream", "Navy",
  "Sand", "Plum", "Cobalt", "Bronze", "Wheat", "Lemon", "Forest",
  "Sky", "Ash", "Brick", "Copper", "Pearl",
];

export function generateTestName(index: number): string {
  return `${FLAVORS[index % FLAVORS.length]} Jelly Bean`;
}
