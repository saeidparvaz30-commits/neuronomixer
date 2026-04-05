export interface Point { id: number; x: number; y: number }

export interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
  mse: number;
  pearsonR: number;
}

export function computeRegression(pts: Point[]): RegressionResult {
  const n = pts.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0, mse: 0, pearsonR: 0 };

  const mx = pts.reduce((a, p) => a + p.x, 0) / n;
  const my = pts.reduce((a, p) => a + p.y, 0) / n;

  const covXY = pts.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0);
  const varX = pts.reduce((a, p) => a + (p.x - mx) ** 2, 0);
  const varY = pts.reduce((a, p) => a + (p.y - my) ** 2, 0);

  const slope = varX === 0 ? 0 : covXY / varX;
  const intercept = my - slope * mx;

  const residuals = pts.map(p => p.y - (slope * p.x + intercept));
  const mse = residuals.reduce((a, r) => a + r ** 2, 0) / n;
  const r2 = varY === 0 ? 0 : 1 - residuals.reduce((a, r) => a + r ** 2, 0) / varY;
  const pearsonR = (varX === 0 || varY === 0) ? 0 : covXY / Math.sqrt(varX * varY);

  return { slope, intercept, r2, mse, pearsonR };
}

// Generate initial dataset
export function generateInitialPoints(): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < 18; i++) {
    const x = 10 + Math.random() * 80;
    const noise = (Math.random() - 0.5) * 30;
    const y = Math.max(5, Math.min(95, 10 + 0.8 * x + noise));
    pts.push({ id: i, x, y });
  }
  return pts;
}

export const DATASETS = {
  linear: { label: "Linear trend", slope: 0.8, intercept: 10, noise: 12 },
  noCorr: { label: "No correlation", slope: 0, intercept: 50, noise: 25 },
  negative: { label: "Negative trend", slope: -0.7, intercept: 90, noise: 10 },
  strong: { label: "Strong positive", slope: 0.9, intercept: 5, noise: 5 },
};

export function generateDataset(cfg: { slope: number; intercept: number; noise: number }, n = 18): Point[] {
  return Array.from({ length: n }, (_, i) => {
    const x = 5 + Math.random() * 90;
    const noise = (Math.random() - 0.5) * cfg.noise * 2;
    const y = Math.max(2, Math.min(98, cfg.intercept + cfg.slope * x + noise));
    return { id: i, x, y };
  });
}
