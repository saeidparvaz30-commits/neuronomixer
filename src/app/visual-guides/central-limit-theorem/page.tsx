import type { Metadata } from "next";
import CentralLimitTheoremClient from "@/components/VisualGuides/CentralLimitTheorem/CentralLimitTheoremClient";

export const metadata: Metadata = {
  title: "Central Limit Theorem Visualized: Why Sample Means Are Normal",
  description:
    "Pick any population distribution — uniform, skewed, bimodal — and draw random samples. Watch the distribution of sample means converge to a normal curve. The most important theorem in statistics, made interactive.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/central-limit-theorem" },
  openGraph: {
    title: "Central Limit Theorem — NeuroNomixer Visual Guides",
    description:
      "Interactive CLT demonstration: draw samples from non-normal populations and watch the sampling distribution converge to a bell curve.",
    url: "https://www.neuronomixer.com/visual-guides/central-limit-theorem",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Central Limit Theorem — NeuroNomixer Visual Guides",
    description: "Sample from any distribution, watch it become normal. The CLT, animated.",
  },
};

export default function CentralLimitTheoremPage() {
  return <CentralLimitTheoremClient />;
}
