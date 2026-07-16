import type { Metadata } from "next";
import BayesTheoremClient from "@/components/VisualGuides/BayesTheorem/BayesTheoremClient";

export const metadata: Metadata = {
  title: "Bayes Theorem: Update Your Beliefs",
  description:
    "Learn how to update beliefs when you get new evidence. See how even accurate tests lead to surprising posterior probabilities for rare conditions.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/bayes-theorem" },
  openGraph: {
    title: "Bayes Theorem: Update Your Beliefs | NeuroNomixer",
    description: "Interactive visualization of Bayesian reasoning and belief updating with real-world medical testing examples.",
    url: "https://www.neuronomixer.com/visual-guides/bayes-theorem",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bayes Theorem: Update Your Beliefs",
    description: "Understand Bayes theorem through interactive medical testing scenarios.",
  },
};

export default function BayesTheoremPage() {
  return <BayesTheoremClient />;
}
