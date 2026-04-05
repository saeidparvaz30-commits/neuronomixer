import type { Metadata } from "next";
import CNNsClient from "@/components/VisualGuides/CNNs/CNNsClient";

export const metadata: Metadata = {
  title: "CNNs: See What Filters See",
  description:
    "Watch convolutional filters slide across images and activate feature maps. Interactive CNN visualization with edge detection, sharpening, and blur filters.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/cnns" },
  openGraph: {
    title: "CNNs: See What Filters See — NeuroNomixer Visual Guides",
    description:
      "Interactive CNN filter visualization. See how convolutional filters detect edges, textures, and patterns layer by layer.",
    url: "https://www.neuronomixer.com/visual-guides/cnns",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "CNNs: See What Filters See — NeuroNomixer",
    description:
      "Interactive CNN filter visualization. See how convolutional filters detect edges, textures, and patterns layer by layer.",
  },
};

export default function CNNsPage() {
  return <CNNsClient />;
}
