import type { Metadata } from "next";
import LLMJudgeClient from "@/components/VisualGuides/LLMJudge/LLMJudgeClient";

export const metadata: Metadata = {
  title: "LLM-as-Judge: When Models Grade Models",
  description:
    "Grade answers yourself, then run a rubric judge over the same corpus, measure agreement and Cohen's kappa against a human panel, and dial position, verbosity, and self-preference bias until the kappa collapses.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/llm-as-judge",
  },
  openGraph: {
    title: "LLM-as-Judge: When Models Grade Models | NeuroNomixer",
    description:
      "Grade answers yourself, then run a rubric judge over the same corpus, measure agreement and Cohen's kappa against a human panel, and dial position, verbosity, and self-preference bias until the kappa collapses.",
    url: "https://www.neuronomixer.com/visual-guides/llm-as-judge",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LLM-as-Judge: When Models Grade Models | NeuroNomixer",
    description:
      "Grade answers yourself, then run a rubric judge over the same corpus, measure agreement and Cohen's kappa against a human panel, and dial position, verbosity, and self-preference bias until the kappa collapses.",
  },
};

export default function LLMAsJudgePage() {
  return <LLMJudgeClient />;
}
