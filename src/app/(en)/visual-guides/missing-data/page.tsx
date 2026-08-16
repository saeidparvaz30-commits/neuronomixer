import type { Metadata } from "next";
import MissingDataClient from "@/components/VisualGuides/MissingData/MissingDataClient";

export const metadata: Metadata = {
  title: "Missing Data: Why It Matters & How to Handle It",
  description:
    "Interactive guide exploring missing data strategies: Drop Rows, Mean Imputation, and KNN Imputation. See how each method affects your dataset distribution and model accuracy in real time.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/missing-data" },
  openGraph: {
    title: "Missing Data: Why It Matters | NeuroNomixer Visual Guides",
    description:
      "Compare three missing data strategies side-by-side. Interactive before/after visualization showing data loss vs bias tradeoffs.",
    url: "https://www.neuronomixer.com/visual-guides/missing-data",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Missing Data: Why It Matters | NeuroNomixer Visual Guides",
    description: "Interactive comparison of missing data handling strategies.",
  },
};

export default function MissingDataPage() {
  return <MissingDataClient />;
}
