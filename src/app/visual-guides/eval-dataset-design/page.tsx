import type { Metadata } from "next";
import EvalDatasetDesignClient from "@/components/VisualGuides/EvalDatasetDesign/EvalDatasetDesignClient";

export const metadata: Metadata = {
  title: "Designing Eval Datasets",
  description:
    "Build an eval set from simulated production failures, watch the exact 95% confidence interval narrow as tasks accumulate, catch a skewed sample with stratification, then inject label noise and see measured quality decouple from true quality.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/eval-dataset-design",
  },
  openGraph: {
    title: "Designing Eval Datasets | NeuroNomixer",
    description:
      "Build an eval set from simulated production failures, watch the exact 95% confidence interval narrow as tasks accumulate, catch a skewed sample with stratification, then inject label noise and see measured quality decouple from true quality.",
    url: "https://www.neuronomixer.com/visual-guides/eval-dataset-design",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Designing Eval Datasets | NeuroNomixer",
    description:
      "Build an eval set from simulated production failures, watch the exact 95% confidence interval narrow as tasks accumulate, catch a skewed sample with stratification, then inject label noise and see measured quality decouple from true quality.",
  },
};

export default function EvalDatasetDesignPage() {
  return <EvalDatasetDesignClient />;
}
