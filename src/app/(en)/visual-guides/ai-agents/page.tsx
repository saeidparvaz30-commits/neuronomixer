import type { Metadata } from "next";
import AIAgentsClient from "@/components/VisualGuides/AIAgents/AIAgentsClient";

export const metadata: Metadata = {
  title: "AI Agents: Autonomy in Action",
  description:
    "Watch an agent loop through Perceive, Think, Act, Observe cycles. See how the model emits structured tool calls that a runtime executes to complete multi-step tasks.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/ai-agents",
  },
  openGraph: {
    title: "AI Agents: Autonomy in Action | NeuroNomixer",
    description:
      "Watch an agent loop through Perceive, Think, Act, Observe cycles. See how the model emits structured tool calls that a runtime executes to complete multi-step tasks.",
    url: "https://www.neuronomixer.com/visual-guides/ai-agents",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Agents: Autonomy in Action",
    description:
      "Watch an agent loop through Perceive, Think, Act, Observe cycles. See how the model emits structured tool calls that a runtime executes to complete multi-step tasks.",
  },
};

export default function AIAgentsPage() {
  return <AIAgentsClient />;
}
