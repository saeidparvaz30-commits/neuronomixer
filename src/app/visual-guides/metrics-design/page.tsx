import type { Metadata } from "next";
import MetricsDesignClient from "@/components/VisualGuides/MetricsDesign/MetricsDesignClient";

export const metadata: Metadata = {
  title: "Metrics That Do Not Backfire",
  description:
    "Point a greedy optimizer at clicks and watch clickbait spawn while retention decays, then add a guardrail and re-run: north star, input metrics, and Goodhart's law in one live simulation.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/metrics-design",
  },
  openGraph: {
    title: "Metrics That Do Not Backfire | NeuroNomixer",
    description:
      "North star, input metrics, and guardrails: an interactive simulation where an optimizer games whatever metric you choose, until you fence it.",
    url: "https://www.neuronomixer.com/visual-guides/metrics-design",
    siteName: "NeuroNomixer",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Metrics That Do Not Backfire | NeuroNomixer",
    description:
      "North star, input metrics, and guardrails: an interactive simulation where an optimizer games whatever metric you choose, until you fence it.",
  },
};

export default function MetricsDesignPage() {
  return <MetricsDesignClient />;
}
