/**
 * Pure math for the feature-importance guide. No React imports.
 *
 * This module is the single source of every number the guide displays:
 * the toy dataset, the bagged tree ensemble trained in the browser, the
 * accuracy under column permutations (permutation importance), and the
 * exact tree-path (Saabas-style) additive attribution rendered as the
 * waterfall. A verifier can recompute all of them with node/tsx.
 *
 * The toy setup: 60 visible customer rows with 4 features, binary churn
 * label. The label generator leans hard on usage, moderately on tenure,
 * lightly on support calls, and not at all on the zip digit, so the
 * importance tools have real structure to find. The model is a bagged
 * ensemble of NUM_TREES depth-MAX_DEPTH regression trees on the 0/1
 * label (leaf value = mean label = churn probability), trained for real
 * on the visible rows with deterministic LCG bootstraps.
 */

// ── Constants ───────────────────────────────────────────────────────────────

export const NUM_ROWS = 60;
export const NUM_TREES = 12;
export const MAX_DEPTH = 3;
export const MIN_LEAF = 4;

/** Deterministic seeds (SPEC LCG, no Math.random anywhere). */
export const DATA_SEED = 91520037;
export const BOOT_SEED = 55501;
export const PERM_SEED = 77003;

export interface FeatureMeta {
  key: string;
  /** Full label for section prose and the quiz. */
  label: string;
  /** Short label for table headers and the waterfall. */
  short: string;
  unit: string;
  /** How the label generator actually uses it (disclosed to the user). */
  blurb: string;
}

export const FEATURES: readonly FeatureMeta[] = [
  {
    key: "usage",
    label: "Monthly usage",
    short: "Usage",
    unit: "hrs",
    blurb: "hours of product use per month",
  },
  {
    key: "tenure",
    label: "Tenure",
    short: "Tenure",
    unit: "mo",
    blurb: "months as a customer",
  },
  {
    key: "calls",
    label: "Support calls",
    short: "Calls",
    unit: "",
    blurb: "support tickets in the last quarter",
  },
  {
    key: "zip",
    label: "Zip last digit",
    short: "Zip digit",
    unit: "",
    blurb: "last digit of the zip code, pure noise by construction",
  },
] as const;

export const NUM_FEATURES = FEATURES.length;

// ── Deterministic pseudo-random (SPEC LCG) ──────────────────────────────────

export function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// ── Dataset ─────────────────────────────────────────────────────────────────

export interface DataRow {
  id: number;
  /** [usage, tenure, calls, zip] */
  x: number[];
  /** 1 = churned, 0 = stayed */
  y: 0 | 1;
}

/**
 * Deterministic toy churn dataset. Low usage and short tenure push toward
 * churn, many support calls push a little, zip digit is never consulted.
 * The +/- 0.4 noise term keeps the boundary imperfect so accuracy is not
 * trivially 100%.
 */
export function makeDataset(): DataRow[] {
  const rand = makeLcg(DATA_SEED);
  const rows: DataRow[] = [];
  for (let i = 0; i < NUM_ROWS; i++) {
    const usage = Math.round(rand() * 40); // 0..40 hrs
    const tenure = 1 + Math.round(rand() * 47); // 1..48 mo
    const calls = Math.round(rand() * 8); // 0..8
    const zip = Math.floor(rand() * 10); // 0..9, unused by the label
    const noise = (rand() - 0.5) * 0.8;
    const score =
      1.8 * (1 - usage / 40) +
      1.2 * (1 - tenure / 48) +
      1.1 * (calls / 8) -
      2.05 +
      noise;
    rows.push({ id: i, x: [usage, tenure, calls, zip], y: score > 0 ? 1 : 0 });
  }
  return rows;
}

export const DATASET: readonly DataRow[] = makeDataset();

/** Computed class balance for display, never hardcoded. */
export function classBalance(): { churned: number; stayed: number } {
  let churned = 0;
  for (const r of DATASET) churned += r.y;
  return { churned, stayed: NUM_ROWS - churned };
}

// ── Deterministic column permutations ───────────────────────────────────────

