import type { Metadata } from "next";
import SelfAttentionClient from "@/components/VisualGuides/SelfAttention/SelfAttentionClient";

export const metadata: Metadata = {
  title: "Self-Attention: How Transformers Focus",
  description:
    "Type a sentence and watch attention heatmaps light up. Step through Q, K, V computation and see how transformers resolve word ambiguity.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/self-attention" },
  openGraph: {
    title: "Self-Attention: How Transformers Focus — NeuroNomixer",
    description:
      "Interactive attention heatmap: select a sentence, explore Q/K/V vectors, and see how multi-head attention resolves word ambiguity.",
    url: "https://www.neuronomixer.com/visual-guides/self-attention",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Self-Attention: How Transformers Focus",
    description:
      "Watch attention heatmaps light up. Step through Q, K, V computation and see how transformers resolve word ambiguity.",
  },
};

export default function SelfAttentionPage() {
  return <SelfAttentionClient />;
}
