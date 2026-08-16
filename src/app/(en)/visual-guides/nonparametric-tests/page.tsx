import type { Metadata } from "next";
import NonparametricGuideClient from "@/components/VisualGuides/NonparametricGuide/NonparametricGuideClient";

export const metadata: Metadata = {
  title: "Nonparametric Tests: When Assumptions Fail",
  description:
    "Learn when and how to use nonparametric statistical tests. Explore Mann-Whitney U, Wilcoxon signed-rank, Kruskal-Wallis, and Sign tests interactively when normality assumptions are violated.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/nonparametric-tests",
  },
  openGraph: {
    title: "Nonparametric Tests: When Assumptions Fail | NeuroNomixer",
    description:
      "Interactive guide to rank-based nonparametric tests. Check normality assumptions, compare parametric vs nonparametric results, and use the decision helper to choose the right test.",
    url: "https://www.neuronomixer.com/visual-guides/nonparametric-tests",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nonparametric Tests: When Assumptions Fail | NeuroNomixer",
    description:
      "Explore Mann-Whitney U, Wilcoxon signed-rank, Kruskal-Wallis, and Sign tests. Learn when to abandon the t-test.",
  },
};

export default function NonparametricTestsPage() {
  return <NonparametricGuideClient />;
}
