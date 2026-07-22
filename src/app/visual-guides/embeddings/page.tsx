import type { Metadata } from "next";
import EmbeddingsClient from "@/components/VisualGuides/Embeddings/EmbeddingsClient";

export const metadata: Metadata = {
  title: "Embeddings: Words as Numbers in Space",
  description:
    "Explore a hand-built word embedding space with live-computed similarities. Try word arithmetic like king - man + woman ≈ queen and see how similar words cluster together.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/embeddings" },
  openGraph: {
    title: "Embeddings: Words as Numbers in Space | NeuroNomixer",
    description:
      "Explore a hand-built word embedding space with live-computed similarities. Try word arithmetic like king - man + woman ≈ queen and see how similar words cluster together.",
    url: "https://www.neuronomixer.com/visual-guides/embeddings",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Embeddings: Words as Numbers in Space",
    description:
      "Explore a hand-built word embedding space with live-computed similarities. Try word arithmetic like king - man + woman ≈ queen and see how similar words cluster together.",
  },
};

export default function EmbeddingsPage() {
  return <EmbeddingsClient />;
}
