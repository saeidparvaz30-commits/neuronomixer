export type FunctionId = "relu" | "sigmoid" | "tanh" | "leaky-relu";

export type FunctionProperties = {
  id: FunctionId;
  label: string;
  color: string;
  formula: string;
  range: string;
  gradient: string;
  vanishingRisk: boolean;
  deadNeuronRisk: boolean;
  bestFor: string[];
  keyInsight: string;
  description: string;
};

export type NeuronState = {
  id: number;
  activationCount: number;
};
