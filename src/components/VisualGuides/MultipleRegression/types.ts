export interface IceCreamPoint {
  id: string;
  temperature: number; // 15–35 °C
  weekend: 0 | 1;
  sales: number; // $thousands
}

// 50 hardcoded data points
// Weekday: sales ≈ 3*temp − 20 + noise
// Weekend: sales ≈ 3*temp − 12 + noise
// This yields: tempCoeff ≈ 3, weekendCoeff ≈ 8, interaction slightly negative
export const ICE_CREAM_DATA: IceCreamPoint[] = [
  { id: "1",  temperature: 15, weekend: 0, sales: 24 },
  { id: "2",  temperature: 15, weekend: 1, sales: 33 },
  { id: "3",  temperature: 16, weekend: 0, sales: 26 },
  { id: "4",  temperature: 16, weekend: 1, sales: 35 },
  { id: "5",  temperature: 17, weekend: 0, sales: 28 },
  { id: "6",  temperature: 17, weekend: 1, sales: 37 },
  { id: "7",  temperature: 18, weekend: 0, sales: 31 },
  { id: "8",  temperature: 18, weekend: 1, sales: 40 },
  { id: "9",  temperature: 19, weekend: 0, sales: 33 },
  { id: "10", temperature: 19, weekend: 1, sales: 42 },
  { id: "11", temperature: 20, weekend: 0, sales: 36 },
  { id: "12", temperature: 20, weekend: 1, sales: 44 },
  { id: "13", temperature: 21, weekend: 0, sales: 38 },
  { id: "14", temperature: 21, weekend: 1, sales: 46 },
  { id: "15", temperature: 22, weekend: 0, sales: 40 },
  { id: "16", temperature: 22, weekend: 1, sales: 49 },
  { id: "17", temperature: 23, weekend: 0, sales: 43 },
  { id: "18", temperature: 23, weekend: 1, sales: 51 },
  { id: "19", temperature: 24, weekend: 0, sales: 45 },
  { id: "20", temperature: 24, weekend: 1, sales: 53 },
  { id: "21", temperature: 25, weekend: 0, sales: 48 },
  { id: "22", temperature: 25, weekend: 1, sales: 57 },
  { id: "23", temperature: 26, weekend: 0, sales: 50 },
  { id: "24", temperature: 26, weekend: 1, sales: 59 },
  { id: "25", temperature: 27, weekend: 0, sales: 52 },
  { id: "26", temperature: 27, weekend: 1, sales: 61 },
  { id: "27", temperature: 28, weekend: 0, sales: 55 },
  { id: "28", temperature: 28, weekend: 1, sales: 64 },
  { id: "29", temperature: 29, weekend: 0, sales: 57 },
  { id: "30", temperature: 29, weekend: 1, sales: 66 },
  { id: "31", temperature: 30, weekend: 0, sales: 60 },
  { id: "32", temperature: 30, weekend: 1, sales: 69 },
  { id: "33", temperature: 31, weekend: 0, sales: 62 },
  { id: "34", temperature: 31, weekend: 1, sales: 71 },
  { id: "35", temperature: 32, weekend: 0, sales: 65 },
  { id: "36", temperature: 32, weekend: 1, sales: 74 },
  { id: "37", temperature: 33, weekend: 0, sales: 67 },
  { id: "38", temperature: 33, weekend: 1, sales: 77 },
  { id: "39", temperature: 34, weekend: 0, sales: 69 },
  { id: "40", temperature: 34, weekend: 1, sales: 79 },
  { id: "41", temperature: 35, weekend: 0, sales: 72 },
  { id: "42", temperature: 35, weekend: 1, sales: 82 },
  // Extra variation points to make confounding effect visible
  { id: "43", temperature: 20, weekend: 0, sales: 34 },
  { id: "44", temperature: 25, weekend: 1, sales: 60 },
  { id: "45", temperature: 30, weekend: 0, sales: 58 },
  { id: "46", temperature: 22, weekend: 1, sales: 52 },
  { id: "47", temperature: 18, weekend: 0, sales: 29 },
  { id: "48", temperature: 27, weekend: 1, sales: 64 },
  { id: "49", temperature: 24, weekend: 0, sales: 47 },
  { id: "50", temperature: 31, weekend: 1, sales: 74 },
];

export interface SimpleReg {
  slope: number;
  intercept: number;
  rSquared: number;
  rmse: number;
}

export interface MultipleReg {
  interceptCoeff: number;
  tempCoeff: number;
  weekendCoeff: number;
  rSquared: number;
  adjustedRSquared: number;
  rmse: number;
}

