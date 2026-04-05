import type { Metadata } from "next";
import DimensionalityReductionClient from "@/components/VisualGuides/DimensionalityReduction/DimensionalityReductionClient";

export const metadata: Metadata = {
  title: "Dimensionality Reduction Visualized: PCA & t-SNE",
  description:
    "Understand how PCA, t-SNE, and UMAP compress high-dimensional data into 2D. Load a digit dataset and watch 784 dimensions collapse into visualizable clusters. Adjust methods to see what each preserves.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/dimensionality-reduction" },
  openGraph: {
    title: "Dimensionality Reduction Visualized — NeuroNomixer Visual Guides",
    description:
      "Interactive visualization of PCA, t-SNE, and UMAP. See how digit embeddings form clusters in 2D space.",
    url: "https://www.neuronomixer.com/visual-guides/dimensionality-reduction",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dimensionality Reduction — NeuroNomixer Visual Guides",
    description: "PCA, t-SNE, and UMAP explained with interactive 2D scatter visualization.",
  },
};

export default function DimensionalityReductionPage() {
  return <DimensionalityReductionClient />;
}
