import type { Metadata } from "next";
import AnovaGuideClient from "@/components/VisualGuides/AnovaGuide/AnovaGuideClient";

export const metadata: Metadata = {
  title: "ANOVA: Comparing Many Groups",
  description:
    "Decompose variance across four groups. Run one-way ANOVA, visualize SS_Between and SS_Within, and explore Bonferroni-corrected post-hoc pairwise comparisons.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/anova-comparing-groups" },
  openGraph: {
    title: "ANOVA: Comparing Many Groups — NeuroNomixer",
    description:
      "Interactive ANOVA guide: box plots, variance decomposition, F-statistic, and Bonferroni-corrected pairwise comparisons. Includes a repeated-measures explainer.",
    url: "https://www.neuronomixer.com/visual-guides/anova-comparing-groups",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "ANOVA: Comparing Many Groups",
    description:
      "Visualize one-way ANOVA step by step — variance decomposition, F-statistic, and post-hoc comparisons.",
  },
};

export default function AnovaComparingGroupsPage() {
  return <AnovaGuideClient />;
}
