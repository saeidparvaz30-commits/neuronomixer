import type { Metadata } from "next";
import ResidualConnectionsClient from "@/components/VisualGuides/ResidualConnections/ResidualConnectionsClient";

export const metadata: Metadata = {
  title: "Residual Connections",
  description:
    "Why skip connections make very deep networks trainable: measure real per-layer gradient norms at any depth, toggle the skips, then train two identically initialized networks in your browser and watch the gap open up.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/residual-connections",
  },
  openGraph: {
    title: "Residual Connections | NeuroNomixer",
    description:
      "Why skip connections make very deep networks trainable: measure real per-layer gradient norms at any depth, toggle the skips, then train two identically initialized networks in your browser and watch the gap open up.",
    url: "https://www.neuronomixer.com/visual-guides/residual-connections",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Residual Connections | NeuroNomixer",
    description:
      "Why skip connections make very deep networks trainable: measure real per-layer gradient norms at any depth, toggle the skips, then train two identically initialized networks in your browser and watch the gap open up.",
  },
};

export default function ResidualConnectionsPage() {
  return <ResidualConnectionsClient />;
}
