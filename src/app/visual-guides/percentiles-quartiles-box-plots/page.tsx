import type { Metadata } from "next";
import PercentilesQuartilesBoxPlotsClient from "@/components/VisualGuides/PercentilesQuartilesBoxPlots/PercentilesQuartilesBoxPlotsClient";

export const metadata: Metadata = {
  title: "Percentiles, Quartiles & Box Plots",
  description:
    "Transform raw data into a box plot step by step. Discover quartiles, percentiles, and the five-number summary that reveal data structure at a glance.",
  alternates: {
    canonical:
      "https://www.neuronomixer.com/visual-guides/percentiles-quartiles-box-plots",
  },
  openGraph: {
    title: "Percentiles, Quartiles & Box Plots — NeuroNomixer Visual Guides",
    description:
      "Interactive box plot builder: build from raw data through median, quartiles, whiskers and z-scores step by step.",
    url: "https://www.neuronomixer.com/visual-guides/percentiles-quartiles-box-plots",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Percentiles, Quartiles & Box Plots — NeuroNomixer Visual Guides",
    description:
      "Build box plots step by step from raw data. Explore percentile ranks, IQR, outliers, and z-score standardization.",
  },
};

export default function PercentilesQuartilesBoxPlotsPage() {
  return <PercentilesQuartilesBoxPlotsClient />;
}
