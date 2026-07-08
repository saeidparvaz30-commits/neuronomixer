import type { Metadata } from "next";
import ChunkingStrategiesClient from "@/components/VisualGuides/ChunkingStrategies/ChunkingStrategiesClient";

export const metadata: Metadata = {
  title: "Chunking Strategies for RAG",
  description:
    "See fixed-size, recursive, and document-structure chunking applied side by side on real text. Understand how chunk size and overlap affect retrieval quality.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/chunking-strategies",
  },
  openGraph: {
    title: "Chunking Strategies for RAG — NeuroNomixer",
    description:
      "See fixed-size, recursive, and document-structure chunking applied side by side on real text. Understand how chunk size and overlap affect retrieval quality.",
    url: "https://www.neuronomixer.com/visual-guides/chunking-strategies",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chunking Strategies for RAG",
    description:
      "See fixed-size, recursive, and document-structure chunking applied side by side on real text. Understand how chunk size and overlap affect retrieval quality.",
  },
};

export default function ChunkingStrategiesPage() {
  return <ChunkingStrategiesClient />;
}
