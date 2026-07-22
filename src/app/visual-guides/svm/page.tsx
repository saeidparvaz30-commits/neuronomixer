import type { Metadata } from "next";
import SVMClient from "@/components/VisualGuides/SVM/SVMClient";

export const metadata: Metadata = {
  title: "SVM: Finding the Maximum Margin",
  description:
    "Add data points and watch a Support Vector Machine find the widest possible decision boundary. Adjust regularization C and observe how the margin trades off against misclassification.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/svm" },
  openGraph: {
    title: "SVM: Finding the Maximum Margin | NeuroNomixer",
    description: "Interactive SVM: place points, tune C, and watch the maximum-margin hyperplane update live.",
    url: "https://www.neuronomixer.com/visual-guides/svm",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "SVM: Finding the Maximum Margin",
    description: "Explore how SVMs find the maximum-margin boundary between two classes.",
  },
};

export default function SVMPage() {
  return <SVMClient />;
}
