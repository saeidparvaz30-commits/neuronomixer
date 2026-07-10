// Pure math module for the Gradient Boosting guide. No React imports.
// Everything is deterministic (LCG-seeded) so SSR and client HTML match.

export interface Dataset {
  xs: number[];
  ys: number[];
}

export const N_TRAIN = 60;
export const N_TEST = 60;
export const GRID_SIZE = 201;
export const MAX_ROUNDS = 60;
export const DEFAULT_LR = 0.1;
export const LR_MIN = 0.05;
export const LR_MAX = 1;
export const LR_STEP = 0.05;
export const DEFAULT_DEPTH = 2;
export const BOOST_MIN_LEAF = 4;
export const DEEP_TREE_DEPTH = 6;
export const DEEP_TREE_MIN_LEAF = 1;

/** Deterministic pseudo-random in [0, 1); the LCG from the guide spec. */
export function lcg(seed: number): number {
  return ((seed * 1664525 + 1013904223) >>> 0) / 0xffffffff;
}

/**
 * Deterministic hash-based uniform in [0, 1) (murmur3 finalizer). Used for
 * the noise draws because nearby seeds must be decorrelated; a single LCG
 * step maps arithmetic seed progressions to correlated outputs. Exactly as
 * hydration-safe as the LCG: pure integer math, no Math.random or Date.
 */
function mix01(seed: number): number {
  let h = seed >>> 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

/** Noise-free generating function for the synthetic dataset. */
export function trueF(x: number): number {
  return 2.2 * Math.sin(4.5 * x) + (x > 0.62 ? 1.4 : 0) - 1.1 * x;
}

/** Noise scale: triangular noise (sum of two uniforms) with sd about 0.45. */
const NOISE_SCALE = 1.1;

function makeDataset(seed: number, n: number): Dataset {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < n; i++) {
    // Jittered positions inside evenly spaced slots keep xs strictly increasing.
    const x = (i + 0.1 + 0.8 * lcg(seed + i * 7919)) / n;
    const noise =
      (mix01(seed * 65537 + i * 2 + 1) + mix01(seed * 65537 + i * 2 + 2) - 1) *
      NOISE_SCALE;
    xs.push(x);
    ys.push(trueF(x) + noise);
  }
  return { xs, ys };
}

export const TRAIN: Dataset = makeDataset(11, N_TRAIN);
export const TEST: Dataset = makeDataset(37, N_TEST);

export const GRID_XS: number[] = Array.from(
  { length: GRID_SIZE },
  (_, i) => i / (GRID_SIZE - 1)
);

export const TRUE_GRID: number[] = GRID_XS.map(trueF);

export function mse(preds: number[], ys: number[]): number {
  let s = 0;
  for (let i = 0; i < ys.length; i++) {
    const e = ys[i] - preds[i];
    s += e * e;
  }
  return s / ys.length;
}

// ── Regression tree with exact least-squares split search ────────────────────

export interface TreeSplit {
  x: number;
  left: TreeNode;
  right: TreeNode;
}

export interface TreeNode {
  /** Mean of the targets at this node; the prediction when there is no split. */
  leaf: number;
  split?: TreeSplit;
}

function fitNode(
  xs: number[],
  t: number[],
  idx: number[],
  depth: number,
  minLeaf: number
): TreeNode {
  const n = idx.length;
  let total = 0;
  for (const i of idx) total += t[i];
  const mean = total / n;
  if (depth <= 0 || n < 2 * minLeaf) return { leaf: mean };

  const order = [...idx].sort((a, b) => xs[a] - xs[b]);
  // Minimizing SSE_left + SSE_right is equivalent to maximizing
  // leftSum^2/nL + rightSum^2/nR (the sum of t^2 is constant), so the
  // search below is the exact least-squares split, not a heuristic.
  const parentScore = (total * total) / n;
  let bestGain = 1e-12;
  let bestK = -1;
  let leftSum = 0;
  for (let k = 1; k < n; k++) {
    leftSum += t[order[k - 1]];
    if (k < minLeaf || n - k < minLeaf) continue;
    if (xs[order[k]] - xs[order[k - 1]] < 1e-12) continue;
    const rightSum = total - leftSum;
    const score = (leftSum * leftSum) / k + (rightSum * rightSum) / (n - k);
    const gain = score - parentScore;
    if (gain > bestGain) {
      bestGain = gain;
      bestK = k;
    }
  }
  if (bestK < 0) return { leaf: mean };

  const threshold = (xs[order[bestK - 1]] + xs[order[bestK]]) / 2;
  return {
    leaf: mean,
    split: {
      x: threshold,
      left: fitNode(xs, t, order.slice(0, bestK), depth - 1, minLeaf),
      right: fitNode(xs, t, order.slice(bestK), depth - 1, minLeaf),
    },
  };
}

