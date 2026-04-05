import type { Metadata } from "next";
import OptimizersRaceClient from "@/components/VisualGuides/OptimizersRace/OptimizersRaceClient";

export const metadata: Metadata = {
  title: "Optimizers Race: SGD vs Adam vs RMSProp",
  description:
    "Watch SGD, Adam, and RMSProp descend the same loss landscape simultaneously. See why adaptive optimizers converge faster on non-uniform loss surfaces.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/optimizers-race" },
  openGraph: {
    title: "Optimizers Race: SGD vs Adam vs RMSProp — NeuroNomixer",
    description:
      "Watch SGD, Adam, and RMSProp descend the same loss landscape simultaneously. See why adaptive optimizers converge faster on non-uniform loss surfaces.",
    url: "https://www.neuronomixer.com/visual-guides/optimizers-race",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Optimizers Race: SGD vs Adam vs RMSProp",
    description:
      "Watch SGD, Adam, and RMSProp descend the same loss landscape simultaneously.",
  },
};

export default function OptimizersRacePage() {
  return <OptimizersRaceClient />;
}
