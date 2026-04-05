import type { Metadata } from "next";
import LinearRegressionClient from "@/components/VisualGuides/LinearRegression/LinearRegressionClient";

export const metadata: Metadata = {
  title: "Linear Regression: Draw the Best Fit",
  description:
    "Drag data points and watch the regression line, residuals, R², and loss function update live. Click to add new points.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/linear-regression" },
  openGraph: {
    title: "Linear Regression: Draw the Best Fit — NeuroNomixer",
    description:
      "Interactive linear regression playground. Drag points, see OLS fit, residuals, confidence band, and the loss landscape in real time.",
    url: "https://www.neuronomixer.com/visual-guides/linear-regression",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Linear Regression: Draw the Best Fit",
    description: "Drag data points and watch the regression line and R² update live.",
  },
};

export default function LinearRegressionPage() {
  return <LinearRegressionClient />;
}
