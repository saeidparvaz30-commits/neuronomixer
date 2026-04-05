export type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type StepContent = {
  step: Step;
  title: string;
  description: string;
  formula?: string;
  keyPoints: string[];
  phase: "forward" | "loss" | "backward" | "update";
};

export type NeuronValue = {
  id: string;
  layer: "input" | "hidden" | "output";
  index: number;
  value: number;
  gradient?: number;
};

// Pre-computed fixed weights for consistency across renders
// Shape: [to_neuron][from_neuron]
export const FIXED_WEIGHTS_IH: number[][] = [
  [ 0.42, -0.31,  0.58,  0.17],
  [-0.25,  0.61,  0.09, -0.44],
  [ 0.53,  0.08, -0.37,  0.72],
  [-0.14,  0.49,  0.66, -0.28],
  [ 0.38, -0.52,  0.21,  0.64],
];

export const FIXED_WEIGHTS_HO: number[][] = [
  [ 0.34, -0.47,  0.61, -0.19,  0.52],
  [-0.28,  0.55, -0.33,  0.44, -0.67],
  [ 0.71, -0.18,  0.40, -0.55,  0.29],
];

export const FIXED_BIASES_H: number[] = [0.05, -0.03, 0.08, -0.06, 0.04];
export const FIXED_BIASES_O: number[] = [0.02, -0.04, 0.03];

// Fixed input values
export const INPUT_VALUES: number[] = [0.5, 0.8, 0.2, 0.9];

// Target labels (one-hot)
export const TARGET_VALUES: number[] = [1, 0, 0];

// ReLU and its derivative
export function relu(x: number): number {
  return Math.max(0, x);
}

export function reluPrime(x: number): number {
  return x > 0 ? 1 : 0;
}

// Softmax
export function softmax(arr: number[]): number[] {
  const maxVal = Math.max(...arr);
  const exps = arr.map(x => Math.exp(x - maxVal));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}

// Cross-entropy loss
export function crossEntropyLoss(pred: number[], target: number[]): number {
  return -target.reduce((s, t, i) => s + t * Math.log(Math.max(pred[i], 1e-10)), 0);
}

// Compute all forward-pass values deterministically
export function computeForward() {
  const x = INPUT_VALUES;

  // Hidden layer pre-activations
  const zH: number[] = FIXED_WEIGHTS_IH.map((row, j) => {
    return row.reduce((s, w, i) => s + w * x[i], 0) + FIXED_BIASES_H[j];
  });

  // Hidden layer activations (ReLU)
  const aH = zH.map(relu);

  // Output layer pre-activations
  const zO: number[] = FIXED_WEIGHTS_HO.map((row, j) => {
    return row.reduce((s, w, i) => s + w * aH[i], 0) + FIXED_BIASES_O[j];
  });

  // Output activations (softmax)
  const aO = softmax(zO);

  // Loss
  const loss = crossEntropyLoss(aO, TARGET_VALUES);

  // Output gradients: ∂L/∂o = pred - target (for softmax + cross-entropy)
  const dO = aO.map((p, i) => p - TARGET_VALUES[i]);

  // Gradient at hidden layer: ∂L/∂h = W_HO^T × dO ⊙ ReLU'(zH)
  const dH: number[] = aH.map((_, j) => {
    const upstreamSum = FIXED_WEIGHTS_HO.reduce((s, row, k) => s + row[j] * dO[k], 0);
    return upstreamSum * reluPrime(zH[j]);
  });

  // Weight gradients
  const dW_HO: number[][] = FIXED_WEIGHTS_HO.map((_, k) =>
    aH.map((_, j) => dO[k] * aH[j])
  );

  const dW_IH: number[][] = FIXED_WEIGHTS_IH.map((_, j) =>
    x.map((_, i) => dH[j] * x[i])
  );

  // Updated weights (lr = 0.1)
  const lr = 0.1;
  const newW_IH = FIXED_WEIGHTS_IH.map((row, j) => row.map((w, i) => w - lr * dW_IH[j][i]));
  const newW_HO = FIXED_WEIGHTS_HO.map((row, k) => row.map((w, j) => w - lr * dW_HO[k][j]));

  return { x, zH, aH, zO, aO, loss, dO, dH, dW_IH, dW_HO, newW_IH, newW_HO };
}

export const FORWARD_DATA = computeForward();

