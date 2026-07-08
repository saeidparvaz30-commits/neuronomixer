import type { Metadata } from "next";
import PValuesClient from "@/components/VisualGuides/PValues/PValuesClient";

export const metadata: Metadata = {
  title: "P-Values Demystified",
  description:
    "Build intuition for p-values through interactive hypothesis testing simulation. Permutation tests show when results are due to chance.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/p-values" },
  openGraph: {
    title: "P-Values Demystified — NeuroNomixer Visual Guides",
    description: "Interactive simulation showing what p-values really mean through permutation testing.",
    url: "https://www.neuronomixer.com/visual-guides/p-values",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "P-Values Demystified — NeuroNomixer Visual Guides",
    description: "Permutation tests and p-values: understand significance through simulation.",
  },
};

export default function PValuesPage() {
  return <PValuesClient />;
}
