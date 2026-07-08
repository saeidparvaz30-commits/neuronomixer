import type { Metadata } from "next";
import KMeansClient from "@/components/VisualGuides/KMeans/KMeansClient";

export const metadata: Metadata = {
  title: "K-Means Clustering Step by Step",
  description:
    "Watch the K-Means algorithm in action. Place initial centroids, step through iterations, and explore how clusters converge. Includes elbow curve analysis.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/k-means" },
  openGraph: {
    title: "K-Means Clustering Step by Step — NeuroNomixer",
    description: "Interactive K-Means simulator: place centroids, step through iterations, watch clusters form.",
    url: "https://www.neuronomixer.com/visual-guides/k-means",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "K-Means Clustering Step by Step",
    description: "Interactive simulator of the K-Means algorithm with step-by-step visualization.",
  },
};

export default function KMeansPage() {
  return <KMeansClient />;
}