export function fitTree(
  xs: number[],
  targets: number[],
  maxDepth: number,
  minLeaf: number
): TreeNode {
  const idx = targets.map((_, i) => i);
  return fitNode(xs, targets, idx, maxDepth, minLeaf);
}

export function predictTree(node: TreeNode, x: number): number {
  let cur = node;
  while (cur.split) {
    cur = x <= cur.split.x ? cur.split.left : cur.split.right;
  }
  return cur.leaf;
}

export function countLeaves(node: TreeNode): number {
  if (!node.split) return 1;
  return countLeaves(node.split.left) + countLeaves(node.split.right);
}

// ── Gradient boosting for squared loss ────────────────────────────────────────
// For squared error the negative gradient IS the residual y - F(x), so each
// round fits a small tree to the current residuals and adds lr times it.

export interface BoostRun {
  /** F0: the mean of the training targets. */
  base: number;
  trees: TreeNode[];
  /** Index m = MSE of the ensemble with m trees (index 0 = F0 alone). */
  trainMse: number[];
  testMse: number[];
  /** Cumulative ensemble predictions on the training xs, per round. */
  trainPreds: number[][];
  /** Cumulative ensemble predictions on GRID_XS, per round. */
  gridPreds: number[][];
  /** Raw (unshrunken) prediction of tree m+1 on GRID_XS; treeGrid[m] pairs with trees[m]. */
  treeGrid: number[][];
}

export function runBoosting(
  lr: number,
  depth: number,
  maxRounds: number = MAX_ROUNDS
): BoostRun {
  const { xs, ys } = TRAIN;
  const base = ys.reduce((a, b) => a + b, 0) / ys.length;
  const fTrain: number[] = new Array(ys.length).fill(base);
  const fTest: number[] = new Array(TEST.ys.length).fill(base);
  const fGrid: number[] = new Array(GRID_SIZE).fill(base);

  const trees: TreeNode[] = [];
  const trainMse = [mse(fTrain, ys)];
  const testMse = [mse(fTest, TEST.ys)];
  const trainPreds = [[...fTrain]];
  const gridPreds = [[...fGrid]];
  const treeGrid: number[][] = [];

  for (let m = 0; m < maxRounds; m++) {
    const residuals = ys.map((y, i) => y - fTrain[i]);
    const tree = fitTree(xs, residuals, depth, BOOST_MIN_LEAF);
    trees.push(tree);
    const g = GRID_XS.map((x) => predictTree(tree, x));
    treeGrid.push(g);
    for (let i = 0; i < ys.length; i++) fTrain[i] += lr * predictTree(tree, xs[i]);
    for (let i = 0; i < TEST.xs.length; i++)
      fTest[i] += lr * predictTree(tree, TEST.xs[i]);
    for (let i = 0; i < GRID_SIZE; i++) fGrid[i] += lr * g[i];
    trainMse.push(mse(fTrain, ys));
    testMse.push(mse(fTest, TEST.ys));
    trainPreds.push([...fTrain]);
    gridPreds.push([...fGrid]);
  }

  return { base, trees, trainMse, testMse, trainPreds, gridPreds, treeGrid };
}

// ── Single deep tree baseline, fit to the same training data ─────────────────

export interface DeepTreeResult {
  tree: TreeNode;
  trainMse: number;
  testMse: number;
  gridPreds: number[];
  leaves: number;
}

export function fitDeepTree(): DeepTreeResult {
  const tree = fitTree(TRAIN.xs, TRAIN.ys, DEEP_TREE_DEPTH, DEEP_TREE_MIN_LEAF);
  const trainPreds = TRAIN.xs.map((x) => predictTree(tree, x));
  const testPreds = TEST.xs.map((x) => predictTree(tree, x));
  return {
    tree,
    trainMse: mse(trainPreds, TRAIN.ys),
    testMse: mse(testPreds, TEST.ys),
    gridPreds: GRID_XS.map((x) => predictTree(tree, x)),
    leaves: countLeaves(tree),
  };
}
