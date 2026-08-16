import type { Metadata } from "next";
import LearningRateSchedulesClient from "@/components/VisualGuides/LearningRateSchedules/LearningRateSchedulesClient";

const TITLE = "Learning-Rate Schedules | NeuroNomixer";
const DESCRIPTION =
  "Train a real neural net in your browser under constant, step-decay, cosine, and warmup schedules. Watch a too-high constant rate diverge, then rescue the exact same peak with warmup.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical:
      "https://www.neuronomixer.com/visual-guides/learning-rate-schedules",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.neuronomixer.com/visual-guides/learning-rate-schedules",
    siteName: "NeuroNomixer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function LearningRateSchedulesPage() {
  return <LearningRateSchedulesClient />;
}
