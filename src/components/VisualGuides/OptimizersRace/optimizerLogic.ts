import type { TrajectoryPoint } from "./types";

// Loss function: elongated bowl — causes SGD to oscillate
export function loss(x: number, y: number): number {
  return 0.1 * x * x + 2 * y * y;
}

// Gradients of L(x,y) = 0.1x² + 2y²
export function gradient(x: number, y: number): [number, number] {
  return [0.2 * x, 4 * y];
}

const START_X = -3.0;
const START_Y = 2.0;
const STEPS = 40;

// SGD: w = w - lr * gradient
export function computeSGD(lr: number): TrajectoryPoint[] {
  let x = START_X;
  let y = START_Y;
  const traj: TrajectoryPoint[] = [];
  for (let i = 0; i < STEPS; i++) {
    traj.push({ x, y, loss: loss(x, y), step: i });
    const [gx, gy] = gradient(x, y);
    x -= lr * gx;
    y -= lr * gy;
  }
  traj.push({ x, y, loss: loss(x, y), step: STEPS });
  return traj;
}

// SGD + Momentum: v = β*v + gradient; w = w - lr * v  (β=0.9)
export function computeMomentum(lr: number): TrajectoryPoint[] {
  let x = START_X;
  let y = START_Y;
  let vx = 0;
  let vy = 0;
  const beta = 0.9;
  const traj: TrajectoryPoint[] = [];
  for (let i = 0; i < STEPS; i++) {
    traj.push({ x, y, loss: loss(x, y), step: i });
    const [gx, gy] = gradient(x, y);
    vx = beta * vx + gx;
    vy = beta * vy + gy;
    x -= lr * vx;
    y -= lr * vy;
  }
  traj.push({ x, y, loss: loss(x, y), step: STEPS });
  return traj;
}

// RMSProp: s = β*s + (1-β)*g²; w = w - lr * g / √(s + ε)  (β=0.9, ε=1e-8)
export function computeRMSProp(lr: number): TrajectoryPoint[] {
  let x = START_X;
  let y = START_Y;
  let sx = 0;
  let sy = 0;
  const beta = 0.9;
  const eps = 1e-8;
  const traj: TrajectoryPoint[] = [];
  for (let i = 0; i < STEPS; i++) {
    traj.push({ x, y, loss: loss(x, y), step: i });
    const [gx, gy] = gradient(x, y);
    sx = beta * sx + (1 - beta) * gx * gx;
    sy = beta * sy + (1 - beta) * gy * gy;
    x -= lr * gx / Math.sqrt(sx + eps);
    y -= lr * gy / Math.sqrt(sy + eps);
  }
  traj.push({ x, y, loss: loss(x, y), step: STEPS });
  return traj;
}

// Adam: combines momentum + RMSProp with bias correction
// β1=0.9, β2=0.999, ε=1e-8
export function computeAdam(lr: number): TrajectoryPoint[] {
  let x = START_X;
  let y = START_Y;
  let mx = 0;
  let my = 0;
  let vx = 0;
  let vy = 0;
  const beta1 = 0.9;
  const beta2 = 0.999;
  const eps = 1e-8;
  const traj: TrajectoryPoint[] = [];
  for (let i = 0; i < STEPS; i++) {
    traj.push({ x, y, loss: loss(x, y), step: i });
    const t = i + 1;
    const [gx, gy] = gradient(x, y);
    // First moment (momentum)
    mx = beta1 * mx + (1 - beta1) * gx;
    my = beta1 * my + (1 - beta1) * gy;
    // Second moment (RMSProp)
    vx = beta2 * vx + (1 - beta2) * gx * gx;
    vy = beta2 * vy + (1 - beta2) * gy * gy;
    // Bias correction
    const mxHat = mx / (1 - Math.pow(beta1, t));
    const myHat = my / (1 - Math.pow(beta1, t));
    const vxHat = vx / (1 - Math.pow(beta2, t));
    const vyHat = vy / (1 - Math.pow(beta2, t));
    x -= lr * mxHat / (Math.sqrt(vxHat) + eps);
    y -= lr * myHat / (Math.sqrt(vyHat) + eps);
  }
  traj.push({ x, y, loss: loss(x, y), step: STEPS });
  return traj;
}

// Default configs
export const DEFAULT_CONFIGS = {
  sgd: 0.1,
  momentum: 0.1,
  rmsprop: 0.05,
  adam: 0.05,
} as const;

// Convergence threshold
export const CONVERGE_THRESHOLD = 0.1;

export function stepsToConverge(traj: TrajectoryPoint[]): number | null {
  for (const pt of traj) {
    if (pt.loss < CONVERGE_THRESHOLD) return pt.step;
  }
  return null;
}
