import type { Metadata } from "next";
import DataDistributionsAppliedClient from "@/components/VisualGuides/DataDistributionsApplied/DataDistributionsAppliedClient";

const TITLE = "Data Distributions in Context | NeuroNomixer";
const DESCRIPTION =
  "Read five realistic data columns like a practitioner: diagnose skew, hidden subgroups, heavy tails, sentinel spikes, and zero inflation before they break your analysis.";
const URL = "https://www.neuronomixer.com/visual-guides/data-distributions-applied";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: URL,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: URL,
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Data Distributions in Context — NeuroNomixer",
    description: DESCRIPTION,
  },
};

export default function DataDistributionsAppliedPage() {
  return <DataDistributionsAppliedClient />;
}
