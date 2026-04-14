import type { Metadata } from "next";
import MultipleRegressionClient from "@/components/VisualGuides/MultipleRegression/MultipleRegressionClient";

export const metadata: Metadata = {
  title: "Multiple Regression & Confounding | NeuroNomixer",
  description:
    "Explore how multiple regression reveals confounding and interaction effects. Interactive coefficient explorer and regression comparison.",
  alternates: {
    canonical:
      "https://www.neuronomixer.com/visual-guides/multiple-regression-confounding",
  },
  openGraph: {
    title: "Multiple Regression & Confounding",
    description:
      "Discover how adding predictors changes coefficient estimates.",
    type: "article",
  },
};

export default function Page() {
  return <MultipleRegressionClient />;
}
