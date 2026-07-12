import type { Metadata } from "next";
import AutoencodersClient from "@/components/VisualGuides/Autoencoders/AutoencodersClient";

export const metadata: Metadata = {
  title: "Autoencoders",
  description:
    "Force data through a bottleneck and the network must learn what matters. Draw 8x8 images, train a real autoencoder live in your browser, and watch reconstructions sharpen as the bottleneck widens from 1 to 16 latent numbers.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/autoencoders" },
  openGraph: {
    title: "Autoencoders | NeuroNomixer",
    description:
      "Interactive autoencoder lab: real in-browser training, a bottleneck-width slider, side-by-side input vs reconstruction, and a live per-pixel error heatmap.",
    url: "https://www.neuronomixer.com/visual-guides/autoencoders",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Autoencoders | NeuroNomixer",
    description:
      "Train a real autoencoder in your browser and watch reconstructions sharpen as the bottleneck grows from 1 to 16 latent numbers.",
  },
};

export default function AutoencodersPage() {
  return <AutoencodersClient />;
}
