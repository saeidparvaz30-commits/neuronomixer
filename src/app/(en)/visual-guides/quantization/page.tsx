import type { Metadata } from "next";
import QuantizationClient from "@/components/VisualGuides/Quantization/QuantizationClient";

export const metadata: Metadata = {
  title: "Model Quantization: Fewer Bits, Smaller Models",
  description:
    "See why LLMs are huge, then run real symmetric quantization on a weight sample. Fit a 70B model on a consumer GPU and measure the error at 8, 4, 3, and 2 bits.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/quantization",
  },
  openGraph: {
    title: "Model Quantization: Fewer Bits, Smaller Models | NeuroNomixer",
    description:
      "See why LLMs are huge, then run real symmetric quantization on a weight sample. Fit a 70B model on a consumer GPU and measure the error at 8, 4, 3, and 2 bits.",
    url: "https://www.neuronomixer.com/visual-guides/quantization",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Model Quantization: Fewer Bits, Smaller Models",
    description:
      "See why LLMs are huge, then run real symmetric quantization on a weight sample. Fit a 70B model on a consumer GPU and measure the error at 8, 4, 3, and 2 bits.",
  },
};

export default function QuantizationPage() {
  return <QuantizationClient />;
}
