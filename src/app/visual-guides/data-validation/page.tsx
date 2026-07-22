import type { Metadata } from "next";
import DataValidationClient from "@/components/VisualGuides/DataValidation/DataValidationClient";

export const metadata: Metadata = {
  title: "Guardrails for Data: Validation Rules",
  description:
    "Turn a data contract into executable rules (type, range, not-null, unique, relationship), run corrupted batches through a three-stage pipeline, and watch what one switched-off rule costs the dashboard.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/data-validation",
  },
  openGraph: {
    title: "Guardrails for Data: Validation Rules | NeuroNomixer",
    description:
      "Write schema rules, gate a live pipeline against corrupted batches, then toggle one rule off and watch bad rows poison the final chart.",
    url: "https://www.neuronomixer.com/visual-guides/data-validation",
    siteName: "NeuroNomixer",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Guardrails for Data: Validation Rules | NeuroNomixer",
    description:
      "Write schema rules, gate a live pipeline against corrupted batches, then toggle one rule off and watch bad rows poison the final chart.",
  },
};

export default function DataValidationPage() {
  return <DataValidationClient />;
}
