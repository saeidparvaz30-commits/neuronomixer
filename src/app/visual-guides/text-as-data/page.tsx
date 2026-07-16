import type { Metadata } from "next";
import TextAsDataClient from "@/components/VisualGuides/TextAsData/TextAsDataClient";

export const metadata: Metadata = {
  title: "From Words to Counts",
  description:
    "Text becomes data through tokenization, normalization, and counting: type in a live sandbox, flip lowercasing, stop-word, and stemming switches, and measure two documents with a Jaccard overlap you compute yourself.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/text-as-data",
  },
  openGraph: {
    title: "From Words to Counts | NeuroNomixer",
    description:
      "Tokenize live text, watch word counts reshuffle as you flip normalization switches, and compare two documents by shared vocabulary.",
    url: "https://www.neuronomixer.com/visual-guides/text-as-data",
    siteName: "NeuroNomixer",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "From Words to Counts | NeuroNomixer",
    description:
      "Tokenize live text, watch word counts reshuffle as you flip normalization switches, and compare two documents by shared vocabulary.",
  },
};

export default function TextAsDataPage() {
  return <TextAsDataClient />;
}
