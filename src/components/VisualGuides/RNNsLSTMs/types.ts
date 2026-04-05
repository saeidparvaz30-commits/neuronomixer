export type NetworkType = "rnn" | "lstm";

export type SequenceStep = {
  t: number; // timestep index
  inputToken: string;
  hiddenState: number[]; // 4 values 0-1 for visualization
  gateValues?: {
    // only for LSTM
    forget: number[]; // 4 values
    input: number[]; // 4 values
    output: number[]; // 4 values
    cell: number[]; // 4 values
  };
  gradientMagnitude: number; // 0-1, decreases over time for RNN
};

export type GradientFlow = {
  step: number;
  magnitude: number; // exponentially decaying for RNN, stable for LSTM
};
