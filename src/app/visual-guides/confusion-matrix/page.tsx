import type { Metadata } from "next";
import ConfusionMatrixClient from "@/components/VisualGuides/ConfusionMatrix/ConfusionMatrixClient";

export const metadata: Metadata = {
  title: "The Confusion Matrix Decoded",
  description:
    "Go beyond accuracy. Explore the confusion matrix for medical, spam, and fraud scenarios. Adjust the classification threshold and watch precision, recall, and F1 update in real time.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/confusion-matrix" },
  openGraph: {
    title: "The Confusion Matrix Decoded | NeuroNomixer",
    description: "Interactive confusion matrix: change threshold, explore TP/FP/TN/FN, and see why accuracy alone is misleading.",
    url: "https://www.neuronomixer.com/visual-guides/confusion-matrix",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Confusion Matrix Decoded",
    description: "Explore TP, FP, TN, FN and how classification threshold affects precision, recall, and F1.",
  },
};

export default function ConfusionMatrixPage() {
  return <ConfusionMatrixClient />;
}
