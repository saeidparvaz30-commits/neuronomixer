import type { Metadata } from "next";
import NormalDistributionZScoresClient from "@/components/VisualGuides/NormalDistributionZScores/NormalDistributionZScoresClient";

export const metadata: Metadata = {
  title: "The Normal Distribution & Z-Scores",
  description:
    "Explore the normal curve, drag markers to see probabilities, and convert raw scores to z-scores. Understand standard normal transformation and the empirical rule.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/normal-distribution-z-scores",
  },
  openGraph: {
    title: "The Normal Distribution & Z-Scores — NeuroNomixer Visual Guides",
    description:
      "Interactive normal curve explorer with z-score calculator and score comparison tool.",
    url: "https://www.neuronomixer.com/visual-guides/normal-distribution-z-scores",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Normal Distribution & Z-Scores",
    description: "Visualize probabilities and convert scores with interactive curves.",
  },
};

export default function NormalDistributionZScoresPage() {
  return <NormalDistributionZScoresClient />;
}
