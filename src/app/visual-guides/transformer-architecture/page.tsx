import type { Metadata } from "next";
import TransformerArchitectureClient from "@/components/VisualGuides/TransformerArchitecture/TransformerArchitectureClient";

export const metadata: Metadata = {
  title: "The Transformer Architecture",
  description:
    "Click through every block of a transformer with animated explainers. Understand embeddings, attention, residual connections, and how it all fits together.",
  alternates: {
    canonical:
      "https://www.neuronomixer.com/visual-guides/transformer-architecture",
  },
  openGraph: {
    title: "The Transformer Architecture — NeuroNomixer",
    description:
      "Click through every block of a transformer with animated explainers. Understand embeddings, attention, residual connections, and how it all fits together.",
    url: "https://www.neuronomixer.com/visual-guides/transformer-architecture",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Transformer Architecture",
    description:
      "Click through every block of a transformer with animated explainers. Understand embeddings, attention, residual connections, and how it all fits together.",
  },
};

export default function TransformerArchitecturePage() {
  return <TransformerArchitectureClient />;
}
