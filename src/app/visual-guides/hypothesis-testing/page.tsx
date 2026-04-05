import type { Metadata } from "next";
import HypothesisTestingClient from "@/components/VisualGuides/HypothesisTesting/HypothesisTestingClient";

export const metadata: Metadata = {
  title: "Hypothesis Testing: A Visual Experiment",
  description:
    "Design an A/B experiment, run it once, then simulate 1000 replications. Understand statistical power, Type I error, and significance visually.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/hypothesis-testing" },
  openGraph: {
    title: "Hypothesis Testing: A Visual Experiment — NeuroNomixer",
    description:
      "Interactive hypothesis testing simulator. Tune effect size, sample size, and α. Watch power and Type I error emerge from Monte Carlo simulations.",
    url: "https://www.neuronomixer.com/visual-guides/hypothesis-testing",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hypothesis Testing: A Visual Experiment",
    description: "Run A/B experiments and simulate 1000 replications. See statistical power and Type I error in action.",
  },
};

export default function HypothesisTestingPage() {
  return <HypothesisTestingClient />;
}
