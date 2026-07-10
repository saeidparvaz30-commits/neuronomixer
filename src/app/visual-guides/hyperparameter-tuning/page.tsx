import type { Metadata } from "next";
import HyperparameterTuningClient from "@/components/VisualGuides/HyperparameterTuning/HyperparameterTuningClient";

export const metadata: Metadata = {
  title: "Hyperparameter Tuning | NeuroNomixer",
  description:
    "Search the settings space under a real budget: 100 decision trees trained in your browser form a validation-accuracy landscape, and you spend 12 trials with grid, random, and adaptive search to find the best configuration.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/hyperparameter-tuning",
  },
  openGraph: {
    title: "Hyperparameter Tuning | NeuroNomixer",
    description:
      "Search the settings space under a real budget: 100 decision trees trained in your browser form a validation-accuracy landscape, and you spend 12 trials with grid, random, and adaptive search to find the best configuration.",
    url: "https://www.neuronomixer.com/visual-guides/hyperparameter-tuning",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hyperparameter Tuning | NeuroNomixer",
    description:
      "Search the settings space under a real budget: 100 decision trees trained in your browser form a validation-accuracy landscape, and you spend 12 trials with grid, random, and adaptive search to find the best configuration.",
  },
};

export default function HyperparameterTuningPage() {
  return <HyperparameterTuningClient />;
}
