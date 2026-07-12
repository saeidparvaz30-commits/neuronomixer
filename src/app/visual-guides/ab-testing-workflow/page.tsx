import type { Metadata } from "next";
import ABTestingWorkflowClient from "@/components/VisualGuides/ABTestingWorkflow/ABTestingWorkflowClient";

export const metadata: Metadata = {
  title: "A/B Testing: The Complete Workflow",
  description:
    "Master A/B testing from design to analysis. Interactive guide covering hypothesis formulation, sample size calculation, randomization, live data collection simulation, and two-proportion z-tests.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/ab-testing-workflow",
  },
  openGraph: {
    title: "A/B Testing: The Complete Workflow — NeuroNomixer Visual Guides",
    description:
      "Step through every phase of a rigorous A/B experiment: design, randomize, collect, and analyze, all interactive, all in your browser.",
    url: "https://www.neuronomixer.com/visual-guides/ab-testing-workflow",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "A/B Testing: The Complete Workflow — NeuroNomixer Visual Guides",
    description:
      "Interactive guide to A/B testing: sample sizing, randomization, simulated data collection, and hypothesis testing with real math.",
  },
};

export default function ABTestingWorkflowPage() {
  return <ABTestingWorkflowClient />;
}
