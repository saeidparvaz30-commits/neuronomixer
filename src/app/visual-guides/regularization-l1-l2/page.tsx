import type { Metadata } from "next";
import RegularizationL1L2Client from "@/components/VisualGuides/RegularizationL1L2/RegularizationL1L2Client";

export const metadata: Metadata = {
  title: "Regularization: L1 & L2 | NeuroNomixer",
  description:
    "See regularization work for real: tune lambda on a degree-8 polynomial, watch ridge shrink weights and lasso zero them out, and find the U-shaped holdout error curve.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/regularization-l1-l2",
  },
  openGraph: {
    title: "Regularization: L1 & L2 | NeuroNomixer",
    description:
      "See regularization work for real: tune lambda on a degree-8 polynomial, watch ridge shrink weights and lasso zero them out, and find the U-shaped holdout error curve.",
    url: "https://www.neuronomixer.com/visual-guides/regularization-l1-l2",
    siteName: "NeuroNomixer",
    type: "website",
  },
};

export default function RegularizationL1L2Page() {
  return <RegularizationL1L2Client />;
}
