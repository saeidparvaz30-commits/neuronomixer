import type { Metadata } from "next";
import WeightInitializationClient from "@/components/VisualGuides/WeightInitialization/WeightInitializationClient";

const TITLE = "Weight Initialization | NeuroNomixer";
const DESCRIPTION =
  "Initialize a real 6-layer network with zeros, tiny, large, Xavier, or He weights: watch per-layer activation and gradient histograms collapse or explode, then race all five schemes in a live in-browser training run.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/weight-initialization",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.neuronomixer.com/visual-guides/weight-initialization",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function WeightInitializationPage() {
  return <WeightInitializationClient />;
}
