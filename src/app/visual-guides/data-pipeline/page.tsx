import type { Metadata } from "next";
import DataPipelineClient from "@/components/VisualGuides/DataPipeline/DataPipelineClient";

export const metadata: Metadata = {
  title: "Data Pipeline Visualized: Ingest, Clean, Transform & Load",
  description:
    "Follow 12 messy employee records through a 6-stage data pipeline: ingest, validate, clean, transform, aggregate, and load. See how nulls, duplicates, and outliers are handled at each stage.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/data-pipeline" },
  openGraph: {
    title: "Data Pipeline — NeuroNomixer Visual Guides",
    description:
      "Interactive 6-stage ETL pipeline. Watch raw data transform into clean, aggregated results ready for analysis.",
    url: "https://www.neuronomixer.com/visual-guides/data-pipeline",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Data Pipeline — NeuroNomixer Visual Guides",
    description: "Ingest → Validate → Clean → Transform → Aggregate → Load, visualized.",
  },
};

export default function DataPipelinePage() {
  return <DataPipelineClient />;
}
