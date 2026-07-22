import type { Metadata } from "next";
import TypesOfDataClient from "@/components/VisualGuides/TypesOfData/TypesOfDataClient";

export const metadata: Metadata = {
  title: "Types of Data & Measurement Scales",
  description:
    "Classify data into nominal, ordinal, interval, and ratio scales. Drag examples into buckets, then discover which statistical operations are valid for each scale.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/types-of-data-measurement-scales" },
  openGraph: {
    title: "Types of Data & Measurement Scales | NeuroNomixer Visual Guides",
    description: "Interactive classification of data types and measurement scales with real-world examples.",
    url: "https://www.neuronomixer.com/visual-guides/types-of-data-measurement-scales",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Types of Data & Measurement Scales | NeuroNomixer Visual Guides",
    description: "Learn to classify data and understand what math you can apply to each scale.",
  },
};

export default function TypesOfDataPage() {
  return <TypesOfDataClient />;
}
