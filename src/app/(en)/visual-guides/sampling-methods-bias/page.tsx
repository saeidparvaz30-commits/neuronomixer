import type { Metadata } from "next";
import SamplingMethodsBiasClient from "@/components/VisualGuides/SamplingMethodsBias/SamplingMethodsBiasClient";

export const metadata: Metadata = {
  title: "Sampling Methods & Bias",
  description:
    "Simulate random, stratified, cluster, and systematic sampling. See how well each method estimates population parameters. Learn from historical sampling disasters.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/sampling-methods-bias",
  },
  openGraph: {
    title: "Sampling Methods & Bias | NeuroNomixer Visual Guides",
    description:
      "Interactive sampling simulator with historical bias case studies.",
    url: "https://www.neuronomixer.com/visual-guides/sampling-methods-bias",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sampling Methods & Bias",
    description: "Compare sampling strategies and see why bias matters.",
  },
};

export default function SamplingMethodsBiasPage() {
  return <SamplingMethodsBiasClient />;
}
