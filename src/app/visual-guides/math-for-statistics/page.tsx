import type { Metadata } from "next";
import MathForStatisticsClient from "@/components/VisualGuides/MathForStatistics/MathForStatisticsClient";

export const metadata: Metadata = {
  title: "Math for Statistics: The Visual Toolkit",
  description:
    "Explore growth, logarithms, summation, weighted averages, rates of change, and set operations with six interactive visual tools. No formulas to memorize — just intuition.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/math-for-statistics",
  },
  openGraph: {
    title: "Math for Statistics: The Visual Toolkit — NeuroNomixer Visual Guides",
    description:
      "Six interactive tools to build mathematical intuition for statistics. Compound growth, log scales, sigma notation, weighted averages, slope, and set operations.",
    url: "https://www.neuronomixer.com/visual-guides/math-for-statistics",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Math for Statistics: The Visual Toolkit — NeuroNomixer Visual Guides",
    description:
      "Interactive visual tools for compound growth, log scales, summation, weighted averages, slope, and set operations.",
  },
};

export default function MathForStatisticsPage() {
  return <MathForStatisticsClient />;
}
