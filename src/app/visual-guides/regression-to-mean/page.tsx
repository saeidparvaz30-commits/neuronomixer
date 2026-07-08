import type { Metadata } from "next";
import RegressionToMeanClient from "@/components/VisualGuides/RegressionToMean/RegressionToMeanClient";

export const metadata: Metadata = {
  title: "Regression to the Mean",
  description:
    "Select top performers after Test 1 and watch their Test 2 scores drift back toward the group average, even with no intervention.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/regression-to-mean" },
  openGraph: {
    title: "Regression to the Mean — NeuroNomixer",
    description:
      "Interactive scatter plot showing how extreme scores regress to the mean on retest. Adjust correlation and see the effect change.",
    url: "https://www.neuronomixer.com/visual-guides/regression-to-mean",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Regression to the Mean",
    description: "Why top performers seem to decline and poor performers improve: regression to the mean, visualized.",
  },
};

export default function RegressionToMeanPage() {
  return <RegressionToMeanClient />;
}
