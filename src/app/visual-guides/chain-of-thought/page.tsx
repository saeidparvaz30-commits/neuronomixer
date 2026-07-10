import type { Metadata } from "next";
import ChainOfThoughtClient from "@/components/VisualGuides/ChainOfThought/ChainOfThoughtClient";

export const metadata: Metadata = {
  title: "Why Thinking Out Loud Works | NeuroNomixer",
  description:
    "Compute why chain-of-thought reasoning works: steer a live compounding error model, then train two tiny networks in your browser and watch scratchpad reasoning beat one-shot answers on multi-digit addition.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/chain-of-thought",
  },
  openGraph: {
    title: "Why Thinking Out Loud Works | NeuroNomixer",
    description:
      "Compute why chain-of-thought reasoning works: steer a live compounding error model, then train two tiny networks in your browser and watch scratchpad reasoning beat one-shot answers on multi-digit addition.",
    url: "https://www.neuronomixer.com/visual-guides/chain-of-thought",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Why Thinking Out Loud Works | NeuroNomixer",
    description:
      "Compute why chain-of-thought reasoning works: steer a live compounding error model, then train two tiny networks in your browser and watch scratchpad reasoning beat one-shot answers on multi-digit addition.",
  },
};

export default function ChainOfThoughtPage() {
  return <ChainOfThoughtClient />;
}
