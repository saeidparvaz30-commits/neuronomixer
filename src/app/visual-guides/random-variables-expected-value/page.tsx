import type { Metadata } from "next";
import RandomVariablesExpectedValueClient from "@/components/VisualGuides/RandomVariablesExpectedValue/RandomVariablesExpectedValueClient";

export const metadata: Metadata = {
  title: "Random Variables & Expected Value: Law of Large Numbers",
  description:
    "Build your own probability distribution, compute EV = Σ xᵢpᵢ, and simulate thousands of draws to see the running average converge to the theoretical expected value.",
  alternates: {
    canonical:
      "https://www.neuronomixer.com/visual-guides/random-variables-expected-value",
  },
  openGraph: {
    title: "Random Variables & Expected Value — NeuroNomixer",
    description:
      "Interactive simulation playground for expected value: custom distributions, fair coin, and real-world lottery EV breakdown.",
    url: "https://www.neuronomixer.com/visual-guides/random-variables-expected-value",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Random Variables & Expected Value",
    description:
      "Simulate thousands of draws and watch the running average converge to the theoretical expected value.",
  },
};

export default function RandomVariablesExpectedValuePage() {
  return <RandomVariablesExpectedValueClient />;
}
