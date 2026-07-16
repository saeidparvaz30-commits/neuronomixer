import type { Metadata } from "next";
import VisualGuidesClient from "@/components/VisualGuides/VisualGuidesClient";

export const metadata: Metadata = {
  title: "Visual Guides",
  description:
    "Interactive visual explorations of data science, machine learning, and AI concepts. No jargon, just clarity.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides" },
  openGraph: {
    title: "Visual Guides | NeuroNomixer",
    description:
      "Interactive visual explorations of data science, machine learning, and AI concepts.",
    url: "https://www.neuronomixer.com/visual-guides",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Visual Guides | NeuroNomixer",
    description:
      "Interactive visual explorations of data science, machine learning, and AI concepts.",
  },
};

export default function VisualGuidesPage() {
  return <VisualGuidesClient />;
}