export const STEP_CONTENTS: StepContent[] = [
  {
    step: 1,
    title: "Input Values",
    description:
      "These are the four input features the network receives. Each value is fed into the input layer and passed forward without any transformation.",
    keyPoints: [
      "Input neurons don't apply any activation — they simply relay their values.",
      "Here: x = [0.5, 0.8, 0.2, 0.9]",
      "In practice these could be pixel values, sensor readings, or normalized features.",
    ],
    phase: "forward",
  },
  {
    step: 2,
    title: "Hidden Layer: Forward Pass",
    description:
      "Each hidden neuron computes a weighted sum of the inputs plus a bias, then applies the ReLU activation. Values below zero are clamped to zero.",
    formula: "h = ReLU(W·x + b)",
    keyPoints: [
      "ReLU(z) = max(0, z) — introduces non-linearity cheaply.",
      "Pre-activation z = w₁x₁ + w₂x₂ + w₃x₃ + w₄x₄ + b",
      "Neurons with z ≤ 0 output exactly 0 (they become inactive).",
    ],
    phase: "forward",
  },
  {
    step: 3,
    title: "Output Layer: Predictions",
    description:
      "The output layer receives the hidden activations and computes three raw scores (logits). Softmax converts them to probabilities that sum to 1.",
    formula: "softmax(z)ᵢ = e^zᵢ / Σ e^zⱼ",
    keyPoints: [
      "Softmax squashes any real-valued logits into a probability distribution.",
      `Predictions: [${FORWARD_DATA.aO.map(v => v.toFixed(3)).join(", ")}]`,
      "The network is most confident about class 1 here — training will shift that toward class 1 (index 0).",
    ],
    phase: "forward",
  },
  {
    step: 4,
    title: "Compute Loss",
    description:
      "Cross-entropy measures how far the predicted distribution is from the true one-hot target [1, 0, 0]. Lower loss means the prediction is closer to the ground truth.",
    formula: "L = −Σ yᵢ · log(ŷᵢ)",
    keyPoints: [
      `Loss = ${FORWARD_DATA.loss.toFixed(4)}`,
      "A perfect prediction for class 0 would give L ≈ 0.",
      "Cross-entropy heavily penalizes confident wrong predictions (log of a small number).",
    ],
    phase: "loss",
  },
  {
    step: 5,
    title: "Output Gradients",
    description:
      "We differentiate the loss with respect to each output neuron. For softmax + cross-entropy this simplifies elegantly: the gradient is just prediction minus target.",
    formula: "∂L/∂oᵢ = ŷᵢ − yᵢ",
    keyPoints: [
      `Output gradients: [${FORWARD_DATA.dO.map(v => v.toFixed(3)).join(", ")}]`,
      "Negative gradients on class 0 → push that probability up.",
      "Positive gradients on classes 1 and 2 → push those probabilities down.",
    ],
    phase: "backward",
  },
  {
    step: 6,
    title: "Backprop: Hidden Layer",
    description:
      "Gradients flow backward from the output through the weight matrix W_HO. Each hidden neuron accumulates upstream gradients, then the result is gated by ReLU's derivative (0 or 1).",
    formula: "∂L/∂h = (W_HO)ᵀ · (∂L/∂o) ⊙ ReLU′(z)",
    keyPoints: [
      "Chain rule: gradients multiply at every junction.",
      "ReLU′ = 0 if z ≤ 0 — those neurons receive no gradient update (dead neurons).",
      "The transposed weight matrix routes errors back proportionally.",
    ],
    phase: "backward",
  },
  {
    step: 7,
    title: "Backprop: All Gradients",
    description:
      "Gradients now reach the input layer too, completing the full backward pass. Every weight in the network now has a gradient indicating how much it contributed to the error.",
    formula: "∂L/∂W = (∂L/∂a) · xᵀ",
    keyPoints: [
      "Input gradients show which features had the most influence on the loss.",
      "Weight gradients = outer product of upstream gradient × layer input.",
      "All gradients are now ready — the update step can begin.",
    ],
    phase: "backward",
  },
  {
    step: 8,
    title: "Update Weights",
    description:
      "Gradient descent subtracts a fraction of each weight's gradient, nudging the network to produce a lower loss on the next forward pass. Repeat over millions of examples.",
    formula: "w_new = w_old − α · ∂L/∂w",
    keyPoints: [
      "Learning rate α = 0.1 here — a typical starting value.",
      "Small α → slow but stable. Large α → fast but may oscillate.",
      "After many iterations this process minimises the loss across the training set.",
    ],
    phase: "update",
  },
];
