import type { Metadata } from "next";
import BiasVarianceClient from "@/components/VisualGuides/BiasVariance/BiasVarianceClient";

export const metadata: Metadata = {
  title: "Bias vs Variance: The Bullseye",
  description:
    "Throw darts at a bullseye target while adjusting bias and variance sliders. Understand the bias-variance tradeoff through interactive play.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/bias-variance" },
  openGraph: {
    title: "Bias vs Variance: The Bullseye | NeuroNomixer",
    description:
      "Interactive bullseye game illustrating the bias-variance tradeoff. Adjust sliders and watch MSE decompose into its components.",
    url: "https://www.neuronomixer.com/visual-guides/bias-variance",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bias vs Variance: The Bullseye",
    description: "Throw darts to understand bias, variance, and the tradeoff at the heart of machine learning.",
  },
};

export default function BiasVariancePage() {
  return <BiasVarianceClient />;
}
