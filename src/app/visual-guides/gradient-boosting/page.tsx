import type { Metadata } from "next";
import GradientBoostingClient from "@/components/VisualGuides/GradientBoosting/GradientBoostingClient";

const TITLE = "Gradient Boosting | NeuroNomixer";
const DESCRIPTION =
  "Build a real gradient boosting ensemble in your browser: fit one tree at a time to the residuals with exact least-squares splits, tune the learning rate, and compare against a single deep tree on held-out data.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/gradient-boosting",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.neuronomixer.com/visual-guides/gradient-boosting",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function GradientBoostingPage() {
  return <GradientBoostingClient />;
}
