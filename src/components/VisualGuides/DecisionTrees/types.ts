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

// Generate dataset
export const DATASETS = {
  linearlySeparable: "Linearly separable",
  xor: "XOR pattern",
  concentric: "Concentric circles",
  random: "Random",
};

export function generateDataset(type: keyof typeof DATASETS, n = 40): DataPoint[] {
  return Array.from({ length: n }, (_, i) => {
    const x = 5 + Math.random() * 90;
    const y = 5 + Math.random() * 90;
    let label: 0 | 1 = 0;
    if (type === "linearlySeparable") {
      label = (x + y > 100) ? 1 : 0;
    } else if (type === "xor") {
      label = ((x > 50) !== (y > 50)) ? 1 : 0;
    } else if (type === "concentric") {
      const d = Math.sqrt((x - 50) ** 2 + (y - 50) ** 2);
      label = (d < 25 || d > 42) ? 0 : 1;
    } else {
      label = Math.random() > 0.5 ? 1 : 0;
    }
    // Add some noise
    if (Math.random() < 0.08) label = label === 0 ? 1 : 0;
    return { id: i, x, y, label };
  });
}
