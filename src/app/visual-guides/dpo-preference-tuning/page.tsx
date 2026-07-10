import type { Metadata } from "next";
import DPOPreferenceTuningClient from "@/components/VisualGuides/DPOPreferenceTuning/DPOPreferenceTuningClient";

export const metadata: Metadata = {
  title: "DPO: Preference Tuning Without a Reward Model | NeuroNomixer",
  description:
    "Train a toy policy with the real DPO loss in your browser: slide beta, run gradient steps on authored preference pairs, and watch the distribution drift from the reference model with no reward model in sight.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/dpo-preference-tuning",
  },
  openGraph: {
    title: "DPO: Preference Tuning Without a Reward Model | NeuroNomixer",
    description:
      "Train a toy policy with the real DPO loss in your browser: slide beta, run gradient steps on authored preference pairs, and watch the distribution drift from the reference model with no reward model in sight.",
    url: "https://www.neuronomixer.com/visual-guides/dpo-preference-tuning",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DPO: Preference Tuning Without a Reward Model | NeuroNomixer",
    description:
      "Train a toy policy with the real DPO loss in your browser: slide beta, run gradient steps on authored preference pairs, and watch the distribution drift from the reference model with no reward model in sight.",
  },
};

export default function DPOPreferenceTuningPage() {
  return <DPOPreferenceTuningClient />;
}
