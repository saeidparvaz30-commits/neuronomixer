import type { Metadata } from "next";
import ProbabilityFundamentalsClient from "@/components/VisualGuides/ProbabilityFundamentals/ProbabilityFundamentalsClient";

export const metadata: Metadata = {
  title: "Probability Fundamentals: Rules of Chance",
  description:
    "Flip coins, roll dice, draw cards. Build compound events and watch experimental probability converge to theory as you run thousands of simulations.",
  alternates: {
    canonical:
      "https://www.neuronomixer.com/visual-guides/probability-fundamentals",
  },
  openGraph: {
    title: "Probability Fundamentals: Rules of Chance | NeuroNomixer Visual Guides",
    description:
      "Interactive probability simulator. Build compound events with AND, OR, and NOT rules. Watch the Law of Large Numbers in action.",
    url: "https://www.neuronomixer.com/visual-guides/probability-fundamentals",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Probability Fundamentals: Rules of Chance | NeuroNomixer",
    description:
      "Build compound events, simulate thousands of trials, and explore Venn diagrams interactively.",
  },
};

export default function ProbabilityFundamentalsPage() {
  return <ProbabilityFundamentalsClient />;
}
