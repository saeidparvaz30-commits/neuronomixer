import type { Metadata } from "next";
import CrossValidationClient from "@/components/VisualGuides/CrossValidation/CrossValidationClient";

export const metadata: Metadata = {
  title: "Cross-Validation: Why One Split Isn't Enough",
  description:
    "See how K-fold cross-validation rotates the validation role across k folds so every point is held out exactly once. Compare fold-by-fold errors and the mean ± std.",
  alternates: { canonical: "https://www.neuronomixer.com/visual-guides/cross-validation" },
  openGraph: {
    title: "Cross-Validation: Why One Split Isn't Enough | NeuroNomixer",
    description: "Interactive K-fold cross-validation: click folds, see per-fold errors, understand why CV beats a single split.",
    url: "https://www.neuronomixer.com/visual-guides/cross-validation",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cross-Validation: Why One Split Isn't Enough",
    description: "Interactive K-fold CV demo: see how rotating splits gives a more reliable model evaluation.",
  },
};

export default function CrossValidationPage() {
  return <CrossValidationClient />;
}
