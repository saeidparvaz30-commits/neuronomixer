import type { Metadata } from "next";
import NextTokenPredictionClient from "@/components/VisualGuides/NextTokenPrediction/NextTokenPredictionClient";

export const metadata: Metadata = {
  title: "The Next-Token Machine",
  description:
    "Train a real character-level language model in your browser on a visible corpus, watch the probability distribution over next characters update as you type, and generate text by sampling from it one draw at a time.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/next-token-prediction",
  },
  openGraph: {
    title: "The Next-Token Machine | NeuroNomixer",
    description:
      "Train a real character-level language model in your browser on a visible corpus, watch the probability distribution over next characters update as you type, and generate text by sampling from it one draw at a time.",
    url: "https://www.neuronomixer.com/visual-guides/next-token-prediction",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Next-Token Machine | NeuroNomixer",
    description:
      "Train a real character-level language model in your browser on a visible corpus, watch the probability distribution over next characters update as you type, and generate text by sampling from it one draw at a time.",
  },
};

export default function NextTokenPredictionPage() {
  return <NextTokenPredictionClient />;
}
