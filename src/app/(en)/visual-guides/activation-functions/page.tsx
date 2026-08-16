import type { Metadata } from "next";
import ActivationFunctionsClient from "@/components/VisualGuides/ActivationFunctions/ActivationFunctionsClient";

export const metadata: Metadata = {
  title: "Activation Functions: ReLU, Sigmoid & Friends",
  description:
    "Explore how ReLU, Sigmoid, Tanh, and Leaky ReLU affect gradient flow, training speed, and the dead neuron problem. Interactive function plotter with live training curves.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/activation-functions",
  },
  openGraph: {
    title: "Activation Functions: ReLU, Sigmoid & Friends | NeuroNomixer",
    description:
      "Interactive guide to activation functions: plot curves, compare training loss, and visualize dead neurons.",
    url: "https://www.neuronomixer.com/visual-guides/activation-functions",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Activation Functions: ReLU, Sigmoid & Friends",
    description:
      "Toggle between ReLU, Sigmoid, Tanh, and Leaky ReLU. See convergence differences and dead neuron behavior.",
  },
};

export default function ActivationFunctionsPage() {
  return <ActivationFunctionsClient />;
}
