import type { Metadata } from "next";
import ProbabilityDistributionsClient from "@/components/VisualGuides/ProbabilityDistributions/ProbabilityDistributionsClient";

export const metadata: Metadata = {
  title: "Probability Distributions Gallery",
  description:
    "Explore 8 probability distributions interactively. Adjust parameters, view PDFs and PMFs, key statistics, and real-world use cases.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/probability-distributions" },
  openGraph: {
    title: "Probability Distributions Gallery — NeuroNomixer",
    description:
      "Interactive gallery of 8 probability distributions. Tweak parameters and watch the shape change in real time.",
    url: "https://www.neuronomixer.com/visual-guides/probability-distributions",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Probability Distributions Gallery",
    description:
      "Explore Normal, Binomial, Poisson, Beta, Gamma and more — with live parameter controls.",
  },
};

export default function ProbabilityDistributionsPage() {
  return <ProbabilityDistributionsClient />;
}
