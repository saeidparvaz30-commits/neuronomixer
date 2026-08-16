import type { Metadata } from "next";
import CausalThinkingDAGsClient from "@/components/VisualGuides/CausalThinkingDAGs/CausalThinkingDAGsClient";

export const metadata: Metadata = {
  title: "Causal Thinking: Confounders, Mediators & DAGs",
  description:
    "Learn causal inference with directed acyclic graphs. Explore confounders, mediators, colliders, and the back-door criterion through interactive visualizations.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/causal-thinking-dags",
  },
  openGraph: {
    title: "Causal Thinking: Confounders, Mediators & DAGs",
    description:
      "Interactive DAG visualizer for causal inference. Explore confounders, mediators, and collider bias with live examples.",
    url: "https://www.neuronomixer.com/visual-guides/causal-thinking-dags",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Causal Thinking: Confounders, Mediators & DAGs | NeuroNomixer",
    description:
      "Interactive DAG visualizer: learn confounders, mediators, colliders and why the wrong control variable introduces bias.",
  },
};

export default function CausalThinkingDAGsPage() {
  return <CausalThinkingDAGsClient />;
}
