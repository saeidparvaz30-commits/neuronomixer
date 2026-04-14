// ── Types ──────────────────────────────────────────────────────────────────────

export interface DiagPoint {
  id: string;
  x: number;
  y: number;
  fitted: number;
  residual: number;
  stdResidual: number;   // residual / RMSE
  leverage: number;      // h_ii = 1/n + (xi - x̄)² / Sxx
  cooksD: number;        // D_i ≈ (stdResidual² / p) × (h_ii / (1-h_ii))  p=2
  isHighLeverage: boolean;
  isOutlier: boolean;
  removed: boolean;
}

export type ModelState = "healthy" | "heteroscedastic" | "nonlinear" | "outlier";

export interface DatasetSpec {
  label: string;
  description: string;
  problemDescription: string;
  points: { x: number; y: number }[];
}

// ── Datasets ──────────────────────────────────────────────────────────────────

export const DATASETS: Record<ModelState, DatasetSpec> = {
  healthy: {
    label: "Healthy Model",
    description: "y ≈ 2x + 5 with constant, normally distributed residuals.",
    problemDescription: "No violations detected. Residuals are random, variance is constant, and points follow the linear trend.",
    points: [
      { x: 1,  y: 7.2  }, { x: 2,  y: 9.1  }, { x: 3,  y: 10.8 }, { x: 4,  y: 13.3 },
      { x: 5,  y: 15.0 }, { x: 6,  y: 17.4 }, { x: 7,  y: 18.9 }, { x: 8,  y: 21.2 },
      { x: 9,  y: 23.6 }, { x: 10, y: 25.1 }, { x: 11, y: 26.8 }, { x: 12, y: 29.4 },
      { x: 13, y: 31.0 }, { x: 14, y: 32.9 }, { x: 15, y: 35.3 }, { x: 16, y: 37.0 },
      { x: 17, y: 38.6 }, { x: 18, y: 41.1 }, { x: 19, y: 42.8 }, { x: 20, y: 45.2 },
    ],
  },
  heteroscedastic: {
    label: "Heteroscedastic",
    description: "y ≈ 2x + 5 but residual variance grows with x (fan shape).",
    problemDescription: "Variance increases with fitted values. The Scale-Location plot shows an upward trend.",
    points: [
      { x: 1,  y: 7.1  }, { x: 2,  y: 9.3  }, { x: 3,  y: 11.5 }, { x: 4,  y: 12.8 },
      { x: 5,  y: 16.2 }, { x: 6,  y: 16.9 }, { x: 7,  y: 21.3 }, { x: 8,  y: 20.5 },
      { x: 9,  y: 26.4 }, { x: 10, y: 22.9 }, { x: 11, y: 31.5 }, { x: 12, y: 25.2 },
      { x: 13, y: 36.8 }, { x: 14, y: 28.4 }, { x: 15, y: 42.1 }, { x: 16, y: 31.9 },
      { x: 17, y: 47.3 }, { x: 18, y: 36.0 }, { x: 19, y: 53.8 }, { x: 20, y: 41.0 },
    ],
  },
  nonlinear: {
    label: "Nonlinear",
    description: "y ≈ x²/5 — curved, but fitted with a linear model.",
    problemDescription: "The Residuals vs Fitted plot shows a curved (U-shaped) pattern, indicating the true relationship is non-linear.",
    points: [
      { x: 1,  y: 0.4  }, { x: 2,  y: 1.0  }, { x: 3,  y: 1.6  }, { x: 4,  y: 3.3  },
      { x: 5,  y: 5.2  }, { x: 6,  y: 7.4  }, { x: 7,  y: 9.7  }, { x: 8,  y: 12.8 },
      { x: 9,  y: 16.1 }, { x: 10, y: 19.8 }, { x: 11, y: 24.2 }, { x: 12, y: 28.9 },
      { x: 13, y: 33.8 }, { x: 14, y: 39.2 }, { x: 15, y: 45.1 }, { x: 16, y: 51.5 },
      { x: 17, y: 57.8 }, { x: 18, y: 64.8 }, { x: 19, y: 72.4 }, { x: 20, y: 80.1 },
    ],
  },
  outlier: {
    label: "Outliers Present",
    description: "18 normal points + 2 extreme outliers with high Cook's distance.",
    problemDescription: "Two influential outliers are pulling the regression line. Removing them substantially changes R² and slope.",
    points: [
      { x: 1,  y: 7.0  }, { x: 2,  y: 9.2  }, { x: 3,  y: 11.1 }, { x: 4,  y: 13.0 },
      { x: 5,  y: 14.9 }, { x: 6,  y: 17.1 }, { x: 7,  y: 18.8 }, { x: 8,  y: 21.0 },
      { x: 9,  y: 23.2 }, { x: 10, y: 25.1 }, { x: 11, y: 26.9 }, { x: 12, y: 29.0 },
      { x: 13, y: 31.2 }, { x: 14, y: 32.8 }, { x: 15, y: 35.1 }, { x: 16, y: 36.9 },
      { x: 17, y: 39.2 }, { x: 18, y: 40.8 },
      // Outliers
      { x: 3,  y: 42.0 }, // high residual outlier
      { x: 19, y: 5.0  }, // influential leverage outlier
    ],
  },
};

