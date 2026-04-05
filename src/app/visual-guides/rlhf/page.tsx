import type { Metadata } from "next";
import RLHFClient from "@/components/VisualGuides/RLHF/RLHFClient";

export const metadata: Metadata = {
  title: "RLHF: How Human Feedback Shapes AI",
  description:
    "Play the role of a human rater and watch the reward model learn your preferences. See how RLHF turns human judgments into AI behavior.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/rlhf",
  },
  openGraph: {
    title: "RLHF: How Human Feedback Shapes AI — NeuroNomixer",
    description:
      "Play the role of a human rater and watch the reward model learn your preferences. See how RLHF turns human judgments into AI behavior.",
    url: "https://www.neuronomixer.com/visual-guides/rlhf",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "RLHF: How Human Feedback Shapes AI",
    description:
      "Play the role of a human rater and watch the reward model learn your preferences. See how RLHF turns human judgments into AI behavior.",
  },
};

export default function RLHFPage() {
  return <RLHFClient />;
}
