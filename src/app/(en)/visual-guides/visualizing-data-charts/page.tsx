import type { Metadata } from "next";
import VisualizingDataChartsClient from "@/components/VisualGuides/VisualizingDataCharts/VisualizingDataChartsClient";

export const metadata: Metadata = {
  title: "Visualizing Data: Charts That Tell the Truth",
  description:
    "Every dataset has a story. Discover which chart reveals it most clearly, and learn how bad design can hide the truth or even lie outright.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/visualizing-data-charts" },
  openGraph: {
    title: "Visualizing Data: Charts That Tell the Truth | NeuroNomixer Visual Guides",
    description:
      "Pick the right chart type for four datasets and expose five classic techniques used to deceive with visualization.",
    url: "https://www.neuronomixer.com/visual-guides/visualizing-data-charts",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Visualizing Data: Charts That Tell the Truth | NeuroNomixer",
    description: "Interactive guide: chart chooser + misleading charts gallery. No external chart libraries.",
  },
};

export default function VisualizingDataChartsPage() {
  return <VisualizingDataChartsClient />;
}
