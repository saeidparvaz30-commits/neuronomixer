import type { Metadata } from "next";
import TidyDataClient from "@/components/VisualGuides/TidyData/TidyDataClient";

export const metadata: Metadata = {
  title: "Tidy Data: One Row, One Observation | NeuroNomixer",
  description:
    "Pivot a messy wide table longer and back, watch a chart break and heal with the table's shape, then choose the variables yourself with a live tidiness check.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/tidy-data-and-reshaping",
  },
  openGraph: {
    title: "Tidy Data: One Row, One Observation — NeuroNomixer",
    description:
      "Pivot a messy wide table longer and back, watch a chart break and heal with the table's shape, then choose the variables yourself with a live tidiness check.",
    url: "https://www.neuronomixer.com/visual-guides/tidy-data-and-reshaping",
    siteName: "NeuroNomixer",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tidy Data: One Row, One Observation — NeuroNomixer",
    description:
      "Pivot a wide table longer and back, watch a chart break and heal, and learn the three tidy rules interactively.",
  },
};

export default function TidyDataPage() {
  return <TidyDataClient />;
}
