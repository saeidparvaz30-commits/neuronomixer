import type { Metadata } from "next";
import FineTuningVsPromptingClient from "@/components/VisualGuides/FineTuningVsPrompting/FineTuningVsPromptingClient";

export const metadata: Metadata = {
  title: "Fine-Tuning vs Prompting",
  description:
    "Try both approaches on the same task and compare outputs. Use the interactive decision tree to choose the right strategy for your use case.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/fine-tuning-vs-prompting",
  },
  openGraph: {
    title: "Fine-Tuning vs Prompting | NeuroNomixer",
    description:
      "Try both approaches on the same task and compare outputs. Use the interactive decision tree to choose the right strategy for your use case.",
    url: "https://www.neuronomixer.com/visual-guides/fine-tuning-vs-prompting",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fine-Tuning vs Prompting",
    description:
      "Try both approaches on the same task and compare outputs. Use the interactive decision tree to choose the right strategy for your use case.",
  },
};

export default function FineTuningVsPromptingPage() {
  return <FineTuningVsPromptingClient />;
}
