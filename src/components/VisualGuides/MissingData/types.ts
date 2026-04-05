export type Strategy = "drop-rows" | "mean-imputation" | "knn-imputation" | null;

export type Row = {
  id: number;
  featureA: number | null;
  featureB: number | null;
  featureC: number;
  target: 0 | 1;
  dropped?: boolean;
  imputed?: { featureA?: boolean; featureB?: boolean };
};

export const ORIGINAL_ROWS: Row[] = [
  { id: 1,  featureA: 45.2, featureB: 23.1, featureC: 98,  target: 0 },
  { id: 2,  featureA: null, featureB: 19.4, featureC: 101, target: 0 },
  { id: 3,  featureA: 38.5, featureB: null, featureC: 88,  target: 1 },
  { id: 4,  featureA: 52.1, featureB: 22.3, featureC: 95,  target: 1 },
  { id: 5,  featureA: 41.3, featureB: 25.8, featureC: 105, target: 0 },
  { id: 6,  featureA: null, featureB: null, featureC: 91,  target: 1 },
  { id: 7,  featureA: 48.9, featureB: 20.1, featureC: 99,  target: 0 },
  { id: 8,  featureA: 39.2, featureB: 24.5, featureC: 93,  target: 1 },
  { id: 9,  featureA: 46.5, featureB: null, featureC: 102, target: 0 },
  { id: 10, featureA: 50.1, featureB: 21.7, featureC: 97,  target: 1 },
  { id: 11, featureA: 43.8, featureB: 22.9, featureC: 96,  target: 0 },
  { id: 12, featureA: 47.3, featureB: 23.6, featureC: 100, target: 1 },
];

// IDs of rows that have at least one null
export const NULL_ROW_IDS = new Set([2, 6]);   // featureA null
// All rows with any null: 2, 3, 6, 9
export const DROPPED_IDS  = new Set([2, 3, 6, 9]);

export function applyStrategy(strategy: Strategy): Row[] {
  if (!strategy) return ORIGINAL_ROWS;
  if (strategy === "drop-rows") {
    return ORIGINAL_ROWS.map((r) =>
      DROPPED_IDS.has(r.id) ? { ...r, dropped: true } : r
    );
  }
  if (strategy === "mean-imputation") {
    return ORIGINAL_ROWS.map((r) => {
      const imputed: Row["imputed"] = {};
      let { featureA, featureB } = r;
      if (featureA === null) { featureA = 45.6; imputed.featureA = true; }
      if (featureB === null) { featureB = 23.0; imputed.featureB = true; }
      return { ...r, featureA, featureB, imputed };
    });
  }
  // knn-imputation
  const KNN: Record<number, { featureA?: number; featureB?: number }> = {
    2: { featureA: 46.1 },
    3: { featureB: 22.8 },
    6: { featureA: 44.3, featureB: 22.5 },
    9: { featureB: 23.2 },
  };
  return ORIGINAL_ROWS.map((r) => {
    const patch = KNN[r.id];
    if (!patch) return r;
    const imputed: Row["imputed"] = {};
    let { featureA, featureB } = r;
    if (patch.featureA !== undefined) { featureA = patch.featureA; imputed.featureA = true; }
    if (patch.featureB !== undefined) { featureB = patch.featureB; imputed.featureB = true; }
    return { ...r, featureA, featureB, imputed };
  });
}

export const STRATEGY_META = {
  "drop-rows": {
    label: "Drop Rows",
    color: "#ef4444",
    accuracy: 83,
    dataLoss: "25%",
    biasRisk: "Medium",
    biasColor: "#f59e0b",
    lossColor: "#ef4444",
    rowCount: 8,
    description:
      "Remove any row containing at least one missing value. Simple and bias-free within remaining rows, but discards 25% of the dataset and may introduce selection bias if missingness is not random.",
  },
  "mean-imputation": {
    label: "Mean Imputation",
    color: "#3bb4a4",
    accuracy: 81,
    dataLoss: "0%",
    biasRisk: "Medium",
    biasColor: "#f59e0b",
    lossColor: "#3bb4a4",
    rowCount: 12,
    description:
      "Replace each null with the column mean. Keeps all rows and is trivial to implement, but compresses the feature distribution — variance shrinks and relationships between features are weakened.",
  },
  "knn-imputation": {
    label: "KNN Imputation",
    color: "#3b82f6",
    accuracy: 86,
    dataLoss: "0%",
    biasRisk: "Low",
    biasColor: "#3bb4a4",
    lossColor: "#3bb4a4",
    rowCount: 12,
    description:
      "Estimate each missing value from K nearest neighbors (k=3) using Euclidean distance on available features. Preserves feature relationships and produces the most realistic fill values — at the cost of extra computation.",
  },
} as const;
