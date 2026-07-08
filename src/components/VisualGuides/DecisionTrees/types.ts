export interface DataPoint {
  id: number;
  x: number; // 0-100
  y: number; // 0-100
  label: 0 | 1;
}

export interface Split {
  id: string;
  axis: "x" | "y";
  value: number;
}

export interface TreeNode {
  id: string;
  depth: number;
  split: Split | null;
  points: DataPoint[];
  children: [TreeNode, TreeNode] | null;
  predictedLabel: 0 | 1;
  gini: number;
  accuracy: number;
}

export function computeGini(pts: DataPoint[]): number {
  if (pts.length === 0) return 0;
  const p1 = pts.filter(p => p.label === 1).length / pts.length;
  return 1 - p1 ** 2 - (1 - p1) ** 2;
}

export function predictLabel(pts: DataPoint[]): 0 | 1 {
  if (pts.length === 0) return 0;
  const ones = pts.filter(p => p.label === 1).length;
  return ones >= pts.length / 2 ? 1 : 0;
}

export function splitPoints(pts: DataPoint[], split: Split): [DataPoint[], DataPoint[]] {
  const left = pts.filter(p => (split.axis === "x" ? p.x : p.y) <= split.value);
  const right = pts.filter(p => (split.axis === "x" ? p.x : p.y) > split.value);
  return [left, right];
}

export function computeAccuracy(pts: DataPoint[]): number {
  if (pts.length === 0) return 1;
  const label = predictLabel(pts);
  return pts.filter(p => p.label === label).length / pts.length;
}

export function buildNode(pts: DataPoint[], depth: number, id: string): TreeNode {
  return {
    id, depth, split: null, points: pts, children: null,
    predictedLabel: predictLabel(pts),
    gini: computeGini(pts),
    accuracy: computeAccuracy(pts),
  };
}

// Predict label for a given point using the tree
export function predict(node: TreeNode, pt: { x: number; y: number }): 0 | 1 {
  if (!node.children || !node.split) return node.predictedLabel;
  const val = node.split.axis === "x" ? pt.x : pt.y;
  if (val <= node.split.value) return predict(node.children[0], pt);
  return predict(node.children[1], pt);
}

// Seeded PRNG (mulberry32) so the initial dataset is identical between the
// server render and client hydration.
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generate dataset
export const DATASETS = {
  linearlySeparable: "Linearly separable",
  xor: "XOR pattern",
  concentric: "Concentric circles",
  random: "Random",
};

export function generateDataset(
  type: keyof typeof DATASETS,
  n = 40,
  rng: () => number = Math.random,
): DataPoint[] {
  return Array.from({ length: n }, (_, i) => {
    const x = 5 + rng() * 90;
    const y = 5 + rng() * 90;
    let label: 0 | 1 = 0;
    if (type === "linearlySeparable") {
      label = (x + y > 100) ? 1 : 0;
    } else if (type === "xor") {
      label = ((x > 50) !== (y > 50)) ? 1 : 0;
    } else if (type === "concentric") {
      const d = Math.sqrt((x - 50) ** 2 + (y - 50) ** 2);
      label = (d < 25 || d > 42) ? 0 : 1;
    } else {
      label = rng() > 0.5 ? 1 : 0;
    }
    // Add some noise
    if (rng() < 0.08) label = label === 0 ? 1 : 0;
    return { id: i, x, y, label };
  });
}
