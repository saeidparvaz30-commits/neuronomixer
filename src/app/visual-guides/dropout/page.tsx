import type { Metadata } from "next";
import DropoutClient from "@/components/VisualGuides/Dropout/DropoutClient";

export const metadata: Metadata = {
  title: "Dropout: Training with Missing Neurons",
  description:
    "Slide dropout probability and watch neurons randomly deactivate. Understand how dropout prevents overfitting by training an ensemble of networks.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/dropout" },
  openGraph: {
    title: "Dropout: Training with Missing Neurons — NeuroNomixer",
    description:
      "Slide dropout probability and watch neurons randomly deactivate. Understand how dropout prevents overfitting by training an ensemble of networks.",
    url: "https://www.neuronomixer.com/visual-guides/dropout",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dropout: Training with Missing Neurons",
    description:
      "Slide dropout probability and watch neurons randomly deactivate. Understand how dropout prevents overfitting by training an ensemble of networks.",
  },
};

export default function DropoutPage() {
  return <DropoutClient />;
}
