import type { Metadata } from "next";
import DataLeakageClient from "@/components/VisualGuides/DataLeakage/DataLeakageClient";

export const metadata: Metadata = {
  title: "Data Leakage",
  description:
    "See data leakage happen live: preprocessing leakage, target leakage, and temporal leakage, each with real model fits you can toggle between leaky and honest.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/data-leakage",
  },
  openGraph: {
    title: "Data Leakage | NeuroNomixer",
    description:
      "See data leakage happen live: preprocessing leakage, target leakage, and temporal leakage, each with real model fits you can toggle between leaky and honest.",
    url: "https://www.neuronomixer.com/visual-guides/data-leakage",
    siteName: "NeuroNomixer",
    type: "website",
  },
};

export default function DataLeakagePage() {
  return <DataLeakageClient />;
}
