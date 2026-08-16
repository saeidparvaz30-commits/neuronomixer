import type { Metadata } from "next";
import DecisionTreesClient from "@/components/VisualGuides/DecisionTrees/DecisionTreesClient";

export const metadata: Metadata = {
  title: "Decision Trees: Build One Yourself",
  description:
    "Click to place split lines on a 2D dataset and build a decision tree manually. Watch the tree diagram grow and decision regions color in after every split.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/decision-trees" },
  openGraph: {
    title: "Decision Trees: Build One Yourself | NeuroNomixer",
    description:
      "Interactive decision tree builder. Place axis-aligned splits, watch Gini impurity decrease, and see decision boundaries form in real time.",
    url: "https://www.neuronomixer.com/visual-guides/decision-trees",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Decision Trees: Build One Yourself",
    description: "Click to split a 2D dataset and build a decision tree. Watch accuracy improve with every split.",
  },
};

export default function DecisionTreesPage() {
  return <DecisionTreesClient />;
}
