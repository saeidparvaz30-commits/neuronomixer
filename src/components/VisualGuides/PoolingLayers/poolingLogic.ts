import { PoolingConfig, PoolingStep } from "./types";

export function maxPool(values: number[]): number {
  return Math.max(...values);
}

export function avgPool(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function minPool(values: number[]): number {
  return Math.min(...values);
}

// Root mean square: sqrt(mean(v^2)). NOTE: this is RMS, not the L2 norm
// (the L2 norm is sqrt(SUM(v^2)) = RMS * sqrt(n)). The "l2" id is kept for
// state compatibility, but all UI labels say RMS.
export function rmsPool(values: number[]): number {
  return Math.sqrt(values.reduce((s, v) => s + v * v, 0) / values.length);
}

function applyPoolFn(values: number[], config: PoolingConfig): number {
  switch (config.type) {
    case "max":
      return maxPool(values);
    case "average":
      return avgPool(values);
    case "min":
      return minPool(values);
    case "l2":
      return rmsPool(values);
  }
}

export function getOutputSize(inputSize: number, kernelSize: number, stride: number): number {
  return Math.floor((inputSize - kernelSize) / stride) + 1;
}

export function applyPooling(grid: number[][], config: PoolingConfig): number[][] {
  const inputSize = grid.length;
  const outputSize = getOutputSize(inputSize, config.kernelSize, config.stride);
  const output: number[][] = Array.from({ length: outputSize }, () =>
    new Array(outputSize).fill(0)
  );

  for (let r = 0; r < outputSize; r++) {
    for (let c = 0; c < outputSize; c++) {
      const startRow = r * config.stride;
      const startCol = c * config.stride;
      const values: number[] = [];
      for (let dr = 0; dr < config.kernelSize; dr++) {
        for (let dc = 0; dc < config.kernelSize; dc++) {
          values.push(grid[startRow + dr][startCol + dc]);
        }
      }
      const raw = applyPoolFn(values, config);
      output[r][c] = config.type === "l2" ? Math.round(raw) : Math.round(raw);
    }
  }

  return output;
}

export function computeStep(
  grid: number[][],
  r: number,
  c: number,
  config: PoolingConfig
): PoolingStep {
  const startRow = r * config.stride;
  const startCol = c * config.stride;

  const inputPatch: number[][] = [];
  const windowCells: [number, number][] = [];

  for (let dr = 0; dr < config.kernelSize; dr++) {
    const patchRow: number[] = [];
    for (let dc = 0; dc < config.kernelSize; dc++) {
      const value = grid[startRow + dr][startCol + dc];
      patchRow.push(value);
      windowCells.push([startRow + dr, startCol + dc]);
    }
    inputPatch.push(patchRow);
  }

  const flatValues = inputPatch.flat();
  const rawOutput = applyPoolFn(flatValues, config);
  const outputValue = Math.round(rawOutput);

  return {
    row: r,
    col: c,
    inputPatch,
    outputValue,
    windowCells,
  };
}

export function buildAllSteps(grid: number[][], config: PoolingConfig): PoolingStep[] {
  const outputSize = getOutputSize(grid.length, config.kernelSize, config.stride);
  const steps: PoolingStep[] = [];

  for (let r = 0; r < outputSize; r++) {
    for (let c = 0; c < outputSize; c++) {
      steps.push(computeStep(grid, r, c, config));
    }
  }

  return steps;
}
