import type { Metadata } from "next";
import AttentionMechanismClient from "@/components/VisualGuides/AttentionMechanism/AttentionMechanismClient";

const TITLE = "Attention as Soft Lookup | NeuroNomixer";
const DESCRIPTION =
  "Attention is a differentiable dictionary: drag a query and keys to see dot-product scores become softmax weights that blend stored values, then train a real attention layer in your browser and watch its heatmap sharpen onto the matching slot.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/attention-mechanism",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.neuronomixer.com/visual-guides/attention-mechanism",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function AttentionMechanismPage() {
  return <AttentionMechanismClient />;
}
