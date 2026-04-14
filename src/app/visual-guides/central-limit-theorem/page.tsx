import type { Metadata } from "next";
import CentralLimitTheoremClient from "@/components/VisualGuides/CentralLimitTheorem/CentralLimitTheoremClient";

export const metadata: Metadata = {
  title: "The Central Limit Theorem in Action",
  description:
    "See how sampling distributions converge to a bell curve regardless of the original population shape. Interactive simulation with adjustable parameters.",
  alternates: {
    canonical:
      "https://www.neuronomixer.com/visual-guides/central-limit-theorem",
  },
  openGraph: {
    title:
      "The Central Limit Theorem in Action — NeuroNomixer Visual Guides",
    description:
      "Watch the sampling distribution become normal as sample size grows, no matter the population shape.",
    url: "https://www.neuronomixer.com/visual-guides/central-limit-theorem",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Central Limit Theorem in Action",
    description:
      "Interactive simulation showing convergence to normality.",
  },
};

export default function CentralLimitTheoremPage() {
  return <CentralLimitTheoremClient />;
}
