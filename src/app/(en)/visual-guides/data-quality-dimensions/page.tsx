import type { Metadata } from "next";
import DataQualityDimensionsClient from "@/components/VisualGuides/DataQualityDimensions/DataQualityDimensionsClient";

export const metadata: Metadata = {
  title: "The Six Faces of Bad Data",
  description:
    "Six live data-quality meters diagnose a customer table: inject and repair missing fields, duplicates, format violations, contradictions, stale rows, and wrong values, then build the validation rules that catch them.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/data-quality-dimensions",
  },
  openGraph: {
    title: "The Six Faces of Bad Data | NeuroNomixer",
    description:
      "Break a customer table six different ways and watch live meters for completeness, uniqueness, validity, consistency, timeliness, and accuracy pinpoint each defect.",
    url: "https://www.neuronomixer.com/visual-guides/data-quality-dimensions",
    siteName: "NeuroNomixer",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Six Faces of Bad Data | NeuroNomixer",
    description:
      "Break a customer table six different ways and watch live meters for completeness, uniqueness, validity, consistency, timeliness, and accuracy pinpoint each defect.",
  },
};

export default function DataQualityDimensionsPage() {
  return <DataQualityDimensionsClient />;
}