// ── OLS Fit ────────────────────────────────────────────────────────────────────

export function fitOLS(rawPts: { x: number; y: number }[]): {
  slope: number;
  intercept: number;
  rmse: number;
  meanX: number;
  sxx: number;
  n: number;
} {
  const n = rawPts.length;
  if (n < 2) return { slope: 0, intercept: 0, rmse: 0, meanX: 0, sxx: 1, n };
  const meanX = rawPts.reduce((s, p) => s + p.x, 0) / n;
  const meanY = rawPts.reduce((s, p) => s + p.y, 0) / n;
  const sxx   = rawPts.reduce((s, p) => s + (p.x - meanX) ** 2, 0);
  const sxy   = rawPts.reduce((s, p) => s + (p.x - meanX) * (p.y - meanY), 0);
  const slope     = sxx === 0 ? 0 : sxy / sxx;
  const intercept = meanY - slope * meanX;
  const residuals = rawPts.map(p => p.y - (intercept + slope * p.x));
  const sse  = residuals.reduce((s, r) => s + r * r, 0);
  const rmse = Math.sqrt(sse / Math.max(n - 2, 1));
  return { slope, intercept, rmse, meanX, sxx, n };
}

// ── Diagnostics ───────────────────────────────────────────────────────────────

export function computeDiagnostics(
  rawPts: { x: number; y: number }[],
  fit: ReturnType<typeof fitOLS>
): DiagPoint[] {
  const { slope, intercept, rmse, meanX, sxx, n } = fit;
  const safeRmse = rmse === 0 ? 1 : rmse;
  const p = 2; // intercept + slope
  const leverageThreshold = (4 / n);

  return rawPts.map((pt, i) => {
    const fitted     = intercept + slope * pt.x;
    const residual   = pt.y - fitted;
    const stdRes     = residual / safeRmse;
    const leverage   = 1 / n + (pt.x - meanX) ** 2 / (sxx === 0 ? 1 : sxx);
    const denom      = (1 - leverage);
    const cooksD     = denom === 0 ? 0 : (stdRes ** 2 / p) * (leverage / (denom ** 2));
    return {
      id: String(i + 1),
      x: pt.x,
      y: pt.y,
      fitted,
      residual,
      stdResidual: stdRes,
      leverage,
      cooksD,
      isHighLeverage: leverage > leverageThreshold,
      isOutlier: Math.abs(stdRes) > 2.0,
      removed: false,
    };
  });
}

// ── R² ────────────────────────────────────────────────────────────────────────

export function computeRSquared(rawPts: { x: number; y: number }[], fit: ReturnType<typeof fitOLS>): number {
  const { slope, intercept } = fit;
  const meanY = rawPts.reduce((s, p) => s + p.y, 0) / rawPts.length;
  const ssTot = rawPts.reduce((s, p) => s + (p.y - meanY) ** 2, 0);
  const ssRes = rawPts.reduce((s, p) => s + (p.y - (intercept + slope * p.x)) ** 2, 0);
  return ssTot === 0 ? 0 : 1 - ssRes / ssTot;
}

// ── Normal Quantile (Peter Acklam's algorithm) ────────────────────────────────

export function normalQuantile(p: number): number {
  if (p <= 0) return -4;
  if (p >= 1) return 4;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
              1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
              6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
              -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425, pHigh = 1 - pLow;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  if (p <= pHigh) {
    const q = p - 0.5, r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
          ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
}

// ── VIF ────────────────────────────────────────────────────────────────────────

export interface VIFResult {
  variable: string;
  vif: number;
  status: "good" | "acceptable" | "problematic";
}

export const VIF_HEALTHY: VIFResult[] = [
  { variable: "Temperature",  vif: 1.04, status: "good" },
  { variable: "Weekend flag", vif: 1.03, status: "good" },
];

export const VIF_COLLINEAR: VIFResult[] = [
  { variable: "X1 (Income)",        vif: 12.3, status: "problematic" },
  { variable: "X2 (Spending)",      vif: 11.8, status: "problematic" },
  { variable: "X3 (Age)",           vif:  1.1, status: "good"        },
];
