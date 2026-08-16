import type { Metadata } from "next";
import ModelDecisionClient from "@/components/VisualGuides/ModelDecision/ModelDecisionClient";

export const metadata: Metadata = {
  title: "Which AI Model Should I Use?",
  description:
    "Set a quality floor, budget ceiling, latency and privacy constraints, and watch a live Pareto frontier of cost versus capability recompute which AI models are worth picking.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/ai-model-decision-guide",
  },
  openGraph: {
    title: "Which AI Model Should I Use? | NeuroNomixer",
    description:
      "Set a quality floor, budget ceiling, latency and privacy constraints, and watch a live Pareto frontier of cost versus capability recompute which AI models are worth picking.",
    url: "https://www.neuronomixer.com/visual-guides/ai-model-decision-guide",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Which AI Model Should I Use? | NeuroNomixer",
    description:
      "Set a quality floor, budget ceiling, latency and privacy constraints, and watch a live Pareto frontier of cost versus capability recompute which AI models are worth picking.",
  },
};

export default function AiModelDecisionGuidePage() {
  return <ModelDecisionClient />;
}
