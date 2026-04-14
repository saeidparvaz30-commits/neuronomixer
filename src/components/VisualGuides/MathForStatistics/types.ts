export type ToolType =
  | "growth"
  | "logScale"
  | "summation"
  | "weightedAvg"
  | "slope"
  | "setOps";

export interface GrowthState {
  initialAmount: number;
  annualRate: number;
  years: number;
}

export interface LogScaleState {
  isLog: boolean;
}

export type FormulaType = "i" | "i2" | "2i+1";

export interface SummationState {
  n: number;
  formula: FormulaType;
  expanded: boolean;
}

export interface CategoryWeight {
  name: string;
  weight: number;
  score: number;
}

export interface WeightedAvgState {
  categories: CategoryWeight[];
}

export interface SlopeState {
  xPosition: number;
}

export type SetOpType = "union" | "intersection" | "complement" | "difference" | "symmetric_difference";

export interface SetOpsState {
  operation: SetOpType;
}
