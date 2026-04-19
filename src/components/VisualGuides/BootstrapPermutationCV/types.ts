export interface BootstrapState {
  originalData: number[];
  bootstrapMeans: number[];
  ciLower: number;
  ciUpper: number;
  isAnimating: boolean;
  progress: number; // 0-100
}

export interface PermutationState {
  group1: number[];
  group2: number[];
  observedDiff: number;
  nullDistribution: number[];
  pValue: number;
  isAnimating: boolean;
  progress: number;
}

export interface CVFold {
  foldIndex: number;
  trainError: number;
  testError: number;
}
