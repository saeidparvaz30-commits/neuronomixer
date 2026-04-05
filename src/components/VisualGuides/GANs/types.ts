export type TrainingPhase = "train-d" | "train-g" | "idle";

export type TrainingStep = {
  epoch: number;
  phase: TrainingPhase;
  generatorLoss: number;
  discriminatorLoss: number;
  dAccuracy: number; // 0-1
  generatorQuality: number; // 0-1, how good the fakes look
  fakeImage: number[][]; // 8x8 grayscale grid representing current generation quality
};

export type GANMode = "simulation" | "training";
