import type { Metadata } from "next";
import FeatureEngineeringCraftClient from "@/components/VisualGuides/FeatureEngineeringCraft/FeatureEngineeringCraftClient";

export const metadata: Metadata = {
  title: "Making Features Speak",
  description:
    "Transforms, bins, interactions, and datetime extraction: reshape raw columns with a live least-squares fit rerunning on every move, and let the error tell you which features actually help.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/feature-engineering-craft",
  },
  openGraph: {
    title: "Making Features Speak | NeuroNomixer",
    description:
      "Log a skewed column, multiply two innocent ones, unpack a timestamp: an interactive guide to feature engineering as craft, judged by a live in-browser fit.",
    url: "https://www.neuronomixer.com/visual-guides/feature-engineering-craft",
    siteName: "NeuroNomixer",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Making Features Speak | NeuroNomixer",
    description:
      "Log a skewed column, multiply two innocent ones, unpack a timestamp: an interactive guide to feature engineering as craft, judged by a live in-browser fit.",
  },
};

export default function FeatureEngineeringCraftPage() {
  return <FeatureEngineeringCraftClient />;
}
