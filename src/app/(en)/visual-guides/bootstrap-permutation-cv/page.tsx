import type { Metadata } from "next";
import BootstrapPermutationCVClient from "@/components/VisualGuides/BootstrapPermutationCV/BootstrapPermutationCVClient";

export const metadata: Metadata = {
  title: "Bootstrap, Permutation Tests & Cross-Validation",
  description:
    "Master modern resampling methods: bootstrap confidence intervals, permutation tests, and K-fold cross-validation with validation curves.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/bootstrap-permutation-cv",
  },
  openGraph: {
    title: "Bootstrap, Permutation Tests & Cross-Validation | NeuroNomixer",
    description:
      "Master modern resampling methods: bootstrap confidence intervals, permutation tests, and K-fold cross-validation with validation curves.",
    url: "https://www.neuronomixer.com/visual-guides/bootstrap-permutation-cv",
    siteName: "NeuroNomixer",
    type: "website",
  },
};

export default function BootstrapPermutationCVPage() {
  return <BootstrapPermutationCVClient />;
}
