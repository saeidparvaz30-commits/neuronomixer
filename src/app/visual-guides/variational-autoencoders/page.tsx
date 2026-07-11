import type { Metadata } from "next";
import VariationalAutoencodersClient from "@/components/VisualGuides/VariationalAutoencoders/VariationalAutoencodersClient";

const TITLE = "VAEs and Latent Space | NeuroNomixer";
const DESCRIPTION =
  "Train a real variational autoencoder in your browser, click any point of its 2D latent space to decode it, morph one image into another, and measure how beta trades reconstruction fidelity against latent smoothness.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical:
      "https://www.neuronomixer.com/visual-guides/variational-autoencoders",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.neuronomixer.com/visual-guides/variational-autoencoders",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function VariationalAutoencodersPage() {
  return <VariationalAutoencodersClient />;
}
