import type { Metadata } from "next";
import PositionalEncodingClient from "@/components/VisualGuides/PositionalEncoding/PositionalEncodingClient";

export const metadata: Metadata = {
  title: "How Models Know Word Order",
  description:
    "Compute the sinusoidal positional-encoding heatmap live from its formula, then rotate real query and key vectors with RoPE and watch the attention score depend only on the gap between positions.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/positional-encoding",
  },
  openGraph: {
    title: "How Models Know Word Order | NeuroNomixer",
    description:
      "Compute the sinusoidal positional-encoding heatmap live from its formula, then rotate real query and key vectors with RoPE and watch the attention score depend only on the gap between positions.",
    url: "https://www.neuronomixer.com/visual-guides/positional-encoding",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "How Models Know Word Order | NeuroNomixer",
    description:
      "Compute the sinusoidal positional-encoding heatmap live from its formula, then rotate real query and key vectors with RoPE and watch the attention score depend only on the gap between positions.",
  },
};

export default function PositionalEncodingPage() {
  return <PositionalEncodingClient />;
}
