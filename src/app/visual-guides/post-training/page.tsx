import type { Metadata } from "next";
import PostTrainingClient from "@/components/VisualGuides/PostTraining/PostTrainingClient";

export const metadata: Metadata = {
  title: "From Base Model to Assistant | NeuroNomixer",
  description:
    "Train two real n-gram models in your browser, blend demonstrations into the base distribution, add preference pressure with a KL tether, and watch token probabilities shift and diversity collapse.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/post-training",
  },
  openGraph: {
    title: "From Base Model to Assistant | NeuroNomixer",
    description:
      "Train two real n-gram models in your browser, blend demonstrations into the base distribution, add preference pressure with a KL tether, and watch token probabilities shift and diversity collapse.",
    url: "https://www.neuronomixer.com/visual-guides/post-training",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "From Base Model to Assistant | NeuroNomixer",
    description:
      "Train two real n-gram models in your browser, blend demonstrations into the base distribution, add preference pressure with a KL tether, and watch token probabilities shift and diversity collapse.",
  },
};

export default function PostTrainingPage() {
  return <PostTrainingClient />;
}
