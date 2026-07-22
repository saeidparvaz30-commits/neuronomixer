import type { Metadata } from "next";
import ProbabilityDistributionsClient from "@/components/VisualGuides/ProbabilityDistributions/ProbabilityDistributionsClient";

export const metadata: Metadata = {
  title: "Probability Distributions Gallery",
  description:
    "Explore 8+ probability distributions interactively. Adjust parameters, view PDFs/PMFs, statistics, and real-world use cases.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/probability-distributions",
  },
  openGraph: {
    title: "Probability Distributions Gallery | NeuroNomixer",
    description:
      "Interactive gallery of distributions with adjustable parameters.",
    url: "https://www.neuronomixer.com/visual-guides/probability-distributions",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Probability Distributions Gallery",
    description:
      "Explore probability distributions interactively with live parameter adjustments.",
  },
};

export default function ProbabilityDistributionsPage() {
  return <ProbabilityDistributionsClient />;
}
