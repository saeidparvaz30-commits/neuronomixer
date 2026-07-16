import type { Metadata } from "next";
import ModelEvaluationClient from "@/components/VisualGuides/ModelEvaluation/ModelEvaluationClient";

export const metadata: Metadata = {
  title: "Model Evaluation: Beyond Accuracy",
  description:
    "Edit model outputs and watch BLEU, ROUGE, and perplexity update live. Understand why traditional metrics often fail for generative AI.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/model-evaluation",
  },
  openGraph: {
    title: "Model Evaluation: Beyond Accuracy | NeuroNomixer",
    description:
      "Edit model outputs and watch BLEU, ROUGE, and perplexity update live. Understand why traditional metrics often fail for generative AI.",
    url: "https://www.neuronomixer.com/visual-guides/model-evaluation",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Model Evaluation: Beyond Accuracy",
    description:
      "Edit model outputs and watch BLEU, ROUGE, and perplexity update live. Understand why traditional metrics often fail for generative AI.",
  },
};

export default function ModelEvaluationPage() {
  return <ModelEvaluationClient />;
}
