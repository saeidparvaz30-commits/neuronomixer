export type LayerState = "frozen" | "fine-tune" | "new";

export type CNNLayer = {
  id: string;
  name: string;
  depth: number; // 1-6
  state: LayerState;
  features: string; // what it detects: "Edges & gradients"
  paramCount: number; // e.g., 9216
  trainable: boolean;
};

export type TransferStrategy = "feature-extraction" | "fine-tuning" | "full";

export type StrategyInfo = {
  id: TransferStrategy;
  label: string;
  description: string;
  layerConfig: LayerState[]; // state for each of 6 layers
  dataNeeded: "Very Small (<1K)" | "Small (1K-10K)" | "Large (>100K)";
  trainingSpeed: "Fast" | "Medium" | "Slow";
  accuracy: "Good" | "Better" | "Best";
};
