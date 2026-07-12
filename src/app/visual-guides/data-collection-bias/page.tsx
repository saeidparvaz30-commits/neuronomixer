import type { Metadata } from "next";
import DataCollectionBiasClient from "@/components/VisualGuides/DataCollectionBias/DataCollectionBiasClient";

export const metadata: Metadata = {
  title: "The Data That Never Arrived",
  description:
    "Bias enters at collection time: pick survey channels and watch estimates drift from a known truth, re-live Wald's WWII bomber armor call, and build the habit of asking who could never appear in the data.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/data-collection-bias",
  },
  openGraph: {
    title: "The Data That Never Arrived — NeuroNomixer",
    description:
      "Selection at the channel, survivorship, and non-response: an interactive guide to the bias that no downstream analysis can fix.",
    url: "https://www.neuronomixer.com/visual-guides/data-collection-bias",
    siteName: "NeuroNomixer",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Data That Never Arrived — NeuroNomixer",
    description:
      "Selection at the channel, survivorship, and non-response: an interactive guide to the bias that no downstream analysis can fix.",
  },
};

export default function DataCollectionBiasPage() {
  return <DataCollectionBiasClient />;
}
