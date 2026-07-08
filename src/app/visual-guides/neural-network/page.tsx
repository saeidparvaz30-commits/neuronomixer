import type { Metadata } from "next";
import NeuralNetworkClient from "@/components/VisualGuides/NeuralNetwork/NeuralNetworkClient";

export const metadata: Metadata = {
  title: "What Is a Neural Network?",
  description:
    "Build a neural network layer by layer, swap activation functions, and watch signals flow from input to output. Hover neurons to inspect their activation values.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/neural-network" },
  openGraph: {
    title: "What Is a Neural Network? — NeuroNomixer",
    description: "Interactive neural network builder: choose architecture, swap activations, watch forward pass in real time.",
    url: "https://www.neuronomixer.com/visual-guides/neural-network",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "What Is a Neural Network?",
    description: "Build and explore a neural network: hover neurons to see activations, swap architectures and activation functions.",
  },
};

export default function NeuralNetworkPage() {
  return <NeuralNetworkClient />;
}
