import type { Metadata } from "next";
import TransferLearningClient from "@/components/VisualGuides/TransferLearning/TransferLearningClient";

export const metadata: Metadata = {
  title: "Transfer Learning: Stand on Giants' Shoulders",
  description:
    "Click to freeze and unfreeze CNN layers. See how pretrained features transfer across tasks with dramatically less training data.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/transfer-learning",
  },
  openGraph: {
    title: "Transfer Learning: Stand on Giants' Shoulders | NeuroNomixer",
    description:
      "Click to freeze and unfreeze CNN layers. See how pretrained features transfer across tasks with dramatically less training data.",
    url: "https://www.neuronomixer.com/visual-guides/transfer-learning",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Transfer Learning: Stand on Giants' Shoulders",
    description:
      "Click to freeze and unfreeze CNN layers. See how pretrained features transfer across tasks with dramatically less training data.",
  },
};

export default function TransferLearningPage() {
  return <TransferLearningClient />;
}
