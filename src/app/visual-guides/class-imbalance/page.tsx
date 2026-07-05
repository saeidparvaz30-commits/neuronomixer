import type { Metadata } from "next";
import ClassImbalanceClient from "@/components/VisualGuides/ClassImbalance/ClassImbalanceClient";

export const metadata: Metadata = {
  title: "Class Imbalance and the Accuracy Trap",
  description:
    "Interactive guide to class imbalance: see why 99% accuracy can be worthless, watch ROC stay flat while precision collapses, and learn which metric to trust when.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/class-imbalance",
  },
  openGraph: {
    title: "Class Imbalance and the Accuracy Trap | NeuroNomixer Visual Guides",
    description:
      "Sweep the imbalance ratio from 1:1 to 1:99 and watch live ROC and PR curves diverge. Confusion matrix, threshold tuning, resampling, and class weights explained.",
    url: "https://www.neuronomixer.com/visual-guides/class-imbalance",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Class Imbalance and the Accuracy Trap | NeuroNomixer Visual Guides",
    description:
      "Why accuracy lies under imbalance: live ROC vs PR curves, threshold tuning, and honest guidance on resampling and class weights.",
  },
};

export default function ClassImbalancePage() {
  return <ClassImbalanceClient />;
}
