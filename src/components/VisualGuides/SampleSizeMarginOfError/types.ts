// ── Types ─────────────────────────────────────────────────────────────────────

export type ConfidenceLevel = 90 | 95 | 99;

export interface WeightingRow {
  group: string;
  target: number;
  achieved: number;
  weight: number;
}

export interface SampleSizeState {
  marginOfError: number;           // 1–10, default 3
  confidenceLevel: ConfidenceLevel; // default 95
  estimatedProportion: number;     // 0.1–0.9, default 0.5
  useFinitePopulation: boolean;
  populationSize: number;          // default 100000
  costPerSurvey: number;           // default 5
  nonResponseRate: number;         // 0–0.5, default 0.2
  weightingRows: WeightingRow[];
  moeAdjusted: boolean;
  confidenceChanged: boolean;
  proportionAdjusted: boolean;
  surveyCardsViewed: Set<string>;
  caseStudyViewed: boolean;
}

// ── Z-values ──────────────────────────────────────────────────────────────────

export const Z_VALUES: Record<ConfidenceLevel, number> = {
  90: 1.645,
  95: 1.96,
  99: 2.576,
};

// ── Math helpers ──────────────────────────────────────────────────────────────

export function computeSampleSize(
  moe: number,
  confidenceLevel: ConfidenceLevel,
  p: number,
  populationSize?: number
): number {
  const z = Z_VALUES[confidenceLevel];
  const moeFrac = moe / 100;
  let n = (z * z * p * (1 - p)) / (moeFrac * moeFrac);
  if (populationSize) n = n / (1 + n / populationSize);
  return Math.ceil(n);
}

export function computeMOE(
  n: number,
  confidenceLevel: ConfidenceLevel,
  p: number
): number {
  const z = Z_VALUES[confidenceLevel];
  return parseFloat((z * Math.sqrt((p * (1 - p)) / n) * 100).toFixed(2));
}

export function computeSE(n: number, p: number): number {
  return Math.sqrt((p * (1 - p)) / n);
}

// ── Initial state ─────────────────────────────────────────────────────────────

export const INITIAL_STATE: SampleSizeState = {
  marginOfError: 3,
  confidenceLevel: 95,
  estimatedProportion: 0.5,
  useFinitePopulation: false,
  populationSize: 100000,
  costPerSurvey: 5,
  nonResponseRate: 0.2,
  weightingRows: [
    { group: "Rural", target: 40, achieved: 55, weight: 40 / 55 },
    { group: "Urban", target: 60, achieved: 45, weight: 60 / 45 },
  ],
  moeAdjusted: false,
  confidenceChanged: false,
  proportionAdjusted: false,
  surveyCardsViewed: new Set<string>(),
  caseStudyViewed: false,
};
