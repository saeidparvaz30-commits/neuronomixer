import type { Metadata } from "next";
import LoRAAdaptersClient from "@/components/VisualGuides/LoRAAdapters/LoRAAdaptersClient";

export const metadata: Metadata = {
  title: "LoRA & Adapters: Efficient Fine-Tuning",
  description:
    "Visualize how LoRA decomposes weight matrices into low-rank factors. Compare parameter counts between full fine-tuning and LoRA across different ranks.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/lora-adapters",
  },
  openGraph: {
    title: "LoRA & Adapters: Efficient Fine-Tuning | NeuroNomixer",
    description:
      "Visualize how LoRA decomposes weight matrices into low-rank factors. Compare parameter counts between full fine-tuning and LoRA across different ranks.",
    url: "https://www.neuronomixer.com/visual-guides/lora-adapters",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "LoRA & Adapters: Efficient Fine-Tuning",
    description:
      "Visualize how LoRA decomposes weight matrices into low-rank factors. Compare parameter counts between full fine-tuning and LoRA across different ranks.",
  },
};

export default function LoRAAdaptersPage() {
  return <LoRAAdaptersClient />;
}
