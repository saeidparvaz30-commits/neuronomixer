import type { Metadata } from "next";
import MixtureOfExpertsClient from "@/components/VisualGuides/MixtureOfExperts/MixtureOfExpertsClient";

const TITLE = "Mixture of Experts | NeuroNomixer";
const DESCRIPTION =
  "Train a real 8-expert, top-2 MoE layer in your browser: watch the softmax router light up experts, knock experts out to see outputs degrade, and count total vs active parameters and FLOPs.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/mixture-of-experts",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.neuronomixer.com/visual-guides/mixture-of-experts",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function MixtureOfExpertsPage() {
  return <MixtureOfExpertsClient />;
}
