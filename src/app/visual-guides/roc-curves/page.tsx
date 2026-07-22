import type { Metadata } from "next";
import ROCCurvesClient from "@/components/VisualGuides/ROCCurves/ROCCurvesClient";

export const metadata: Metadata = {
  title: "ROC Curves & AUC: Threshold Tuning Visualized",
  description:
    "Explore ROC curves and AUC for multiple classifiers. Drag the threshold to trace the curve, compare models, and see how the score distribution determines model quality.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/roc-curves" },
  openGraph: {
    title: "ROC Curves & AUC: Threshold Tuning Visualized | NeuroNomixer",
    description: "Interactive ROC curve explorer: compare classifiers, tune threshold, understand AUC.",
    url: "https://www.neuronomixer.com/visual-guides/roc-curves",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "ROC Curves & AUC: Threshold Tuning Visualized",
    description: "See how ROC curves capture every threshold tradeoff and AUC summarizes classifier quality.",
  },
};

export default function ROCCurvesPage() {
  return <ROCCurvesClient />;
}
