import type { Metadata } from "next";
import ScalingLawsClient from "@/components/VisualGuides/ScalingLaws/ScalingLawsClient";

export const metadata: Metadata = {
  title: "Scaling Laws",
  description:
    "Drive the fitted Chinchilla scaling law live: pick a FLOPs budget, split it between parameters and tokens, trace the compute-optimal frontier, and compare real published models.",
};

export default function Page() {
  return <ScalingLawsClient />;
}
