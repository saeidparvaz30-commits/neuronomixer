export type Neuron = {
  id: string;
  layer: "input" | "hidden1" | "hidden2" | "output";
  index: number;
  active: boolean; // false = dropped out
  value: number; // 0-1 activation
};

export type Connection = {
  from: string; // neuron id
  to: string; // neuron id
  weight: number; // -1 to 1
  visible: boolean; // false if either endpoint is dropped
};

export type NetworkConfig = {
  dropoutRate: number; // 0-0.9
  seed: number; // for reproducible randomness
  mode: "training" | "inference";
};
