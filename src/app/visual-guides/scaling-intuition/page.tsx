import type { Metadata } from "next";
import ScalingIntuitionClient from "@/components/VisualGuides/ScalingIntuition/ScalingIntuitionClient";

export const metadata: Metadata = {
  title: "Model Size vs Data | NeuroNomixer",
  description:
    "Train 16 real neural networks in your browser, four model sizes on four data budgets of the same task, and watch the best model size shift as the data grows.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/scaling-intuition",
  },
  openGraph: {
    title: "Model Size vs Data | NeuroNomixer",
    description:
      "Train 16 real neural networks in your browser, four model sizes on four data budgets of the same task, and watch the best model size shift as the data grows.",
    url: "https://www.neuronomixer.com/visual-guides/scaling-intuition",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Model Size vs Data | NeuroNomixer",
    description:
      "Train 16 real neural networks in your browser, four model sizes on four data budgets of the same task, and watch the best model size shift as the data grows.",
  },
};

export default function ScalingIntuitionPage() {
  return <ScalingIntuitionClient />;
}
