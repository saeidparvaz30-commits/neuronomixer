/**
 * Pure math for the Hyperparameter Tuning guide. No React.
 *
 * Everything displayed on the page derives from this module: a deterministic
 * two-moons dataset, a real CART decision-tree trainer, a precomputed 10x10
 * hyperparameter grid (one real tree per cell), the three budgeted search
 * strategies, and the exact hypergeometric hit probability used by the quiz.
 */

// ── Deterministic randomness (LCG from the guide spec) ──────────────────────

export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/** Box-Muller gaussian driven by the LCG, so it stays deterministic. */
function gauss(rng: () => number): number {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function shuffled<T>(rng: () => number, arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Dataset: deterministic noisy two-moons in [0,1]^2 ───────────────────────

export interface Point {
  x: number;
  y: number;
  label: 0 | 1;
}

export interface Dataset {
  train: Point[];
  val: Point[];
}

export const N_TRAIN = 160;
export const N_VAL = 80;
export const NOISE_SD = 0.18;
export const LABEL_FLIP_RATE = 0.08;

function clamp01(v: number): number {
  return Math.min(0.98, Math.max(0.02, v));
}

function generateDataset(): Dataset {
  const rng = makeRng(0xc0ffee);
  const total = N_TRAIN + N_VAL;
  const pts: Point[] = [];
  for (let i = 0; i < total; i++) {
    const label = (i % 2) as 0 | 1;
    const t = rng() * Math.PI;
    let px: number;
    let py: number;
    if (label === 0) {
      px = Math.cos(t);
      py = Math.sin(t);
    } else {
      px = 1 - Math.cos(t);
      py = 0.5 - Math.sin(t);
    }
    px += gauss(rng) * NOISE_SD;
    py += gauss(rng) * NOISE_SD;
    pts.push({
      x: clamp01((px + 1.35) / 3.7),
      y: clamp01((py + 1.25) / 2.5),
      label,
    });
  }
  const mixed = shuffled(rng, pts);
  const train = mixed.slice(0, N_TRAIN).map((p) => ({ ...p }));
  const val = mixed.slice(N_TRAIN);
  // Flip a fraction of TRAINING labels so an unconstrained tree overfits.
  for (const p of train) {
    if (rng() < LABEL_FLIP_RATE) p.label = (1 - p.label) as 0 | 1;
  }
  return { train, val };
}

// ── CART decision tree (gini, axis-aligned splits) ──────────────────────────

export interface TreeNode {
  /** Majority-class prediction at this node. */
  pred: 0 | 1;
  n: number;
  /** -1 marks a leaf. */
  feature: -1 | 0 | 1;
  threshold: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

function gini(c1: number, n: number): number {
  const p = c1 / n;
  return 2 * p * (1 - p);
}

function featureOf(p: Point, f: 0 | 1): number {
  return f === 0 ? p.x : p.y;
}

function buildNode(
  data: readonly Point[],
  idx: number[],
  depth: number,
  maxDepth: number,
  minLeaf: number
): TreeNode {
  const n = idx.length;
  let c1 = 0;
  for (const i of idx) c1 += data[i].label;
  const node: TreeNode = {
    pred: 2 * c1 >= n ? 1 : 0,
    n,
    feature: -1,
    threshold: 0,
    left: null,
    right: null,
  };
  if (depth >= maxDepth || c1 === 0 || c1 === n || n < 2 * minLeaf) return node;

  const parentGini = gini(c1, n);
  let bestGain = 1e-9;
  let bestF: -1 | 0 | 1 = -1;
  let bestT = 0;
  for (const f of [0, 1] as const) {
    const sorted = idx
      .slice()
      .sort((a, b) => featureOf(data[a], f) - featureOf(data[b], f));
    let leftC1 = 0;
    for (let k = 0; k < n - 1; k++) {
      leftC1 += data[sorted[k]].label;
      const nl = k + 1;
      const nr = n - nl;
      if (nl < minLeaf || nr < minLeaf) continue;
      const v0 = featureOf(data[sorted[k]], f);
      const v1 = featureOf(data[sorted[k + 1]], f);
      if (v1 - v0 < 1e-12) continue;
      const childGini =
        (nl / n) * gini(leftC1, nl) + (nr / n) * gini(c1 - leftC1, nr);
      const gain = parentGini - childGini;
      if (gain > bestGain + 1e-12) {
        bestGain = gain;
        bestF = f;
        bestT = (v0 + v1) / 2;
      }
    }
  }
  if (bestF === -1) return node;

  const leftIdx: number[] = [];
  const rightIdx: number[] = [];
  for (const i of idx) {
    if (featureOf(data[i], bestF) <= bestT) leftIdx.push(i);
    else rightIdx.push(i);
  }
  node.feature = bestF;
  node.threshold = bestT;
  node.left = buildNode(data, leftIdx, depth + 1, maxDepth, minLeaf);
  node.right = buildNode(data, rightIdx, depth + 1, maxDepth, minLeaf);
  return node;
}

export function trainTree(
  data: readonly Point[],
  maxDepth: number,
  minLeaf: number
): TreeNode {
  return buildNode(data, data.map((_, i) => i), 0, maxDepth, minLeaf);
}

export function predict(tree: TreeNode, x: number, y: number): 0 | 1 {
  let node = tree;
  while (node.feature !== -1) {
    const v = node.feature === 0 ? x : y;
    node = (v <= node.threshold ? node.left : node.right) as TreeNode;
  }
  return node.pred;
}

export function accuracy(tree: TreeNode, pts: readonly Point[]): number {
  let correct = 0;
  for (const p of pts) if (predict(tree, p.x, p.y) === p.label) correct++;
  return correct / pts.length;
}

export function countLeaves(tree: TreeNode): number {
  if (tree.feature === -1) return 1;
  return countLeaves(tree.left as TreeNode) + countLeaves(tree.right as TreeNode);
}

/**
 * A depth-2 tree on 2 features partitions [0,1]^2 into axis-aligned
 * rectangles, one per leaf. Extracting them gives an EXACT decision-boundary
 * rendering with no rasterization.
 */
export interface LeafRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  pred: 0 | 1;
}

export function leafRects(tree: TreeNode): LeafRect[] {
  const out: LeafRect[] = [];
  const walk = (
    node: TreeNode,
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ) => {
    if (node.feature === -1) {
      out.push({ x0, y0, x1, y1, pred: node.pred });
      return;
    }
    if (node.feature === 0) {
      walk(node.left as TreeNode, x0, y0, node.threshold, y1);
      walk(node.right as TreeNode, node.threshold, y0, x1, y1);
    } else {
      walk(node.left as TreeNode, x0, y0, x1, node.threshold);
      walk(node.right as TreeNode, x0, node.threshold, x1, y1);
    }
  };
  walk(tree, 0, 0, 1, 1);
  return out;
}

// ── The hyperparameter grid (precomputed once, deterministically) ───────────

export const DEPTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export const MIN_LEAFS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32] as const;
export const GRID_ROWS = DEPTHS.length;
export const GRID_COLS = MIN_LEAFS.length;
export const N_CELLS = GRID_ROWS * GRID_COLS;

export interface Cell {
  index: number;
  /** Row (depth index) and column (minLeaf index). */
  di: number;
  li: number;
  depth: number;
  minLeaf: number;
  trainAcc: number;
  valAcc: number;
  leaves: number;
  tree: TreeNode;
}

export const DATASET: Dataset = generateDataset();

function computeGrid(): Cell[] {
  const cells: Cell[] = [];
  for (let di = 0; di < GRID_ROWS; di++) {
    for (let li = 0; li < GRID_COLS; li++) {
      const depth = DEPTHS[di];
      const minLeaf = MIN_LEAFS[li];
      const tree = trainTree(DATASET.train, depth, minLeaf);
      cells.push({
        index: di * GRID_COLS + li,
        di,
        li,
        depth,
        minLeaf,
        trainAcc: accuracy(tree, DATASET.train),
        valAcc: accuracy(tree, DATASET.val),
        leaves: countLeaves(tree),
        tree,
      });
    }
  }
  return cells;
}

export const GRID: Cell[] = computeGrid();

/** Best cell of a set of indices: max valAcc, ties go to the simpler model. */
export function bestOf(indices: readonly number[]): Cell {
  let best = GRID[indices[0]];
  for (const i of indices) {
    const c = GRID[i];
    if (
      c.valAcc > best.valAcc ||
      (c.valAcc === best.valAcc &&
        (c.depth < best.depth ||
          (c.depth === best.depth && c.minLeaf > best.minLeaf)))
    ) {
      best = c;
    }
  }
  return best;
}

/** The full-sweep optimum: what evaluating all 100 cells would find. */
export const ORACLE: Cell = bestOf(GRID.map((c) => c.index));

export const VAL_ACC_MIN = Math.min(...GRID.map((c) => c.valAcc));
export const VAL_ACC_MAX = Math.max(...GRID.map((c) => c.valAcc));
export const TRAIN_ACC_MIN = Math.min(...GRID.map((c) => c.trainAcc));
export const TRAIN_ACC_MAX = Math.max(...GRID.map((c) => c.trainAcc));

// ── Budgeted search strategies ──────────────────────────────────────────────

export const BUDGET = 12;
export const DEFAULT_SEED = 20260710;

export type StrategyId = "grid" | "random" | "adaptive";

/** Evenly spaced 4x3 sub-lattice, visited row-major: 12 trials, no seed. */
export function gridTrials(): number[] {
  const dIdx = [0, 3, 6, 9];
  const lIdx = [0, 4, 9];
  const out: number[] = [];
  for (const di of dIdx) for (const li of lIdx) out.push(di * GRID_COLS + li);
  return out;
}

/** 12 distinct uniform cells (Fisher-Yates prefix), seeded. */
export function randomTrials(seed: number): number[] {
  const rng = makeRng(seed);
  const all = Array.from({ length: N_CELLS }, (_, i) => i);
  return shuffled(rng, all).slice(0, BUDGET);
}

function neighborsOf(index: number): number[] {
  const di = Math.floor(index / GRID_COLS);
  const li = index % GRID_COLS;
  const out: number[] = [];
  for (let dd = -1; dd <= 1; dd++) {
    for (let dl = -1; dl <= 1; dl++) {
      if (dd === 0 && dl === 0) continue;
      const nd = di + dd;
      const nl = li + dl;
      if (nd >= 0 && nd < GRID_ROWS && nl >= 0 && nl < GRID_COLS) {
        out.push(nd * GRID_COLS + nl);
      }
    }
  }
  return out;
}

/**
 * Greedy-adaptive search: 4 seeded random probes, then each remaining trial
 * evaluates a random unevaluated neighbor of the best cell found so far
 * (falling back to the next-best cell with free neighbors, then to random).
 * It only ever reads scores of cells it has already evaluated.
 */
export function adaptiveTrials(seed: number): number[] {
  // Different stream than randomTrials so the two strategies do not share
  // their opening probes for the same seed.
  const rng = makeRng((seed ^ 0x5bd1e995) >>> 0);
  const order = shuffled(
    rng,
    Array.from({ length: N_CELLS }, (_, i) => i)
  );
  const picked: number[] = order.slice(0, 4);
  const seen = new Set(picked);
  while (picked.length < BUDGET) {
    const ranked = picked
      .slice()
      .sort(
        (a, b) =>
          GRID[b].valAcc - GRID[a].valAcc ||
          picked.indexOf(a) - picked.indexOf(b)
      );
    let next = -1;
    for (const c of ranked) {
      const free = neighborsOf(c).filter((i) => !seen.has(i));
      if (free.length > 0) {
        next = free[Math.floor(rng() * free.length) % free.length];
        break;
      }
    }
    if (next === -1) next = order.find((i) => !seen.has(i)) as number;
    picked.push(next);
    seen.add(next);
  }
  return picked;
}

export function strategyTrials(strategy: StrategyId, seed: number): number[] {
  if (strategy === "grid") return gridTrials();
  if (strategy === "random") return randomTrials(seed);
  return adaptiveTrials(seed);
}

export interface RunResult {
  strategy: StrategyId;
  seed: number;
  trials: number[];
  bestIndex: number;
  bestValAcc: number;
  /** 1-based trial number on which the best cell was evaluated. */
  bestTrial: number;
}

export function buildResult(
  strategy: StrategyId,
  seed: number,
  trials: readonly number[]
): RunResult {
  let bestIndex = trials[0];
  let bestTrial = 1;
  for (let k = 1; k < trials.length; k++) {
    if (GRID[trials[k]].valAcc > GRID[bestIndex].valAcc) {
      bestIndex = trials[k];
      bestTrial = k + 1;
    }
  }
  return {
    strategy,
    seed,
    trials: trials.slice(),
    bestIndex,
    bestValAcc: GRID[bestIndex].valAcc,
    bestTrial,
  };
}

// ── Quiz math: exact hypergeometric hit probability ─────────────────────────

/**
 * P(at least one of `budget` distinct uniform draws from N cells lands in the
 * `top` best cells) = 1 - C(N-top, budget) / C(N, budget).
 */
export function probTopHit(n: number, top: number, budget: number): number {
  let missAll = 1;
  for (let i = 0; i < budget; i++) missAll *= (n - top - i) / (n - i);
  return 1 - missAll;
}

export const QUIZ_TOP = 10;
