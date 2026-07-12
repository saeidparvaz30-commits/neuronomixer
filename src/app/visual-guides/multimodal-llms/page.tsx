import type { Metadata } from "next";
import MultimodalLLMsClient from "@/components/VisualGuides/MultimodalLLMs/MultimodalLLMsClient";

export const metadata: Metadata = {
  title: "How LLMs See",
  description:
    "Draw an image and watch it become tokens: patches are extracted live, matrix-multiplied through a real projection into the same embedding space as text, and joined into one sequence, with token counts recomputed at every patch size.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/multimodal-llms",
  },
  openGraph: {
    title: "How LLMs See | NeuroNomixer",
    description:
      "Draw an image and watch it become tokens: patches are extracted live, matrix-multiplied through a real projection into the same embedding space as text, and joined into one sequence, with token counts recomputed at every patch size.",
    url: "https://www.neuronomixer.com/visual-guides/multimodal-llms",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "How LLMs See | NeuroNomixer",
    description:
      "Draw an image and watch it become tokens: patches are extracted live, matrix-multiplied through a real projection into the same embedding space as text, and joined into one sequence, with token counts recomputed at every patch size.",
  },
};

export default function MultimodalLLMsPage() {
  return <MultimodalLLMsClient />;
}
