export interface DataPoint {
  id: number;
  value: number;
}

export interface ComputedStats {
  mean: number;
  median: number;
  mode: number[] | null;
  range: number;
  variance: number;
  stdDev: number;
  iqr: number;
  q1: number;
  q3: number;
  trimmedMean: number;
  mad: number;
  min: number;
  max: number;
}

export interface DescriptiveStatisticsState {
  dataPoints: DataPoint[];
  showRobustStats: boolean;
  showDistanceViz: boolean;
  draggingPointId: number | null;
}

// ── Default dataset ────────────────────────────────────────────────────────────
export const DEFAULT_VALUES = [
  25, 28, 30, 32, 35, 38, 40, 42, 45, 48,
  50, 52, 55, 58, 60, 65, 70, 80, 95, 150,
];

export const DEFAULT_DATA_POINTS: DataPoint[] = DEFAULT_VALUES.map((v, i) => ({
  id: i,
  value: v,
}));
