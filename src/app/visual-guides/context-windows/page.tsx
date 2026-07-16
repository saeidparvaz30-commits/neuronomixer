import type { Metadata } from "next";
import ContextWindowsClient from "@/components/VisualGuides/ContextWindows/ContextWindowsClient";

export const metadata: Metadata = {
  title: "Context Windows: What the Model Can See",
  description:
    "Slide context length and visualize the lost-in-the-middle effect. See how position in context affects how well information is recalled.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/context-windows" },
  openGraph: {
    title: "Context Windows: What the Model Can See | NeuroNomixer",
    description:
      "Slide context length and visualize the lost-in-the-middle effect. See how position in context affects how well information is recalled.",
    url: "https://www.neuronomixer.com/visual-guides/context-windows",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Context Windows: What the Model Can See",
    description:
      "Slide context length and visualize the lost-in-the-middle effect. See how position in context affects how well information is recalled.",
  },
};

export default function ContextWindowsPage() {
  return <ContextWindowsClient />;
}
