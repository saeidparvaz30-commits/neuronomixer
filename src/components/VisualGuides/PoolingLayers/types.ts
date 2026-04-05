export type PoolingType = "max" | "average" | "min" | "l2";

export type PoolingConfig = {
  type: PoolingType;
  kernelSize: 2 | 3;
  stride: 1 | 2;
};

export type PoolingStep = {
  row: number;
  col: number;
  inputPatch: number[][];
  outputValue: number;
  windowCells: [number, number][];
};
