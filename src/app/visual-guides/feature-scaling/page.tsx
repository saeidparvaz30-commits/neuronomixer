import type { Metadata } from "next";
import FeatureScalingClient from "@/components/VisualGuides/FeatureScaling/FeatureScalingClient";

export const metadata: Metadata = {
  title: "Feature Scaling Playground",
  description:
    "Understand why feature scaling matters. Toggle between Raw, Normalized, and Standardized scaling. See how distance metrics change and why ML algorithms care.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/feature-scaling" },
  openGraph: {
    title: "Feature Scaling Playground | NeuroNomixer Visual Guides",
    description:
      "Interactive visualization showing how different scaling methods compress or expand feature spaces. Essential for KNN and SVM.",
    url: "https://www.neuronomixer.com/visual-guides/feature-scaling",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Feature Scaling Playground | NeuroNomixer Visual Guides",
    description: "Visualize Raw, Normalized, and Standardized scaling with live distance calculations.",
  },
};

export default function FeatureScalingPage() {
  return <FeatureScalingClient />;
}
