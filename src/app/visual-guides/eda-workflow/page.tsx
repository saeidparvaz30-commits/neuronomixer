import type { Metadata } from "next";
import EDAWorkflowClient from "@/components/VisualGuides/EDAWorkflow/EDAWorkflowClient";

export const metadata: Metadata = {
  title: "Interrogating a Dataset | NeuroNomixer",
  description:
    "Work the EDA loop on a 120-row mystery dataset: check shape and types, unmask -999 sentinels, read distributions on a log scale, catch a duplicated batch, and log every finding.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/eda-workflow",
  },
  openGraph: {
    title: "Interrogating a Dataset — NeuroNomixer",
    description:
      "A hands-on EDA workflow: five interrogation panels, four planted data issues, one findings board. Every number computed live.",
    url: "https://www.neuronomixer.com/visual-guides/eda-workflow",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Interrogating a Dataset — NeuroNomixer",
    description:
      "A hands-on EDA workflow: five interrogation panels, four planted data issues, one findings board. Every number computed live.",
  },
};

export default function EDAWorkflowPage() {
  return <EDAWorkflowClient />;
}
