export type FilterId = "edge-h" | "edge-v" | "edge-both" | "sharpen" | "blur" | "emboss";

export type FilterDefinition = {
  id: FilterId;
  label: string;
  color: string;
  kernel: number[][]; // 3x3
  description: string;
  detectsWhat: string;
  layerDepth: "early" | "mid" | "deep";
};

export type SampleImageId = "checkerboard" | "gradient" | "circle" | "cross" | "diagonal";

export type SampleImage = {
  id: SampleImageId;
  label: string;
  grid: number[][]; // 8x8 values 0-255
};

export type ConvolutionResult = {
  outputGrid: number[][];
  highlightedInput: [number, number] | null; // currently highlighted cell
  highlightedOutput: [number, number] | null;
};
