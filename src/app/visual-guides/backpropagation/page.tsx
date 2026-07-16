import type { Metadata } from "next";
import BackpropagationClient from "@/components/VisualGuides/Backpropagation/BackpropagationClient";

export const metadata: Metadata = {
  title: "Backpropagation: How Networks Learn",
  description:
    "Step through a full forward pass, loss computation, and backward pass neuron by neuron. Watch gradients flow back through the network via the chain rule and see weights update in real time.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/backpropagation" },
  openGraph: {
    title: "Backpropagation: How Networks Learn | NeuroNomixer",
    description:
      "Interactive 8-step walkthrough of backpropagation: forward pass, cross-entropy loss, gradient flow, and weight updates visualized neuron by neuron.",
    url: "https://www.neuronomixer.com/visual-guides/backpropagation",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Backpropagation: How Networks Learn",
    description:
      "Step through forward pass → loss → backward pass → weight update, with live gradient values on every neuron.",
  },
};

export default function BackpropagationPage() {
  return <BackpropagationClient />;
}
