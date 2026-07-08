import type { Metadata } from "next";
import CorrelationCovarianceClient from "@/components/VisualGuides/CorrelationCovariance/CorrelationCovarianceClient";

export const metadata: Metadata = {
  title: "Correlation & Covariance | NeuroNomixer",
  description:
    "Interactive guide to covariance, Pearson correlation, Spearman and Kendall rank correlations. Explore Anscombe's Quartet and learn why correlation does not imply causation.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/correlation-covariance",
  },
  openGraph: {
    title: "Correlation & Covariance",
    description:
      "Master correlation through interactive scatter plots.",
    type: "article",
  },
};

export default function Page() {
  return <CorrelationCovarianceClient />;
}
