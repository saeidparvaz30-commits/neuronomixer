import type { Metadata } from "next";
import NaiveBayesClient from "@/components/VisualGuides/NaiveBayes/NaiveBayesClient";

const TITLE = "Naive Bayes | NeuroNomixer";
const DESCRIPTION =
  "Classification as Bayes rule with a bold independence assumption: tune per-word likelihoods over a visible ten-message corpus and watch posteriors recompute, then drag points in a 2D Gaussian view as the decision boundary refits live.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/naive-bayes",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.neuronomixer.com/visual-guides/naive-bayes",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function NaiveBayesPage() {
  return <NaiveBayesClient />;
}
