import type { SequenceStep, GradientFlow } from "./types";

// Sequence: "The cat sat on the mat"
export const SENTENCE_TOKENS = ["The", "cat", "sat", "on", "the", "mat"];

// Deterministic LCG-based pseudo-random for hidden state values
// lcg(seed) → value in [0,1]
function lcg(seed: number): number {
  const a = 1664525;
  const c = 1013904223;
  const m = 2 ** 32;
  return ((a * seed + c) % m) / m;
}

function hiddenStateForStep(t: number): number[] {
  return [
    lcg(t * 4 + 0),
    lcg(t * 4 + 1),
    lcg(t * 4 + 2),
    lcg(t * 4 + 3),
  ];
}

// RNN: gradient magnitude decays by factor 0.6 per step (starting from step 0 = 1.0)
// Step 0 is the most recent in backprop terms; gradient at step t from end = 0.6^t
// We display timesteps 0→5 (forward), so gradient at t=0 is 1.0 (backprop starts here),
// and gradient at t=5 (oldest) = 0.6^5 ≈ 0.078
export const RNN_SEQUENCE: SequenceStep[] = SENTENCE_TOKENS.map((token, t) => ({
  t,
  inputToken: token,
  hiddenState: hiddenStateForStep(t),
  gradientMagnitude: Math.pow(0.6, t), // step 0 = 1.0, step 5 ≈ 0.078
}));

// LSTM: gate values are realistic
// Forget gate: high (near 1) for function words (articles, prepositions), moderate for content words
// Input gate: high for content words (cat, sat, mat), low for function words
// Output gate: moderate throughout
// Cell state: accumulates information

const LSTM_GATE_PRESETS: Array<{ forget: number[]; input: number[]; output: number[]; cell: number[] }> = [
  // t=0 "The" — article: forget doesn't matter (no prev state), input low
  {
    forget: [0.85, 0.80, 0.88, 0.82],
    input:  [0.20, 0.25, 0.18, 0.22],
    output: [0.45, 0.50, 0.42, 0.48],
    cell:   [0.20, 0.25, 0.18, 0.22],
  },
  // t=1 "cat" — content word: forget moderate, input high (important info)
  {
    forget: [0.60, 0.65, 0.58, 0.62],
    input:  [0.82, 0.88, 0.79, 0.85],
    output: [0.72, 0.68, 0.75, 0.70],
    cell:   [0.65, 0.72, 0.60, 0.68],
  },
  // t=2 "sat" — verb: forget low (clear some memory), input high
  {
    forget: [0.45, 0.50, 0.42, 0.48],
    input:  [0.88, 0.85, 0.90, 0.87],
    output: [0.78, 0.82, 0.75, 0.80],
    cell:   [0.78, 0.82, 0.75, 0.80],
  },
  // t=3 "on" — preposition: forget high (keep context), input very low
  {
    forget: [0.90, 0.88, 0.92, 0.89],
    input:  [0.12, 0.15, 0.10, 0.13],
    output: [0.35, 0.38, 0.33, 0.36],
    cell:   [0.72, 0.76, 0.70, 0.74],
  },
  // t=4 "the" — article: forget high, input low
  {
    forget: [0.88, 0.85, 0.90, 0.87],
    input:  [0.15, 0.18, 0.13, 0.16],
    output: [0.40, 0.42, 0.38, 0.41],
    cell:   [0.65, 0.68, 0.63, 0.66],
  },
  // t=5 "mat" — content word: forget moderate, input high
  {
    forget: [0.65, 0.68, 0.62, 0.66],
    input:  [0.85, 0.88, 0.82, 0.86],
    output: [0.80, 0.82, 0.78, 0.81],
    cell:   [0.85, 0.88, 0.82, 0.86],
  },
];

export const LSTM_SEQUENCE: SequenceStep[] = SENTENCE_TOKENS.map((token, t) => ({
  t,
  inputToken: token,
  hiddenState: hiddenStateForStep(t + 10), // offset seed so different from RNN
  gateValues: LSTM_GATE_PRESETS[t],
  gradientMagnitude: 0.92 + lcg(t + 20) * 0.06, // stays near 0.95±0.03
}));

// Gradient flow data for the chart (both lines)
export const RNN_GRADIENT_FLOW: GradientFlow[] = RNN_SEQUENCE.map((s) => ({
  step: s.t,
  magnitude: s.gradientMagnitude,
}));

export const LSTM_GRADIENT_FLOW: GradientFlow[] = LSTM_SEQUENCE.map((s) => ({
  step: s.t,
  magnitude: s.gradientMagnitude,
}));
