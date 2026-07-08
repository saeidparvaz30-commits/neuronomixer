import type { Metadata } from "next";
import RandomForestsClient from "@/components/VisualGuides/RandomForests/RandomForestsClient";

export const metadata: Metadata = {
  title: "Random Forests: Wisdom of the Crowd",
  description:
    "See how combining many imperfect decision trees creates a powerful ensemble. Adjust tree count and depth, compare a single tree to the full forest, and watch accuracy improve.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/random-forests" },
  openGraph: {
    title: "Random Forests: Wisdom of the Crowd — NeuroNomixer",
    description: "Interactive Random Forest visualizer: add trees, watch decision boundaries smooth out, compare ensemble vs single tree.",
    url: "https://www.neuronomixer.com/visual-guides/random-forests",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Random Forests: Wisdom of the Crowd",
    description: "See how Random Forests combine many trees to beat any single decision tree.",
  },
};

export default function RandomForestsPage() {
  return <RandomForestsClient />;
}
