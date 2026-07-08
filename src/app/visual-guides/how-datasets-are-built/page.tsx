import type { Metadata } from "next";
import HowDatasetsAreBuiltClient from "@/components/VisualGuides/HowDatasetsAreBuilt/HowDatasetsAreBuiltClient";

export const metadata: Metadata = {
  title: "How Datasets Are Built: From Raw to Ready",
  description:
    "Walk through the complete data pipeline — from raw sources through collection, cleaning, transformation, to analysis-ready datasets. Interactive, step-by-step.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/how-datasets-are-built" },
  openGraph: {
    title: "How Datasets Are Built — NeuroNomixer Visual Guides",
    description:
      "Interactive pipeline walkthrough showing how raw data becomes analysis-ready. Step-by-step with hands-on challenges.",
    url: "https://www.neuronomixer.com/visual-guides/how-datasets-are-built",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "How Datasets Are Built — NeuroNomixer Visual Guides",
    description: "Interactive pipeline walkthrough showing how raw data becomes analysis-ready.",
  },
};

export default function HowDatasetsAreBuiltPage() {
  return <HowDatasetsAreBuiltClient />;
}
