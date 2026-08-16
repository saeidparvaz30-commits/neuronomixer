import type { Metadata } from "next";
import TemperatureTopKClient from "@/components/VisualGuides/TemperatureTopK/TemperatureTopKClient";

export const metadata: Metadata = {
  title: "Temperature & Top-K: Controlling Creativity",
  description:
    "Adjust temperature and top-K parameters and watch token probability distributions reshape in real time. Understand how LLMs balance creativity vs. coherence.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/temperature-topk" },
  openGraph: {
    title: "Temperature & Top-K: Controlling Creativity | NeuroNomixer",
    description:
      "Adjust temperature and top-K parameters and watch token probability distributions reshape in real time. Understand how LLMs balance creativity vs. coherence.",
    url: "https://www.neuronomixer.com/visual-guides/temperature-topk",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Temperature & Top-K: Controlling Creativity",
    description:
      "Adjust temperature and top-K parameters and watch token probability distributions reshape in real time.",
  },
};

export default function TemperatureTopKPage() {
  return <TemperatureTopKClient />;
}
