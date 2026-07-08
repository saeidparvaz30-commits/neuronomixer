import type { Metadata } from "next";
import StandardErrorPointEstimatesClient from "@/components/VisualGuides/StandardErrorPointEstimates/StandardErrorPointEstimatesClient";

export const metadata: Metadata = {
  title: "Standard Error & Point Estimates",
  description:
    "Draw repeated samples and watch the spread of sample means shrink. Understand what standard error measures and how estimator properties (bias, consistency, efficiency) work.",
  alternates: {
    canonical:
      "https://www.neuronomixer.com/visual-guides/standard-error-point-estimates",
  },
  openGraph: {
    title:
      "Standard Error & Point Estimates — NeuroNomixer Visual Guides",
    description:
      "Interactive visualization of standard error and point estimator properties.",
    url: "https://www.neuronomixer.com/visual-guides/standard-error-point-estimates",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Standard Error & Point Estimates",
    description: "See how sample means cluster around the true value.",
  },
};

export default function StandardErrorPointEstimatesPage() {
  return <StandardErrorPointEstimatesClient />;
}
