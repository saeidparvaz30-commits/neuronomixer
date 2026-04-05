import type { Metadata } from "next";
import AISafetyClient from "@/components/VisualGuides/AISafety/AISafetyClient";

export const metadata: Metadata = {
  title: "AI Safety: Alignment in Practice",
  description:
    "Explore AI alignment scenarios with safety techniques toggled on and off. Understand near-term safety challenges and the technical approaches addressing them.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/ai-safety",
  },
  openGraph: {
    title: "AI Safety: Alignment in Practice — NeuroNomixer",
    description:
      "Explore AI alignment scenarios with safety techniques toggled on and off. Understand near-term safety challenges and the technical approaches addressing them.",
    url: "https://www.neuronomixer.com/visual-guides/ai-safety",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Safety: Alignment in Practice",
    description:
      "Explore AI alignment scenarios with safety techniques toggled on and off. Understand near-term safety challenges and the technical approaches addressing them.",
  },
};

export default function AISafetyPage() {
  return <AISafetyClient />;
}
