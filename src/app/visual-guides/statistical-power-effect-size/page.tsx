import type { Metadata } from "next";
import StatisticalPowerEffectSizeClient from "@/components/VisualGuides/StatisticalPowerEffectSize/StatisticalPowerEffectSizeClient";

export const metadata: Metadata = {
  title: "Statistical Power & Effect Size",
  description:
    "Learn how effect size, sample size, and significance level jointly determine statistical power. Interactive overlapping distributions show exactly when your study can detect a true signal.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/statistical-power-effect-size",
  },
  openGraph: {
    title: "Statistical Power & Effect Size — NeuroNomixer Visual Guides",
    description:
      "Interactive visualization of statistical power. Tune Cohen's d, sample size, and α to see how power changes in real time.",
    url: "https://www.neuronomixer.com/visual-guides/statistical-power-effect-size",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Statistical Power & Effect Size — NeuroNomixer Visual Guides",
    description:
      "See how overlapping null and alternative distributions determine statistical power. Interactive sliders for d, n, and α.",
  },
};

export default function StatisticalPowerEffectSizePage() {
  return <StatisticalPowerEffectSizeClient />;
}
