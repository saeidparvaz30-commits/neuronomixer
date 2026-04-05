import type { Metadata } from "next";
import PoolingLayersClient from "@/components/VisualGuides/PoolingLayers/PoolingLayersClient";

export const metadata: Metadata = {
  title: "Pooling Layers: Shrinking Without Losing",
  description:
    "Watch max and average pooling slide across pixel grids in real time. Understand how CNNs reduce spatial dimensions while preserving key features.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/pooling-layers",
  },
  openGraph: {
    title: "Pooling Layers: Shrinking Without Losing — NeuroNomixer Visual Guides",
    description:
      "Interactive pooling layer visualization. See how max, average, min, and L2-norm pooling reduce feature map dimensions in CNNs.",
    url: "https://www.neuronomixer.com/visual-guides/pooling-layers",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pooling Layers: Shrinking Without Losing — NeuroNomixer",
    description:
      "Interactive pooling layer visualization. See how max, average, min, and L2-norm pooling reduce feature map dimensions in CNNs.",
  },
};

export default function PoolingLayersPage() {
  return <PoolingLayersClient />;
}
