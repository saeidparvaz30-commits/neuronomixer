import type { Metadata } from "next";
import LogisticClassificationClient from "@/components/VisualGuides/LogisticClassification/LogisticClassificationClient";

const TITLE = "Logistic Classification | NeuroNomixer";
const DESCRIPTION =
  "Train a real logistic classifier in your browser: drag 2-class points while gradient descent refits live, watch the sigmoid probability map and decision boundary move, and slide the threshold to trade false positives against false negatives.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical:
      "https://www.neuronomixer.com/visual-guides/logistic-classification",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.neuronomixer.com/visual-guides/logistic-classification",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function LogisticClassificationPage() {
  return <LogisticClassificationClient />;
}
