import type { Metadata } from "next";
import VectorDatabasesClient from "@/components/VisualGuides/VectorDatabases/VectorDatabasesClient";

export const metadata: Metadata = {
  title: "Vector Databases: Semantic Search",
  description:
    "Watch documents become vectors in 2D space. Run semantic queries and see nearest neighbors retrieved by cosine similarity.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/vector-databases",
  },
  openGraph: {
    title: "Vector Databases: Semantic Search — NeuroNomixer",
    description:
      "Watch documents become vectors in 2D space. Run semantic queries and see nearest neighbors retrieved by cosine similarity.",
    url: "https://www.neuronomixer.com/visual-guides/vector-databases",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vector Databases: Semantic Search",
    description:
      "Watch documents become vectors in 2D space. Run semantic queries and see nearest neighbors retrieved by cosine similarity.",
  },
};

export default function VectorDatabasesPage() {
  return <VectorDatabasesClient />;
}
