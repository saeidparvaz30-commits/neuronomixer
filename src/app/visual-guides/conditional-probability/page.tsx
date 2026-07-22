import type { Metadata } from "next";
import ConditionalProbabilityClient from "@/components/VisualGuides/ConditionalProbability/ConditionalProbabilityClient";

export const metadata: Metadata = {
  title: "Conditional Probability & Independence",
  description:
    "Build probability trees, see how conditioning shrinks the sample space, and test if events are truly independent. Three interactive scenarios: medical testing, marble draws, and manufacturing defects.",
  alternates: {
    canonical: "https://www.neuronomixer.com/visual-guides/conditional-probability",
  },
  openGraph: {
    title: "Conditional Probability & Independence | NeuroNomixer Visual Guides",
    description:
      "When you know Event B happened, how does that change the probability of Event A? Interactive tree diagrams and sample space animations.",
    url: "https://www.neuronomixer.com/visual-guides/conditional-probability",
    type: "article",
  },
  twitter: {
    card: "summary_large_image",
    title: "Conditional Probability & Independence | NeuroNomixer Visual Guides",
    description:
      "Interactive probability trees, sample space animations, and an independence checker.",
  },
};

export default function ConditionalProbabilityPage() {
  return <ConditionalProbabilityClient />;
}
