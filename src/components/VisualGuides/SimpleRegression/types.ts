// ── Data types ─────────────────────────────────────────────────────────────────

export interface DataPoint {
  id: string;
  x: number;
  y: number;
}

export interface OLSFit {
  slope: number;       // b = Cov(X,Y)/Var(X)
  intercept: number;   // a = ȳ - b*x̄
  rSquared: number;    // 1 - SSE/SST
  rmse: number;        // sqrt(SSE/(n-2))
  pearsonR: number;    // Cov(X,Y)/(sdX*sdY)
  sse: number;         // Σ(yi - ŷi)²
  sst: number;         // Σ(yi - ȳ)²
  residuals: number[];
  fittedValues: number[];
  meanX: number;
  meanY: number;
  sdX: number;
  sdY: number;
  n: number;
  sxx: number;         // Σ(xi - x̄)² — needed for prediction intervals
}

// ── OLS computation ────────────────────────────────────────────────────────────

export function computeOLS(points: DataPoint[]): OLSFit | null {
  const n = points.length;
  if (n < 2) return null;

  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;

  let sxx = 0; // Σ(xi - x̄)²
  let sxy = 0; // Σ(xi - x̄)(yi - ȳ)
  let syy = 0; // Σ(yi - ȳ)²

  for (const p of points) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }

  if (sxx === 0) return null; // All x values are identical

  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;

  const fittedValues = points.map((p) => slope * p.x + intercept);
  const residuals = points.map((p, i) => p.y - fittedValues[i]);

  const sse = residuals.reduce((s, r) => s + r * r, 0);
  const sst = syy;
  const rSquared = sst === 0 ? 0 : Math.max(0, 1 - sse / sst);

  // MSE = SSE / (n-2) to be unbiased
  const mse = n > 2 ? sse / (n - 2) : sse;
  const rmse = Math.sqrt(mse);

  const sdX = Math.sqrt(sxx / n);
  const sdY = Math.sqrt(syy / n);
  const pearsonR = sdX * sdY === 0 ? 0 : sxy / n / (sdX * sdY);

  return {
    slope,
    intercept,
    rSquared,
    rmse,
    pearsonR,
    sse,
    sst,
    residuals,
    fittedValues,
    meanX,
    meanY,
    sdX,
    sdY,
    n,
    sxx,
  };
}

// ── Prediction with CI / PI ────────────────────────────────────────────────────

export function computePrediction(
  fit: OLSFit,
  xInput: number
): {
  yHat: number;
  ciLower: number;
  ciUpper: number;
  piLower: number;
  piUpper: number;
} {
  const yHat = fit.slope * xInput + fit.intercept;
  const { n, meanX, sxx, rmse } = fit;

  // MSE = rmse² (rmse is already sqrt(SSE/(n-2)))
  const mse = rmse * rmse;
  const xDev = xInput - meanX;

  // SE for mean prediction
  const seMean = Math.sqrt(mse * (1 / n + (xDev * xDev) / sxx));
  // SE for individual prediction
  const seInd = Math.sqrt(mse * (1 + 1 / n + (xDev * xDev) / sxx));

  // t ≈ 1.96 (large-sample approximation for 95%)
  const t = 1.96;

  return {
    yHat,
    ciLower: yHat - t * seMean,
    ciUpper: yHat + t * seMean,
    piLower: yHat - t * seInd,
    piUpper: yHat + t * seInd,
  };
}

// ── Normal quantile (Peter Acklam's rational approximation) ───────────────────

export function normalQuantile(p: number): number {
  const a = [
    -3.969683028665376e1,
    2.209460984245205e2,
    -2.759285104469687e2,
    1.38357751867269e2,
    -3.066479806614716e1,
    2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1,
    1.615858368580409e2,
    -1.556989798598866e2,
    6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3,
    -3.223964580411365e-1,
    -2.400758277161838,
    -2.549732539343734,
    4.374664141464968,
    2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3,
    3.224671290700398e-1,
    2.445134137142996,
    3.754408661907416,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) + 1)
    );
  }

  if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }

  const q = Math.sqrt(-2 * Math.log(1 - p));
  return (
    -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) + 1)
  );
}

// ── Hardcoded presets ──────────────────────────────────────────────────────────
// All points are deterministic (no Math.random at module level).
// y ≈ 2x + 3 + small fixed deviations for STRONG (~r 0.95)

