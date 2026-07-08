import type { Metadata } from "next";
import DimensionalityReductionClient from "@/components/VisualGuides/DimensionalityReduction/DimensionalityReductionClient";

export const metadata: Metadata = {
  title: "Dimensionality Reduction Visualized: PCA & t-SNE",
  description:
    "See how PCA, t-SNE, and UMAP compress high-dimensional data into 2D. PCA is computed live in your browser on 250 real handwritten digits (scikit-learn's 8x8 digits dataset); t-SNE and UMAP are real precomputed embeddings of the same digits. Move the sliders to change the projection.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/dimensionality-reduction" },
  openGraph: {
    title: "Dimensionality Reduction Visualized — NeuroNomixer Visual Guides",
    description:
      "Interactive visualization of PCA, t-SNE, and UMAP on 250 real handwritten digits. PCA runs live in the browser; t-SNE and UMAP are real precomputed embeddings.",
    url: "https://www.neuronomixer.com/visual-guides/dimensionality-reduction",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dimensionality Reduction — NeuroNomixer Visual Guides",
    description: "PCA, t-SNE, and UMAP explained with real digit data: live in-browser PCA plus precomputed t-SNE and UMAP embeddings.",
  },
};

export default function DimensionalityReductionPage() {
  return <DimensionalityReductionClient />;
}
