import type { Metadata } from "next";
import ToolUseFunctionCallingClient from "@/components/VisualGuides/ToolUseFunctionCalling/ToolUseFunctionCallingClient";

export const metadata: Metadata = {
  title: "Tool Use & Function Calling",
  description:
    "Step through simulated function-calling traces to see how LLMs request tools, how your runtime executes them, and how grounded answers come back.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/tool-use-function-calling",
  },
  openGraph: {
    title: "Tool Use & Function Calling | NeuroNomixer",
    description:
      "Step through simulated function-calling traces to see how LLMs request tools, how your runtime executes them, and how grounded answers come back.",
    url: "https://www.neuronomixer.com/visual-guides/tool-use-function-calling",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tool Use & Function Calling",
    description:
      "Step through simulated function-calling traces to see how LLMs request tools, how your runtime executes them, and how grounded answers come back.",
  },
};

export default function ToolUseFunctionCallingPage() {
  return <ToolUseFunctionCallingClient />;
}
