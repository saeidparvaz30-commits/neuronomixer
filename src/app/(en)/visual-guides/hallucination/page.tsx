import type { Metadata } from "next";
import HallucinationClient from "@/components/VisualGuides/Hallucination/HallucinationClient";

export const metadata: Metadata = {
  title: "Hallucination: When AI Makes Things Up",
  description:
    "Explore real examples of AI hallucination: confident-sounding but wrong outputs. Understand why LLMs hallucinate and how mitigation strategies work.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/hallucination" },
  openGraph: {
    title: "Hallucination: When AI Makes Things Up | NeuroNomixer",
    description:
      "Explore real examples of AI hallucination: confident-sounding but wrong outputs. Understand why LLMs hallucinate and how mitigation strategies work.",
    url: "https://www.neuronomixer.com/visual-guides/hallucination",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hallucination: When AI Makes Things Up",
    description:
      "Explore real examples of AI hallucination: confident-sounding but wrong outputs. Understand why LLMs hallucinate and how mitigation strategies work.",
  },
};

export default function HallucinationPage() {
  return <HallucinationClient />;
}
