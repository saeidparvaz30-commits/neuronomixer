import type { Metadata } from "next";
import ConfidenceIntervalsClient from "@/components/VisualGuides/ConfidenceIntervals/ConfidenceIntervalsClient";

export const metadata: Metadata = {
  title: "Confidence Intervals: What They Actually Mean",
  description:
    "Visualize 100 confidence intervals from repeated sampling. See which capture the true parameter and how interval width changes with confidence level.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/confidence-intervals",
  },
  openGraph: {
    title: "Confidence Intervals: What They Actually Mean | NeuroNomixer",
    description:
      "Interactive visualization of repeated sampling confidence intervals.",
    url: "https://www.neuronomixer.com/visual-guides/confidence-intervals",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Confidence Intervals: What They Actually Mean",
    description: "See how confidence intervals work through repeated sampling.",
  },
};

export default function ConfidenceIntervalsPage() {
  return <ConfidenceIntervalsClient />;
}
