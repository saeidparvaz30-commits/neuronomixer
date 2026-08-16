import type { Metadata } from "next";
import VanishingExplodingGradientsClient from "@/components/VisualGuides/VanishingExplodingGradients/VanishingExplodingGradientsClient";

export const metadata: Metadata = {
  title: "Vanishing & Exploding Gradients",
  description:
    "Build a real deep network, run a real backward pass, and watch per-layer gradients vanish or explode as you change depth, activation, and weight scale. Then fix it with ReLU, better initialization, batch norm, residual connections, or gradient clipping.",
  alternates: {
    canonical:
      "https://www.neuronomixer.com/visual-guides/vanishing-exploding-gradients",
  },
  openGraph: {
    title: "Vanishing & Exploding Gradients | NeuroNomixer Visual Guides",
    description:
      "Interactive gradient lab: a real forward and backward pass on a tiny MLP shows why deep gradients vanish or explode, and how ReLU, initialization, batch norm, and residual connections fix it.",
    url: "https://www.neuronomixer.com/visual-guides/vanishing-exploding-gradients",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vanishing & Exploding Gradients | NeuroNomixer Visual Guides",
    description:
      "Watch per-layer gradient magnitudes vanish or explode in a real backward pass, then repair the network live.",
  },
};

export default function VanishingExplodingGradientsPage() {
  return <VanishingExplodingGradientsClient />;
}
