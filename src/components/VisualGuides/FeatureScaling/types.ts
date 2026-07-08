export type ScalingMethod = "raw" | "normalized" | "meannorm" | "standardized";

export type DataPoint = { age: number; salary: number };

export const RAW_DATA: DataPoint[] = [
  { age: 25, salary: 35000 }, { age: 32, salary: 48000 }, { age: 45, salary: 75000 },
  { age: 28, salary: 42000 }, { age: 55, salary: 95000 }, { age: 38, salary: 62000 },
  { age: 22, salary: 30000 }, { age: 60, salary: 110000 }, { age: 35, salary: 58000 },
  { age: 50, salary: 88000 }, { age: 29, salary: 45000 },  { age: 48, salary: 82000 },
  { age: 26, salary: 38000 }, { age: 42, salary: 70000 }, { age: 58, salary: 105000 },
  { age: 31, salary: 52000 }, { age: 23, salary: 33000 }, { age: 52, salary: 92000 },
  { age: 39, salary: 65000 }, { age: 44, salary: 78000 },
];

// ── Stats ──────────────────────────────────────────────────────────────────
const ages    = RAW_DATA.map((d) => d.age);
const sals    = RAW_DATA.map((d) => d.salary);

export const AGE_MIN  = Math.min(...ages);  // 22
export const AGE_MAX  = Math.max(...ages);  // 60
export const SAL_MIN  = Math.min(...sals);  // 30000
export const SAL_MAX  = Math.max(...sals);  // 110000

const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
const std  = (arr: number[], m: number) =>
  Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);

export const AGE_MEAN  = mean(ages);  // ≈ 39.3
export const SAL_MEAN  = mean(sals);  // ≈ 63500
export const AGE_STD   = std(ages,  AGE_MEAN);  // ≈ 11.8
export const SAL_STD   = std(sals,  SAL_MEAN);  // ≈ 25800
export const AGE_RANGE = AGE_MAX - AGE_MIN;     // 38
export const SAL_RANGE = SAL_MAX - SAL_MIN;     // 80000

// ── Transforms ────────────────────────────────────────────────────────────
export function scale(pt: DataPoint, method: ScalingMethod): { x: number; y: number } {
  switch (method) {
    case "raw":
      return { x: pt.age, y: pt.salary };
    case "normalized":
      return {
        x: (pt.age    - AGE_MIN) / AGE_RANGE,
        y: (pt.salary - SAL_MIN) / SAL_RANGE,
      };
    case "meannorm":
      return {
        x: (pt.age    - AGE_MEAN) / AGE_RANGE,
        y: (pt.salary - SAL_MEAN) / SAL_RANGE,
      };
    case "standardized":
      return {
        x: (pt.age    - AGE_MEAN) / AGE_STD,
        y: (pt.salary - SAL_MEAN) / SAL_STD,
      };
  }
}

export function euclidean(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ── Method metadata ────────────────────────────────────────────────────────
export const METHOD_META = {
  raw: {
    label:   "Raw",
    color:   "var(--color-accent)",
    formula: "x_raw = x  (no transformation)\ny_raw = y",
    tagline: "No transformation applied; features remain on their original scales.",
    xLabel:  "Age (years)",
    yLabel:  "Salary ($)",
    // axis bounds in data space
    xMin: 20, xMax: 63, yMin: 25000, yMax: 115000,
  },
  normalized: {
    label:   "Min-Max (0–1)",
    color:   "#3bb4a4",
    formula: "x_minmax = (x − min(x)) / (max(x) − min(x))\ny_minmax = (y − min(y)) / (max(y) − min(y))",
    tagline: "Maps every feature to [0, 1] using its min and max. Sensitive to outliers.",
    xLabel:  "Age (min-max)",
    yLabel:  "Salary (min-max)",
    xMin: -0.05, xMax: 1.05, yMin: -0.05, yMax: 1.05,
  },
  meannorm: {
    label:   "Normalization (mean)",
    color:   "#a855f7",
    formula: "x_norm = (x − mean(x)) / (max(x) − min(x))\ny_norm = (y − mean(y)) / (max(y) − min(y))",
    tagline: "Centers data at 0 using the mean, scaled by range. Output ≈ [−0.5, +0.5].",
    xLabel:  "Age (normalized)",
    yLabel:  "Salary (normalized)",
    xMin: -0.7, xMax: 0.7, yMin: -0.7, yMax: 0.7,
  },
  standardized: {
    label:   "Standardized (z-score)",
    color:   "#3b82f6",
    formula: "x_std = (x − mean(x)) / std(x)\ny_std = (y − mean(y)) / std(y)",
    tagline: "Centers data around 0 with unit variance. Outliers still shift the mean and SD.",
    xLabel:  "Age (std devs)",
    yLabel:  "Salary (std devs)",
    xMin: -2.2, xMax: 2.2, yMin: -2.2, yMax: 2.2,
  },
} as const;
