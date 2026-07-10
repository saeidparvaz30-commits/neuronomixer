import type { Metadata } from "next";
import StructuredOutputReliabilityClient from "@/components/VisualGuides/StructuredOutputReliability/StructuredOutputReliabilityClient";

export const metadata: Metadata = {
  title: "Structured Output Reliability | NeuroNomixer",
  description:
    "Sample a simulated token stream against a real JSON grammar, watch per-token errors compound into unparseable output, then mask illegal tokens and price the retries with the geometric distribution.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/structured-output-reliability",
  },
  openGraph: {
    title: "Structured Output Reliability | NeuroNomixer",
    description:
      "Sample a simulated token stream against a real JSON grammar, watch per-token errors compound into unparseable output, then mask illegal tokens and price the retries with the geometric distribution.",
    url: "https://www.neuronomixer.com/visual-guides/structured-output-reliability",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Structured Output Reliability | NeuroNomixer",
    description:
      "Sample a simulated token stream against a real JSON grammar, watch per-token errors compound into unparseable output, then mask illegal tokens and price the retries with the geometric distribution.",
  },
};

export default function StructuredOutputReliabilityPage() {
  return <StructuredOutputReliabilityClient />;
}