export interface InteractionReg {
  interceptCoeff: number;
  tempCoeff: number;
  weekendCoeff: number;
  interactionCoeff: number; // temp × weekend
  rSquared: number;
  adjustedRSquared: number;
  rmse: number;
}

// ── Gaussian elimination for n×n linear system Ax = b ────────────────────────
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  // Augmented matrix
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[maxRow][col])) maxRow = r;
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];

    const pivot = M[col][col];
    if (Math.abs(pivot) < 1e-12) continue;

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col] / pivot;
      for (let c = col; c <= n; c++) {
        M[r][c] -= factor * M[col][c];
      }
    }
  }

  return M.map((row, i) => row[n] / row[i]);
}

// ── Simple OLS (one predictor: temperature) ───────────────────────────────────
export function fitSimpleRegression(data: IceCreamPoint[]): SimpleReg {
  const n = data.length;
  const sumX = data.reduce((s, p) => s + p.temperature, 0);
  const sumY = data.reduce((s, p) => s + p.sales, 0);
  const sumXY = data.reduce((s, p) => s + p.temperature * p.sales, 0);
  const sumX2 = data.reduce((s, p) => s + p.temperature * p.temperature, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const yMean = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  let ssResRaw = 0;
  for (const p of data) {
    const yhat = slope * p.temperature + intercept;
    ssTot += (p.sales - yMean) ** 2;
    ssRes += (p.sales - yhat) ** 2;
    ssResRaw += (p.sales - yhat) ** 2;
  }
  const rSquared = 1 - ssRes / ssTot;
  const rmse = Math.sqrt(ssResRaw / n);

  return { slope, intercept, rSquared, rmse };
}

// ── Multiple OLS (temp + weekend binary) — 3×3 normal equations ──────────────
export function fitMultipleRegression(data: IceCreamPoint[]): MultipleReg {
  const n = data.length;
  // X = [1, temp, weekend], solve X'X β = X'y
  const XtX: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const Xty: number[] = [0, 0, 0];

  for (const p of data) {
    const x = [1, p.temperature, p.weekend];
    for (let i = 0; i < 3; i++) {
      Xty[i] += x[i] * p.sales;
      for (let j = 0; j < 3; j++) {
        XtX[i][j] += x[i] * x[j];
      }
    }
  }

  const [b0, b1, b2] = solveLinearSystem(XtX, Xty);

  const yMean = data.reduce((s, p) => s + p.sales, 0) / n;
  let ssTot = 0;
  let ssRes = 0;
  for (const p of data) {
    const yhat = b0 + b1 * p.temperature + b2 * p.weekend;
    ssTot += (p.sales - yMean) ** 2;
    ssRes += (p.sales - yhat) ** 2;
  }
  const rSquared = 1 - ssRes / ssTot;
  const adjustedRSquared = 1 - (1 - rSquared) * ((n - 1) / (n - 3));
  const rmse = Math.sqrt(ssRes / n);

  return {
    interceptCoeff: b0,
    tempCoeff: b1,
    weekendCoeff: b2,
    rSquared,
    adjustedRSquared,
    rmse,
  };
}

// ── Interaction OLS (temp + weekend + temp*weekend) — 4×4 normal equations ───
export function fitInteractionRegression(data: IceCreamPoint[]): InteractionReg {
  const n = data.length;
  // X = [1, temp, weekend, temp*weekend]
  const XtX: number[][] = Array.from({ length: 4 }, () => Array(4).fill(0));
  const Xty: number[] = [0, 0, 0, 0];

  for (const p of data) {
    const x = [1, p.temperature, p.weekend, p.temperature * p.weekend];
    for (let i = 0; i < 4; i++) {
      Xty[i] += x[i] * p.sales;
      for (let j = 0; j < 4; j++) {
        XtX[i][j] += x[i] * x[j];
      }
    }
  }

  const [b0, b1, b2, b3] = solveLinearSystem(XtX, Xty);

  const yMean = data.reduce((s, p) => s + p.sales, 0) / n;
  let ssTot = 0;
  let ssRes = 0;
  for (const p of data) {
    const yhat = b0 + b1 * p.temperature + b2 * p.weekend + b3 * p.temperature * p.weekend;
    ssTot += (p.sales - yMean) ** 2;
    ssRes += (p.sales - yhat) ** 2;
  }
  const rSquared = 1 - ssRes / ssTot;
  const adjustedRSquared = 1 - (1 - rSquared) * ((n - 1) / (n - 4));
  const rmse = Math.sqrt(ssRes / n);

  return {
    interceptCoeff: b0,
    tempCoeff: b1,
    weekendCoeff: b2,
    interactionCoeff: b3,
    rSquared,
    adjustedRSquared,
    rmse,
  };
}
