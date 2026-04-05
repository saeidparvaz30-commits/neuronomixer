import type { Metadata } from "next";
import DataDistributionsClient from "@/components/VisualGuides/DataDistributions/DataDistributionsClient";

export const metadata: Metadata = {
  title: "Data Distributions Visualized: Normal, Skewed & Bimodal",
  description:
    "Explore normal, uniform, skewed, and bimodal distributions interactively. See how mean, median, and standard deviation shift with shape. Understand which statistical tests apply to each distribution type.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/data-distributions" },
  openGraph: {
    title: "Data Distributions — NeuroNomixer Visual Guides",
    description:
      "Interactive histogram with live mean/median/std overlays. Explore 5 distribution shapes and understand when they appear in real data.",
    url: "https://www.neuronomixer.com/visual-guides/data-distributions",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Data Distributions — NeuroNomixer Visual Guides",
    description: "Normal, uniform, skewed, bimodal — visualized with live statistics.",
  },
};

export default function DataDistributionsPage() {
  return <DataDistributionsClient />;
}
