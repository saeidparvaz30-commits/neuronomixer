import type { Metadata } from "next";
import KNNClient from "@/components/VisualGuides/KNN/KNNClient";

export const metadata: Metadata = {
  title: "KNN: How Many Neighbors Matter?",
  description:
    "Click to add query points and watch K-Nearest Neighbors classify them. Adjust K and see how the decision boundary changes from jagged to smooth.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/knn" },
  openGraph: {
    title: "KNN: How Many Neighbors Matter? — NeuroNomixer",
    description: "Interactive KNN classifier: add query points, adjust K, and watch decision boundaries shift from overfit to underfit.",
    url: "https://www.neuronomixer.com/visual-guides/knn",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "KNN: How Many Neighbors Matter?",
    description: "Explore how K controls bias-variance tradeoff in K-Nearest Neighbors classification.",
  },
};

export default function KNNPage() {
  return <KNNClient />;
}
