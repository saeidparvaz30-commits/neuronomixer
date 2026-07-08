export type Distribution = {
  values: number[]; // 20 values representing the distribution
  mean: number;
  std: number;
  layer: number; // 1, 2, 3, 4
};

export type BNStep = 1 | 2 | 3 | 4; // the 4 computation steps

export type TrainingPoint = {
  epoch: number;
  withBN: number;    // loss value
  withoutBN: number; // loss value
};
