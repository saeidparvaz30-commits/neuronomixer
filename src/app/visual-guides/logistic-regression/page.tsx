import type { Metadata } from "next";
import LogisticRegressionClient from "@/components/VisualGuides/LogisticRegression/LogisticRegressionClient";

export const metadata: Metadata = {
  title: "Logistic Regression: Predicting Yes or No",
  description:
    "Learn binary classification with logistic regression. Explore S-curves, threshold selection, odds ratios, sensitivity, specificity, and probability calibration.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/logistic-regression",
  },
  openGraph: {
    title: "Logistic Regression: Predicting Yes or No",
    description:
      "Master binary classification with interactive S-curves and threshold tuning.",
    type: "article",
  },
};

export default function Page() {
  return <LogisticRegressionClient />;
}
