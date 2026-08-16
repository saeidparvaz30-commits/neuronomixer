import type { Metadata } from "next";
import RAGExplainedClient from "@/components/VisualGuides/RAGExplained/RAGExplainedClient";

export const metadata: Metadata = {
  title: "RAG: Retrieval Augmented Generation",
  description:
    "Step through the RAG pipeline: ingestion, retrieval, augmentation, and generation. See how RAG reduces hallucination by grounding LLMs in real documents.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/rag-explained",
  },
  openGraph: {
    title: "RAG: Retrieval Augmented Generation | NeuroNomixer",
    description:
      "Step through the RAG pipeline: ingestion, retrieval, augmentation, and generation. See how RAG reduces hallucination by grounding LLMs in real documents.",
    url: "https://www.neuronomixer.com/visual-guides/rag-explained",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "RAG: Retrieval Augmented Generation",
    description:
      "Step through the RAG pipeline: ingestion, retrieval, augmentation, and generation. See how RAG reduces hallucination by grounding LLMs in real documents.",
  },
};

export default function RAGExplainedPage() {
  return <RAGExplainedClient />;
}