export const PRESET_STRONG: DataPoint[] = [
  { id: "s01", x: 1.0,  y: 5.2  },
  { id: "s02", x: 1.8,  y: 6.9  },
  { id: "s03", x: 2.5,  y: 7.6  },
  { id: "s04", x: 3.2,  y: 9.5  },
  { id: "s05", x: 4.0,  y: 11.2 },
  { id: "s06", x: 4.8,  y: 12.4 },
  { id: "s07", x: 5.5,  y: 14.1 },
  { id: "s08", x: 6.0,  y: 15.3 },
  { id: "s09", x: 6.8,  y: 16.8 },
  { id: "s10", x: 7.5,  y: 18.1 },
  { id: "s11", x: 8.2,  y: 19.4 },
  { id: "s12", x: 8.9,  y: 21.0 },
  { id: "s13", x: 9.5,  y: 22.2 },
  { id: "s14", x: 10.1, y: 23.5 },
  { id: "s15", x: 10.8, y: 24.7 },
];

export const PRESET_MODERATE: DataPoint[] = [
  { id: "m01", x: 1.0,  y: 7.1  },
  { id: "m02", x: 1.9,  y: 4.8  },
  { id: "m03", x: 2.7,  y: 9.3  },
  { id: "m04", x: 3.5,  y: 11.5 },
  { id: "m05", x: 4.2,  y: 8.0  },
  { id: "m06", x: 4.9,  y: 13.8 },
  { id: "m07", x: 5.6,  y: 10.2 },
  { id: "m08", x: 6.3,  y: 16.1 },
  { id: "m09", x: 7.0,  y: 12.7 },
  { id: "m10", x: 7.8,  y: 18.4 },
  { id: "m11", x: 8.4,  y: 15.9 },
  { id: "m12", x: 9.0,  y: 21.2 },
  { id: "m13", x: 9.7,  y: 17.5 },
  { id: "m14", x: 10.2, y: 24.0 },
  { id: "m15", x: 10.9, y: 19.8 },
];

export const PRESET_WEAK: DataPoint[] = [
  { id: "w01", x: 1.0,  y: 14.0 },
  { id: "w02", x: 2.0,  y: 5.5  },
  { id: "w03", x: 2.8,  y: 20.3 },
  { id: "w04", x: 3.6,  y: 8.1  },
  { id: "w05", x: 4.4,  y: 16.9 },
  { id: "w06", x: 5.2,  y: 6.7  },
  { id: "w07", x: 5.9,  y: 22.1 },
  { id: "w08", x: 6.7,  y: 11.4 },
  { id: "w09", x: 7.4,  y: 18.7 },
  { id: "w10", x: 8.1,  y: 9.3  },
  { id: "w11", x: 8.8,  y: 24.5 },
  { id: "w12", x: 9.4,  y: 13.2 },
  { id: "w13", x: 10.0, y: 19.8 },
  { id: "w14", x: 10.6, y: 7.9  },
  { id: "w15", x: 11.2, y: 21.6 },
];

// Quadratic: y ≈ (x-5)² + 5 + small noise
export const PRESET_NONLINEAR: DataPoint[] = [
  { id: "n01", x: 1.0,  y: 21.4 },
  { id: "n02", x: 1.8,  y: 15.2 },
  { id: "n03", x: 2.5,  y: 10.6 },
  { id: "n04", x: 3.2,  y: 7.1  },
  { id: "n05", x: 4.0,  y: 5.8  },
  { id: "n06", x: 4.7,  y: 5.0  },
  { id: "n07", x: 5.5,  y: 5.3  },
  { id: "n08", x: 6.2,  y: 5.9  },
  { id: "n09", x: 7.0,  y: 7.8  },
  { id: "n10", x: 7.8,  y: 10.4 },
  { id: "n11", x: 8.5,  y: 14.5 },
  { id: "n12", x: 9.2,  y: 18.9 },
  { id: "n13", x: 9.8,  y: 23.6 },
  { id: "n14", x: 10.4, y: 29.2 },
  { id: "n15", x: 11.0, y: 36.1 },
];

// 12 points on a tight line + 2 extreme outliers
export const PRESET_OUTLIER: DataPoint[] = [
  { id: "o01", x: 1.0,  y: 5.1  },
  { id: "o02", x: 2.0,  y: 7.0  },
  { id: "o03", x: 3.0,  y: 9.2  },
  { id: "o04", x: 4.0,  y: 11.1 },
  { id: "o05", x: 5.0,  y: 13.0 },
  { id: "o06", x: 6.0,  y: 15.1 },
  { id: "o07", x: 7.0,  y: 17.0 },
  { id: "o08", x: 8.0,  y: 18.9 },
  { id: "o09", x: 9.0,  y: 21.1 },
  { id: "o10", x: 10.0, y: 23.0 },
  { id: "o11", x: 11.0, y: 25.2 },
  { id: "o12", x: 12.0, y: 27.0 },
  // Extreme outliers
  { id: "o13", x: 6.5,  y: 2.0  },
  { id: "o14", x: 3.5,  y: 28.0 },
];
