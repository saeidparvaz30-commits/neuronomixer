import type { Metadata } from "next";
import PromptEngineeringClient from "@/components/VisualGuides/PromptEngineering/PromptEngineeringClient";

export const metadata: Metadata = {
  title: "Prompt Engineering Patterns",
  description:
    "Browse a gallery of 6 prompt engineering patterns with live demos and editable prompts. Learn zero-shot, few-shot, chain-of-thought, and more.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/prompt-engineering" },
  openGraph: {
    title: "Prompt Engineering Patterns — NeuroNomixer",
    description:
      "Browse a gallery of 6 prompt engineering patterns with live demos and editable prompts. Learn zero-shot, few-shot, chain-of-thought, and more.",
    url: "https://www.neuronomixer.com/visual-guides/prompt-engineering",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prompt Engineering Patterns",
    description:
      "Browse a gallery of 6 prompt engineering patterns with live demos and editable prompts. Learn zero-shot, few-shot, chain-of-thought, and more.",
  },
};

export default function PromptEngineeringPage() {
  return <PromptEngineeringClient />;
}
