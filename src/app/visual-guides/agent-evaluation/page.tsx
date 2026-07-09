import type { Metadata } from "next";
import AgentEvaluationClient from "@/components/VisualGuides/AgentEvaluation/AgentEvaluationClient";

export const metadata: Metadata = {
  title: "Evaluating Agents: Grading the Trajectory | NeuroNomixer",
  description:
    "Replay three agent transcripts step by step, grade them with code checks versus a rubric judge, then drag p and k to watch pass@k and pass^k diverge: one lucky pass is not reliability.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/agent-evaluation",
  },
  openGraph: {
    title: "Evaluating Agents: Grading the Trajectory | NeuroNomixer",
    description:
      "Replay three agent transcripts step by step, grade them with code checks versus a rubric judge, then drag p and k to watch pass@k and pass^k diverge: one lucky pass is not reliability.",
    url: "https://www.neuronomixer.com/visual-guides/agent-evaluation",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Evaluating Agents: Grading the Trajectory | NeuroNomixer",
    description:
      "Replay three agent transcripts step by step, grade them with code checks versus a rubric judge, then drag p and k to watch pass@k and pass^k diverge: one lucky pass is not reliability.",
  },
};

export default function AgentEvaluationPage() {
  return <AgentEvaluationClient />;
}
