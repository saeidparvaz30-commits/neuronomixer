import type { Metadata } from "next";
import DecodingStrategiesClient from "@/components/VisualGuides/DecodingStrategies/DecodingStrategiesClient";

export const metadata: Metadata = {
  title: "Greedy, Beam, and Sampling",
  description:
    "Train a character n-gram model on a visible corpus in your browser, then decode it three ways: watch greedy loop, expand a real beam-search tree with cumulative log-probs, and run 100 sampled continuations to plot diversity against likelihood.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/decoding-strategies",
  },
  openGraph: {
    title: "Greedy, Beam, and Sampling | NeuroNomixer",
    description:
      "Train a character n-gram model on a visible corpus in your browser, then decode it three ways: watch greedy loop, expand a real beam-search tree with cumulative log-probs, and run 100 sampled continuations to plot diversity against likelihood.",
    url: "https://www.neuronomixer.com/visual-guides/decoding-strategies",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Greedy, Beam, and Sampling | NeuroNomixer",
    description:
      "Train a character n-gram model on a visible corpus in your browser, then decode it three ways: watch greedy loop, expand a real beam-search tree with cumulative log-probs, and run 100 sampled continuations to plot diversity against likelihood.",
  },
};

export default function DecodingStrategiesPage() {
  return <DecodingStrategiesClient />;
}
