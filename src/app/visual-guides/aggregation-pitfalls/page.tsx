import type { Metadata } from "next";
import AggregationPitfallsClient from "@/components/VisualGuides/AggregationPitfalls/AggregationPitfallsClient";

export const metadata: Metadata = {
  title: "When Averages Lie: Aggregation Traps",
  description:
    "Pool two clinics and the winner flips: drag the case mix to find the exact reversal point, then flip a second verdict by changing nothing but the denominator.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/aggregation-pitfalls",
  },
  openGraph: {
    title: "When Averages Lie: Aggregation Traps | NeuroNomixer",
    description:
      "Aggregation level and denominator choice as everyday grouping craft: an interactive guide to the two silent decisions that can flip any average.",
    url: "https://www.neuronomixer.com/visual-guides/aggregation-pitfalls",
    siteName: "NeuroNomixer",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "When Averages Lie: Aggregation Traps | NeuroNomixer",
    description:
      "Aggregation level and denominator choice as everyday grouping craft: an interactive guide to the two silent decisions that can flip any average.",
  },
};

export default function AggregationPitfallsPage() {
  return <AggregationPitfallsClient />;
}
