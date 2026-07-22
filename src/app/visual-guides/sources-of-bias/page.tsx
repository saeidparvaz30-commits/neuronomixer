import type { Metadata } from "next";
import SourcesOfBiasClient from "@/components/VisualGuides/SourcesOfBias/SourcesOfBiasClient";

export const metadata: Metadata = {
  title: "Sources of Bias: Selection, Survivorship & Beyond",
  description:
    "Explore five case studies hiding different biases: selection bias, survivorship bias, nonresponse bias, measurement bias, and confirmation bias. Uncover the hidden data and learn how to avoid these traps.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/sources-of-bias" },
  openGraph: {
    title: "Sources of Bias | NeuroNomixer Visual Guides",
    description: "Interactive case studies revealing selection, survivorship, and measurement bias in real data.",
    url: "https://www.neuronomixer.com/visual-guides/sources-of-bias",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sources of Bias | NeuroNomixer Visual Guides",
    description: "Learn to spot bias in data collection, analysis, and conclusions.",
  },
};

export default function SourcesOfBiasPage() {
  return <SourcesOfBiasClient />;
}
