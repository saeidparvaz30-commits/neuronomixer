import type { Metadata } from "next";
import TokenizationClient from "@/components/VisualGuides/Tokenization/TokenizationClient";

export const metadata: Metadata = {
  title: "Tokenization: How AI Reads Text",
  description:
    "Type any text and watch it split into colored token blocks. Understand BPE tokenization, why rare words split into many tokens, and how token costs work.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/tokenization" },
  openGraph: {
    title: "Tokenization: How AI Reads Text — NeuroNomixer",
    description:
      "Type any text and watch it split into colored token blocks. Understand BPE tokenization, why rare words split into many tokens, and how token costs work.",
    url: "https://www.neuronomixer.com/visual-guides/tokenization",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tokenization: How AI Reads Text",
    description:
      "Type any text and watch it split into colored token blocks. Understand BPE tokenization, why rare words split into many tokens, and how token costs work.",
  },
};

export default function TokenizationPage() {
  return <TokenizationClient />;
}
