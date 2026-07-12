import type { Metadata } from "next";
import GroupByAggregationClient from "@/components/VisualGuides/GroupByAggregation/GroupByAggregationClient";

export const metadata: Metadata = {
  title: "Split, Apply, Combine",
  description:
    "Run group-by aggregation live: split a real transactions table into groups, apply count, sum, mean, min, or max, and combine the results into a new table, then build a two-level pivot.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/groupby-aggregation",
  },
  openGraph: {
    title: "Split, Apply, Combine — NeuroNomixer Visual Guides",
    description:
      "Split a transactions table into groups, apply an aggregate, and combine into a summary table. Includes a live pivot table and a question-to-recipe translator exercise.",
    url: "https://www.neuronomixer.com/visual-guides/groupby-aggregation",
    siteName: "NeuroNomixer",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Split, Apply, Combine — NeuroNomixer",
    description:
      "Interactive guide to group-by aggregation: live regrouping, computed pivot tables, and a question translator with instant feedback.",
  },
};

export default function GroupByAggregationPage() {
  return <GroupByAggregationClient />;
}
