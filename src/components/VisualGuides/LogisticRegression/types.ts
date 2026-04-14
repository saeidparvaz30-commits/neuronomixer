export interface PassFailPoint {
  id: string;
  hours: number;
  passed: boolean;
}

export const PASS_FAIL_DATA: PassFailPoint[] = [
  { id: "1",  hours: 0.5, passed: false },
  { id: "2",  hours: 1.0, passed: false },
  { id: "3",  hours: 1.5, passed: false },
  { id: "4",  hours: 1.5, passed: false },
  { id: "5",  hours: 2.0, passed: false },
  { id: "6",  hours: 2.0, passed: false },
  { id: "7",  hours: 2.5, passed: false },
  { id: "8",  hours: 2.5, passed: true  },
  { id: "9",  hours: 3.0, passed: false },
  { id: "10", hours: 3.0, passed: false },
  { id: "11", hours: 3.5, passed: false },
  { id: "12", hours: 3.5, passed: true  },
  { id: "13", hours: 4.0, passed: false },
  { id: "14", hours: 4.0, passed: false },
  { id: "15", hours: 4.0, passed: true  },
  { id: "16", hours: 4.5, passed: false },
  { id: "17", hours: 4.5, passed: true  },
  { id: "18", hours: 5.0, passed: false },
  { id: "19", hours: 5.0, passed: true  },
  { id: "20", hours: 5.0, passed: true  },
  { id: "21", hours: 5.5, passed: false },
  { id: "22", hours: 5.5, passed: true  },
  { id: "23", hours: 5.5, passed: true  },
  { id: "24", hours: 6.0, passed: true  },
  { id: "25", hours: 6.0, passed: false },
  { id: "26", hours: 6.0, passed: true  },
  { id: "27", hours: 6.5, passed: true  },
  { id: "28", hours: 6.5, passed: true  },
  { id: "29", hours: 7.0, passed: true  },
  { id: "30", hours: 7.0, passed: false },
  { id: "31", hours: 7.0, passed: true  },
  { id: "32", hours: 7.5, passed: true  },
  { id: "33", hours: 7.5, passed: true  },
  { id: "34", hours: 8.0, passed: true  },
  { id: "35", hours: 8.0, passed: true  },
  { id: "36", hours: 8.5, passed: true  },
  { id: "37", hours: 8.5, passed: true  },
  { id: "38", hours: 9.0, passed: true  },
  { id: "39", hours: 9.0, passed: true  },
  { id: "40", hours: 9.5, passed: true  },
  { id: "41", hours: 1.0, passed: false },
  { id: "42", hours: 2.0, passed: false },
  { id: "43", hours: 3.0, passed: true  },
  { id: "44", hours: 4.0, passed: false },
  { id: "45", hours: 5.0, passed: true  },
  { id: "46", hours: 5.5, passed: true  },
  { id: "47", hours: 6.0, passed: true  },
  { id: "48", hours: 6.5, passed: false },
  { id: "49", hours: 7.0, passed: true  },
  { id: "50", hours: 7.5, passed: true  },
  { id: "51", hours: 8.0, passed: true  },
  { id: "52", hours: 8.5, passed: true  },
  { id: "53", hours: 9.0, passed: true  },
  { id: "54", hours: 0.5, passed: false },
  { id: "55", hours: 1.5, passed: false },
  { id: "56", hours: 2.5, passed: false },
  { id: "57", hours: 3.5, passed: false },
  { id: "58", hours: 4.5, passed: true  },
  { id: "59", hours: 5.0, passed: false },
  { id: "60", hours: 10.0, passed: true },
];

// Pre-fitted coefficients: β₀ = -5.5, β₁ = 1.05
// Inflection point at -β₀/β₁ ≈ 5.24 hours
export const LOGISTIC_INTERCEPT = -5.5;
export const LOGISTIC_SLOPE = 1.05;

// Linear prediction pre-fitted OLS constants
export const LINEAR_INTERCEPT = -0.1;
export const LINEAR_SLOPE = 0.10;

export function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

export function predictProb(hours: number, b0 = LOGISTIC_INTERCEPT, b1 = LOGISTIC_SLOPE): number {
  return sigmoid(b0 + b1 * hours);
}

export function computeLinearPrediction(hours: number): number {
  return LINEAR_INTERCEPT + LINEAR_SLOPE * hours;
}

export interface ClassificationMetrics {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  sensitivity: number;
  specificity: number;
  precision: number;
  f1: number;
  accuracy: number;
}

export function computeMetrics(
  data: PassFailPoint[],
  threshold: number,
  b0 = LOGISTIC_INTERCEPT,
  b1 = LOGISTIC_SLOPE
): ClassificationMetrics {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const pt of data) {
    const predicted = predictProb(pt.hours, b0, b1) >= threshold;
    if (pt.passed && predicted)  tp++;
    if (!pt.passed && predicted) fp++;
    if (!pt.passed && !predicted) tn++;
    if (pt.passed && !predicted) fn++;
  }
  const sensitivity = (tp + fn) === 0 ? 0 : tp / (tp + fn);
  const specificity = (tn + fp) === 0 ? 0 : tn / (tn + fp);
  const precision   = (tp + fp) === 0 ? 0 : tp / (tp + fp);
  const recall      = sensitivity;
  const f1          = (precision + recall) === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  const accuracy    = data.length === 0 ? 0 : (tp + tn) / data.length;
  return { tp, fp, tn, fn, sensitivity, specificity, precision, f1, accuracy };
}

export function computeCalibration(
  data: PassFailPoint[],
  b0 = LOGISTIC_INTERCEPT,
  b1 = LOGISTIC_SLOPE
): { bin: number; predicted: number; actual: number }[] {
  const bins = [0.1, 0.3, 0.5, 0.7, 0.9];
  const edges = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  return bins.map((binCenter, i) => {
    const lo = edges[i], hi = edges[i + 1];
    const pts = data.filter(pt => {
      const p = predictProb(pt.hours, b0, b1);
      return p >= lo && p < hi;
    });
    if (pts.length === 0) return { bin: binCenter, predicted: binCenter, actual: binCenter };
    const meanPred = pts.reduce((s, pt) => s + predictProb(pt.hours, b0, b1), 0) / pts.length;
    const fracPass = pts.filter(pt => pt.passed).length / pts.length;
    return { bin: binCenter, predicted: meanPred, actual: fracPass };
  });
}
