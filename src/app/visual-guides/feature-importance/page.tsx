import type { Metadata } from "next";
import FeatureImportanceClient from "@/components/VisualGuides/FeatureImportance/FeatureImportanceClient";

const TITLE = "Feature Importance and SHAP Intuition | NeuroNomixer";
const DESCRIPTION =
  "Train a real tree ensemble in your browser, shuffle columns to measure permutation importance live, and decompose one prediction into a SHAP-style waterfall that sums exactly to the model output.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/feature-importance",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.neuronomixer.com/visual-guides/feature-importance",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function FeatureImportancePage() {
  return <FeatureImportanceClient />;
}
