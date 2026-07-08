export type OptimizerType = "sgd" | "momentum" | "rmsprop" | "adam";

export type OptimizerConfig = {
  id: OptimizerType;
  label: string;
  color: string;
  lr: number;
  enabled: boolean;
};

export type TrajectoryPoint = {
  x: number;
  y: number;
  loss: number;
  step: number;
};

export type OptimizerState = {
  id: OptimizerType;
  trajectory: TrajectoryPoint[];
  currentStep: number;
  converged: boolean;
  finalLoss: number;
};
