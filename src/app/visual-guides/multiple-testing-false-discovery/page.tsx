import type { Metadata } from "next";
import MultipleTestingFalseDiscoveryClient from "@/components/VisualGuides/MultipleTestingFalseDiscovery/MultipleTestingFalseDiscoveryClient";

export const metadata: Metadata = {
  title: "Multiple Testing & False Discovery",
  description:
    "Run 20 jelly bean tests on pure noise. Watch false positives appear at α=0.05. Apply Bonferroni, FDR, and Holm corrections to control them.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/multiple-testing-false-discovery" },
  openGraph: {
    title: "Multiple Testing & False Discovery — NeuroNomixer",
    description:
      "Interactive simulator for multiple testing. See how false positives accumulate and how corrections like Bonferroni and Benjamini-Hochberg fix them.",
    url: "https://www.neuronomixer.com/visual-guides/multiple-testing-false-discovery",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Multiple Testing & False Discovery",
    description: "Run 20 jelly bean tests on pure noise. Apply corrections to control false positives.",
  },
};

export default function MultipleTestingFalseDiscoveryPage() {
  return <MultipleTestingFalseDiscoveryClient />;
}
