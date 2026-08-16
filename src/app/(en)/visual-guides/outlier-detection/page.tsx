import type { Metadata } from "next";
import OutlierDetectionClient from "@/components/VisualGuides/OutlierDetection/OutlierDetectionClient";

export const metadata: Metadata = {
  title: "Outlier Detection: Spot the Odd One Out",
  description:
    "Drag data points and watch mean, median, and regression react in real time. Toggle Z-Score vs IQR detection to see which points get flagged and understand the math behind each method.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/outlier-detection" },
  openGraph: {
    title: "Outlier Detection | NeuroNomixer Visual Guides",
    description:
      "Interactive scatter plot for exploring Z-Score and IQR outlier detection. Drag points, adjust thresholds, and watch statistics update live.",
    url: "https://www.neuronomixer.com/visual-guides/outlier-detection",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Outlier Detection | NeuroNomixer Visual Guides",
    description: "Drag points, toggle Z-Score vs IQR, and see outliers flagged in real time.",
  },
};

export default function OutlierDetectionPage() {
  return <OutlierDetectionClient />;
}
