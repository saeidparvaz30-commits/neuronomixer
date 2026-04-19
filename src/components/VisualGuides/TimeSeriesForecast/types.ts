export type DatasetId = "retail" | "stock" | "temperature";

export interface TimeSeriesData {
  labels: string[];
  values: number[];
}

export interface DecompositionResult {
  trend: number[];
  seasonal: number[];
  residual: number[];
}
