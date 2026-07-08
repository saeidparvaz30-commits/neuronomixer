import type { Metadata } from "next";
import BatchNormalizationClient from "@/components/VisualGuides/BatchNormalization/BatchNormalizationClient";

export const metadata: Metadata = {
  title: "Batch Normalization Explained",
  description:
    "See how batch normalization stabilizes activation distributions and speeds up training. Watch two neural networks race, with and without BatchNorm.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/batch-normalization",
  },
  openGraph: {
    title: "Batch Normalization Explained — NeuroNomixer",
    description:
      "See how batch normalization stabilizes activation distributions and speeds up training. Watch two neural networks race, with and without BatchNorm.",
    url: "https://www.neuronomixer.com/visual-guides/batch-normalization",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Batch Normalization Explained",
    description:
      "See how batch normalization stabilizes activation distributions and speeds up training. Watch two neural networks race, with and without BatchNorm.",
  },
};

export default function BatchNormalizationPage() {
  return <BatchNormalizationClient />;
}
