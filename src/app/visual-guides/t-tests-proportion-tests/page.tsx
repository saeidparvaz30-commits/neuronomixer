import type { Metadata } from "next";
import TTestsGuideClient from "@/components/VisualGuides/TTestsGuide/TTestsGuideClient";

export const metadata: Metadata = {
  title: "t-Tests & Proportion Tests: Comparing Two Groups",
  description:
    "Work through four interactive scenarios: one-sample, independent, paired, and proportion tests. Run real statistical tests with assumption checks, CI visualizations, and Cohen's d.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/t-tests-proportion-tests",
  },
  openGraph: {
    title: "t-Tests & Proportion Tests: Comparing Two Groups — NeuroNomixer",
    description:
      "Interactive guide to t-tests and proportion tests. Compare factory output to targets, A/B campaign data, before/after training scores, and conversion rates.",
    url: "https://www.neuronomixer.com/visual-guides/t-tests-proportion-tests",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "t-Tests & Proportion Tests: Comparing Two Groups",
    description:
      "Run one-sample, independent, paired, and proportion tests interactively. See p-values, CIs, and Cohen's d with real scenarios.",
  },
};

export default function TTestsProportionTestsPage() {
  return <TTestsGuideClient />;
}
