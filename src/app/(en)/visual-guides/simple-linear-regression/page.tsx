import type { Metadata } from "next";
import SimpleRegressionClient from "@/components/VisualGuides/SimpleRegression/SimpleRegressionClient";

export const metadata: Metadata = {
  title: "Simple Linear Regression: Fit the Line",
  description:
    "Interactive OLS regression: place points, watch the least-squares line, residuals, R², and prediction intervals update in real time.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/simple-linear-regression",
  },
  openGraph: {
    title: "Simple Linear Regression: Fit the Line",
    description: "Master linear regression through live OLS fitting.",
    type: "article",
  },
};

export default function Page() {
  return <SimpleRegressionClient />;
}
