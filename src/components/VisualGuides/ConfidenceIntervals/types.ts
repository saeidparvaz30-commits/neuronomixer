export type ConfidenceLevel = 90 | 95 | 99;

export interface CIRecord {
  id: number;
  sampleData: number[];
  sampleMean: number;
  sampleSD: number;
  lower: number;
  upper: number;
  containsTruth: boolean;
}

const TRUE_MEAN = 100;
const TRUE_SD = 15;
const SAMPLE_N = 30;

const Z_SCORES: Record<ConfidenceLevel, number> = { 90: 1.645, 95: 1.96, 99: 2.576 };

function gaussRand(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function generateSample(): number[] {
  return Array.from({ length: SAMPLE_N }, () => TRUE_MEAN + TRUE_SD * gaussRand());
}

function computeMean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function computeSD(arr: number[]): number {
  const m = computeMean(arr);
  return Math.sqrt(arr.reduce((a, v) => a + (v - m) ** 2, 0) / (arr.length - 1));
}

export function run100Experiments(cl: ConfidenceLevel): CIRecord[] {
  const z = Z_SCORES[cl];
  return Array.from({ length: 100 }, (_, i) => {
    const data = generateSample();
    const m = computeMean(data);
    const sd = computeSD(data);
    const se = sd / Math.sqrt(SAMPLE_N);
    const me = z * se;
    return {
      id: i + 1,
      sampleData: data,
      sampleMean: m,
      sampleSD: sd,
      lower: m - me,
      upper: m + me,
      containsTruth: m - me <= TRUE_MEAN && TRUE_MEAN <= m + me,
    };
  });
}

export { TRUE_MEAN, SAMPLE_N, Z_SCORES };
