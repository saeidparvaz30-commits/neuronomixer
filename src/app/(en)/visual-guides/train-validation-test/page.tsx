import type { Metadata } from "next";
import TrainValidationTestClient from "@/components/VisualGuides/TrainValidationTest/TrainValidationTestClient";

const TITLE = "Train, Validation, and Test Sets | NeuroNomixer";
const DESCRIPTION =
  "Drag real split boundaries over a shuffled dataset, fit polynomials on train only with live least squares, and peek at the test set to measure the honest cost of selection overfitting.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical:
      "https://www.neuronomixer.com/visual-guides/train-validation-test",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.neuronomixer.com/visual-guides/train-validation-test",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function TrainValidationTestPage() {
  return <TrainValidationTestClient />;
}
