import type { Metadata } from "next";
import GradientDescentClient from "@/components/VisualGuides/GradientDescent/GradientDescentClient";

export const metadata: Metadata = {
  title: "Gradient Descent: Rolling Down the Hill",
  description:
    "Click to drop a ball on a loss landscape and watch gradient descent roll it toward the minimum. Change the learning rate to see convergence, oscillation, and divergence.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/gradient-descent" },
  openGraph: {
    title: "Gradient Descent: Rolling Down the Hill — NeuroNomixer",
    description: "Interactive gradient descent: choose landscapes, tune learning rate, watch the path to the minimum.",
    url: "https://www.neuronomixer.com/visual-guides/gradient-descent",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gradient Descent: Rolling Down the Hill",
    description: "Watch gradient descent navigate bowls, ravines, plateaus, and non-convex landscapes.",
  },
};

export default function GradientDescentPage() {
  return <GradientDescentClient />;
}