function fisherYates(n: number, rand: () => number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

/** One fixed permutation of row indices per feature (seeded, reproducible). */
export const PERMS: readonly number[][] = FEATURES.map((_, f) =>
  fisherYates(NUM_ROWS, makeLcg(PERM_SEED + f * 101))
);

/** Value of feature f for row i, honoring the set of permuted columns. */
export function featureValue(
  i: number,
  f: number,
  permuted: ReadonlySet<number>
): number {
  return permuted.has(f) ? DATASET[PERMS[f][i]].x[f] : DATASET[i].x[f];
}

/** Full input vector for row i under the current permutation set. */
export function inputFor(i: number, permuted: ReadonlySet<number>): number[] {
  return FEATURES.map((_, f) => featureValue(i, f, permuted));
}

export const EMPTY_SET: ReadonlySet<number> = new Set();

// ── CART regression trees on the 0/1 label ─────────────────────────────────

export type TreeNode =
  | { kind: "leaf"; value: number; n: number }
  | {
      kind: "split";
      value: number;
      n: number;
      feature: number;
      threshold: number;
      left: TreeNode;
      right: TreeNode;
    };

function meanLabel(idx: readonly number[]): number {
  let s = 0;
  for (const i of idx) s += DATASET[i].y;
  return s / idx.length;
}

function sse(idx: readonly number[], m: number): number {
  let s = 0;
  for (const i of idx) {
    const d = DATASET[i].y - m;
    s += d * d;
  }
  return s;
}

function buildNode(idx: readonly number[], depth: number): TreeNode {
  const value = meanLabel(idx);
  const parentSse = sse(idx, value);
  if (depth >= MAX_DEPTH || idx.length < 2 * MIN_LEAF || parentSse < 1e-12) {
    return { kind: "leaf", value, n: idx.length };
  }

  let bestSse = parentSse - 1e-9;
  let bestFeature = -1;
  let bestThreshold = 0;
  let bestLeft: number[] = [];
  let bestRight: number[] = [];

  for (let f = 0; f < NUM_FEATURES; f++) {
    const vals = Array.from(new Set(idx.map((i) => DATASET[i].x[f]))).sort(
      (a, b) => a - b
    );
    for (let k = 0; k + 1 < vals.length; k++) {
      const thr = (vals[k] + vals[k + 1]) / 2;
      const left: number[] = [];
      const right: number[] = [];
      for (const i of idx) {
        if (DATASET[i].x[f] <= thr) left.push(i);
        else right.push(i);
      }
      if (left.length < MIN_LEAF || right.length < MIN_LEAF) continue;
      const s = sse(left, meanLabel(left)) + sse(right, meanLabel(right));
      if (s < bestSse) {
        bestSse = s;
        bestFeature = f;
        bestThreshold = thr;
        bestLeft = left;
        bestRight = right;
      }
    }
  }

  if (bestFeature < 0) return { kind: "leaf", value, n: idx.length };
  return {
    kind: "split",
    value,
    n: idx.length,
    feature: bestFeature,
    threshold: bestThreshold,
    left: buildNode(bestLeft, depth + 1),
    right: buildNode(bestRight, depth + 1),
  };
}

/**
 * Build tree t of the bagged ensemble: a deterministic LCG bootstrap of the
 * 60 rows, then greedy CART to depth MAX_DEPTH. Same t always yields the
 * same tree, so SSR, client, and any verifier agree.
 */
export function buildBaggedTree(t: number): TreeNode {
  const rand = makeLcg(BOOT_SEED + t * 7919);
  const idx = Array.from({ length: NUM_ROWS }, () =>
    Math.floor(rand() * NUM_ROWS)
  );
  return buildNode(idx, 0);
}

export function predictTree(root: TreeNode, x: readonly number[]): number {
  let node = root;
  while (node.kind === "split") {
    node = x[node.feature] <= node.threshold ? node.left : node.right;
  }
  return node.value;
}

/** Ensemble churn probability: mean of the leaf values across trees. */
export function ensembleProb(
  trees: readonly TreeNode[],
  x: readonly number[]
): number {
  let s = 0;
  for (const t of trees) s += predictTree(t, x);
  return s / trees.length;
}

// ── Accuracy and permutation importance ─────────────────────────────────────

/**
 * Fraction of the 60 rows classified correctly (threshold 0.5) with the
 * given set of columns permuted. Recomputed in full on every call; this is
 * the number behind the accuracy bar.
 */
export function ensembleAccuracy(
  trees: readonly TreeNode[],
  permuted: ReadonlySet<number>
): number {
  let correct = 0;
  for (let i = 0; i < NUM_ROWS; i++) {
    const p = ensembleProb(trees, inputFor(i, permuted));
    if ((p >= 0.5 ? 1 : 0) === DATASET[i].y) correct++;
  }
  return correct / NUM_ROWS;
}

/**
 * Classic single-feature permutation importance (Breiman 2001):
 * baseline accuracy minus accuracy with only feature f permuted.
 */
export function permutationImportance(
  trees: readonly TreeNode[],
  f: number
): number {
  return (
    ensembleAccuracy(trees, EMPTY_SET) - ensembleAccuracy(trees, new Set([f]))
  );
}

// ── Tree-path (Saabas-style) additive attribution ───────────────────────────

export interface Attribution {
  /** Mean root value across trees: the prediction before looking at x. */
  base: number;
  /** Per-feature contributions; base + sum(contrib) === prediction exactly. */
  contrib: number[];
  prediction: number;
}

function treePathContrib(
  root: TreeNode,
  x: readonly number[],
  contrib: number[]
): number {
  let node = root;
  while (node.kind === "split") {
    const child = x[node.feature] <= node.threshold ? node.left : node.right;
    contrib[node.feature] += child.value - node.value;
    node = child;
  }
  return node.value;
}

/**
 * Walk each tree from root to leaf, crediting every split's change in
 * expected output to the feature that made the split, averaged over the
 * forest. Exact additive decomposition of THIS ensemble's prediction
 * (Saabas attribution, the quantity TreeSHAP refines with Shapley
 * weighting). Not a full Shapley value computation.
 */
export function ensembleAttribution(
  trees: readonly TreeNode[],
  x: readonly number[]
): Attribution {
  const contrib = new Array<number>(NUM_FEATURES).fill(0);
  let base = 0;
  let prediction = 0;
  for (const t of trees) {
    base += t.value;
    prediction += treePathContrib(t, x, contrib);
  }
  base /= trees.length;
  prediction /= trees.length;
  for (let f = 0; f < NUM_FEATURES; f++) contrib[f] /= trees.length;
  return { base, contrib, prediction };
}
