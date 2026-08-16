import type { Metadata } from "next";
import DiffusionModelsClient from "@/components/VisualGuides/DiffusionModels/DiffusionModelsClient";

export const metadata: Metadata = {
  title: "Diffusion Models: Learn by Denoising",
  description:
    "Destroy a spiral of data with the real closed-form forward process, then watch the reverse process bring it back. Interactive diffusion math with cosine and linear noise schedules.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/diffusion-models",
  },
  openGraph: {
    title: "Diffusion Models: Learn by Denoising | NeuroNomixer",
    description:
      "Destroy a spiral of data with the real closed-form forward process, then watch the reverse process bring it back. Interactive diffusion math with cosine and linear noise schedules.",
    url: "https://www.neuronomixer.com/visual-guides/diffusion-models",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Diffusion Models: Learn by Denoising",
    description:
      "Destroy a spiral of data with the real closed-form forward process, then watch the reverse process bring it back.",
  },
};

export default function DiffusionModelsPage() {
  return <DiffusionModelsClient />;
}
