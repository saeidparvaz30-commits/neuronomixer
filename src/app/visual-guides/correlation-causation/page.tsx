import type { Metadata } from "next";
import CorrelationCausationClient from "@/components/VisualGuides/CorrelationCausation/CorrelationCausationClient";

export const metadata: Metadata = {
  title: "Correlation vs Causation: The Visual Guide",
  description:
    "Ice cream sales and shark attacks are correlated — but ice cream doesn't cause sharks! Explore confounding variables, generate spurious correlations, and learn the difference between correlation and causation.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/correlation-causation" },
  openGraph: {
    title: "Correlation vs Causation — NeuroNomixer Visual Guides",
    description:
      "Why correlation isn't causation. Discover hidden confounds, generate spurious correlations, understand real causal mechanisms.",
    url: "https://www.neuronomixer.com/visual-guides/correlation-causation",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Correlation vs Causation — NeuroNomixer Visual Guides",
    description:
      "Interactive examples showing correlation without causation. Confounds, spurious correlations, and more.",
  },
};

export default function CorrelationCausationPage() {
  return <CorrelationCausationClient />;
}
