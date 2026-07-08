import { INPUT_DIM } from "./digitsDataset";

export type MethodType = "pca" | "tsne" | "umap";

// Computed from the actual dataset dimensions, not hardcoded:
// 64 -> 2 removes 1 - 2/64 = 96.9% of dimensions.
const REDUCTION_PCT = ((1 - 2 / INPUT_DIM) * 100).toFixed(1);
const DIM_NOTE = `${INPUT_DIM} → 2D (${REDUCTION_PCT}% reduction)`;

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
    desc: "Finds the directions of maximum variance (principal components) and projects the data onto them. A linear method: fast, deterministic, and interpretable. The scatter here is computed live in your browser from the 250 digits, so the overlap you see between classes is genuine. The first PC captures the most variance, the second the next most, and so on.",
    pros: ["Fast and deterministic", "Preserves global structure", "Interpretable axes", "Handles new data easily"],
    cons: ["Assumes linear relationships", "May not separate classes well", "Sensitive to scale"],
    useCase: "Preprocessing, noise reduction, quick initial visualization",
    dim: DIM_NOTE,
  },
  tsne: {
    label: "t-SNE", color: "#3bb4a4",
    heading: "t-Distributed Stochastic Neighbor Embedding",
    desc: "Maps high-dimensional neighborhoods to 2D using probability distributions: points close in the original space stay close in 2D. Excellent for revealing clusters, but slower than PCA, non-deterministic, and unable to embed new points. The scatter here is a real t-SNE embedding of these 250 digits, precomputed offline with scikit-learn.",
    pros: ["Excellent cluster separation", "Reveals local structure", "Non-linear, flexible"],
    cons: ["Slow on large datasets", "Non-deterministic (depends on random seed)", "Cannot embed new points", "Distances between clusters are not meaningful"],
    useCase: "Final visualization, cluster validation, exploratory research",
    dim: DIM_NOTE,
  },
  umap: {
    label: "UMAP", color: "#d4af37",
    heading: "Uniform Manifold Approximation and Projection",
    desc: "Combines manifold learning with graph theory. Typically faster than t-SNE and better at preserving both local and global structure at once. The scatter here is a real UMAP embedding of these 250 digits, precomputed offline with umap-learn.",
    pros: ["Faster than t-SNE", "Preserves local + global structure", "Can embed new points", "Handles large datasets"],
    cons: ["Less interpretable than PCA", "Non-deterministic unless seeded", "Hyperparameter sensitive"],
    useCase: "Large datasets, production pipelines, exploratory analysis at scale",
    dim: DIM_NOTE,
  },
};
