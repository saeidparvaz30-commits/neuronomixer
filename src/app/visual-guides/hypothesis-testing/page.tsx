import type { Metadata } from "next";
import HypothesisTestingClient from "@/components/VisualGuides/HypothesisTesting/HypothesisTestingClient";

export const metadata: Metadata = {
  title: "Hypothesis Testing: A Visual Experiment",
  description:
    "Design A/B tests, run 1000 experiments, and watch the confusion matrix tally true/false positives. Learn statistical power, Type I and Type II errors through interactive simulation.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/hypothesis-testing",
  },
  openGraph: {
    title: "Hypothesis Testing: A Visual Experiment — NeuroNomixer",
    description:
      "Interactive hypothesis testing simulator. Tune effect size, sample size, and α. Watch power and Type I error emerge from 1000 Monte Carlo experiments.",
    url: "https://www.neuronomixer.com/visual-guides/hypothesis-testing",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hypothesis Testing: A Visual Experiment — NeuroNomixer",
    description:
      "Design A/B tests. Run 1000 experiments. Watch the confusion matrix tally true/false positives in real time.",
  },
};

export default function HypothesisTestingPage() {
  return <HypothesisTestingClient />;
}
