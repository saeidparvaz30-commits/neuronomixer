export type MethodType = "pca" | "tsne" | "umap";

export interface EmbeddedPoint {
  id: number;
  digit: number;
  pca:  [number, number];
  tsne: [number, number];
  umap: [number, number];
}

// ── Centers per digit per method ──────────────────────────────────────────
// PCA: some overlap (similar digits cluster near each other)
// t-SNE: tight, well-separated clusters
// UMAP: similar separation, different topology
const PCA_CENTERS:  [number, number][] = [
  [ 0.5,  0.3], [-3.0,  0.0], [-1.5, -2.2], [-2.3,  1.8], [ 2.2, -2.0],
  [ 0.8,  2.5], [ 2.0,  1.5], [-2.0, -1.0], [ 0.0, -0.8], [-0.5, -2.5],
];
const TSNE_CENTERS: [number, number][] = [
  [ 0.0,  8.0], [-8.0,  4.0], [-4.0, -8.0], [-9.0, -3.0], [ 4.0,  9.0],
  [ 9.0, -2.0], [ 5.0,  6.0], [-5.0,  2.0], [ 2.0, -2.0], [-1.0, -6.5],
];
const UMAP_CENTERS: [number, number][] = [
  [ 5.0,  0.5], [-5.0,  7.0], [-7.0, -3.0], [-5.0, -7.0], [ 2.0,  8.0],
  [ 7.0, -3.0], [ 7.0,  4.0], [-2.0,  4.0], [ 0.0, -3.0], [ 3.5, -7.0],
];

// Deterministic pseudo-random offsets using trig (reproducible across renders)
function dx(id: number, scale: number) { return Math.sin(id * 7.391 + 1.7) * scale; }
function dy(id: number, scale: number) { return Math.cos(id * 5.173 + 2.3) * scale; }

export const EMBEDDED_POINTS: EmbeddedPoint[] = (() => {
  const pts: EmbeddedPoint[] = [];
  let id = 0;
  for (let digit = 0; digit < 10; digit++) {
    for (let k = 0; k < 10; k++) {
      pts.push({
        id,
        digit,
        pca:  [PCA_CENTERS[digit][0]  + dx(id, 0.9),  PCA_CENTERS[digit][1]  + dy(id, 0.9)],
        tsne: [TSNE_CENTERS[digit][0] + dx(id, 0.45), TSNE_CENTERS[digit][1] + dy(id, 0.45)],
        umap: [UMAP_CENTERS[digit][0] + dx(id, 0.45), UMAP_CENTERS[digit][1] + dy(id, 0.45)],
      });
      id++;
    }
  }
  return pts;
})();

export const DIGIT_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#06b6d4",
];

export const METHOD_META: Record<MethodType, {
  label: string; color: string; heading: string; desc: string;
  pros: string[]; cons: string[]; useCase: string; dim: string;
}> = {
  pca: {
    label: "PCA", color: "#3b82f6",
    heading: "Principal Component Analysis",
    desc: "Finds the directions of maximum variance (principal components). A linear transformation — fast, deterministic, and interpretable. The first PC captures the most variance, the second captures the next, etc.",
    pros: ["Fast and deterministic", "Preserves global structure", "Interpretable axes", "Handles new data easily"],
    cons: ["Assumes linear relationships", "May not separate classes well", "Sensitive to scale"],
    useCase: "Preprocessing, noise reduction, quick initial visualization",
    dim: "784 → 2D (98.1% reduction)",
  },
  tsne: {
    label: "t-SNE", color: "#3bb4a4",
    heading: "t-Distributed Stochastic Neighbor Embedding",
    desc: "Maps high-D neighborhoods to 2D using probability distributions. Points close in the original space stay close in 2D. Excellent for revealing clusters — but slow, non-deterministic, and can't embed new points.",
    pros: ["Excellent cluster separation", "Reveals local structure", "Non-linear, flexible"],
    cons: ["Slow on large data (30–60s)", "Non-deterministic", "Can't embed new points", "Distances not meaningful globally"],
    useCase: "Final visualization, cluster validation, exploratory research",
    dim: "784 → 2D (98.1% reduction)",
  },
  umap: {
    label: "UMAP", color: "#d4af37",
    heading: "Uniform Manifold Approximation and Projection",
    desc: "Combines manifold learning with graph theory. Faster than t-SNE and better at preserving both local AND global structure simultaneously. Increasingly the default for production-scale visualization.",
    pros: ["Faster than t-SNE", "Preserves local + global structure", "Can embed new points", "Handles large datasets"],
    cons: ["Less interpretable than PCA", "Newer method (less established)", "Hyperparameter sensitive"],
    useCase: "Large datasets, production pipelines, exploratory analysis at scale",
    dim: "784 → 2D (98.1% reduction)",
  },
};
