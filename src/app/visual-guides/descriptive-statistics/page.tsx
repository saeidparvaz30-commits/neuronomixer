import type { Metadata } from "next";
import DescriptiveStatisticsClient from "@/components/VisualGuides/DescriptiveStatistics/DescriptiveStatisticsClient";

export const metadata: Metadata = {
  title: "Descriptive Statistics: Center, Spread & Shape",
  description:
    "Drag salary data points on an interactive number line and watch mean, median, variance, and standard deviation update instantly. Learn measures of center, spread, and robust alternatives.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/descriptive-statistics",
  },
  openGraph: {
    title: "Descriptive Statistics: Center, Spread & Shape | NeuroNomixer Visual Guides",
    description:
      "Interactive visual guide: drag data points and watch descriptive statistics update in real time.",
    url: "https://www.neuronomixer.com/visual-guides/descriptive-statistics",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Descriptive Statistics: Center, Spread & Shape | NeuroNomixer",
    description:
      "Drag salary data points and watch mean, median, variance, and IQR update live.",
  },
};

export default function DescriptiveStatisticsPage() {
  return <DescriptiveStatisticsClient />;
}
