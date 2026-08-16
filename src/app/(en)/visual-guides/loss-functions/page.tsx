import type { Metadata } from "next";
import LossFunctionsClient from "@/components/VisualGuides/LossFunctions/LossFunctionsClient";

export const metadata: Metadata = {
  title: "Loss Functions: The Training Signal",
  description:
    "Drag a prediction to compare MSE, MAE, and Huber losses and their gradients live, watch an outlier hijack a least-squares fit, and sweep a probability to see why cross entropy pairs with softmax.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/loss-functions" },
  openGraph: {
    title: "Loss Functions: The Training Signal | NeuroNomixer",
    description:
      "Interactive guide to loss functions: MSE vs MAE vs Huber with live gradients, outlier sensitivity of least-squares vs L1 fits, and cross entropy vs squared error for classification.",
    url: "https://www.neuronomixer.com/visual-guides/loss-functions",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Loss Functions: The Training Signal",
    description:
      "Drag, toggle, and sweep through MSE, MAE, Huber, and cross entropy to see what each loss actually tells the optimizer.",
  },
};

export default function LossFunctionsPage() {
  return <LossFunctionsClient />;
}
