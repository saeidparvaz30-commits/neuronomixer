import type { Metadata } from "next";
import MultivariateThinkingClient from "@/components/VisualGuides/MultivariateThinking/MultivariateThinkingClient";

export const metadata: Metadata = {
  title: "Multivariate Thinking & the Curse of Dimensionality | NeuroNomixer",
  description:
    "Understand how high-dimensional data differs fundamentally. Explore curse of dimensionality, PCA, clustering, distance measures, and feature scaling.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/multivariate-thinking",
  },
  openGraph: {
    title: "Multivariate Thinking & the Curse of Dimensionality | NeuroNomixer",
    description:
      "Understand how high-dimensional data differs fundamentally. Explore curse of dimensionality, PCA, clustering, distance measures, and feature scaling.",
    url: "https://www.neuronomixer.com/visual-guides/multivariate-thinking",
    siteName: "NeuroNomixer",
    type: "website",
  },
};

export default function MultivariateThinkingPage() {
  return <MultivariateThinkingClient />;
}
