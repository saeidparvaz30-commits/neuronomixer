import type { Metadata } from "next";
import GANsClient from "@/components/VisualGuides/GANs/GANsClient";

export const metadata: Metadata = {
  title: "GANs: The Art of Faking It",
  description:
    "Watch a generator evolve from noise to convincing images as the discriminator fights back. Interactive GAN training simulation with evolving outputs.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/gans" },
  openGraph: {
    title: "GANs: The Art of Faking It — NeuroNomixer",
    description:
      "Watch a generator evolve from noise to convincing images as the discriminator fights back. Interactive GAN training simulation with evolving outputs.",
    url: "https://www.neuronomixer.com/visual-guides/gans",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "GANs: The Art of Faking It",
    description:
      "Watch a generator evolve from noise to convincing images as the discriminator fights back.",
  },
};

export default function GANsPage() {
  return <GANsClient />;
}
